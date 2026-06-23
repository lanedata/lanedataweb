"""CLI: vuelca las competiciones de un rango a JSON.

    python -m calendar_scraper --desde 2026-06-19 --hasta 2026-06-22 --out comps.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from calendar_scraper.scraper import listar_competiciones


def main() -> int:
    ap = argparse.ArgumentParser(description="Scraper de calendario de atletismo (RFEA).")
    ap.add_argument("--desde", required=True, help="fecha inicio YYYY-MM-DD")
    ap.add_argument("--hasta", required=True, help="fecha fin YYYY-MM-DD")
    ap.add_argument("--out", default="-", help="fichero de salida JSON ('-' = stdout)")
    ap.add_argument("--limite", type=int, default=None, help="máx. competiciones a enriquecer")
    ap.add_argument("--sin-enriquecer", action="store_true", help="solo listado básico")
    ap.add_argument("--con-inscritos", action="store_true",
                    help="descargar la start list de cada prueba (lento)")
    args = ap.parse_args()

    comps = listar_competiciones(
        args.desde, args.hasta,
        enriquecer=not args.sin_enriquecer,
        con_inscritos=args.con_inscritos,
        limite=args.limite,
        on_error=lambda c, e: print(f"  [!] {c['nombre']}: {e}", file=sys.stderr),
    )
    payload = [c.model_dump(mode="json") for c in comps]
    texto = json.dumps(payload, ensure_ascii=False, indent=2)

    if args.out == "-":
        print(texto)
    else:
        carpeta = os.path.dirname(args.out)
        if carpeta:
            os.makedirs(carpeta, exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(texto)
        print(f"{len(comps)} competiciones -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
