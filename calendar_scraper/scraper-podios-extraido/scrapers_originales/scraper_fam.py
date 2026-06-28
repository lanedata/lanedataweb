#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper de resultados de la FAM (atletismomadrid.com / resultadosDirecto).

Las páginas son HTML ESTÁTICO (no JavaScript), así que el scraping es directo
y fiable. Ventaja sobre conersys: cada atleta trae LICENCIA + FECHA DE
NACIMIENTO + CATEGORÍA + CLUB, ideal para cruzar con la base de datos del club.

Flujo:
  index.html  -> lista de pruebas con su Estado ("Finalizado" / "Lista de Salida")
  eventN.html -> tablas de resultados por ronda (Semifinal/Final) + clasificación

Uso por línea de comandos (en un PC/servidor con internet):
  python3 scraper_fam.py "https://www.atletismomadrid.com/images/stories/ficheros/eventos/resultadosDirecto/13430/index.html"
  -> solo coge las pruebas "Finalizado" (resultados definitivos) y guarda JSON.

Requisitos: requests, beautifulsoup4
"""
import sys, json, re, time
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
import cruce  # valor_marca / es_concurso / normaliza (para ordenar por marca)

HEADERS = {"User-Agent": "Mozilla/5.0 (AtletismoScraperFAM/1.0)"}


def _txt(el):
    return el.get_text(" ", strip=True) if el else ""


def _nombre_y_sub(celda):
    """Separa el texto principal del <small> (licencia / fecha de nacimiento)."""
    sub = ""
    s = celda.find("small")
    if s:
        sub = _txt(s); s.extract()
    return _txt(celda), sub


def parse_index(html):
    """Lista de pruebas del índice: hora, fecha, prueba, estado, archivo."""
    soup = BeautifulSoup(html, "html.parser")
    tabla = soup.find("table", id="eventsTable")
    out = []
    if not tabla:
        return out
    for tr in tabla.find_all("tr"):
        celdas = tr.find_all("td")
        if len(celdas) < 3:
            continue
        a = tr.find("a", href=True)
        c0 = celdas[0]; small = c0.find("small")
        fecha = _txt(small)
        if small: small.extract()
        out.append({
            "hora": _txt(c0),
            "fecha": fecha,
            "prueba": _txt(celdas[1]),
            "estado": _txt(celdas[2]),
            "archivo": a["href"] if a else "",
        })
    return out


def parse_event(html):
    """Devuelve {prueba, podio[], resultados[]} de una página de prueba.
    resultados: todas las filas (todas las rondas) con licencia/fechaNac/categoría.
    podio: top-3 de la ronda Final (o de la única tabla si no hay rondas)."""
    soup = BeautifulSoup(html, "html.parser")
    prueba = _txt(soup.find(id="compEvent")) or _txt(soup.find("title"))
    resultados = []
    for tabla in soup.select("table.resultsTable"):
        ronda = ""
        primera = tabla.find("tr")
        if primera:
            ronda = _txt(primera.find("th", attrs={"colspan": True}))
        hdr = tabla.find("tr", class_="headerEventsTable")
        if not hdr:
            continue
        cols = [_txt(th).lower() for th in hdr.find_all("th")]

        def idx(name):
            for i, c in enumerate(cols):
                if name in c:
                    return i
            return -1

        iAt, iCat, iClub = idx("atleta"), idx("categor"), idx("club")
        iRes, iPos, iVi = idx("resultado"), idx("puesto"), idx("viento")
        if iAt < 0:
            continue
        # El viento puede venir en la CELDA de cada atleta (saltos: viento de
        # su intento concreto) o SOLO en la CABECERA de la columna (carreras:
        # un único viento para toda la serie, ej. "Viento -1.7"; la celda de
        # cada atleta solo trae "q" de clasificado o va vacía). Sacamos el
        # viento de cabecera como reserva -- confirmado con captura real de
        # atletismomadrid.com 2026-06-22 (Semifinal 1, cabecera "Viento -1.7").
        viento_cabecera = ""
        if iVi >= 0:
            mv = re.search(r"[+-]?\d+(?:[.,]\d+)?", cols[iVi])
            if mv:
                viento_cabecera = mv.group(0).replace(",", ".")
        for tr in tabla.find_all("tr"):
            cl = tr.get("class") or []
            if "headerEventsTable" in cl or "footerEventsTable" in cl:
                continue
            tds = tr.find_all("td")
            if len(tds) <= max(iAt, iRes, iPos):
                continue
            nombre, licencia = _nombre_y_sub(tds[iAt])
            cat, fnac = _nombre_y_sub(tds[iCat]) if iCat >= 0 else ("", "")
            # marca (+ viento, si viene PEGADO en la misma celda RESULTADO --
            # visto en saltos: "7.20 0.0", sin columna de viento propia para
            # ese intento; cruce.separar_marca_viento() los separa para no
            # mostrarlos juntos en el vídeo, decisión 2026-06-24 con Riki).
            marca_celda, viento_marca = cruce.separar_marca_viento(_txt(tds[iRes]) if iRes >= 0 else "")
            viento_celda = _txt(tds[iVi]) if iVi >= 0 else ""
            # Prioridad del viento: columna dedicada de viento > pegado a la
            # marca > viento de cabecera (serie completa).
            if re.match(r"^[+-]?\d", viento_celda):
                viento = viento_celda
            elif viento_marca is not None:
                viento = viento_marca
            else:
                viento = viento_cabecera
            resultados.append({
                "ronda": ronda,
                "nombre": nombre, "licencia": licencia,
                "categoria": cat, "fechaNac": fnac,
                "club": _txt(tds[iClub]) if iClub >= 0 else "",
                "marca": marca_celda,
                "puesto": _txt(tds[iPos]) if iPos >= 0 else "",
                "viento": viento,
            })

    # Podio = 3 MEJORES MARCAS de las FINALES (no el puesto por serie).
    # - Si hay semifinal+final, solo cuentan las finales.
    # - Si hay varias finales/series (Final A/B, varias series), se juntan
    #   todas y se ordena por marca; el puesto general es 1/2/3 por marca.
    finales = [r for r in resultados if r["ronda"].strip().lower().startswith("final")]
    base = finales if finales else resultados
    concurso = cruce.es_concurso(prueba)
    mejor_por_atleta = {}
    for r in base:
        v = cruce.valor_marca(r.get("marca"))
        if v is None:                      # DNS/DNF/NM fuera del podio
            continue
        a = cruce.normaliza(r.get("nombre", ""))
        prev = mejor_por_atleta.get(a)
        if prev is None or cruce.mejor(v, cruce.valor_marca(prev.get("marca")), concurso):
            mejor_por_atleta[a] = r
    ordenados = sorted(mejor_por_atleta.values(),
                       key=lambda r: cruce.valor_marca(r.get("marca")),
                       reverse=concurso)
    podio = []
    for i, r in enumerate(ordenados[:3], 1):
        r = dict(r); r["puesto_general"] = i   # puesto real por marca
        podio.append(r)
    return {"prueba": prueba, "podio": podio, "resultados": resultados}


def scrape_all(index_url, solo_finalizado=True):
    """Descarga el índice y cada prueba finalizada. Devuelve la lista completa."""
    r = requests.get(index_url, headers=HEADERS, timeout=30)
    r.raise_for_status(); r.encoding = "utf-8"
    eventos = parse_index(r.text)
    print(f"Pruebas en el índice: {len(eventos)}")
    salida = []
    for e in eventos:
        if solo_finalizado and e["estado"].strip().lower() != "finalizado":
            continue
        url = urljoin(index_url, e["archivo"])
        try:
            rr = requests.get(url, headers=HEADERS, timeout=30); rr.encoding = "utf-8"
            ev = parse_event(rr.text)
        except Exception as ex:
            print(f"  ERROR {e['prueba']}: {ex}"); continue
        ev.update({"hora": e["hora"], "fecha": e["fecha"], "estado": e["estado"], "url": url})
        salida.append(ev)
        print(f"  [{e['estado']}] {ev['prueba']}")
        for p in ev["podio"]:
            print(f"        {p['puesto']}. {p['nombre']} ({p['club']}) {p['marca']}")
        time.sleep(0.2)
    json.dump({"index_url": index_url, "pruebas": salida},
              open("resultados_fam.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"\nGuardado en resultados_fam.json ({len(salida)} pruebas finalizadas)")
    return salida


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Uso: python3 scraper_fam.py "<URL del index.html de la competición>"')
        sys.exit(1)
    scrape_all(sys.argv[1])
