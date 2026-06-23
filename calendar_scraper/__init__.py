"""calendar_scraper — extractor de competiciones de atletismo (calendario + inscripción).

Carpeta autocontenida y portable. Produce, por competición: nombre, pruebas, fecha,
horas (si están publicadas), lugar, fecha límite de inscripción y cómo/dónde inscribirse.
Salida JSON lista para consumir desde una web.

Uso rápido:
    from calendar_scraper import listar_competiciones
    comps = listar_competiciones("2026-06-19", "2026-06-22")

CLI:
    python -m calendar_scraper --desde 2026-06-19 --hasta 2026-06-22 --out comps.json
"""

from calendar_scraper.scraper import listar_competiciones
from calendar_scraper.models import Competicion, Prueba, Documento, Inscripcion, Inscrito

__all__ = [
    "listar_competiciones", "Competicion", "Prueba", "Documento", "Inscripcion", "Inscrito",
]
