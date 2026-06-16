// World Athletics scoring tables (2025 edition) coefficients.
// points = a·x² + b·x + c   (x = time in seconds for track/road, metres for field)
// Source: official WA scoring tables, parsed via jchen1/iaaf-scoring-tables.

export type EventKind = 'track' | 'field'

export interface ScoringEvent {
  id: string
  label: string
  kind: EventKind
  /** [a, b, c] quadratic coefficients, or null if not contested for that gender */
  men: [number, number, number] | null
  women: [number, number, number] | null
}

export const SCORING_EVENTS: ScoringEvent[] = [
  {
    id: "60m",
    label: "60 m",
    kind: "track",
    men: [68.62032200155772, -1468.376079820242, 7854.923996115336],
    women: [24.91177544269476, -697.4127036580539, 4880.84062414919],
  },
  {
    id: "100m",
    label: "100 m",
    kind: "track",
    men: [24.642211664166098, -837.7135408530303, 7119.3125116789015],
    women: [9.927426450685289, -436.6751262119069, 4802.020943877404],
  },
  {
    id: "200m",
    label: "200 m",
    kind: "track",
    men: [5.083329625804254, -360.8260380705033, 6403.154333221377],
    women: [2.2422237149162925, -204.01464451534775, 4640.727341804304],
  },
  {
    id: "400m",
    label: "400 m",
    kind: "track",
    men: [1.0210130425695638, -161.3092238081408, 6371.289298935095],
    women: [0.3350059758445596, -73.6974469594461, 4053.1545244171575],
  },
  {
    id: "800m",
    label: "800 m",
    kind: "track",
    men: [0.1980049254166545, -72.07136038821409, 6558.28160300618],
    women: [0.06879989341997295, -34.399261916380055, 4299.822125108796],
  },
  {
    id: "1500m",
    label: "1500 m",
    kind: "track",
    men: [0.04065992529984008, -31.307736299477256, 6026.662254345021],
    women: [0.01339999627048627, -14.471861176560651, 3907.3655835949467],
  },
  {
    id: "mile",
    label: "Milla",
    kind: "track",
    men: [0.035099677603458446, -29.132456259137143, 6044.924547011615],
    women: [0.011649998601839462, -13.513881163102496, 3918.992004961794],
  },
  {
    id: "3000m",
    label: "3000 m",
    kind: "track",
    men: [0.008150049932713843, -13.691983542337312, 5750.59246378555],
    women: [0.0025389974609562604, -6.09357042856243, 3656.127933666052],
  },
  {
    id: "5000m",
    label: "5000 m",
    kind: "track",
    men: [0.002777997945427213, -8.000608112196687, 5760.418712362531],
    women: [0.0008079992470730324, -3.3935897885437782, 3563.2616780022654],
  },
  {
    id: "10000m",
    label: "10.000 m",
    kind: "track",
    men: [0.0005239994429364625, -3.3011925260043427, 5199.371486475808],
    women: [0.0001712000450308747, -1.5407985033832432, 3466.7925173026015],
  },
  {
    id: "60mH",
    label: "60 m vallas",
    kind: "track",
    men: [23.916231718984818, -698.1937268964539, 5095.479315056291],
    women: [11.16828188896136, -406.39148481091615, 3696.9522386075114],
  },
  {
    id: "highH",
    label: "Vallas altas",
    kind: "track",
    men: [7.1470227474935655, -375.8846820439139, 4920.401710892969],
    women: [3.982296326194273, -238.8619577729478, 3581.9054393060505],
  },
  {
    id: "400mH",
    label: "400 m vallas",
    kind: "track",
    men: [0.5459888468067362, -104.2787780128183, 4979.068748674414],
    women: [0.20856495718486912, -54.2249062108549, 3524.488878249118],
  },
  {
    id: "3000mSC",
    label: "3000 m obst.",
    kind: "track",
    men: [0.0043159973458793965, -8.804593368752649, 4490.321079731511],
    women: [0.0013229981350130343, -3.99544233512367, 3016.5498521791887],
  },
  {
    id: "road5k",
    label: "5 km ruta",
    kind: "track",
    men: [0.0027791125913787518, -8.002589936962636, 5760.829724426498],
    women: [0.0008086109772535849, -3.394979088225057, 3563.519547606804],
  },
  {
    id: "road10k",
    label: "10 km ruta",
    kind: "track",
    men: [0.0005243835511893474, -3.302659028227424, 5200.274036400777],
    women: [0.00017119892280619345, -1.540623663798911, 3466.0215817096905],
  },
  {
    id: "roadHM",
    label: "Media maratón",
    kind: "track",
    men: [9.469710951061014e-05, -1.3521892901331114, 4827.020676429092],
    women: [2.5960366893742386e-05, -0.5606107770831628, 3026.587224518895],
  },
  {
    id: "marathon",
    label: "Maratón",
    kind: "track",
    men: [2.0101186255287035e-05, -0.6150659606552438, 4705.042285787989],
    women: [5.389966906974475e-06, -0.25224574933865895, 2951.2162982728405],
  },
  {
    id: "HJ",
    label: "Salto de altura",
    kind: "field",
    men: [32.14570816360356, 745.3746826150164, -705.259733494051],
    women: [39.557908744493034, 831.3655724464043, -601.5063267494843],
  },
  {
    id: "PV",
    label: "Salto con pértiga",
    kind: "field",
    men: [3.0457199208785823, 239.612026696057, -280.5412229935755],
    women: [3.9325797501069246, 275.48968329946365, -205.1216924619548],
  },
  {
    id: "LJ",
    label: "Salto de longitud",
    kind: "field",
    men: [1.931092872960562, 186.73134733641928, -479.70640445759636],
    women: [1.958114032649064, 193.69548254413166, -233.98988652729167],
  },
  {
    id: "TJ",
    label: "Triple salto",
    kind: "field",
    men: [0.4603666024030417, 90.96978768056579, -514.9946082626993],
    women: [0.4296645887350792, 90.3430418780863, -231.6675825305283],
  },
  {
    id: "SP",
    label: "Peso",
    kind: "field",
    men: [0.04234614355526389, 57.99966265925241, -55.823610246186945],
    women: [0.046214387641356325, 60.75503111383068, -25.931941888942674],
  },
  {
    id: "DT",
    label: "Disco",
    kind: "field",
    men: [0.00400631290161968, 17.8920605010303, -27.18777464602681],
    women: [0.0040284238096806035, 17.94169538353276, -19.210748193687323],
  },
  {
    id: "HT",
    label: "Martillo",
    kind: "field",
    men: [0.0028444950947790204, 15.081627308136717, -21.68901198504136],
    women: [0.0030967239667614166, 15.730166876520684, -22.699498543297523],
  },
  {
    id: "JT",
    label: "Jabalina",
    kind: "field",
    men: [0.0024031524897170087, 13.841186813175682, -21.05825095349428],
    women: [0.004072274456476066, 18.042616052881158, -18.842904339435336],
  },
]

// ─── Calculation helpers ──────────────────────────────────────────────────────

export type Gender = 'men' | 'women'

/**
 * Parse a performance string into the numeric value the formula expects:
 *  - track/road  → seconds (accepts "h:mm:ss.ss", "mm:ss.ss" or "ss.ss")
 *  - field       → metres  (accepts "8.95" or "8,95")
 * Returns null if it can't be parsed.
 */
export function parsePerformance(raw: string, kind: EventKind): number | null {
  const s = raw.trim().replace(',', '.')
  if (!s) return null

  if (kind === 'field') {
    const v = Number(s)
    return Number.isFinite(v) && v > 0 ? v : null
  }

  // track / road
  if (s.includes(':')) {
    const parts = s.split(':').map(p => p.trim())
    if (parts.some(p => p === '' || isNaN(Number(p)))) return null
    let seconds = 0
    for (const p of parts) seconds = seconds * 60 + Number(p)
    return seconds > 0 ? seconds : null
  }
  const v = Number(s)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * Compute World Athletics points for a performance.
 * Clamps to 0 outside the valid (monotonic) branch of the parabola.
 */
export function calculatePoints(
  coeffs: [number, number, number],
  x: number,
  kind: EventKind,
): number {
  const [a, b, c] = coeffs
  const vertex = -b / (2 * a)

  // Beyond the vertex the parabola turns the wrong way → no score.
  if (kind === 'track' && x >= vertex) return 0
  if (kind === 'field' && x <= vertex) return 0

  const p = a * x * x + b * x + c
  return p > 0 ? Math.round(p) : 0
}

/**
 * Inverse: the performance needed to score `points` (the realistic branch).
 *  - track → seconds, field → metres. Null if unreachable.
 */
export function performanceForPoints(
  coeffs: [number, number, number],
  points: number,
  kind: EventKind,
): number | null {
  const [a, b, c] = coeffs
  const disc = b * b - 4 * a * (c - points)
  if (disc < 0) return null
  const sqrt = Math.sqrt(disc)
  const r1 = (-b + sqrt) / (2 * a)
  const r2 = (-b - sqrt) / (2 * a)
  // track: smaller (faster) root; field: larger root
  const cand = kind === 'track' ? Math.min(r1, r2) : Math.max(r1, r2)
  return cand > 0 ? cand : null
}

/** Format seconds back into a readable time ("mm:ss.ss" / "h:mm:ss"). */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds < 60) return totalSeconds.toFixed(2)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(Math.round(s)).padStart(2, '0')}`
  }
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

export function genderHasEvent(e: ScoringEvent, g: Gender): boolean {
  return (g === 'men' ? e.men : e.women) !== null
}
