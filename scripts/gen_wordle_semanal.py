# -*- coding: utf-8 -*-
"""Genera wordle-semanal.csv: una palabra de atletismo por semana, con pistas.

Uso:
    python scripts/gen_wordle_semanal.py

Todo el contenido está en la lista P de este fichero: no depende de ningún dato
externo, así que editar el juego es editar esta lista. Las soluciones van sin
tildes ni Ñ (el teclado del juego es A-Z) y de 4 a 10 letras.

Al generar se comprueban dos cosas: que la solución no se cuela en ninguna de
las tres pistas (la explicación sí puede nombrarla: se ve al resolver) y que no
hay palabras repetidas.
"""
import csv, datetime, os, re, unicodedata, sys

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUNES0 = datetime.date(2026, 8, 24)

# solucion, dificultad, categoria, pista_1, pista_2, pista_3, explicacion
P = [
 ("VALLA", "facil", "Material",
  "Se salta, pero no es un salto", "Hay diez en las pruebas de 110 y 400",
  "Si la derribas no te descalifican, pero pierdes tiempo",
  "Obstáculo de altura reglamentada según prueba y categoría."),
 ("TESTIGO", "facil", "Material",
  "Solo aparece en una familia de pruebas", "Cambia de manos cuatro veces por carrera",
  "Se pasa dentro de una zona de 30 metros",
  "El tubo del relevo: mínimo 50 g y de 28 a 30 cm."),
 ("META", "facil", "Instalaciones",
  "Todo el mundo quiere llegar ahí", "Está donde acaba la carrera",
  "Sobre ella pasa la línea que detiene el crono",
  "La llegada; el tiempo se toma cuando el torso la cruza."),
 ("TARTAN", "facil", "Instalaciones",
  "Es una superficie", "Suele ser rojiza y sintética",
  "Una marca comercial convertida en nombre común",
  "El pavimento sintético habitual de las pistas."),
 ("PERTIGA", "media", "Pruebas",
  "Prueba de saltos", "Se salta con ayuda de un implemento largo y flexible",
  "Antes del vuelo hay que clavarla en un cajetín",
  "Salto con pértiga: el implemento da nombre a la prueba."),
 ("PODIO", "facil", "Competición",
  "Aparece al final del día", "Tiene tres alturas",
  "Solo lo pisan tres de cada prueba",
  "El cajón de los tres primeros clasificados."),
 ("MARATON", "facil", "Pruebas",
  "Se corre fuera de la pista", "Dura horas, no minutos",
  "Mide 42,195 km", "La prueba de ruta más larga del programa olímpico."),
 ("CLAVOS", "facil", "Material",
  "Van en los pies", "Se atornillan y se cambian",
  "Su longitud máxima la fija el reglamento",
  "Las puntas metálicas de las zapatillas de competición."),
 ("LIEBRE", "media", "Cultura",
  "Es una persona, no un animal", "Corre para que otros corran mejor",
  "Casi nunca acaba la carrera", "El atleta que marca el ritmo y se retira; en inglés, pacer."),
 ("JABALINA", "media", "Pruebas",
  "Prueba de lanzamientos", "El único implemento que se lanza corriendo",
  "Pesa 800 g en categoría masculina y 600 g en femenina",
  "Lanzamiento de jabalina, desde un pasillo y no desde un círculo."),
 ("SALIDA", "facil", "Competición",
  "Es un momento, no un lugar", "Puede ser nula",
  "Los tacos solo sirven para esto", "El arranque de la carrera; por debajo de 0,100 s de reacción, nula."),
 ("LISTON", "media", "Material",
  "Aparece en dos pruebas", "Se apoya sobre dos soportes",
  "Si lo tiras, es nulo", "La barra que hay que superar en altura y pértiga."),
 ("RELEVO", "facil", "Pruebas",
  "Es cosa de equipo", "Cuatro atletas, una carrera",
  "Sin él no hay 4x100", "Prueba por equipos con entrega de testigo."),
 ("MARCHA", "facil", "Modalidades",
  "Se avanza rápido pero sin correr", "Tiene jueces que miran las rodillas",
  "Exige contacto visible permanente con el suelo",
  "La marcha atlética, con pruebas de 20 y 35 km."),
 ("CAJETIN", "dificil", "Instalaciones",
  "Es un hueco en el suelo", "Está al final de un pasillo",
  "Solo lo usa una prueba de saltos", "El encaje donde se clava la pértiga para el batido."),
 ("DORSAL", "facil", "Competición",
  "Se lleva puesto", "Lleva un número",
  "Sin él no puedes competir", "El número identificativo del atleta en competición."),
 ("VIENTO", "media", "Reglamento",
  "No se toca pero se mide", "Puede invalidar una marca",
  "El límite legal es +2,0 m/s", "Se mide con anemómetro en velocidad, vallas cortas y saltos horizontales."),
 ("CROSS", "facil", "Modalidades",
  "No se corre en pista", "Hay barro, hierba y cuestas",
  "Su temporada es el invierno", "El campo a través, sobre terreno natural."),
 ("ZANCADA", "media", "Técnica",
  "Se cuenta y se mide", "Cada corredor tiene la suya",
  "Amplitud por frecuencia da la velocidad", "El paso de carrera: su amplitud y su frecuencia definen el ritmo."),
 ("JAULA", "media", "Instalaciones",
  "Está hecha de red", "Existe por seguridad",
  "Protege al público de dos implementos que giran",
  "La estructura desde la que se lanza martillo y disco."),
 ("TRIPLE", "facil", "Pruebas",
  "Prueba de saltos", "Tiene tres apoyos",
  "Salto, paso y salto", "El triple salto: hop, step and jump."),
 ("MINIMA", "media", "Competición",
  "Es una cifra, no una marca cualquiera", "La publica la federación antes del campeonato",
  "Sin ella (o sin ranking) no viajas", "La marca exigida para entrar en un equipo nacional."),
 ("ANEMOMETRO", "dificil", "Material",
  "Es un aparato de medida", "Se coloca junto a la recta",
  "Decide si una marca es homologable", "Mide el viento; el límite legal es +2,0 m/s."),
 ("SERIE", "facil", "Competición",
  "Es una ronda", "Se corre antes de la final",
  "De ella salen los clasificados", "Las eliminatorias previas de una prueba de pista."),
 ("BATIDA", "media", "Técnica",
  "Es el último contacto con el suelo", "Ocurre justo antes de volar",
  "En longitud se hace sobre una tabla", "El impulso final de los saltos."),
 ("MARTILLO", "media", "Pruebas",
  "Prueba de lanzamientos", "Bola, cable y empuñadura",
  "Se lanza girando dentro de una jaula", "Pesa 7,26 kg en categoría masculina y 4 kg en femenina."),
 ("CALLE", "facil", "Instalaciones",
  "La pista está dividida en ellas", "Cada una mide 1,22 m de ancho",
  "En una final suele haber ocho", "Los pasillos de la pista, numerados de dentro hacia fuera."),
 ("PLASTILINA", "dificil", "Material",
  "Es blanda y se cambia entre intentos", "Está en el suelo, no en las manos",
  "Delata al que pisa de más", "La banda que marca el nulo en la tabla de batida."),
 ("FONDO", "facil", "Modalidades",
  "Es una manera de clasificar las pruebas", "Lo contrario de la velocidad",
  "5.000, 10.000 y más allá", "Las pruebas de larga distancia."),
 ("CAMPANA", "media", "Competición",
  "Suena una sola vez por carrera", "Avisa a los que van en cabeza",
  "Marca la última vuelta", "El toque que anuncia la vuelta final."),
 ("ALTURA", "facil", "Pruebas",
  "Prueba de saltos", "Se salta de espaldas",
  "Tres intentos por cada listón", "El salto de altura, con la técnica Fosbury."),
 ("SECTOR", "media", "Instalaciones",
  "Es una zona del campo interior", "Tiene forma de porción de tarta",
  "Fuera de él, el lanzamiento es nulo", "El sector de caída de los lanzamientos, de 34,92º."),
 ("TACOS", "facil", "Material",
  "Van en el suelo, no en el pie", "Solo se usan hasta los 400 m",
  "De ellos sale el atleta al oír el disparo", "Los tacos de salida, regulables y con sensores de reacción."),
 ("DECATLON", "media", "Pruebas combinadas",
  "Son varias pruebas en una", "Dura dos días",
  "Empieza con 100 m y acaba con 1.500 m", "Las diez pruebas del combinado masculino al aire libre."),
 ("DISCO", "facil", "Pruebas",
  "Prueba de lanzamientos", "El implemento es plano y redondo",
  "Pesa 2 kg en categoría masculina", "Lanzamiento de disco, desde un círculo de 2,50 m."),
 ("RECORD", "facil", "Competición",
  "Es lo que todos persiguen", "Puede ser nacional, europeo o mundial",
  "Necesita homologación para contar", "La mejor marca reconocida en un ámbito y una prueba."),
 ("FOSO", "media", "Instalaciones",
  "Está lleno de algo que no es tierra", "Hay uno con arena y otro con agua",
  "En obstáculos está justo detrás de una valla fija", "El foso de caída de los saltos horizontales o la ría de obstáculos."),
 ("VELOCIDAD", "facil", "Modalidades",
  "Es una familia de pruebas", "Duran menos de un minuto",
  "60, 100, 200 y 400", "Las pruebas más cortas del programa."),
 ("TARJETA", "media", "Reglamento",
  "La enseña un juez", "En marcha las hay amarillas y rojas",
  "Tres rojas y vas a la zona de penalización", "El sistema de avisos y sanciones de la marcha atlética."),
 ("COLCHONETA", "media", "Material",
  "Es blanda y enorme", "Amortigua caídas desde varios metros",
  "Sin ella no se puede saltar de espaldas", "La zona de caída de altura y pértiga."),
 ("ESTAFETA", "dificil", "Pruebas",
  "Otro nombre para una prueba conocida", "Se corre por equipos",
  "Es como se llamaba al relevo en las crónicas antiguas",
  "Sinónimo clásico de carrera de relevos."),
 ("CUERDA", "media", "Instalaciones",
  "No es una soga", "Está en la calle 1",
  "Correr a ella es hacer el recorrido más corto",
  "El borde interior de la pista: 400 m medidos a 30 cm de él."),
 ("NULO", "facil", "Reglamento",
  "Es un veredicto", "Lo señala una bandera roja",
  "El intento cuenta, pero no la marca", "El intento inválido en saltos y lanzamientos."),
 ("CRONOMETRO", "facil", "Material",
  "Mide, no pesa", "Hoy es electrónico y va a la milésima",
  "Lo detiene el torso al cruzar la meta", "El sistema de cronometraje de la competición."),
 ("VALLISTA", "media", "Especialistas",
  "Es un tipo de atleta", "Corre y salta a la vez",
  "Su prueba tiene diez obstáculos", "El especialista en las pruebas de vallas."),
 ("MITIN", "media", "Competición",
  "Es una cita del calendario", "No es un campeonato",
  "Los mejores van a los de la Diamond League", "La reunión atlética de un día, sin fase eliminatoria."),
 ("OBSTACULOS", "media", "Pruebas",
  "Prueba de fondo con extras", "Hay vallas fijas y agua",
  "Son 3.000 metros y 35 pasos", "Los 3.000 m obstáculos: 28 vallas y 7 rías."),
 ("LONGITUD", "facil", "Pruebas",
  "Prueba de saltos", "Se mide en horizontal",
  "Carrera, tabla, arena", "El salto de longitud, con batida sobre tabla y plastilina."),
 ("FONDISTA", "media", "Especialistas",
  "Es un tipo de atleta", "Vive de la resistencia",
  "Sus pruebas empiezan en los 3.000 m", "El especialista en las distancias largas."),
 ("LANZADOR", "media", "Especialistas",
  "Es un tipo de atleta", "Trabaja con implementos",
  "Compite dentro de un círculo o en un pasillo",
  "El especialista en peso, disco, martillo o jabalina."),
 ("HEPTATLON", "dificil", "Pruebas combinadas",
  "Son varias pruebas en una", "En femenino se hace al aire libre y en masculino bajo techo",
  "Siete pruebas, y acaba con 800 m en femenino",
  "El combinado de siete pruebas."),
 ("SALTADOR", "media", "Especialistas",
  "Es un tipo de atleta", "Su objetivo es despegar",
  "Puede ser de altura, longitud, triple o pértiga", "El especialista en las pruebas de saltos."),
 ("HOMOLOGAR", "dificil", "Reglamento",
  "Es un verbo, no una cosa", "Sin esto una marca no cuenta para el ranking",
  "Depende del viento, del cronometraje y de la instalación",
  "Validar oficialmente una marca."),
]


def sin_tildes(x):
    x = unicodedata.normalize("NFD", x.lower())
    return "".join(c for c in x if unicodedata.category(c) != "Mn")


rows = []
for i, (sol, dif, cat, p1, p2, p3, expl) in enumerate(P):
    assert re.fullmatch(r"[A-Z]+", sol), f"solución no válida: {sol}"
    for pista in (p1, p2, p3):   # la explicacion se ve al resolver: ahi si puede aparecer
        assert sin_tildes(sol) not in sin_tildes(pista), f"{sol} se filtra en una pista"
    rows.append({
        "semana": i + 1,
        "fecha_lunes": (LUNES0 + datetime.timedelta(weeks=i)).isoformat(),
        "solucion": sol,
        "longitud": len(sol),
        "letras_distintas": len(set(sol)),
        "dificultad": dif,
        "categoria": cat,
        "intentos": 6,
        "pista_1": p1,
        "pista_2": p2,
        "pista_3": p3,
        "explicacion": expl,
    })

campos = ["semana", "fecha_lunes", "solucion", "longitud", "letras_distintas", "dificultad",
          "categoria", "intentos", "pista_1", "pista_2", "pista_3", "explicacion"]
path = f"{OUT}/wordle-semanal.csv"
with open(path, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=campos, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    w.writeheader()
    w.writerows(rows)

assert len({r["solucion"] for r in rows}) == len(rows), "hay soluciones repetidas"
print(f"OK -> {path}: {len(rows)} semanas")
import collections
print("   longitudes:", dict(sorted(collections.Counter(r["longitud"] for r in rows).items())))
print("   dificultad:", dict(collections.Counter(r["dificultad"] for r in rows)))
