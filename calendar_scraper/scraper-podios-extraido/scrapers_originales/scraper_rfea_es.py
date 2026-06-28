#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper de resultados de RFEA Live NUEVO (rfealive.es) -- CUARTO formato de
competición, distinto a conersyslive.es (engine.py), atletismomadrid.com/FAM
(scraper_fam.py) y al rfealive.me "antiguo" (scraper_rfea.py).

Mismo proveedor de datos por detrás que conersyslive.es y rfealive.me (el
bucket S3 se llama "conersys-live-d", igual que el resto de la familia
Conersys), pero el frontend es una app Blazor WebAssembly (.NET) que NO
sirve tablas HTML en absoluto: cada competición se descarga como un JSON
comprimido en gzip directamente desde S3, sin pasar por el servidor de la
propia rfealive.es. Por eso este scraper NO usa BeautifulSoup ni hace
scraping de HTML -- solo descarga y descomprime JSON. Confirmado 2026-06-24
con Riki a partir de las peticiones de red reales de
https://rfealive.es/sch/2026CAT65561 (DevTools -> Network).

Estructura de URLs:
  Horario de una competición (lo que pega el usuario):
    https://rfealive.es/sch/<CODIGO>          (ej. 2026CAT65561)
  Datos en bruto (gzip-JSON), SIN necesidad de cabeceras especiales:
    https://conersys-live-d.s3.dualstack.eu-west-3.amazonaws.com/CH<CODIGO>
      -> datos generales del campeonato (título, sede...)
    https://conersys-live-d.s3.dualstack.eu-west-3.amazonaws.com/SCH<CODIGO>
      -> TODO el horario, con los resultados YA INCLUIDOS por cada prueba/
         ronda (no hace falta una petición aparte por prueba, a diferencia
         de los otros 3 formatos -- aquí "parse_schedule()" ya devuelve el
         podio de cada prueba en una sola descarga).

Cada elemento del JSON de SCH<CODIGO> es UNA RONDA/FASE de una prueba (ej.
"60 m vallas Hombres" + "Eliminatoria 1/4"), con su propio campo "Results"
(lista de atletas con Rank/RankPO/Result/Record/Medal/GroupLongDes=club
real/Name) y "Wind" (viento de TODA la ronda, igual que conersys/FAM). El
podio de la prueba se saca de la fase "Final"/"Final A"/"Final B" (no de las
eliminatorias/semifinales/series).

LIMITACIÓN CONOCIDA (no resuelta, documentada 2026-06-24): el JSON no trae
fecha de nacimiento ni categoría de edad por atleta (a diferencia de FAM),
así que para el cruce con la BD local (PB/SB/récord/mínima/Nº1) se depende
de que cruce_local encuentre al atleta por nombre+club, igual que ya pasaba
con conersyslive.es (engine.py tampoco trae fechaNac/categoría). El nombre
del atleta tampoco viene completo: la web solo da la INICIAL del nombre +
apellido(s) en mayúsculas (ej. "J ARIAS GONZALEZ "), nunca el nombre de pila
completo -- limitación de los datos de origen, no del scraper.

NOTA DE VERIFICACIÓN: estructura revisada contra el JSON real de
2026CAT65561 (Campeonato de España sub-20 de pista cubierta). Todos los
"Status"/"StsDescription" vistos en esa competición eran "Oficial" (110) --
no se ha podido confirmar todavía cómo se ve una prueba pendiente/
provisional en este formato. Conviene revisarlo la primera vez que se use
con una competición en directo.
"""
import re
import gzip
import json
import requests

import cruce  # separar_marca_viento() -- compartido con los otros 3 scrapers

S3_BASE = "https://conersys-live-d.s3.dualstack.eu-west-3.amazonaws.com/"
HEADERS = {"User-Agent": "Mozilla/5.0 (AtletismoPodios/1.0)"}


def _codigo_de_url(url):
    """De 'https://rfealive.es/sch/2026CAT65561' (o variantes con barra final
    / mayúsculas distintas) -> '2026CAT65561'. El código es el último
    segmento de la ruta."""
    m = re.search(r"/sch/([A-Za-z0-9]+)", url, re.IGNORECASE)
    if m:
        return m.group(1)
    # fallback: último segmento de la URL, por si cambia el patrón de ruta
    return url.rstrip("/").split("/")[-1]


def _get_json_gz(key):
    """Descarga <key> de S3 y lo descomprime (gzip) a un dict/list de Python.
    Sin esto no hay manera de leer estos datos: el cuerpo es gzip "de
    verdad" (Content-Type: application/gzip), no una respuesta comprimida a
    nivel de transporte (Content-Encoding), así que requests NO lo
    descomprime solo -- hace falta gzip.decompress() a mano."""
    r = requests.get(S3_BASE + key, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return json.loads(gzip.decompress(r.content))


def _lang(lista, lang="ESP"):
    """Estos JSON repiten cada texto en varios idiomas:
    [{"Lang":"ESP","Msg":"..."},{"Lang":"ENG","Msg":"..."}]. Cogemos ESP, y
    si no está disponible, el primero que haya."""
    for d in (lista or []):
        if d.get("Lang") == lang:
            return d.get("Msg") or d.get("ShortMsg") or ""
    return ((lista or [{}])[0].get("Msg") or "") if lista else ""


def _fecha_fmt(iso):
    """'2026-03-21T00:00:00' -> '21/03/2026' (mismo formato que los otros
    3 scrapers)."""
    try:
        y, m, d = iso.split("T")[0].split("-")
        return f"{d}/{m}/{y}"
    except Exception:
        return iso or ""


def nombre_corto(crudo):
    """La web solo da la INICIAL del nombre (no el nombre completo) +
    apellido(s) en mayúsculas, ej. 'J ARIAS GONZALEZ ' -> 'J. Arias' --
    limitación de los datos de origen (confirmado 2026-06-24), no hay nombre
    de pila completo que recuperar aquí."""
    toks = (crudo or "").split()
    if not toks:
        return crudo or ""
    primero = toks[0]
    apellido = toks[1].title() if len(toks) > 1 else ""
    primero_fmt = (primero.upper() + ".") if len(primero) <= 2 else primero.capitalize()
    return (primero_fmt + " " + apellido).strip()


def _es_final(phase_msg):
    return bool(re.match(r"(?i)^final", (phase_msg or "").strip()))


def parse_schedule(url):
    """Devuelve (competicion, eventos) con el PODIO YA INCLUIDO -- a
    diferencia de engine.py/scraper_fam.py/scraper_rfea.py, aquí no hace
    falta una segunda petición por prueba: el JSON de SCH<codigo> ya trae
    los resultados de cada ronda/fase."""
    codigo = _codigo_de_url(url)
    comp = ""
    try:
        ch = _get_json_gz("CH" + codigo)
        comp = _lang(ch.get("Title"))
    except Exception:
        pass
    sch = _get_json_gz("SCH" + codigo)
    eventos = []
    for it in sch:
        nombre = _lang(it.get("Description"))
        ronda = _lang(it.get("PhaseDescription"))
        estado = _lang(it.get("StsDescription"))
        viento_ronda = it.get("Wind") or ""
        resultados = it.get("Results") or []
        podio = []
        if _es_final(ronda) and resultados:
            ordenados = sorted(resultados, key=lambda r: r.get("RankPO") or 999)[:3]
            for r in ordenados:
                marca, viento_inline = cruce.separar_marca_viento(str(r.get("Result") or ""))
                crudo = (r.get("Name") or "").strip()
                podio.append({
                    "puesto": r.get("Rank") or "",
                    "nombre": nombre_corto(crudo),
                    "atleta": crudo,
                    "club": r.get("GroupLongDes") or r.get("GroupShortDes") or "",
                    "marca": marca,
                    "viento": viento_inline or viento_ronda,
                })
        eventos.append({
            "nombre": nombre, "ronda": ronda,
            "hora": it.get("StartTime", ""), "fecha": _fecha_fmt(it.get("StartDate", "")),
            "estado": estado, "podio": podio, "viento": viento_ronda,
        })
    return comp, eventos


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print('Uso: python3 scraper_rfea_es.py "<URL del horario, ej. https://rfealive.es/sch/2026CAT65561>"')
        sys.exit(1)
    comp, eventos = parse_schedule(sys.argv[1])
    print(f"Competición: {comp}\nPruebas: {len(eventos)}\n")
    for e in eventos:
        if not e["podio"]:
            continue
        print(f"{e['nombre']} — {e['ronda']} [{e['estado']}]")
        for p in e["podio"]:
            print(f"  {p['puesto']}. {p['nombre']} ({p['club']}) {p['marca']} {p['viento']}")
