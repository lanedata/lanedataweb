// Datos de ejemplo del generador de historias: los de la semana del 13-19 jul.
// Sirven para ver las tarjetas nada más entrar; el flujo real es descargar la
// plantilla CSV, rellenarla y volver a subirla.

import type { StoryData } from './types'

export const DEFAULT_DATA: StoryData = {
  fecha: '13–19 JUL',
  cover: {
    kicker: 'NOVEDADES',
    kicker2: 'EL RESUMEN',
    t1: 'Lo que ha dado',
    t2: 'el fin de semana',
    pill: 'Resultados del 13 al 19 de julio',
    year: '2026',
  },
  secRecords: { kicker: 'PLUSMARCAS NACIONALES', t1: 'Récords', t2: 'de España' },
  secTop5: { kicker: 'MEJORES MARCAS · PUNTOS IAAF', t1: 'Top 5', t2: 'de la semana' },
  secMinima: { kicker: 'BILLETES PARA EL VERANO', t1: 'Con mínima', t2: 'internacional' },

  records: [
    { cat: 'SUB 18', name: 'Alba Benito', meta: 'Pértiga · ant. 4.14', mark: '4.15', tag: '#1 ALL-TIME' },
    { cat: 'SUB 18', name: 'Nicolás Ceballos', meta: '110 m v. · ant. 13.36', mark: '13.35', tag: '#1 ALL-TIME' },
    { cat: 'SUB 20', name: 'Ander Garaiar', meta: '100 m · ant. 10.27', mark: '10.26', tag: '#1 ALL-TIME' },
    { cat: 'SUB 18', name: 'Iker Piñeira', meta: '200 m · ant. 21.15', mark: '21.08', tag: '#1 ALL-TIME' },
    { cat: 'SUB 18', name: 'Mariona Armero', meta: '200 m · ant. 23.61', mark: '23.57', tag: '#1 ALL-TIME' },
    { cat: 'SUB 18', name: 'Fran de las Heras', meta: '100 m · ant. 10.44', mark: '10.36', tag: '#1 ALL-TIME' },
  ],

  top5: [
    { n: '1', name: 'David Barroso', meta: '800 m · Budapest (HUN) · 3º', mark: '1:43.60', pts: '1217 pts' },
    { n: '2', name: 'Sara Gallego', meta: '400 m v. · Madrid-VLL · 3ª', mark: '54.36', pts: '1193 pts' },
    { n: '3', name: 'Marta García', meta: '3.000 m · Londres (GBR) · 15ª', mark: '8:34.80', pts: '1192 pts' },
    { n: '4', name: 'Enrique Llopis', meta: '110 m v. · Madrid-VLL · 1ºC1', mark: '13.33', pts: '1191 pts' },
    { n: '5', name: 'Asier Martínez', meta: '110 m v. · Madrid-VLL · 3ºC1', mark: '13.35', pts: '1187 pts' },
  ],

  minima: [
    { name: 'Alejandro de la Viuda', event: '1.500 m', mark: '3:43.57', tag: 'MUN SUB-20' },
    { name: 'Ángel González', event: '400 m', mark: '45.53', tag: 'EURO ABS' },
    { name: 'Javier Lorente', event: '400 m v. (0,91)', mark: '49.19', tag: 'EURO ABS' },
    { name: 'Ander Garaiar', event: '100 m', mark: '10.26', tag: 'MUN SUB-20' },
    { name: 'Celia Cortés', event: '100 m', mark: '11.49', tag: 'MUN SUB-20' },
    { name: 'Magno Llopis', event: 'Martillo (6kg)', mark: '71.50', tag: 'MUN SUB-20' },
    { name: 'Yoel Pérez', event: 'Triple', mark: '15.65', tag: 'MUN SUB-20' },
    { name: 'César Hidalgo', event: '5.000 m Marcha', mark: '20:10.86', tag: 'MUN SUB-20' },
    { name: 'Diego Espeso', event: '400 m v. (0,91)', mark: '50.59', tag: 'MUN SUB-20' },
    { name: 'Eloi Antón', event: '5.000 m Marcha', mark: '20:13.56', tag: 'MUN SUB-20' },
    { name: 'Gregorio Crespo', event: '110 m v. (1,00)', mark: '13.70', tag: 'MUN SUB-20' },
  ],

  feats: [
    { id: 'barroso', pillGreen: 'Nº1 PUNTOS IAAF SEMANA', pillOutline: '3º · BUDAPEST', event: '800 M', cat: 'ABSOLUTA · 2025-26', first: 'David', last: 'BARROSO', sub: 'CAPEX · Extremadura · 24 años', mark: '1:43.60', where: 'Budapest (HUN) · 14 jul', g: 2, s: 0, b: 2, s2l: 'NUEVO PB', s2v: '1:43.60', s3l: 'PUNTOS IAAF', s3v: '1217' },
    { id: 'gallego', pillGreen: 'Nº2 PUNTOS IAAF SEMANA', pillOutline: '3ª · MADRID', event: '400 M V.', cat: 'ABSOLUTA · 2025-26', first: 'Sara', last: 'GALLEGO', sub: 'Nike Running Club · Cataluña · 25 años', mark: '54.36', where: 'Madrid-VLL · 16 jul', g: 15, s: 3, b: 0, s2l: 'MEJOR MARCA (PB)', s2v: '54.34', s3l: 'PUNTOS IAAF', s3v: '1193' },
    { id: 'marta-garcia', pillGreen: 'Nº3 PUNTOS IAAF SEMANA', pillOutline: '15ª · LONDRES', event: '3.000 M', cat: 'ABSOLUTA · 2025-26', first: 'Marta', last: 'GARCÍA', sub: 'Independiente · C. y León · 28 años', mark: '8:34.80', where: 'Londres (GBR) · 18 jul', g: 11, s: 6, b: 5, s2l: 'MEJOR MARCA (PB)', s2v: '8:29.32', s3l: 'PUNTOS IAAF', s3v: '1192' },
    { id: 'llopis', pillGreen: 'Nº4 PUNTOS IAAF SEMANA', pillOutline: '1ºC1 · MADRID', event: '110 M V.', cat: 'ABSOLUTA · 2025-26', first: 'Enrique', last: 'LLOPIS', sub: 'C.A. Adidas · C. Valenciana · 25 años', mark: '13.33', where: 'Madrid-VLL · 16 jul', g: 13, s: 10, b: 1, s2l: 'MEJOR MARCA (PB)', s2v: '13.09', s3l: 'PUNTOS IAAF', s3v: '1191' },
    { id: 'asier-martinez', pillGreen: 'Nº5 PUNTOS IAAF SEMANA', pillOutline: '3ºC1 · MADRID', event: '110 M V.', cat: 'ABSOLUTA · 2025-26', first: 'Asier', last: 'MARTÍNEZ', sub: 'Nike Running Club · Navarra · 26 años', mark: '13.35', where: 'Madrid-VLL · 16 jul', g: 11, s: 7, b: 5, s2l: 'MEJOR MARCA (PB)', s2v: '13.14', s3l: 'PUNTOS IAAF', s3v: '1187' },
    { id: 'benito', pillGreen: 'RÉCORD ESPAÑA SUB-18', pillOutline: '#1 ALL-TIME', event: 'PÉRTIGA', cat: 'SUB 18 · 2025-26', first: 'Alba', last: 'BENITO', sub: 'FC Barcelona · Cataluña · 17 años', mark: '4.15', where: 'Rieti (ITA) · 19 jul', g: 7, s: 0, b: 1, s2l: 'RÉCORD ANT.', s2v: '4.14', s3l: 'RANKING SUB-18', s3v: '#1' },
    { id: 'ceballos', pillGreen: 'RÉCORD ESPAÑA SUB-18', pillOutline: '#1 ALL-TIME', event: '110 M V.', cat: 'SUB 18 · 2025-26', first: 'Nicolás', last: 'CEBALLOS', sub: 'A.D. Marathon · C. Madrid · 17 años', mark: '13.35', where: 'Rieti (ITA) · 19 jul', g: 5, s: 1, b: 1, s2l: 'RÉCORD ANT.', s2v: '13.36', s3l: 'RANKING SUB-18', s3v: '#1' },
    { id: 'pineira', pillGreen: 'RÉCORD ESPAÑA SUB-18', pillOutline: '#1 ALL-TIME', event: '200 M', cat: 'SUB 18 · 2025-26', first: 'Iker', last: 'PIÑEIRA', sub: 'Super Amara BAT · País Vasco · 17 años', mark: '21.08', where: 'Rieti (ITA) · 18 jul', g: 1, s: 0, b: 0, s2l: 'RÉCORD ANT.', s2v: '21.15', s3l: 'RANKING SUB-18', s3v: '#1' },
    { id: 'armero', pillGreen: 'RÉCORD ESPAÑA SUB-18', pillOutline: '#1 ALL-TIME', event: '200 M', cat: 'SUB 18 · 2025-26', first: 'Mariona', last: 'ARMERO', sub: 'Lleida UA · Cataluña · 17 años', mark: '23.57', where: 'Rieti (ITA) · 18 jul', g: 4, s: 0, b: 0, s2l: 'RÉCORD ANT.', s2v: '23.61', s3l: 'RANKING SUB-18', s3v: '#1' },
    { id: 'delasheras', pillGreen: 'RÉCORD ESPAÑA SUB-18', pillOutline: '#1 ALL-TIME', event: '100 M', cat: 'SUB 18 · 2025-26', first: 'Francisco', last: 'DE LAS HERAS', sub: 'Granada Joven · Andalucía · 17 años', mark: '10.36', where: 'Rieti (ITA) · 17 jul', g: 6, s: 0, b: 0, s2l: 'RÉCORD ANT.', s2v: '10.44', s3l: 'RANKING SUB-18', s3v: '#1' },
    { id: 'garaiar', pillGreen: 'RÉCORD ESPAÑA SUB-20', pillOutline: 'MÍN. MUNDIAL SUB-20', event: '100 M', cat: 'SUB 20 · 2025-26', first: 'Ander', last: 'GARAIAR', sub: 'Nike Running Club · País Vasco · 19 años', mark: '10.26', where: 'Albacete · 18 jul', g: 2, s: 1, b: 1, s2l: 'RÉCORD ANT.', s2v: '10.27', s3l: 'RANKING SUB-20', s3v: '#1' },
    { id: 'delaviuda', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: 'BRAGA (POR)', event: '1.500 M', cat: 'SUB 20 · 2025-26', first: 'Alejandro', last: 'DE LA VIUDA', sub: 'Playas de Castellón · C. Madrid · 19 años', mark: '3:43.57', where: 'Braga (POR) · 11 jul', g: 1, s: 0, b: 0, s2l: 'NUEVO PB', s2v: '3:43.57', s3l: 'RANKING SUB-20', s3v: '#7' },
    { id: 'gonzalez', pillGreen: 'MÍNIMA EURO ABSOLUTO', pillOutline: 'MADRID-VLL', event: '400 M', cat: 'ABSOLUTA · 2025-26', first: 'Ángel', last: 'GONZÁLEZ', sub: 'Unicaja Jaén · C. Madrid · 22 años', mark: '45.53', where: 'Madrid-VLL · 16 jul', g: 0, s: 5, b: 4, s2l: 'NUEVO PB', s2v: '45.53', s3l: 'RANKING ESP', s3v: '#1' },
    { id: 'lorente', pillGreen: 'MÍNIMA EURO ABSOLUTO', pillOutline: '#5 ALL-TIME', event: '400 M V.', cat: 'ABSOLUTA · 2025-26', first: 'Javier', last: 'LORENTE', sub: "L'Hospitalet At. · Cataluña · 27 años", mark: '49.19', where: 'Madrid-VLL · 16 jul', g: 0, s: 0, b: 2, s2l: 'NUEVO PB', s2v: '49.19', s3l: 'RANKING ESP', s3v: '#2' },
    { id: 'cortes', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: '#6 ALL-TIME', event: '100 M', cat: 'SUB 20 · 2025-26', first: 'Celia', last: 'CORTÉS', sub: 'Puentecillas Palencia · C. y León · 18 años', mark: '11.49', where: 'Albacete · 18 jul', g: 2, s: 0, b: 0, s2l: 'NUEVO PB', s2v: '11.49', s3l: 'RANKING SUB-20', s3v: '#2' },
    { id: 'magno', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: '#7 ALL-TIME', event: 'MARTILLO 6KG', cat: 'SUB 20 · 2025-26', first: 'Magno', last: 'LLOPIS', sub: 'Chikillos de Vecindario · Canarias · 19 años', mark: '71.50', where: 'Albacete · 18 jul', g: 6, s: 1, b: 0, s2l: 'NUEVO PB', s2v: '71.50', s3l: 'RANKING SUB-20', s3v: '#1' },
    { id: 'yoel-perez', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: 'ALBACETE', event: 'TRIPLE', cat: 'SUB 20 · 2025-26', first: 'Yoel', last: 'PÉREZ', sub: 'Playas de Castellón · C. Valenciana · 18 años', mark: '15.65', where: 'Albacete · 18 jul', g: 3, s: 3, b: 0, s2l: 'NUEVO PB', s2v: '15.65', s3l: 'RANKING SUB-20', s3v: '#2' },
    { id: 'hidalgo', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: 'ALBACETE', event: '5.000 M MARCHA', cat: 'SUB 20 · 2025-26', first: 'César', last: 'HIDALGO', sub: 'Juventud Guadix · Andalucía · 19 años', mark: '20:10.86', where: 'Albacete · 19 jul', g: 2, s: 1, b: 0, s2l: 'NUEVO PB', s2v: '20:10.86', s3l: 'RANKING SUB-20', s3v: '#3' },
    { id: 'espeso', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: '#5 ALL-TIME', event: '400 M V.', cat: 'SUB 20 · 2025-26', first: 'Diego', last: 'ESPESO', sub: 'A.D. Marathon · C. Madrid · 18 años', mark: '50.59', where: 'Albacete · 19 jul', g: 2, s: 3, b: 1, s2l: 'NUEVO PB', s2v: '50.59', s3l: 'RANKING SUB-20', s3v: '#2' },
    { id: 'anton', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: 'ALBACETE', event: '5.000 M MARCHA', cat: 'SUB 20 · 2025-26', first: 'Eloi', last: 'ANTÓN', sub: 'Avinent Manresa · Cataluña · 18 años', mark: '20:13.56', where: 'Albacete · 19 jul', g: 0, s: 1, b: 1, s2l: 'MEJOR MARCA (PB)', s2v: '20:12.50', s3l: 'RANKING SUB-20', s3v: '#4' },
    { id: 'crespo', pillGreen: 'MÍNIMA MUNDIAL SUB-20', pillOutline: '#10 ALL-TIME', event: '110 M V.', cat: 'SUB 20 · 2025-26', first: 'Gregorio', last: 'CRESPO', sub: 'Granada Joven · Andalucía · 18 años', mark: '13.70', where: 'Albacete · 19 jul', g: 1, s: 0, b: 0, s2l: 'NUEVO PB', s2v: '13.70', s3l: 'RANKING SUB-20', s3v: '#2' },
  ],
}
