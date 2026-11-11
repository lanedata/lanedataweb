"""Prueba principal de cada atleta del autocompletado, sacada de Mundo Atletismo.

Cruza public/data/fichajes/atletas.json (adultos, sin fecha de nacimiento) con
el índice público de atletas activos de mundoatletismo.es y escribe
public/data/fichajes/pruebas.json, alineado por índice con atletas.json:

    {"p": ["1.500m", "60m", ...], "i": [3, -1, 0, ...]}

`p` es el diccionario de pruebas e `i` el índice de la prueba de cada atleta
(-1 si no se encuentra). Con eso el tablón rellena solo la prueba al elegir al
atleta. Relanzar cuando se regenere atletas.json:

    python scripts/gen_fichajes_pruebas.py
"""

import json
import unicodedata
import urllib.request
from pathlib import Path

BASE = 'https://mundoatletismo.es'
DIR = Path(__file__).resolve().parent.parent / 'public' / 'data' / 'fichajes'


def norm(s: str) -> str:
    s = unicodedata.normalize('NFD', s or '')
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in s).split())


def get(url: str):
    req = urllib.request.Request(url, headers={'User-Agent': 'lanedata-build'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def main():
    manifest = get(f'{BASE}/data_manifest.json')
    indice = get(BASE + manifest['/agg_atletas_index_activos.json'])['items']

    por_nombre: dict[str, list[dict]] = {}
    for it in indice:
        if it.get('pruebaPrincipal'):
            por_nombre.setdefault(norm(it['atleta']), []).append(it)

    clubes = json.loads((DIR / 'clubes.json').read_text(encoding='utf-8'))
    atletas = json.loads((DIR / 'atletas.json').read_text(encoding='utf-8'))

    dic: list[str] = []
    pos: dict[str, int] = {}
    salida: list[int] = []
    hits = 0
    for nombre, ci, _g in atletas:
        cands = por_nombre.get(norm(nombre), [])
        if len(cands) > 1 and ci >= 0:
            club = norm(clubes[ci]['n'])
            mismos = [c for c in cands if norm(c.get('clubActual', '')) == club]
            cands = mismos or cands
        if not cands:
            salida.append(-1)
            continue
        # Homónimos sin desempate: el que más marcas tiene.
        mejor = max(cands, key=lambda c: c.get('totalMarcas', 0))
        p = mejor['pruebaPrincipal']
        if p not in pos:
            pos[p] = len(dic)
            dic.append(p)
        salida.append(pos[p])
        hits += 1

    (DIR / 'pruebas.json').write_text(
        json.dumps({'p': dic, 'i': salida}, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )
    print(f'{hits}/{len(atletas)} atletas con prueba · {len(dic)} pruebas distintas')


if __name__ == '__main__':
    main()
