"""Modelos de datos del calendario. Serializan a JSON directamente (pydantic v2)."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class Inscrito(BaseModel):
    nombre: str | None = None
    apellidos: str | None = None
    club: str | None = None
    pais: str | None = None
    categoria: str | None = None
    marca_inscripcion: str | None = None     # marca con la que se inscribe
    fecha_marca: str | None = None
    lugar_marca: str | None = None


class Prueba(BaseModel):
    id: str | None = None        # Salesforce Id de la prueba
    nombre: str                  # '100m MASC. AL - SM', 'Altura FEM. AL'...
    n_inscritos: int | None = None
    inscritos: list[Inscrito] = []   # start list (se rellena con --con-inscritos)


class Documento(BaseModel):
    nombre: str
    url: str


class Inscripcion(BaseModel):
    abierta: bool | None = None          # True si admite inscripción online
    fecha_limite: date | None = None     # plazo (si está publicado)
    url: str | None = None               # dónde inscribirse (sitio oficial / plataforma)
    instrucciones: str | None = None     # texto orientativo de cómo inscribirse


class FranjaHorario(BaseModel):
    hora: str | None = None      # 'HH:MM'
    prueba: str
    ronda: str | None = None     # 'Final' | 'Serie 1/3'...


class Competicion(BaseModel):
    id: str | None = None                # Salesforce Id (sfid) si se conoce
    nombre: str
    ambito: str | None = None            # 'RFEA' | federación autonómica...
    disciplina: str | None = None        # 'Pista Aire libre', 'Ruta'...
    fecha_inicio: date
    fecha_fin: date
    lugar: str | None = None

    pruebas: list[Prueba] = []
    horario: list[FranjaHorario] = []    # horas por prueba si están publicadas

    inscripcion: Inscripcion = Inscripcion()

    url_detalle: str | None = None
    url_inscritos: str | None = None     # listado de inscritos (start list)
    url_resultados: str | None = None
    url_directo: str | None = None       # resultados en directo / streaming
    documentos: list[Documento] = []

    fuente: str = "rfea"
