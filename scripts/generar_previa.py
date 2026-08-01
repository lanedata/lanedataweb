# -*- coding: utf-8 -*-
"""Genera el borrador de "La Previa" del fin de semana a partir de
public/data/competiciones.json (el mismo JSON que alimenta /calendario).

Produce en previa_out/:
  - previa_<fecha>.html    → fragmento HTML listo para pegar en el admin
                             (usa las plantillas editoriales .ld-* de la web)
  - previa_<fecha>_ig.json → diapositivas para el Estudio IG (botón «JSON» → Cargar)
  - previa_<fecha>_meta.txt→ título, slug, excerpt y caption sugeridos

Uso:
  python scripts/generar_previa.py                  # próximo fin de semana (vie-dom)
  python scripts/generar_previa.py --desde 2026-07-24 --hasta 2026-07-26
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "public" / "data" / "competiciones.json"
OUT_DIR = ROOT / "previa_out"

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
DIAS_CORTO = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]


def fecha_es(d: date) -> str:
    return f"{DIAS[d.weekday()].capitalize()} {d.day} de {MESES[d.month - 1]}"


def rango_finde(hoy: date) -> tuple[date, date]:
    """Viernes-domingo de esta semana si aún no ha pasado; si no, del siguiente."""
    viernes = hoy + timedelta(days=(4 - hoy.weekday()) % 7)
    if hoy.weekday() == 6:  # domingo → siguiente finde
        viernes = hoy + timedelta(days=5)
    return viernes, viernes + timedelta(days=2)


def parse_fecha(s: str) -> date:
    return date.fromisoformat(s)


def esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def cargar(desde: date, hasta: date) -> list[dict]:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    out = []
    for c in data:
        try:
            ini = parse_fecha(c["fecha_inicio"])
        except (KeyError, TypeError, ValueError):
            continue
        fin = ini
        if c.get("fecha_fin"):
            try:
                fin = parse_fecha(c["fecha_fin"])
            except ValueError:
                pass
        # se solapa con el rango pedido
        if ini <= hasta and fin >= desde:
            c["_ini"], c["_fin"] = ini, fin
            out.append(c)
    out.sort(key=lambda c: (c["_ini"], c.get("ambito") != "RFEA", c.get("nombre", "")))
    return out


def generar_html(comps: list[dict], desde: date, hasta: date) -> str:
    nacionales = [c for c in comps if c.get("ambito") == "RFEA"]
    autonomicas = [c for c in comps if c.get("ambito") != "RFEA"]
    por_comunidad: dict[str, list[dict]] = defaultdict(list)
    for c in autonomicas:
        por_comunidad[c.get("comunidad") or "Otras"].append(c)

    partes: list[str] = []
    partes.append(
        f'<p class="ld-entradilla">El atletismo español encara el fin de semana del '
        f'{desde.day} al {hasta.day} de {MESES[hasta.month - 1]} con '
        f'<strong>{len(comps)} competiciones</strong> en el calendario: '
        f'{len(nacionales)} de ámbito nacional y {len(autonomicas)} autonómicas. '
        f'Esto es lo que hay que mirar.</p>'
    )

    if nacionales:
        claves = "".join(
            f"<li><strong>{esc(c['nombre'])}</strong>"
            + (f" — {esc(c['lugar'])}" if c.get("lugar") else "")
            + f" ({DIAS_CORTO[c['_ini'].weekday()]})</li>"
            for c in nacionales[:4]
        )
        partes.append(
            '<div class="ld-claves"><div class="ld-claves-titulo">Lo destacado</div>'
            f"<ul>{claves}</ul></div>"
        )

    partes.append(
        '<div class="ld-datos">'
        f'<div class="ld-dato"><div class="ld-dato-cifra">{len(comps)}</div>'
        '<div class="ld-dato-label">Competiciones</div></div>'
        f'<div class="ld-dato"><div class="ld-dato-cifra">{len(nacionales)}</div>'
        '<div class="ld-dato-label">Ámbito nacional</div></div>'
        f'<div class="ld-dato"><div class="ld-dato-cifra">{len(por_comunidad)}</div>'
        '<div class="ld-dato-label">Comunidades con actividad</div></div>'
        "</div>"
    )

    if nacionales:
        partes.append("<h2>Ámbito nacional</h2>")
        filas = []
        for c in nacionales:
            nombre = esc(c["nombre"])
            if c.get("url_detalle"):
                nombre = f'<a href="{esc(c["url_detalle"])}" target="_blank" rel="noopener">{nombre}</a>'
            dia = DIAS_CORTO[c["_ini"].weekday()]
            if c["_fin"] != c["_ini"]:
                dia += f"–{DIAS_CORTO[c['_fin'].weekday()]}"
            filas.append(
                f"<tr><td>{dia}</td><td>{nombre}</td>"
                f"<td>{esc(c.get('lugar') or '—')}</td>"
                f"<td>{esc(c.get('disciplina') or '—')}</td></tr>"
            )
        partes.append(
            "<table><thead><tr><th>Día</th><th>Competición</th><th>Lugar</th><th>Disciplina</th></tr></thead>"
            f"<tbody>{''.join(filas)}</tbody></table>"
        )
        partes.append("<p>[✍️ AÑADE AQUÍ: atletas a seguir, duelos, mínimas en juego…]</p>")

    if por_comunidad:
        partes.append("<h2>Por comunidades</h2>")
        for comunidad in sorted(por_comunidad):
            lista = "".join(
                f"<li><strong>{DIAS_CORTO[c['_ini'].weekday()]}</strong> · "
                + (f'<a href="{esc(c["url_detalle"])}" target="_blank" rel="noopener">{esc(c["nombre"])}</a>'
                   if c.get("url_detalle") else esc(c["nombre"]))
                + (f" — {esc(c['lugar'])}" if c.get("lugar") else "")
                + "</li>"
                for c in por_comunidad[comunidad]
            )
            partes.append(f"<h3>{esc(comunidad)}</h3><ul>{lista}</ul>")

    partes.append(
        '<p class="ld-nota"><strong>Fuente</strong> · Calendarios oficiales de la RFEA y las '
        'federaciones autonómicas, recopilados por lanedata. Consulta horarios y posibles '
        'cambios en el <a href="/calendario/">calendario completo</a>.</p>'
    )
    partes.append('<p class="ld-firma">lanedata</p>')
    return "\n\n".join(partes)


def generar_slides(comps: list[dict], desde: date, hasta: date) -> list[dict]:
    nacionales = [c for c in comps if c.get("ambito") == "RFEA"]
    destacadas = (nacionales or comps)[:5]
    return [
        {
            "type": "portada", "theme": "ink", "kicker": "La Previa",
            "title": "El finde del atletismo español",
            "subtitle": f"{desde.day}–{hasta.day} de {MESES[hasta.month - 1]} · "
                        f"{len(comps)} competiciones en el calendario",
            "titleSize": "M",
        },
        {
            "type": "dato", "theme": "paper", "kicker": "El volumen",
            "stat": str(len(comps)),
            "statLabel": "competiciones este fin de semana",
            "body": f"{len(nacionales)} de ámbito nacional y "
                    f"{len(comps) - len(nacionales)} autonómicas.",
            "titleSize": "L",
        },
        {
            "type": "lista", "theme": "ink", "kicker": "Lo destacado",
            "title": "No te pierdas",
            "items": [
                {
                    "pos": DIAS_CORTO[c["_ini"].weekday()],
                    "nombre": c["nombre"],
                    "valor": (c.get("lugar") or "")[:18],
                }
                for c in destacadas
            ],
            "titleSize": "M",
        },
        {
            "type": "cierre", "theme": "ink", "kicker": "",
            "title": "Calendario completo y horarios en la web",
            "subtitle": "lanedata.es/calendario", "body": "Enlace en bio",
            "titleSize": "M",
        },
    ]


def main() -> int:
    # la consola de Windows usa cp1252 por defecto — forzamos utf-8
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Genera el borrador de La Previa del fin de semana")
    ap.add_argument("--desde", type=parse_fecha, help="YYYY-MM-DD")
    ap.add_argument("--hasta", type=parse_fecha, help="YYYY-MM-DD")
    args = ap.parse_args()

    if args.desde and args.hasta:
        desde, hasta = args.desde, args.hasta
    else:
        desde, hasta = rango_finde(date.today())

    comps = cargar(desde, hasta)
    if not comps:
        print(f"No hay competiciones entre {desde} y {hasta}.")
        return 1

    OUT_DIR.mkdir(exist_ok=True)
    tag = desde.isoformat()

    titulo = (f"La Previa | Qué mirar en el atletismo español este fin de semana "
              f"({desde.day}–{hasta.day} de {MESES[hasta.month - 1]})")
    slug = f"la-previa-{tag}"
    excerpt = (f"{len(comps)} competiciones del {desde.day} al {hasta.day} de "
               f"{MESES[hasta.month - 1]}: lo nacional, lo autonómico y dónde seguirlo.")

    html = generar_html(comps, desde, hasta)
    (OUT_DIR / f"previa_{tag}.html").write_text(html, encoding="utf-8")

    slides = generar_slides(comps, desde, hasta)
    (OUT_DIR / f"previa_{tag}_ig.json").write_text(
        json.dumps(slides, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    caption = (
        f"LA PREVIA · {desde.day}–{hasta.day} de {MESES[hasta.month - 1]}\n\n"
        f"{len(comps)} competiciones este fin de semana en el atletismo español.\n\n"
        + "".join(f"▸ {c['nombre']}\n" for c in comps if c.get("ambito") == "RFEA")
        + "\nCalendario completo y horarios en lanedata.es/calendario (enlace en bio)\n\n"
        "#atletismo #atletismoespañol #rfea #trackandfield #running #lanedata"
    )
    meta = (f"TÍTULO:  {titulo}\nSLUG:    {slug}\nEXCERPT: {excerpt}\n"
            f"CATEGORÍA: general\n\n--- CAPTION IG ---\n\n{caption}\n")
    (OUT_DIR / f"previa_{tag}_meta.txt").write_text(meta, encoding="utf-8")

    print(f"Rango: {fecha_es(desde)} → {fecha_es(hasta)}")
    print(f"Competiciones: {len(comps)} "
          f"({sum(1 for c in comps if c.get('ambito') == 'RFEA')} RFEA)")
    print()
    print(f"  {OUT_DIR / f'previa_{tag}.html'}       → pegar en admin/nuevo (Contenido HTML)")
    print(f"  {OUT_DIR / f'previa_{tag}_ig.json'}    → Estudio IG > JSON > Cargar")
    print(f"  {OUT_DIR / f'previa_{tag}_meta.txt'}   → título, slug, excerpt y caption")
    return 0


if __name__ == "__main__":
    sys.exit(main())
