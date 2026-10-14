"""Genera los datos de autocompletado del mercado de fichajes.

Uso:
    python scripts/gen_fichajes_datos.py "<Atletas y club 2026.csv>" "<Clubes 2026.csv>"

Escribe:
    public/data/fichajes/clubes.json   — todos los clubes, con su división 2027
    public/data/fichajes/atletas.json  — atletas MAYORES DE EDAD con su club 2026

PRIVACIDAD — por qué el CSV de atletas NO se commitea y se filtra:
  · Trae la fecha de nacimiento de cada atleta y más de 32.000 son menores.
  · Lo que sale es un fichero estático público (GitHub Pages no protege nada),
    así que solo se publica lo imprescindible para autocompletar: nombre, club y
    sexo. Nunca la fecha de nacimiento.
  · Solo mayores de edad (nacidos hasta 2008 para la temporada 2026): el
    mercado de fichajes es de equipos de División de Honor y Primera, y no
    tiene sentido distribuir los nombres de 32.000 niños. Cualquier nombre se
    puede seguir escribiendo a mano en el formulario.

Las divisiones salen de la circular RFEA 171/2026 (equipos participantes del
Cto. de España de Clubes DH y 1ª División 2027). Se cruzan con el CSV de
clubes normalizando el nombre; los que no casan exactos llevan alias a mano.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "public" / "data" / "fichajes"
ANIO_MAYORIA = 2008  # nacidos hasta este año son mayores de edad en 2026

# Circular RFEA 171/2026 — equipos participantes 2027.
# (división, sexo) -> [(nombre en la circular, federación)]
DIVISIONES_2027: dict[tuple[str, str], list[tuple[str, str]]] = {
    ("DH", "H"): [
        ("Facsa–Playas de Castellón", "CVA"), ("Real Sociedad", "PVA"),
        ("CA Fent Cami Mislata", "CVA"), ("Unicaja Jaen Paraiso Interior", "AND"),
        ("Atletismo Albacete", "CLM"), ("CAPEX", "EXT"),
        ("Grupompleo Pamplona At", "NAV"), ("Trops-Cueva de Nerja", "AND"),
        ("Tenerife CajaCanarias", "CNR"), ("L'Hospitalet", "CAT"),
        ("At. Intec-Zoiti", "ARA"), ("S.G. Pontevedra", "GAL"),
        ("Cornellá Atlètic", "CAT"), ("Alcampo Scorpio 71", "ARA"),
        ("Universidad Oviedo", "AST"), ("Lô Esport Menorca", "BAL"),
    ],
    ("DH", "M"): [
        ("Diputación Valencia C.A.", "CVA"), ("Facsa-Playas de Castellón", "CVA"),
        ("Trops-Cueva de Nerja", "AND"), ("Unicaja Jaen Paraiso Interior", "AND"),
        ("At. San Sebastian", "PVA"), ("Grupompleo Pamplona At.", "NAV"),
        ("Super Amara BAT", "PVA"), ("L'Hospitalet At.", "CAT"),
        ("Atletismo Piélagos", "CAN"), ("Avinent Manresa", "CAT"),
        ("Alcampo Scorpio 71", "ARA"), ("AA Catalunya", "CAT"),
        ("Tenerife CajaCanarias", "CNR"), ("Univ Leon Sprint Atletismo", "CYL"),
        ("Sanysec-Club Ourense Atletismo", "GAL"), ("A.D. Sprint", "MAD"),
    ],
    ("1D", "H"): [
        ("Atletico Salamanca", "CYL"), ("AA Catalunya", "CAT"),
        ("A.D. Marathon", "MAD"), ("Atletismo Alcorcón", "MAD"),
        ("UCAM-Cartagena", "MUR"), ("DELSUR Coop La Palma", "AND"),
        ("Avinent Manresa", "CAT"), ("CA Safor-Teika", "CVA"),
        ("Super Amara BAT", "PVA"), ("At Badajoz-Extremadura", "EXT"),
        ("R.C. Celta", "GAL"), ("Cordoba Patrimonio C.A.C", "AND"),
        ("Durango Kirol Taldea", "PVA"), ("Hiru-Herri", "NAV"),
        ("CA Elche Decatlon", "CVA"), ("CA Granollers", "CAT"),
    ],
    ("1D", "M"): [
        ("Ria Ferrol-C. Arenal", "GAL"), ("A.D. Marathon", "MAD"),
        ("Oviedo At.", "AST"), ("CA Safor-Teika", "CVA"),
        ("Lleida UA", "CAT"), ("Atletismo Alcorcón", "MAD"),
        # La circular pone GAL, pero el club es andaluz (como en masculino).
        ("DELSUR Coop La Palma", "AND"), ("S.G. Pontevedra", "GAL"),
        ("CAPEX", "EXT"), ("Cornellà Atlétic", "CAT"),
        ("At. Femenino Celta", "GAL"), ("Bidezábal Durango AT", "PVA"),
        ("Barrutia A.E.", "PVA"), ("Hiru-Herri", "NAV"),
        ("Real Sociedad", "PVA"), ("Atletismo Albacete", "CLM"),
    ],
}

# Nombre en la circular -> nombre en el CSV, cuando la normalización no basta.
ALIAS = {
    "Tenerife CajaCanarias": "TenerifeCajaCanarias",
    "L'Hospitalet": "L'Hospitalet At.",
}

# Partículas que van en minúscula dentro de un nombre propio.
PARTICULAS = {"de", "del", "la", "las", "los", "y", "i", "da", "das", "do", "dos", "van", "von", "el"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("–", "-").replace("’", "'")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def nombre_propio(s: str) -> str:
    """'AARON ALEJANDRE TATO' -> 'Aaron Alejandre Tato'. Los que ya vienen en
    mayúsculas y minúsculas (con tildes) se respetan tal cual."""
    s = " ".join(s.split())
    if not s.isupper():
        return s

    def palabra(w: str, primera: bool) -> str:
        low = w.lower()
        if not primera and low in PARTICULAS:
            return low
        # Respeta guiones y apóstrofos: 'ANTON-PACHECO' -> 'Anton-Pacheco'
        return re.sub(r"(^|[-'])(\w)", lambda m: m.group(1) + m.group(2).upper(), low)

    return " ".join(palabra(w, i == 0) for i, w in enumerate(s.split(" ")))


def main(atletas_csv: str, clubes_csv: str) -> None:
    clubes = list(csv.DictReader(open(clubes_csv, encoding="utf-8-sig"), delimiter=";"))
    por_norm: dict[str, list[dict]] = {}
    for c in clubes:
        por_norm.setdefault(norm(c["club"]), []).append(c)

    # ── Divisiones 2027 sobre el CSV de clubes ──
    division: dict[str, dict[str, str]] = {}   # club CSV -> {"H": "DH", "M": "1D"}
    for (div, sexo), lista in DIVISIONES_2027.items():
        for nombre, fed in lista:
            clave = norm(ALIAS.get(nombre, nombre))
            cands = por_norm.get(clave)
            if not cands:
                sys.exit(f"ERROR: '{nombre}' ({div} {sexo}) no está en el CSV de clubes; añade un ALIAS")
            # Si el mismo nombre existe en varias federaciones, gana la de la circular.
            club = next((c for c in cands if c["federacion"] == fed), cands[0])
            division.setdefault(club["club"], {})[sexo] = div

    total_div = sum(len(v) for v in division.values())
    assert total_div == 64, f"esperaba 64 plazas de división, salen {total_div}"

    # ── clubes.json ──  ordenados por tamaño: los grandes salen antes al buscar
    clubes.sort(key=lambda c: -int(c["atletas_2026"] or 0))
    lista_clubes = []
    indice_club: dict[str, int] = {}
    for c in clubes:
        item: dict = {"n": c["club"], "f": c["federacion"]}
        if c["club"] in division:
            item["d"] = division[c["club"]]
        indice_club[c["club"]] = len(lista_clubes)
        lista_clubes.append(item)

    # ── atletas.json ── solo mayores de edad, sin fecha de nacimiento
    atletas = []
    menores = 0
    for r in csv.DictReader(open(atletas_csv, encoding="utf-8-sig"), delimiter=";"):
        anio = (r["fecha_nacimiento"] or "")[:4]
        if not anio.isdigit() or int(anio) > ANIO_MAYORIA:
            menores += 1
            continue
        club = r["club_2026"].strip()
        ci = indice_club.get(club, -1)
        g = 0 if r["genero"] == "Hombre" else 1
        atletas.append([nombre_propio(r["atleta"]), ci, g])
    atletas.sort(key=lambda a: norm(a[0]))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_DIR / "clubes.json", "w", encoding="utf-8") as fh:
        json.dump(lista_clubes, fh, ensure_ascii=False, separators=(",", ":"))
    with open(OUT_DIR / "atletas.json", "w", encoding="utf-8") as fh:
        # [nombre, índice del club en clubes.json (-1 = sin club), sexo 0=H 1=M]
        json.dump(atletas, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"clubes:  {len(lista_clubes)} ({len(division)} con división 2027)")
    print(f"atletas: {len(atletas)} mayores de edad publicados · {menores} menores excluidos")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
