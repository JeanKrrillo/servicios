/* musica.js · la música de fondo de todas las páginas.
   Suena con Web Audio y no con <audio>: así el celular no la trata como una canción, no sale en sus notificaciones
   y nadie la puede adelantar o regresar. Suena al 75 % y entra despacio al llegar a la página (en cuanto el navegador
   lo deja, casi siempre con el primer toque). Al salir de la app o cambiar de pestaña se apaga con una transición corta
   y se detiene, y al volver entra otra vez despacio. Silenciar y volver a poner también se funden, nunca de golpe.
   Son tres canciones en cadena: la primera desde el inicio, The Weighted Pause desde el segundo 17 y The Architecture of
   Calm desde el 30; en los últimos CRUCE segundos de cada una entra la siguiente. Al cambiar de página sigue en la misma
   canción y segundo (sessionStorage); el silencio se recuerda (localStorage). Nada se descarga antes de poder sonar. */
(() => {
  const CLAVE = 'jk-silencio', DONDE = 'jk-musica';
  const VOLUMEN = .75, CRUCE = 6, PRECARGA = 30, ENTRA = 4, VUELVE = 1.5, SALE = 1.2;
  const raiz = new URL('../marca/', document.currentScript.src);
  /* Opus solo donde el navegador asegura que lo lee ("probably"); si falla se cambia solo a MP3 */
  let ext = new Audio().canPlayType('audio/webm; codecs="opus"') === 'probably' ? '.webm' : '.mp3';
  const PISTAS = [['musica', 0], ['musica-2_the_weighted_pause', 17], ['musica-3_the_architecture_of_calm', 30]];
  const leer = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
  const guardar = (s, k, v) => { try { s.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const guardado = (() => { try { return JSON.parse(leer(sessionStorage, DONDE)); } catch (e) { return null; } })();
  let silencio = leer(localStorage, CLAVE) === '1';

  let ctx = null, maestro = null, sonando = null, cruce = 0, precarga = 0, avisado = false;
  const buffers = new Map();
  const AC = window.AudioContext || window.webkitAudioContext;
  function contexto() {
    if (ctx || !AC) return ctx;
    /* 32 kHz basta para estas canciones en mono y gasta la mitad de memoria al decodificar */
    try { ctx = new AC({ sampleRate: 32000, latencyHint: 'playback' }); } catch (e) { ctx = new AC(); }
    maestro = ctx.createGain();
    maestro.gain.value = 0;
    maestro.connect(ctx.destination);
    return ctx;
  }
  const decodificar = b => new Promise((ok, mal) => ctx.decodeAudioData(b, ok, mal));
  function pedir(i) {
    if (!buffers.has(i)) buffers.set(i, fetch(new URL(PISTAS[i][0] + ext, raiz)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then(decodificar)
      .catch(e => { buffers.delete(i); if (ext === '.mp3') throw e; ext = '.mp3'; return pedir(i); }));
    return buffers.get(i);
  }
  const fundir = (valor, segundos) => {
    const g = maestro.gain, a = ctx.currentTime;
    g.cancelScheduledValues(a);
    g.setValueAtTime(g.value, a);
    g.linearRampToValueAtTime(valor, a + segundos);
  };
  const segundo = () => (sonando ? (ctx.currentTime - sonando.base) % sonando.dur : 0);

  async function tocar(i, desde, entrando = 0) {
    const buf = await pedir(i);
    const fuente = ctx.createBufferSource(), g = ctx.createGain(), a = ctx.currentTime;
    fuente.buffer = buf;
    fuente.connect(g).connect(maestro);
    g.gain.setValueAtTime(entrando ? 0 : 1, a);
    if (entrando) g.gain.linearRampToValueAtTime(1, a + entrando);
    const t = Math.min(desde, Math.max(0, buf.duration - CRUCE - 1));
    fuente.start(a, t);
    sonando = { i, fuente, g, base: a - t, dur: buf.duration };
    programar();
  }
  /* pide la siguiente PRECARGA segundos antes y la cruza en los últimos CRUCE */
  function programar() {
    clearTimeout(cruce); clearTimeout(precarga);
    if (!sonando || ctx.state !== 'running') return;
    const p = sonando, falta = p.dur - segundo();
    precarga = setTimeout(() => pedir((p.i + 1) % PISTAS.length).catch(() => {}), Math.max(0, falta - PRECARGA) * 1000);
    cruce = setTimeout(() => {
      if (sonando !== p) return;
      const a = ctx.currentTime;
      p.g.gain.setValueAtTime(1, a);
      p.g.gain.linearRampToValueAtTime(0, a + CRUCE);
      p.fuente.stop(a + CRUCE + .1);
      const j = (p.i + 1) % PISTAS.length;
      tocar(j, PISTAS[j][1], CRUCE).catch(() => {});
    }, Math.max(0, falta - CRUCE) * 1000);
  }

  /* Suena si el navegador ya lo deja; si no, espera al primer toque */
  /* Varios toques seguidos (pointerup, touchend y click del mismo dedo) no arrancan dos veces */
  let arrancando = null;
  const arrancar = (entrada = ENTRA) => (arrancando ||= intentar(entrada).finally(() => { arrancando = null; }));
  async function intentar(entrada) {
    if (silencio || !contexto()) return;
    try { await ctx.resume(); } catch (e) { /* aún bloqueado */ }
    if (ctx.state !== 'running') return;
    yaSuena();
    if (!sonando) {
      const i = guardado && PISTAS[guardado.pista] ? guardado.pista : 0;
      try { await tocar(i, guardado ? guardado.t : PISTAS[i][1]); } catch (e) { return; }
    } else programar();
    fundir(VOLUMEN, entrada);
    if (!avisado) { avisado = true; avisar(); }
  }
  let parar = 0;
  function apagar(segundos = SALE) {
    if (!ctx || ctx.state !== 'running') return;
    clearTimeout(cruce); clearTimeout(precarga); clearTimeout(parar);
    fundir(0, segundos);
    parar = setTimeout(() => { if (silencio || document.hidden) ctx.suspend().catch(() => {}); }, segundos * 1000 + 60);
  }

  /* ═══ BOTÓN ═══ */
  const ICONO = {
    sonando: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
    callado: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'
  };
  const boton = document.createElement('button');
  boton.type = 'button';
  const pintar = () => {
    const texto = silencio ? 'Poner música' : 'Silenciar música';
    boton.setAttribute('aria-pressed', String(silencio));
    boton.setAttribute('aria-label', texto);
    boton.title = texto;
    boton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONO[silencio ? 'callado' : 'sonando']}</svg>`;
  };

  /* Aviso de cómo silenciar: sale al empezar a sonar, en cada carga de página */
  const avisar = () => {
    const r = boton.getBoundingClientRect();
    if (silencio || !r.width) return;
    const aviso = document.createElement('span');
    aviso.className = 'musica-aviso';
    aviso.setAttribute('role', 'status');
    aviso.textContent = `${matchMedia('(hover: none)').matches ? 'Toca' : 'Clic'} para silenciar ↑`;
    aviso.style.top = `${r.bottom + 14}px`;
    aviso.style.right = `${Math.max(8, innerWidth - r.right)}px`;
    document.body.append(aviso);
    aviso.addEventListener('animationend', () => aviso.remove(), { once: true });
  };

  boton.addEventListener('click', e => {
    e.stopPropagation();
    silencio = !silencio;
    guardar(localStorage, CLAVE, silencio ? '1' : '0');
    pintar();
    if (silencio) apagar(.6);
    else { contexto(); ctx && ctx.resume().catch(() => {}); arrancar(VUELVE); }
  });
  pintar();
  const vecino = document.querySelector('[data-tema-boton]') || document.querySelector('#menu-header');
  boton.className = vecino?.matches('#menu-header') ? 'jk-header__menu musica-boton' : 'icono-boton musica-boton';
  if (vecino) vecino.before(boton); else document.body.append(boton);

  /* El permiso para sonar llega al LEVANTAR el dedo (pointerup, touchend, click) o con una tecla; resume() tiene que
     llamarse dentro de ese mismo toque, sobre todo en iPhone */
  const TOQUES = ['pointerup', 'touchend', 'click', 'keydown'];
  const primerToque = e => {
    if (silencio || boton.contains(e.target) || !contexto()) return;
    ctx.resume().catch(() => {});
    arrancar();
  };
  TOQUES.forEach(t => addEventListener(t, primerToque, { passive: true }));
  function yaSuena() { TOQUES.forEach(t => removeEventListener(t, primerToque)); }
  /* Al cargar solo se intenta si el navegador ya lo permite (sin eso, crear el sonido antes del toque solo deja avisos) */
  const permitido = () => navigator.getAutoplayPolicy?.('audiocontext') === 'allowed' || navigator.userActivation?.hasBeenActive;
  const alCargar = () => { if (permitido()) arrancar(); };
  if (document.readyState === 'complete') alCargar(); else addEventListener('load', alCargar, { once: true });

  /* Salir de la app o de la pestaña: se apaga despacio y se detiene; al volver, entra otra vez */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) apagar();
    else if (!silencio && sonando) { clearTimeout(parar); ctx.resume().then(() => { programar(); fundir(VOLUMEN, VUELVE); }).catch(() => {}); }
  });
  addEventListener('pagehide', () => {
    if (sonando) guardar(sessionStorage, DONDE, JSON.stringify({ pista: sonando.i, t: segundo() }));
    if (ctx && ctx.state === 'running') fundir(0, .25);
  });
})();
