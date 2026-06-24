#!/usr/bin/env python3
"""Genera public/data/competiciones.json combinando RFEA + federaciones (HTML) +
federaciones SPA (Playwright, pre-scrapeadas en public/data/federaciones_spa.json).

Comportamiento:
  - Refresca la ventana [hoy - SCRAPE_PAST_DAYS, hoy + SCRAPE_DAYS] de RFEA + feds HTML.
  - Fusiona las SPA (Andalucía…) ya scrapeadas por su propio workflow.
  - CONSERVA (sin volver a scrapear) las competiciones del JSON existente con fecha
    anterior a la ventana → histórico que no se re-pide.
  - Deduplica todo (misma fecha + nombre similar) conservando la ficha más completa.
  - Si el scraping falla o no devuelve nada, mantiene el JSON existente.

Variables de entorno: SCRAPE_DAYS (120), SCRAPE_PAST_DAYS (10).
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO)

from calendar_scraper import listar_competiciones  # noqa: E402
from calendar_scraper.merge import combinar  # noqa: E402
from calendar_scraper.models import Competicion  # noqa: E402

OUT = os.path.join(REPO, "public", "data", "competiciones.json")
SPA = os.path.join(REPO, "public", "data", "federaciones_spa.json")
DAYS = int(os.environ.get("SCRAPE_DAYS", "120"))
PAST = int(os.environ.get("SCRAPE_PAST_DAYS", "10"))


def _cargar(path: str) -> list[dict]:
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _a_objetos(dicts: list[dict]) -> list[Competicion]:
    out = []
    for d in dicts:
        try:
            out.append(Competicion.model_validate(d))
        except Exception:
            pass
    return out


def main() -> int:
    hoy = date.today()
    desde = hoy - timedelta(days=PAST)
    hasta = hoy + timedelta(days=DAYS)
    limite = desde.isoformat()
    print(f"[scrape] refresco {desde} -> {hasta} (congela < {desde})", file=sys.stderr)

    nuevas = listar_competiciones(
        desde, hasta,
        enriquecer=True, con_inscritos=False, federaciones=True,
        on_error=lambda c, e: print(f"  [!] {c.get('nombre')}: {e}", file=sys.stderr),
    )
    if not nuevas and _cargar(OUT):
        print("[scrape] 0 nuevas; conservo el JSON existente", file=sys.stderr)
        return 0

    # Federaciones SPA (pre-scrapeadas por scrape_spa.py / scrape-spa.yml)
    spa = _a_objetos(_cargar(SPA))

    # Histórico congelado: del JSON previo, lo anterior a la ventana de refresco.
    congeladas = _a_objetos([c for c in _cargar(OUT) if (c.get("fecha_inicio") or "") < limite])

    combinadas = combinar([congeladas, nuevas, spa])
    payload = [c.model_dump(mode="json") for c in combinadas]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)
    print(f"[scrape] {len(nuevas)} RFEA+feds · {len(spa)} SPA · {len(congeladas)} congeladas "
          f"= {len(payload)} -> {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
