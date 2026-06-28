"""Fuentes federativas adicionales a la RFEA.

Cada módulo expone `listar(http, desde, hasta) -> list[Competicion]`. El orquestador
(`scraper.listar_competiciones`) las combina con la RFEA y deduplica.

Estado:
  - galicia:  ✅ HTML estático (atletismo.gal).
  - larioja:  ✅ HTML estático (fratletismo.com).
  Pendientes (requieren navegador headless, API con clave o PDF, ver RECON.md):
  - andalucia (faalive = Blazor WASM + API con x-api-key), valencia (SPA),
    catalunya (PDF), canarias (calendario JS).
"""

from calendar_scraper.fuentes import galicia, larioja, madrid

FUENTES = {
    "galicia": galicia.listar,
    "larioja": larioja.listar,
    "madrid": madrid.listar,
}

__all__ = ["FUENTES", "galicia", "larioja", "madrid"]
