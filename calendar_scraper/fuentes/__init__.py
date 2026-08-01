"""Fuentes federativas adicionales a la RFEA.

Cada módulo expone `listar(http, desde, hasta) -> list[Competicion]`. El orquestador
(`scraper.listar_competiciones`) las combina con la RFEA y deduplica.

POLÍTICA DE ERRORES (adaptada de `engine/adapters/base.py` del motor
fantasy-atletismo-engine): un fallo —HTTP, navegador, página degradada, dependencia
que falta— debe **PROPAGARSE**, nunca tragarse devolviendo lista vacía. El orquestador
lo aísla por fuente y lo apunta en el resumen (`calendar_scraper/resumen.py`).

    Devolver [] significa "esta federación no tiene competiciones en la ventana".
    Una captura degradada disfrazada de n=0 es invisible durante semanas.

En lanedata la regla pesa aún más porque `scrape_calendar.py` conserva el JSON
anterior cuando una fuente cae: el calendario sigue mostrando las competiciones
viejas y todo parece correcto. Sin el error registrado, Madrid podía llevar un mes
bloqueada por Cloudflare en CI sin que nadie lo notase.

Estado:
  - galicia:  ✅ HTML estático (atletismo.gal).
  - larioja:  ✅ HTML estático (fratletismo.com).
  - madrid:   ✅ Excel de temporada (tras Cloudflare; necesita curl_cffi).
  El resto de federaciones llega vía los adapters del motor (`fuentes_engine.py`) y
  las SPA vía Playwright (`fuentes_spa/`).
"""

from calendar_scraper.fuentes import galicia, larioja, madrid

FUENTES = {
    "galicia": galicia.listar,
    "larioja": larioja.listar,
    "madrid": madrid.listar,
}

__all__ = ["FUENTES", "galicia", "larioja", "madrid"]
