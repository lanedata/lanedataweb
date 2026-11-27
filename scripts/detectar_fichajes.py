"""Detector automático de fichajes.

Compara el club 2026 de cada atleta adulto (public/data/fichajes/atletas.json,
licencias RFEA) con el club con el que compite AHORA según el índice público de
mundoatletismo.es (`clubActual`, sacado de sus últimas marcas). Si en la
temporada nueva (2026-27) aparece compitiendo con otro club, es un fichaje
casi seguro: se manda a la cola `fichajes_detectados` para que lo revises en
/admin/fichajes. Nada se publica solo.

Descarta el ruido típico:
  - cambios de patrocinador del mismo club («CCA Ria de Foz» → «CCA Ria de Foz- Reyco»);
  - homónimos (si hay varios atletas con el mismo nombre, no se arriesga);
  - «INDEPENDIENTE» como club (se guarda como club desconocido).

Uso:
  python scripts/detectar_fichajes.py            # solo muestra lo detectado
  python scripts/detectar_fichajes.py --subir    # y lo manda a Supabase

Para subir hacen falta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno
(en GitHub Actions, como secretos). Los ya enviados no se duplican.
"""

import json
import os
import sys
import unicodedata
import urllib.request
from pathlib import Path

BASE = 'https://mundoatletismo.es'
DIR = Path(__file__).resolve().parent.parent / 'public' / 'data' / 'fichajes'
TEMPORADA_NUEVA = os.environ.get('TEMPORADA_NUEVA', '2026-27')
SIN_CLUB = {'independiente', 'sin club', 'libre', ''}


def norm(s: str) -> str:
    s = unicodedata.normalize('NFD', s or '')
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in s).split())


def get(url: str):
    req = urllib.request.Request(url, headers={'User-Agent': 'lanedata-detector'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


# Palabras que no distinguen un club de otro.
VACIAS = {'club', 'atletismo', 'atletisme', 'atl', 'at', 'ca', 'c', 'a', 'cd', 'ad', 'ua', 'cea', 'de', 'del', 'la',
          'el', 'y', 'i', 'sd', 'sg', 'ac', 'team', 'athletics', 'running', 'deportivo', 'asociacion', 'agrupacion'}


def mismo_club(a: str, b: str) -> bool:
    """¿Son el mismo club con otro nombre (patrocinador, abreviatura…)?"""
    na, nb = norm(a), norm(b)
    if na == nb or na.startswith(nb) or nb.startswith(na):
        return True
    # Mismas siglas al principio («CAS Ciudad de Segovia» / «CAS-ALUMINIOS…»).
    pa, pb = na.split()[0], nb.split()[0]
    if pa == pb and len(pa) >= 3 and pa not in VACIAS:
        return True
    ta = {t for t in na.split() if t not in VACIAS and len(t) > 2}
    tb = {t for t in nb.split() if t not in VACIAS and len(t) > 2}
    if not ta or not tb:
        return False
    comun = ta & tb
    return len(comun) / min(len(ta), len(tb)) >= 0.6


def detectar() -> list[dict]:
    manifest = get(f'{BASE}/data_manifest.json')
    indice = get(BASE + manifest['/agg_atletas_index_activos.json'])['items']
    por_nombre: dict[str, list[dict]] = {}
    for it in indice:
        por_nombre.setdefault(norm(it['atleta']), []).append(it)

    clubes = json.loads((DIR / 'clubes.json').read_text(encoding='utf-8'))
    atletas = json.loads((DIR / 'atletas.json').read_text(encoding='utf-8'))

    salida = []
    for nombre, ci, g in atletas:
        cands = por_nombre.get(norm(nombre), [])
        if len(cands) != 1 or ci < 0:
            continue  # sin rastro o homónimos: no se arriesga
        it = cands[0]
        if it.get('ultimaTemporada') != TEMPORADA_NUEVA:
            continue  # aún no ha competido esta temporada
        antes, ahora = clubes[ci]['n'], (it.get('clubActual') or '').strip()
        if norm(ahora) in SIN_CLUB and norm(antes) in SIN_CLUB:
            continue
        if mismo_club(antes, ahora):
            continue
        salida.append({
            'atleta': nombre,
            'genero': 'H' if g == 0 else 'M',
            'club_origen': None if norm(antes) in SIN_CLUB else antes,
            'club_destino': None if norm(ahora) in SIN_CLUB else ahora,
            'fuente': 'mundoatletismo',
            'evidencia': {'slug': it.get('slugFull', '').split('__')[0], 'temporada': it.get('ultimaTemporada'),
                          'prueba': it.get('pruebaPrincipal')},
        })
    return salida


def subir(filas: list[dict]) -> int:
    url = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/fichajes_detectados?on_conflict=clave'
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    for f in filas:
        f['clave'] = f"{norm(f['atleta'])}|{norm(f['club_destino'] or '')}"
    req = urllib.request.Request(url, data=json.dumps(filas).encode(), method='POST', headers={
        'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=representation',
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return len(json.load(r))


def main():
    filas = detectar()
    for f in filas:
        print(f"{f['atleta']}: {f['club_origen'] or '?'} → {f['club_destino'] or '?'}")
    print(f'{len(filas)} cambios de club detectados')
    if '--subir' in sys.argv and filas:
        print(f'{subir(filas)} nuevos en la cola')


if __name__ == '__main__':
    main()
