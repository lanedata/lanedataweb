"""Mapa ciudad/sede → comunidad autónoma.

Se usa para clasificar cada competición por comunidad y poder filtrar por
cercanía en el buscador. No es exhaustivo: cubre capitales de provincia y sedes
habituales de atletismo; lo no reconocido queda en `None` (solo "toda España").
"""

from __future__ import annotations

import unicodedata

CIUDAD_CCAA: dict[str, str] = {
    # Andalucía
    "sevilla": "Andalucía", "malaga": "Andalucía", "granada": "Andalucía",
    "cordoba": "Andalucía", "cadiz": "Andalucía", "huelva": "Andalucía",
    "jaen": "Andalucía", "almeria": "Andalucía", "jerez": "Andalucía",
    "marbella": "Andalucía", "dos hermanas": "Andalucía", "antequera": "Andalucía",
    "la linea": "Andalucía", "algeciras": "Andalucía", "motril": "Andalucía",
    "linares": "Andalucía", "andujar": "Andalucía", "mijas": "Andalucía",
    "almodovar del rio": "Andalucía", "ubeda": "Andalucía",
    # Aragón
    "zaragoza": "Aragón", "huesca": "Aragón", "teruel": "Aragón", "monzon": "Aragón",
    # Asturias
    "oviedo": "Asturias", "gijon": "Asturias", "aviles": "Asturias",
    "llanes": "Asturias", "mieres": "Asturias", "siero": "Asturias",
    # Baleares
    "palma": "Baleares", "palma de mallorca": "Baleares", "ibiza": "Baleares",
    "mahon": "Baleares", "manacor": "Baleares", "calvia": "Baleares",
    # Canarias
    "las palmas": "Canarias", "santa cruz de tenerife": "Canarias",
    "tenerife": "Canarias", "la laguna": "Canarias", "telde": "Canarias",
    "arona": "Canarias", "gran canaria": "Canarias", "san cristobal de la laguna": "Canarias",
    # Cantabria
    "santander": "Cantabria", "torrelavega": "Cantabria", "camargo": "Cantabria",
    # Castilla-La Mancha
    "toledo": "Castilla-La Mancha", "albacete": "Castilla-La Mancha",
    "ciudad real": "Castilla-La Mancha", "cuenca": "Castilla-La Mancha",
    "guadalajara": "Castilla-La Mancha", "talavera": "Castilla-La Mancha",
    "puertollano": "Castilla-La Mancha", "tomelloso": "Castilla-La Mancha",
    # Castilla y León
    "valladolid": "Castilla y León", "leon": "Castilla y León", "burgos": "Castilla y León",
    "salamanca": "Castilla y León", "soria": "Castilla y León", "segovia": "Castilla y León",
    "avila": "Castilla y León", "palencia": "Castilla y León", "zamora": "Castilla y León",
    "ponferrada": "Castilla y León", "aranda de duero": "Castilla y León",
    "medina del campo": "Castilla y León", "miranda de ebro": "Castilla y León",
    # Cataluña
    "barcelona": "Cataluña", "tarragona": "Cataluña", "lleida": "Cataluña",
    "girona": "Cataluña", "sabadell": "Cataluña", "terrassa": "Cataluña",
    "badalona": "Cataluña", "hospitalet": "Cataluña", "mataro": "Cataluña",
    "reus": "Cataluña", "granollers": "Cataluña", "cornella": "Cataluña",
    "vic": "Cataluña", "igualada": "Cataluña", "manresa": "Cataluña",
    # Comunidad Valenciana
    "valencia": "Comunidad Valenciana", "alicante": "Comunidad Valenciana",
    "castellon": "Comunidad Valenciana", "elche": "Comunidad Valenciana",
    "torrevieja": "Comunidad Valenciana", "gandia": "Comunidad Valenciana",
    "alcoy": "Comunidad Valenciana", "sagunto": "Comunidad Valenciana",
    "paterna": "Comunidad Valenciana", "xativa": "Comunidad Valenciana",
    # Extremadura
    "badajoz": "Extremadura", "caceres": "Extremadura", "merida": "Extremadura",
    "plasencia": "Extremadura", "don benito": "Extremadura", "almendralejo": "Extremadura",
    # Galicia
    "a coruna": "Galicia", "coruna": "Galicia", "vigo": "Galicia", "ourense": "Galicia",
    "lugo": "Galicia", "pontevedra": "Galicia", "santiago": "Galicia",
    "santiago de compostela": "Galicia", "ferrol": "Galicia", "naron": "Galicia",
    # Madrid
    "madrid": "Madrid", "mostoles": "Madrid", "alcala de henares": "Madrid",
    "getafe": "Madrid", "leganes": "Madrid", "alcorcon": "Madrid",
    "fuenlabrada": "Madrid", "san sebastian de los reyes": "Madrid",
    "rivas": "Madrid", "arganda": "Madrid", "torrejon": "Madrid",
    "san fernando de henares": "Madrid", "pozuelo": "Madrid", "majadahonda": "Madrid",
    # Murcia
    "murcia": "Murcia", "cartagena": "Murcia", "lorca": "Murcia", "molina": "Murcia",
    "aguilas": "Murcia", "yecla": "Murcia", "totana": "Murcia",
    # Navarra
    "pamplona": "Navarra", "tudela": "Navarra", "baranain": "Navarra", "iruna": "Navarra",
    # País Vasco
    "bilbao": "País Vasco", "vitoria": "País Vasco", "san sebastian": "País Vasco",
    "donostia": "País Vasco", "gasteiz": "País Vasco", "barakaldo": "País Vasco",
    "irun": "País Vasco", "durango": "País Vasco", "getxo": "País Vasco",
    # La Rioja
    "logrono": "La Rioja", "calahorra": "La Rioja", "arnedo": "La Rioja", "haro": "La Rioja",
    # Ceuta / Melilla
    "ceuta": "Ceuta", "melilla": "Melilla",
}

# Federación de origen → comunidad (cuando la sede no se reconoce).
AMBITO_CCAA: dict[str, str] = {
    "galicia": "Galicia", "la rioja": "La Rioja", "larioja": "La Rioja",
    "madrid": "Madrid", "andalucia": "Andalucía", "andalucía": "Andalucía",
    "catalunya": "Cataluña", "cataluña": "Cataluña", "valencia": "Comunidad Valenciana",
}


def _norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return " ".join(s.replace("(i)", "").replace("-", " ").split())


def comunidad_de(lugar: str | None, ambito: str | None = None) -> str | None:
    n = _norm(lugar)
    if n:
        n = n.split(" - ")[0].strip()
        if n in CIUDAD_CCAA:
            return CIUDAD_CCAA[n]
        for token in n.split():
            if token in CIUDAD_CCAA:
                return CIUDAD_CCAA[token]
        for ciudad, ccaa in CIUDAD_CCAA.items():
            if ciudad in n:
                return ccaa
    # Fallback: por la federación de origen
    a = _norm(ambito)
    return AMBITO_CCAA.get(a)
