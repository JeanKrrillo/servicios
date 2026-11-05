/* fondo-arena.js · el fondo de todas las páginas (antes arena.js de la prueba v2): el fondo como arena muy fina que se porta como humo.
   Técnica estudiada en Mirage y reescrita para JK (sin su código ni Three.js):
   1. Un fluido chico en la tarjeta de video guarda en cada celda el aire (velocidad) y el polvo levantado.
      El puntero sopla aire y levanta polvo; el aire pierde 4 % por cuadro y el polvo 4.5 %. La presión se
      corrige poco, así el soplo se abre y se enrosca como humo en vez de ondular como agua. Sin fricción
      estática: cualquier movimiento, por chico que sea, levanta algo.
   2. La pared queda en papel limpio. Solo donde hay polvo aparecen granos de tinta y de ocre; cada grano
      toma su polvo de un punto corrido por el aire y de otro al azar cercano, así se ven arrastrados y dispersos.
   3. Sin polvo en el aire no se calcula ni se pinta nada; a los ~2 s de quietud se duerme.
   Solo tinta y papel, leídos del CSS. Uso: Arena.iniciar(canvas) · Arena.apagar() · Arena.encender() */
const Arena = (() => {
  /* Mirage JK, elegido por Jean el 2026-10-13 en inspiracion/pruebas/v2/profundidad.html */
  const P = {
    lado: 160,            // celdas del fluido en el lado largo
    aireQueda: .979,      // lo que conserva el aire por cuadro
    polvoQueda: .983,     // lo que conserva el polvo por cuadro
    radioAire: .016,      // tamaño del soplo (distancia² en pantalla normalizada)
    radioPolvo: .022,
    polvo: .08,           // polvo que levanta cada cuadro con movimiento
    fuerza: 5.5,          // cuánto aire mete el movimiento del puntero
    presion: 2,           // vueltas de corrección de presión; pocas = más humo
    corrimiento: .14,     // cuánto arrastra el aire a las motas
    desparramo: .34,      // qué tan lejos se dispersa cada mota
    densidad: 1.8,        // cuántas motas se ven por cada unidad de polvo
    suelo: 0,             // 0: papel liso con motas (Mirage JK) · 1: suelo de arena iluminado, como Mirage
    ocre: .95             // parte de las motas que salen en ocre muy claro
  };
  const DORMIR = Math.log(.002) / Math.log(P.polvoQueda) / 60;   // segundos hasta que el polvo se asienta

  const VERT = `attribute vec2 a; varying vec2 vUv; void main() { vUv = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }`;
  const CAB = `precision highp float; varying vec2 vUv; uniform sampler2D uC; uniform vec2 uTx;`;
  const SH = {
    soplo: `${CAB} uniform vec2 uPunto, uAire; uniform float uAspecto, uRA, uRP, uPolvo;
      void main() {
        vec2 d = (vUv - uPunto) * vec2(uAspecto, 1.); float d2 = dot(d, d);
        vec3 b = texture2D(uC, vUv).xyz;
        gl_FragColor = vec4(b.xy + exp2(-d2 / uRA) * uAire, clamp(b.z + exp2(-d2 / uRP) * uPolvo, 0., 1.), 1.);
      }`,
    divergencia: `${CAB}
      void main() {
        float L = texture2D(uC, vUv - vec2(uTx.x, 0.)).x, R = texture2D(uC, vUv + vec2(uTx.x, 0.)).x;
        float B = texture2D(uC, vUv - vec2(0., uTx.y)).y, T = texture2D(uC, vUv + vec2(0., uTx.y)).y;
        gl_FragColor = vec4(.6 * (R - L + T - B), 0., 0., 1.);
      }`,
    presion: `${CAB} uniform sampler2D uDiv;
      void main() {
        float s = texture2D(uC, vUv - vec2(uTx.x, 0.)).x + texture2D(uC, vUv + vec2(uTx.x, 0.)).x
                + texture2D(uC, vUv - vec2(0., uTx.y)).x + texture2D(uC, vUv + vec2(0., uTx.y)).x;
        gl_FragColor = vec4((s - texture2D(uDiv, vUv).x) * .25, 0., 0., 1.);
      }`,
    restar: `${CAB} uniform sampler2D uP;
      void main() {
        float L = texture2D(uP, vUv - vec2(uTx.x, 0.)).x, R = texture2D(uP, vUv + vec2(uTx.x, 0.)).x;
        float B = texture2D(uP, vUv - vec2(0., uTx.y)).x, T = texture2D(uP, vUv + vec2(0., uTx.y)).x;
        vec3 b = texture2D(uC, vUv).xyz;
        gl_FragColor = vec4(b.xy - vec2(R - L, T - B), b.z, 1.);
      }`,
    arrastre: `${CAB} uniform float uDt, uAQ, uPQ;
      void main() {
        vec3 b = texture2D(uC, vUv - uDt * texture2D(uC, vUv).xy).xyz;
        gl_FragColor = vec4(b.xy * uAQ, b.z * uPQ, 1.);
      }`,
    /* La pared es papel liso. Las partículas solo existen donde hay polvo en el aire y van en relieve, como
       granos con luz: un brillo casi blanco arriba a la izquierda y una sombra de tinta muy tenue abajo a la
       derecha. Así se leen sobre el papel claro sin ensuciarlo. Algunas salen en ocre muy claro */
    pared: `${CAB} uniform sampler2D uCalma; uniform vec3 uTinta, uPapel, uOcre; uniform vec2 uRes; uniform float uT, uCorre, uDesp, uDens, uPOcre, uDpr, uSuelo, uOscuro, uRaleo;
      float h(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      /* ── Suelo Mirage: arena con relieve bajo una luz rasante con borde de sombra. El grano solo vive en la luz
         (por eso la sombra queda limpia), y donde hay polvo la imagen se corre con el aire y se desparrama ── */
      float ruido(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
      float suelo(vec2 uv) {
        vec2 px = uv * uRes;
        float d = length((uv - vec2(-.05, 1.1)) * vec2(uRes.x / uRes.y, 1.));
        float luz = 1.35 * pow(1. + d / .9, -2.4);                                        // cae con la distancia a la fuente
        float borde = dot(uv - vec2(.6, .5), normalize(vec2(1., .4))) + (ruido(px / 180.) - .5) * .06;
        luz *= smoothstep(.018, -.006, borde);                                              // el borde de la sombra, apenas ondulado
        float relieve = .85 + .3 * (ruido(px / 46.) - ruido(px / 46. + vec2(.6, .3)));  // dunas: la cara que mira a la luz se aclara
        luz *= relieve;
        float grano = h(floor(px / 1.2));
        return luz * (1. + (grano - .5) * (uOscuro > .5 ? .6 : .9) * clamp(luz * 50., 0., 1.));
      }
      vec3 color(float luz) {
        vec3 sombra = uOscuro > .5 ? uPapel : mix(mix(uPapel, uTinta, .3), uOcre, .16);  // en oscuro, sombra honda como en Mirage
        vec3 claro = uOscuro > .5 ? uTinta : mix(uPapel, vec3(1.), .75);
        return mix(sombra, claro, clamp(luz, 0., 1.));
      }
      void mainSuelo() {
        vec3 f = texture2D(uC, vUv).xyz;
        vec2 semilla = vUv * 800. + uT * .001;
        float rnd = h(semilla) * .85, ang = rnd * 6.2831853;
        vec2 uv = vUv - f.xy * f.z * uCorre + vec2(cos(ang), sin(ang)) * f.z * uDesp * rnd;
        vec3 c = color(suelo(uv));
        c += (h(semilla + 91.7) - .5) * f.z * .8;
        /* Sal y pimienta: donde hay polvo, granos sueltos toman el tono contrario al de su lugar, así se distinguen
           también en la luz pareja y en la sombra, no solo en el borde */
        vec2 cel = floor(vUv * uRes / 1.6);
        float hay = step(h(cel + floor(uT * .02) * 7.), f.z * 1.4) * smoothstep(.02, .06, f.z);   // sin polvo suelto regado
        c = mix(c, color(1.1 - suelo(uv) * 1.1), hay * (.55 + .35 * h(cel + 4.2)));
        gl_FragColor = vec4(c, 1.);
      }
      void main() {
        if (uSuelo > .5) { mainSuelo(); return; }
        vec3 f = texture2D(uC, vUv).xyz;
        if (f.z < .003) { gl_FragColor = vec4(uPapel, 1.); return; }
        vec2 px = vUv * uRes, cel = floor(px / 4.), dentro = fract(px / 4.);
        vec2 centro = vec2(h(cel + 3.1), h(cel + 7.7)) * .8 + .1;   // en cualquier punto de su celda, para que no se vea rejilla
        float r = h(cel + floor(uT * .008)), ang = r * 6.2831853;
        vec2 desde = vUv - f.xy * f.z * uCorre + vec2(cos(ang), sin(ang)) * f.z * uDesp * r * .05;
        float pz = texture2D(uC, desde).z;
        float hay = smoothstep(0., .25, pz * uDens - h(cel * 1.37 + 17.)) * smoothstep(.015, .05, pz) * step(h(cel + 11.3), .55);   // el polvo muy tenue no dibuja motas, y nunca hay mota en todas las celdas
        /* Regla del texto: sobre los renglones la arena se ralea. Quedan pocas motas, más finas, del mismo color,
           y la proporción cambia poco a poco con el difuminado del mapa: no hay borde ni zona que se vea distinta */
        float calma = texture2D(uCalma, vec2(vUv.x, 1. - vUv.y)).r;   // 0 fondo, intermedio en el perímetro, 1 en el área; difuminado entre ellos
        hay *= step(h(cel + 21.7), 1. - uRaleo * calma);                 // ralear: en el área queda QUEDA_AREA de las motas
        vec2 q = dentro - centro;
        float luz = smoothstep(.32 - .1 * calma, .05, length(q + .06));        // la cara iluminada del grano
        float sombra = smoothstep(.3 - .1 * calma, .12, length(q - .09)) - luz * .6;   // su sombra, corrida abajo a la derecha, de borde más firme
        vec3 brillo = h(cel + 9.1) < uPOcre ? mix(mix(uPapel, vec3(1.), .6), uOcre, .28) : mix(uPapel, vec3(1.), .85);
        vec3 c = mix(uPapel, uTinta, max(sombra, 0.) * hay * .34 * (1. - .35 * calma));   // y su sombra baja un poco
        gl_FragColor = vec4(mix(c, brillo, luz * hay * .95), 1.);
      }`
  };

  let gl, lienzo, prog = {}, buf, ext, fluido, presion, div, cw = 0, ch = 0;
  let cuadro = 0, encendida = true, quieto = 0, antes = 0, t0 = performance.now();
  let mx = .5, my = .5, mx0 = .5, my0 = .5, activo = false, color = { tinta: [0, 0, 0], papel: [1, 1, 1], ocre: [.7, .5, .1] };
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');

  function programa(src) {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, src]].forEach(([t, s]) => {
      const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(p, sh);
    });
    gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    p.u = new Proxy({}, { get: (c, k) => c[k] ?? (c[k] = gl.getUniformLocation(p, k)) });
    return p;
  }
  function textura(w, h) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    const filtro = ext.lineal ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, ext.tipo, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, fb };
  }
  const doble = (w, h) => { let a = textura(w, h), b = textura(w, h); return { get lee() { return a; }, get escribe() { return b; }, voltea() { [a, b] = [b, a]; } }; };

  /* Una pasada: usa el programa, conecta texturas en orden y pinta toda la superficie en el destino */
  function pasada(p, destino, texs, fijar) {
    gl.useProgram(p);
    texs.forEach(([nombre, tex], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex.t); gl.uniform1i(p.u[nombre], i); });
    gl.uniform2f(p.u.uTx, 1 / cw, 1 / ch);
    fijar?.(p.u);
    if (destino) { gl.bindFramebuffer(gl.FRAMEBUFFER, destino.fb); gl.viewport(0, 0, cw, ch); }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, lienzo.width, lienzo.height); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function paso(t) {
    const dt = Math.min(.033, antes ? (t - antes) / 1000 : .016); antes = t;
    const dx = mx - mx0, dy = my - my0, movio = activo && dx * dx + dy * dy > 1e-9;
    mx0 = mx; my0 = my;
    if (movio) {
      quieto = 0;
      pasada(prog.soplo, fluido.escribe, [['uC', fluido.lee]], u => {
        gl.uniform2f(u.uPunto, mx, my); gl.uniform2f(u.uAire, dx * P.fuerza, dy * P.fuerza);
        gl.uniform1f(u.uAspecto, lienzo.width / lienzo.height); gl.uniform1f(u.uRA, P.radioAire); gl.uniform1f(u.uRP, P.radioPolvo); gl.uniform1f(u.uPolvo, P.polvo);
      }); fluido.voltea();
    } else quieto += dt;
    pasada(prog.divergencia, div, [['uC', fluido.lee]]);
    for (let i = 0; i < P.presion; i++) { pasada(prog.presion, presion.escribe, [['uC', presion.lee], ['uDiv', div]]); presion.voltea(); }
    pasada(prog.restar, fluido.escribe, [['uC', fluido.lee], ['uP', presion.lee]]); fluido.voltea();
    pasada(prog.arrastre, fluido.escribe, [['uC', fluido.lee]], u => { gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uAQ, P.aireQueda); gl.uniform1f(u.uPQ, P.polvoQueda); }); fluido.voltea();
    if (calmaSucia && t - ultimaCalma > 120) trazarCalma();
    pintar(t);
    cuadro = quieto < DORMIR ? requestAnimationFrame(paso) : (antes = 0);
  }
  function pintar(t = performance.now()) {
    pasada(prog.pared, null, [['uC', fluido.lee], ['uCalma', calma]], u => {
      gl.uniform3fv(u.uTinta, color.tinta); gl.uniform3fv(u.uPapel, color.papel); gl.uniform3fv(u.uOcre, color.ocre); gl.uniform1f(u.uDpr, lienzo.width / innerWidth); gl.uniform2f(u.uRes, innerWidth, innerHeight);
      gl.uniform1f(u.uT, t - t0); gl.uniform1f(u.uCorre, P.corrimiento); gl.uniform1f(u.uDesp, P.desparramo); gl.uniform1f(u.uDens, P.densidad); gl.uniform1f(u.uPOcre, P.ocre); gl.uniform1f(u.uSuelo, P.suelo); gl.uniform1f(u.uRaleo, 1 - QUEDA_AREA); gl.uniform1f(u.uOscuro, color.oscuro);
    });
  }
  const despertar = () => { if (!cuadro && encendida && !reducido.matches) { trazarCalma(); cuadro = requestAnimationFrame(paso); } };

  /* ── Zona de calma: un mapa chico (1/8 de la pantalla) de dónde hay letras, con bordes suaves.
     Se arma con los renglones reales del texto (no con cajas enteras), así entre párrafos la arena sigue.
     Solo se rehace cuando el polvo está activo: al despertar y, si la página se mueve, cada 120 ms ── */
  const ESC = 8;
  /* Regla del texto en escalones: [margen alrededor del renglón en px, parte de las motas que queda, difuminado en px].
     Del fondo (100 %) al área (4 %) en cinco pasos, para que la arena se vaya raleando poco a poco */
  const ESCALONES = [
    [34, .7, 10],    // perímetro externo
    [20, .45, 8],    // perímetro
    [14, .25, 7],    // perímetro interno 1
    [10, .12, 6],    // perímetro interno 2
    [6,  .04, 5]     // área: sobre letras y dibujos casi no queda arena (2026-10-14)
  ];
  const QUEDA_AREA = ESCALONES[ESCALONES.length - 1][1];
  const OBJETOS = '.grupos, .mapa-defensas, .calc, .franja, .aparte-linea, .casos, .temas, .laboratorio, p, dd, dt, h1, h2, h3, h4, figcaption, img, svg, canvas.granos, .nota, .pieza, .pincel, .boton, button, input, select, textarea, .cuota-chip, .lottie-prueba';
  let objetos = null;
  let calma, mapa, textos = null, calmaSucia = false, ultimaCalma = 0;
  new MutationObserver(() => { textos = null; objetos = null; }).observe(document.body, { childList: true, subtree: true, characterData: true });
  function juntarTextos() {
    const lista = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim() ? 1 : 2 });
    while (w.nextNode()) lista.push(w.currentNode);
    return lista;
  }
  function trazarCalma() {
    if (!calma) return;
    const W = Math.ceil(innerWidth / ESC), H = Math.ceil(innerHeight / ESC);
    if (mapa.width !== W || mapa.height !== H) { mapa.width = W; mapa.height = H; }
    const x = mapa.getContext('2d');
    /* El área es cada renglón real del texto, pegado a las letras (no la caja del elemento, que puede ser una
       fila entera con precio y flecha). Renglones vecinos se unen solos con el difuminado */
    const cajas = [], rango = document.createRange();
    for (const n of (textos ||= juntarTextos())) {
      rango.selectNodeContents(n);
      for (const r of rango.getClientRects()) {
        if (!r.width || r.bottom < -40 || r.top > innerHeight + 40 || r.right < -40 || r.left > innerWidth + 40) continue;
        cajas.push([r.left, r.top, r.right, r.bottom]);
      }
    }
    /* Las zonas donde se lee o se elige (tarjetas, lista de defensas, cómo funciona, casos) se calman enteras: la arena
       queda a los costados y entre secciones, no entre renglón y renglón de una lista (2026-10-14) */
    /* Y los objetos que no son letras pero se tienen que ver limpios: bloques de texto enteros (párrafos, títulos, datos y la .nota, cada uno como una sola área, sin arena entre renglones), dibujos, iconos, botones, la línea de pincel */
    for (const el of (objetos ||= [...document.querySelectorAll(OBJETOS)])) {
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom < -40 || r.top > innerHeight + 40 || r.right < -40 || r.left > innerWidth + 40) continue;
      cajas.push([r.left, r.top, r.right, r.bottom]);
    }
    /* El mapa guarda cuánto calma hay: 0 en el fondo, 1 en el área y valores intermedios en cada escalón */
    const pintarCapa = (margen, radio, borroso, valor) => {
      x.filter = `blur(${borroso / ESC}px)`; const g = Math.round(valor * 255); x.fillStyle = `rgb(${g},${g},${g})`;   // gris opaco: con 'lighten' manda el escalón más alto, no se suman
      x.beginPath();
      for (const [l, t, r, b] of cajas) {
        const w = r - l + 2 * margen, h = b - t + 2 * margen, a = [(l - margen) / ESC, (t - margen) / ESC, w / ESC, h / ESC];
        x.roundRect ? x.roundRect(...a, Math.min(radio, w / 2, h / 2) / ESC) : x.rect(...a);   // navegadores viejos: esquinas rectas, el difuminado las suaviza
      }
      x.fill();
    };
    x.filter = 'none'; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);   // negro: sin calma
    x.globalCompositeOperation = 'lighten';                        // donde se juntan dos capas manda la más alta, no se suman
    /* Escalones de afuera hacia adentro: cuanto más cerca de la letra, menos motas. Cada uno con su difuminado */
    for (const [margen, queda, borroso] of ESCALONES) pintarCapa(margen, margen + 4, borroso, (1 - queda) / (1 - QUEDA_AREA));
    x.globalCompositeOperation = 'source-over';
    gl.bindTexture(gl.TEXTURE_2D, calma.t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mapa);
    calmaSucia = false; ultimaCalma = performance.now();
  }
  addEventListener('scroll', () => { calmaSucia = true; }, { passive: true });

  function medir() {
    const dpr = Math.min(devicePixelRatio || 1, 1.25);   // el polvo no necesita más resolución; es lo que más cuesta
    lienzo.width = Math.round(innerWidth * dpr); lienzo.height = Math.round(innerHeight * dpr);
    const asp = innerWidth / innerHeight;
    cw = asp >= 1 ? P.lado : Math.round(P.lado * asp); ch = asp >= 1 ? Math.round(P.lado / asp) : P.lado;
    fluido = doble(cw, ch); presion = doble(cw, ch); div = textura(cw, ch);
    pintar();
  }

  /* Tinta y papel del tema actual, leídos del CSS */
  function teñir() {
    const x = document.createElement('canvas').getContext('2d'), css = getComputedStyle(document.documentElement);
    const rgb = v => { x.fillStyle = css.getPropertyValue(v).trim(); const h = x.fillStyle.slice(1); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
    color = { tinta: rgb('--tinta'), papel: rgb('--papel'), ocre: rgb('--ocre') };
    color.oscuro = color.papel[0] + color.papel[1] + color.papel[2] < 1.5 ? 1 : 0;
    if (fluido) pintar();
  }

  function puntero(x, y) {
    if (!encendida || reducido.matches) return;
    mx = x / innerWidth; my = 1 - y / innerHeight;
    if (!activo) { mx0 = mx; my0 = my; activo = true; }
    despertar();
  }

  function iniciar(c) {
    lienzo = c;
    gl = c.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    const hf = gl?.getExtension('OES_texture_half_float');
    if (!gl || !hf) return false;   // sin WebGL o sin texturas de medio flotante queda el grano de papel
    ext = { tipo: hf.HALF_FLOAT_OES, lineal: !!gl.getExtension('OES_texture_half_float_linear') };
    gl.getExtension('EXT_color_buffer_half_float');
    buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const k in SH) prog[k] = programa(SH[k]);
    mapa = document.createElement('canvas');
    calma = { t: gl.createTexture() };
    gl.bindTexture(gl.TEXTURE_2D, calma.t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    teñir(); medir();

    addEventListener('pointermove', e => puntero(e.clientX, e.clientY), { passive: true });
    addEventListener('touchmove', e => { const t = e.touches[0]; if (t) puntero(t.clientX, t.clientY); }, { passive: true });
    addEventListener('pointerdown', e => { activo = false; puntero(e.clientX, e.clientY); }, { passive: true });
    let espera; addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(medir, 150); }, { passive: true });
    new MutationObserver(teñir).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', teñir);
    c.addEventListener('webglcontextlost', e => e.preventDefault());
    return true;
  }

  return {
    P, iniciar,
    apagar() { encendida = false; if (lienzo) lienzo.hidden = true; },
    encender() { encendida = true; if (lienzo) { lienzo.hidden = false; pintar(); } }
  };
})();

/* Se enciende sola cuando la página ya cargó y el navegador queda libre, así no frena la entrada.
   El lienzo va fijo detrás de todo; sin WebGL o con movimiento reducido queda el papel de siempre */
(() => {
  const encender = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.className = 'fondo-arena'; c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;inset:0;z-index:-1;width:100%;height:100%;pointer-events:none';   // aquí y no en base.css: el autodiagnóstico no la carga
    document.body.prepend(c);
    if (!Arena.iniciar(c)) c.remove();
  };
  const libre = () => ('requestIdleCallback' in window ? requestIdleCallback(encender, { timeout: 1500 }) : setTimeout(encender, 200));
  document.readyState === 'complete' ? libre() : addEventListener('load', libre, { once: true });
})();
