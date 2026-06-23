"""Cliente HTTP mínimo y portable (httpx) con throttle por dominio y UA identificable."""

from __future__ import annotations

import time
from urllib.parse import urlparse

import httpx

UA = "FantasyAtletismoBot/1.0 (+contacto)"
_RATE = 1.0  # req/seg por dominio
_ultimo: dict[str, float] = {}


class Http:
    def __init__(self, timeout: float = 20.0) -> None:
        self._c = httpx.Client(headers={"User-Agent": UA}, timeout=timeout, follow_redirects=True)

    def __enter__(self) -> "Http":
        return self

    def __exit__(self, *exc: object) -> None:
        self._c.close()

    def _throttle(self, url: str) -> None:
        dom = urlparse(url).netloc
        ahora = time.monotonic()
        espera = (1.0 / _RATE) - (ahora - _ultimo.get(dom, 0.0))
        if espera > 0:
            time.sleep(espera)
        _ultimo[dom] = time.monotonic()

    def get_text(self, url: str) -> str:
        self._throttle(url)
        r = self._c.get(url)
        r.raise_for_status()
        return r.text

    def get_json(self, url: str):
        self._throttle(url)
        r = self._c.get(url)
        r.raise_for_status()
        return r.json()

    def get_bytes(self, url: str) -> bytes:
        self._throttle(url)
        r = self._c.get(url)
        r.raise_for_status()
        return r.content
