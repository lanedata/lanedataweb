#!/usr/bin/env python3
"""Genera public/data/competiciones.json combinando RFEA + federaciones (HTML) +
federaciones SPA (Playwright, pre-scrapeadas en public/data/federaciones_spa.json) +
los adapters del motor fantasy-atletismo-engine (14 federaciones autonómicas).

Comportamiento:
  - Refresca la ventana [hoy - SCRAPE_PAST_DAYS, hoy + SCRAPE_DAYS] de RFEA + feds HTML.
  - Descubre con los adapters del motor (si `fantasy-atletismo-engine/` está clonado;
    ver calendar_scraper/fuentes_engine.py). Si no está, se omite sin fallar.
  - Fusiona las SPA (Andalucía…) ya scrapeadas por su propio workflow.
  - CONSERVA (sin volver a scrapear) las competiciones del JSON existente con fecha
    anterior a la ventana → histórico que no se re-pide.
  - Deduplica todo (misma fecha + nombre similar) conservando la ficha más completa.
  - Si el scraping falla o no devuelve nada, mantiene el JSON existente.
  - Deja `public/data/scrape_status.json` con qué aportó cada fuente y cuál falló, y
    avisa de REGRESIONES comparando con la pasada anterior.

Lo del status no es cosmético: como el JSON anterior se conserva cuando una fuente
cae, el calendario sigue pareciendo correcto y el fallo no se ve. Es la lección que
`engine/adapters/base.py` del motor documenta como "una captura degradada disfrazada
de n=0 es invisible durante un mes".

Variables de entorno: SCRAPE_DAYS (120), SCRAPE_PAST_DAYS (10),
ENGINE_NAVEGADOR=1 (añade Valencia, Playwright headless),
ENGINE_HEADED=1 (añade Madrid vía navegador con ventana; solo local).
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO)

from calendar_scraper import fuentes_engine, listar_competiciones  # noqa: E402
from calendar_scraper import resumen as res_mod  # noqa: E402
from calendar_scraper.merge import combinar  # noqa: E402
from calendar_scraper.models import Competicion  # noqa: E402
from calendar_scraper.resumen import Resumen  # noqa: E402

OUT = os.path.join(REPO, "public", "data", "competiciones.json")
SPA = os.path.join(REPO, "public", "data", "federaciones_spa.json")
STATUS = os.path.join(REPO, "public", "data", "scrape_status.json")
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


def _aviso(msg: str) -> None:
    """Anotación de GitHub Actions (aparece resaltada en el resumen del run)."""
    print(f"::warning::{msg}")
    print(f"  [!] {msg}", file=sys.stderr)


def main() -> int:
    hoy = date.today()
    desde = hoy - timedelta(days=PAST)
    hasta = hoy + timedelta(days=DAYS)
    print(f"[scrape] refresco {desde} -> {hasta}", file=sys.stderr)

    resumen = Resumen()
    previo = res_mod.cargar(STATUS)

    nuevas = listar_competiciones(
        desde, hasta,
        enriquecer=True, con_inscritos=False, federaciones=True,
        on_error=lambda c, e: print(f"  [!] {c.get('nombre')}: {e}", file=sys.stderr),
        resumen=resumen,
    )

    # Adapters del motor fantasy-atletismo-engine (14 federaciones autonómicas;
    # RFEA excluida: ya viene arriba con detalle rico). Si el motor no está
    # clonado o falla, `motor` queda vacío y el resto sigue igual.
    motor: list[Competicion] = []
    if fuentes_engine.disponible():
        motor = fuentes_engine.listar(
            desde, hasta,
            incluir_navegador=os.environ.get("ENGINE_NAVEGADOR") == "1",
            incluir_headed=os.environ.get("ENGINE_HEADED") == "1",
            on_error=lambda fed, e: print(f"  [!] motor:{fed}: {e}", file=sys.stderr),
            resumen=resumen,
        )
        print(f"[scrape] motor: {len(motor)} competiciones", file=sys.stderr)
    else:
        print("[scrape] motor no disponible (fantasy-atletismo-engine/ no clonado)",
              file=sys.stderr)

    if not nuevas and not motor and _cargar(OUT):
        print("[scrape] 0 nuevas; conservo el JSON existente", file=sys.stderr)
        return 0

    # Federaciones SPA (pre-scrapeadas por scrape_spa.py / scrape-spa.yml)
    spa = _a_objetos(_cargar(SPA))
    resumen.registrar("spa:precargadas", len(spa))

    # RESILIENCIA: usamos TODO el JSON previo (acotado a ~200 días) como base.
    # Así, si una fuente falla en este run (p. ej. Cloudflare bloquea Madrid desde
    # la IP de CI), sus competiciones NO se pierden: se conservan del JSON anterior.
    # Las nuevas/SPA fusionan encima (combinar prefiere la ficha más completa).
    # Las de >10 días no se re-scrapean (vienen de la base), cumpliendo el "freeze".
    hace_200 = (hoy - timedelta(days=200)).isoformat()
    base = _a_objetos([
        c for c in _cargar(OUT)
        if (c.get("fecha_fin") or c.get("fecha_inicio") or "") >= hace_200
    ])

    combinadas = combinar([base, nuevas, spa, motor])
    payload = [c.model_dump(mode="json") for c in combinadas]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, OUT)
    print(f"[scrape] {len(nuevas)} RFEA+feds · {len(motor)} motor · {len(spa)} SPA · "
          f"base {len(base)} = {len(payload)} -> {OUT}", file=sys.stderr)

    # --- Estado por fuente y detección de regresiones -----------------------
    print("[scrape] aportación por fuente:", file=sys.stderr)
    print(resumen.tabla(), file=sys.stderr)

    for fuente in resumen.fallidas:
        _aviso(f"fuente caída · {fuente}: {resumen.fuentes[fuente]['error']}")
    for msg in res_mod.regresiones(resumen, previo):
        _aviso(f"regresión · {msg}")

    # El status se escribe SIEMPRE, también si hubo fallos: es el registro que permite
    # ver la próxima vez que una fuente lleva días sin aportar nada.
    res_mod.guardar(STATUS, resumen)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
