"""Fuente RFEA: calendario nacional (agrega también campeonatos autonómicos).

Flujo:
  1) Calendario AJAX por mes -> competiciones (nombre, fecha, lugar, disciplina, detalle).
  2) Página de detalle -> sfid, ámbito, rango de fechas, sitio oficial, documentos, enlaces.
  3) /championship-inscritos/{sfid}/0/1 -> lista de pruebas (y, si se quiere, inscritos).
"""

from __future__ import annotations

import json
import re
from datetime import date

from selectolax.parser import HTMLParser

from calendar_scraper.http import Http
from calendar_scraper.models import Competicion, Documento, Inscripcion, Inscrito, Prueba

BASE = "https://atletismorfea.es"

# Año -> value del <option> de temporada del calendario (taxonomy). Fallback dinámico abajo.
_SEASON = {2024: "350", 2025: "416", 2026: "464", 2027: "482"}
_MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}


# ---------- Calendario (listado) ----------

def _season_value(http: Http, year: int) -> str:
    if year in _SEASON:
        return _SEASON[year]
    try:
        tree = HTMLParser(http.get_text(f"{BASE}/calendario"))
        for opt in tree.css(".calendar-field-season option, .form-item-season option"):
            if opt.text(strip=True) == str(year):
                v = opt.attributes.get("value")
                if v:
                    return v
    except Exception:
        pass
    return str(year)


def _ajax_calendario(http: Http, year: int, desde: date, hasta: date) -> str:
    import time as _t

    season = _season_value(http, year)
    url = (
        f"{BASE}/ajax/calendario/{int(_t.time())}/Deportivo/0/0/0/0/{season}/"
        f"{desde.isoformat()}/{hasta.isoformat()}/0?_wrapper_format=drupal_ajax"
    )
    data = json.loads(http.get_text(url))
    for c in data:
        if "calendar_container" in (c.get("data") or ""):
            return c["data"]
    return ""


def _parse_calendario(inner_html: str) -> list[dict]:
    tree = HTMLParser(inner_html)
    span = tree.css_first(".calendar_pager span")
    if not span:
        return []
    partes = span.text(strip=True).lower().split()
    mes = _MESES.get(partes[0]) if partes else None
    try:
        anio = int(partes[-1])
    except (ValueError, IndexError):
        return []
    if not mes:
        return []

    out: list[dict] = []
    for day in tree.css(".calendar-day"):
        md = day.css_first(".calendar-day__date .monthday")
        if not md or not md.text(strip=True).isdigit():
            continue
        try:
            fecha = date(anio, mes, int(md.text(strip=True)))
        except ValueError:
            continue
        for item in day.css(".calendar-item"):
            a = item.css_first("a")
            titulo = item.css_first(".event__title")
            if not a or not titulo:
                continue
            href = a.attributes.get("href") or ""
            disc = item.css_first(".event__discipline")
            loc = item.css_first(".event__location")
            out.append({
                "nombre": titulo.text(strip=True),
                "fecha": fecha,
                "disciplina": disc.text(strip=True) if disc else None,
                "lugar": loc.text(strip=True) if loc else None,
                "url_detalle": href if href.startswith("http") else f"{BASE}{href}",
            })
    return out


def listar(http: Http, desde: date, hasta: date) -> list[dict]:
    """Competiciones del rango [desde, hasta], deduplicadas por (nombre, detalle)."""
    vistos: dict[tuple, dict] = {}
    for anio, mes in _meses_en_rango(desde, hasta):
        primero = date(anio, mes, 1)
        ultimo = _fin_de_mes(anio, mes)
        inner = _ajax_calendario(http, anio, primero, ultimo)
        for c in _parse_calendario(inner):
            if desde <= c["fecha"] <= hasta:
                vistos.setdefault((c["nombre"], c["url_detalle"]), c)
    return list(vistos.values())


# ---------- Detalle + pruebas ----------

_RANGO_FECHAS = re.compile(r"del\s+(\d{1,2})\s+(?:al\s+(\d{1,2})\s+)?de\s+([a-záéíóú]+)", re.I)
_PLAZO = re.compile(
    r"inscri\w*.{0,40}?hasta\s+(?:el\s+)?(\d{1,2})\s+de\s+([a-záéíóú]+)", re.I | re.S
)


def _parse_rango(texto: str, anio: int) -> tuple[date | None, date | None]:
    m = _RANGO_FECHAS.search(texto or "")
    if not m:
        return None, None
    d1 = int(m.group(1))
    mes = _MESES.get(m.group(3).lower())
    if not mes:
        return None, None
    try:
        ini = date(anio, mes, d1)
        fin = date(anio, mes, int(m.group(2))) if m.group(2) else ini
        return ini, fin
    except ValueError:
        return None, None


def _buscar_plazo(texto: str, anio: int) -> date | None:
    m = _PLAZO.search(texto or "")
    if not m:
        return None
    mes = _MESES.get(m.group(2).lower())
    if not mes:
        return None
    try:
        return date(anio, mes, int(m.group(1)))
    except ValueError:
        return None


def _pruebas(http: Http, sfid: str) -> list[Prueba]:
    try:
        data = http.get_json(f"{BASE}/championship-inscritos/{sfid}/0/1")
    except Exception:
        return []
    inner = next((c["data"] for c in data if c.get("data")), "")
    tree = HTMLParser(inner)
    out: list[Prueba] = []
    for opt in tree.css("select option"):
        val = (opt.attributes.get("value") or "").strip()
        nombre = opt.text(strip=True)
        if val and nombre and nombre.lower() not in ("prueba", "todas"):
            out.append(Prueba(id=val, nombre=nombre))
    return out


def _inner(data) -> str:
    return next((c["data"] for c in data if c.get("data")), "")


def parse_inscritos_tabla(inner_html: str) -> list[Inscrito]:
    """Parsea una página de la tabla de inscritos. Columnas:
    Marca inscr. · Nombre · Apellidos · Club · País · Categoría · Fecha marca · Lugar marca.
    """
    tree = HTMLParser(inner_html)
    out: list[Inscrito] = []
    for tr in tree.css("tr"):
        celdas = tr.css("td")
        if len(celdas) < 6:
            continue
        t = [c.text(strip=True) for c in celdas]
        out.append(Inscrito(
            marca_inscripcion=t[0] or None,
            nombre=t[1] or None,
            apellidos=t[2] or None,
            club=t[3] or None,
            pais=t[4] or None,
            categoria=t[5] or None,
            fecha_marca=t[6] if len(t) > 6 and t[6] else None,
            lugar_marca=t[7] if len(t) > 7 and t[7] else None,
        ))
    return out


def inscritos_de_prueba(
    http: Http, sfid: str, prueba_id: str, *, max_paginas: int = 30
) -> list[Inscrito]:
    """Start list de una prueba, paginando hasta agotar."""
    todas: list[Inscrito] = []
    for page in range(1, max_paginas + 1):
        try:
            data = http.get_json(f"{BASE}/championship-inscritos/{sfid}/{prueba_id}/{page}")
        except Exception:
            break
        lote = parse_inscritos_tabla(_inner(data))
        if not lote:
            break
        todas.extend(lote)
        if len(lote) < 20:  # página incompleta -> última
            break
    return todas


def rellenar_inscritos(http: Http, comp: Competicion) -> Competicion:
    """Descarga la start list de cada prueba de la competición (1 request por prueba)."""
    if not comp.id:
        return comp
    for prueba in comp.pruebas:
        if prueba.id:
            prueba.inscritos = inscritos_de_prueba(http, comp.id, prueba.id)
            prueba.n_inscritos = len(prueba.inscritos)
    return comp


def enriquecer(http: Http, comp: dict) -> Competicion:
    """Construye la Competicion completa a partir de la entrada de calendario."""
    anio = comp["fecha"].year
    html = http.get_text(comp["url_detalle"])
    tree = HTMLParser(html)
    texto = tree.text()

    sfid_el = tree.css_first("[data-sfid]")
    sfid = sfid_el.attributes.get("data-sfid") if sfid_el else None

    area = tree.css_first(".c_e_area")
    titulo = tree.css_first(".c_e_title")
    fecha_txt = tree.css_first(".c_e_date")

    ini, fin = _parse_rango(fecha_txt.text() if fecha_txt else "", anio)
    if not ini:
        ini = fin = comp["fecha"]

    # Enlaces: sitio oficial, directo, resultados, documentos
    sitio_oficial = None
    url_directo = None
    url_resultados = None
    documentos: list[Documento] = []
    for a in tree.css("a"):
        href = (a.attributes.get("href") or "").strip()
        if not href:
            continue
        url = href if href.startswith("http") else f"{BASE}{href}"
        txt = a.text(strip=True)
        low = f"{txt} {href}".lower()
        if "sitio oficial" in txt.lower():
            sitio_oficial = url
        elif "directo" in low or "streaming" in low or "live" in low:
            url_directo = url_directo or url
        elif "resultados de la competic" in txt.lower() or "rfeacontent" in href:
            url_resultados = url_resultados or url
        elif href.lower().endswith(".pdf"):
            documentos.append(Documento(nombre=txt or href.rsplit("/", 1)[-1], url=url))

    pruebas = _pruebas(http, sfid) if sfid else []

    # Inscripción (best-effort): buscar el plazo en el texto del detalle y en los
    # nombres de los documentos (p. ej. una circular de inscripción).
    plazo = _buscar_plazo(texto + " " + " ".join(d.nombre for d in documentos), anio)
    insc_url = sitio_oficial or comp["url_detalle"]
    if sitio_oficial:
        instrucciones = "Inscripción en el sitio oficial de la competición."
    elif (area.text(strip=True) if area else "") == "RFEA":
        instrucciones = "Competición RFEA: inscripción por la federación (ver normas)."
    else:
        instrucciones = "Consultar la página de detalle / federación organizadora."

    return Competicion(
        id=sfid,
        nombre=(titulo.text(strip=True) if titulo else comp["nombre"]),
        ambito=(area.text(strip=True) if area else None),
        disciplina=comp.get("disciplina"),
        fecha_inicio=ini,
        fecha_fin=fin,
        lugar=comp.get("lugar"),
        pruebas=pruebas,
        inscripcion=Inscripcion(
            abierta=bool(sitio_oficial) or None,
            fecha_limite=plazo,
            url=insc_url,
            instrucciones=instrucciones,
        ),
        url_detalle=comp["url_detalle"],
        url_inscritos=(f"{BASE}/championship-inscritos/{sfid}/0/1" if sfid else None),
        url_resultados=url_resultados,
        url_directo=url_directo,
        documentos=documentos,
        fuente="rfea",
    )


# ---------- utilidades de fechas ----------

def _meses_en_rango(desde: date, hasta: date) -> list[tuple[int, int]]:
    out, y, m = [], desde.year, desde.month
    while (y, m) <= (hasta.year, hasta.month):
        out.append((y, m))
        m, y = (1, y + 1) if m == 12 else (m + 1, y)
    return out


def _fin_de_mes(anio: int, mes: int) -> date:
    import calendar

    return date(anio, mes, calendar.monthrange(anio, mes)[1])
