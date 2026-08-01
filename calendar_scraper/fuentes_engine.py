"""Puente con `fantasy-atletismo-engine`: usa sus adapters de federación (15) como
fuente del calendario web.

El motor vive en su propio repo (rrojjo/fantasy-atletismo-engine) y se espera clonado
en `fantasy-atletismo-engine/` en la raíz de este repo (o en la ruta de la env var
ENGINE_DIR). Si no está disponible, `listar()` devuelve [] y el calendario sigue
funcionando con las fuentes propias de `calendar_scraper` — la integración es aditiva.

Solo se usa el DESCUBRIMIENTO del motor (`descubrir_competiciones`): nombre, fechas,
lugar, comunidad y enlaces. El detalle rico de RFEA (pruebas, horario, inscripción)
lo sigue aportando `calendar_scraper.rfea`, por eso el adapter 'rfea' del motor se
excluye por defecto.

Deps extra del motor para descubrir: tenacity, pydantic-settings (ver requirements.txt).
"""

from __future__ import annotations

import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from typing import Callable

from calendar_scraper.models import Competicion
from calendar_scraper.resumen import Resumen

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MAX_HILOS = 8

# federacion_id del motor -> ámbito mostrado en la web (coherente con fuentes/ propias
# y con lib/regiones.ts del frontend).
AMBITOS = {
    "rfea": "RFEA",
    "andalucia": "Andalucía",
    "aragon": "Aragón",
    "baleares": "Baleares",
    "cantabria": "Cantabria",
    "castillalamancha": "Castilla-La Mancha",
    "castillayleon": "Castilla y León",
    "cataluna": "Cataluña",
    "extremadura": "Extremadura",
    "galicia": "Galicia",
    "larioja": "La Rioja",
    "madrid": "Madrid",
    "navarra": "Navarra",
    "paisvasco": "País Vasco",
    "valencia": "Comunidad Valenciana",
}


def _src_dir() -> str | None:
    for cand in (os.environ.get("ENGINE_DIR"),
                 os.path.join(_REPO, "fantasy-atletismo-engine")):
        if cand and os.path.isdir(os.path.join(cand, "src", "engine", "adapters")):
            return os.path.join(cand, "src")
    return None


def disponible() -> bool:
    """True si el motor está clonado y localizable (no valida sus dependencias)."""
    return _src_dir() is not None


def _importar():
    """Importa el motor añadiendo su src/ al path. Lanza si faltan sus deps."""
    src = _src_dir()
    if src is None:
        return None
    if src not in sys.path:
        sys.path.insert(0, src)
    from engine.adapters import adapters  # noqa: PLC0415
    from engine.http import Http  # noqa: PLC0415
    return adapters, Http


def _convertir(c) -> Competicion:
    """CompeticionDescubierta (motor) -> Competicion (web)."""
    return Competicion(
        nombre=c.nombre,
        ambito=AMBITOS.get(c.federacion_id, c.comunidad or c.federacion_id),
        disciplina=c.disciplina,
        fecha_inicio=c.fecha_inicio,
        fecha_fin=c.fecha_fin,
        lugar=c.lugar,
        comunidad=c.comunidad,
        url_detalle=c.url_detalle,
        url_inscritos=c.url_inscritos,
        url_resultados=c.url_resultados,
        url_directo=c.url_directo,
        fuente=c.federacion_id,
    )


def listar(
    desde: date,
    hasta: date,
    *,
    excluir: tuple[str, ...] = ("rfea",),
    incluir_navegador: bool = False,
    incluir_headed: bool = False,
    solo_navegador: bool = False,
    on_error: Callable[[str, Exception], None] | None = None,
    resumen: "Resumen | None" = None,
) -> list[Competicion]:
    """Descubre competiciones con los adapters del motor y las devuelve como
    Competicion de la web, listas para `merge.combinar`.

    - excluir: ids de federación a saltar ('rfea' por defecto: ya la cubre el
      scraper propio con detalle rico).
    - incluir_navegador: añade los adapters Playwright HEADLESS (Valencia).
    - incluir_headed: añade además los de navegador CON ventana (Madrid/Cloudflare;
      solo tiene sentido en local).
    - solo_navegador: limita a los adapters de navegador (para scrape_spa.py, que
      corre en el workflow con Playwright instalado).
    - Errores aislados por federación: una que falle no tumba a las demás, pero
      queda anotada en `resumen` (nunca se confunde un fallo con "0 competiciones").
    """
    res = resumen if resumen is not None else Resumen()
    try:
        imp = _importar()
    except Exception as exc:  # motor presente pero sin deps instaladas
        res.fallo("motor:import", exc)
        if on_error:
            on_error("engine-import", exc)
        return []
    if imp is None:
        return []
    adapters, Http = imp

    ads = [a for a in adapters(incluir_navegador=incluir_navegador,
                               incluir_headed=incluir_headed)
           if a.id not in (excluir or ())]
    if solo_navegador:
        ads = [a for a in ads if getattr(a, "requiere_navegador", False)]
    if not ads:
        return []

    out: list[Competicion] = []

    def _uno(ad, http) -> list:
        comps = ad.descubrir_competiciones(http, desde, hasta)
        return [c for c in comps if desde <= c.fecha_inicio <= hasta]

    def _recoger(ad, resultado) -> None:
        try:
            comps = resultado() if callable(resultado) else resultado
            out.extend(_convertir(c) for c in comps)
            res.registrar(f"motor:{ad.id}", len(comps))
        except Exception as exc:  # aislamiento por federación
            res.fallo(f"motor:{ad.id}", exc)
            if on_error:
                on_error(ad.id, exc)

    # Igual que engine.pipeline.discover: HTTP en paralelo (throttle por dominio),
    # navegador en secuencial (su equilibrio con el anti-bot es frágil).
    paralelos = [a for a in ads if not getattr(a, "requiere_navegador", False)]
    secuenciales = [a for a in ads if getattr(a, "requiere_navegador", False)]
    with Http() as http:
        if paralelos:
            with ThreadPoolExecutor(max_workers=min(_MAX_HILOS, len(paralelos))) as pool:
                futuros = [(ad, pool.submit(_uno, ad, http)) for ad in paralelos]
                for ad, fut in futuros:
                    _recoger(ad, fut.result)
        for ad in secuenciales:
            _recoger(ad, lambda ad=ad: _uno(ad, http))

    out.sort(key=lambda c: (c.fecha_inicio, c.nombre))
    return out
