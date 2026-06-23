"""Fuente: Federación Galega de Atletismo (atletismo.gal).

Listado HTML estático en /competicions/ (WordPress + Tailwind). Cada competición es
un <article class="competition delegation-{provincia} season-tempada-{año}"> con la
fecha (dd/mm/aaaa), la disciplina, el ámbito y el enlace a su ficha. No hace falta
abrir cada detalle: el propio listado trae lo esencial.
"""

from __future__ import annotations

import re
from datetime import date

from selectolax.parser import HTMLParser

from calendar_scraper.http import Http
from calendar_scraper.models import Competicion, Inscripcion

BASE = "https://atletismo.gal"
LISTADO = f"{BASE}/competicions/"
_FECHA = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")


def _provincia(clases: str) -> str | None:
    for c in clases.split():
        if c.startswith("delegation-"):
            p = c[len("delegation-"):].replace("-", " ").strip()
            return p.title() if p else None
    return None


def _fechas(art) -> tuple[date | None, date | None]:
    # La/s fecha/s viven en el badge rojo (puede haber un rango con 2 fechas).
    badge = art.css_first(".bg-red") or art
    encontradas = []
    for d, m, y in _FECHA.findall(badge.text()):
        try:
            encontradas.append(date(int(y), int(m), int(d)))
        except ValueError:
            pass
    if not encontradas:
        return None, None
    return min(encontradas), max(encontradas)


def listar(http: Http, desde: date, hasta: date) -> list[Competicion]:
    try:
        html = http.get_text(LISTADO)
    except Exception:
        return []
    tree = HTMLParser(html)

    out: list[Competicion] = []
    for art in tree.css("article.competition"):
        a = art.css_first("h2 a[href*='/competicions/']")
        if not a:
            continue
        url = a.attributes.get("href") or ""
        slug = url.rstrip("/").rsplit("/", 1)[-1]
        if slug in ("", "competicions"):
            continue

        ini, fin = _fechas(art)
        if not ini or not (desde <= ini <= hasta):
            continue

        # Disciplina: primer <span class="text-sm font-normal">
        disc = None
        for sp in art.css("span.font-normal"):
            txt = sp.text(strip=True)
            if txt and "/" not in txt:  # evita el span de la fecha
                disc = txt
                break

        out.append(Competicion(
            nombre=a.text(strip=True),
            ambito="Galicia",
            disciplina=disc,
            fecha_inicio=ini,
            fecha_fin=fin or ini,
            lugar=_provincia(art.attributes.get("class") or ""),
            pruebas=[],
            inscripcion=Inscripcion(
                instrucciones="Consultar la ficha de la Federación Galega.",
            ),
            url_detalle=url if url.startswith("http") else f"{BASE}{url}",
            fuente="galicia",
        ))
    return out
