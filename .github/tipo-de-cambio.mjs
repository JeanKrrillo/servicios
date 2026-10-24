// Tipo de cambio del día (sección 5.10 de la reestructuración del 2026-10-23). Lo corre la tarea diaria tipo-de-cambio.yml.
// Consulta el FIX de Banxico (serie SF43718, servicio SIE) con el token del secreto BANXICO_TOKEN y escribe tipo-de-cambio.json:
//   hoy y fecha_hoy: lo que dio Banxico; en_uso y fecha_en_uso: el que usan los precios.
// El valor en uso solo cambia si el de hoy se aleja más de 5 % del que está en uso, y ningún precio sube ni baja más de 10 %
// en una sola actualización (la curva es la misma de js/precios.js). Si Banxico falla, no cambia nada y termina sin error.
// Formato de la respuesta (documentación del SIE): { bmx: { series: [ { idSerie, datos: [ { fecha: 'dd/mm/aaaa', dato: '18.4163' } ] } ] } }
import fs from 'node:fs';

const ARCHIVO = 'tipo-de-cambio.json';
const BASE = 18.4163, SUBE = .5, BAJA = .4, MIN = .85, MAX = 1.30, UMBRAL = .05, TOPE = .10;
const factor = d => Math.min(MAX, Math.max(MIN, 1 + (d >= BASE ? SUBE : BAJA) * Math.log(d / BASE)));
const salir = msg => { console.log(msg); process.exit(0); };

const token = process.env.BANXICO_TOKEN;
if (!token) salir('Sin BANXICO_TOKEN: no se cambia nada.');
let hoy, fecha;
try {
  const r = await fetch('https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno', { headers: { 'Bmx-Token': token, Accept: 'application/json' } });
  const dato = (await r.json()).bmx.series[0].datos[0];
  hoy = Number(String(dato.dato).replace(',', ''));
  const [d, m, a] = dato.fecha.split('/');
  fecha = `${a}-${m}-${d}`;
  if (!(hoy > 5 && hoy < 60)) throw new Error('valor raro: ' + dato.dato);
} catch (e) { salir('Banxico no respondió bien, no se cambia nada: ' + e.message); }

const actual = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
const nuevo = { ...actual, hoy, fecha_hoy: fecha };
if (Math.abs(hoy / actual.en_uso - 1) > UMBRAL) {
  // el precio se mueve con factor(dólar); si el salto pasa de 10 %, se avanza solo hasta ese 10 % y mañana sigue
  let en_uso = hoy;
  const f0 = factor(actual.en_uso), f1 = factor(hoy);
  if (Math.abs(f1 / f0 - 1) > TOPE) {
    const meta = f0 * (f1 > f0 ? 1 + TOPE : 1 - TOPE);
    let lo = Math.min(actual.en_uso, hoy), hi = Math.max(actual.en_uso, hoy);
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; factor(m) < meta ? (lo = m) : (hi = m); }
    en_uso = Math.round(((lo + hi) / 2) * 1e4) / 1e4;
  }
  nuevo.en_uso = en_uso;
  nuevo.fecha_en_uso = fecha;
}
if (nuevo.en_uso === actual.en_uso) salir('El valor en uso no cambia: no hay commit.');
fs.writeFileSync(ARCHIVO, JSON.stringify(nuevo, null, 2) + '\n');
console.log(`Hoy ${hoy}, en uso ${nuevo.en_uso}`);
