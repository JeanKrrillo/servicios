/* comun.js · utilidades que comparten todas las páginas.
   Sin dependencias. Lottie se carga solo cuando una animación entra en pantalla. */

/* A dónde llegan los mensajes armados. Un solo lugar para cambiarlo. */
const CONTACTO = {
  usuario: '@jean.krrillo',
  url: 'https://www.instagram.com/jean.krrillo/',
  whatsapp: '524424820977'         // solo para el link de wa.me; el número no se muestra en la página
};

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const reduceMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Tema: sigue al celular; el botón lo fuerza y se recuerda en este navegador ── */
const Tema = {
  clave: 'jk-tema',
  aplicar(valor) {
    const raiz = document.documentElement;
    if (valor === 'claro' || valor === 'oscuro') raiz.dataset.tema = valor;
    else delete raiz.dataset.tema;
  },
  actual() {
    const forzado = document.documentElement.dataset.tema;
    if (forzado) return forzado;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  },
  alternar() {
    const nuevo = this.actual() === 'oscuro' ? 'claro' : 'oscuro';
    this.aplicar(nuevo);
    try { localStorage.setItem(this.clave, nuevo); } catch (e) { /* sin almacenamiento */ }
    $$('[data-tema-boton]').forEach(b => b.setAttribute('aria-label', nuevo === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'));
  },
  iniciar() {
    try { this.aplicar(localStorage.getItem(this.clave)); } catch (e) { /* sin almacenamiento */ }
    $$('[data-tema-boton]').forEach(b => {
      b.setAttribute('aria-label', this.actual() === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      b.addEventListener('click', () => this.alternar());
    });
  }
};

/* ── Aviso efímero (sin alert) ── */
let avisoTimer;
function avisar(texto) {
  let el = $('#aviso');
  if (!el) {
    el = document.createElement('div');
    el.id = 'aviso';
    el.className = 'aviso';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = texto;
  requestAnimationFrame(() => el.classList.add('es-visible'));
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('es-visible'), 2200);
}

/* ── Copiar al portapapeles con respaldo para navegadores viejos ── */
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    area.remove();
    return ok;
  }
}

/* ── Aparición al entrar en pantalla: un solo observer para toda la página ── */
function iniciarApariciones() {
  const elementos = $$('.aparece');
  if (!elementos.length) return;
  if (reduceMovimiento() || !('IntersectionObserver' in window)) {
    elementos.forEach(el => el.classList.add('es-visible'));
    return;
  }
  const obs = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('es-visible');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  elementos.forEach(el => obs.observe(el));
}

/* ── Lottie bajo demanda ──
   Los datos vienen como animaciones/datos/<nombre>.js (los arma animaciones/2_piezas/empaquetar_web.py)
   y se cargan con <script>, así funcionan también abriendo el html sin servidor. */
const Lottie = {
  base: 'animaciones/',
  _lib: null,
  _datos: new Map(),
  _esperas: new Map(),
  cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = ok;
      s.onerror = mal;
      document.head.appendChild(s);
    });
  },
  libreria() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (!this._lib) this._lib = this.cargarScript(this.base + 'lottie.min.js').then(() => window.lottie);
    return this._lib;
  },
  registrar(nombre, datos) {
    const espera = this._esperas.get(nombre);
    if (espera) espera(datos); else this._datos.set(nombre, Promise.resolve(datos));
  },
  datos(nombre) {
    if (!this._datos.has(nombre)) {
      this._datos.set(nombre, new Promise((ok, mal) => {
        this._esperas.set(nombre, ok);
        this.cargarScript(`${this.base}datos/${nombre}.js`).catch(mal);
      }));
    }
    return this._datos.get(nombre);
  },
  /* Pide los datos sin montarlos, para tenerlos listos antes de que se vean */
  precargar(nombres) { nombres.forEach(n => this.datos(n).catch(() => {})); },
  /* Monta una animación. desde 'intro' arma el dibujo y luego repite el ciclo;
     desde 'ciclo' empieza ya armada, en un punto distinto para que no respiren todas juntas */
  async montar(contenedor, nombre, { desde = 'intro' } = {}) {
    const [lib, datos] = await Promise.all([this.libreria(), this.datos(nombre)]);
    const anim = lib.loadAnimation({
      container: contenedor,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: typeof structuredClone === 'function' ? structuredClone(datos) : JSON.parse(JSON.stringify(datos)),
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true }
    });
    const marcas = datos.markers || [];
    const intro = marcas.find(m => m.cm === 'intro');
    const vuelta = marcas.find(m => m.cm === 'ciclo');
    const finIntro = intro ? intro.tm + intro.dr : datos.op;
    await new Promise(ok => anim.addEventListener('DOMLoaded', ok, { once: true }));
    const repetirCiclo = () => {
      if (!vuelta) return;
      anim.loop = true;
      anim.playSegments([vuelta.tm, vuelta.tm + vuelta.dr], true);
    };
    if (reduceMovimiento()) {
      anim.goToAndStop(finIntro, true); // el último cuadro de la entrada es el dibujo original
    } else if (desde === 'ciclo' && vuelta) {
      repetirCiclo();
      anim.goToAndPlay(Math.floor(Math.random() * vuelta.dr), true);
    } else {
      anim.playSegments([intro ? intro.tm : 0, finIntro], true);
      anim.addEventListener('complete', repetirCiclo, { once: true });
    }
    return { anim, destruir: () => anim.destroy() };
  }
};

/* ── Glosa: una ficha corta para palabras raras y para cada pigmento ──
   Con ratón se abre al pasar por encima y se acomoda junto a la palabra sin salirse de la pantalla.
   En celular, donde no hay cursor, se abre al tocar y sale desde abajo, al alcance del pulgar. */
const Glosa = {
  el: null, origen: null, timer: null,
  tactil: () => matchMedia('(hover: none), (pointer: coarse)').matches,

  crear() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'glosa';
    this.el.id = 'glosa';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'false');
    this.el.hidden = true;
    this.el.innerHTML = '<div class="glosa__cabeza"><span class="glosa__muestra" hidden></span><strong class="glosa__titulo"></strong><button class="glosa__cerrar" type="button" aria-label="Cerrar">×</button></div><p class="glosa__texto"></p><small class="glosa__nota" hidden></small>';
    document.body.appendChild(this.el);
    $('.glosa__cerrar', this.el).addEventListener('click', () => this.cerrar(true));
    this.el.addEventListener('pointerenter', () => clearTimeout(this.timer));
    this.el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.cerrarLuego(); });
  },

  abrir(origen) {
    this.crear();
    clearTimeout(this.timer);
    if (this.origen && this.origen !== origen) this.origen.setAttribute('aria-expanded', 'false');
    this.origen = origen;
    const d = origen.dataset;
    $('.glosa__titulo', this.el).textContent = d.glosaTitulo;
    $('.glosa__texto', this.el).textContent = d.glosaTexto;
    const nota = $('.glosa__nota', this.el), muestra = $('.glosa__muestra', this.el);
    nota.hidden = !d.glosaNota; nota.textContent = d.glosaNota || '';
    muestra.hidden = !d.glosaColor; muestra.style.background = d.glosaColor || '';
    origen.setAttribute('aria-expanded', 'true');
    origen.setAttribute('aria-controls', 'glosa');
    const hoja = this.tactil() || innerWidth < 600;
    this.el.classList.toggle('glosa--hoja', hoja);
    this.el.hidden = false;
    if (!hoja) {
      /* junto a la palabra, abajo si cabe y arriba si no, sin salirse por los lados */
      const r = origen.getBoundingClientRect(), w = this.el.offsetWidth, h = this.el.offsetHeight, m = 12;
      const x = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), innerWidth - w - m);
      const abajo = r.bottom + 8 + h < innerHeight - m;
      this.el.style.left = x + 'px';
      this.el.style.top = (abajo ? r.bottom + 8 : r.top - h - 8) + 'px';
    } else {
      this.el.style.left = this.el.style.top = '';
    }
    requestAnimationFrame(() => this.el.classList.add('es-visible'));
  },

  cerrar(devolverFoco = false) {
    if (!this.el || this.el.hidden) return;
    this.el.classList.remove('es-visible');
    if (this.origen) { this.origen.setAttribute('aria-expanded', 'false'); if (devolverFoco) this.origen.focus(); }
    this.origen = null;
    setTimeout(() => { if (!this.origen) this.el.hidden = true; }, 200);
  },
  cerrarLuego() { clearTimeout(this.timer); this.timer = setTimeout(() => this.cerrar(), 220); },

  /* Vuelve tocable la primera aparición de cada palabra del glosario dentro de cada sección */
  marcar(raiz = document.body) {
    if (typeof GLOSARIO === 'undefined') return;
    const secciones = raiz.matches && raiz.matches('section, .pregunta') ? [raiz] : $$('section, .pregunta', raiz);
    secciones.forEach(sec => {
      const hechos = new Set($$('[data-glosa-titulo]', sec).map(x => x.dataset.glosaTitulo.toLowerCase()));
      GLOSARIO.forEach(g => {
        if (hechos.has(g.t.toLowerCase())) return;
        const formas = [g.t, ...(g.alias || [])].sort((a, b) => b.length - a.length).map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const re = new RegExp(`(?<![\\p{L}\\d])(${formas.join('|')})(?![\\p{L}\\d])`, g.t === g.t.toUpperCase() ? 'u' : 'iu');
        const caminante = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, {
          acceptNode: n => (n.parentElement.closest('a, button, label, summary, textarea, input, script, style, .glosa-termino, [aria-hidden="true"], .opcion, .boton') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
        });
        let n;
        while ((n = caminante.nextNode())) {
          const m = re.exec(n.data);
          if (!m) continue;
          const tras = n.splitText(m.index);
          tras.splitText(m[0].length);
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'glosa-termino';
          b.textContent = tras.data;
          b.dataset.glosaTitulo = g.t;
          b.dataset.glosaTexto = g.d;
          b.setAttribute('aria-expanded', 'false');
          tras.replaceWith(b);
          hechos.add(g.t.toLowerCase());
          break;
        }
      });
    });
  },

  iniciar() {
    const es = e => e.target.closest && e.target.closest('[data-glosa-titulo]');
    document.addEventListener('click', e => {
      const o = es(e);
      if (o) { e.preventDefault(); this.origen === o ? this.cerrar() : this.abrir(o); return; }
      if (this.el && !this.el.contains(e.target)) this.cerrar();
    });
    document.addEventListener('pointerover', e => { const o = es(e); if (o && e.pointerType === 'mouse') this.abrir(o); });
    document.addEventListener('pointerout', e => { const o = es(e); if (o && e.pointerType === 'mouse' && !this.el?.contains(e.relatedTarget)) this.cerrarLuego(); });
    document.addEventListener('focusin', e => { const o = es(e); if (o && !this.tactil()) this.abrir(o); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.cerrar(true); });
    addEventListener('scroll', () => { if (this.el && !this.el.classList.contains('glosa--hoja')) this.cerrar(); }, { passive: true });
    this.marcar();
  }
};

/* ── Confeti de tinta y ocre, solo transform y opacity, y se borra solo ── */
function confeti(x = innerWidth / 2, y = innerHeight * .6, cuantos = 46) {
  if (reduceMovimiento()) return;
  const capa = document.createElement('div');
  capa.className = 'confeti';
  for (let i = 0; i < cuantos; i++) {
    const p = document.createElement('i');
    const ang = -Math.PI / 2 + (Math.random() - .5) * 2.2;
    const v = 140 + Math.random() * 260;
    p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(ang) * v}px;--dy:${Math.sin(ang) * v}px;--cae:${180 + Math.random() * 260}px;--giro:${(Math.random() - .5) * 900}deg;--d:${900 + Math.random() * 700}ms`;
    if (i % 3 === 0) p.className = 'es-ocre';
    capa.appendChild(p);
  }
  document.body.appendChild(capa);
  setTimeout(() => capa.remove(), 1800);
}


/* ── Barra de lectura: avanza con el scroll, medida una vez por cuadro ── */
function iniciarBarraLectura() {
  const barra = document.createElement('div');
  barra.className = 'barra-lectura';
  document.body.appendChild(Object.assign(document.createElement('div'), { className: 'lavado-avance', ariaHidden: 'true' }));
  barra.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barra);
  let alto = 0, pendiente = false;
  const medir = () => { alto = document.documentElement.scrollHeight - innerHeight; document.documentElement.style.setProperty('--alto-doc', document.documentElement.scrollHeight + 'px'); };
  medir();
  new ResizeObserver(medir).observe(document.body);
  addEventListener('scroll', () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      const avance = alto > 0 ? Math.min(1, scrollY / alto) : 0;
      barra.style.transform = `scaleX(${avance})`;
      pendiente = false;
    });
  }, { passive: true });
}

/* ── La firma se aparta cuando queda encima de algo tocable, y vuelve al moverse ── */
function iniciarFirma() {
  const firma = $('.firma');
  if (!firma) return;
  let timer;
  const revisar = () => {
    const r = firma.getBoundingClientRect();
    firma.style.visibility = 'hidden';
    const puntos = [[r.left + 4, r.top + r.height / 2], [r.right - 4, r.top + r.height / 2], [r.left + r.width / 2, r.top + 2], [r.left + r.width / 2, r.bottom - 2]];
    const choca = puntos.some(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.closest('a, button, input, textarea, select, .carta, .nodo, .celda'); });
    firma.style.visibility = '';
    firma.classList.toggle('se-aparta', choca);
  };
  addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(revisar, 120); }, { passive: true });
  addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(revisar, 120); }, { passive: true });
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(revisar, 200); }).observe(document.body, { childList: true, subtree: true });
  setTimeout(revisar, 600);
}

document.addEventListener('DOMContentLoaded', () => {
  Tema.iniciar();
  iniciarFirma();
  Glosa.iniciar();

  iniciarBarraLectura();
  iniciarApariciones();
  $$('[data-anio]').forEach(el => { el.textContent = new Date().getFullYear(); });
});

/* ── Hoja web: un link con data-hoja="Título" abre la página en una hoja encima, sin salir de aquí.
   Solo para sitios que se dejan mostrar dentro de otra página (el DOF sí, Have I Been Pwned no).
   Ctrl, Cmd, Shift o el botón de en medio siguen abriendo otra pestaña ── */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-hoja]');
  if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || typeof HTMLDialogElement === 'undefined') return;
  e.preventDefault();
  let d = $('#hoja-web');
  if (!d) {
    document.body.insertAdjacentHTML('beforeend', `<dialog class="hoja hoja--web" id="hoja-web" aria-labelledby="hoja-web-titulo">
      <div class="hoja__marco">
        <div class="hoja__cabeza"><h2 class="hoja-web__titulo" id="hoja-web-titulo"></h2>
          <button class="icono-boton" type="button" data-cerrar aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        <div class="hoja-web__caja"><p class="texto-apoyo hoja-web__cargando">Cargando…</p><iframe class="hoja-web__marco" referrerpolicy="no-referrer"></iframe></div>
        <div class="hoja__pie"><p class="texto-apoyo">Si no se ve aquí, <a target="_blank" rel="noopener">ábrelo aparte</a>.</p></div>
      </div></dialog>`);
    d = $('#hoja-web');
    d.addEventListener('click', ev => { if (ev.target === d || ev.target.closest('[data-cerrar]')) d.close(); });
    $('iframe', d).addEventListener('load', ev => ev.target.classList.add('es-cargado'));
  }
  const f = $('iframe', d);
  $('#hoja-web-titulo', d).textContent = f.title = a.dataset.hoja;
  $('.hoja__pie a', d).href = a.href;
  if (f.getAttribute('src') !== a.href) { f.classList.remove('es-cargado'); f.src = a.href; clearTimeout(f.espera); f.espera = setTimeout(() => f.classList.add('es-cargado'), 3000); }   // el DOF tarda en avisar que cargó
  d.showModal();
});
