#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Motor de CRUCE de datos: dado un resultado del scraper (atleta+prueba+marca),
decide qué lo hace relevante cruzándolo con los datos del club:
  - Marca personal (MMP)  - Mejor marca de la temporada (desde 1-ene del año)
  - Récord de España      - Mínima (nacional / internacional) y repesca
  - Nº1 de ranking (absoluto y de su categoría por edad)

Este módulo es LÓGICA PURA (sin red ni Firestore): recibe los datos de
referencia ya cargados. La capa de datos (que corre en el PC/servidor con
acceso a Firestore + iaaf_scoring.json + recordsEspana.json) prepara el 'ctx'
y llama a analizar_resultado(). Así garantizamos que los números coincidan
EXACTAMENTE con los de vuestra web (reutilizamos vuestras mismas fuentes).
"""
import re, unicodedata

SIN_MARCA = {"DNS", "DNF", "DQ", "DNQ", "NM", "NULO", "ELIM", "AB", "SR", "-", ""}

# ------------------------------------------------------------------ utilidades
def normaliza(s):
    """minúsculas, sin acentos, sin signos -> para comparar nombres/pruebas."""
    if not s: return ""
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def clave_inicial(nombre_normalizado):
    """Reduce un nombre ya normalizado (normaliza()) a 'inicial + apellido(s)',
    ej. 'juan arias gonzalez' -> 'j arias gonzalez'. Aplicado tanto a nombres
    completos (BD) como a nombres que YA vienen solo con inicial (rfealive.es,
    ver scraper_rfea_es.py) ambos caen en la MISMA clave, lo que permite
    cruzarlos sin tener el nombre de pila completo del scraper.

    Bug encontrado 2026-06-24 con Riki: rfealive.es no da el nombre de pila
    completo (solo la inicial), así que el cruce normal (normaliza() exacto)
    nunca encontraba marcas/club para nadie de ese formato -> cero
    destacados siempre. Esta clave es la base del fallback en
    cruce_local.analizar_competicion() / buscar_club_actual().

    OJO: esta función asume que el nombre de pila ocupa SIEMPRE un único
    token (el primero). Eso vale para el lado "scraper" (rfealive.es reduce
    el nombre de pila -- tenga 1 o varias palabras -- a UNA sola inicial), pero
    NO vale para el lado "BD", donde el nombre de pila puede tener 2 palabras
    (compuesto: "Andreea Florina", "Sophia Isadora", "Jose Manuel"...). Para
    el lado BD hay que usar claves_iniciales() (genera varias hipótesis de
    corte), no esta función. Ver bug 2026-06-26 (Riki: "A. Sabou"/"S. Molina"
    sin resolver pese a estar en la BD -- "Andreea Florina Sabou Cristutiu" /
    "Sophia Isadora Molina Lopez-Negrete")."""
    toks = (nombre_normalizado or "").split()
    if not toks:
        return ""
    if len(toks) == 1:
        return toks[0]
    return toks[0][0] + " " + " ".join(toks[1:])


def claves_iniciales(nombre_normalizado):
    """Como clave_inicial(), pero genera TODAS las hipótesis razonables de
    dónde termina el nombre de pila y empieza el primer apellido, para poder
    indexar nombres COMPLETOS de la BD que tengan nombre de pila compuesto
    (2 palabras, ej. 'Andreea Florina Sabou Cristutiu' o 'Sophia Isadora
    Molina Lopez-Negrete'). Solo debe usarse al CONSTRUIR ini_idx (lado BD);
    al CONSULTAR (lado scraper) se sigue usando clave_inicial(), porque
    rfealive.es siempre da una única inicial sea o no compuesto el nombre.

    Bug encontrado 2026-06-26 (Riki, casos reales: longitud mujeres "A. Sabou"
    y altura mujeres "S. Molina" en https://rfealive.es/sch/2026MAD65573,
    ambas SÍ están en la BD pero con nombre de pila de 2 palabras): con
    clave_inicial() simple, 'andreea florina sabou cristutiu' reducía a
    'a florina sabou cristutiu' (trataba "florina" como si fuera apellido),
    que nunca casa con la clave del scraper 'a sabou cristutiu' (rfealive.es
    colapsa TODO el nombre de pila, por compuesto que sea, a una sola
    inicial). Ahora se generan también las claves asumiendo nombre de pila de
    2 y 3 palabras, así cualquiera de las hipótesis puede casar."""
    toks = (nombre_normalizado or "").split()
    if not toks:
        return set()
    claves = {toks[0]}
    for corte in (1, 2, 3):
        resto = toks[corte:]
        if resto:
            claves.add(toks[0][0] + " " + " ".join(resto))
        else:
            break
    return claves

def valor_marca(m):
    """Convierte una marca a número comparable.
    Tiempo -> segundos (h:mm:ss, mm:ss.xx). Concurso -> metros/puntos (float).
    Devuelve None si no es una marca válida (DNS, DNF...)."""
    if m is None: return None
    t = str(m).strip().replace(",", ".")
    if t.upper() in SIN_MARCA: return None
    t = t.split()[0] if t.split() else t          # quita viento/código de récord
    mm = re.match(r"^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$", t)   # h:mm:ss
    if mm: return int(mm[1]) * 3600 + int(mm[2]) * 60 + float(mm[3])
    mm = re.match(r"^(\d+):(\d{1,2}(?:\.\d+)?)$", t)             # mm:ss
    if mm: return int(mm[1]) * 60 + float(mm[2])
    if re.match(r"^\d+(?:\.\d+)?$", t):                          # 10.08 / 7.53
        return float(t)
    return None

LIMITE_VIENTO = 2.0
def valor_viento(s):
    """Viento en m/s como float, o None si no hay lectura ('', '-', etc.).
    Acepta coma o punto decimal ('+1,3' / '+1.3') y el signo '+'."""
    if s is None: return None
    t = str(s).strip().replace(",", ".")
    if not t: return None
    try:
        return float(t)
    except ValueError:
        return None

def viento_anula(s):
    """True si el viento favorable (+) supera el límite reglamentario (+2.0 m/s):
    la marca queda anulada a efectos de marca personal / del año / mínimas
    (decisión 2026-06-22 con Riki). El viento en contra (negativo) nunca anula."""
    v = valor_viento(s)
    return v is not None and v > LIMITE_VIENTO

PAIS_ESPANA = {"spain", "espana", "esp", "es"}
def es_extranjero(pais):
    """True si el país/nacionalidad del atleta (tal cual viene del scraper,
    ej. Conersys etiqueta 'Spain'/'Germany' en vez del club) NO es España.
    Un atleta extranjero no puede ser líder español, ni hacer récord de
    España, ni nos interesan sus mínimas internacionales (decisión
    2026-06-23 con Riki). Si no hay dato de país, asumimos que NO es
    extranjero (no podemos afirmarlo, y por defecto en FAM/conersys sin esta
    etiqueta los atletas suelen ser españoles) -- failure mode seguro: si
    falla la detección, como mucho se le aplican de más los hitos
    nacionales, nunca se le quitan los suyos personales (MMP/SB, que no
    dependen de nacionalidad)."""
    p = normaliza(pais)
    if not p:
        return False
    return p not in PAIS_ESPANA

CAMPO = ("longitud", "triple", "altura", "pertiga", "peso", "disco", "martillo",
         "jabalina", "heptatl", "decatl", "pentatl", "hexatl", "combinad")
def es_concurso(prueba):
    """True si en esta prueba MÁS es MEJOR (saltos, lanzamientos, combinadas)."""
    p = normaliza(prueba)
    return any(k in p for k in CAMPO)

def mejor(a, b, concurso):
    """True si la marca 'a' (numérica) es mejor que 'b'."""
    if b is None: return True
    if a is None: return False
    return a > b if concurso else a < b

_RE_NUM_O_TIEMPO = re.compile(r"[+-]?\d+(?:\:\d+){0,2}(?:[.,]\d+)?")

def separar_marca_viento(texto):
    """Separa 'marca' y 'viento' cuando la web los trae JUNTOS en la misma
    celda (visto en saltos: '7.20 0.0' o '7.20 +0.0' -- el viento del
    intento va pegado a la marca, sin columna propia para él). Usado por
    los 3 scrapers (engine.py/conersys, scraper_fam.py/FAM, scraper_rfea.py)
    para no mostrar nunca la marca con el viento "pegado" en el vídeo
    (decisión 2026-06-24 con Riki: la marca debe verse SOLA, el viento aparte
    y más pequeño).

    Usa una regex que reconoce tiempos con ':' (mm:ss.cc / h:mm:ss.cc) como
    UN solo número, para no cortar por error un 15:51.88 en '15' + '51.88'.
    Devuelve (marca_limpia, viento_o_None). Si el segundo número no parece
    viento real (fuera de un rango razonable, +-9.9 m/s) no se toma como tal
    (podría ser un dorsal, puntos, etc. pegado por error de formato)."""
    t = (texto or "").replace("\n", " ").strip()
    for cod in ("DNS", "DNF", "DQ", "NM", "DNQ", "ELIM"):
        if cod in t.upper().split():
            return cod, None
    nums = _RE_NUM_O_TIEMPO.findall(t)
    if not nums:
        return (t.split()[0] if t.split() else ""), None
    marca = nums[0].replace(",", ".")
    viento = None
    if len(nums) > 1:
        v = nums[1].replace(",", ".")
        try:
            if abs(float(v)) <= 9.9:
                viento = v
        except ValueError:
            pass
    return marca, viento


def cumple(marca_val, minima_val, concurso):
    """True si la marca alcanza/supera la mínima (>= en concurso, <= en tiempo)."""
    if marca_val is None or minima_val is None: return False
    return marca_val >= minima_val if concurso else marca_val <= minima_val

# ------------------------------------------------- normalización de la prueba
def detecta_sexo(prueba):
    toks = set(normaliza(prueba).split())
    if {"mujeres", "mujer", "femenino", "fem"} & toks: return "M"
    if {"hombres", "hombre", "masculino", "masc", "varones"} & toks: return "H"
    return None

def signatura_prueba(prueba):
    """Clave canónica de una prueba para emparejar scraper <-> BD.
    base   = disciplina sin sexo, ronda ni especificación
    spec   = peso/altura entre paréntesis, normalizado (ej. '7 260 kg', '0 84')
    sexo   = 'H' / 'M' / None
    concurso = True si MÁS es MEJOR."""
    spec = ""
    msp = re.search(r"\(([^)]*)\)", prueba)
    if msp: spec = normaliza(msp.group(1))
    base_n = normaliza(re.sub(r"\([^)]*\)", " ", prueba))      # quita (peso/altura)
    quita = ("hombres", "mujeres", "masculino", "femenino", "masc", "fem",
             "hombre", "mujer", "varones", "final", "semifinal", "serie",
             "cuartos", "eliminatoria", "repesca")
    for w in quita:
        base_n = re.sub(rf"\b{w}\b", " ", base_n)
    base_n = re.sub(r"\b[abc]\b", " ", base_n)                 # restos de 'Final A/B/C'
    base_n = re.sub(r"\s+", " ", base_n).strip()
    return {"base": base_n, "spec": spec, "sexo": detecta_sexo(prueba),
            "concurso": es_concurso(prueba)}

# ----------------------------------------------------------- categoría por edad
# Bandas RFEA aproximadas por edad en la TEMPORADA (año - año_nac).
# OJO: a verificar contra la normativa RFEA del año; trivial de ajustar aquí.
def categoria_por_edad(anio_nac, anio_temporada):
    if not anio_nac: return None
    e = anio_temporada - int(anio_nac)
    if e <= 9:  return "Sub 10"
    if e <= 11: return "Sub 12"
    if e <= 13: return "Sub 14"
    if e <= 15: return "Sub 16"
    if e <= 17: return "Sub 18"
    if e <= 19: return "Sub 20"
    if e <= 22: return "Sub 23"
    if e <= 34: return "Absoluta"
    return "Master"

def anio_de_fecha(s):
    """Extrae el año de '2002-05-10', '10/3/2011' o '2011'."""
    if not s: return None
    m = re.search(r"(\d{4})", str(s))
    return int(m.group(1)) if m else None

# ----------------------------------------------------------- análisis principal
def _mejor_de(valores, concurso):
    best = None
    for x in valores or []:
        if x is not None and (best is None or mejor(x, best, concurso)):
            best = x
    return best

def analizar_resultado(res, ctx):
    """
    res: dict del scraper, al menos {atleta, prueba, marca, fechaNac}.
    ctx: referencia ya preparada por la capa de datos:
        temporada            : año en curso (int)
        historial            : [valores] del atleta en ESTA prueba (todas las temporadas)
        historial_temporada  : [valores] del atleta en ESTA prueba desde 1-ene
        minimas              : [{minima, minimaRepesca, label}] filtradas a prueba/sexo/categoría
        record_valor         : valor del récord de España (prueba/sexo/categoría) o None
        ranking_mejor_abs    : mejor valor del ranking absoluto (prueba/sexo) o None
        ranking_mejor_cat    : mejor valor del ranking de su categoría o None
        puntos_iaaf          : int o None (con la tabla del equipo)
    Devuelve dict con flags y datos para el vídeo.
    """
    concurso = es_concurso(res.get("prueba", ""))
    v = valor_marca(res.get("marca"))
    viento = res.get("viento")
    anulada_viento = viento_anula(viento)
    extranjero = es_extranjero(res.get("pais"))
    flags = []
    out = {"atleta": res.get("atleta"), "prueba": res.get("prueba"),
           "marca": res.get("marca"), "marca_valida": v is not None,
           "viento": viento, "viento_anula": anulada_viento,
           "pais": res.get("pais"), "extranjero": extranjero,
           "concurso": concurso, "puntos_iaaf": ctx.get("puntos_iaaf"),
           "flags": flags}
    if v is None:
        return out

    # Viento favorable > +2.0 m/s: la marca queda anulada a efectos de MMP,
    # mejor del año, mínimas, récord y Nº1 (regla RFEA/IAAF; decisión 2026-06-22).
    if anulada_viento:
        return out

    # MMP / mejor temporada solo si TENEMOS histórico del atleta (si no,
    # no podemos afirmar que sea marca personal: p. ej. rival de otro club).
    # Si IGUALA (sin superar) su mejor marca/del año, se anota aparte
    # ("IGUALA_MMP"/"IGUALA_SB" -- decisión 2026-06-24 con Riki: empatar tu
    # PB SÍ se destaca en la tabla de cada prueba, pero NO cuenta como hito
    # nuevo para el resumen global ni desbloquea mínima/récord/Nº1 -- ver el
    # GATE más abajo, que sigue exigiendo una mejora REAL, no un empate).
    hist = ctx.get("historial") or []
    mejor_hist = _mejor_de(hist, concurso)
    if hist and mejor(v, mejor_hist, concurso):
        flags.append("MMP")
    elif hist and mejor_hist is not None and v == mejor_hist:
        flags.append("IGUALA_MMP")
    histT = ctx.get("historial_temporada") or []
    mejor_histT = _mejor_de(histT, concurso)
    if histT and mejor(v, mejor_histT, concurso):
        # Si ya es MMP, "mejor del año" queda implícito (toda marca personal
        # es también la mejor de la temporada) -> no la mostramos aparte
        # (decisión 2026-06-22 con Riki).
        if "MMP" not in flags:
            flags.append("MEJOR_TEMPORADA")
    elif histT and mejor_histT is not None and v == mejor_histT:
        if "MMP" not in flags and "IGUALA_MMP" not in flags:
            flags.append("IGUALA_SB")

    # GATE: si el atleta NO ha hecho una mejora REAL (marca personal o mejor
    # de la temporada -- empatar NO cuenta aquí), cualquier otro hito
    # (mínima, récord, nº1) ya era cierto con su marca anterior -> no es
    # noticia nueva, no seguimos calculando flags.
    if not any(f in ("MMP", "MEJOR_TEMPORADA") for f in flags):
        return out

    # Hitos ligados a la NACIONALIDAD española (mínima internacional para
    # representar a España, récord de España, líder español): un atleta
    # extranjero no puede conseguir ninguno de estos, aunque su marca los
    # superase numéricamente (decisión 2026-06-23 con Riki). MMP/mejor del
    # año (arriba) sí se mantienen: son logros personales del atleta, no
    # dependen de su nacionalidad.
    if extranjero:
        return out

    for mn in (ctx.get("minimas") or []):
        # Las mínimas de Cto. España (nacional + repesca) NO se consideran
        # destacado: se filtran antes de llegar aquí (ver cruce_local.py,
        # minimas_aplicables). Solo deberían llegar mínimas internacionales.
        if cumple(v, valor_marca(mn.get("minima")), concurso):
            flags.append(("MINIMA", mn.get("label", "mínima")))
        elif cumple(v, valor_marca(mn.get("minimaRepesca")), concurso):
            flags.append(("MINIMA_REPESCA", mn.get("label", "repesca")))

    rec = ctx.get("record_valor")
    if rec is not None and mejor(v, rec, concurso):
        flags.append("RECORD_ESPANA")

    if ctx.get("ranking_mejor_abs") is not None and mejor(v, ctx["ranking_mejor_abs"], concurso):
        flags.append("N1_ABSOLUTO")
    if ctx.get("ranking_mejor_cat") is not None and mejor(v, ctx["ranking_mejor_cat"], concurso):
        flags.append("N1_CATEGORIA")

    return out


# --------------------------------------------------- etiquetas para el VÍDEO
# Sufijo de categoría "estilo internacional" para las etiquetas del vídeo
# (decisión 2026-06-24 con Riki: U18/U20/U23; Absoluta no lleva sufijo;
# Master no tiene banda fina por edad en categoria_por_edad() hoy, así que
# de momento se abrevia "Mas" -- revisar si algún día se calculan bandas
# M35/M40/... reales).
SUFIJO_CATEGORIA = {
    "Sub 10": "U10", "Sub 12": "U12", "Sub 14": "U14", "Sub 16": "U16",
    "Sub 18": "U18", "Sub 20": "U20", "Sub 23": "U23",
    "Absoluta": "", "Master": "Mas",
}


def _abrevia_minima(label_completo):
    """'EUR_ABS Absoluta' / 'Campeonato de Europa U20' -> 'Mín.Eur'/'Mín.Eur U20'.
    Heurística sobre el texto de 'label' que ya viene de cruce_local
    (cargar_minimas + minimas_aplicables): busca 'eur'/'mun' en el texto para
    el ámbito, y si el texto TERMINA en una de las categorías conocidas, le
    pone su sufijo U-x (si no, no añade sufijo). Ajustar si aparecen mínimas
    de otro ámbito (panamericano, iberoamericano...) -- de momento solo
    tenemos datos de Europeo en minimas_internacional.json."""
    low = (label_completo or "").lower()
    if "mun" in low or "world" in low:
        ambito = "Mun"
    elif "eur" in low:
        ambito = "Eur"
    else:
        primera = (label_completo or "").split()[0] if label_completo else ""
        ambito = primera[:3].title() or "Int"
    suf = ""
    for cat_larga, cat_corta in SUFIJO_CATEGORIA.items():
        if label_completo and label_completo.endswith(cat_larga):
            suf = cat_corta
            break
    return f"Mín.{ambito} {suf}".strip()


def etiquetas_video(out):
    """A partir del dict que devuelve analizar_resultado() (con 'flags' y,
    si viene de cruce_local.analizar_competicion, 'categoria_edad'), genera
    la lista final de etiquetas a pintar en el vídeo, aplicando la jerarquía
    de implícitos acordada con Riki 2026-06-24:
      - Récord de España IMPLICA marca personal y mejor de la temporada ->
        si hay récord, no se muestran "PB" ni "SB" por separado (ya queda
        sobreentendido). Si no hay récord, PB sigue implicando SB (regla que
        ya aplicaba cruce.analizar_resultado al generar 'flags').
      - Mínima(s) internacionales y l�