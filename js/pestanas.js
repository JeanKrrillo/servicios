/* pestanas.js · la guía de abajo de todas las páginas (rehecha el 2026-10-14, versión 2).
   No es una barra de pestañas: es una cápsula con dos cosas, como pide el tope de 2 opciones para moverse.
   1. Dónde estás: el nombre de la sección que ves (o de la página). Al tocarlo abre el índice para ir a otra parte.
   2. Pedir ayuda: lo que sigue, siempre a la mano.
   Siempre está y siempre en el mismo lugar: nada aparece ni desaparece solo, así no hay mecánica que aprender.
   En compu vive en la barra de arriba, con el logo, la música y el tema; en celular, abajo, al alcance del pulgar.
   En el autodiagnóstico solo dice dónde estás: su informe ya ofrece pedir ayuda (ofrecer una vez).
   Además hace que cambiar de página sea casi instantáneo: precarga el enlace al acercarse y cambia con un fundido.
   Una sección nueva es una fila en SECCIONES; una página, en PAGINAS. Estilos en css/pestanas.css. */
(() => {
  const trazo = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const LISTA = '<path d="M5 7h14M5 12h14M5 17h9"/>', CERRAR = '<path d="M6 6l12 12M18 6L6 18"/>';
  const SECCIONES = [['inicio', 'Inicio'], ['necesidad', 'Servicios'], ['laboratorio', 'Laboratorio'], ['casos', 'Casos resueltos'],
    ['preguntas', 'Preguntas']];
  /* El registro de líneas es de temporada: el 15 de enero de 2027 sale del índice solo (sección 9 de la reestructuración) */
  const PAGINAS = [['autodiagnostico.html', 'Autodiagnóstico'], ['preguntas.html', 'Registro de líneas', '2027-01-15'], ['informacion.html', 'Información útil'], ['principios.html', 'Principios'], ['recomendaciones.html', 'Recomendaciones']]
    .filter(([, , hasta]) => !hasta || new Date().toISOString().slice(0, 10) < hasta);

  /* Un solo movimiento para todo salto dentro de la página, en cualquier aparato: desplazamiento suave (o directo con
     movimiento reducido) y el título justo bajo la barra (scroll-margin en css/pestanas.css). Lo usan el índice,
     las referencias (servicios.js) y la llegada desde otra página */
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  window.saltarA = el => el && el.scrollIntoView({ behavior: reducido.matches ? 'auto' : 'smooth', block: 'start' });
  /* al llegar con #seccion desde otra página, se vuelve a ubicar cuando ya cargó todo lo de arriba */
  if (location.hash.length > 1) addEventListener('load', () => setTimeout(() => {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el && !el.matches('dialog')) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, 250), { once: true });

  /* Lo de temporada lleva data-hasta y se quita solo ese día, como el registro de líneas el 15 de enero de 2027.
     Vive aquí porque este archivo carga en todas las páginas, también el autodiagnóstico */
  const quitarTemporada = () => { const hoy = new Date().toISOString().slice(0, 10); document.querySelectorAll('[data-hasta]').forEach(el => { if (hoy >= el.dataset.hasta) el.remove(); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', quitarTemporada); else quitarTemporada();

  const raiz = new URL('..', document.currentScript.src);
  const ruta = location.pathname.slice(new URL(raiz).pathname.length) || 'index.html';
  const enPortada = ruta === 'index.html';
  const url = r => new URL(r, raiz).href;
  /* Los martes la página se porta mal (js/ragebait.js), menos en el autodiagnóstico. Se pide cuando ya abrió todo, así la portada
     no espera. ?ragebait=1 lo prende cualquier día, y las pruebas automáticas no lo ven aunque corran en martes */
  const rb = new URLSearchParams(location.search).get('ragebait');
  /* quien tiene el laboratorio lo puede prender cualquier día (Ragebait cualquier día, en laboratorio.js) */
  let rbLab = false; try { rbLab = !!JSON.parse(localStorage.getItem('jk-lab'))?.prendidas?.includes('ragebait'); } catch (e) { /* sin almacenamiento */ }
  if (ruta !== 'autodiagnostico.html' && rb !== '0' && (rb || rbLab || (new Date().getDay() === 2 && !navigator.webdriver))) addEventListener('load', () => document.head.append(
    Object.assign(document.createElement('link'), { rel: 'stylesheet', href: url('css/ragebait.css') }),
    ...['ragebait/medios.js', 'js/ragebait.js'].map(s => Object.assign(document.createElement('script'), { src: url(s), async: false }))), { once: true });
  /* en el autodiagnóstico su barra ya dice dónde estás, así que el botón dice a dónde lleva */
  const pagina = ruta === 'autodiagnostico.html' ? 'Todo el sitio' : PAGINAS.find(([r]) => r === ruta)?.[1] || (ruta === 'preguntas.html' ? 'Registro de líneas' : 'Inicio');

  const nav = document.createElement('nav');
  nav.className = 'pestanas';
  nav.setAttribute('aria-label', 'Dónde estás');
  const pedir = enPortada ? '<button class="pestanas__pedir" type="button" data-pedir>Pedir ayuda</button>'
    : ruta === 'autodiagnostico.html' ? '' : `<a class="pestanas__pedir" href="${url('index.html#pedir')}">Pedir ayuda</a>`;
  nav.innerHTML = `<button class="pestanas__aqui" type="button" aria-haspopup="dialog">${trazo(LISTA)}<span>${pagina}</span></button>${pedir}`;
  const aqui = nav.querySelector('.pestanas__aqui span');
  let seccion = '';   // id de la sección que se ve en la portada; marca el índice

  const fila = (href, nombre, actual) => `<li><a class="indice__fila" href="${href}"${actual ? ' aria-current="true"' : ''}>${nombre}</a></li>`;
  const hoja = document.createElement('dialog');
  hoja.className = 'pestanas-hoja';
  hoja.setAttribute('aria-label', 'Índice');
  const pintarHoja = () => {
    hoja.innerHTML = `<div class="pestanas-hoja__caja">
      <button class="pestanas-hoja__cerrar" type="button">${trazo(CERRAR)}<span>Cerrar</span></button>
      <ul class="indice">${SECCIONES.map(([id, n]) => fila(url('index.html#' + id), n, enPortada && seccion === id)).join('')}</ul>
      <ul class="indice indice--otras">${PAGINAS.map(([r, n]) => fila(url(r), n, r === ruta)).join('')}</ul></div>`;
  };
  nav.querySelector('.pestanas__aqui').addEventListener('click', () => { pintarHoja(); hoja.showModal(); });
  hoja.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (e.target === hoja || e.target.closest('.pestanas-hoja__cerrar') || a) hoja.close();
    /* en la misma página, el salto es el mismo movimiento que todo lo demás */
    if (a && a.pathname === location.pathname && a.hash) {
      e.preventDefault();
      history.replaceState(null, '', a.hash);
      saltarA(document.getElementById(a.hash.slice(1)));
    }
  });
  document.body.append(nav, hoja);

  /* En compu, a la barra de arriba (al final, después del tema); en celular, abajo */
  const ancha = matchMedia('(min-width: 900px)');
  const acomodar = () => {
    const fila = document.querySelector('.barra__fila, .jk-header__fila');
    const arriba = ancha.matches && fila;
    nav.classList.toggle('en-barra', !!arriba);
    document.documentElement.classList.toggle('guia-arriba', !!arriba);
    if (arriba) fila.append(nav); else document.body.append(nav);
  };
  const listo = () => { acomodar(); ancha.addEventListener('change', acomodar); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listo); else listo();

  /* El aro de la guía se llena con el avance de la página; vive aquí para que funcione en todas, también el autodiagnóstico */
  let pendienteAvance = false;
  const avanzar = () => {
    const alto = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--avance', (alto > 0 ? Math.min(1, scrollY / alto) : 0).toFixed(3));
    pendienteAvance = false;
  };
  addEventListener('scroll', () => { if (!pendienteAvance) { pendienteAvance = true; requestAnimationFrame(avanzar); } }, { passive: true });
  addEventListener('resize', avanzar, { passive: true });
  avanzar();

  /* Páginas casi instantáneas: al posar el puntero o empezar el toque, la página se descarga de antemano.
     Solo se descarga, no se ejecuta: prepararla entera correría medir.js y la música antes de que la persona entre,
     y contaría visitas que no pasaron (Anonimato). El cambio lleva un fundido corto (css/pestanas.css, @view-transition) */
  const propia = a => a && a.origin === location.origin && /\.html$|\/$/.test(a.pathname) && a.pathname !== location.pathname && !a.target;
  if (HTMLScriptElement.supports?.('speculationrules')) {
    const reglas = document.createElement('script');
    reglas.type = 'speculationrules';
    reglas.textContent = JSON.stringify({ prefetch: [{ where: { and: [{ href_matches: '/*' }, { not: { selector_matches: '[target], [download]' } }] }, eagerness: 'moderate' }] });
    document.head.append(reglas);
  } else {
    const pedidas = new Set();
    const prever = e => {
      const a = e.target.closest?.('a[href]');
      if (!propia(a) || pedidas.has(a.pathname)) return;
      pedidas.add(a.pathname);
      document.head.append(Object.assign(document.createElement('link'), { rel: 'prefetch', href: a.href }));
    };
    ['pointerover', 'touchstart', 'focusin'].forEach(t => addEventListener(t, prever, { passive: true }));
  }

  if (!enPortada) return;
  /* En la portada el nombre sigue a la sección que ves */
  const empezar = () => {
    if (!('IntersectionObserver' in window)) return;
    const vistas = new Map();
    const obs = new IntersectionObserver(es => {
      es.forEach(e => vistas.set(e.target.id, e.isIntersecting));
      const s = SECCIONES.find(([id]) => vistas.get(id));
      seccion = s ? s[0] : '';
      aqui.textContent = s ? s[1] : 'Inicio';
      // si el índice está abierto, su punto sigue a la sección
      hoja.querySelectorAll('.indice__fila').forEach(a => !!seccion && a.hash === '#' + seccion ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    }, { rootMargin: '-40% 0px -55% 0px' });
    SECCIONES.forEach(([id]) => { const el = document.getElementById(id); if (el) obs.observe(el); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', empezar); else empezar();
})();
