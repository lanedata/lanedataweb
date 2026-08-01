// Plantillas editoriales — fragmentos HTML que se insertan en el formulario
// de nuevo artículo. Usan las clases .ld-* definidas en globals.css, por lo
// que se ven "de periódico" sin escribir CSS a mano.

export interface Plantilla {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  html: string
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'cronica',
    nombre: 'Crónica',
    descripcion: 'Cobertura de una competición: ficha, relato y resultados.',
    categoria: 'general',
    html: `<p class="ld-entradilla">Entradilla: una o dos frases con lo esencial — qué ha pasado, quién y por qué importa. Es lo primero que se lee.</p>

<dl class="ld-ficha">
  <dt>Competición</dt><dd>Nombre de la competición</dd>
  <dt>Lugar</dt><dd>Ciudad · Instalación</dd>
  <dt>Fecha</dt><dd>Sábado, 00 de mes de 2026</dd>
</dl>

<h2>Lo que pasó</h2>
<p>Relato principal de la jornada. Contexto de la prueba, cómo se desarrolló, momentos clave.</p>

<div class="ld-datos">
  <div class="ld-dato"><div class="ld-dato-cifra">00.00</div><div class="ld-dato-label">Marca ganadora</div></div>
  <div class="ld-dato"><div class="ld-dato-cifra">+0.0</div><div class="ld-dato-label">Viento</div></div>
  <div class="ld-dato"><div class="ld-dato-cifra">3º</div><div class="ld-dato-label">Ranking español 2026</div></div>
</div>

<blockquote class="ld-cita">
  <p>«Una declaración o el titular de la jornada, con lo importante <mark>subrayado en mint</mark>.»</p>
  <cite>Nombre — contexto</cite>
</blockquote>

<h2>Resultados destacados</h2>
<table>
  <thead><tr><th>Puesto</th><th>Atleta</th><th>Club</th><th>Marca</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Nombre Apellido</td><td>Club</td><td><strong>00.00</strong></td></tr>
    <tr><td>2</td><td>Nombre Apellido</td><td>Club</td><td>00.00</td></tr>
    <tr><td>3</td><td>Nombre Apellido</td><td>Club</td><td>00.00</td></tr>
  </tbody>
</table>

<h2>Lo que viene</h2>
<p>Qué significa este resultado de cara a los próximos objetivos: mínimas, campeonatos, rankings.</p>

<p class="ld-firma">lanedata</p>`,
  },
  {
    id: 'analisis',
    nombre: 'Análisis',
    descripcion: 'Pieza de datos en profundidad: claves, gráficos y metodología.',
    categoria: 'analisis',
    html: `<p class="ld-entradilla">Entradilla: la tesis del análisis en una o dos frases. Qué hemos encontrado en los datos y por qué cambia la conversación.</p>

<div class="ld-claves">
  <div class="ld-claves-titulo">Las claves</div>
  <ul>
    <li>Primera conclusión del análisis, la más potente.</li>
    <li>Segunda conclusión o dato de contexto.</li>
    <li>Tercera: qué implica de cara al futuro.</li>
  </ul>
</div>

<h2>El punto de partida</h2>
<p>Contexto: qué pregunta nos hicimos y qué datos hemos usado para responderla.</p>

<h2>Lo que dicen los datos</h2>
<p>Desarrollo del análisis. Aquí van los gráficos:</p>

<figure>
  <img src="URL_DEL_GRAFICO" alt="Descripción del gráfico" />
  <figcaption>Título del gráfico · Fuente: RFEA / World Athletics · lanedata</figcaption>
</figure>

<div class="ld-datos">
  <div class="ld-dato"><div class="ld-dato-cifra">+00%</div><div class="ld-dato-label">Dato clave 1</div></div>
  <div class="ld-dato"><div class="ld-dato-cifra">00</div><div class="ld-dato-label">Dato clave 2</div></div>
  <div class="ld-dato"><div class="ld-dato-cifra">2009</div><div class="ld-dato-label">Desde cuándo</div></div>
</div>

<h2>La comparación histórica</h2>
<table>
  <thead><tr><th>Año</th><th>Atleta</th><th>Marca</th><th>Contexto</th></tr></thead>
  <tbody>
    <tr><td>2026</td><td>Nombre</td><td><strong>00.00</strong></td><td>—</td></tr>
    <tr><td>2020</td><td>Nombre</td><td>00.00</td><td>—</td></tr>
  </tbody>
</table>

<h2>Conclusión</h2>
<p>Cierre: qué hemos aprendido y qué habrá que vigilar.</p>

<p class="ld-nota"><strong>Metodología</strong> · Qué datos se han usado, de dónde salen (RFEA, World Athletics…), con qué fecha de corte y qué criterios se han aplicado.</p>

<p class="ld-firma">lanedata</p>`,
  },
  {
    id: 'breve',
    nombre: 'Breve',
    descripcion: 'Noticia corta: un hecho, su dato y su contexto. 3 párrafos.',
    categoria: 'general',
    html: `<p class="ld-entradilla">El hecho, directo: quién ha hecho qué, dónde y con qué marca.</p>

<p>Un párrafo de contexto: qué supone esa marca (ranking, mínima, progresión personal) y en qué circunstancias se ha logrado.</p>

<div class="ld-datos">
  <div class="ld-dato"><div class="ld-dato-cifra">00.00</div><div class="ld-dato-label">La marca</div></div>
  <div class="ld-dato"><div class="ld-dato-cifra">0º</div><div class="ld-dato-label">Ranking español</div></div>
</div>

<p>Cierre: qué viene ahora para el/la atleta o qué habrá que vigilar.</p>

<p class="ld-firma">lanedata</p>`,
  },
  {
    id: 'el-dato',
    nombre: 'El Dato',
    descripcion: 'Una sola cifra reveladora, explicada a fondo.',
    categoria: 'analisis',
    html: `<div class="ld-datos">
  <div class="ld-dato"><div class="ld-dato-cifra">00.00</div><div class="ld-dato-label">El dato que lo cuenta todo</div></div>
</div>

<p class="ld-entradilla">Qué significa esta cifra y por qué merece un artículo entero.</p>

<h2>De dónde sale</h2>
<p>Explicación del dato: cómo se calcula, qué periodo cubre, contra qué se compara.</p>

<h2>Por qué importa</h2>
<p>El contexto que convierte el número en noticia: récords, tendencias, comparaciones con otras épocas o países.</p>

<blockquote class="ld-cita">
  <p>«La frase-resumen que irá también al <mark>post de Instagram</mark>.»</p>
  <cite>lanedata · El Dato</cite>
</blockquote>

<p class="ld-nota"><strong>Metodología</strong> · Fuente de los datos y fecha de corte.</p>

<p class="ld-firma">lanedata</p>`,
  },
]
