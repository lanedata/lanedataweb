# -*- coding: utf-8 -*-
"""Genera test-semanal.csv: el test de atletismo de cada semana, en tres niveles.

Uso:
    python scripts/gen_test_semanal.py

Casi ninguna pregunta está escrita a mano: se generan desde los datos de
atletismo-espana, así que la respuesta correcta es verificable y los distractores
son marcas, sedes y atletas REALES (una marca del top-10 histórico como opción
falsa engaña mucho más que un número inventado). Solo el bloque CULTURA de más
abajo —reglamento, material, instalaciones— está redactado a mano.

Dos orígenes:

1. El repo `manager-atletismo` (la web atletismo-espana), que tiene los datos
   pesados congelados y versionados. Se busca en `../manager-atletismo`; si lo
   tienes en otro sitio, exporta MANAGER_ATLETISMO=/ruta/al/repo.
2. Tres agregados públicos de su CDN (clubes, sedes y mínimas del Europeo), que
   NO están en git porque los regenera la carga semanal. Se cachean en
   `.cache-datos/` (gitignorado) y se bajan con `curl --compressed` — sin eso
   Firebase los sirve en crudo y son ~12 MB en vez de ~1,2 MB, facturados como
   egress.

El reparto es determinista (SEED): volver a ejecutarlo con los mismos datos da
exactamente el mismo CSV. Para una tanda nueva tras una carga semanal, cambia
SEED o amplía SEMANAS.
"""
import json, csv, random, re, datetime, collections, os, sys, subprocess

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.environ.get("MANAGER_ATLETISMO") or os.path.join(
    os.path.dirname(RAIZ), "manager-atletismo")
CACHE = os.path.join(RAIZ, ".cache-datos")
CDN = "https://atletismo-espana.web.app"
OUT = RAIZ
SEED = 20260819
SEMANAS = 26
POR_NIVEL = 8
LUNES0 = datetime.date(2026, 8, 24)

rnd = random.Random(SEED)


def J(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def baja(url):
    """curl --compressed, no urllib: pedir gzip ahorra ~10x de egress, y urllib
    se atraganta con la respuesta chunked de Firebase (IncompleteRead)."""
    r = subprocess.run(["curl", "-sS", "--fail", "--compressed", url],
                       capture_output=True)
    if r.returncode != 0:
        sys.exit(f"curl falló bajando {url}: {r.stderr.decode(errors='replace')}")
    return r.stdout.decode("utf-8")


def cachea(local, url):
    """Baja y guarda, pero solo si el JSON es válido: una descarga cortada no
    puede quedarse en la caché y romper todas las ejecuciones siguientes."""
    if os.path.exists(local):
        try:
            return J(local)
        except json.JSONDecodeError:
            os.remove(local)
    print(f"   bajando {os.path.basename(local)} …", file=sys.stderr)
    txt = baja(url)
    dato = json.loads(txt)
    with open(local, "w", encoding="utf-8") as f:
        f.write(txt)
    return dato


def cdn(nombre):
    """Agregado del CDN, cacheado en disco. Resuelve el hash vía data_manifest."""
    os.makedirs(CACHE, exist_ok=True)
    local = os.path.join(CACHE, nombre)
    if os.path.exists(local):
        return cachea(local, "")
    man = cachea(os.path.join(CACHE, "data_manifest.json"), f"{CDN}/data_manifest.json")
    return cachea(local, CDN + man.get(f"/{nombre}", f"/{nombre}"))


if not os.path.isdir(REPO):
    sys.exit(f"No encuentro el repo manager-atletismo en {REPO}.\n"
             f"Exporta MANAGER_ATLETISMO=/ruta/al/repo y vuelve a intentarlo.")

recs_pista = J(f"{REPO}/src/data/recordsEspana.json")["records"]
recs_ruta = J(f"{REPO}/src/data/recordsRutaMarcha.json")["records"]
ctos = J(f"{REPO}/datos/historial_ctos_espana.json")["ediciones"]
eur = J(f"{REPO}/public/ranking_europeo_espana.json")
homestats = J(f"{REPO}/public/agg_home_stats.json")
alltime = {k: J(f"{REPO}/datos/alltime/{k}.json") for k in ("abs-hombres", "abs-mujeres")}
clubes = cdn("agg_clubes_resumen.json")["items"]
pistas = cdn("agg_pistas_resumen.json")["items"]
minimas = cdn("INT_EUR_ABS_2026.json")


# ---------------------------------------------------------------- utilidades
def titulo(n):
    """UPPER CASE de la RFEA -> Nombre Legible."""
    if not n:
        return n
    peq = {"de", "del", "la", "las", "los", "y", "da", "do"}
    out = []
    for w in n.split():
        if w.isupper() and len(w) > 1:
            out.append(w.lower() if w.lower() in peq else w.lower().capitalize())
        else:
            out.append(w)
    return " ".join(out)


def limpia_prueba(p):
    return re.sub(r"\s+ST\s*$", "", p).strip()


def bonita(d):
    """Alcázar De San Juan / VillarroBledo -> Alcázar de San Juan / Villarrobledo."""
    peq = {"de", "del", "la", "las", "los", "el", "y", "a", "o", "da", "do", "dos"}
    ws = d.lower().split()
    return " ".join(w if (i and w in peq) else w.capitalize() for i, w in enumerate(ws))


def limpia_ciudad(c):
    return re.sub(r"\s*\(i\)\s*$", "", c or "").strip()


def fecha_es(iso):
    try:
        y, m, d = iso.split("-")
        return f"{d}/{m}/{y}"
    except Exception:
        return iso


def anio(iso):
    return int(iso[:4])


def miles(n):
    return f"{n:,}".replace(",", ".")


FAMOSAS = {
    "100 m", "200 m", "400 m", "800 m", "1.500 m", "5.000 m", "10.000 m", "60 m",
    "110 m vallas", "100 m vallas", "400 m vallas", "60 m vallas", "3.000 m obstáculos",
    "Altura", "Pértiga", "Longitud", "Triple", "Peso", "Disco", "Martillo", "Jabalina",
    "Decatlón", "Heptatlón", "Maratón", "Media Maratón", "20km Marcha", "35km Marcha",
}


def es_individual(p):
    return not re.search(r"^\d\s*x|clubes|Mixto|equipos", p, re.I)


# ------------------------------------------------- normalizacion de records
def norm_records():
    vistos, out = set(), []
    for r in recs_pista + recs_ruta:
        if not r.get("oficial"):
            continue
        p = limpia_prueba(r["prueba"])
        if not es_individual(p):
            continue
        indoor = bool(r.get("indoor")) or r.get("estilo") == "PC"
        k = (p, r["categoria"], r["genero"], indoor)
        if k in vistos:
            continue
        vistos.add(k)
        out.append(
            dict(r, prueba=p, indoor=indoor, atleta=titulo(r["atleta"]),
                 ciudad=limpia_ciudad(r["ciudad"]))
        )
    return out


RECS = norm_records()


def etiqueta(r):
    cat = "absoluto" if r["categoria"] == "Absoluta" else r["categoria"].lower().replace(" ", "")
    donde = " en pista cubierta" if r["indoor"] else ""
    gen = "masculino" if r["genero"] == "Hombre" else "femenino"
    return f"récord de España {cat} {gen} de {r['prueba']}{donde}"


FUENTE_REC = "Récords de España (RFEA), cierre 03/08/2026"

# ---------------------------------------------------------------- preguntas
POOL = {"facil": [], "intermedio": [], "dificil": []}
CLAVES = set()


def add(nivel, clave, pregunta, correcta, distractores, explicacion, tema, fuente):
    if clave in CLAVES:
        return
    ds = []
    for d in distractores:
        d = str(d).strip()
        if d and d != str(correcta) and d not in ds:
            ds.append(d)
    if len(ds) < 3:
        return
    ds = ds[:3]
    ops = ds + [str(correcta)]
    rnd.shuffle(ops)
    CLAVES.add(clave)
    POOL[nivel].append({
        "clave": clave, "pregunta": pregunta, "opciones": ops,
        "correcta": str(correcta), "explicacion": explicacion,
        "tema": tema, "fuente": fuente,
    })


def muestra(pool, n, excluir=()):
    cand = [x for x in pool if x not in excluir]
    rnd.shuffle(cand)
    return cand[:n]


# --- 1. recordista de Espana -------------------------------------------------
por_genero = collections.defaultdict(list)
for r in RECS:
    por_genero[r["genero"]].append(r["atleta"])

for r in RECS:
    if r["categoria"] != "Absoluta":
        continue
    nivel = "facil" if r["prueba"] in FAMOSAS else "intermedio"
    otros = muestra(sorted(set(por_genero[r["genero"]])), 6, excluir=(r["atleta"],))
    add(nivel, f"quien|{etiqueta(r)}",
        f"¿Quién posee el {etiqueta(r)}?",
        r["atleta"], otros,
        f"{r['marca']} de {r['atleta']} ({r['ciudad']}, {fecha_es(r['fecha'])}).",
        "Récords de España", FUENTE_REC)

for r in RECS:
    if r["categoria"] in ("Absoluta", "Sub 14", "Sub 16"):
        continue
    if r["prueba"] not in FAMOSAS:
        continue
    otros = muestra(sorted(set(por_genero[r["genero"]])), 6, excluir=(r["atleta"],))
    add("dificil", f"quien|{etiqueta(r)}",
        f"¿Quién posee el {etiqueta(r)}?",
        r["atleta"], otros,
        f"{r['marca']} de {r['atleta']} ({r['ciudad']}, {fecha_es(r['fecha'])}).",
        "Récords de categorías menores", FUENTE_REC)

# --- 2. marca del record y all-time -----------------------------------------
AT = {}
for k, blob in alltime.items():
    gen = "Hombre" if "hombres" in k else "Mujer"
    key = "hombres" if gen == "Hombre" else "mujeres"
    for prueba, lista in blob[key].items():
        AT[(prueba, gen)] = lista

ALIAS = {
    "60 m": "60 metros", "100 m": "100 metros", "200 m": "200 metros",
    "400 m": "400 metros", "800 m": "800 metros", "1.500 m": "1.500 metros",
    "3.000 m": "3.000 metros", "5.000 m": "5.000 metros", "10.000 m": "10.000 metros",
    "110 m vallas": "110 metros vallas", "100 m vallas": "100 metros vallas",
    "400 m vallas": "400 metros vallas", "60 m vallas": "60 metros vallas",
    "3.000 m obstáculos": "3.000 metros obstáculos", "Altura": "Altura",
    "Pértiga": "Pértiga", "Longitud": "Longitud", "Triple": "Triple",
}

for r in RECS:
    if r["categoria"] != "Absoluta" or r["indoor"]:
        continue
    lst = AT.get((ALIAS.get(r["prueba"], ""), r["genero"]))
    if not lst or len(lst) < 5:
        continue
    peores = [x["marca"] for x in lst[1:8] if x["marca"] != r["marca"]]
    if len(peores) >= 3:
        add("dificil", f"marca|{etiqueta(r)}",
            f"¿Cuál es el {etiqueta(r)}?",
            r["marca"], muestra(peores, 5),
            f"{r['marca']}, de {r['atleta']} ({r['ciudad']}, {fecha_es(r['fecha'])}). "
            f"El resto de opciones son marcas reales del top-10 español de todos los tiempos.",
            "Récords de España", FUENTE_REC + " + all-time RFEA")
    if len(lst) > 3:
        n2 = titulo(lst[1]["atleta"])
        otros = [titulo(x["atleta"]) for x in lst[2:9]]
        sexo = "hombres" if r["genero"] == "Hombre" else "mujeres"
        add("dificil", f"alltime2|{r['prueba']}|{r['genero']}",
            f"Sin contar al plusmarquista nacional, ¿quién es el 2.º mejor español de "
            f"todos los tiempos en {r['prueba']} ({sexo}), al aire libre?",
            n2, otros,
            f"{n2}, con {lst[1]['marca']}. Por delante solo está "
            f"{titulo(lst[0]['atleta'])} ({lst[0]['marca']}).",
            "All-time España", "Ranking all-time RFEA, cierre 26/07/2026")

# --- 3. anio y sede del record ----------------------------------------------
anios_reales = sorted({anio(r["fecha"]) for r in RECS})
ciudades = sorted({r["ciudad"] for r in RECS if r["ciudad"]})

for r in RECS:
    if r["categoria"] != "Absoluta" or r["prueba"] not in FAMOSAS:
        continue
    y = anio(r["fecha"])
    cand = [str(x) for x in anios_reales if 0 < abs(x - y) <= 12]
    add("intermedio", f"anio|{etiqueta(r)}",
        f"¿En qué año se estableció el {etiqueta(r)}?",
        str(y), muestra(cand, 6),
        f"{r['marca']} de {r['atleta']} en {r['ciudad']}, el {fecha_es(r['fecha'])}.",
        "Récords de España", FUENTE_REC)
    add("dificil", f"ciudad|{etiqueta(r)}",
        f"¿En qué sede se logró el {etiqueta(r)}?",
        r["ciudad"], muestra(ciudades, 8, excluir=(r["ciudad"],)),
        f"{r['atleta']} hizo {r['marca']} en {r['ciudad']} el {fecha_es(r['fecha'])}.",
        "Récords de España", FUENTE_REC)

# --- 3b. en que prueba tiene el record (facil) -------------------------------
abs_recs = [r for r in RECS if r["categoria"] == "Absoluta"]
pruebas_de = collections.defaultdict(set)
for r in abs_recs:
    pruebas_de[r["atleta"]].add(r["prueba"])
pruebas_gen = collections.defaultdict(set)
for r in abs_recs:
    pruebas_gen[r["genero"]].add(r["prueba"])

for r in abs_recs:
    if len(pruebas_de[r["atleta"]]) != 1 or r["prueba"] not in FAMOSAS:
        continue
    otras = [p for p in sorted(pruebas_gen[r["genero"]]) if p not in pruebas_de[r["atleta"]]]
    add("facil", f"enque|{r['atleta']}",
        f"¿En qué prueba posee {r['atleta']} el récord de España absoluto?",
        r["prueba"], muestra(otras, 8),
        f"{r['marca']} en {r['prueba']} ({r['ciudad']}, {fecha_es(r['fecha'])}).",
        "Récords de España", FUENTE_REC)


# --- 3c. la marca del record, con opciones muy separadas (facil) -------------
CAMPO = {"Altura", "Pértiga", "Longitud", "Triple", "Peso", "Disco", "Martillo", "Jabalina"}


def variantes(marca, factores):
    """Distractores numericos a partir de una marca decimal simple."""
    if ":" in marca or not re.fullmatch(r"\d+\.\d+", marca):
        return []
    dec = len(marca.split(".")[1])
    v = float(marca)
    out = []
    for f in factores:
        out.append(f"{v * f:.{dec}f}")
    return out


for r in abs_recs:
    facts = (0.94, 0.88, 1.05, 0.82) if r["prueba"] in CAMPO else (1.05, 1.11, 0.95, 1.18)
    vs = variantes(r["marca"], facts)
    if len(vs) < 3:
        continue
    add("facil", f"marcafacil|{etiqueta(r)}",
        f"¿Cuál de estas marcas es el {etiqueta(r)}?",
        r["marca"], vs,
        f"{r['marca']}, de {r['atleta']} ({r['ciudad']}, {fecha_es(r['fecha'])}).",
        "Récords de España", FUENTE_REC)

# --- 3d. comparativas de la base de datos (facil) ----------------------------
cl_orden = sorted([c for c in clubes if c["key"] != "independiente"],
                  key=lambda c: c["atletasUnicos"], reverse=True)
VAR_CLUB = [
    "De estos cuatro clubes, ¿cuál tiene más atletas distintos con marca registrada?",
    "¿Cuál de estos cuatro clubes reúne a más atletas fichados con marca en la base de datos?",
    "Por número de atletas con marca registrada, ¿cuál de estos clubes es el mayor?",
]
for i, c in enumerate(cl_orden[:12]):
    peq = [x for x in cl_orden if x["atletasUnicos"] <= c["atletasUnicos"] * 0.55]
    if len(peq) < 3:
        continue
    add("facil", f"cmpclub|{c['key']}",
        VAR_CLUB[i % len(VAR_CLUB)],
        c["display"], [x["display"] for x in muestra(peq, 6)],
        f"{c['display']}: {miles(c['atletasUnicos'])} atletas y "
        f"{miles(c['totalMarcas'])} marcas.",
        "La base de datos", "Agregados de la web / rankings RFEA")

MUNIS = {k for k in J(f"{REPO}/src/data/spainMunicipalities.json")}


def es_municipio(d):
    import unicodedata

    def nrm(x):
        x = unicodedata.normalize("NFD", x.lower())
        return "".join(c for c in x if unicodedata.category(c) != "Mn").strip()

    return nrm(d) in {nrm(m) for m in MUNIS}


MUNIS_N = None
pi_uni = {}
for p in pistas:
    d = p["display"]
    if not es_municipio(d):
        continue
    if d not in pi_uni or p["totalMarcas"] > pi_uni[d]["totalMarcas"]:
        pi_uni[d] = p
pi_orden = sorted(pi_uni.values(), key=lambda p: p["totalMarcas"], reverse=True)
VAR_SEDE = [
    "De estas cuatro sedes, ¿cuál acumula más marcas en la base de datos de la RFEA?",
    "¿En cuál de estas cuatro sedes se han registrado más marcas?",
    "Por volumen de marcas registradas, ¿cuál de estas sedes es la más activa?",
]
for i, p in enumerate(pi_orden[:9]):
    peq = [x for x in pi_orden if x["totalMarcas"] <= p["totalMarcas"] * 0.45]
    if len(peq) < 3:
        continue
    add("facil", f"cmppista|{p['display']}",
        VAR_SEDE[i % len(VAR_SEDE)],
        bonita(p["display"]), [bonita(x["display"]) for x in muestra(peq, 6)],
        f"{bonita(p['display'])}: {miles(p['totalMarcas'])} marcas de "
        f"{miles(p['atletasUnicos'])} atletas.",
        "La base de datos", "Agregados de la web / rankings RFEA")

# --- 4. campeonatos de Espana ------------------------------------------------
CAT_LBL = {"abs": "absoluto", "sub23": "sub23", "sub20": "sub20", "sub18": "sub18", "sub16": "sub16"}
MOD_LBL = {"AL": "aire libre", "PC": "pista cubierta"}
sedes_all = sorted({e["sede"] for e in ctos if e.get("sede")})

for e in ctos:
    if not e.get("sede"):
        continue
    lbl = (f"Campeonato de España {CAT_LBL.get(e['categoria'], e['categoria'])} "
           f"de {MOD_LBL.get(e['modalidad'], e['modalidad'])}")
    nivel = "intermedio" if (e["categoria"] == "abs" and e["year"] >= 2000) else "dificil"
    inst = f" Se disputó en {e['instalacion']}." if e.get("instalacion") else ""
    add(nivel, f"cto|{e['categoria']}|{e['modalidad']}|{e['year']}",
        f"¿Qué ciudad acogió el {lbl} de {e['year']}?",
        e["sede"], muestra(sedes_all, 8, excluir=(e["sede"],)),
        f"{lbl} {e['year']}: {e['sede']}.{inst}",
        "Campeonatos de España", "Historial de Campeonatos de España (RFEA), 515 ediciones")

abs_al = sorted([e for e in ctos if e["categoria"] == "abs" and e["modalidad"] == "AL"],
                key=lambda e: e["year"])
primer = abs_al[0]["year"]
add("intermedio", "cto|primer-abs",
    "¿En qué año se disputó el primer Campeonato de España absoluto de atletismo al aire libre?",
    str(primer), [str(primer + d) for d in (5, -4, 9, 13, -7)],
    f"En {primer}, en {abs_al[0]['sede']} ({abs_al[0].get('instalacion', '')}).",
    "Campeonatos de España", "Historial de Campeonatos de España (RFEA)")

top_sedes = collections.Counter(e["sede"] for e in abs_al).most_common(10)
add("intermedio", "cto|sede-mas-veces",
    "¿Qué ciudad ha acogido más veces el Campeonato de España absoluto al aire libre?",
    top_sedes[0][0], [s for s, _ in top_sedes[1:6]],
    f"{top_sedes[0][0]}, con {top_sedes[0][1]} ediciones; le sigue "
    f"{top_sedes[1][0]} con {top_sedes[1][1]}.",
    "Campeonatos de España", "Historial de Campeonatos de España (RFEA)")

# --- 5. ranking europeo ------------------------------------------------------
for g in eur["grupos"]:
    ats = g.get("atletas") or []
    if len(ats) < 4:
        continue
    sexo = "masculino" if g["sexo"] == "M" else "femenino"
    lider = titulo(ats[0]["nombre"])
    otros = [titulo(a["nombre"]) for a in ats[1:9]]
    add("intermedio", f"eur|lider|{g['id']}|{g['sexo']}",
        f"En el ranking europeo de {g['nombre']} ({sexo}), ¿qué español aparece "
        f"mejor clasificado?",
        lider, otros,
        f"{lider}, {ats[0]['puntos']} puntos y {ats[0]['puestoEuropa']}.º de Europa "
        f"(ranking de European Athletics de {eur['fechaRanking']}).",
        "Ranking europeo", f"European Athletics, ranking de {eur['fechaRanking']}")
    p = ats[0]["puestoEuropa"]
    if p <= 60:
        cand = [str(x) for x in (p + 3, p - 2, p + 7, p + 12, max(1, p - 5), p + 20)
                if x > 0 and x != p]
        add("dificil", f"eur|puesto|{g['id']}|{g['sexo']}",
            f"¿Qué puesto ocupa {lider} en el ranking europeo de {g['nombre']}?",
            str(p), cand,
            f"{p}.º de Europa con {ats[0]['puntos']} puntos (de {g['totalEuropa']} "
            f"clasificados; {g['totalEspanoles']} españoles en la lista).",
            "Ranking europeo", f"European Athletics, ranking de {eur['fechaRanking']}")

# --- 6. minimas Europeo 2026 -------------------------------------------------
for p in minimas["pruebas"]:
    m = p.get("minimaRfea")
    if not m:
        continue
    sexo = "masculino" if p["sexo"] == "H" else "femenino"
    def num(x):
        try:
            if ":" in x:
                mm, ss = x.split(":")[-2:]
                return float(mm) * 60 + float(ss)
            return float(x)
        except Exception:
            return None
    base = num(m)
    otras = []
    for q in minimas["pruebas"]:
        v = q.get("minimaRfea")
        if not v or q["prueba"] == p["prueba"] or q["sexo"] != p["sexo"]:
            continue
        nv = num(v)
        if (":" in v) != (":" in m):
            continue
        if base and nv and 0.65 * base <= nv <= 1.5 * base:
            otras.append(v)
    finos = variantes(m, (1.008, 0.991, 1.021, 0.978))
    otras = finos + otras
    add("dificil", f"minima|{p['prueba']}|{p['sexo']}",
        f"¿Cuál es la mínima de la RFEA para el Europeo absoluto de 2026 en "
        f"{p['prueba']} {sexo}?",
        m, otras[:6],
        f"Mínima RFEA {m} (la mínima de European Athletics es {p.get('minimaEa', '—')}).",
        "Mínimas y selección", "Mínimas Europeo absoluto 2026 (RFEA / European Athletics)")

# --- 7. la propia base de datos ---------------------------------------------
cl = sorted([c for c in clubes if c["key"] != "independiente"],
            key=lambda c: c["atletasUnicos"], reverse=True)
add("intermedio", "db|club-mas-atletas",
    "Según la base de datos de marcas de la RFEA, ¿qué club español acumula más "
    "atletas distintos con alguna marca registrada?",
    cl[0]["display"], [c["display"] for c in cl[1:7]],
    f"{cl[0]['display']}, con {miles(cl[0]['atletasUnicos'])} atletas y "
    f"{miles(cl[0]['totalMarcas'])} marcas.",
    "La base de datos", "Agregados de la web / rankings RFEA")

pi = sorted(pistas, key=lambda p: p["totalMarcas"], reverse=True)
add("facil", "db|pista-mas-marcas",
    "¿Qué sede española acumula más marcas registradas en la base de datos de la RFEA?",
    pi[0]["display"], list(dict.fromkeys(p["display"] for p in pi[1:9])),
    f"{pi[0]['display']}, con {miles(pi[0]['totalMarcas'])} marcas de "
    f"{miles(pi[0]['atletasUnicos'])} atletas.",
    "La base de datos", "Agregados de la web / rankings RFEA")

ta = homestats["totalAtletas"]
add("facil", "db|total-atletas",
    "¿Cuántos atletas distintos tienen alguna marca registrada en la base de datos "
    "del atletismo español?",
    miles(ta), [miles(int(ta * k)) for k in (0.42, 0.63, 1.9, 3.1)],
    f"{miles(ta)} atletas y {miles(homestats['totalMarcas'])} marcas.",
    "La base de datos", "agg_home_stats, 03/08/2026")

# --- 8. cultura de atletismo (redactadas a mano) -----------------------------
CULTURA = [
    ("facil", "¿Cuántas vallas se saltan en una carrera de 110 m vallas?", "10",
     ["8", "12", "15"], "Diez vallas, igual que en 100 m vallas y en 400 m vallas.", "Reglamento"),
    ("facil", "¿Cuánto mide la cuerda (calle 1) de una pista de atletismo estándar al aire libre?",
     "400 m", ["380 m", "440 m", "450 m"],
     "400 m exactos, medidos a 30 cm del bordillo interior.", "Instalaciones"),
    ("facil", "¿Cuánto mide un maratón?", "42,195 km", ["42 km", "41,195 km", "43,195 km"],
     "42,195 km; la media maratón son 21,0975 km.", "Reglamento"),
    ("facil", "¿Cuántas pruebas componen el decatlón?", "10", ["7", "8", "12"],
     "Diez pruebas repartidas en dos días.", "Pruebas combinadas"),
    ("facil", "¿Cuántas pruebas componen el heptatlón femenino al aire libre?", "7",
     ["5", "6", "10"], "Siete pruebas en dos días.", "Pruebas combinadas"),
    ("facil", "¿Cuánto pesa el artefacto de lanzamiento de peso en categoría masculina absoluta?",
     "7,26 kg", ["6 kg", "5 kg", "4 kg"],
     "7,26 kg (16 libras); en categoría femenina absoluta, 4 kg.", "Material"),
    ("facil", "¿Cuánto pesa el disco en categoría masculina absoluta?", "2 kg",
     ["1 kg", "1,5 kg", "2,5 kg"], "2 kg; en femenina absoluta, 1 kg.", "Material"),
    ("facil", "¿Cuánto pesa la jabalina masculina absoluta?", "800 g",
     ["600 g", "700 g", "1.000 g"], "800 g; la femenina, 600 g.", "Material"),
    ("facil", "¿Cuántas vueltas a la pista son 10.000 m?", "25", ["20", "24", "30"],
     "25 vueltas a una pista de 400 m.", "Reglamento"),
    ("facil", "¿Cuál es el viento máximo permitido para homologar una marca en velocidad?",
     "+2,0 m/s", ["+1,0 m/s", "+2,5 m/s", "+4,0 m/s"],
     "Por encima de +2,0 m/s la marca vale para la competición, pero no para récords ni rankings.",
     "Reglamento"),
    ("facil", "¿Cuánto mide la cuerda de una pista cubierta estándar?", "200 m",
     ["150 m", "250 m", "400 m"], "200 m, la mitad que al aire libre.", "Instalaciones"),
    ("facil", "En triple salto, ¿cuál es el orden correcto de los tres apoyos?",
     "Salto, paso y salto", ["Paso, salto y salto", "Salto, salto y paso", "Paso, paso y salto"],
     "En inglés: hop, step and jump.", "Técnica"),
    ("facil", "¿Cómo se llama la superficie sintética habitual de las pistas de atletismo?",
     "Tartán", ["Césped artificial", "Parqué", "Terrazo"],
     "Tartán, un nombre comercial que se ha vuelto genérico.", "Instalaciones"),
    ("facil", "¿Qué organismo rige el atletismo mundial desde 2019?", "World Athletics",
     ["IAAF", "FIA", "UEFA"],
     "World Athletics, antes IAAF (International Association of Athletics Federations).",
     "Organización"),
    ("facil", "¿Cuántos intentos tiene cada saltador en cada altura del salto de altura?", "3",
     ["1", "2", "4"], "Tres intentos por altura; a la tercera nula queda eliminado.", "Reglamento"),
    ("facil", "¿Qué se entrega al compañero en una carrera de relevos?", "El testigo",
     ["El dorsal", "El taco", "El listón"],
     "Un tubo rígido que debe cambiarse dentro de la zona de transferencia.", "Material"),
    ("facil", "¿Qué prueba de fondo incluye una ría con agua?", "3.000 m obstáculos",
     ["5.000 m", "10.000 m", "Media maratón"],
     "28 pasos de valla y 7 de ría en la distancia absoluta.", "Pruebas"),
    ("facil", "¿Cómo se llama el listón que hay que superar en pértiga y altura?", "Listón",
     ["Barra", "Travesaño", "Varilla"], "Se apoya sobre los soportes de los saltómetros.",
     "Material"),
    ("facil", "¿En qué prueba se usa una tabla de batida con plastilina?", "Longitud",
     ["Altura", "Peso", "Disco"],
     "La plastilina delata si el atleta ha pisado más allá de la tabla (nulo). "
     "También se usa en triple.", "Material"),
    ("facil", "¿Cuántos atletas componen un equipo de relevos 4x100 m?", "4",
     ["3", "5", "6"], "Cuatro postas de 100 m cada una.", "Reglamento"),
    ("facil", "¿De qué color es la bandera con la que un juez señala un intento nulo?", "Roja",
     ["Blanca", "Amarilla", "Verde"], "La blanca indica intento válido.", "Reglamento"),
    ("facil", "¿Cuántos intentos tiene cada participante en la primera fase de un concurso "
     "de lanzamientos?", "3", ["1", "2", "6"],
     "Tres intentos; los mejores clasificados disponen de tres mejoras.", "Reglamento"),
    ("facil", "¿Cuántos atletas puede alinear un país en cada prueba individual de un "
     "Campeonato del Mundo?", "3", ["1", "2", "4"],
     "Tres por país y prueba, más el campeón defensor en algunos casos.", "Organización"),
    ("facil", "¿Qué significan las siglas DNF en un resultado?", "No terminó la prueba",
     ["No tomó la salida", "Fue descalificado", "No hubo marca válida"],
     "Did Not Finish; DNS es no tomar la salida y DQ, descalificación.", "Cultura"),
    ("facil", "¿Qué significa DQ junto al nombre de un atleta?", "Que fue descalificado",
     ["Que abandonó", "Que no compitió", "Que hizo récord"],
     "Disqualified: descalificación por infringir el reglamento.", "Cultura"),
    ("facil", "¿Con qué se da la salida en una prueba de pista?", "Una pistola",
     ["Un silbato", "Una bocina", "Una bandera"],
     "Hoy es electrónica y va conectada al sistema de cronometraje y a los tacos.", "Material"),
    ("facil", "¿Cuántas vueltas a la pista son 800 m?", "2", ["1", "3", "4"],
     "Dos vueltas, con salida escalonada por calles en la primera curva.", "Reglamento"),
    ("facil", "¿Cuántas vueltas a la pista son 5.000 m?", "12 vueltas y media",
     ["10 vueltas", "12 vueltas", "15 vueltas"], "12,5 vueltas a una pista de 400 m.",
     "Reglamento"),
    ("facil", "¿Cuál de estas pruebas se corre íntegramente por calles asignadas?", "400 m",
     ["800 m", "1.500 m", "5.000 m"],
     "Hasta 400 m se corre por calles; en 800 m solo la primera curva.", "Reglamento"),
    ("facil", "¿Qué tipo de salida se usa en las pruebas de 800 m en adelante?", "Salida alta",
     ["Salida de tacos", "Salida lanzada", "Salida escalonada baja"],
     "De pie, sin tacos: solo son obligatorios hasta 400 m.", "Reglamento"),
    ("facil", "¿En qué modalidad está prohibido perder el contacto visible con el suelo?",
     "Marcha", ["Cross", "Media maratón", "3.000 m obstáculos"],
     "Es la regla básica que la distingue de la carrera.", "Reglamento"),
    ("facil", "¿Qué significan las siglas AL en el calendario del atletismo español?",
     "Aire libre", ["Alta competición", "Atletismo ligero", "Absoluto libre"],
     "Frente a PC, pista cubierta.", "Organización"),
    ("facil", "¿Cuál de estas NO es una prueba de lanzamiento?", "Triple",
     ["Peso", "Disco", "Jabalina"],
     "El triple es un salto horizontal; los lanzamientos son peso, disco, martillo y jabalina.",
     "Pruebas"),
    ("facil", "¿Cuál de estas NO es una prueba de saltos?", "Peso",
     ["Altura", "Longitud", "Pértiga"],
     "El peso es un lanzamiento; los saltos son altura, pértiga, longitud y triple.", "Pruebas"),
    ("facil", "¿Qué prueba de fondo de pista cubierta hace de equivalente al 5.000 m?",
     "3.000 m", ["1.500 m", "2.000 m", "10.000 m"],
     "El 3.000 m es la distancia larga estándar bajo techo.", "Pruebas"),
    ("facil", "¿Cómo se llama el borde interior de la pista, junto al que se mide la distancia?",
     "La cuerda", ["El sector", "El carril cero", "La línea de meta"],
     "Los 400 m se miden a 30 cm de la cuerda.", "Instalaciones"),
    ("facil", "¿Qué es un récord del campeonato?", "La mejor marca lograda en ese campeonato",
     ["El récord del país anfitrión", "El récord del estadio", "La mejor marca del año"],
     "Se abrevia RC y solo cuenta lo hecho en las ediciones de esa competición.", "Cultura"),
    ("facil", "¿Cuál es el relevo más largo del programa olímpico de atletismo?", "4x400 m",
     ["4x100 m", "4x200 m", "4x800 m"],
     "Existe en versión masculina, femenina y mixta.", "Pruebas"),
    ("facil", "¿En qué categoría son más bajas las vallas: sub18 o absoluta?", "Sub18",
     ["Absoluta", "Son iguales", "Depende de la sede"],
     "La altura y la separación de las vallas crecen con la categoría.", "Reglamento"),
    ("facil", "¿Cuántos kilómetros son 20.000 m marcha en pista?", "20 km",
     ["2 km", "10 km", "50 km"], "50 vueltas a una pista de 400 m.", "Reglamento"),
    ("facil", "¿Cuántas calles tiene habitualmente una pista al aire libre homologada "
     "para competiciones internacionales?", "8", ["4", "6", "10"],
     "Ocho calles, aunque muchas instalaciones modernas tienen nueve.", "Instalaciones"),
    ("facil", "¿Con qué prueba empieza el decatlón?", "100 m",
     ["400 m", "Longitud", "1.500 m"],
     "Primer día: 100 m, longitud, peso, altura y 400 m.", "Pruebas combinadas"),
    ("facil", "¿Con qué prueba termina el decatlón?", "1.500 m",
     ["800 m", "5.000 m", "400 m"], "El 1.500 m cierra el segundo día.", "Pruebas combinadas"),
    ("facil", "¿Con qué prueba termina el heptatlón femenino?", "800 m",
     ["1.500 m", "200 m", "Jabalina"], "El 800 m es la última de las siete.",
     "Pruebas combinadas"),
    ("facil", "¿Cuántos días dura el decatlón?", "2", ["1", "3", "4"],
     "Cinco pruebas cada día.", "Pruebas combinadas"),
    ("facil", "¿Cuál es la prueba de pista más corta del programa olímpico?", "100 m",
     ["60 m", "200 m", "110 m vallas"],
     "Los 60 m son la más corta, pero solo se disputan en pista cubierta.", "Pruebas"),
    ("facil", "¿Qué calzado usan los atletas para agarrarse al tartán?",
     "Zapatillas de clavos", ["Botas de tacos", "Zapatillas de suela lisa", "Sandalias técnicas"],
     "Los clavos se atornillan a la suela y su longitud está limitada por el reglamento.",
     "Material"),
    ("facil", "¿Cómo se llama la salida agachada que se apoya en unos soportes metálicos?",
     "Salida de tacos", ["Salida alta", "Salida en bloque", "Salida lanzada"],
     "Obligatoria en todas las pruebas de hasta 400 m, incluidos los relevos.", "Reglamento"),
    ("facil", "¿Cuántos atletas suele haber en una final de una prueba de pista?", "8",
     ["4", "6", "12"], "Ocho, uno por calle en las pruebas con calles asignadas.", "Reglamento"),
    ("facil", "¿Qué significan las siglas PC en el calendario del atletismo español?",
     "Pista cubierta", ["Pista corta", "Prueba combinada", "Pista de competición"],
     "Frente a AL, aire libre.", "Organización"),
    ("facil", "¿Qué significa que un atleta ha hecho una 'PB'?",
     "Su mejor marca personal", ["Una marca por debajo de la mínima", "Una salida nula",
                                 "Un récord del campeonato"],
     "Personal best; en español, MMP (mejor marca personal).", "Cultura"),
    ("facil", "¿Cada cuántos años se celebran los Juegos Olímpicos de verano?", "4",
     ["2", "3", "5"], "Cada cuatro años; los últimos, París 2024.", "Organización"),
    ("facil", "¿Qué ciudad acogerá los Juegos Olímpicos de 2028?", "Los Ángeles",
     ["París", "Tokio", "Brisbane"],
     "Los Ángeles 2028; Brisbane será la sede de 2032.", "Organización"),
    ("facil", "¿Qué ciudad acoge el Campeonato de Europa absoluto al aire libre de 2026?",
     "Birmingham", ["Roma", "Múnich", "Estocolmo"],
     "Birmingham (Reino Unido), del 10 al 16 de agosto de 2026.", "Organización"),
    ("facil", "¿En qué prueba se lanza girando dentro de una jaula de protección?", "Martillo",
     ["Peso", "Jabalina", "Pértiga"],
     "El martillo y el disco se lanzan desde una jaula; la jabalina, desde un pasillo.", "Pruebas"),
    ("facil", "¿A cuántos kilómetros equivalen 10.000 m?", "10 km",
     ["1 km", "100 km", "5 km"], "25 vueltas a una pista de 400 m.", "Reglamento"),
    ("facil", "¿Qué prueba combina 400 m de carrera con diez vallas?", "400 m vallas",
     ["110 m vallas", "3.000 m obstáculos", "400 m lisos"],
     "Diez vallas repartidas a lo largo de la vuelta a la pista.", "Pruebas"),
    ("facil", "¿En qué terreno se disputa el campo a través (cross)?", "Terreno natural",
     ["Pista de tartán", "Asfalto", "Pista cubierta"],
     "Circuitos de hierba o tierra, sin distancia estándar única.", "Modalidades"),
    ("facil", "¿Qué modalidad se disputa fuera de la pista, sobre asfalto y por ciudad?",
     "Ruta", ["Cross", "Pista cubierta", "Trail"],
     "Maratón, media maratón, 10 km… la ruta se corre sobre asfalto.", "Modalidades"),
    ("facil", "¿Qué implemento se usa para saltar por encima del listón en una de las pruebas "
     "de salto?", "La pértiga", ["El testigo", "El disco", "La valla"],
     "Una pértiga flexible de fibra de vidrio o carbono.", "Material"),
    ("intermedio", "¿Cuánto mide de alto una valla en 110 m vallas masculino absoluto?",
     "1,067 m", ["0,914 m", "0,838 m", "1,200 m"],
     "1,067 m (42 pulgadas). En 400 m vallas masculino son 0,914 m.", "Reglamento"),
    ("intermedio", "¿Cuánto mide de alto una valla en 100 m vallas femenino absoluto?",
     "0,838 m", ["0,762 m", "0,914 m", "1,067 m"],
     "0,838 m (33 pulgadas). En 400 m vallas femenino son 0,762 m.", "Reglamento"),
    ("intermedio", "¿Qué diámetro tiene el círculo de lanzamiento de peso?", "2,135 m",
     ["2,50 m", "1,80 m", "3,00 m"],
     "2,135 m, igual que el de martillo; el de disco mide 2,50 m.", "Instalaciones"),
    ("intermedio", "¿Cuánto mide de ancho una calle de una pista homologada?", "1,22 m",
     ["1,00 m", "1,50 m", "0,90 m"], "1,22 m ± 0,01, sin contar la línea.", "Instalaciones"),
    ("intermedio", "¿Qué dos reglas definen la marcha atlética?",
     "Contacto visible con el suelo y rodilla extendida",
     ["Contacto visible y brazos flexionados", "Rodilla extendida y zancada corta",
      "Pisada de talón y cadencia mínima"],
     "El juez sanciona la pérdida de contacto visible y la flexión de la rodilla en el apoyo.",
     "Reglamento"),
    ("intermedio", "¿Cuántas tarjetas rojas llevan a la zona de penalización en marcha?", "3",
     ["1", "2", "5"], "Tres avisos rojos de jueces distintos; el cuarto supone descalificación.",
     "Reglamento"),
    ("intermedio", "¿Por debajo de qué tiempo de reacción se considera salida nula?", "0,100 s",
     ["0,150 s", "0,050 s", "0,200 s"],
     "Se asume que nadie puede reaccionar más rápido a un estímulo sonoro.", "Reglamento"),
    ("intermedio", "¿Cuántas salidas nulas se permiten a un atleta en una final de velocidad?",
     "Ninguna", ["Una", "Dos", "Tres"],
     "Una sola nula supone descalificación; en pruebas combinadas sí se permite una.",
     "Reglamento"),
    ("intermedio", "¿Cuánto mide la zona de transferencia del testigo en un 4x100 m?", "30 m",
     ["20 m", "10 m", "25 m"], "30 m desde 2018, cuando se eliminó la pre-zona.", "Reglamento"),
    ("intermedio", "¿Cuántas pruebas tiene el pentatlón femenino de pista cubierta?", "5",
     ["4", "6", "7"], "60 m vallas, altura, peso, longitud y 800 m, todo en un día.",
     "Pruebas combinadas"),
    ("intermedio", "¿Cuál es la distancia oficial de la media maratón?", "21,0975 km",
     ["21 km", "21,5 km", "20,195 km"], "Exactamente la mitad del maratón.", "Reglamento"),
    ("intermedio", "¿Qué prueba de pista cubierta hace las veces de los 100 m del aire libre?",
     "60 m", ["50 m", "55 m", "80 m"], "60 m es la distancia estándar de velocidad bajo techo.",
     "Pruebas"),
    ("intermedio", "¿Cómo se llama la estructura de protección desde la que se lanza el martillo?",
     "Jaula", ["Foso", "Cajetín", "Sector"],
     "Una jaula de red que limita el sector de caída por seguridad.", "Instalaciones"),
    ("intermedio", "¿Cómo se llama el hueco donde se clava la pértiga antes del salto?",
     "Cajetín", ["Foso", "Tabla", "Ría"],
     "El cajetín está enrasado con la pista al final del pasillo de carrera.", "Instalaciones"),
    ("intermedio", "¿Qué categoría de la RFEA corresponde a los atletas de 18 y 19 años?",
     "Sub20", ["Sub18", "Sub23", "Absoluta"],
     "Las categorías van sub14, sub16, sub18, sub20, sub23, absoluta y máster.", "Organización"),
    ("intermedio", "¿A partir de qué edad se compite en categoría máster?", "35 años",
     ["30 años", "40 años", "45 años"],
     "Los grupos máster van de cinco en cinco años: M35, M40, M45…", "Organización"),
    ("intermedio", "¿Cuántas vueltas a la pista son 1.500 m?", "3 vueltas y 3/4",
     ["3 vueltas y 1/2", "4 vueltas", "3 vueltas"],
     "Por eso la salida está en la recta contraria.", "Reglamento"),
    ("intermedio", "En 800 m, ¿hasta dónde se corre obligatoriamente por calles?",
     "Hasta el final de la primera curva",
     ["Toda la primera vuelta", "No se corre por calles", "Hasta los 200 m"],
     "Después de la primera curva los atletas pueden entrar a cuerda.", "Reglamento"),
    ("intermedio", "¿Cuánto pesa el martillo en categoría femenina absoluta?", "4 kg",
     ["3 kg", "5 kg", "7,26 kg"],
     "4 kg, igual que el peso femenino; en masculino ambos pesan 7,26 kg.", "Material"),
    ("intermedio", "¿Cómo se llama el atleta que marca el ritmo y luego se retira?", "Liebre",
     ["Gregario", "Marcador", "Guía"], "En inglés, pacemaker o pacer.", "Cultura"),
    ("dificil", "¿Cuántos obstáculos se pasan en total en un 3.000 m obstáculos?", "35",
     ["28", "30", "32"], "28 pasos de valla y 7 pasos de ría.", "Reglamento"),
    ("dificil", "¿Cuánto mide de longitud el foso de agua de la ría de obstáculos?", "3,66 m",
     ["2,50 m", "4,50 m", "5,00 m"],
     "3,66 m, con profundidad decreciente hasta el nivel de la pista.", "Instalaciones"),
    ("dificil", "¿Qué altura tiene la valla de 3.000 m obstáculos en categoría masculina?",
     "0,914 m", ["0,762 m", "1,067 m", "0,838 m"], "0,914 m; en femenina, 0,762 m.", "Reglamento"),
    ("dificil", "¿Cuál es el peso mínimo del testigo de relevos?", "50 g",
     ["30 g", "100 g", "150 g"], "Tubo rígido y liso, de 28 a 30 cm de longitud.", "Material"),
    ("dificil", "¿Cuál es la longitud mínima del pasillo de carrera del salto de altura?",
     "15 m", ["10 m", "20 m", "25 m"], "El pasillo debe permitir al menos 15 m de carrera.",
     "Instalaciones"),
    ("dificil", "¿Cuántas pruebas tiene el heptatlón masculino de pista cubierta?", "7",
     ["5", "6", "10"], "60 m, longitud, peso, altura, 60 m vallas, pértiga y 1.000 m.",
     "Pruebas combinadas"),
    ("dificil", "¿Cuál es la amplitud del sector de caída en los lanzamientos?", "34,92º",
     ["40º", "45º", "30º"], "34,92º, el ángulo que resulta de la construcción geométrica del sector.",
     "Instalaciones"),
    ("dificil", "¿Cada cuánto se celebra el Campeonato del Mundo al aire libre desde 2023?",
     "2 años", ["4 años", "3 años", "1 año"], "Es bienal, en años impares.", "Organización"),
    ("dificil", "¿Cómo se llama el circuito de mítines de máximo nivel de World Athletics?",
     "Diamond League", ["Golden League", "Champions Tour", "Continental Cup"],
     "Diamond League, creada en 2010 en sustitución de la Golden League.", "Organización"),
    ("dificil", "¿Qué ocurre si un atleta invade la calle interior con ventaja?",
     "Puede ser descalificado", ["Pierde un puesto", "Recibe siempre solo un aviso", "No pasa nada"],
     "Pisar la línea interior o invadir otra calle obteniendo ventaja supone descalificación.",
     "Reglamento"),
]
for nivel, preg, corr, dis, expl, tema in CULTURA:
    add(nivel, f"cultura|{preg[:50]}", preg, corr, dis, expl, tema,
        "Reglamento de World Athletics / RFEA")


# ------------------------------------------------------------------ reparto
def reparte():
    filas = []
    for nivel in ("facil", "intermedio", "dificil"):
        pool = POOL[nivel][:]
        rnd.shuffle(pool)
        porTema = collections.defaultdict(list)
        for q in pool:
            porTema[q["tema"]].append(q)
        orden = []
        while any(porTema.values()):
            for t in sorted(porTema):
                if porTema[t]:
                    orden.append(porTema[t].pop())
        need = SEMANAS * POR_NIVEL
        if len(orden) < need:
            print(f"AVISO: el nivel {nivel} solo tiene {len(orden)} preguntas "
                  f"(hacen falta {need})", file=sys.stderr)
        for i, q in enumerate(orden[:need]):
            filas.append((nivel, i // POR_NIVEL, i % POR_NIVEL, q))
    return filas


filas = reparte()
LETRAS = "ABCD"
rows = []
for nivel, semana, idx, q in filas:
    lunes = LUNES0 + datetime.timedelta(weeks=semana)
    ci = q["opciones"].index(q["correcta"])
    rows.append({
        "semana": semana + 1,
        "fecha_lunes": lunes.isoformat(),
        "nivel": nivel,
        "n": idx + 1,
        "id": f"S{semana + 1:02d}-{nivel[:3].upper()}-{idx + 1}",
        "tema": q["tema"],
        "pregunta": q["pregunta"],
        "opcion_a": q["opciones"][0],
        "opcion_b": q["opciones"][1],
        "opcion_c": q["opciones"][2],
        "opcion_d": q["opciones"][3],
        "correcta": LETRAS[ci],
        "respuesta": q["correcta"],
        "explicacion": q["explicacion"],
        "fuente": q["fuente"],
    })
rows.sort(key=lambda r: (r["semana"], ("facil", "intermedio", "dificil").index(r["nivel"]), r["n"]))

campos = ["semana", "fecha_lunes", "nivel", "n", "id", "tema", "pregunta", "opcion_a",
          "opcion_b", "opcion_c", "opcion_d", "correcta", "respuesta", "explicacion", "fuente"]
path = f"{OUT}/test-semanal.csv"
with open(path, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=campos, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    w.writeheader()
    w.writerows(rows)

print(f"OK -> {path}: {len(rows)} preguntas")
for n in ("facil", "intermedio", "dificil"):
    print(f"   pool {n}: {len(POOL[n])} disponibles, "
          f"{sum(1 for r in rows if r['nivel'] == n)} usadas")
print("   reparto de respuestas:",
      dict(collections.Counter(r["correcta"] for r in rows)))
