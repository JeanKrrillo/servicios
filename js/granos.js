/* granos.js · los dibujos se deshacen en arena al tocarlos y se vuelven a armar.
   Idea de interactive-particles de Bruno Imbrizi (github.com/brunoimbrizi/interactive-particles): cada píxel
   con tinta es un grano, y una "textura de toque" guarda la estela del dedo y la apaga con la edad.
   Reescrita sin Three.js ni WebGL, en lienzo 2D:
   - El grano es un píxel de pantalla y se lleva su color y su transparencia reales (también el suavizado de
     los bordes), así lo que vuela es el mismo dibujo deshecho y nunca se ve borroso.
   - Nada se recorre entero: en cada cuadro solo se leen los píxeles de las celdas que la estela toca.
   - Funciona igual sobre una imagen fija que sobre un Lottie que se anima (se lee el cuadro de ese momento).
   - En reposo es el dibujo original, nítido, sin ningún salto al empezar o al terminar.
   Uso: Granos.vestir(img) · Granos.lottie(contenedor, nombre, { modo: 'congelar' | 'vivo' }) */
const Granos = (() => {
  const MALLA = 32, VIDA = 150;   // celdas de la estela y cuadros que dura un toque (largo: vuelven despacio)
  const LEJOS = 26;               // px de pantalla que puede alejarse un grano con el toque más fuerte
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const piezas = [];
  let cuadro = 0, tinta = [18, 18, 23], ocre = [176, 122, 30], ocre32 = 0xff1e7ab0;

  /* Azar fijo por píxel: cada grano tiene siempre el mismo ángulo y la misma fuerza */
  /* Tablas por pieza, hechas una sola vez: hacia dónde vuela cada píxel (ya multiplicado por su fuerza)
     y si vuela en ocre. Así en cada cuadro no se calcula azar, seno ni coseno */
  function tablas(p, W, H) {
    const n = W * H, dx = new Float32Array(n), dy = new Float32Array(n), oc = new Uint8Array(n);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const r = azar(x, y, 1), a = azar(x, y, 2) * 6.2832, f = .35 + .65 * r;
      dx[i] = Math.cos(a) * f; dy[i] = Math.sin(a) * f; oc[i] = r > .66 ? 1 : 0;
    }
    Object.assign(p, { dx, dy, oc, tw: W, th: H });
  }
  const azar = (x, y, s) => { let h = Math.imul(x * 374761393 + y * 668265263 + s * 974711, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 0) % 10000) / 10000; };

  function teñir() {
    const css = getComputedStyle(document.documentElement), x = document.createElement('canvas').getContext('2d');
    const rgb = v => { x.fillStyle = css.getPropertyValue(v).trim(); const h = x.fillStyle.slice(1); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
    tinta = rgb('--tinta'); ocre = rgb('--ocre');
    ocre32 = (255 << 24 | ocre[2] << 16 | ocre[1] << 8 | ocre[0]) >>> 0;   // en memoria los píxeles van RGBA: en un Uint32 queda ABGR
    piezas.forEach(p => { if (p.fija && p.vector) { teñirFija(p); pintar(p); } });
  }

  /* ── La estela: cada punto nace con la fuerza del movimiento, crece rápido y se apaga despacio ── */
  function regar(p) {
    p.toque.fill(0);
    p.estela = p.estela.filter(e => ++e.edad < VIDA);
    for (const e of p.estela) {
      const f = e.edad < VIDA * .3 ? Math.sin(e.edad / (VIDA * .3) * 1.5708) : Math.sin((1 - (e.edad - VIDA * .3) / (VIDA * .7)) * 1.5708);
      const r = MALLA * .3 * f * e.fuerza, r2 = r * r;
      if (r < .5) continue;
      for (let j = Math.max(0, (e.y - r) | 0); j <= Math.min(MALLA - 1, e.y + r); j++)
        for (let i = Math.max(0, (e.x - r) | 0); i <= Math.min(MALLA - 1, e.x + r); i++) {
          const d2 = (i - e.x) ** 2 + (j - e.y) ** 2;
          if (d2 < r2) p.toque[i + j * MALLA] = Math.min(1, p.toque[i + j * MALLA] + .12 * (1 - Math.sqrt(d2) / r));
        }
    }
  }

  /* ── Pintar: el dibujo entero, y encima los granos levantados. Solo se leen las celdas tocadas ── */
  const medidas = [];   // ms de cada cuadro con granos, para medir desde la consola: Granos.medidas
  function pintar(p) { const t0 = performance.now(); pintarDe(p); if (p.estela.length) { medidas.push(performance.now() - t0); if (medidas.length > 600) medidas.shift(); } }
  function pintarDe(p) {
    const { lienzo, fuente } = p, W = lienzo.width, H = lienzo.height, x = p.ctx;
    if (!fuente) return;
    x.setTransform(1, 0, 0, 1, 0, 0);   // el Lottie de reposo deja su escala puesta en este lienzo; los granos van a escala 1
    x.globalCompositeOperation = 'copy'; x.drawImage(fuente, 0, 0, W, H); x.globalCompositeOperation = 'source-over';
    if (!p.estela.length) return;

    const cw = W / MALLA, ch = H / MALLA, dpr = W / (lienzo.clientWidth || W);
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let j = 0; j < MALLA; j++) for (let i = 0; i < MALLA; i++) if (p.toque[i + j * MALLA] > .015) {
      x0 = Math.min(x0, i * cw); y0 = Math.min(y0, j * ch); x1 = Math.max(x1, (i + 1) * cw); y1 = Math.max(y1, (j + 1) * ch);
    }
    if (x1 <= x0) return;
    x0 |= 0; y0 |= 0; x1 = Math.ceil(Math.min(x1, W)); y1 = Math.ceil(Math.min(y1, H));
    const bw = x1 - x0, bh = y1 - y0;
    /* Imagen fija: sus píxeles ya están guardados. Lottie: se lee solo el pedazo tocado del cuadro de este momento */
    const datos = p.pixeles || p.fctx.getImageData(x0, y0, bw, bh).data, todo = !!p.pixeles, ancho = todo ? W : bw;

    /* Dos capas del tamaño del lienzo: los huecos que dejan los granos y los granos donde caen */
    const hueco = p.hueco || (p.hueco = new ImageData(W, H)), vuelo = p.vuelo || (p.vuelo = new ImageData(W, H));
    const hu = new Uint32Array(hueco.data.buffer), vu = vuelo.data, vu32 = new Uint32Array(vuelo.data.buffer);
    if (p.tw !== W || p.th !== H) tablas(p, W, H);
    const { dx, dy, oc } = p, d32 = new Uint32Array(datos.buffer, datos.byteOffset, datos.length >> 2), lejos = (p.lejos || LEJOS) * dpr;   // cada pieza tiene su distancia: un icono chico no se esparce de más
    /* Se limpia solo el pedazo que se va a usar, no las capas completas: los huecos en la zona tocada
       y los granos ya quedaron en cero al terminar el cuadro anterior */
    for (let y = y0; y < y1; y++) hu.fill(0, y * W + x0, y * W + x1);
    let vx0 = W, vy0 = H, vx1 = -1, vy1 = -1;
    for (let y = y0; y < y1; y++) {
      const fila = Math.min(MALLA - 1, (y / ch) | 0) * MALLA;
      for (let xx = x0; xx < x1; xx++) {
        const t = p.toque[fila + Math.min(MALLA - 1, (xx / cw) | 0)];
        if (t < .015) continue;
        const k = todo ? (y * ancho + xx) * 4 : ((y - y0) * ancho + (xx - x0)) * 4, a = datos[k + 3];
        if (a < 8) continue;
        const i = y * W + xx, d = t * lejos;
        const nx = (xx + dx[i] * d) | 0, ny = (y + dy[i] * d) | 0;
        hu[i] = 0xff000000;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const o = ny * W + nx, alfa = (a * (1 - Math.min(t, 1) * .35)) | 0;
        if (alfa <= vu[o * 4 + 3]) continue;
        vu32[o] = ((oc[i] && t > .1 ? ocre32 : d32[k >> 2]) & 0xffffff | alfa << 24) >>> 0;   // un tercio se tiñe de ocre al volar; una sola escritura
        if (nx < vx0) vx0 = nx; if (ny < vy0) vy0 = ny; if (nx > vx1) vx1 = nx; if (ny > vy1) vy1 = ny;
      }
    }
    /* Se pasan por un lienzo de apoyo para poder recortar y encimar (putImageData no mezcla) */
    const ap = p.apoyo || (p.apoyo = Object.assign(document.createElement('canvas'), { width: W, height: H })), ac = ap.getContext('2d');
    ac.putImageData(hueco, 0, 0, x0, y0, bw, bh);
    x.globalCompositeOperation = 'destination-out'; x.drawImage(ap, x0, y0, bw, bh, x0, y0, bw, bh);
    x.globalCompositeOperation = 'source-over';
    if (vx1 >= vx0) {
      const vw = vx1 - vx0 + 1, vh = vy1 - vy0 + 1;
      ac.clearRect(vx0, vy0, vw, vh); ac.putImageData(vuelo, 0, 0, vx0, vy0, vw, vh);
      x.drawImage(ap, vx0, vy0, vw, vh, vx0, vy0, vw, vh);
      for (let y = vy0; y <= vy1; y++) vu.fill(0, (y * W + vx0) * 4, (y * W + vx1 + 1) * 4);   // deja la capa en cero para el siguiente
    }
  }

  function paso() {
    let vivas = 0;
    for (const p of piezas) {
      if (p.estela.length) { regar(p); if (p.fija || p.quieta?.()) pintar(p); vivas += p.estela.length; }
      else if (p.sucio) { p.sucio = false; if (p.fija) pintar(p); p.alAsentarse?.(); }
    }
    cuadro = vivas ? requestAnimationFrame(paso) : 0;
  }

  function mover(p, e) {
    if (reducido.matches || !p.lienzo.width) return;
    const r = p.lienzo.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * MALLA, y = (e.clientY - r.top) / r.height * MALLA;
    const u = p.estela[p.estela.length - 1], fuerza = u ? Math.min(((u.x - x) ** 2 + (u.y - y) ** 2) * 10000 / (MALLA * MALLA), 1) : 0;
    if (!p.sucio) { p.sucio = true; p.alTocar?.(); }
    p.estela.push({ x, y, edad: 0, fuerza });
    if (!cuadro) cuadro = requestAnimationFrame(paso);
  }

  function nueva(lienzo, zona, extra) {
    const p = Object.assign({ lienzo, ctx: lienzo.getContext('2d'), toque: new Float32Array(MALLA * MALLA), estela: [] }, extra);
    zona.addEventListener('pointermove', e => mover(p, e), { passive: true });
    piezas.push(p);
    return p;
  }

  /* ── Imagen fija: el SVG se vuelve a dibujar como vector al tamaño exacto en pantalla, con su proporción ── */
  async function vector(img, w, h) {
    const svg = await (await fetch(img.currentSrc || img.src)).text();
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    if (!doc.getAttribute('viewBox')) doc.setAttribute('viewBox', `0 0 ${img.naturalWidth} ${img.naturalHeight}`);
    doc.setAttribute('width', w); doc.setAttribute('height', h); doc.setAttribute('preserveAspectRatio', 'none');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' }));
    const v = new Image(); v.src = url; await v.decode(); URL.revokeObjectURL(url);
    return v;
  }
  function teñirFija(p) {   // el dibujo con la tinta del tema, y sus píxeles para no leerlos en cada cuadro
    const c = p.fuente, x = c.getContext('2d', { willReadFrequently: true });
    x.globalCompositeOperation = 'copy'; const m = p.m || 0; x.drawImage(p.vector, m, m, c.width - 2 * m, c.height - 2 * m);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${tinta})`; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over';
    p.pixeles = x.getImageData(0, 0, c.width, c.height).data;
  }
  /* En el sitio el lienzo va encima de la imagen, un poco más grande que ella (MARGEN de cada lado) para que
     los granos puedan volar fuera del dibujo sin cortarse en su borde. No recibe toques: pasan a lo de abajo */
  async function medirFija(p) {
    const { img, lienzo } = p, dpr = Math.min(devicePixelRatio || 1, 2), w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) return;
    const MARGEN = p.lejos = Math.min(LEJOS, Math.round(Math.min(w, h) * .25));   // los granos viajan hasta un 25 % del icono
    const m = Math.round(MARGEN * dpr), W = Math.round(w * dpr) + 2 * m, H = Math.round(h * dpr) + 2 * m;
    p.vector = await vector(img, Math.round(w * dpr), Math.round(h * dpr)).catch(() => img);
    Object.assign(lienzo.style, { left: img.offsetLeft - MARGEN + 'px', top: img.offsetTop - MARGEN + 'px', width: w + 2 * MARGEN + 'px', height: h + 2 * MARGEN + 'px' });
    lienzo.width = p.fuente.width = W; lienzo.height = p.fuente.height = H; p.m = m;
    p.hueco = p.vuelo = p.apoyo = null;
    teñirFija(p); pintar(p);
    img.style.opacity = 0;   // la imagen se oculta solo cuando el lienzo ya la dibuja igual
  }
  function vestir(img) {
    if (img.dataset.granos) return;
    img.dataset.granos = '1';
    const lienzo = Object.assign(document.createElement('canvas'), { className: 'granos' });
    lienzo.setAttribute('aria-hidden', 'true');
    lienzo.style.cssText = 'position:absolute;pointer-events:none';
    const caja = img.parentElement;
    if (getComputedStyle(caja).position === 'static') caja.style.position = 'relative';
    img.after(lienzo);
    const p = nueva(lienzo, caja, { img, fija: true, fuente: document.createElement('canvas') });
    /* Si otro código esconde la imagen (por ejemplo para poner su animación), el lienzo se esconde con ella */
    new MutationObserver(() => { lienzo.hidden = img.hidden; }).observe(img, { attributes: true, attributeFilter: ['hidden'] });
    const listo = () => medirFija(p);
    if (img.complete && img.naturalWidth) listo();
    img.addEventListener('load', listo);   // también cuando la imagen se pide tarde (data-src)
  }

  /* Lottie en dos copias que comparten los mismos datos:
     - A, la de siempre: dibuja directo en el lienzo que se ve, con la tarjeta de video. Es lo más ligero y es
       lo que corre casi todo el tiempo. No se copia ni se lee nada.
     - B, la de los granos: dibuja en un lienzo escondido que se puede leer rápido. Se crea cuando el puntero
       entra al Lottie (antes de tocarlo) y solo corre mientras hay granos.
     Al tocar, B toma el mismo cuadro que A y sigue desde ahí; al asentarse, A toma el cuadro de B. No se nota.
     Fuera de pantalla o con la pestaña oculta, el que esté corriendo se pausa (con la pausa del propio Lottie). */
  async function lottie(contenedor, nombre, { modo = 'congelar' } = {}) {
    const [lib, datos] = await Promise.all([Lottie.libreria(), Lottie.datos(nombre)]);
    const r = contenedor.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(r.width * dpr), H = Math.round(r.width * dpr * datos.h / datos.w);
    const lienzo = Object.assign(document.createElement('canvas'), { className: 'granos tinta-img', width: W, height: H });
    lienzo.setAttribute('aria-hidden', 'true');
    contenedor.append(lienzo);
    const ciclo = (datos.markers || []).find(m => m.cm === 'ciclo');
    const montar = ctx => {
      const an = lib.loadAnimation({
        renderer: 'canvas', loop: true, autoplay: false,
        animationData: JSON.parse(JSON.stringify(datos)),
        rendererSettings: { context: ctx, clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' }
      });
      if (ciclo) an.playSegments([ciclo.tm, ciclo.tm + ciclo.dr], true);
      an.pause();
      return an;
    };
    const p = nueva(lienzo, contenedor, {});
    const A = montar(p.ctx);
    let B = null, granos = false, visible = false;
    const quieto = () => reducido.matches || !visible || document.hidden;
    const seguir = () => {
      const activo = granos ? (modo === 'vivo' ? B : null) : A;
      for (const an of [A, B]) if (an && an !== activo) an.pause();
      if (activo) quieto() ? activo.pause() : activo.play();
    };
    if (reducido.matches) A.goToAndStop(0, true);

    /* B se prepara al entrar el puntero, para que el primer toque ya no tenga que crear nada */
    const preparar = () => {
      if (B) return;
      p.fuente = Object.assign(document.createElement('canvas'), { width: W, height: H });
      p.fctx = p.fuente.getContext('2d', { willReadFrequently: true });
      B = montar(p.fctx);
      if (modo === 'vivo') B.addEventListener('enterFrame', () => { if (granos) pintar(p); });
    };
    contenedor.addEventListener('pointerenter', preparar, { passive: true });
    contenedor.addEventListener('touchstart', preparar, { passive: true });

    p.alTocar = () => {
      preparar(); granos = true;
      B.goToAndStop(A.currentFrame, true);   // el mismo cuadro que se estaba viendo
      seguir();
    };
    p.alAsentarse = () => {
      granos = false;
      A.goToAndStop(B.currentFrame, true);   // A sigue desde donde quedó B
      seguir();
    };
    p.quieta = () => granos && modo === 'congelar';   // congelado, los granos se pintan con el paso de la estela

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; seguir(); }).observe(contenedor);
    document.addEventListener('visibilitychange', seguir);
    return A;
  }

  new MutationObserver(teñir).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', teñir);
  teñir();
  let espera; addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(() => piezas.forEach(p => p.fija && p.img.naturalWidth && medirFija(p)), 150); }, { passive: true });
  /* En el sitio se aplica solo a los dibujos de pincel que acompañan al texto: los iconos de las 11 tarjetas
     de servicio (2026-10-23). Nunca a textos ni botones */
  document.querySelectorAll('.servicio__icono img').forEach(vestir);
  return { vestir, lottie, medidas };
})();
