#!/usr/bin/env python3
"""Genera public/data/competiciones.json combinando RFEA + federaciones.

Se ejecuta en cada deploy (a diario). Comportamiento:
  - Refresca la ventana [hoy - SCRAPE_PAST_DAYS, hoy + SCRAPE_DAYS].
  - CONSERVA congeladas (sin volver a scrapear) las competiciones del JSON
    existente con fecha de inicio anterior a esa ventana → así el calendario
    acumula histórico pero no se re-piden las de más de 10 días.
  - Si el scraping falla o no devuelve nada, mantiene el JSON existente.

Variables de entorno:
  SCRAPE_DAYS        días hacia delante (por defecto 120)
  SCRAPE_PAST_DAYS   días hacia atrás a refrescar (por defecto 10)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO)

from calendar_scraper import listar_competiciones  # noqa: E402

OUT = os.path.join(REPO, "public", "data", "competiciones.json")
DAYS = int(os.environ.get("SCRAPE_DAYS", "120"))
PAST = int(os.environ.get("SCRAPE_PAST_DAYS", "10"))


def _cargar(path: str) -> list[dict]:
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def main() -> int:
    hoy = date.today()
    desde = hoy - timedelta(days=PAST)
    hasta = hoy + timedelta(days=DAYS)
    print(f"[scrape] refresco {desde} -> {hasta} (congela < {desde})", file=sys.stderr)

    nuevas = listar_competiciones(
        desde, hasta,
        enriquecer=True,
        con_inscritos=False,
        federaciones=True,
        on_error=lambda c, e: print(f"  [!] {c.get('nombre')}: {e}", file=sys.stderr),
    )
    nuevas_json = [c.model_dump(mode="json") for c in nuevas]

    existente = _cargar(OUT)
    if not nuevas_json and existente:
        print("[scrape] 0 nuevas; conservo el JSON existente", file=sys.stderr)
        return 0

    # Congeladas: las del JSON previo anteriores a la ventana de refresco.
    limite = desde.isoformat()
    congeladas = [c for c in existente if (c.get("fecha_inicio") or "") < limite]

    # Las nuevas cubren [desde, hasta]; las congeladas son anteriores → sin solape.
    combinadas = congeladas + nuevas_json
    combinadas.sort(key=lambda c: (c.get("fecha_inicio") or "", c.get("nombre") or ""))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(combinadas, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)
    print(f"[scrape] {len(nuevas_json)} refrescadas + {len(congeladas)} congeladas "
          f"= {len(combinadas)} -> {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
