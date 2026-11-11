"""Atletas con compensación por cambio de club (circular RFEA).

Lee el PDF de la circular («Listado definitivo de atletas con compensación»)
y escribe public/data/fichajes/compensaciones.json:

    {"circular": "202/2026", "temporada": 2027,
     "a": {"<clave>": ["Nombre Apellidos", "Club", "Temporada", "Tipo", 1750.0]}}

La clave son las palabras del nombre normalizadas y ordenadas, para que
«Iker Arotzena Indo» y «AROTZENA INDO, IKER» coincidan.

Uso:  python scripts/gen_fichajes_compensaciones.py <circular.pdf> [202/2026]
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import pdfplumber

SALIDA = Path(__file__).resolve().parent.parent / 'public/data/fichajes/compensaciones.json'


def normalizar(s: str) -> str:
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def clave(nombre: str) -> str:
    return ' '.join(sorted(normalizar(nombre).split()))


def bonito(s: str) -> str:
    return ' '.join(p.capitalize() if not p.isupper() or len(p) > 1 else p for p in s.lower().split())


def main() -> None:
    pdf, circular = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '202/2026')
    atletas: dict[str, list] = {}
    with pdfplumber.open(pdf) as doc:
        for pagina in doc.pages:
            for fila in pagina.extract_table() or []:
                if not fila or len(fila) < 5 or not fila[0] or fila[0].startswith('Apellidos'):
                    continue
                nombre_rfea, club, temporada, tipo, euros = (c.replace('\n', ' ').strip() if c else '' for c in fila[:5])
                m = re.search(r'[\d.]+,\d{2}', euros)
                if ',' not in nombre_rfea or not m:
                    continue
                apellidos, nombre = (x.strip() for x in nombre_rfea.split(',', 1))
                completo = bonito(f'{nombre} {apellidos}')
                importe = float(m.group().replace('.', '').replace(',', '.'))
                atletas[clave(completo)] = [completo, club, temporada, tipo, importe]
    SALIDA.write_text(json.dumps({'circular': circular, 'temporada': 2027, 'a': atletas},
                                 ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(atletas)} atletas → {SALIDA}')


if __name__ == '__main__':
    main()
