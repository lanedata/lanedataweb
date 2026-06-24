"""Fuente: Federación Andaluza de Atletismo (web.faalive.com).

La web es una SPA Blazor WebAssembly: el calendario se renderiza con JS y no hay
API pública sin clave. Con Playwright cargamos la página, iteramos las pestañas de
mes y leemos las tarjetas del DOM (.card → .fecha, .titleDate, .location).
"""

from __future__ import annotations

import re
from datetime import date

CAL_URL = "https://web.faalive.com/Calendar"
_MESES = {
    "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AGO": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12,
}

_EXTRAER = r"""() => [...document.querySelectorAll('.card')].map(c => ({
    fecha: (c.querySelector('.fecha')?.innerText||'').replace(/\s+/g,' ').trim(),
    nombre: (c.querySelector('.titleDate')?.innerText||'').trim(),
    loc: (c.querySelector('.location')?.innerText||'').replace(/\s+/g,' ').trim()
})).filter(x => x.nombre)"""


def _anyo_en_ventana(mes: int, dia: int, desde: date, hasta: date) -> date | None:
    for y in (desde.year, desde.year + 1, hasta.year, desde.year - 1):
        try:
            cand = date(y, mes, dia)
        except ValueError:
            continue
        if desde <= cand <= hasta:
            return cand
    return None


def listar(page, desde: date, hasta: date):
    # Import diferido para no exigir pydantic/modelo en entornos sin él.
    from calendar_scraper.models import Competicion, Inscripcion

    page.goto(CAL_URL, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(3000)

    tabs = page.evaluate(
        r"""() => [...document.querySelectorAll('li a .date, li a span.date')]
            .map(e => e.innerText.trim().split(/\s+/)[0])"""
    )
    tabs = [t for t in tabs if t in _MESES]

    crudas: dict[tuple, dict] = {}
    for mes in tabs or ["JUN"]:
        try:
            page.click(f'li a:has(.date:has-text("{mes}"))', timeout=4000)
            page.wait_for_timeout(1100)
        except Exception:
            pass
        for c in page.evaluate(_EXTRAER):
            crudas[(c["fecha"], c["nombre"])] = c

    out = []
    for c in crudas.values():
        m = re.search(r"(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)", c["fecha"])
        dias = re.findall(r"\d{1,2}", c["fecha"])
        if not m or not dias:
            continue
        mes = _MESES[m.group(1)]
        ini = _anyo_en_ventana(mes, int(dias[0]), desde, hasta)
        if not ini:
            continue
        fin = _anyo_en_ventana(mes, int(dias[-1]), desde, hasta) if len(dias) > 1 else ini
        lugar = c["loc"] or None
        out.append(Competicion(
            nombre=c["nombre"],
            ambito="Andalucía",
            fecha_inicio=ini,
            fecha_fin=fin or ini,
            lugar=lugar,
            comunidad="Andalucía",
            pruebas=[],
            inscripcion=Inscripcion(instrucciones="Consultar la web de la Federación Andaluza."),
            url_detalle=CAL_URL,
            url_calendario_federacion=CAL_URL,
            fuente="andalucia",
        ))
    return out
