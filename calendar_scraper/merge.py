"""Combina competiciones de varias fuentes y deduplica.

Dos competiciones se consideran la misma si coinciden en fecha de inicio y en el
"núcleo" normalizado del nombre (sin tildes, sin numerales de edición, sin signos).
Al fusionar se conserva la más completa y se rellenan sus huecos con la otra.
"""

from __future__ import annotations

import re
import unicodedata

from calendar_scraper.models import Competicion


def _norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))  # quita tildes
    s = s.replace("�", "")                                # corrupción RFEA
    s = s.lower()
    s = re.sub(r"\b[ivxlcdm]+\b", " ", s)   # numerales romanos (ediciones)
    s = re.sub(r"\b\d+\b", " ", s)          # números (ediciones, "2ª"...)
    s = re.sub(r"[^a-z0-9ñ ]+", " ", s)
    return " ".join(s.split())


def _clave(c: Competicion) -> tuple[str, str]:
    nucleo = _norm(c.nombre)[:30]
    if not nucleo:
        nucleo = (c.nombre or "").lower()[:30]
    return (c.fecha_inicio.isoformat(), nucleo)


def _completitud(c: Competicion) -> tuple:
    return (len(c.pruebas), bool(c.url_detalle), bool(c.documentos), bool(c.inscripcion.url))


def _fusionar(a: Competicion, b: Competicion) -> Competicion:
    base, extra = (a, b) if _completitud(a) >= _completitud(b) else (b, a)
    for f in ("lugar", "disciplina", "ambito", "url_detalle", "url_resultados", "url_directo"):
        if not getattr(base, f) and getattr(extra, f):
            setattr(base, f, getattr(extra, f))
    if not base.pruebas and extra.pruebas:
        base.pruebas = extra.pruebas
    if not base.documentos and extra.documentos:
        base.documentos = extra.documentos
    if not base.inscripcion.url and extra.inscripcion.url:
        base.inscripcion = extra.inscripcion
    fuentes = {x.fuente for x in (a, b) if x.fuente}
    base.fuente = "+".join(sorted(fuentes))
    return base


def combinar(grupos: list[list[Competicion]]) -> list[Competicion]:
    """Combina varias listas (en orden de prioridad: RFEA primero) y deduplica."""
    por_clave: dict[tuple[str, str], Competicion] = {}
    for comps in grupos:
        for c in comps:
            k = _clave(c)
            por_clave[k] = _fusionar(por_clave[k], c) if k in por_clave else c
    return sorted(por_clave.values(), key=lambda x: (x.fecha_inicio, x.nombre))
