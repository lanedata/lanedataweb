"""Orquestación: lista competiciones de un rango y las enriquece con detalle/pruebas."""

from __future__ import annotations

from datetime import date, datetime

from calendar_scraper import rfea
from calendar_scraper.http import Http
from calendar_scraper.models import Competicion


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
    on_error=None,
) -> list[Competicion]:
    """Devuelve las competiciones del rango [desde, hasta] con todos los campos.

    - enriquecer=False: solo listado básico (rápido, sin abrir cada detalle).
    - con_inscritos=True: además descarga la start list de cada prueba (lento: 1 req/prueba).
    - limite: tope de competiciones a enriquecer (útil para pruebas).
    - on_error(comp_basica, exc): callback opcional al fallar el enriquecido de una.
    Los errores por competición se aíslan: una que falle no tumba al resto.
    """
    d, h = _a_fecha(desde), _a_fecha(hasta)
    salida: list[Competicion] = []
    with Http() as http:
        basicas = rfea.listar(http, d, h)
        if limite:
            basicas = basicas[:limite]
        for c in basicas:
            if not enriquecer:
                salida.append(
                    Competicion(
                        nombre=c["nombre"],
                        disciplina=c.get("disciplina"),
                        fecha_inicio=c["fecha"],
                        fecha_fin=c["fecha"],
                        lugar=c.get("lugar"),
                        url_detalle=c["url_detalle"],
                    )
                )
                continue
            try:
                comp = rfea.enriquecer(http, c)
                if con_inscritos:
                    comp = rfea.rellenar_inscritos(http, comp)
                salida.append(comp)
            except Exception as exc:  # aislamiento por competición
                if on_error:
                    on_error(c, exc)
                salida.append(
                    Competicion(
                        nombre=c["nombre"],
                        disciplina=c.get("disciplina"),
                        fecha_inicio=c["fecha"],
                        fecha_fin=c["fecha"],
                        lugar=c.get("lugar"),
                        url_detalle=c["url_detalle"],
                    )
                )
    salida.sort(key=lambda x: (x.fecha_inicio, x.nombre))
    return salida
