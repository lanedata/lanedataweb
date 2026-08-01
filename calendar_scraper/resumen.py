"""Resumen por fuente de una pasada de scraping, con detección de regresiones.

Adaptado de `engine/pipeline/discover.py` y de la política de errores que documenta
`engine/adapters/base.py` en el motor fantasy-atletismo-engine:

    "un fallo (HTTP, navegador, página degradada) debe PROPAGARSE, nunca tragarse
     como lista vacía. Devolver [] significa 'la fuente no tiene competiciones en la
     ventana'; una captura degradada disfrazada de n=0 es invisible durante un mes."

Aquí importa igual: `scrape_calendar.py` conserva el JSON anterior cuando una fuente
falla, así que la web nunca pierde datos — pero justo por eso el fallo no se nota. Sin
un resumen, Madrid podía llevar semanas bloqueada por Cloudflare en CI y el calendario
parecía correcto porque seguía sirviendo las competiciones viejas.

Cada pasada deja `public/data/scrape_status.json`, que sirve de dos cosas:
  1. saber qué fuente aportó qué y cuál falló, con el error concreto;
  2. comparar contra la pasada anterior y avisar de REGRESIONES (una fuente que
     traía competiciones y ahora trae 0 o casca).
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone


class Resumen:
    """Acumula el resultado por fuente. Una fuente = una federación o bloque."""

    def __init__(self) -> None:
        self.fuentes: dict[str, dict] = {}

    def registrar(self, fuente: str, n: int) -> None:
        self.fuentes[fuente] = {"ok": True, "n": n}

    def fallo(self, fuente: str, exc: BaseException) -> None:
        self.fuentes[fuente] = {"ok": False, "n": 0, "error": f"{type(exc).__name__}: {exc}"}

    def aislar(self, fuente: str, fn):
        """Ejecuta `fn()` aislando su error: lo apunta y devuelve [] para que el resto
        de fuentes siga. El error queda registrado, que es lo que lo hace visible."""
        try:
            out = fn()
            self.registrar(fuente, len(out))
            return out
        except Exception as exc:
            self.fallo(fuente, exc)
            return []

    # --- consulta ---
    @property
    def fallidas(self) -> list[str]:
        return sorted(k for k, v in self.fuentes.items() if not v["ok"])

    @property
    def vacias(self) -> list[str]:
        return sorted(k for k, v in self.fuentes.items() if v["ok"] and v["n"] == 0)

    def total(self) -> int:
        return sum(v["n"] for v in self.fuentes.values())

    def como_dict(self) -> dict:
        return {
            "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "total": self.total(),
            "fuentes": dict(sorted(self.fuentes.items())),
        }

    def tabla(self) -> str:
        """Tabla legible para el log del workflow."""
        if not self.fuentes:
            return "(sin fuentes)"
        ancho = max(len(k) for k in self.fuentes)
        filas = []
        for k, v in sorted(self.fuentes.items()):
            if v["ok"]:
                filas.append(f"  {k.ljust(ancho)}  {v['n']:>4}")
            else:
                filas.append(f"  {k.ljust(ancho)}  FALLO  {v.get('error', '')}")
        return "\n".join(filas)


def cargar(path: str) -> dict:
    """Lee el status de la pasada anterior. {} si no existe o está corrupto."""
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def guardar(path: str, resumen: Resumen) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(resumen.como_dict(), fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def regresiones(actual: Resumen, previo: dict) -> list[str]:
    """Fuentes que antes aportaban competiciones y ahora no. Es la señal que evita
    que una captura degradada pase desapercibida."""
    antes = (previo or {}).get("fuentes", {})
    avisos: list[str] = []
    for fuente, prev in sorted(antes.items()):
        if not prev.get("ok") or prev.get("n", 0) <= 0:
            continue  # ya venía mal: no es una regresión nueva
        ahora = actual.fuentes.get(fuente)
        if ahora is None:
            avisos.append(f"{fuente}: ya no se consulta (antes {prev['n']})")
        elif not ahora["ok"]:
            avisos.append(f"{fuente}: falla ({ahora.get('error', '')}) — antes {prev['n']}")
        elif ahora["n"] == 0:
            avisos.append(f"{fuente}: 0 competiciones — antes {prev['n']}")
    return avisos
