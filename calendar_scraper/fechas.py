"""Utilidades de fecha compartidas por las fuentes.

Portado de `engine/fechas.py` del motor fantasy-atletismo-engine: cada fuente venía
repitiendo su propio diccionario de meses, con variantes distintas (unas incluían
"setiembre", otras no). Aquí hay una sola tabla y un solo criterio.
"""

from __future__ import annotations

from datetime import date

# Nombres completos, en minúsculas (con la variante "setiembre").
MESES: dict[str, int] = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}

# Abreviaturas de 3 letras en MAYÚSCULAS (formato de varias webs federativas).
MESES_ABREV: dict[str, int] = {
    "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AGO": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12,
}


def mes_en_texto(texto: str) -> int | None:
    """Busca un mes (nombre completo o abreviatura) dentro de un texto libre."""
    bajo = (texto or "").lower()
    for nombre, num in MESES.items():
        if nombre in bajo:
            return num
    alto = (texto or "").upper()
    for abrev, num in MESES_ABREV.items():
        if abrev in alto:
            return num
    return None


def anyo_en_ventana(mes: int, dia: int, desde: date, hasta: date) -> date | None:
    """Para calendarios que publican día/mes SIN año: prueba los años alrededor de la
    ventana y devuelve la fecha si cae dentro (None si ninguna cae)."""
    for y in (desde.year, desde.year + 1, hasta.year, desde.year - 1):
        try:
            cand = date(y, mes, dia)
        except ValueError:
            continue
        if desde <= cand <= hasta:
            return cand
    return None
