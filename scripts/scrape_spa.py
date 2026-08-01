#!/usr/bin/env python3
"""Scrapea las federaciones que requieren navegador (Playwright) y vuelca a
public/data/federaciones_spa.json. Se ejecuta en su propio workflow (scrape-spa.yml)
porque Playwright es pesado; el scraper principal fusiona después este JSON.

Deja `public/data/spa_status.json` con qué aportó cada fuente y cuál falló, y avisa
de regresiones frente a la pasada anterior (misma mecánica que scrape_calendar.py;
ver la política de errores en calendar_scraper/fuentes/__init__.py).

Variables de entorno:
  SPA_PAST_DAYS   días hacia atrás (por defecto 60)
  SPA_DAYS        días hacia delante (por defecto 150)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO)

OUT = os.path.join(REPO, "public", "data", "federaciones_spa.json")
STATUS = os.path.join(REPO, "public", "data", "spa_status.json")
PAST = int(os.environ.get("SPA_PAST_DAYS", "60"))
DAYS = int(os.environ.get("SPA_DAYS", "150"))


def _aviso(msg: str) -> None:
    """Anotación de GitHub Actions (aparece resaltada en el resumen del run)."""
    print(f"::warning::{msg}")
    print(f"[spa] [!] {msg}", file=sys.stderr)


def main() -> int:
    from playwright.sync_api import sync_playwright

    from calendar_scraper import resumen as res_mod
    from calendar_scraper.fuentes_spa import FUENTES_SPA
    from calendar_scraper.merge import combinar
    from calendar_scraper.resumen import Resumen

    hoy = date.today()
    desde = hoy - timedelta(days=PAST)
    hasta = hoy + timedelta(days=DAYS)
    print(f"[spa] {desde} -> {hasta}", file=sys.stderr)

    resumen = Resumen()
    previo = res_mod.cargar(STATUS)

    grupos = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(60000)
        for nombre, fn in FUENTES_SPA.items():
            comps = resumen.aislar(f"spa:{nombre}", lambda fn=fn: fn(page, desde, hasta))
            print(f"[spa] {nombre}: {len(comps)} competiciones", file=sys.stderr)
            grupos.append(comps)
        browser.close()

    # Adapters de NAVEGADOR del motor fantasy-atletismo-engine (Valencia headless;
    # Madrid headed solo con ENGINE_HEADED=1 en local). Lanzan su propio Playwright.
    from calendar_scraper import fuentes_engine
    if fuentes_engine.disponible():
        motor = fuentes_engine.listar(
            desde, hasta,
            incluir_navegador=True,
            incluir_headed=os.environ.get("ENGINE_HEADED") == "1",
            solo_navegador=True,
            on_error=lambda fed, e: print(f"[spa] [!] motor:{fed}: {e}", file=sys.stderr),
            resumen=resumen,
        )
        print(f"[spa] motor(navegador): {len(motor)} competiciones", file=sys.stderr)
        if motor:
            grupos.append(motor)

    combinadas = combinar(grupos) if grupos else []
    payload = [c.model_dump(mode="json") for c in combinadas]

    print("[spa] aportación por fuente:", file=sys.stderr)
    print(resumen.tabla(), file=sys.stderr)
    for fuente in resumen.fallidas:
        _aviso(f"fuente caída · {fuente}: {resumen.fuentes[fuente]['error']}")
    for msg in res_mod.regresiones(resumen, previo):
        _aviso(f"regresión · {msg}")
    res_mod.guardar(STATUS, resumen)

    # No machacar datos buenos con una respuesta vacía.
    if not payload and os.path.exists(OUT):
        print("[spa] 0 competiciones; conservo el JSON existente", file=sys.stderr)
        return 0

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)
    print(f"[spa] {len(payload)} -> {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
