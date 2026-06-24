"""Combina competiciones de varias fuentes y deduplica.

Dos competiciones son la misma si comparten fecha de inicio y sus nombres son
suficientemente similares (solapamiento de palabras significativas, tipo Jaccard).
Al fusionar se conserva la más completa (normalmente la de la RFEA, con pruebas) y
se rellenan sus huecos con la otra, marcando todas las fuentes de origen.
"""

from __future__ import annotations

import re
import unicodedata

from calendar_scraper.models import Competicion

# Abreviaturas frecuentes -> forma larga (ayuda al solapamiento de palabras).
_ABREV = {
    "cto": "campeonato", "cpto": "campeonato", "ctos": "campeonato",
    "fed": "federacion", "auton": "autonomico", "intl": "internacional",
    "internac": "internacional", "nac": "nacional", "esp": "espana",
}
_STOP = {
    "de", "del", "la", "el", "los", "las", "y", "e", "do", "da", "dos", "das",
    "a", "en", "o", "u", "al",
}


def _norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))  # tildes
    s = s.replace("�", "").lower()                        # corrupción RFEA
    s = re.sub(r"\b[ivxlcdm]+\b", " ", s)                      # numerales romanos
    s = re.sub(r"\b\d+\b", " ", s)                             # números (ediciones)
    s = re.sub(r"[^a-z0-9ñ ]+", " ", s)
    return " ".join(s.split())


def _tokens(s: str | None) -> set[str]:
    out: set[str] = set()
    for w in _norm(s).split():
        w = _ABREV.get(w, w)
        if len(w) >= 3 and w not in _STOP:
            out.add(w)
    return out


def _similar(a: str, b: str) -> bool:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return _norm(a) == _norm(b)
    inter = len(ta & tb)
    union = len(ta | tb)
    if union and inter / union >= 0.55:
        return True
    # Uno contenido casi por completo en el otro (nombres con sufijos extra)
    return inter >= 3 and inter / min(len(ta), len(tb)) >= 0.8


def _completitud(c: Competicion) -> tuple:
    return (len(c.pruebas), bool(c.url_detalle), bool(c.documentos), bool(c.inscripcion.url))


def _fusionar_en(base: Competicion, extra: Competicion) -> None:
    """Rellena huecos de `base` con datos de `extra` (no sobrescribe)."""
    for f in ("lugar", "disciplina", "ambito", "url_detalle", "url_resultados", "url_directo"):
        if not getattr(base, f) and getattr(extra, f):
            setattr(base, f, getattr(extra, f))
    if not base.pruebas and extra.pruebas:
        base.pruebas = extra.pruebas
    if not base.documentos and extra.documentos:
        base.documentos = extra.documentos
    if not base.inscripcion.url and extra.inscripcion.url:
        base.inscripcion = extra.inscripcion
    fuentes = set((base.fuente or "").split("+")) | {extra.fuente or ""}
    base.fuente = "+".join(sorted(f for f in fuentes if f))


def combinar(grupos: list[list[Competicion]]) -> list[Competicion]:
    """Combina varias listas y deduplica por (fecha + similitud de nombre)."""
    todas = [c for g in grupos for c in g]
    # Las más completas primero: serán la base de cada fusión.
    todas.sort(key=lambda c: _completitud(c), reverse=True)

    resultado: list[Competicion] = []
    por_fecha: dict[str, list[Competicion]] = {}
    for c in todas:
        k = c.fecha_inicio.isoformat()
        base = next((r for r in por_fecha.get(k, []) if _similar(r.nombre, c.nombre)), None)
        if base is not None:
            _fusionar_en(base, c)
        else:
            resultado.append(c)
            por_fecha.setdefault(k, []).append(c)

    return sorted(resultado, key=lambda x: (x.fecha_inicio, x.nombre))
