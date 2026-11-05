/* ============================================================
   apodo.js · el nombre de cada visita (regla 11)
   ------------------------------------------------------------
   · El número de visita real (JK-XXXXXX) sigue por dentro: viaja
     cifrado y se valida en Apps Script. Aquí solo se deriva, de
     forma determinista, el nombre que ve la persona: tres palabras
     con sentido, como 'faro de bahía'. Mismo número → mismo nombre.
   · Las palabras y qué combina con qué viven en nombres-datos.js.
   · Se elige con 'mínimo hash': cada nombre posible puntúa contra el
     número de visita y gana el de menor puntaje. Así, al agregar palabras
     solo cambia el nombre de quien tenía un puntaje peor que el de una
     palabra nueva, no el de todos. El puntaje se pondera para que cada
     función (orienta, une, guarda…) toque casi a la misma cantidad de gente,
     aunque unas tengan más combinaciones que otras.
   ============================================================ */

const Apodo = (() => {
  const sinTilde = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);

  // FNV-1a de 32 bits con un mezclado final: un cambio chico en el texto da un número muy distinto.
  function hash(txt) {
    let h = 0x811c9dc5;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }

  // Misma raíz suena torpe ('plomada de plomo'): se descarta.
  const mismaRaiz = (a, b) => sinTilde(a).slice(0, 4) === sinTilde(b).slice(0, 4);

  let combos = null;
  function armar() {
    combos = [];
    const N = window.NOMBRES;
    if (!N) return combos;
    for (const [objeto, funcion, fijo, clases] of N.objetos) {
      for (const clase of clases) for (const w of N.clases[clase] || []) if (!mismaRaiz(objeto, w)) combos.push({ texto: `${objeto} de ${w}`, objeto, w, funcion });
      if (fijo) for (const w of N.clases.paisaje) if (!mismaRaiz(objeto, w)) combos.push({ texto: `${objeto} en ${w}`, objeto, w, funcion });
    }
    const cuenta = {};
    combos.forEach(c => { cuenta[c.funcion] = (cuenta[c.funcion] || 0) + 1; });
    combos.forEach(c => { c.peso = cuenta[c.funcion]; });   // más combinaciones en la función = menos probable cada una
    return combos;
  }

  const cache = new Map();
  const CLAVE = 'jk-nombre';   // {id, texto}: el nombre ya asignado a esta visita
  const guardado = id => { try { const v = JSON.parse(localStorage.getItem(CLAVE) || 'null'); return v && v.id === id ? v.texto : null; } catch (e) { return null; } };
  const ficha = c => ({ texto: c.texto, objeto: c.objeto, funcion: c.funcion, descripcion: `${mayus(c.objeto)} es de las cosas que ${window.NOMBRES.funciones[c.funcion]}` });

  // Mínimo hash entre los nombres posibles, saltando los que repiten objeto o palabra con 'evitar' (palabras de los últimos nombres dados).
  function elegir(clave, evitar) {
    const lista = combos || armar();
    let mejor = null, mejorH = Infinity;
    for (const pasada of [true, false]) {   // si todo choca (casi imposible), se acepta repetir
      for (const c of lista) {
        if (pasada && (evitar.has(c.objeto) || evitar.has(c.w))) continue;
        const u = (hash(clave + '|' + c.texto) + 1) / 4294967297, h = -Math.log(u) * c.peso;
        if (h < mejorH) { mejor = c; mejorH = h; }
      }
      if (mejor) break;
    }
    return mejor;
  }

  // Del número de visita saca el nombre: el ya asignado si hay, si no el que sale solo del número.
  function de(numero) {
    const lista = combos || armar();
    if (!numero || !lista.length) return { texto: '', objeto: '', funcion: '', descripcion: '' };
    const clave = String(numero), previo = guardado(clave);
    if (previo) { const c = lista.find(x => x.texto === previo); if (c) return ficha(c); }
    if (cache.has(clave)) return cache.get(clave);
    const r = ficha(elegir(clave, new Set()));
    cache.set(clave, r);
    return r;
  }

  // Con permiso de enviar datos: pide las palabras de los últimos 30 nombres y toma uno que no repita ninguna.
  // Sin permiso, sin red o si tarda más de 3 s, el nombre sale solo del número, igual que antes.
  async function asignar(numero) {
    try {
      const clave = String(numero);
      if (!numero || guardado(clave) || typeof Historial === 'undefined' || !Historial.activo) return de(numero);
      const lista = combos || armar();
      const r = await Promise.race([fetch(Historial.endpoint + '?r=1').then(x => x.json()), new Promise((_, no) => setTimeout(no, 3000))]);
      const evitar = new Set((Array.isArray(r) ? r : []).flatMap(t => String(t).split(' ')).filter(p => p !== 'de' && p !== 'en'));
      const c = elegir(clave, evitar);
      if (c) {
        try { localStorage.setItem(CLAVE, JSON.stringify({ id: clave, texto: c.texto })); } catch (e) {}
        try { fetch(Historial.endpoint, { method: 'POST', body: JSON.stringify({ id: clave, n: c.texto }), mode: 'no-cors', keepalive: true }).catch(() => {}); } catch (e) {}
      }
    } catch (e) { /* sin red: queda el nombre del número */ }
    return de(numero);
  }

  // 'Hola, buenas tardes' según la hora local.
  function saludo(d = new Date()) {
    const h = d.getHours();
    if (h < 12) return 'Hola, buen día';
    if (h < 19) return 'Hola, buenas tardes';
    return 'Hola, buenas noches';
  }

  return { de, asignar, saludo, cuantos: () => (combos || armar()).length };
})();

window.Apodo = Apodo;
