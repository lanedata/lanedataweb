"""Orquestación: lista competiciones de un rango y las enriquece con detalle/pruebas."""

from __future__ import annotations

from datetime import date, datetime

from calendar_scraper import rfea
from calendar_scraper.http import Http
from calendar_scraper.models import Competicion
from calendar_scraper.resumen import Resumen


def _a_fecha(v: str | date) -> date:
    if isinstance(v, date):
        return v
    return datetime.strptime(v, "%Y-%m-%d").date()


def listar_competiciones(
    desde: str | date,
    hasta: str | date,
    *,
    enriquecer: bool = True,
    con_inscritos: bool = False,
    limite: int | None = None,
    federaciones: bool = True,
    on_error=None,
    resumen: Resumen | None = None,
) -> list[Competicion]:
    """Devuelve las competiciones del rango [desde, hasta] con todos los campos.

    Combina la RFEA (calendario nacional + campeonatos autonómicos) con las fuentes
    federativas adicionales (ver `fuentes/`) y deduplica las que aparecen en varias.

    - enriquecer=False: solo listado básico de la RFEA (rápido, sin abrir cada detalle).
    - con_inscritos=True: además descarga la start list de cada prueba (lento).
    - federaciones=False: solo RFEA.
    - limite: tope de competiciones RFEA a enriquecer (útil para pruebas).
    - on_error(comp_basica, exc): callback opcional al fallar una.
    - resumen: si se pasa un `Resumen`, se anota cuántas aportó cada fuente y cuál
      falló. Es lo que permite distinguir "no hay competiciones" de "la fuente cascó"
      (ver la política de errores en `fuentes/__init__.py`).
    """
    d, h = _a_fecha(desde), _a_fecha(hasta)
    res = resumen if resumen is not None else Resumen()
    rfea_out: list[Competicion] = []
    fed_grupos: list[list[Competicion]] = []

    with Http() as http:
        # --- RFEA ---
        # El listado en sí NO se aísla: si falla, falla la fuente entera y así consta.
        try:
            basicas = rfea.listar(http, d, h)
            if limite:
                basicas = basicas[:limite]
            for c in basicas:
                if not enriquecer:
                    rfea_out.append(_basica(c))
                    continue
                try:
                    comp = rfea.enriquecer(http, c)
                    if con_inscritos:
                        comp = rfea.rellenar_inscritos(http, comp)
                    rfea_out.append(comp)
                except Exception as exc:  # aislamiento por competición
                    if on_error:
                        on_error(c, exc)
                    rfea_out.append(_basica(c))
            res.registrar("rfea", len(rfea_out))
        except Exception as exc:
            res.fallo("rfea", exc)
            if on_error:
                on_error({"nombre": "fuente:rfea"}, exc)

        # --- Federaciones autonómicas (errores aislados POR FUENTE) ---
        if federaciones:
            from calendar_scraper.fuentes import FUENTES
            for nombre, fn in FUENTES.items():
                grupo = res.aislar(nombre, lambda fn=fn: fn(http, d, h))
                fed_grupos.append(grupo)
                if not grupo and nombre in res.fallidas and on_error:
                    on_error({"nombre": f"fuente:{nombre}"},
                             RuntimeError(res.fuentes[nombre]["error"]))

    from calendar_scraper.merge import combinar
    return combinar([rfea_out, *fed_grupos])


def _basica(c: dict) -> Competicion:
    return Competicion(
        nombre=c["nombre"],
        disciplina=c.get("disciplina"),
        fecha_inicio=c["fecha"],
        fecha_fin=c["fecha"],
        lugar=c.get("lugar"),
        url_detalle=c["url_detalle"],
    )
