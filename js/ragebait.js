/* ragebait.js · los martes la página se porta mal a propósito (Jean, 2026-10-25).
   Lo carga pestanas.js cuando la página ya abrió, solo en martes con la hora del celular y nunca en el autodiagnóstico.
   Para probar cualquier día: ?ragebait=1 (los de hoy), ?ragebait=todos, ?ragebait=huye,caen (los que se nombren) y ?ragebait=0 lo apaga.
   Cada martes salen 3 efectos con la fecha como semilla, así todo el día son los mismos y el martes siguiente cambian.
   Lo que no cambia aunque sea martes, por el pilar de Trato:
   · la franja de la barra dice qué pasa, y Página normal lo apaga con un toque hasta mañana en este navegador;
   · con movimiento reducido no arranca;
   · no toca lo que se escribe, los precios, el pedido, los avisos, la cápsula de pedir ayuda ni el panel del laboratorio (NO_TOCAR);
   · lo que huye se cansa a la tercera y con teclado nunca huye, y todo regresa solo a como estaba.
   Sonidos y videos van en la carpeta ragebait/ y se anotan en ragebait/medios.js. */
(() => {
  const hoy = new Date().toLocaleDateString('sv'), CLAVE = 'jk-ragebait-apagado';
  const pedido = new URLSearchParams(location.search).get('ragebait') || '';
  try { if (!pedido && localStorage.getItem(CLAVE) === hoy) return; } catch (e) { /* sin almacenamiento */ }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const MEDIOS = window.RAGEBAIT_MEDIOS || { sonidos: [], videos: [] };
  const AQUI = document.currentScript.src, medio = n => new URL('../ragebait/' + n, AQUI).href;
  const NO_TOCAR = 'input, textarea, select, dialog, script, style, svg, .sr-only, #precios, .calc, .total, .pestanas, .pestanas-hoja, .aviso, .glosa, #jk-consent-aviso, .privacidad-boton, .rb-franja, .rb-video, .lab, [data-serio]';
  const libre = el => el && !el.closest(NO_TOCAR);
  const $$ = s => [...document.querySelectorAll(s)].filter(libre);
  const crear = (tag, clase, texto = '') => Object.assign(document.createElement(tag), { className: clase, textContent: texto });
  const azar = n => Math.random() * n | 0;
  const ctl = new AbortController(), en = { signal: ctl.signal }, deshacer = [];
  let vivo = true;

  /* los textos que se pueden revolver: nodos con letras fuera de lo que no se toca */
  const textos = raiz => {
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: n => /\S/.test(n.data) && libre(n.parentElement) ? 1 : 2 }), r = [];
    while (w.nextNode()) r.push(w.currentNode);
    return r;
  };

  /* revolver: cambia las letras por las de un juego y las regresa de izquierda a derecha.
     originales guarda el texto de cada nodo, así apagar y cada revuelta vuelven siempre al mismo */
  const originales = new Map(), revolviendo = new WeakSet();
  deshacer.push(() => originales.forEach((o, n) => { n.data = o; }));
  const revolver = (el, juego, ms, espera = 0) => {
    if (revolviendo.has(el)) return;
    const nodos = textos(el); if (!nodos.length) return;
    revolviendo.add(el);
    nodos.forEach(n => originales.has(n) || originales.set(n, n.data));
    const t0 = performance.now() + espera;
    const paso = t => {
      if (!vivo) return;
      const p = Math.max(0, Math.min(1, (t - t0) / ms));
      nodos.forEach(n => { const o = originales.get(n), k = Math.floor(o.length * p); n.data = o.slice(0, k) + o.slice(k).replace(/\S/g, () => juego[azar(juego.length)]); });
      p < 1 ? requestAnimationFrame(paso) : revolviendo.delete(el);
    };
    requestAnimationFrame(paso);
  };
  /* tocar o pasar el cursor encima, delegado en el documento */
  const alTocar = (sel, fn) => ['pointerover', 'pointerdown'].forEach(t => document.addEventListener(t, e => {
    if (t === 'pointerover' && e.pointerType !== 'mouse') return;
    const el = e.target.closest?.(sel); if (libre(el)) fn(el, e);
  }, { ...en, passive: true }));

  const EFECTOS = {
    /* los botones se van cuando el cursor llega o el dedo los toca, y a la tercera se cansan y se quedan */
    huye() {
      const estado = new WeakMap(), bloqueado = new WeakSet(), anims = new Set();
      const escapar = b => {
        const s = estado.get(b) || { n: 0, x: 0, y: 0 };
        if (++s.n > 3) return false;
        const r = b.getBoundingClientRect(), bx = r.left - s.x, by = r.top - s.y, a = Math.random() * 6.28, d = 90 + azar(70);
        const x = Math.max(8 - bx, Math.min(innerWidth - 8 - r.width - bx, Math.cos(a) * d)), y = Math.max(8 - by, Math.min(innerHeight - 8 - r.height - by, Math.sin(a) * d));
        anims.add(b.animate([{ translate: `${s.x}px ${s.y}px` }, { translate: `${x}px ${y}px` }], { duration: 250, easing: 'cubic-bezier(.3,1.25,.5,1)', fill: 'forwards' }));
        estado.set(b, { n: s.n, x, y });
        return true;
      };
      const BOTONES = 'button, .boton, [role="button"]';
      document.addEventListener('pointerover', e => { const b = e.target.closest?.(BOTONES); if (e.pointerType === 'mouse' && libre(b)) escapar(b); }, { ...en, passive: true });
      document.addEventListener('pointerdown', e => { const b = e.target.closest?.(BOTONES); if (libre(b)) escapar(b) ? bloqueado.add(b) : bloqueado.delete(b); }, { ...en, capture: true });
      /* el clic que llega después de huir no cuenta; el de teclado (detail 0) siempre cuenta */
      document.addEventListener('click', e => { const b = e.target.closest?.(BOTONES); if (b && bloqueado.delete(b) && e.detail) { e.preventDefault(); e.stopImmediatePropagation(); } }, { ...en, capture: true });
      deshacer.push(() => anims.forEach(a => a.cancel()));
    },
    /* las letras de los títulos se caen al pasarles encima, se quedan tiradas un rato y regresan */
    caen() {
      $$('h1, h2, h3').forEach(h => textos(h).forEach(n => {
        const caja = crear('span', 'rb-letras'), dibujo = crear('span', '');
        dibujo.setAttribute('aria-hidden', 'true');
        n.data.split(/(\s+)/).forEach(p => {
          if (!p.trim()) return dibujo.append(p);
          const palabra = crear('span', 'rb-palabra');
          palabra.append(...[...p].map(c => crear('span', 'rb-letra', c)));
          dibujo.append(palabra);
        });
        caja.append(crear('span', 'sr-only', n.data), dibujo);
        n.replaceWith(caja);
        deshacer.push(() => caja.replaceWith(n));
      }));
      const caer = l => {
        if (l.getAnimations().length) return;
        const r = l.getBoundingClientRect(), dy = Math.max(60, Math.min(innerHeight - r.bottom - 12, 180 + azar(220))), dx = azar(60) - 30, g = azar(160) - 80;
        const tirada = `translate(${dx}px, ${dy}px) rotate(${g}deg)`;
        l.animate([{ transform: 'none', easing: 'cubic-bezier(.55,0,1,.45)' }, { transform: tirada, offset: .1 }, { transform: tirada, offset: .85, easing: 'cubic-bezier(.3,1.2,.5,1)' }, { transform: 'none' }], 6000 + azar(2000));
      };
      alTocar('.rb-letra', (l, e) => e.type === 'pointerdown' ? [...l.parentElement.children].forEach((x, i) => setTimeout(() => caer(x), i * 40)) : caer(l));
    },
    /* cada párrafo llega en binario y se traduce solo */
    binario() {
      const ojo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { ojo.unobserve(e.target); if (Math.random() < .6) revolver(e.target, '01', 1200, 500); } }), { threshold: .6 });
      $$('p, li').forEach(p => ojo.observe(p));
      deshacer.push(() => ojo.disconnect());
    },
    /* el texto que se toca se vuelve código ascii por un momento */
    ascii: () => alTocar('p, li', el => revolver(el, '#$%&@*+=?/\\|<>~^{}[]', 900)),
    /* los títulos que se tocan se vuelven formas */
    formas: () => alTocar('h1, h2, h3', el => revolver(el, '●■▲◆▼★✚◐', 1000, 300)),
    /* la mitad de los párrafos están en idioma de la pe, y se traducen al tocarlos */
    idioma() {
      $$('p, li').filter(() => Math.random() < .5).forEach(el => textos(el).forEach(n => {
        originales.has(n) || originales.set(n, n.data);
        n.data = n.data.replace(/[aeiouáéíóú]/gi, v => v + 'p' + v.toLowerCase());
        n.parentElement.closest('p, li').dataset.rbPe = '';
      }));
      alTocar('[data-rb-pe]', el => { delete el.dataset.rbPe; textos(el).forEach(n => originales.has(n) && (n.data = originales.get(n))); });
    },
    /* los títulos de sección están al revés y se enderezan al pasarles encima */
    espejo() {
      document.body.classList.add('rb-espejo');
      deshacer.push(() => document.body.classList.remove('rb-espejo'));
    },
    /* el sello y los dibujos giran sin parar */
    gira() {
      document.body.classList.add('rb-gira');
      deshacer.push(() => document.body.classList.remove('rb-gira'));
    },
    /* una carga que llega a 99 y vuelve a empezar */
    cargando() {
      const carga = crear('span', 'rb-carga');
      franja.querySelector('.rb-franja__texto').after(carga);
      let n = 0;
      const t = setInterval(() => { n = n >= 99 ? (Math.random() < .08 ? 0 : 99) : n + 1 + azar(6); carga.innerHTML = `Cargando seriedad <span class="numero">${Math.min(n, 99)}</span> por ciento`; }, 140);
      deshacer.push(() => clearInterval(t));
    }
  };

  /* la franja va en la barra de arriba, que siempre se ve; si una página no tiene barra, arriba del todo */
  const franja = crear('div', 'rb-franja');
  franja.innerHTML = '<span class="rb-franja__texto">Martes de ragebait, la página se porta mal a propósito</span><button class="rb-franja__salir" type="button">Página normal</button>';
  (document.querySelector('.barra') || document.body).append(franja);
  franja.querySelector('button').addEventListener('click', () => {
    vivo = false; ctl.abort(); deshacer.reverse().forEach(f => f()); franja.remove(); document.querySelector('.rb-video')?.remove();
    try { localStorage.setItem(CLAVE, hoy); } catch (e) { /* sin almacenamiento */ }
  });

  /* los efectos del día: la fecha baraja la lista y se toman 3 */
  let s = [...hoy].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 7);
  const rng = () => ((s = Math.imul(s ^ s >>> 15, s | 1) + 0x6D2B79F5 >>> 0) % 1e6) / 1e6;
  const nombres = Object.keys(EFECTOS).map(n => [rng(), n]).sort((a, b) => a[0] - b[0]).map(([, n]) => n);
  const elegidos = pedido === 'todos' ? nombres : /[a-z]/.test(pedido) ? pedido.split(',').filter(n => EFECTOS[n]) : nombres.slice(0, 3);
  elegidos.forEach(n => EFECTOS[n]());
  document.documentElement.dataset.ragebait = elegidos.join(' ');

  /* sonidos: uno de cada tres toques suena algo, sin encimarse. Videos: uno por visita, al tercer toque, en una esquina y con su cerrar */
  let sonando = null, toques = 0;
  document.addEventListener('click', e => {
    if (!libre(e.target)) return;
    if (MEDIOS.sonidos.length && Math.random() < .33 && (!sonando || sonando.ended || sonando.paused)) { sonando = new Audio(medio(MEDIOS.sonidos[azar(MEDIOS.sonidos.length)])); sonando.volume = .7; sonando.play().catch(() => {}); }
    if (MEDIOS.videos.length && ++toques === 3) {
      const caja = crear('div', 'rb-video'), v = crear('video', ''), x = crear('button', 'rb-video__cerrar', 'Cerrar');
      Object.assign(v, { src: medio(MEDIOS.videos[azar(MEDIOS.videos.length)]), autoplay: true, playsInline: true, onended: () => caja.remove() });
      x.type = 'button'; x.onclick = () => caja.remove();
      caja.append(v, x); document.body.append(caja);
    }
  }, en);
})();
