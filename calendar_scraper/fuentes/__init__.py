"""Fuentes federativas adicionales a la RFEA.

Cada módulo expone `listar(http, desde, hasta) -> list[Competicion]`. El orquestador
(`scraper.listar_competiciones`) las combina con la RFEA y deduplica.

Estado:
  - galicia: ✅ HTML estático (atletismo.gal).
  Pendientes (requieren navegador headless o PDF, ver RECON.md):
  - andalucia (faalive = Blazor WASM), valencia (SPA), catalunya (PDF).
"""

from calendar_scraper.fuentes import galicia

FUENTES = {
    "galicia": galicia.listar,
}

__all__ = ["FUENTES", "galicia"]
