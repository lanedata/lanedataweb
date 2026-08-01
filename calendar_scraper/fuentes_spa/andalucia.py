"""Fuente: Federación Andaluza de Atletismo (web.faalive.com).

La web es una SPA Blazor WebAssembly: el calendario se renderiza con JS y no hay
API pública sin clave. Con Playwright cargamos la página, iteramos las pestañas de
mes y leemos las tarjetas del DOM (.card → .fecha, .titleDate, .location).
"""

from __future__ import annotations

import re
from datetime import date

from calendar_scraper.fechas import MESES_ABREV, anyo_en_ventana

CAL_URL = "https://web.faalive.com/Calendar"
_MES_RE = re.compile("|".join(MESES_ABREV))

_EXTRAER = r"""() => [...document.querySelectorAll('.card')].map(c => ({
    fecha: (c.querySelector('.fecha')?.innerText||'').replace(/\s+/g,' ').trim(),
    nombre: (c.querySelector('.titleDate')?.innerText||'').trim(),
    loc: (c.querySelector('.location')?.innerText||'').replace(/\s+/g,' ').trim()
})).filter(x => x.nombre)"""


def listar(page, desde: date, hasta: date):
    # Import diferido para no exigir pydantic/modelo en entornos sin él.
    from calendar_scraper.models import Competicion, Inscripcion

    page.goto(CAL_URL, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(3000)

    tabs = page.evaluate(
        r"""() => [...document.querySelectorAll('li a .date, li a span.date')]
            .map(e => e.innerText.trim().split(/\s+/)[0])"""
    )
    tabs = [t for t in tabs if t in MESES_ABREV]

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
        m = _MES_RE.search(c["fecha"])
        dias = re.findall(r"\d{1,2}", c["fecha"])
        if not m or not dias:
            continue
        mes = MESES_ABREV[m.group(0)]
        ini = anyo_en_ventana(mes, int(dias[0]), desde, hasta)
        if not ini:
            continue
        fin = anyo_en_ventana(mes, int(dias[-1]), desde, hasta) if len(dias) > 1 else ini
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
