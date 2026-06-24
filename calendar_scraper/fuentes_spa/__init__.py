"""Fuentes federativas que requieren navegador headless (Playwright).

Se ejecutan en un workflow aparte (scrape-spa.yml) que vuelca su salida a
public/data/federaciones_spa.json; el scraper principal la fusiona después.

Cada módulo expone `listar(page, desde, hasta) -> list[Competicion]` recibiendo
una página de Playwright ya abierta (se comparte un único navegador).
"""

from calendar_scraper.fuentes_spa import andalucia

FUENTES_SPA = {
    "andalucia": andalucia.listar,
}

__all__ = ["FUENTES_SPA", "andalucia"]
