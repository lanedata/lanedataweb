#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ejemplo MÍNIMO de integración de los 4 scrapers de `podios-stories` en tu
propio scraper de competiciones.

Qué hace:
  - Detecta la plataforma a partir de la URL de una competición.
  - Devuelve la LISTA DE PRUEBAS de esa competición en un formato unificado.

Qué NO hace (lo pones tú, ver COMO_INTEGRAR.md secciones 6-7):
  - Descubrir qué competiciones hay por federación.
  - Extraer enlaces a PDFs (inscritos / resultados / info).
  - Pedir el detalle/podio de cada prueba (aquí solo enumeramos pruebas;
    para el detalle, ver parse_event() de cada scraper).

Requisitos:
    pip install requests beautifulsoup4
    (los módulos engine.py, scraper_fam.py, scraper_rfea.py, scraper_rfea_es.py
     y cruce.py deben estar importables — están en ./scrapers_originales/)

Uso:
    python ejemplo_dispatcher.py "https://rfealive.es/sch/2026CAT65561"
"""
import os
import sys
from urllib.parse import urljoin

# Permite importar los scrapers desde la subcarpeta scrapers_originales/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scrapers_originales"))


def detectar_fuente(url: str) -> str:
    """URL de una competición -> identificador de plataforma.

    OJO con el orden: rfealive.es y rfealive.me comparten el prefijo
    'rfealive', así que se discrimina por el dominio completo (.es vs .me),
    y .es se comprueba ANTES que .me.
    """
    u = (url or "").lower()
    if "conersyslive.es" in u:
        return "conersys"
    if "atletismomadrid.com" in u:
        return "fam"
    if "rfealive.es" in u:
        return "rfealive_es"
    if "rfealive.me" in u:
        return "rfealive_me"
    return "desconocida"


def listar_pruebas(url: str):
    """Devuelve (competicion, pruebas) en un formato unificado, sea cual sea
    la plataforma de origen. `pruebas` es una lista de dicts con, al menos:
    nombre, ronda, hora, fecha, estado, url (cuando la fuente la da).
    """
    fuente = detectar_fuente(url)

    if fuente == "conersys":
        import engine
        comp, eventos = engine.parse_schedule(url)
        return comp, eventos

    if fuente == "rfealive_me":
        import scraper_rfea
        comp, eventos = scraper_rfea.parse_schedule(url)
        return comp, eventos

    if fuente == "rfealive_es":
        import scraper_rfea_es
        # Esta fuente ya trae el podio incluido en cada prueba (una sola descarga).
        comp, eventos = scraper_rfea_es.parse_schedule(url)
        return comp, eventos

    if fuente == "fam":
        import requests
        import scraper_fam
        from bs4 import BeautifulSoup
        r = requests.get(url, headers=scraper_fam.HEADERS, timeout=30)
        r.encoding = "utf-8"
        soup = BeautifulSoup(r.text, "html.parser")
        titulo = soup.find(id="FAMtitle") or soup.find("title")
        comp = titulo.get_text(" ", strip=True) if titulo else ""
        eventos = []
        for e in scraper_fam.parse_index(r.text):
            eventos.append({
                "nombre": e["prueba"],
                "ronda": "",
                "hora": e["hora"],
                "fecha": e["fecha"],
                "estado": e["estado"],
                # enlace a la página de la prueba (relativo en el índice → absoluto)
                "url": urljoin(url, e["archivo"]) if e.get("archivo") else "",
            })
        return comp, eventos

    raise ValueError(
        f"Fuente no reconocida para la URL: {url}\n"
        "Plataformas soportadas: conersyslive.es, atletismomadrid.com, "
        "rfealive.me, rfealive.es"
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Uso: python ejemplo_dispatcher.py "<URL de la competición>"')
        sys.exit(1)
    url = sys.argv[1]
    print(f"Fuente detectada: {detectar_fuente(url)}")
    comp, pruebas = listar_pruebas(url)
    print(f"Competición: {comp}")
    print(f"Pruebas encontradas: {len(pruebas)}\n")
    for i, p in enumerate(pruebas):
        estado = p.get("estado") or "-"
        ronda = p.get("ronda") or ""
        print(f"[{i:>3}] {p.get('fecha',''):>10} {p.get('hora',''):>5}  "
              f"{p.get('nombre','')} {ronda}  ({estado})")
