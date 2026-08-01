// Tablas de puntuación de World Athletics (edición 2025).
//   puntos = a·x² + b·x + c   (x = segundos en carrera/ruta, metros en concursos,
//                              puntos de la tabla de combinadas en `score`)
//
// IMPORTANTE: World Athletics publica DOS tablas distintas — aire libre (AL) y
// pista cubierta (PC, "short track"). Una misma marca NO vale los mismos puntos
// en las dos: 20.00 en 200 m son 1220 pts al aire libre y 1290 bajo techo. Por eso
// cada prueba guarda sus coeficientes por entorno; `null` = no se disputa ahí.
//
// Fuente: tablas oficiales de World Athletics 2025, vía jchen1/iaaf-scoring-tables.
// ARCHIVO GENERADO — no editar a mano.

export type EventKind = 'track' | 'field' | 'score'
export type Gender = 'men' | 'women'
/** AL = aire libre · PC = pista cubierta */
export type Environment = 'outdoor' | 'indoor'

export type Coeffs = [number, number, number]

export type EventGroup =
  | 'velocidad' | 'medio' | 'fondo' | 'vallas' | 'saltos'
  | 'lanzamientos' | 'ruta' | 'marcha' | 'relevos' | 'combinadas'

export interface ScoringEvent {
  id: string
  /** Etiqueta común, o una por género cuando la prueba cambia (110/100 m vallas). */
  label: string | { men: string; women: string }
  kind: EventKind
  group: EventGroup
  outdoor: { men: Coeffs | null; women: Coeffs | null } | null
  indoor: { men: Coeffs | null; women: Coeffs | null } | null
}

export const GROUP_LABEL: Record<EventGroup, string> = {
  velocidad: 'Velocidad',
  medio: 'Medio fondo',
  fondo: 'Fondo y obstáculos',
  vallas: 'Vallas',
  saltos: 'Saltos',
  lanzamientos: 'Lanzamientos',
  ruta: 'Ruta',
  marcha: 'Marcha',
  relevos: 'Relevos',
  combinadas: 'Pruebas combinadas',
}

export const ENV_LABEL: Record<Environment, string> = {
  outdoor: 'Aire libre',
  indoor: 'Pista cubierta',
}

export const ENV_SHORT: Record<Environment, string> = {
  outdoor: 'AL',
  indoor: 'PC',
}

export const SCORING_EVENTS: ScoringEvent[] = [
  {
    id: "50m",
    label: "50 m",
    kind: "track",
    group: "velocidad",
    outdoor: null,
    indoor: {
      men: [95.8223538631461, -1763.0165326438253, 8108.971505886532],
      women: [33.046243452318066, -799.582329328243, 4836.41371290059],
    },
  },
  {
    id: "55m",
    label: "55 m",
    kind: "track",
    group: "velocidad",
    outdoor: null,
    indoor: {
      men: [78.92276088352908, -1578.3239369645096, 7890.637076559913],
      women: [27.692226983642247, -728.2024319056978, 4786.948624086939],
    },
  },
  {
    id: "60m",
    label: "60 m",
    kind: "track",
    group: "velocidad",
    outdoor: null,
    indoor: {
      men: [68.62032200374922, -1468.3760798649646, 7854.923996344968],
      women: [24.911775442786247, -697.4127036607207, 4880.840624168194],
    },
  },
  {
    id: "100m",
    label: "100 m",
    kind: "track",
    group: "velocidad",
    outdoor: {
      men: [24.64221166325269, -837.713540824062, 7119.312511430384],
      women: [9.927426450734501, -436.6751262144368, 4802.02094390564],
    },
    indoor: null,
  },
  {
    id: "200m",
    label: "200 m",
    kind: "track",
    group: "velocidad",
    outdoor: {
      men: [5.083329625784978, -360.82603806832657, 6403.15433315925],
      women: [2.242223714930929, -204.01464451636645, 4640.727341821261],
    },
    indoor: {
      men: [5.042898433490022, -363.0051678367285, 6532.672629075096],
      women: [1.961747630981425, -186.35304547674687, 4425.540361970994],
    },
  },
  {
    id: "300m",
    label: "300 m",
    kind: "track",
    group: "velocidad",
    outdoor: {
      men: [1.8296570247483341, -209.3043038216593, 5985.805789933642],
      women: [0.6999743364037813, -107.7903202161925, 4149.692833384804],
    },
    indoor: {
      men: [1.8029639297236177, -209.12735993017225, 6064.198387076469],
      women: [0.6595068053486436, -104.19485102746413, 4115.419602845907],
    },
  },
  {
    id: "400m",
    label: "400 m",
    kind: "track",
    group: "velocidad",
    outdoor: {
      men: [1.021013042536422, -161.30922380421435, 6371.289298817034],
      women: [0.3350059758432636, -73.69744695936211, 4053.1545244194895],
    },
    indoor: {
      men: [0.981028501048644, -158.13093545048804, 6372.245446897751],
      women: [0.32239778088467247, -72.21408569993723, 4043.8163995563436],
    },
  },
  {
    id: "500m",
    label: "500 m",
    kind: "track",
    group: "medio",
    outdoor: null,
    indoor: {
      men: [0.564971320595847, -119.76970949415848, 6347.557018654857],
      women: [0.1713983583612481, -51.58928019811176, 3881.9738918456796],
    },
  },
  {
    id: "600m",
    label: "600 m",
    kind: "track",
    group: "medio",
    outdoor: {
      men: [0.38569922829712194, -99.8924086461364, 6467.788691404725],
      women: [0.12900248173149773, -46.43936729467039, 4179.413953717376],
    },
    indoor: {
      men: [0.3899861152683925, -102.17335025588497, 6692.146447620503],
      women: [0.10630096103021013, -40.46755851736269, 3851.391170393396],
    },
  },
  {
    id: "800m",
    label: "800 m",
    kind: "track",
    group: "medio",
    outdoor: {
      men: [0.19800492542232068, -72.0713603902366, 6558.281603167961],
      women: [0.06879989341981581, -34.39926191639929, 4299.822125115345],
    },
    indoor: {
      men: [0.19739256107327782, -72.63927638543898, 6682.687960210454],
      women: [0.05719995663880752, -30.20100101535798, 3986.4574604244717],
    },
  },
  {
    id: "1000m",
    label: "1000 m",
    kind: "track",
    group: "medio",
    outdoor: {
      men: [0.11229987246022344, -53.34129687669109, 6334.142779343303],
      women: [0.038199708533178396, -25.211487793700158, 4159.840558568375],
    },
    indoor: {
      men: [0.11389778654494565, -54.6700297532988, 6560.289996684965],
      women: [0.03473027366930597, -23.64396541014399, 4024.1370966560467],
    },
  },
  {
    id: "1500m",
    label: "1500 m",
    kind: "track",
    group: "medio",
    outdoor: {
      men: [0.04065992530139898, -31.30773630045197, 6026.662254483445],
      women: [0.013399996270519767, -14.471861176590986, 3907.365583603138],
    },
    indoor: {
      men: [0.0419999885061072, -32.42357570377672, 6257.669581103279],
      women: [0.013649954143565698, -14.741826462439763, 3980.2593316195653],
    },
  },
  {
    id: "mile",
    label: "Milla",
    kind: "track",
    group: "medio",
    outdoor: {
      men: [0.03509967760333725, -29.13245625908459, 6044.924547018066],
      women: [0.011649998601739528, -13.513881163027177, 3918.9920049483912],
    },
    indoor: {
      men: [0.03690000741682217, -30.62665772732489, 6354.9580313609695],
      women: [0.01154001518680862, -13.513232953013823, 3955.963356108172],
    },
  },
  {
    id: "2000m",
    label: "2000 m",
    kind: "track",
    group: "medio",
    outdoor: {
      men: [0.021810031812435043, -23.031167821389644, 6080.168871815131],
      women: [0.00676601045843802, -10.148946030707283, 3805.828825057825],
    },
    indoor: {
      men: [0.02260000352692806, -23.865373073529522, 6300.397643732492],
      women: [0.00684999962488725, -10.305069946636188, 3875.710937572693],
    },
  },
  {
    id: "3000m",
    label: "3000 m",
    kind: "track",
    group: "fondo",
    outdoor: {
      men: [0.008150049932592551, -13.691983542149039, 5750.5924637135595],
      women: [0.0025389974609450073, -6.093570428540341, 3656.1279336545253],
    },
    indoor: {
      men: [0.008321919172429484, -13.980775520872381, 5871.902505596756],
      women: [0.002590000537151066, -6.2159738580858255, 3729.568335092309],
    },
  },
  {
    id: "5000m",
    label: "5000 m",
    kind: "track",
    group: "fondo",
    outdoor: {
      men: [0.002777997945523804, -8.000608112456284, 5760.4187125307635],
      women: [0.0008079992470754873, -3.3935897885512056, 3563.2616780069],
    },
    indoor: {
      men: [0.0029000031486289568, -8.351976844906277, 6013.400535677143],
      women: [0.000824999929652873, -3.4649913242074417, 3638.232291900418],
    },
  },
  {
    id: "10000m",
    label: "10.000 m",
    kind: "track",
    group: "fondo",
    outdoor: {
      men: [0.0005239994429333838, -3.301192525983125, 5199.371486441148],
      women: [0.0001712000450312433, -1.5407985033852971, 3466.7925173042713],
    },
    indoor: null,
  },
  {
    id: "2000mSC",
    label: "2000 m obstáculos",
    kind: "track",
    group: "fondo",
    outdoor: {
      men: [0.010229985822163494, -13.503484790804908, 4456.117711614248],
      women: [0.0036359877997089365, -6.7774537305097775, 3158.2797230999204],
    },
    indoor: null,
  },
  {
    id: "3000mSC",
    label: "3000 m obstáculos",
    kind: "track",
    group: "fondo",
    outdoor: {
      men: [0.004315997345843612, -8.80459336869599, 4490.3210797055035],
      women: [0.0013229981350142289, -3.995442335124215, 3016.5498521777968],
    },
    indoor: null,
  },
  {
    id: "50mH",
    label: "50 m vallas",
    kind: "track",
    group: "vallas",
    outdoor: null,
    indoor: {
      men: [34.21237722408587, -844.9430290440662, 5216.591321662196],
      women: [16.212665326108816, -495.9578685627244, 3792.8275322059126],
    },
  },
  {
    id: "55mH",
    label: "55 m vallas",
    kind: "track",
    group: "vallas",
    outdoor: null,
    indoor: {
      men: [30.08530770812403, -803.1373763692625, 5359.7723932211775],
      women: [13.19822154784739, -443.33954567754967, 3722.9474163911236],
    },
  },
  {
    id: "60mH",
    label: "60 m vallas",
    kind: "track",
    group: "vallas",
    outdoor: null,
    indoor: {
      men: [23.916231719069803, -698.1937268989063, 5095.479315072592],
      women: [11.168281888954857, -406.39148481061363, 3696.952238602986],
    },
  },
  {
    id: "highH",
    label: { men: "110 m vallas", women: "100 m vallas" },
    kind: "track",
    group: "vallas",
    outdoor: {
      men: [7.66520337173384, -395.4175676106783, 5099.521670026964],
      women: [3.9822963261901965, -238.86195777289905, 3581.9054393070446],
    },
    indoor: null,
  },
  {
    id: "400mH",
    label: "400 m vallas",
    kind: "track",
    group: "vallas",
    outdoor: {
      men: [0.5459888467997945, -104.2787780119808, 4979.068748652063],
      women: [0.2085649571855561, -54.22490621091702, 3524.4888782475405],
    },
    indoor: null,
  },
  {
    id: "HJ",
    label: "Salto de altura",
    kind: "field",
    group: "saltos",
    outdoor: {
      men: [32.14570816351881, 745.3746826137125, -705.259733493807],
      women: [39.55790874466063, 831.3655724455788, -601.5063267489153],
    },
    indoor: {
      men: [32.14570816351881, 745.3746826137125, -705.259733493807],
      women: [39.55790874466063, 831.3655724455788, -601.5063267489153],
    },
  },
  {
    id: "PV",
    label: "Salto con pértiga",
    kind: "field",
    group: "saltos",
    outdoor: {
      men: [3.0457199208770005, 239.6120266961539, -280.5412229935851],
      women: [3.9325797501111106, 275.48968329940647, -205.12169246192914],
    },
    indoor: {
      men: [3.0457199208770005, 239.6120266961539, -280.5412229935851],
      women: [3.9325797501111106, 275.48968329940647, -205.12169246192914],
    },
  },
  {
    id: "LJ",
    label: "Salto de longitud",
    kind: "field",
    group: "saltos",
    outdoor: {
      men: [1.9310928729517267, 186.7313473364905, -479.70640445762933],
      women: [1.9581140326600333, 193.69548254404774, -233.98988652719655],
    },
    indoor: {
      men: [1.9310928729517267, 186.7313473364905, -479.70640445762933],
      women: [1.9581140326600333, 193.69548254404774, -233.98988652719655],
    },
  },
  {
    id: "TJ",
    label: "Triple salto",
    kind: "field",
    group: "saltos",
    outdoor: {
      men: [0.46036660240627303, 90.96978768040492, -514.9946082618998],
      women: [0.42966458873748475, 90.34304187805309, -231.66758253037372],
    },
    indoor: {
      men: [0.46036660240627303, 90.96978768040492, -514.9946082618998],
      women: [0.42966458873748475, 90.34304187805309, -231.66758253037372],
    },
  },
  {
    id: "SP",
    label: "Peso",
    kind: "field",
    group: "lanzamientos",
    outdoor: {
      men: [0.04234614355492583, 57.999662659261105, -55.82361024620113],
      women: [0.04621438764093413, 60.7550311138431, -25.931941888987403],
    },
    indoor: {
      men: [0.04234614355492583, 57.999662659261105, -55.82361024620113],
      women: [0.04621438764093413, 60.7550311138431, -25.931941888987403],
    },
  },
  {
    id: "DT",
    label: "Disco",
    kind: "field",
    group: "lanzamientos",
    outdoor: {
      men: [0.004006312901562734, 17.892060501035658, -27.187774646095846],
      women: [0.004028423809681251, 17.94169538353338, -19.210748193693277],
    },
    indoor: null,
  },
  {
    id: "HT",
    label: "Martillo",
    kind: "field",
    group: "lanzamientos",
    outdoor: {
      men: [0.002844495094766396, 15.081627308138804, -21.6890119850822],
      women: [0.0030967239667731164, 15.73016687651871, -22.69949854327502],
    },
    indoor: null,
  },
  {
    id: "JT",
    label: "Jabalina",
    kind: "field",
    group: "lanzamientos",
    outdoor: {
      men: [0.002403152489651508, 13.84118681318245, -21.058250953650283],
      women: [0.004072274456499973, 18.042616052878714, -18.84290433941009],
    },
    indoor: null,
  },
  {
    id: "roadMile",
    label: "Milla en ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [0.03509967760333725, -29.13245625908459, 6044.924547018066],
      women: [0.011649998601739528, -13.513881163027177, 3918.9920049483912],
    },
    indoor: null,
  },
  {
    id: "road5k",
    label: "5 km ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [0.002779112591439883, -8.002589937143362, 5760.8297245556105],
      women: [0.0008086109772535619, -3.394979088224842, 3563.519547606092],
    },
    indoor: null,
  },
  {
    id: "road10k",
    label: "10 km ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [0.0005243835511794324, -3.3026590281768975, 5200.274036331834],
      women: [0.00017119892280596978, -1.5406236637974189, 3466.0215817066887],
    },
    indoor: null,
  },
  {
    id: "road15k",
    label: "15 km ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [0.00021619813225152125, -2.104692144511737, 5122.299985165732],
      women: [5.9501699566236786e-05, -0.8673501034976601, 3160.82022954841],
    },
    indoor: null,
  },
  {
    id: "road10M",
    label: "10 millas ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [0.00018524985210228163, -1.9447905029808312, 5104.302716208197],
      women: [5.01614585301018e-05, -0.7928929030448137, 3133.2910969990344],
    },
    indoor: null,
  },
  {
    id: "road20k",
    label: "20 km ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [0.00010849945387848022, -1.4544357630916567, 4874.178186111088],
      women: [2.956116792160488e-05, -0.6002903493063884, 3047.4915164018553],
    },
    indoor: null,
  },
  {
    id: "roadHM",
    label: "Media maratón",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [9.469710951093358e-05, -1.3521892901394998, 4827.020676452493],
      women: [2.596036689377866e-05, -0.5606107770835849, 3026.5872245201526],
    },
    indoor: null,
  },
  {
    id: "road25k",
    label: "25 km ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [6.380128595121604e-05, -1.1024131603115819, 4762.120081450012],
      women: [1.7820078937799425e-05, -0.4640160886376552, 3020.6229502422657],
    },
    indoor: null,
  },
  {
    id: "road30k",
    label: "30 km ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [4.1899103628949714e-05, -0.8882236041724341, 4707.383289601176],
      women: [1.1779975715341774e-05, -0.37600518895293583, 3000.4277898993337],
    },
    indoor: null,
  },
  {
    id: "marathon",
    label: "Maratón",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [2.0101186255385345e-05, -0.6150659606585059, 4705.042285813454],
      women: [5.38996690697695e-06, -0.252245749338698, 2951.21629827322],
    },
    indoor: null,
  },
  {
    id: "road100k",
    label: "100 km ruta",
    kind: "track",
    group: "ruta",
    outdoor: {
      men: [1.7649869023546702e-06, -0.1715553395203474, 4168.759475622331],
      women: [8.739977332156064e-07, -0.10697653743894875, 3273.457442282307],
    },
    indoor: null,
  },
  {
    id: "3000mW",
    label: "3000 m marcha (pista)",
    kind: "track",
    group: "marcha",
    outdoor: {
      men: [0.001317997884137732, -4.230761878841003, 3395.1770550888227],
      women: [0.000923000172445064, -3.4003232245204567, 3131.6890529677908],
    },
    indoor: null,
  },
  {
    id: "5000mW",
    label: "5000 m marcha (pista)",
    kind: "track",
    group: "marcha",
    outdoor: {
      men: [0.00046699956723219975, -2.521793538860156, 3404.415650267447],
      women: [0.0003246000429024288, -2.03848494178492, 3200.416166441777],
    },
    indoor: null,
  },
  {
    id: "10000mW",
    label: "10.000 m marcha (pista)",
    kind: "track",
    group: "marcha",
    outdoor: {
      men: [0.00011370001341692127, -1.2620689961651486, 3502.2382226440895],
      women: [7.849989817181428e-05, -1.0079383485719655, 3235.4805917008216],
    },
    indoor: null,
  },
  {
    id: "road10kW",
    label: "10 km marcha (ruta)",
    kind: "track",
    group: "marcha",
    outdoor: {
      men: [0.00011369880949884027, -1.261947433148807, 3501.599429276704],
      women: [7.850131933363552e-05, -1.007868632418828, 3234.987258340522],
    },
    indoor: null,
  },
  {
    id: "road20kW",
    label: "20 km marcha (ruta)",
    kind: "track",
    group: "marcha",
    outdoor: {
      men: [2.735041573861593e-05, -0.6235597178338412, 3554.1219906361134],
      women: [1.8699883727572232e-05, -0.49365864784175334, 3258.0265828880883],
    },
    indoor: null,
  },
  {
    id: "road35kW",
    label: "35 km marcha (ruta)",
    kind: "track",
    group: "marcha",
    outdoor: {
      men: [6.14006692927073e-06, -0.2799797053731816, 3191.6897468940224],
      women: [4.929913380667042e-06, -0.250830552043287, 3190.516585421175],
    },
    indoor: null,
  },
  {
    id: "road50kW",
    label: "50 km marcha (ruta)",
    kind: "track",
    group: "marcha",
    outdoor: {
      men: [2.123989730848507e-06, -0.15802293332526945, 2939.190279158719],
      women: [1.9900128027203906e-06, -0.1566514694011699, 3082.8568995283204],
    },
    indoor: null,
  },
  {
    id: "4x100m",
    label: "4 × 100 m",
    kind: "track",
    group: "relevos",
    outdoor: {
      men: [1.2360320754010565, -171.79529611023838, 5969.431205313917],
      women: [0.38950036063024834, -76.338057965978, 3740.3711316757613],
    },
    indoor: null,
  },
  {
    id: "4x200m",
    label: "4 × 200 m",
    kind: "track",
    group: "relevos",
    outdoor: {
      men: [0.29767755481406194, -85.72750621624053, 6172.130946475348],
      women: [0.07949854657148392, -33.706775329947696, 3572.8487462346093],
    },
    indoor: {
      men: [0.3119896689540697, -89.85075766578068, 6469.076515024837],
      women: [0.08259992174036773, -35.02153700830042, 3712.1957862377476],
    },
  },
  {
    id: "4x400m",
    label: "4 × 400 m",
    kind: "track",
    group: "relevos",
    outdoor: {
      men: [0.05050072203747109, -33.73384421308062, 5633.448990248617],
      women: [0.015620076884696014, -14.995086303345017, 3598.778820399413],
    },
    indoor: {
      men: [0.048900330304774815, -33.25166827857928, 5652.691308876756],
      women: [0.015500027841921804, -15.00387347843618, 3630.899149920476],
    },
  },
  {
    id: "4x400mix",
    label: "4 × 400 m mixto",
    kind: "track",
    group: "relevos",
    outdoor: {
      men: [0.027319971572321907, -21.855722774312536, 4371.091344791109],
      women: [0.027319971572321907, -21.855722774312536, 4371.091344791109],
    },
    indoor: {
      men: [0.026880251011678857, -21.7726879018241, 4408.906997824465],
      women: [0.026880251011678857, -21.7726879018241, 4408.906997824465],
    },
  },
  {
    id: "combined",
    label: { men: "Decatlón", women: "Heptatlón" },
    kind: "score",
    group: "combinadas",
    outdoor: {
      men: [9.772168523982123e-07, 0.13912964380113874, -48.95860256479752],
      women: [1.5806071811913876e-06, 0.1770408921206571, -43.84270064776868],
    },
    indoor: null,
  },
  {
    id: "combinedIn",
    label: { men: "Heptatlón (PC)", women: "Pentatlón (PC)" },
    kind: "score",
    group: "combinadas",
    outdoor: null,
    indoor: {
      men: [1.7511052939833916e-06, 0.18632999798128114, -46.18002211679023],
      women: [2.9452123778374294e-06, 0.24163567137421416, -42.436457227048116],
    },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Coeficientes de una prueba para un género y un entorno. `null` si no aplica. */
export function coeffsFor(
  e: ScoringEvent,
  gender: Gender,
  env: Environment,
): Coeffs | null {
  const block = env === 'indoor' ? e.indoor : e.outdoor
  return block ? block[gender] : null
}

/** Etiqueta de la prueba (algunas cambian según el género: 110/100 m vallas). */
export function eventLabel(e: ScoringEvent, gender: Gender): string {
  return typeof e.label === 'string' ? e.label : e.label[gender]
}

/** Pruebas disponibles para ese género en ese entorno, en el orden de la tabla. */
export function eventsFor(gender: Gender, env: Environment): ScoringEvent[] {
  return SCORING_EVENTS.filter(e => coeffsFor(e, gender, env) !== null)
}

/** Entornos (AL/PC) en los que se disputa la prueba para ese género. */
export function environmentsFor(e: ScoringEvent, gender: Gender): Environment[] {
  return (['outdoor', 'indoor'] as Environment[]).filter(
    env => coeffsFor(e, gender, env) !== null,
  )
}

/** ¿Esta prueba puntúa distinto en AL que en PC? */
export function envChangesScore(e: ScoringEvent, gender: Gender): boolean {
  const out = coeffsFor(e, gender, 'outdoor')
  const ind = coeffsFor(e, gender, 'indoor')
  if (!out || !ind) return false
  return out.some((v, i) => v !== ind[i])
}

/**
 * Convierte una marca escrita a lo que espera la fórmula:
 *  - track/ruta → segundos ("h:mm:ss.ss", "mm:ss.ss" o "ss.ss")
 *  - field      → metros  ("8.95" o "8,95")
 *  - score      → puntos de la tabla de combinadas ("8000")
 * Devuelve null si no se puede interpretar.
 */
export function parsePerformance(raw: string, kind: EventKind): number | null {
  const s = raw.trim().replace(',', '.')
  if (!s) return null

  if (kind === 'field' || kind === 'score') {
    const v = Number(s)
    return Number.isFinite(v) && v > 0 ? v : null
  }

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

/** Puntos World Athletics de una marca. 0 fuera de la rama válida de la parábola. */
export function calculatePoints(coeffs: Coeffs, x: number, kind: EventKind): number {
  const [a, b, c] = coeffs
  const vertex = -b / (2 * a)

  // Pasado el vértice la parábola se da la vuelta → no puntúa.
  if (kind === 'track' && x >= vertex) return 0
  if (kind !== 'track' && x <= vertex) return 0

  const p = a * x * x + b * x + c
  return p > 0 ? Math.round(p) : 0
}

/** Inversa: la marca que vale `points`. track → segundos, resto → metros/puntos. */
export function performanceForPoints(
  coeffs: Coeffs,
  points: number,
  kind: EventKind,
): number | null {
  const [a, b, c] = coeffs
  const disc = b * b - 4 * a * (c - points)
  if (disc < 0) return null
  const sqrt = Math.sqrt(disc)
  const r1 = (-b + sqrt) / (2 * a)
  const r2 = (-b - sqrt) / (2 * a)
  // track: la raíz más rápida; concursos/combinadas: la mayor
  const cand = kind === 'track' ? Math.min(r1, r2) : Math.max(r1, r2)
  return cand > 0 ? cand : null
}

/** Segundos → "ss.ss", "m:ss.ss" o "h:mm:ss". */
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

/** Marca formateada con su unidad, según el tipo de prueba. */
export function formatMark(value: number, e: ScoringEvent): string {
  if (e.kind === 'field') return `${value.toFixed(2)} m`
  if (e.kind === 'score') return `${Math.round(value)} pts`
  return formatTime(value)
}
