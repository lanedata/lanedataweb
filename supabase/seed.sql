-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Seed data (3 example articles)
-- Run AFTER schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO articles (title, slug, excerpt, html_content, category, published_at, status)
VALUES

-- Article 1 — most recent, will appear as featured
(
  'Mohamed Katir y la evolución del 5000m español: un análisis generacional',
  'katir-5000m-evolucion-espanol',
  'Desde Fermín Cacho hasta Katir: cómo ha evolucionado el medio fondo español en los últimos treinta años y qué tienen en común los mejores atletas de cada era.',
  '<h2>Un linaje de campeones</h2>
<p>El atletismo español tiene una tradición de medio fondo que pocos países europeos pueden igualar. Desde los años noventa, cuando Fermín Cacho ganó el oro olímpico en Barcelona, la cantera española ha producido de forma casi ininterrumpida atletas capaces de competir en la élite mundial.</p>
<p>Mohamed Katir, con su 12:50.79 en Florencia en 2021, rompió el récord de España del 5000m y se convirtió en el símbolo de una nueva generación. Pero para entender su impacto, hay que mirar atrás.</p>

<h2>Los datos no mienten</h2>
<table>
  <thead>
    <tr><th>Atleta</th><th>Año</th><th>Marca (5000m)</th><th>Contexto</th></tr>
  </thead>
  <tbody>
    <tr><td>Martín Fiz</td><td>1993</td><td>13:22.14</td><td>Pre-kenianos en España</td></tr>
    <tr><td>Jesús España</td><td>2007</td><td>13:07.58</td><td>Era Bekele</td></tr>
    <tr><td>Adel Mechaal</td><td>2017</td><td>13:05.48</td><td>Era Farah</td></tr>
    <tr><td>Mohamed Katir</td><td>2021</td><td>12:50.79</td><td>Era Cheptegei</td></tr>
  </tbody>
</table>

<h2>¿Qué ha cambiado?</h2>
<p>La mejora de 32 segundos en el registro nacional entre 1993 y 2021 no es solo fruto del talento individual. Hay tres factores estructurales que lo explican:</p>
<ul>
  <li><strong>Entrenamiento en altitud:</strong> Font Romeu se convirtió en base habitual de los fondistas españoles a partir de los 2000.</li>
  <li><strong>Internacionalización de la competición:</strong> el circuito de la Diamond League exige ritmos que antes eran impensables.</li>
  <li><strong>Calzado tecnológico:</strong> las super-zapatillas han bajado entre 1 y 2% los tiempos en pista desde 2019.</li>
</ul>

<h2>Conclusión</h2>
<p>Katir no es una anomalía; es el resultado lógico de una tradición consolidada y de las condiciones actuales del atletismo mundial. La pregunta es si España puede producir un sucesor antes de que esta ventana de forma se cierre.</p>',
  'medio-fondo',
  '2024-11-15 10:00:00+00',
  'published'
),

-- Article 2
(
  'Pista cubierta 2024: balance de la temporada española',
  'pista-cubierta-2024-balance-espanol',
  'Repaso estadístico a los mejores resultados de los atletas españoles en la temporada indoor 2024: récords, debuts prometedores y los datos que definen el nivel actual.',
  '<h2>Una temporada de transición</h2>
<p>La pista cubierta de 2024 ha dejado un saldo mixto para el atletismo español. Por un lado, varios jóvenes han confirmado su proyección con marcas personales significativas. Por otro, los grandes nombres siguen sin alcanzar el nivel de 2021-2022.</p>

<h2>Mejores marcas del año</h2>
<table>
  <thead>
    <tr><th>Prueba</th><th>Atleta</th><th>Marca</th><th>Competición</th></tr>
  </thead>
  <tbody>
    <tr><td>60m</td><td>Óscar Husillos</td><td>6.62</td><td>Madrid Indoor</td></tr>
    <tr><td>800m</td><td>Mariano García</td><td>1:46.11</td><td>Europeo Indoor</td></tr>
    <tr><td>1500m</td><td>Mohamed Katir</td><td>3:33.89</td><td>Lievin</td></tr>
    <tr><td>60m vallas</td><td>Asier Martínez</td><td>7.54</td><td>Berlín</td></tr>
    <tr><td>Pértiga</td><td>Adrián Vallés</td><td>5.72m</td><td>Sabadell</td></tr>
  </tbody>
</table>

<h2>El dato más significativo</h2>
<blockquote>
  España sitúa 8 atletas entre los 20 mejores europeos del 800m indoor en 2024. Ese ratio de densidad es el mejor desde 2008.
</blockquote>

<p>La profundidad en medio fondo es el signo más esperanzador de cara al verano. Si la forma se mantiene, los Juegos de París podrían deparar sorpresas.</p>',
  'pista-cubierta',
  '2024-03-04 09:00:00+00',
  'published'
),

-- Article 3
(
  'Asier Martínez: la nueva generación de vallas en España',
  'asier-martinez-vallas-nueva-generacion',
  'A sus 23 años, Asier Martínez ya es el mejor vallista español de la historia en 60m. Un repaso a su progresión, su técnica y lo que nos dicen los números sobre su techo.',
  '<h2>Del Campeonato de España junior al podio europeo</h2>
<p>Hay talentos que tardan años en explotar. Asier Martínez no es uno de ellos. Su progresión desde 2019 hasta 2024 es una de las más verticales de la historia del atletismo español en eventos de velocidad.</p>

<h2>Progresión anual</h2>
<table>
  <thead>
    <tr><th>Año</th><th>60m vallas</th><th>110m vallas</th><th>Hito</th></tr>
  </thead>
  <tbody>
    <tr><td>2019</td><td>7.81</td><td>13.72</td><td>Campeón España sub-23</td></tr>
    <tr><td>2020</td><td>7.74</td><td>13.61</td><td>COVID — temporada limitada</td></tr>
    <tr><td>2021</td><td>7.68</td><td>13.46</td><td>Finalista Europeo U23</td></tr>
    <tr><td>2022</td><td>7.62</td><td>13.22</td><td>3º Europeo absoluto en pista</td></tr>
    <tr><td>2023</td><td>7.58</td><td>13.12</td><td>Semifinalista Mundial Budapest</td></tr>
    <tr><td>2024</td><td>7.54</td><td>13.08</td><td>Récord de España</td></tr>
  </tbody>
</table>

<h2>¿Cuál es su techo?</h2>
<p>Los modelos de proyección basados en curvas de maduración de vallistas europeos sitúan su potencial entre 12.90 y 13.00 en 110m vallas. Sería el primer español en bajar de 13 segundos.</p>

<p>El factor limitante no es físico sino competitivo: la densidad en 110m vallas es brutal. Pero los datos de 2024 sugieren que Asier tiene margen. Y eso, en atletismo, es lo que más importa.</p>',
  'vallas',
  '2024-02-10 08:00:00+00',
  'published'
);
