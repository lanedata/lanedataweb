"""Fuente: Federación Riojana de Atletismo (fratletismo.com).

Listado HTML estático en /competiciones. Cada competición es un
<div class="competicion ..."> con <h3> (nombre), <p class="provincia"> (lugar) y
<p class="cuando">DD <abbr title="MES">MES</abbr> <span class="ano">AAAA</span></p>.
"""

from __future__ import annotations

import re
from datetime import date

from selectolax.parser import HTMLParser

from calendar_scraper.fechas import mes_en_texto
from calendar_scraper.http import Http
from calendar_scraper.models import Competicion, Inscripcion

BASE = "https://www.fratletismo.com"
LISTADO = f"{BASE}/competiciones"


def _fecha(comp) -> date | None:
    cuando = comp.css_first(".cuando")
    if not cuando:
        return None
    # día
    m_dia = re.search(r"\d{1,2}", cuando.text())
    if not m_dia:
        return None
    dia = int(m_dia.group())
    # mes: del title del <abbr> o del texto
    abbr = cuando.css_first("abbr")
    mes_txt = abbr.attributes.get("title") if abbr and abbr.attributes.get("title") else cuando.text()
    mes = mes_en_texto(mes_txt)
    # año
    ano_el = cuando.css_first(".ano")
    m_ano = re.search(r"\d{4}", ano_el.text() if ano_el else cuando.text())
    if not mes or not m_ano:
        return None
    try:
        return date(int(m_ano.group()), mes, dia)
    except ValueError:
        return None


def listar(http: Http, desde: date, hasta: date) -> list[Competicion]:
    # Los errores se PROPAGAN a propósito (ver política en fuentes/__init__.py).
    tree = HTMLParser(http.get_text(LISTADO))

    out: list[Competicion] = []
    for comp in tree.css(".competicion"):
        h3 = comp.css_first("h3")
        if not h3 or not h3.text(strip=True):
            continue
        f = _fecha(comp)
        if not f or not (desde <= f <= hasta):
            continue
        prov = comp.css_first(".provincia")
        lugar = prov.text(strip=True).title() if prov and prov.text(strip=True) else None
        out.append(Competicion(
            nombre=h3.text(strip=True),
            ambito="La Rioja",
            fecha_inicio=f,
            fecha_fin=f,
            lugar=lugar,
            pruebas=[],
            inscripcion=Inscripcion(instrucciones="Consultar la ficha de la Federación Riojana."),
            url_detalle=LISTADO,
            url_calendario_federacion=LISTADO,
            comunidad="La Rioja",
            fuente="larioja",
        ))
    return out
