"""Genera lib/iaaf-scoring.ts a partir de las tablas oficiales de World Athletics.

Uso:
    curl -sLO https://raw.githubusercontent.com/jchen1/iaaf-scoring-tables/master/iaaf-2025.json
    python scripts/gen_iaaf_scoring.py          # escribe iaaf-scoring.generated.ts

Después hay que pegar el bloque de datos en lib/iaaf-scoring.ts, conservando la
sección "─── Helpers ───" del final, que está escrita a mano.

El sufijo " sh" ("short track") de las claves del dataset es la tabla de PISTA
CUBIERTA: una misma marca no vale los mismos puntos que al aire libre.

Reajustamos la parábola nosotros con mínimos cuadrados robustos en vez de usar
coefficients-2025.json porque ese fichero trae dos ajustes corruptos (110 mH y
50 mH masculinos, con errores de hasta 1360 puntos) causados por filas mal
parseadas del PDF. El ajuste robusto descarta esos valores atípicos y reproduce
el resto de pruebas con menos de 0,6 puntos de error.
"""
import json, io, collections

_raw = json.load(open('iaaf2025.json'))
_by = collections.defaultdict(list)
for _r in _raw:
    _by[(_r['gender'], _r['event'])].append((_r['mark'], _r['points']))


def _fit(rows):
    S = [0.0] * 5
    T = [0.0] * 3
    for x, y in rows:
        for k in range(5):
            S[k] += x ** k
        for k in range(3):
            T[k] += y * (x ** k)
    M = [[S[2], S[1], S[0], T[0]],
         [S[3], S[2], S[1], T[1]],
         [S[4], S[3], S[2], T[2]]]
    for i in range(3):
        p = max(range(i, 3), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        for r in range(3):
            if r != i:
                f = M[r][i] / M[i][i]
                for ci in range(i, 4):
                    M[r][ci] -= f * M[i][ci]
    return M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]


def _robust(rows):
    cur = rows[:]
    for _ in range(6):
        a, b, c = _fit(cur)
        errs = sorted(((abs(a * x * x + b * x + c - y), (x, y)) for x, y in cur), key=lambda t: t[0])
        cut = max(1.0, 6 * errs[len(errs) // 2][0])
        keep = [p for e, p in errs if e <= cut]
        if len(keep) == len(cur):
            break
        cur = keep
    return _fit(cur)


C = collections.defaultdict(dict)
for (g, e), rows in _by.items():
    C[g][e] = _robust(rows)

# id, label(s), kind, group, outdoor key(s), indoor key(s)
# key puede ser: None | "clave" | ("claveH", "claveM")
E = [
    # ── velocidad ──
    ("50m",   "50 m",              "track", "velocidad", None,      "50m"),
    ("55m",   "55 m",              "track", "velocidad", None,      "55m"),
    ("60m",   "60 m",              "track", "velocidad", None,      "60m"),
    ("100m",  "100 m",             "track", "velocidad", "100m",    None),
    ("200m",  "200 m",             "track", "velocidad", "200m",    "200m sh"),
    ("300m",  "300 m",             "track", "velocidad", "300m",    "300m sh"),
    ("400m",  "400 m",             "track", "velocidad", "400m",    "400m sh"),
    # ── medio fondo ──
    ("500m",  "500 m",             "track", "medio",     None,      "500m sh"),
    ("600m",  "600 m",             "track", "medio",     "600m",    "600m sh"),
    ("800m",  "800 m",             "track", "medio",     "800m",    "800m sh"),
    ("1000m", "1000 m",            "track", "medio",     "1000m",   "1000m sh"),
    ("1500m", "1500 m",            "track", "medio",     "1500m",   "1500m sh"),
    ("mile",  "Milla",             "track", "medio",     "Mile",    "Mile sh"),
    ("2000m", "2000 m",            "track", "medio",     "2000m",   "2000m sh"),
    # ── fondo ──
    ("3000m",  "3000 m",           "track", "fondo",     "3000m",   "3000m sh"),
    ("5000m",  "5000 m",           "track", "fondo",     "5000m",   "5000m sh"),
    ("10000m", "10.000 m",         "track", "fondo",     "10000m",  None),
    ("2000mSC","2000 m obstáculos","track", "fondo",     "2000m SC",None),
    ("3000mSC","3000 m obstáculos","track", "fondo",     "3000m SC",None),
    # ── vallas ──
    ("50mH",  "50 m vallas",       "track", "vallas",    None,      "50mH"),
    ("55mH",  "55 m vallas",       "track", "vallas",    None,      "55mH"),
    ("60mH",  "60 m vallas",       "track", "vallas",    None,      "60mH"),
    ("highH", ("110 m vallas", "100 m vallas"), "track", "vallas", ("110mH", "100mH"), None),
    ("400mH", "400 m vallas",      "track", "vallas",    "400mH",   None),
    # ── saltos ──
    ("HJ", "Salto de altura",      "field", "saltos",    "HJ", "HJ"),
    ("PV", "Salto con pértiga",    "field", "saltos",    "PV", "PV"),
    ("LJ", "Salto de longitud",    "field", "saltos",    "LJ", "LJ"),
    ("TJ", "Triple salto",         "field", "saltos",    "TJ", "TJ"),
    # ── lanzamientos ──
    ("SP", "Peso",                 "field", "lanzamientos", "SP", "SP"),
    ("DT", "Disco",                "field", "lanzamientos", "DT", None),
    ("HT", "Martillo",             "field", "lanzamientos", "HT", None),
    ("JT", "Jabalina",             "field", "lanzamientos", "JT", None),
    # ── ruta ──
    ("roadMile", "Milla en ruta",  "track", "ruta", "Road Mile", None),
    ("road5k",   "5 km ruta",      "track", "ruta", "Road 5 km", None),
    ("road10k",  "10 km ruta",     "track", "ruta", "Road 10 km", None),
    ("road15k",  "15 km ruta",     "track", "ruta", "Road 15 km", None),
    ("road10M",  "10 millas ruta", "track", "ruta", "Road 10 Miles", None),
    ("road20k",  "20 km ruta",     "track", "ruta", "Road 20 km", None),
    ("roadHM",   "Media maratón",  "track", "ruta", "Road HM", None),
    ("road25k",  "25 km ruta",     "track", "ruta", "Road 25 km", None),
    ("road30k",  "30 km ruta",     "track", "ruta", "Road 30 km", None),
    ("marathon", "Maratón",        "track", "ruta", "Road Marathon", None),
    ("road100k", "100 km ruta",    "track", "ruta", "Road 100 km", None),
    # ── marcha ──
    ("3000mW",  "3000 m marcha (pista)",   "track", "marcha", "3000mW", None),
    ("5000mW",  "5000 m marcha (pista)",   "track", "marcha", "5000mW", None),
    ("10000mW", "10.000 m marcha (pista)", "track", "marcha", "10,000mW", None),
    ("road10kW","10 km marcha (ruta)",     "track", "marcha", "Road 10kmW", None),
    ("road20kW","20 km marcha (ruta)",     "track", "marcha", "Road 20kmW", None),
    ("road35kW","35 km marcha (ruta)",     "track", "marcha", "Road 35kmW", None),
    ("road50kW","50 km marcha (ruta)",     "track", "marcha", "Road 50kmW", None),
    # ── relevos ──
    ("4x100m",   "4 × 100 m",       "track", "relevos", "4x100m", None),
    ("4x200m",   "4 × 200 m",       "track", "relevos", "4x200m", "4x200m sh"),
    ("4x400m",   "4 × 400 m",       "track", "relevos", "4x400m", "4x400m sh"),
    ("4x400mix", "4 × 400 m mixto", "track", "relevos", "4x400mix", "4x400mix sh"),
    # ── combinadas (la "marca" son los puntos de la tabla de combinadas) ──
    # Al aire libre: decatlón (H) y heptatlón (M). Bajo techo cambian las pruebas:
    # heptatlón (H) y pentatlón (M). Por eso van como pruebas distintas.
    ("combined", ("Decatlón", "Heptatlón"), "score", "combinadas", ("Dec.", "Hept."), None),
    ("combinedIn", ("Heptatlón (PC)", "Pentatlón (PC)"), "score", "combinadas", None, ("Hept. sh", "Pent. sh")),
]


def num(x):
    """Repr compacto y exacto de un float para TS."""
    return repr(float(x))


def coeff(key, gender):
    if key is None:
        return None
    k = key if isinstance(key, str) else (key[0] if gender == 'men' else key[1])
    v = C[gender].get(k)
    return v


def env_block(key, indent):
    men, women = coeff(key, 'men'), coeff(key, 'women')
    if men is None and women is None:
        return 'null'
    def arr(v):
        return 'null' if v is None else '[' + ', '.join(num(x) for x in v) + ']'
    pad = ' ' * indent
    return '{\n%s  men: %s,\n%s  women: %s,\n%s}' % (pad, arr(men), pad, arr(women), pad)


out = io.StringIO()
out.write('''// Tablas de puntuación de World Athletics (edición 2025).
//   puntos = a·x² + b·x + c   (x = segundos en carrera/ruta, metros en concursos,
//                              puntos de la tabla de combinadas en `score`)
//
// IMPORTANTE: World Athletics publica DOS tablas distintas — aire libre (AL) y
// pista cubierta (PC, "short track"). Una misma marca NO vale los mismos puntos
// en las dos: 20.00 en 200 m son 1220 pts al aire libre y 1290 bajo techo. Por eso
// cada prueba guarda sus coeficientes por entorno; `null` = no se disputa ahí.
//
// Fuente: tablas oficiales de World Athletics 2025, vía jchen1/iaaf-scoring-tables.
// ARCHIVO GENERADO — no editar a mano.

export type EventKind = 'track' | 'field' | 'score'
export type Gender = 'men' | 'women'
/** AL = aire libre · PC = pista cubierta */
export type Environment = 'outdoor' | 'indoor'

export type Coeffs = [number, number, number]

export type EventGroup =
  | 'velocidad' | 'medio' | 'fondo' | 'vallas' | 'saltos'
  | 'lanzamientos' | 'ruta' | 'marcha' | 'relevos' | 'combinadas'

export interface ScoringEvent {
  id: string
  /** Etiqueta común, o una por género cuando la prueba cambia (110/100 m vallas). */
  label: string | { men: string; women: string }
  kind: EventKind
  group: EventGroup
  outdoor: { men: Coeffs | null; women: Coeffs | null } | null
  indoor: { men: Coeffs | null; women: Coeffs | null } | null
}

export const GROUP_LABEL: Record<EventGroup, string> = {
  velocidad: 'Velocidad',
  medio: 'Medio fondo',
  fondo: 'Fondo y obstáculos',
  vallas: 'Vallas',
  saltos: 'Saltos',
  lanzamientos: 'Lanzamientos',
  ruta: 'Ruta',
  marcha: 'Marcha',
  relevos: 'Relevos',
  combinadas: 'Pruebas combinadas',
}

export const ENV_LABEL: Record<Environment, string> = {
  outdoor: 'Aire libre',
  indoor: 'Pista cubierta',
}

export const ENV_SHORT: Record<Environment, string> = {
  outdoor: 'AL',
  indoor: 'PC',
}

export const SCORING_EVENTS: ScoringEvent[] = [
''')

for eid, label, kind, group, ok, ik in E:
    lab = ('"%s"' % label) if isinstance(label, str) else \
          ('{ men: "%s", women: "%s" }' % label)
    out.write('  {\n')
    out.write('    id: "%s",\n' % eid)
    out.write('    label: %s,\n' % lab)
    out.write('    kind: "%s",\n' % kind)
    out.write('    group: "%s",\n' % group)
    out.write('    outdoor: %s,\n' % env_block(ok, 4))
    out.write('    indoor: %s,\n' % env_block(ik, 4))
    out.write('  },\n')

out.write(']\n')

open('iaaf-scoring.generated.ts', 'w', encoding='utf-8').write(out.getvalue())
print('ok', len(E), 'pruebas')
