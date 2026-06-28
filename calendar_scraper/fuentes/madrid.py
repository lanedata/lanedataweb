"""Fuente: Federación de Atletismo de Madrid (atletismomadrid.com).

Calendario Joomla en una tabla HTML estática. Cada fila trae fecha, plazo de
inscripción, nombre, sede, y enlaces PDF a reglamento / inscritos / resultados,
además de la disciplina. Es de las fuentes más completas.
"""

from __future__ import annotations

import re
from datetime import date

from selectolax.parser import HTMLParser

from calendar_scraper.http import Http
from calendar_scraper.models import Competicion, Inscripcion

BASE = "https://www.atletismomadrid.com"
CAL = f"{BASE}/index.php?option=com_content&view=article&id=3292&Itemid=111"

_DISC = {
    "AL": "Pista Aire libre", "PC": "Pista Cubierta", "R": "Ruta",
    "M": "Marcha", "TR-MT": "Trail", "TR": "Trail", "CT": "Cross", "O": "Cross",
}


def _abs(href: str | None) -> str | None:
    if not href:
        return None
    return href if href.startswith("http") else f"{BASE}/{href.lstrip('/')}"


def _link(td) -> str | None:
    a = td.css_first("a")
    return _abs(a.attributes.get("href")) if a else None


def _anyo(mes: int, dia: int, hoy: date) -> date | None:
    best = None
    for y in (hoy.year, hoy.year + 1, hoy.year - 1):
        try:
            cand = date(y, mes, dia)
        except ValueError:
            continue
        if best is None or abs((cand - hoy).days) < abs((best - hoy).days):
            best = cand
    return best


def _fechas(txt: str, hoy: date) -> tuple[date | None, date | None]:
    # "03.06 (X)"  |  "06y07.06 (S-D)"  |  "31.05"
    m = re.search(r"(\d{1,2})(?:\s*[yY]\s*(\d{1,2}))?\s*\.\s*(\d{1,2})", txt)
    if not m:
        return None, None
    d1 = int(m.group(1)); d2 = int(m.group(2)) if m.group(2) else d1; mes = int(m.group(3))
    ini = _anyo(mes, d1, hoy)
    fin = _anyo(mes, d2, hoy) if d2 != d1 else ini
    return ini, fin


def _plazo(txt: str, hoy: date) -> date | None:
    m = re.search(r"(\d{1,2})\s*/\s*(\d{1,2})", txt or "")
    if not m:
        return None
    return _anyo(int(m.group(2)), int(m.group(1)), hoy)


def listar(http: Http, desde: date, hasta: date) -> list[Competicion]:
    try:
        html = http.get_text(CAL)
    except Exception:
        return []
    tree = HTMLParser(html)
    hoy = date.today()

    out: list[Competicion] = []
    for tr in tree.css("table tr"):
        tds = tr.css("td")
        if len(tds) < 8:
            continue
        nombre = tds[2].text(strip=True)
        if not nombre or "competic" in nombre.lower() and len(nombre) < 12:
            continue
        ini, fin = _fechas(tds[0].text(strip=True), hoy)
        if not ini or not (desde <= ini <= hasta):
            continue
        lugar = tds[3].text(strip=True) or None
        disc = _DISC.get(tds[7].text(strip=True).upper())
        plazo = _plazo(tds[1].text(strip=True), hoy)
        regl = _link(tds[4]); insc = _link(tds[5]); resul = _link(tds[6])

        out.append(Competicion(
            nombre=nombre,
            ambito="Madrid",
            disciplina=disc,
            fecha_inicio=ini,
            fecha_fin=fin or ini,
            lugar=lugar,
            comunidad="Madrid",
            pruebas=[],
            inscripcion=Inscripcion(
                abierta=bool(insc) or None,
                fecha_limite=plazo,
                instrucciones="Inscripción y normas en la web de la Federación de Madrid.",
            ),
            url_detalle=CAL,
            url_calendario_federacion=CAL,
            url_reglamento=regl,
            url_inscritos=insc,
            url_resultados=resul,
            fuente="madrid",
        ))
    return out
