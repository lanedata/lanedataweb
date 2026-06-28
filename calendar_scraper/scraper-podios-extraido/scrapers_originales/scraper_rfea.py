#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper de resultados de RFEA Live (rfealive.me) -- TERCER formato de
competición, distinto a conersyslive.es (engine.py) y a la FAM /
atletismomadrid.com (scraper_fam.py).

Mismo proveedor de datos por detrás que conersyslive.es (el pie de página
dice "Conersys Sports Solutions - RFEA"), pero la plantilla web es
COMPLETAMENTE distinta: clases "rfep-...", "rgb-team-1", "tb-theam"
combinadas de forma distinta... nada que ver con las clases
"upcoming-table__date"/"upcoming-table__label" de conersyslive.es.
Confirmado 2026-06-23 con dos HTML reales que pasó Riki (Ctrl+U de
rfealive.me/Results/Schedule?chid=2026EXT69178 y de una página
ResultsEvent de esa misma competición) -- por eso hace falta un parser
nuevo, contrario a la hipótesis inicial de "mismo proveedor = nada que
tocar".

Diferencias clave respecto a los otros dos formatos:
  - El horario (Schedule) SÍ usa el mismo patrón de enlace
    a[href*="ResultsEvent"] que conersyslive.es, así que esa parte se
    pudo adaptar casi igual (ver parse_schedule).
  - La página de resultados de cada prueba (ResultsEvent) trae una tabla
    real <table id="myTable"> con 9 columnas fijas, incluyendo el CLUB
    REAL del atleta (no la nacionalidad, a diferencia de conersyslive.es),
    categoría y fecha de nacimiento -- mejor que conersyslive.es para
    cruzar con la BD local (cruce_local.py), de hecho ya no haría falta
    el truco de "club real buscado en la BD" para esta fuente.
  - El viento es UN ÚNICO valor para toda la prueba, fuera de la tabla,
    junto a un icono <img src=".../wind.png">. Si la celda de viento de
    la fila (columna en blanco justo antes de "RESULTADO") trae un valor
    propio (previsible en concursos con viento por intento), se usa esa;
    si no, se cae al viento global de la página.
  - Cada fila de atleta va seguida de una <tr> oculta (colspan=9,
    style="display:none") con detalles adicionales -- se descarta porque
    solo tiene 1 <td> en vez de 9.

NOTA DE VERIFICACIÓN: parser escrito y revisado a partir de 2 páginas HTML
reales (horario completo + resultados de 100m Hombres Final, carrera).
Aún NO probado contra una prueba de CONCURSO (salto/lanzamiento, donde
podría haber columnas de intentos 1-6 en vez de "RESULTADO" simple) ni
contra filas con DNS/DNF/series. Conviene hacer una prueba en vivo con un
concurso real antes de confiar el resultado a ciegas.
"""
import re
from urllib.parse import urljoin, unquote

import requests
from bs4 import BeautifulSoup

import engine  # reutiliza nombre_corto() -- misma regla en los 3 formatos
import cruce   # separar_marca_viento() -- compartido con engine.py y scraper_fam.py

HEADERS = {"User-Agent": "Mozilla/5.0 (AtletismoPodios/1.0)"}


def _get(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    r.encoding = "utf-8"
    return BeautifulSoup(r.text, "html.parser")


def _txt(el):
    return el.get_text(" ", strip=True) if el else ""


def parse_schedule(url):
    """Lista de pruebas del horario (Schedule) de rfealive.me.

    Mismo patrón de enlaces que conersyslive.es (a[href*="ResultsEvent"]),
    pero aquí la ronda ("Final", "Semifinal"...) viene en un <small>
    hermano del enlace del nombre, no dentro del propio texto del enlace.
    El "estado" (oficial/provisional) no está disponible a este nivel en
    rfealive.me -- solo aparece dentro de la página de resultados de cada
    prueba (badge "Oficial"), así que se deja vacío aquí.
    """
    soup = _get(url)
    comp = ""
    # El nombre de la competición vive en <h4 class="section-title border-top">,
    # mezclado con un <span> de icono y un <button id="btnFilter"> de filtro
    # (confirmado 2026-06-23 con HTML real que pasó Riki) -- hay que quitar
    # esos hijos antes de sacar el texto, si no se cuela el icono/botón.
    h4 = soup.find("h4", class_="section-title")
    if h4:
        copia = BeautifulSoup(str(h4), "html.parser")
        for hijo in copia.find_all(["button", "span", "script"]):
            hijo.decompose()
        t = copia.get_text(" ", strip=True)
        if t:
            comp = t
    if not comp:
        for sel in ("h1", "h2", "h3", "title"):
            for el in soup.select(sel):
                t = el.get_text(" ", strip=True)
                if t and len(t) > 8 and "rfea live" not in t.lower():
                    comp = t
                    break
            if comp:
                break

    base = re.match(r"https?://[^/]+", url).group(0)
    eventos, vistos = [], set()
    for a in soup.select('a[href*="ResultsEvent"]'):
        href = a.get("href", "")
        m = re.search(r"key=([^&]+)", href)
        if not m:
            continue
        key = unquote(m.group(1))
        if key in vistos:
            continue
        texto = a.get_text(" ", strip=True)
        if not texto:
            continue
        vistos.add(key)

        ronda = ""
        td_nombre = a.find_parent("td")
        if td_nombre:
            sm = td_nombre.find("small")
            if sm:
                ronda = sm.get_text(" ", strip=True)

        hora = fecha = ""
        fila = a.find_parent("tr")
        if fila:
            texto_fila = " ".join(c.get_text(" ", strip=True) for c in fila.find_all("td"))
            mh = re.search(r"(\d{1,2}:\d{2})", texto_fila)
            mf = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", texto_fila)
            hora = mh.group(1) if mh else ""
            fecha = mf.group(1) if mf else ""

        eventos.append({
            "nombre": texto,
            "ronda": ronda,
            "hora": hora,
            "fecha": fecha,
            "estado": "",
            "key": key,
            "url": urljoin(base, href),
        })
    return comp, eventos


def parse_event(url):
    """Devuelve (podio[top3], viento, estado) de una página ResultsEvent de
    rfealive.me. Estructura confirmada con HTML real (100m Hombres Final y
    Triple Salto Hombres, competición 2026EXT69178): <table id="myTable">
    (la primera del documento -- es la versión DESKTOP; hay una segunda
    tabla con el mismo id para la versión móvil, con menos columnas, que
    BeautifulSoup ignora porque .find() solo coge la primera) con 9 <td>
    por fila de atleta, en este orden fijo:
      0 RK | 1 dorsal | 2 nombre+licencia | 3 categoría | 4 fecha nac. |
      5 CLUB (real) | 6 viento (vacío en carreras y, de momento, también
      en concursos: el viento por intento solo aparece en el desplegable
      oculto de detalle, no en esta columna) | 7 RESULTADO | 8 puntos
    Cada fila de atleta va seguida de una <tr> de detalle oculta con un
    único <td colspan="9"> -- se descarta por no tener 9 <td>.

    El "estado" (Oficial/Provisional) NO está en el horario (Schedule),
    solo aquí, en un <div class="badge badge-official">Oficial</div> junto
    al título de la prueba -- por eso parse_schedule() siempre deja
    estado="" y hay que rellenarlo a partir de esta función (ver app.py,
    rama "rfealive.me" de /api/events), si no el checkbox "Solo pruebas
    oficiales" del front filtra TODAS las pruebas al no encontrar
    'oficial'/'finalizado' en e.estado.
    """
    soup = _get(url)

    estado = ""
    badge = soup.find("div", class_="badge-official")
    if badge:
        estado = badge.get_text(strip=True)

    viento_pagina = ""
    wimg = soup.find("img", src=re.compile(r"wind\.png"))
    if wimg:
        sib = wimg.find_next(["h6", "span"])
        if sib:
            mv = re.search(r"[+-]?\d+(?:[.,]\d+)?", sib.get_text(strip=True))
            if mv:
                viento_pagina = mv.group(0).replace(",", ".")

    tabla = soup.find("table", id="myTable")
    if not tabla:
        return [], viento_pagina, estado

    filas = []
    avisado_columnas = False
    for tr in tabla.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) != 9:
            if len(tds) > 1 and not avisado_columnas:
                # Forma de fila inesperada (¿concurso con columnas de intentos?
                # ¿formato distinto?) -- avisar una vez para revisar a mano.
                print(f"[scraper_rfea] AVISO: fila con {len(tds)} columnas (se esperaban 9) en {url}")
                avisado_columnas = True
            continue

        rk_txt = _txt(tds[0])
        mrk = re.search(r"\d+", rk_txt)
        if not mrk:
            continue
        rk = int(mrk.group(0))

        nombre_td = tds[2]
        nom_a = nombre_td.find("a")
        crudo = _txt(nom_a) if nom_a else _txt(nombre_td)
        licencia = _txt(nombre_td.find("p"))
        categoria = _txt(tds[3])
        fechaNac = _txt(tds[4])
        club = _txt(tds[5])
        # marca (+ viento, si viene PEGADO en la misma celda RESULTADO --
        # visto en saltos: "7.20 0.0"; separar_marca_viento() los separa
        # para no mostrarlos juntos en el vídeo, decisión 2026-06-24 con
        # Riki). Prioridad del viento: columna dedicada (6) > pegado a la
        # marca (7) > viento global de la página.
        marca, viento_marca = cruce.separar_marca_viento(_txt(tds[7]))
        viento_celda = _txt(tds[6])
        if re.match(r"^[+-]?\d", viento_celda):
            viento = viento_celda
        elif viento_marca is not None:
            viento = viento_marca
        else:
            viento = viento_pagina

        filas.append({
            "puesto": rk,
            "nombre": engine.nombre_corto(crudo),
            "atleta": crudo,
            "licencia": licencia,
            "categoria": categoria,
            "fechaNac": fechaNac,
            "club": club,
            "marca": marca,
            "viento": viento,
        })

    filas.sort(key=lambda x: x["puesto"])
    podio = [p for p in filas if p["puesto"] in (1, 2, 3)][:3]
    return podio, viento_pagina, estado
