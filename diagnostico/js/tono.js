/* tono.js · disfraz jean.krrillo de la v2. Va antes que todo.
   tono('tinta'|'papel'|'ocre', alfa) da el color del tema actual como rgba,
   para lo que no entiende var(): canvas, GSAP, Chart.js y confeti.
   Además une el tema de la v2 (data-theme) con el de la v3 (jk-tema). */
(function () {
  var raiz = document.documentElement, CLAVE = 'jk-tema';
  var guardado = null;
  try { guardado = localStorage.getItem(CLAVE); } catch (e) { }
  var oscuro = guardado ? guardado === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
  if (oscuro) raiz.setAttribute('data-theme', 'dark');
  new MutationObserver(function () {
    try { localStorage.setItem(CLAVE, raiz.getAttribute('data-theme') === 'dark' ? 'oscuro' : 'claro'); } catch (e) { }
  }).observe(raiz, { attributes: true, attributeFilter: ['data-theme'] });

  window.tono = function (nombre, alfa) {
    var hex = getComputedStyle(raiz).getPropertyValue('--' + nombre).trim() || '#121217';
    if (alfa == null || alfa >= 1) return hex;
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alfa + ')';
  };
})();

/* vestir(color) traduce los colores de significado de la v2 (semáforo del riesgo,
   matriz de contraseñas) a la gama tinta-ocre, como hex para poder sumarle alfa.
   La lógica sigue comparando los colores originales; solo cambia lo que se pinta. */
(function () {
  var GAMA = {
    '#ef4444': ['ocre', 1], '#f43f5e': ['ocre', 1], '#ff0000': ['ocre', 1], '#ff3300': ['ocre', 1],
    '#f87171': ['ocre', .8], '#f97316': ['ocre', .6], '#e8b45b': ['ocre', .6], '#eab308': ['ocre', .4],
    '#22c55e': ['tinta', .45], '#10b981': ['tinta', 1], '#15803d': ['tinta', 1]
  };
  function hex(n) { return '#' + n.map(function (x) { return Math.round(x).toString(16).padStart(2, '0'); }).join(''); }
  function rgb(h) { var n = parseInt(h.trim().slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  window.vestir = function (color) {
    var g = GAMA[String(color).toLowerCase()];
    if (!g) return color;
    var a = rgb(tono(g[0])), p = rgb(tono('papel'));
    return hex(a.map(function (x, i) { return x * g[1] + p[i] * (1 - g[1]); }));
  };
})();
