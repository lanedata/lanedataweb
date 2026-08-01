"""Cliente HTTP portable con throttle por dominio, reintentos y detección de charset.

Usa curl_cffi con impersonación de Chrome: replica el fingerprint TLS de un
navegador real, así pasa los WAF / retos de Cloudflare (Madrid, Murcia…) que
bloquean a httpx/requests. Si curl_cffi no está instalado, cae a httpx.

Endurecido con lo que ya hace `engine/http.py` del motor fantasy-atletismo-engine:

  · Reintentos (tenacity) SOLO en red y 5xx, nunca en 4xx. Antes un 503 pasajero
    tumbaba la federación entera durante todo el día.
  · Throttle por RESERVA thread-safe. El anterior leía y escribía `_ultimo` sin lock
    y `fuentes_engine` lanza hasta 8 hilos: con la carrera, varios hilos calculaban
    la misma espera y salían a la vez, así que el límite de 1 req/s no se cumplía.
    Ahora el turno se reserva bajo el lock y la espera ocurre FUERA, para no
    serializar dominios distintos entre sí.
  · Decodificación respetando el charset declarado (cabecera -> <meta> -> fallback),
    porque varias webs federativas sirven latin-1 sin anunciarlo bien.
"""

from __future__ import annotations

import re
import threading
import time
from urllib.parse import urlparse

try:
    from tenacity import (
        retry,
        retry_if_exception,
        stop_after_attempt,
        wait_exponential_jitter,
    )
    _TENACITY = True
except Exception:  # pragma: no cover
    # Repliegue mínimo: el módulo se anuncia como portable, así que no puede exigir
    # tenacity para importarse. Misma política (3 intentos, espera exponencial).
    _TENACITY = False

    def retry(*, retry, stop=None, wait=None, reraise=True):  # noqa: A002
        def deco(fn):
            def envuelto(*a, **kw):
                for intento in range(3):
                    try:
                        return fn(*a, **kw)
                    except Exception as exc:
                        if intento == 2 or not retry(exc):
                            raise
                        time.sleep(min(10.0, 2.0 ** intento))
            return envuelto
        return deco

    def retry_if_exception(pred):
        return pred

    def stop_after_attempt(n):
        return n

    def wait_exponential_jitter(**kw):
        return None

try:
    from curl_cffi import requests as _creq
    _ENGINE = "curl_cffi"
except Exception:  # pragma: no cover
    import httpx as _httpx
    _ENGINE = "httpx"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
_HEADERS = {"User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9"}

_RATE = 1.0  # req/seg por dominio
# Reserva de turnos por dominio, COMPARTIDA por todas las instancias e hilos.
_ultimo: dict[str, float] = {}
_lock = threading.Lock()

_META_CHARSET = re.compile(rb'charset=["\']?\s*([\w\-]+)', re.I)


class HttpError(Exception):
    """Respuesta con código de error. `status` permite decidir si se reintenta."""

    def __init__(self, url: str, status: int) -> None:
        super().__init__(f"HTTP {status} en {url}")
        self.url = url
        self.status = status


def _reintentable(exc: BaseException) -> bool:
    """Reintentar solo en errores de red o 5xx; nunca en 4xx (p. ej. un 404 real)."""
    if isinstance(exc, HttpError):
        return 500 <= exc.status < 600
    # Cualquier otra excepción que salga de la petición es de transporte
    # (timeout, DNS, TLS, conexión cortada): esas sí se reintentan.
    return True


class Http:
    def __init__(self, timeout: float = 25.0) -> None:
        if _ENGINE == "curl_cffi":
            self._c = _creq.Session(impersonate="chrome", timeout=timeout, headers=_HEADERS)
        else:
            self._c = _httpx.Client(headers=_HEADERS, timeout=timeout, follow_redirects=True)

    def __enter__(self) -> "Http":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def close(self) -> None:
        try:
            self._c.close()
        except Exception:
            pass

    # --- internos ---
    def _throttle(self, url: str) -> None:
        # Modelo de RESERVA: bajo el lock se calcula y se apunta el turno; la espera
        # ocurre fuera para no serializar dominios distintos entre sí.
        dom = urlparse(url).netloc
        with _lock:
            ahora = time.monotonic()
            turno = max(ahora, _ultimo.get(dom, 0.0) + (1.0 / _RATE))
            _ultimo[dom] = turno
        espera = turno - ahora
        if espera > 0:
            time.sleep(espera)

    @retry(
        retry=retry_if_exception(_reintentable),
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=10),
        reraise=True,
    )
    def _get(self, url: str, headers: dict[str, str] | None = None):
        self._throttle(url)
        r = self._c.get(url, headers=headers) if headers else self._c.get(url)
        status = getattr(r, "status_code", 200)
        if status >= 400:
            raise HttpError(url, status)
        return r

    @staticmethod
    def _decode(r) -> str:
        """Decodifica respetando charset: cabecera -> <meta> -> utf-8/1252/latin-1."""
        contenido = r.content
        enc = getattr(r, "encoding", None)
        if not enc or enc.lower() in ("ascii", "iso-8859-1"):
            m = _META_CHARSET.search(contenido[:4096])
            if m:
                enc = m.group(1).decode("ascii", "ignore")
        for cand in (enc, "utf-8", "windows-1252", "latin-1"):
            if not cand:
                continue
            try:
                return contenido.decode(cand)
            except (LookupError, UnicodeDecodeError):
                continue
        return contenido.decode("utf-8", "replace")

    # --- API pública ---
    # `headers` se fusiona con los del cliente (los por-petición ganan): algunos
    # endpoints cambian de formato según el Accept.
    def get_text(self, url: str, *, headers: dict[str, str] | None = None) -> str:
        return self._decode(self._get(url, headers))

    def get_json(self, url: str, *, headers: dict[str, str] | None = None):
        return self._get(url, headers).json()

    def get_bytes(self, url: str, *, headers: dict[str, str] | None = None) -> bytes:
        return self._get(url, headers).content
