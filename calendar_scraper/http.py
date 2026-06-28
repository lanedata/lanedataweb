"""Cliente HTTP portable con throttle por dominio.

Usa curl_cffi con impersonación de Chrome: replica el fingerprint TLS de un
navegador real, así pasa los WAF / retos de Cloudflare (Madrid, Murcia…) que
bloquean a httpx/requests. Si curl_cffi no está instalado, cae a httpx.
"""

from __future__ import annotations

import time
from urllib.parse import urlparse

try:
    from curl_cffi import requests as _creq
    _ENGINE = "curl_cffi"
except Exception:  # pragma: no cover
    import httpx as _httpx
    _ENGINE = "httpx"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
_HEADERS = {"User-Agent": UA, "Accept-Language": "es-ES,es;q=0.9"}
_RATE = 1.0  # req/seg por dominio
_ultimo: dict[str, float] = {}


class Http:
    def __init__(self, timeout: float = 25.0) -> None:
        if _ENGINE == "curl_cffi":
            self._c = _creq.Session(impersonate="chrome", timeout=timeout, headers=_HEADERS)
        else:
            self._c = _httpx.Client(headers=_HEADERS, timeout=timeout, follow_redirects=True)

    def __enter__(self) -> "Http":
        return self

    def __exit__(self, *exc: object) -> None:
        try:
            self._c.close()
        except Exception:
            pass

    def _throttle(self, url: str) -> None:
        dom = urlparse(url).netloc
        ahora = time.monotonic()
        espera = (1.0 / _RATE) - (ahora - _ultimo.get(dom, 0.0))
        if espera > 0:
            time.sleep(espera)
        _ultimo[dom] = time.monotonic()

    def _get(self, url: str):
        self._throttle(url)
        r = self._c.get(url)
        r.raise_for_status()
        return r

    def get_text(self, url: str) -> str:
        return self._get(url).text

    def get_json(self, url: str):
        return self._get(url).json()

    def get_bytes(self, url: str) -> bytes:
        return self._get(url).content
