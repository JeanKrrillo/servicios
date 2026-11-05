/* servicios.js · carrusel de la portada, ¿Qué necesitas?, la barra de los 11, casos resueltos, referencias y saludo.
   Los servicios con su precio, la calculadora y el pedido viven en calculadora.js */

const POR_PIEZA_MS = 4500;          // escena de servicio, 4 a 5 s
const ACTO_DE = i => (i < 3 ? 0 : i < 8 ? 1 : 2);

/* ═══ CARRUSEL ═══
   Las 11 piezas están animadas. Se animan solo las que se ven (la actual y sus dos vecinas),
   y Lottie se carga después de que la página ya se pintó, así la portada abre al instante
   con los dibujos quietos y luego cobran vida. */
const Carrusel = {
  idx: 0,
  piezas: [],
  timer: null,
  anims: new Map(),      // índice → animación montada
  listo: false,          // true cuando ya se puede cargar Lottie
  visible: true,
  pausado: false,

  iniciar() {
    const pista = $('#carrusel-pista');
    if (!pista) return;
    pista.innerHTML = DEFENSAS.map((d, i) => `
      <button class="pieza" type="button" data-i="${i}" aria-label="${d.nombre}">
        <img class="pieza__img tinta-img" data-src="animaciones/iconos/${d.icono}.svg" alt="" width="2048" height="2048" decoding="async">
        <span class="pieza__anim" aria-hidden="true"></span>
      </button>`).join('');
    this.piezas = $$('.pieza', pista);

    pista.addEventListener('click', e => {
      const p = e.target.closest('.pieza');
      if (!p) return;
      const i = +p.dataset.i;
      if (i === this.idx) abrirDefensa(DEFENSAS[i].id);
      else { this.mostrar(i); this.reiniciar(); }
    });

    /* Deslizar con el dedo: solo transform, sin arrastre continuo */
    let x0 = null;
    pista.addEventListener('pointerdown', e => { x0 = e.clientX; }, { passive: true });
    pista.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) { this.mostrar(this.idx + (dx < 0 ? 1 : -1)); this.reiniciar(); }
    }, { passive: true });

    const carrusel = $('#carrusel');
    /* El lado de la pieza sale del alto y ancho reales del carrusel, sin cortar el dibujo */
    new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      carrusel.style.setProperty('--lado', Math.min(w * .72, h * .96, 384) + 'px');
      carrusel.style.setProperty('--paso', Math.min(w * .42, h * .7, 272) + 'px');
    }).observe(carrusel);
    carrusel.addEventListener('pointerenter', () => { this.pausado = true; });
    carrusel.addEventListener('pointerleave', () => { this.pausado = false; });
    carrusel.addEventListener('focusin', () => { this.pausado = true; });
    carrusel.addEventListener('focusout', () => { this.pausado = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        this.anims.forEach(m => (this.visible ? m.anim.play() : m.anim.pause()));
        if (this.visible) this.reiniciar(); else this.detener();
      }, { threshold: .25 }).observe(carrusel);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? this.detener() : this.reiniciar()));

    this.mostrar(0, true);
    this.reiniciar();

    /* Lottie entra cuando el navegador ya terminó lo importante */
    const despues = () => {
      this.listo = true;
      this.piezas.forEach((p, k) => {
        const rel = this.relativo(k);
        const img = $('.pieza__img', p);
        if ((Math.abs(rel) <= 1 || rel === 2) && img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
      });
      this.animar(true);
      const siguientes = [2, 3, 4].map(k => DEFENSAS[(this.idx + k) % DEFENSAS.length].anim);
      (window.requestIdleCallback || setTimeout)(() => Lottie.precargar(siguientes), { timeout: 3000 });
    };
    const enReposo = () => (window.requestIdleCallback || setTimeout)(despues, { timeout: 1200 });
    if (document.readyState === 'complete') enReposo(); else addEventListener('load', enReposo, { once: true });
  },

  relativo(k) {
    const n = this.piezas.length;
    let rel = k - this.idx;
    if (rel > n / 2) rel -= n;
    if (rel < -n / 2) rel += n;
    return rel;
  },

  mostrar(i, primera = false) {
    const n = this.piezas.length;
    this.idx = ((i % n) + n) % n;
    this.piezas.forEach((p, k) => {
      const rel = this.relativo(k);
      p.style.setProperty('--x', Math.max(-2, Math.min(2, rel)));
      p.classList.toggle('es-actual', rel === 0);
      p.classList.toggle('es-vecina', Math.abs(rel) === 1);
      p.tabIndex = Math.abs(rel) <= 1 ? 0 : -1;
      p.setAttribute('aria-hidden', Math.abs(rel) <= 1 ? 'false' : 'true');
      /* el dibujo quieto se pide solo para lo que se ve y la pieza que sigue;
         al abrir, solo el del centro, para que nada compita con la primera pintura */
      if (primera ? rel === 0 : Math.abs(rel) <= 1 || rel === 2) {
        const img = $('.pieza__img', p);
        if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
      }
    });

    const d = DEFENSAS[this.idx];
    const texto = $('.carrusel__texto');
    const poner = () => {
      $('#portada-nombre').textContent = d.nombre;
      $('#portada-detalle').textContent = d.detalle;
      texto.classList.remove('cambia');
    };
    if (primera) poner();
    else { texto.classList.add('cambia'); setTimeout(poner, 250); }

    const acto = ACTO_DE(this.idx);
    $$('#actos li').forEach((li, k) => li.classList.toggle('es-actual', k === acto));

    this.animar();
    if (this.listo) Lottie.precargar([DEFENSAS[(this.idx + 2) % n].anim]);
  },

  animar(primera = false) {
    if (!this.listo || reduceMovimiento()) return;
    const ver = new Set([-1, 0, 1].map(r => (this.idx + r + this.piezas.length) % this.piezas.length));
    this.anims.forEach((m, k) => {
      if (ver.has(k)) return;
      m.destruir();
      this.anims.delete(k);
      this.piezas[k].classList.remove('tiene-anim');
      $('.pieza__anim', this.piezas[k]).replaceChildren();
    });
    ver.forEach(async k => {
      if (this.anims.has(k)) return;
      this.anims.set(k, { anim: { play() {}, pause() {} }, destruir() {} });   // reservado mientras carga
      const pieza = this.piezas[k];
      try {
        const m = await Lottie.montar($('.pieza__anim', pieza), DEFENSAS[k].anim, { desde: primera && k === this.idx ? 'intro' : 'ciclo' });
        if (!this.anims.has(k)) { m.destruir(); return; }
        this.anims.set(k, m);
        if (!this.visible) m.anim.pause();
        pieza.classList.add('tiene-anim');
      } catch (e) { this.anims.delete(k); /* sin datos: se queda el dibujo quieto */ }
    });
  },

  reiniciar() {
    this.detener();
    if (reduceMovimiento() || !this.visible) return;
    this.timer = setInterval(() => {
      if (!this.pausado && !$('#pedido')?.open) this.mostrar(this.idx + 1);
    }, POR_PIEZA_MS);
  },

  detener() { clearInterval(this.timer); this.timer = null; }
};

/* Una referencia a un servicio (#defensa-2fa) elige su necesidad y abre ese servicio en la calculadora */
const abrirDefensa = id => Calculadora.abrirServicio(id);

/* La guía de 4 etapas, como una transferencia en el banco: la que toca se ilumina, las que siguen quedan en gris y las hechas
   en normal. Avanza al tocar y nunca regresa; tocar una etapa en gris la vuelve la actual, así nada se bloquea */
function pasoSiguiente(n = 0) {
  const s = $('#necesidad');
  if (!s) return;
  const p = s.dataset.paso = Math.max(+s.dataset.paso || 1, n);
  $$('.etapa', s).forEach(e => { const k = +e.dataset.n; e.classList.toggle('es-actual', k === p); e.classList.toggle('es-pendiente', k > p); });
}

/* ═══ ¿QUÉ NECESITAS? ═══
   Al entrar se ven los 11, así quien busca algo concreto lo encuentra aunque no sepa en qué necesidad está.
   Elegir una sube sus servicios al principio con su dibujo en ocre y deja los demás abajo en tinta, a la vista y tocables (data-ver lo lee
   calculadora.js al repintar), y enciende sus dibujos en la barra de los 11; tocarla otra vez los deja a todos iguales */
function elegirGrupo(id) {
  $$('#grupos [data-grupo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grupo === id)));
  const cont = $('#calc-servicios'), g = GRUPOS.find(x => x.id === id);
  if (cont) { cont.dataset.ver = id || ''; $$('.calc-servicio', cont).forEach(d => d.classList.toggle('es-otro', !!id && d.dataset.grupo !== id)); }
  Mapa.marcar(g ? g.defensas : []);
}

/* Barra de las 11 defensas bajo las necesidades: todas en tinta y quietas; las de lo elegido en ocre y animadas.
   Así se ve que son 11 y cuáles se están mostrando; tocar uno abre ese servicio aunque sea de otra necesidad. Solo se animan las encendidas (2 a 4), para no cargar la portada */
const Mapa = {
  anims: new Map(),
  /* Los dibujos comparten lienzo pero ocupan distinto: [presencia, corrimiento x, corrimiento y], medidos en píxeles
     pintados (2026-10-14); presencia es el promedio del lado mayor y la raíz del área, así uno ancho y bajito no se ve chico. Cada uno se agranda a la misma presencia y se centra, así se ven del mismo tamaño */
  OPTICA: {
    '2fa': [.781, 0, -.004], correo: [.713, .006, .027], parental: [.498, 0, -.004], limpieza: [.672, .02, .039],
    rapidez: [.617, -.128, -.025], fotos: [.74, .006, .04], codigo: [.539, .041, -.042], video: [.727, 0, -.061],
    web: [.623, 0, 0], app: [.702, 0, 0], casa: [.678, -.009, -.008]
  },
  ajuste(id) {
    const [lado, dx, dy] = this.OPTICA[id] || [.8, 0, 0], esc = Math.min(.76 / lado, 1.6);
    return `--esc:${esc.toFixed(3)};--dx:${(-dx * esc * 100).toFixed(1)}%;--dy:${(-dy * esc * 100).toFixed(1)}%`;
  },
  pintar() {
    const cont = $('#mapa-defensas');
    if (!cont) return;
    /* la ruta va completa: un url() dentro de una variable se resolvería desde css/ */
    /* en el orden de las necesidades, así las de cada una quedan juntas y se encienden como un solo tramo */
    const orden = GRUPOS.flatMap(g => g.defensas.map((id, i) => ({ d: DEFENSAS.find(x => x.id === id), corte: i === 0 && g !== GRUPOS[0] })));
    cont.innerHTML = orden.map(({ d, corte }) => `<button class="mini${corte ? ' mini--corte' : ''}" type="button" data-defensa="${d.id}" aria-label="${d.nombre}" title="${d.nombre}" style="--icono:url('${new URL(`animaciones/iconos/${d.icono}.svg`, location.href).href}');${this.ajuste(d.id)}"><span class="mini__anim" aria-hidden="true"></span></button>`).join('');
    cont.addEventListener('click', e => { const b = e.target.closest('[data-defensa]'); if (b) abrirDefensa(b.dataset.defensa); });
  },
  /* Las animaciones de la barra esperan a que la portada cargó y el navegador quedó libre (regla 12): antes, solo color */
  listo: false,
  ultimos: [],
  marcar(ids) {
    this.ultimos = ids;
    if (!this.listo && !this.esperando) {
      this.esperando = true;
      const empezar = () => (window.requestIdleCallback || setTimeout)(() => { this.listo = true; this.marcar(this.ultimos); });
      if (document.readyState === 'complete') empezar(); else addEventListener('load', empezar, { once: true });
    }
    $$('#mapa-defensas .mini').forEach(b => {
      const id = b.dataset.defensa, on = ids.includes(id);
      b.classList.toggle('es-activa', on);
      b.setAttribute('aria-current', String(on));
      const m = this.anims.get(id);
      if (!on && m) { this.anims.delete(id); m.then(x => x && x.destruir()); b.classList.remove('tiene-anim'); }
      if (on && !m && this.listo && !reduceMovimiento() && typeof Lottie !== 'undefined') {
        const lienzo = $('.mini__anim', b);
        this.anims.set(id, Lottie.montar(lienzo, DEFENSAS.find(d => d.id === id).anim, { desde: 'ciclo' })
          .then(x => { if (this.anims.has(id)) { b.classList.add('tiene-anim'); return x; } x.destruir(); })
          .catch(() => null));
      }
    });
  }
};


function pintarGrupos() {
  const cont = $('#grupos');
  if (!cont) return;
  const SIMBOLO = {
    cuenta: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    equipo: '<rect x="3" y="5" width="13" height="10" rx="1.5"/><path d="M1.5 18h15"/><rect x="17.5" y="9" width="5" height="10" rx="1"/>',
    recuerdos: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
    crear: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/><path d="M18 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'
  };
  const tarjeta = (atributos, id, g) => `<button class="grupo" type="button" ${atributos}><svg class="grupo__simbolo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SIMBOLO[id]}</svg><span class="grupo__titulo">${g.corto}.</span><span class="grupo__linea">${g.texto}</span></button>`;
  cont.innerHTML = GRUPOS.map(g => tarjeta(`data-grupo="${g.id}" aria-pressed="false"`, g.id, g)).join('');
  cont.addEventListener('click', e => {
    const b = e.target.closest('[data-grupo]');
    if (!b) return;
    elegirGrupo(b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.grupo);
    pasoSiguiente(2);
  });
}

/* ═══ BUSCADOR (2026-10-23, en lugar de Otra cosa) ═══
   Escribes lo que te pasa y salen hasta 3 servicios que más se parecen, buscando en su nombre, sus textos, sus situaciones
   y CLAVES, sin importar acentos. ¿No tienes idea? abre burbujas de ejemplo que llenan el buscador. Si nada coincide se
   ofrece escribirlo con tus palabras en el pedido. Lo que se escribe no se anota en el registro, solo el servicio elegido */
const Buscador = {
  limpio: t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  VACIAS: new Set('que con los las del por para una uno unos mis tus como esta este esto pero mas muy sin hay ser quiero tengo necesito algo hacer ayuda'.split(' ')),
  iniciar() {
    const campo = $('#buscar-servicio');
    if (!campo) return;
    campo.value = '';   // al recargar el navegador devolvía aquí lo escrito en otro campo, como un 124
    this.textos = DEFENSAS.map(d => ({ d, fuerte: this.limpio(`${d.nombre} ${d.detalle} ${CLAVES[d.id] || ''}`), todo: this.limpio(`${d.linea} ${d.mas} ${d.situaciones.join(' ')}`) }));
    campo.addEventListener('input', () => this.mostrar(campo.value));
    $('#buscar-burbujas').innerHTML = SUGERENCIAS.map(([t]) => `<li><button class="burbuja" type="button">${t}</button></li>`).join('');
    $('.buscar').addEventListener('click', e => {
      const idea = e.target.closest('.buscar__idea'), burbuja = e.target.closest('.burbuja'), res = e.target.closest('[data-defensa]'), otra = e.target.closest('[data-otra-texto]');
      if (idea) { const abre = idea.getAttribute('aria-expanded') !== 'true'; idea.setAttribute('aria-expanded', String(abre)); $('#buscar-burbujas').hidden = !abre; }
      if (burbuja) {
        campo.value = burbuja.textContent; this.mostrar(campo.value, SUGERENCIAS.find(([t]) => t === campo.value)[1]);
        // en celular la lista queda arriba de las burbujas: sube a la vista para que se note qué cambió
        $('#buscar-resultados').scrollIntoView({ block: 'nearest', behavior: reduceMovimiento() ? 'auto' : 'smooth' });
      }
      if (res) { Registro.anotar('buscar', { servicio: res.dataset.defensa }); pasoSiguiente(3); abrirDefensa(res.dataset.defensa); }
      if (otra) Calculadora.pedirConTexto(campo.value.trim());
    });
  },
  /* puntos por palabra: en el nombre o las claves vale 2, en los textos 1; las palabras largas se comparan sin su final */
  buscar(q) {
    const palabras = this.limpio(q).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !this.VACIAS.has(w)).map(w => (w.length > 5 ? w.slice(0, -2) : w));
    return this.textos.map(({ d, fuerte, todo }) => ({ d, n: palabras.reduce((n, w) => n + (fuerte.includes(w) ? 2 : todo.includes(w) ? 1 : 0), 0) }))
      .filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 3).map(x => x.d);
  },
  mostrar(q, primero) {
    const lista = $('#buscar-resultados');
    lista.classList.toggle('es-sugerida', !!primero);   // borde ocre solo si vino de una burbuja de ¿No tienes idea?
    if (!q.trim()) { lista.innerHTML = ''; return; }
    let hallados = this.buscar(q);
    if (primero) hallados = [DEFENSAS.find(d => d.id === primero), ...hallados.filter(d => d.id !== primero)].slice(0, 3);
    lista.innerHTML = hallados.length
      ? hallados.map(d => `<li><button class="buscar__resultado" type="button" data-defensa="${d.id}"><span class="calc-servicio__icono" aria-hidden="true" style="--icono:url('${new URL(`animaciones/iconos/${d.icono}.svg`, location.href).href}')"></span><span><b>${d.nombre}</b><small>${d.linea}</small></span></button></li>`).join('')
      : `<li class="buscar__nada">No encontré un servicio para eso. <button class="ref" type="button" data-otra-texto>Escríbelo con tus palabras</button></li>`;
  }
};

/* ═══ REGISTRO DE CLICS ═══
   Solo si la persona dijo que sí en el aviso de privacidad. Tocar una situación dice cuál es su problema principal,
   así que se anota con el servicio y la situación. Viaja cifrado como todo lo demás (historial.js) */
const Registro = {
  clics: [],
  anotar(tipo, datos = {}) {
    if (window.JK_CONSENT !== 'si' || typeof Historial === 'undefined' || typeof Identidad === 'undefined') return;
    this.clics.push({ t: new Date().toISOString(), pagina: location.pathname.split('/').pop() || 'index.html', tipo, ...datos });
    Historial.encolar({ id: Identidad.id(), actualizado: new Date().toISOString(), prueba: (typeof window !== 'undefined' && window.JK_LAB_PRUEBA) || undefined, clics: this.clics.slice(-200) });
  }
};

/* ═══ CASOS RESUELTOS ═══
   Los datos los arma privado/casos.py publicar: seudónimo, servicio, año y textos limpios. */
function semilla(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}

/* Sello de cada persona: su pigmento llena el círculo de pincel y la inicial va en tinta
   o papel, la que contraste. Es el único lugar donde entra un color fuera de tinta, papel y ocre. */
function sello(usuario, color) {
  const h = semilla(usuario);
  const giro = h % 360, hueco = 8 + (h >> 9) % 14;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  const claro = (r * 299 + g * 587 + b * 114) / 1000 > 150;
  return `<svg class="sello" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="19" fill="${color}"/>
    <circle cx="24" cy="24" r="19" pathLength="100" fill="none" stroke="currentColor" stroke-width="3.2"
      stroke-linecap="round" stroke-dasharray="${100 - hueco} ${hueco}" transform="rotate(${giro} 24 24)"/>
    <text x="24" y="30.5" text-anchor="middle" fill="${claro ? '#121217' : '#f3f2ee'}">${usuario.charAt(0).toUpperCase()}</text>
  </svg>`;
}

function cargarCasos() {
  const seccion = $('#casos');
  if (!seccion) return;
  const pedir = () => Lottie.cargarScript('js/datos-casos.js').then(pintarCasos).catch(() => { $('#casos-vacio').hidden = false; });
  if (!('IntersectionObserver' in window)) return pedir();
  const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); pedir(); } }, { rootMargin: '600px 0px' });
  obs.observe(seccion);
}

/* Lo que distingue a cada caso: lo encontrado en frases cortas, y lo entregado en una línea.
   Solo resume lo que ya dice el reporte (datos-casos.js), sin sumar acciones que no están ahí */
const HALLAZGO = [
  [/repetía contraseñas/, 'contraseñas repetidas'],
  [/códigos llegaban por SMS/, 'códigos por SMS'],
  [/correo solo se recuperaba por SMS/, 'correo atado al SMS'],
  [/no sabía cómo se recuperaba su correo/, 'correo sin recuperación clara'],
  [/número viejo/, 'cuentas con un número viejo'],
  [/no tenía códigos de emergencia/, 'sin códigos de emergencia'],
  [/Wi-Fi público/, 'Wi-Fi público sin protección'],
  [/navegador guardaba sus contraseñas/, 'contraseñas guardadas en el navegador'],
  [/(\d+) cuentas importantes dependían del SMS/, m => `${m[1]} cuentas importantes atadas al SMS`]
];
function resumirCaso(c) {
  const hallazgos = HALLAZGO.map(([re, t]) => { const m = c.encontrado.match(re); return m && (typeof t === 'function' ? t(m) : t); }).filter(Boolean);
  const n = c.entregado.match(/con (\d+) cuentas/);
  const entrega = /^Una guía hecha para su caso/.test(c.entregado) ? `Guía para ${n ? n[1] + ' cuentas' : 'sus cuentas'}, en orden de prioridad` : c.entregado;
  return { hallazgos, entrega };
}

const attr = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function pintarCasos() {
  const lista = $('#lista-casos');
  if (!lista) return;
  const casos = typeof CASOS_PUBLICOS !== 'undefined' ? CASOS_PUBLICOS : [];
  $('#casos-vacio').hidden = casos.length > 0;
  if (typeof PERSONAS_ATENDIDAS !== 'undefined' && PERSONAS_ATENDIDAS) {
    $('#casos-cuenta').innerHTML = `<span class="numero">${PERSONAS_ATENDIDAS}</span> personas atendidas · reportes de entrega, sin datos de nadie`;
  }
  /* Por servicio, con su dibujo: cada caso es su sello y su nombre, y al tocarlo dice qué se hizo y qué se encontró.
     El tiempo y la cuota de cada caso todavía no están en los reportes, así que no se muestran hasta tenerlos */
  const icono = d => new URL(`animaciones/iconos/${d.icono}.svg`, location.href).href;
  lista.innerHTML = DEFENSAS.map(d => ({ d, cs: casos.filter(c => c.defensa === d.id) })).filter(g => g.cs.length).map(({ d, cs }) => `
    <div class="casos-grupo aparece">
      <p class="casos-grupo__cabeza"><span class="calc-servicio__icono" aria-hidden="true" style="--icono:url('${icono(d)}')"></span><a class="ref" href="#defensa-${d.id}">${d.nombre}</a> <span class="tema__cuenta">${cs.length}</span></p>
      <ul class="sellos">${cs.map(c => {
        const { hallazgos, entrega } = resumirCaso(c);
        const texto = `${entrega}.${hallazgos.length ? ` Se encontró ${hallazgos.join(', ')}.` : ''}${c.no_se_pudo ? ` No se pudo ${c.no_se_pudo}` : ''}`;
        return `<li><button type="button" class="caso-sello" data-glosa-titulo="${attr(`@${c.usuario}${c.nivel ? `, nivel ${c.nivel}` : ''}, ${c.anio}`)}" data-glosa-texto="${attr(texto)}"
          data-glosa-nota="${attr(c.historia ? `${c.usuario} es su nombre en esta página. ${c.historia}` : '')}" data-glosa-color="${c.color}">${sello(c.usuario, c.color)}<span class="caso-sello__nombre">${c.usuario}</span></button></li>`;
      }).join('')}</ul>
    </div>`).join('');
  Glosa.marcar($('#casos'));
  if (reduceMovimiento() || !('IntersectionObserver' in window)) $$('.casos-grupo', lista).forEach(c => c.classList.add('es-visible'));
  else iniciarApariciones();
}

/* ═══ REFERENCIAS INTERNAS ═══
   Un texto que menciona algo de otra parte de la página lleva a ello: baja, abre lo que esté plegado
   (una ficha de defensa elige además su necesidad) y lo marca un momento para que se vea a dónde llegaste */
function irA(hash) {
  if (hash.startsWith('#defensa-')) return abrirDefensa(hash.slice(9));
  const el = $(hash);
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  window.saltarA ? saltarA(el) : el.scrollIntoView({ block: 'start' });
  el.classList.remove('es-llegada'); void el.offsetWidth; el.classList.add('es-llegada');
}
document.addEventListener('click', e => {
  const a = e.target.closest('a.ref[href^="#"]');
  if (!a) return;
  e.preventDefault();
  irA(a.getAttribute('href'));
});

/* ═══ SALUDO ═══
   El mismo del autodiagnóstico: la hora y el apodo de la visita (identidad.js da el número, apodo.js el nombre).
   Al tocar el apodo dice que es tu nombre en esta página y qué significa (2.3).
   Las palabras del nombre pesan poco y no hacen falta para leer, así que se piden cuando la portada ya cargó (regla 12) */
function saludar() {
  const caja = $('#saludo');
  if (!caja || typeof Identidad === 'undefined') return;
  Promise.all(['diagnostico/js/nombres-datos.js', 'diagnostico/js/apodo.js'].map(src => Lottie.cargarScript(src))).then(() => Apodo.asignar(Identidad.id())).then(ap => {
    const info = `Es tu nombre en esta página.${ap.descripcion ? ` ${ap.descripcion}` : ''}`;
    $('#saludo-texto').innerHTML = ap.texto
      ? `${Apodo.saludo()}, <button type="button" class="glosa-termino" data-glosa-titulo="${attr(ap.texto)}" data-glosa-texto="${attr(info)}"><b>${ap.texto}</b></button>`
      : Apodo.saludo();
    caja.hidden = false;
  }).catch(() => {});   // sin saludo la página sirve igual
}
addEventListener('load', () => (window.requestIdleCallback || setTimeout)(saludar));

document.addEventListener('DOMContentLoaded', () => {
  pasoSiguiente();
  Buscador.iniciar();
  $('#necesidad')?.addEventListener('pointerdown', e => { const et = e.target.closest('.etapa'); if (et) pasoSiguiente(+et.dataset.n); });
  $('#necesidad')?.addEventListener('focusin', e => { const et = e.target.closest('.etapa'); if (et) pasoSiguiente(+et.dataset.n); });
  Mapa.pintar();
  pintarGrupos();
  cargarCasos();
  iniciarApariciones();
  Carrusel.iniciar();

  /* Laboratorio: el mensaje sale desde la página, sin copiar ni cambiar de app */
  const lab = $('#boton-laboratorio');
  lab?.addEventListener('click', async () => {
    lab.disabled = true;
    const ok = typeof Historial !== 'undefined' && await Historial.enviar({ tipo: 'laboratorio', mensaje: 'Hola, quiero participar en el laboratorio.' });
    avisar(ok ? 'Listo, Jean ya lo recibió. Te responde por donde nos dejaste.' : `No se pudo enviar. Intenta de nuevo o escríbele a ${CONTACTO.usuario} en Instagram.`);
    lab.disabled = !!ok;
  });
});
