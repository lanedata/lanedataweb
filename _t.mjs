import fs from 'fs'
const src = fs.readFileSync('lib/iaaf-scoring.ts','utf8')
function coef(label, gender){
  const re = new RegExp(`label: "${label}"[\s\S]*?${gender}: \[([^\]]+)\]`)
  const m = src.match(re); return m ? m[1].split(',').map(Number) : null
}
const pts = (c,x)=>Math.round(c[0]*x*x+c[1]*x+c[2])
console.log('100m H 9.58 ->', pts(coef('100 m','men'),9.58), '(~1356)')
console.log('Maraton H 7235s ->', pts(coef('Maratón','men'),7235), '(~1307)')
console.log('LJ M 7.00 ->', pts(coef('Salto de longitud','women'),7.00))
console.log('100m H 12.00 ->', pts(coef('100 m','men'),12.00))
console.log('Peso H 22.00 ->', pts(coef('Peso','men'),22.00))
