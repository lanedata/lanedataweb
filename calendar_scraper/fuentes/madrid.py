"""Fuente: Federación de Atletismo de Madrid (atletismomadrid.com).

La FAM publica el calendario MENSUAL en artículos Joomla distintos (un id de
artículo por mes), por lo que scrapear un único artículo (antes id=3292) solo
traía ese mes y se perdían julio, agosto… En cambio expone la TEMPORADA COMPLETA
como Excel:
  `modules/mod_calendario/excel/calendario_excel.php?temporada=<año>`
Leemos ese Excel (todos los meses de una vez) con openpyxl. Columnas:
  Fecha · Día · Fecha Fin · Día · Competición · Lugar · Tipo · Últ. modificación.

Va tras Cloudflare; `http.Http` (curl_cffi impersonate chrome) lo pasa en local.
"""

from __future__ import annotations

import io
from datetime import date, datetime

from calendar_scraper.http import Http
from calendar_scraper.models import Competicion, Inscripcion

BASE = "https://www.atletismomadrid.com"
# Página de calendario (vista web del mes en curso): la usamos como enlace de ficha.
CAL = f"{BASE}/index.php?option=com_content&view=article&id=3292&Itemid=111"
# Export Excel de la temporada completa (parametrizado por año, estable toda la temporada).
EXCEL = f"{BASE}/modules/mod_calendario/excel/calendario_excel.php?temporada={{anio}}&Itemid=111"

_DISC = {
    "AL": "Pista Aire libre", "PC": "Pista Cubierta", "R": "Ruta",
    "M": "Marcha", "TR-MT": "Trail", "TR": "Trail", "CT": "Cross", "O": "Cross",
}


def _a_fecha(v: object) -> date | None:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    return None


def _texto(v: object) -> str | None:
    s = str(v).strip() if v is not None else ""
    return s or None


def listar(http: Http, desde: date, hasta: date) -> list[Competicion]:
    try:
        from openpyxl import load_workbook
    except Exception:
        return []

    out: list[Competicion] = []
    for anio in range(desde.year, hasta.year + 1):
        try:
            data = http.get_bytes(EXCEL.format(anio=anio))
            wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        except Exception:
            continue
        try:
            for row in wb.active.iter_rows(min_row=2, values_only=True):
                if not row or len(row) < 6:
                    continue
                ini = _a_fecha(row[0])
                if not ini or not (desde <= ini <= hasta):
                    continue
                nombre = _texto(row[4])
                if not nombre:
                    continue
                fin = _a_fecha(row[2]) or ini
                if fin < ini:
                    fin = ini
                tipo = (str(row[6]).strip().upper() if len(row) > 6 and row[6] else "")
                out.append(Competicion(
                    nombre=nombre,
                    ambito="Madrid",
                    disciplina=_DISC.get(tipo),
                    fecha_inicio=ini,
                    fecha_fin=fin,
                    lugar=_texto(row[5]),
                    comunidad="Madrid",
                    pruebas=[],
                    inscripcion=Inscripcion(
                        instrucciones="Inscripción y normas en la web de la Federación de Madrid.",
                    ),
                    url_detalle=CAL,
                    url_calendario_federacion=CAL,
                    fuente="madrid",
                ))
        finally:
            wb.close()
    return out
