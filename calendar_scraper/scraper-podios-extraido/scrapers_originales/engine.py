#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MOTOR del generador de podios (Conersys Live -> vídeo 9:16 para Stories).

Dos responsabilidades:
  1) SCRAPING: leer una competición de conersyslive.es y sacar las pruebas
     con su podio (top 3): nombre+primer apellido, club/país y marca.
  2) RENDER: generar un vídeo MP4 1080x1920 de 8 s con el diseño aprobado
     (estilo lanedata), con o sin foto del ganador.

Uso por línea de comandos:
  # 1) Listar pruebas y podios de una competición (guarda JSON):
  python engine.py listar "https://conersyslive.es/Results/Schedule?chid=2026AND65850"

  # 2) Generar el vídeo de una prueba (por índice del JSON):
  python engine.py video 0                      # sin foto
  python engine.py video 0 --foto ganador.jpg   # con foto del ganador

Requisitos: requests, beautifulsoup4, pillow, numpy, imageio, imageio-ffmpeg
  pip install requests beautifulsoup4 pillow numpy imageio imageio-ffmpeg

NOTA DE VERIFICACIÓN: el parser de resultados está validado contra el contenido
real de varias pruebas, pero conviene hacer UNA prueba en vivo contra el HTML
real la primera vez que se despliegue (ver función _parse_result_table).
"""

import sys, os, re, json, time
import requests
from bs4 import BeautifulSoup
import cruce  # separar_marca_viento() -- compartido con scraper_fam.py y scraper_rfea.py

BASE = "https://conersyslive.es"
HEADERS = {"User-Agent": "Mozilla/5.0 (AtletismoPodios/1.0)"}

# Partículas de apellido que NO cuentan como palabra independiente.
PARTICULAS = {"de","del","la","las","los","da","das","do","dos","van","von",
              "di","le","mac","mc","san","santa","el","al","bin"}

# ----------------------------------------------------------------------------
# 1) SCRAPING
# ----------------------------------------------------------------------------
def _get(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status(); r.encoding = "utf-8"
    return BeautifulSoup(r.text, "html.parser")

def nombre_corto(crudo):
    """De 'Jenns REYNOLD FERNÁNDEZ' -> 'Jenns Reynold' (nombre + 1er apellido).

    Regla: en Conersys los APELLIDOS van en MAYÚSCULAS y los nombres en
    minúscula/capitalizado. Tomamos el primer nombre + el primer apellido
    (incluyendo partículas como 'DOS', 'DE LA', etc.).
    """
    toks = crudo.split()
    if not toks:
        return crudo
    nombres = [t for t in toks if not t.isupper()]
    apellidos = [t for t in toks if t.isupper()]
    primer_nombre = nombres[0] if nombres else toks[0]
    # primer apellido + partículas que lo preceden o lo unen
    primer_ape = []
    for t in apellidos:
        if not primer_ape:
            primer_ape.append(t)
            if t.lower() not in PARTICULAS:
                break
        else:
            primer_ape.append(t)
            if t.lower() not in PARTICULAS:
                break
    ape = " ".join(primer_ape).title() if primer_ape else ""
    return (primer_nombre.capitalize() + (" " + ape if ape else "")).strip()

def parse_schedule(url):
    """Lista de pruebas: nombre, ronda, hora, fecha, key, url_resultados."""
    soup = _get(url)
    GEN = ("horario","resultados","lista de salida","conersys live results","")
    comp = ""
    for sel in [".page-heading__title", ".page-heading__subtitle",
                "h1","h2","h3","h4","title"]:
        for el in soup.select(sel):
            t = el.get_text(" ", strip=True)
            if t and t.lower() not in GEN and len(t) > 8 and "horario" not in t.lower():
                comp = t; break
        if comp: break
    eventos, vistos = [], set()
    for a in soup.select('a[href*="ResultsEvent"]'):
        m = re.search(r"key=([^&]+)", a.get("href",""))
        if not m: continue
        key = requests.utils.unquote(m.group(1))
        if key in vistos: continue
        vistos.add(key)
        fila = a.find_parent("tr"); hora=fecha=estado=""
        if fila:
            celdas=[c.get_text(" ",strip=True) for c in fila.find_all("td")]
            if celdas:
                mh=re.search(r"(\d{1,2}:\d{2})",celdas[0]); mf=re.search(r"(\d{1,2}/\d{1,2}/\d{4})",celdas[0])
                hora=mh.group(1) if mh else ""; fecha=mf.group(1) if mf else ""
            for c in celdas:
                if c.lower() in ("oficial","no oficial","provisional"): estado=c; break
        texto=a.get_text(" ",strip=True); ronda=""
        for mk in ["Final","Semifinal","Serie","Cuartos","Eliminatoria"]:
            i=texto.find(mk)
            if i>0: ronda=texto[i:].strip(); texto=texto[:i].strip(); break
        eventos.append({"nombre":texto,"ronda":ronda,"hora":hora,"fecha":fecha,
                        "estado":estado,"key":key,
                        "url":BASE+"/Results/ResultsEvent?key="+requests.utils.quote(key,safe="")})
    return comp, eventos

def _limpiar_marca(t):
    t=t.replace("\n"," ").strip()
    for cod in ["DNS","DNF","DQ","NM","DNQ","ELIM"]:
        if cod in t.upper().split(): return cod
    m=re.search(r"\d+:\d+\.\d+|\d+\.\d+|\d+,\d+",t)
    return m.group(0) if m else (t.split()[0] if t.split() else "")

def _parse_result_table(soup):
    """Extrae el podio (puestos 1,2,3) usando las clases reales de Conersys.

    Estructura de cada fila de resultado:
      <td class="upcoming-table__date"><span>1</span></td>        -> puesto
      <td class="hidden-xs"><div class="badge">11</div></td>       -> dorsal
      <td> Maria CAMPOS BRAVO <span class="upcoming-table__label">Spain</span></td>
      ...
      <td class="tb-played-match"><div>15:51.88</div>...</td>      -> marca

    Recorre TODAS las filas de la página (hay tablas vacías y la de
    'Pasos Intermedios', que se ignoran porque no tienen este patrón).
    """
    podio=[]
    for tr in soup.find_all("tr"):
        rk_td = tr.find("td", class_="upcoming-table__date")
        if not rk_td:
            continue
        rk = rk_td.get_text(strip=True)
        if rk not in ("1","2","3"):
            continue
        # nombre + club/país
        lbl = tr.find("span", class_="upcoming-table__label")
        club = lbl.get_text(strip=True) if lbl else ""
        crudo = ""
        name_td = lbl.find_parent("td") if lbl else None
        if name_td is None:
            # fallback: celda con más letras
            for td in tr.find_all("td"):
                t=td.get_text(" ",strip=True)
                if re.search(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}",t) and not re.match(r"^\d",t):
                    name_td=td; break
        if name_td is not None:
            l2 = name_td.find("span", class_="upcoming-table__label")
            if l2: l2.extract()
            crudo = name_td.get_text(" ", strip=True)
        # marca (+ viento, si viene PEGADO en la misma celda -- visto en
        # saltos: "7.20 0.0"; cruce.separar_marca_viento() los separa para
        # no mostrarlos juntos en el vídeo, decisión 2026-06-24 con Riki)
        marca=""; viento_fila=None
        mt = tr.find("td", class_="tb-played-match")
        if mt: marca, viento_fila = cruce.separar_marca_viento(mt.get_text(" ", strip=True))
        if not marca:
            for td in reversed(tr.find_all("td")):
                c, vf = cruce.separar_marca_viento(td.get_text(" ",strip=True))
                if re.match(r"^\d+:\d|\d+\.\d|\d+,\d",c) or c in ("DNS","DNF","DQ","NM"):
                    marca=c; viento_fila=vf; break
        # "nombre" = versión corta para MOSTRAR (nombre + 1er apellido).
        # "atleta" = nombre completo SIN recortar, para CRUZAR con la base de
        # datos (que guarda nombre + TODOS los apellidos) -- si solo
        # guardábamos la versión corta, el cruce nunca encontraba al atleta
        # en la BD (normaliza("Maria Campos") != normaliza("Maria Campos
        # Bravo")) y por eso no salía nada de destacados/PB/SB con Conersys
        # (bug encontrado 2026-06-22).
        # "club" = lo que trae Conersys en upcoming-table__label, que en la
        # práctica es la NACIONALIDAD del atleta ("Spain", "Germany"...), no
        # su club real -- confirmado 2026-06-23 con Riki (en
        # conersyslive.es/.../2026AND65850 TODOS los españoles aparecen como
        # "Spain", no con su club). Lo guardamos también como "pais" para que
        # el cruce pueda filtrar logros nacionales (récord/líder
        # español/mínima internacional) a atletas extranjeros sin
        # confundirlo con un club real.
        podio.append({"puesto":int(rk),"nombre":nombre_corto(crudo),"atleta":crudo,
                      "club":club,"pais":club,"marca":marca,"viento":viento_fila or ""})
        if len(podio)==3: break
    podio.sort(key=lambda x:x["puesto"])
    return podio

def parse_event(url):
    soup=_get(url)
    cuerpo=soup.get_text("\n",strip=True)
    viento=""; mv=re.search(r"Viento:\s*([+\-]?\d+\.\d+)",cuerpo)
    if mv: viento=mv.group(1)
    return _parse_result_table(soup), viento

def scrape_all(url):
    comp,eventos=parse_schedule(url)
    print(f"Competición: {comp}\nPruebas: {len(eventos)}\n")
    for i,e in enumerate(eventos):
        try:
            e["podio"],e["viento"]=parse_event(e["url"])
        except Exception as ex:
            e["podio"],e["viento"]=[],""
            print(f"  [{i}] ERROR {ex}")
        line=f"[{i}] {e['nombre']} — {e['ronda']}"
        print(line)
        for p in e["podio"]:
            print(f"      {p['puesto']}. {p['nombre']} ({p['club']}) {p['marca']}")
        time.sleep(0.25)
    data={"competicion":comp,"url":url,"eventos":eventos}
    json.dump(data,open("competicion.json","w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print("\nGuardado competicion.json")
    return data

# ----------------------------------------------------------------------------
# 2) RENDER (importa el módulo de render para no cargar PIL si solo scrapeas)
# ----------------------------------------------------------------------------
def render_cli(idx, foto=None):
    import render_podio
    data=json.load(open("competicion.json",encoding="utf-8"))
    ev=data["eventos"][idx]
    cat=f"{ev['nombre'].upper()} · {ev['ronda'].upper()}".strip(" ·")
    out=f"podio_{idx}.mp4"
    render_podio.render(
        out=out, competicion=data["competicion"], fecha=ev.get("fecha",""),
        categoria=cat, podio=ev["podio"], foto=foto, dur=8.0)
    print("Vídeo:",out)

if __name__=="__main__":
    if len(sys.argv)<2:
        print(__doc__); sys.exit(0)
    cmd=sys.argv[1]
    if cmd=="listar":
        scrape_all(sys.argv[2])
    elif cmd=="video":
        idx=int(sys.argv[2]); foto=None
        if "--foto" in sys.argv: foto=sys.argv[sys.argv.index("--foto")+1]
        render_cli(idx,foto)
    else:
        print("Comando no reconocido. Usa 'listar' o 'video'.")
