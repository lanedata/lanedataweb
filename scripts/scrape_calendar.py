#!/usr/bin/env python3
"""Genera public/data/competiciones.json con el calendario RFEA de una ventana móvil.

Se ejecuta en cada deploy (a diario). Si el scraping falla o no devuelve nada,
NO sobrescribe el JSON existente, de modo que el build siempre tiene datos.

Variables de entorno:
  SCRAPE_DAYS   nº de días hacia delante a scrapear (por defecto 120)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta

# Permite `from calendar_scraper import ...` ejecutando desde la raíz del repo.
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO)

from calendar_scraper import listar_competiciones  # noqa: E402

OUT = os.path.join(REPO, "public", "data", "competiciones.json")
DAYS = int(os.environ.get("SCRAPE_DAYS", "120"))


def main() -> int:
    hoy = date.today()
    hasta = hoy + timedelta(days=DAYS)
    print(f"[scrape] {hoy} -> {hasta}", file=sys.stderr)

    comps = listar_competiciones(
        hoy, hasta,
        enriquecer=True,
        con_inscritos=False,  # demasiado lento para CI: se enlaza la start list
        on_error=lambda c, e: print(f"  [!] {c.get('nombre')}: {e}", file=sys.stderr),
    )
    payload = [c.model_dump(mode="json") for c in comps]

    # Seguridad: no machacar datos buenos con una respuesta vacía.
    if not payload and os.path.exists(OUT):
        print("[scrape] 0 competiciones; conservo el JSON existente", file=sys.stderr)
        return 0

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)
    print(f"[scrape] {len(comps)} competiciones -> {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
