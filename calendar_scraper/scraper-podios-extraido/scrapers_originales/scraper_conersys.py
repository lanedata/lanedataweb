#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper de resultados de Conersys Live (conersyslive.es).

Uso:
    python3 scraper_conersys.py "https://conersyslive.es/Results/Schedule?chid=2026AND65850"

Lee el horario de una competicion, lista todas las pruebas y extrae el podio
(top 3) de cada una. Guarda el resultado en un fichero JSON.
"""

import sys
import json
import re
import time
import requests
from bs4 import BeautifulSoup

BASE = "https://conersyslive.es"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AtletismoScraper/1.0)"}


def get_soup(url):
    """Descarga una pagina y la devuelve como objeto BeautifulSoup."""
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    r.encoding = "utf-8"
    return BeautifulSoup(r.text, "html.parser")


def parse_schedule(url):
    """Devuelve la lista de pruebas del horario.

    Cada prueba: { 'hora', 'fecha', 'nombre', 'ronda', 'estado',
                   'key', 'url_resultados' }
    """
    soup = get_soup(url)
    eventos = []

    # Cada prueba tiene un enlace a ResultsEvent con su 'key'.
    for a in soup.select('a[href*="ResultsEvent"]'):
        href = a.get("href", "")
        m = re.search(r"key=([^&]+)", href)
        if not m:
            continue
        key = requests.utils.unquote(m.group(1))

        # El texto del enlace suele ser "Nombre prueba   Ronda".
        # Buscamos la fila (tr) que contiene este enlace para sacar hora/fecha.
        fila = a.find_parent("tr")
        hora = fecha = estado = ""
        if fila:
            celdas = [c.get_text(" ", strip=True) for c in fila.find_all("td")]
            # 1a celda: "18:30    18/06/2026"
            if celdas:
                primera = celdas[0]
                mh = re.search(r"(\d{1,2}:\d{2})", primera)
                mf = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", primera)
                hora = mh.group(1) if mh else ""
                fecha = mf.group(1) if mf else ""
            # Estado (Oficial, etc.): celda que diga "Oficial" o similar.
            for c in celdas:
                if c.lower() in ("oficial", "no oficial", "provisional"):
                    estado = c
                    break

        # Separar nombre y ronda. El enlace de nombre contiene ambos pegados.
        texto = a.get_text(" ", strip=True)
        ronda = ""
        for marcador in ["Final", "Semifinal", "Serie", "Cuartos", "Eliminatoria"]:
            idx = texto.find(marcador)
            if idx > 0:
                ronda = texto[idx:].strip()
                texto = texto[:idx].strip()
                break
        nombre = texto

        eventos.append({
            "hora": hora,
            "fecha": fecha,
            "nombre": nombre,
            "ronda": ronda,
            "estado": estado,
            "key": key,
            "url_resultados": BASE + "/Results/ResultsEvent?key=" + requests.utils.quote(key, safe=""),
        })

    # Quitar duplicados conservando orden (a veces hay 2 enlaces por fila).
    vistos = set()
    unicos = []
    for e in eventos:
        if e["key"] in vistos:
            continue
        vistos.add(e["key"])
        unicos.append(e)
    return unicos


def _limpiar_marca(texto):
    """Extrae la marca limpia de la celda de resultado.

    La celda puede traer la marca + un codigo (MMP, MMT, =MMP...) en otra
    linea. Nos quedamos con la primera linea util.
    """
    # Reemplazar saltos por separador y partir.
    t = texto.replace("\n", " ").strip()
    # Casos especiales: DNS, DNF, DQ, NM...
    for cod in ["DNS", "DNF", "DQ", "NM", "DNQ"]:
        if cod in t.upper().split():
            return cod
    # Primer token que parezca tiempo (10.08, 1:23.45) o marca (7.53).
    m = re.search(r"\d+:\d+\.\d+|\d+\.\d+|\d+,\d+", t)
    if m:
        return m.group(0)
    return t.split()[0] if t.split() else ""


def parse_results(url):
    """Devuelve el podio (lista de hasta 3) de una prueba.

    Cada puesto: { 'puesto', 'nombre', 'club', 'marca' }
    Tambien devuelve metadatos: nombre prueba, ronda, viento.
    """
    soup = get_soup(url)

    # Titulo y ronda estan en cabeceras del bloque de resultados.
    meta = {"viento": ""}
    cuerpo = soup.get_text("\n", strip=True)
    mv = re.search(r"Viento:\s*([+\-]?\d+\.\d+)", cuerpo)
    if mv:
        meta["viento"] = mv.group(1)

    tabla = soup.find("table")
    if not tabla:
        return [], meta

    podio = []
    for tr in tabla.find_all("tr"):
        celdas = tr.find_all(["td", "th"])
        if not celdas:
            continue
        textos = [c.get_text(" ", strip=True) for c in celdas]
        # Filas de detalle (intentos en concursos) van en una sola celda larga
        # con colspan -> las saltamos.
        if len(celdas) < 4:
            continue
        rk = textos[0].strip()
        # Solo nos interesan puestos 1, 2, 3.
        if rk not in ("1", "2", "3"):
            continue

        # Buscar nombre + club: celda con texto largo que tenga letras.
        # Estructura tipica: [RK, (carril), Nombre+Pais, fecha, (reaccion), Resultado, puntos]
        nombre_club = ""
        for t in textos[1:]:
            if re.search(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}", t) and not re.match(r"^\d", t):
                nombre_club = t
                break

        # Separar nombre (mayusculas apellido) del club/pais.
        # Conersys pone "Nombre APELLIDO    Pais/Club" separado por varios espacios.
        nombre, club = nombre_club, ""
        partes = re.split(r"\s{2,}", nombre_club)
        if len(partes) >= 2:
            nombre = partes[0].strip()
            club = partes[-1].strip()

        # La marca: penultima o la celda con patron de tiempo/medida.
        marca = ""
        for t in reversed(textos):
            cand = _limpiar_marca(t)
            if re.match(r"^\d+:\d|\d+\.\d|\d+,\d", cand) or cand in ("DNS", "DNF", "DQ", "NM"):
                marca = cand
                break

        podio.append({
            "puesto": int(rk),
            "nombre": nombre,
            "club": club,
            "marca": marca,
        })
        if len(podio) == 3:
            break

    podio.sort(key=lambda x: x["puesto"])
    return podio, meta


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 scraper_conersys.py <URL del horario>")
        sys.exit(1)
    url = sys.argv[1]

    print(f"Leyendo horario: {url}\n")
    eventos = parse_schedule(url)
    print(f"Pruebas encontradas: {len(eventos)}\n")

    for i, e in enumerate(eventos, 1):
        print(f"[{i}/{len(eventos)}] {e['nombre']} — {e['ronda']} ({e['hora']})")
        try:
            podio, meta = parse_results(e["url_resultados"])
            e["podio"] = podio
            e["viento"] = meta.get("viento", "")
            for p in podio:
                print(f"      {p['puesto']}. {p['nombre']} ({p['club']}) — {p['marca']}")
            if not podio:
                print("      (sin podio / sin resultados)")
        except Exception as ex:
            e["podio"] = []
            print(f"      ERROR: {ex}")
        time.sleep(0.3)  # cortesia con el servidor
        print()

    salida = "resultados_competicion.json"
    with open(salida, "w", encoding="utf-8") as f:
        json.dump({"url": url, "eventos": eventos}, f, ensure_ascii=False, indent=2)
    print(f"\nGuardado en: {salida}")


if __name__ == "__main__":
    main()
