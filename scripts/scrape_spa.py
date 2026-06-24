#!/usr/bin/env python3
"""Scrapea las federaciones que requieren navegador (Playwright) y vuelca a
public/data/federaciones_spa.json. Se ejecuta en su propio workflow (scrape-spa.yml)
porque Playwright es pesado; el scraper principal fusiona después este JSON.

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
PAST = int(os.environ.get("SPA_PAST_DAYS", "60"))
DAYS = int(os.environ.get("SPA_DAYS", "150"))


def main() -> int:
    from playwright.sync_api import sync_playwright

    from calendar_scraper.fuentes_spa import FUENTES_SPA
    from calendar_scraper.merge import combinar

    hoy = date.today()
    desde = hoy - timedelta(days=PAST)
    hasta = hoy + timedelta(days=DAYS)
    print(f"[spa] {desde} -> {hasta}", file=sys.stderr)

    grupos = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_default_timeout(60000)
        for nombre, fn in FUENTES_SPA.items():
            try:
                comps = fn(page, desde, hasta)
                print(f"[spa] {nombre}: {len(comps)} competiciones", file=sys.stderr)
                grupos.append(comps)
            except Exception as exc:
                print(f"[spa] [!] {nombre}: {exc}", file=sys.stderr)
        browser.close()

    combinadas = combinar(grupos) if grupos else []
    payload = [c.model_dump(mode="json") for c in combinadas]

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
