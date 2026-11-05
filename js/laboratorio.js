/* laboratorio.js · las funciones beta de quien participa en el laboratorio (../laboratorio/laboratorio_jk.md).
   GitHub Pages publica una sola página para todos, así que lo beta viaja aquí y se prende con una llave: la persona
   escribe su BETA-XXXXXXXX en el campo de código de la calculadora, calculadora.js le pregunta a Laboratorio.buscar(huella)
   y, si es una llave, Laboratorio.activar() la guarda en este navegador. La página solo trae huellas (datos-llaves.js),
   y lo que hacen las funciones está a la vista aquí: la llave separa a quien participa, no esconde nada.

   Marca de prueba: con una llave activa, window.JK_LAB_PRUEBA queda en 'laboratorio' (o 'jean' si la llave es de dueño),
   y historial.js / servicios.js lo meten en todo lo que mandan, así el visor no mezcla las pruebas con la gente real.
   Una función nueva es una fila en FUNCIONES con su pintar(caja). Lo que se manda sale cifrado con Historial.enviar. */

const Laboratorio = (() => {
  const CLAVE = 'jk-lab', MIAS = 'jk-lab-mias';
  const leer = (k, v) => { try { return JSON.parse(localStorage.getItem(k)) ?? v; } catch (e) { return v; } };
  const escribir = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  let st = leer(CLAVE, null);

  /* lo que esta persona ya mandó, solo en su celular: pruebas contestadas, notas, puntos y logros */
  const mias = () => { const m = leer(MIAS, {}); return { pruebas: m.pruebas || {}, semanas: m.semanas || {}, notas: m.notas || [], puntos: m.puntos || 0, logros: m.logros || [], nuevos: m.nuevos || [] }; };
  const SEMANA = () => Math.floor(Date.now() / 6048e5);
  const deEstaSemana = m => Object.values(m.semanas).filter(s => s === SEMANA()).length;
  const guardarMias = m => escribir(MIAS, m);

  const marca = () => (st && st.duenio ? 'jean' : 'laboratorio');
  /* lo deja a la mano de historial.js y servicios.js para marcar clics y pedidos como prueba */
  const fijarMarca = () => { try { window.JK_LAB_PRUEBA = st ? marca() : null; } catch (e) { /* nada */ } };
  fijarMarca();

  async function mandar(clase, mensaje, extra = {}) {
    const ok = typeof Historial !== 'undefined' && await Historial.enviar({ tipo: 'laboratorio', prueba: marca(), clase, mensaje, codigo: st.h, nivel: st.nivel, pagina: location.pathname, ...extra });
    avisar(ok ? 'Listo, ya me llegó.' : `No se pudo mandar. Intenta de nuevo o escríbeme a ${CONTACTO.usuario}.`);
    return ok;
  }

  /* ficha de este aparato: lo que se ve aquí es exactamente lo que se manda */
  function ficha() {
    const n = navigator, ua = n.userAgent, num = (re, s = '') => (ua.match(re) || [, ''])[1].replace(/_/g, '.') || s;
    const sistema = /Android/.test(ua) ? 'Android ' + num(/Android ([\d.]+)/) : /iPhone|iPad|iPod/.test(ua) ? 'iOS ' + num(/OS (\d+_\d+)/)
      : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X/.test(ua) ? (n.maxTouchPoints > 1 ? 'iPadOS' : 'Mac') : /Linux/.test(ua) ? 'Linux' : 'Otro';
    const navegador = [[/Edg\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'], [/SamsungBrowser\/(\d+)/, 'Samsung Internet'], [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'],
      [/CriOS\/(\d+)/, 'Chrome'], [/Chrome\/(\d+)/, 'Chrome'], [/Version\/(\d+).*Safari/, 'Safari']].find(([re]) => re.test(ua));
    return {
      'Sistema': sistema,
      'Navegador': navegador ? `${navegador[1]} ${num(navegador[0])}` : 'Otro',
      'Pantalla': `${screen.width} × ${screen.height}`,
      'Ventana': `${innerWidth} × ${innerHeight}`,
      'Densidad': String(Math.round(devicePixelRatio * 100) / 100),
      'Táctil': n.maxTouchPoints > 0 ? 'sí' : 'no',
      'Tema': typeof Tema !== 'undefined' ? Tema.actual() : '',
      'Letra base': getComputedStyle(document.documentElement).fontSize,
      'Movimiento reducido': matchMedia('(prefers-reduced-motion: reduce)').matches ? 'sí' : 'no',
      'Idioma': n.language,
      'Conexión': n.connection?.effectiveType || 'no lo dice',
      'Red': n.connection?.type || 'no lo dice',
      'Memoria': n.deviceMemory ? `unos ${n.deviceMemory} GB` : 'no lo dice'
    };
  }

  /* las pruebas que le aplican a esta persona: su nivel, no las de Jean, y de los servicios de su perfil (pagina es de todos) */
  const aplica = p => p.aplica === 'pagina' || (Array.isArray(st?.perfil) && st.perfil.includes(p.aplica));
  const suyas = () => (typeof PRUEBAS_LAB !== 'undefined' ? PRUEBAS_LAB : []).filter(p => p.nivel <= st.nivel && p.quien !== 'jean' && !p.oculto && aplica(p));

  /* medio al azar pero igual toda la semana: la semilla es la huella de la llave más el número de semana */
  function barajar(lista) {
    const semana = SEMANA();
    let h = 0; for (const c of (st.h || '') + semana) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const azar = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296);
    const r = [...lista]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    /* primero las ligeras, para agarrar ritmo */
    return r.sort((a, b) => (a.riesgo === 'bajo' ? 0 : 1) - (b.riesgo === 'bajo' ? 0 : 1));
  }

  /* niveles por puntos, numerados y sin apodos: el juego se ve en el avance, no en nombres de cuento */
  const RANGOS = [[0, 'Nivel 1'], [50, 'Nivel 2'], [150, 'Nivel 3'], [300, 'Nivel 4'], [500, 'Nivel 5']];
  const rango = pts => { let i = 0; RANGOS.forEach(([min], k) => { if (pts >= min) i = k; }); return { i, nombre: RANGOS[i][1], de: RANGOS[i][0], a: RANGOS[i + 1]?.[0] ?? null, siguiente: RANGOS[i + 1]?.[1] }; };
  const signo = l => esc(l.signo || String(l.nombre).trim().charAt(0).toUpperCase());

  function tarjeta() {
    const m = mias(), r = rango(m.puntos), lista = suyas(), hechas = lista.filter(p => m.pruebas[p.id]).length;
    const avance = r.a ? Math.round(((m.puntos - r.de) / (r.a - r.de)) * 100) : 100;
    const todos = typeof LOGROS_LAB !== 'undefined' ? LOGROS_LAB : [], nuevos = new Set(m.nuevos || []);
    const hechasSemana = Math.min(5, deEstaSemana(m)), semana = barajar(lista.filter(p => !m.pruebas[p.id])).slice(0, 5 - hechasSemana);
    return `<div class="lab-juego">
      <div class="lab-juego__fila">
        <div><p class="antetitulo">Tu avance</p>
          <p class="lab-juego__rango">${m.puntos} ${m.puntos === 1 ? 'punto' : 'puntos'}</p>
          <p class="lab-juego__sig">${r.a ? `Con ${r.a} puntos pasas al ${r.siguiente.toLowerCase()}.` : 'Ya estás en el nivel más alto.'}</p></div>
        <p class="lab-juego__nivel">${r.nombre}</p>
      </div>
      <div class="lab-barra" role="progressbar" aria-label="Avance al siguiente nivel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${avance}"><span style="--avance:${avance / 100}"></span></div>
      <ul class="lab-sellos" aria-label="Tus medallas">${todos.map(l => {
        const g = m.logros.includes(l.id), oculta = l.oculto && !g;
        return `<li class="lab-sello${g ? ' ganada' : ''}${nuevos.has(l.id) ? ' nueva' : ''}" title="${oculta ? 'Medalla escondida' : esc(l.nombre + '. ' + l.como)}"><span aria-hidden="true">${oculta ? '?' : signo(l)}</span><span class="sr-only">${oculta ? 'Medalla escondida' : esc(l.nombre)}${g ? ', ganada' : ''}</span></li>`;
      }).join('')}</ul>
      <p class="lab-juego__nota">${lista.length ? `Llevas ${hechas} de ${lista.length} pruebas. ${semana.length ? `Esta semana te faltan ${semana.length}.` : 'Esta semana ya terminaste.'}` : 'Cuando me digas qué usas, aquí ves cuántas pruebas llevas.'}</p>
    </div>`;
  }

  /* da puntos y revisa si ganó un logro, sin repetir */
  function sumar(puntos, hechas) {
    const m = mias();
    m.puntos += puntos || 0;
    (typeof LOGROS_LAB !== 'undefined' ? LOGROS_LAB : []).forEach(l => {
      if (m.logros.includes(l.id) || l.oculto) return;
      if ((l.id === 'primera' && hechas >= 1) || (l.id === 'cinco' && hechas >= 5) || (l.puntos && m.puntos >= l.puntos)) { m.logros.push(l.id); (m.nuevos = m.nuevos || []).push(l.id); }
    });
    guardarMias(m);
  }
  /* una prueba escondida se descubre al usar la página de cierta forma, no se lista */
  function descubrir(id, logroId) {
    const m = mias();
    if (m.pruebas[id]) return;
    m.pruebas[id] = 'descubierta';
    if (logroId && !m.logros.includes(logroId)) { m.logros.push(logroId); (m.nuevos = m.nuevos || []).push(logroId); }
    guardarMias(m);
    const p = (PRUEBAS_LAB || []).find(x => x.id === id);
    if (p) mandar('oculta', `Descubrió ${p.servicio}: ${p.texto}`, { prueba_id: id, resultado: 'descubierta', oculta: true });
  }

  /* preguntas del paso 1: quién es (IDENTIDAD) y qué usa (PERFIL, de sí o no). paso es la pregunta que se está repasando; null = la primera sin contestar */
  let paso = null;
  const preguntas = () => [...(typeof IDENTIDAD !== 'undefined' ? IDENTIDAD : []),
    ...(typeof PERFIL !== 'undefined' ? PERFIL : []).filter(q => !q.depende || (st.perfil || []).includes(q.depende)).map(q => ({ ...q, tipo: 'si' }))];
  const respondida = q => q.tipo === 'si' ? (st.resp || []).includes(q.id) || (st.perfil || []).includes(q.id) : !!st.yo && q.id in st.yo;

  const FUNCIONES = [
    /* una pregunta por pantalla, de un toque; lo contestado se guarda al instante y se retoma donde se dejó */
    { id: 'perfil', paso: 1, nombre: 'Cuéntame de ti', que: 'Un minuto, una pregunta a la vez. Así te llamo por tu nombre y te mando pruebas de lo que tienes', nivel: 1, pintar(caja) {
      const qs = preguntas(), j = paso ?? qs.findIndex(q => !respondida(q)), q = qs[j], yo = st.yo || {};
      if (!q) {
        caja.innerHTML = `<p class="lab-fin">Listo${yo.nombre ? ', ' + esc(yo.nombre) : ''}. Te tocan pruebas de ${(st.perfil || []).length} servicios. Lo cambias cuando quieras.</p>
          <div class="lab-botones"><button class="boton boton--linea boton--chico" type="button" data-repetir>Cambiar mis respuestas</button></div>`;
        return;
      }
      const actual = q.tipo === 'si' ? ((st.perfil || []).includes(q.id) ? 'Sí' : respondida(q) ? 'No' : null) : yo[q.id];
      const opciones = q.tipo === 'texto' ? `<input class="lab-campo" type="text" maxlength="60" autocomplete="given-name" aria-label="${esc(q.texto)}" value="${esc(yo[q.id] || '')}" placeholder="Tu nombre">
          <div class="lab-botones"><button class="boton boton--chico" type="button" data-sigue>Seguir</button></div>`
        : `<div class="lab-opciones" role="radiogroup" aria-label="${esc(q.texto)}">${(q.tipo === 'si' ? ['Sí', 'No'] : q.opciones).map(o => `<button class="opcion" type="button" role="radio" aria-checked="${o === actual}" data-val="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
      caja.innerHTML = `<div class="lab-barra" role="progressbar" aria-label="Avance de tus preguntas" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${j}"><span style="--avance:${j / qs.length}"></span></div>
        <p class="antetitulo">${j + 1} de ${qs.length}</p>
        <p class="lab-paso__q">${esc(q.texto)}</p><p class="texto-apoyo">${esc(q.para)}</p>${opciones}
        ${q.tipo === 'texto' ? '' : `<details class="plegable lab-nota"${yo[q.id + '_nota'] ? ' open' : ''}><summary>Agregar una nota o comentario</summary><textarea class="lab-campo" rows="2" maxlength="1500" aria-label="Nota o comentario libre, opcional" placeholder="Lo que quieras contarme sobre esta pregunta">${esc(yo[q.id + '_nota'] || '')}</textarea></details>`}
        <div class="lab-botones">${j ? '<button class="boton boton--linea boton--chico" type="button" data-atras>Atrás</button>' : ''}${q.tipo === 'si' ? '' : '<button class="boton boton--linea boton--chico" type="button" data-salta>Prefiero no decir</button>'}</div>`;
      const campo = caja.querySelector('input'); if (campo) campo.onkeydown = e => e.key === 'Enter' && caja.querySelector('[data-sigue]').click();
    }, tocar(b, caja) {
      const qs = preguntas(), j = paso ?? qs.findIndex(q => !respondida(q)), q = qs[j], yo = st.yo = st.yo || {};
      if ('repetir' in b.dataset) { paso = 0; return this.pintar(caja); }
      if (!q) return;
      const nota = caja.querySelector('.lab-nota textarea')?.value.trim();
      nota ? yo[q.id + '_nota'] = nota : delete yo[q.id + '_nota'];
      if ('atras' in b.dataset) { paso = Math.max(0, j - 1); return this.pintar(caja); }
      if ('salta' in b.dataset) yo[q.id] = '';
      else if ('sigue' in b.dataset) yo[q.id] = caja.querySelector('input').value.trim();
      else if (b.dataset.val && q.tipo === 'si') {
        const set = new Set(st.perfil || []); b.dataset.val === 'Sí' ? set.add(q.id) : set.delete(q.id);
        st.perfil = [...set]; st.resp = [...new Set([...(st.resp || []), q.id])];
      } else if (b.dataset.val) yo[q.id] = b.dataset.val;
      else return;
      escribir(CLAVE, st);
      const fin = j + 1 >= qs.length; paso = fin ? null : j + 1;
      if (fin) {
        mandar('perfil', `${yo.nombre || 'Sin nombre'}. ${['uso', 'soltura', 'explicar'].map(k => yo[k]).filter(Boolean).join(', ')}. Usa: ${(st.perfil || []).join(', ') || 'nada por ahora'}${Object.keys(yo).filter(k => k.endsWith('_nota')).map(k => `. Nota de ${k.slice(0, -5)}: ${yo[k]}`).join('')}`, { nombre: yo.nombre || '', yo, perfil: st.perfil });
        const t = document.querySelector('[data-funcion="tanda"] .lab-caja'); if (t) FUNCIONES.find(x => x.id === 'tanda').pintar(t);
        const g = document.querySelector('.lab-juego'); if (g) g.outerHTML = tarjeta();
      }
      this.pintar(caja);
    } },

    { id: 'tanda', paso: 2, nombre: 'Tus pruebas de esta semana', que: 'Haz lo que dice cada una y cuéntame cómo te fue', nivel: 1, pintar(caja) {
      const hechas = mias().pruebas, lista = suyas();
      const pendientes = lista.filter(p => !hechas[p.id]);
      const ya = Math.min(5, deEstaSemana(mias())), orden = barajar(pendientes), tanda = orden.slice(0, 5 - ya), opcionales = orden.slice(5 - ya);
      const pinta = p => `
        <article class="lab-prueba" data-prueba="${esc(p.id)}">
          <div class="lab-prueba__cabeza"><p class="antetitulo">${esc(p.servicio)}</p>
            <p class="lab-prueba__datos"><span>${esc(p.minutos)} min</span><span class="lab-prueba__pts">+${esc(p.puntos)}</span></p></div>
          <p class="lab-prueba__texto">${esc(p.texto)}</p>
          <p class="texto-apoyo">${esc(p.para)}</p>
          <textarea class="lab-campo" rows="2" maxlength="1500" aria-label="Lo que quieras contarme de esta prueba" placeholder="Si quieres, cuéntame cómo te fue"></textarea>
          <div class="lab-botones"><button class="boton boton--chico" type="button" data-resultado="hecha">Ya la hice</button>
          <button class="boton boton--linea boton--chico" type="button" data-resultado="no puedo">No puedo</button>
          <button class="boton boton--linea boton--chico" type="button" data-resultado="no aplica">No me toca</button></div>
        </article>`;
      caja.innerHTML = !lista.length
        ? '<p class="texto-apoyo">Primero marca en el paso 1 lo que usas, y aquí salen tus pruebas.</p>'
        : !pendientes.length
          ? `<p class="lab-fin">Ya hiciste todas por ahora. Gracias, con lo que contestaste ajusto guías, tiempos y precios.</p>`
          : ((tanda.length ? '' : '<p class="lab-fin">Ya hiciste las cinco de esta semana. Gracias, la próxima semana te tocan otras.</p>') + tanda.map(pinta).join('') +
             (opcionales.length ? `<details class="plegable lab-mas"><summary>Si tienes tiempo, hay ${opcionales.length} más que puedes hacer</summary>${opcionales.map(pinta).join('')}</details>` : ''));
      if (lista.length && pendientes.length) caja.insertAdjacentHTML('afterbegin', `<ol class="lab-puntos" aria-label="Tu semana">${Array.from({ length: 5 }, (_, i) => `<li class="${i < ya ? 'hecho' : ''}"></li>`).join('')}</ol>`);
      if (!(st.perfil || []).length) caja.insertAdjacentHTML('beforeend', '<p class="texto-apoyo">Si marcas en el paso 1 lo que usas, también te salen pruebas de esos servicios.</p>');
    }, async tocar(b, caja) {
      const art = b.closest('[data-prueba]'); if (!art || !b.dataset.resultado) return;
      const p = PRUEBAS_LAB.find(x => x.id === art.dataset.prueba), texto = art.querySelector('textarea').value.trim();
      b.disabled = true;
      if (await mandar('prueba', `${p.servicio}: ${b.dataset.resultado}${texto ? '. ' + texto : ''}`, { prueba_id: p.id, resultado: b.dataset.resultado, texto })) {
        const m = mias(); m.pruebas[p.id] = b.dataset.resultado; m.semanas[p.id] = SEMANA(); guardarMias(m);
        if (b.dataset.resultado === 'hecha') { sumar(p.puntos, Object.values(mias().pruebas).filter(r => r === 'hecha').length); avisar(`+${p.puntos} puntos, gracias.`); }
        pintar();
      } else b.disabled = false;
    } },

    { id: 'nota', nombre: 'Avísame de algo', que: 'Si algo falla o se te ocurre una idea, escríbemelo aquí', nivel: 1, pintar(caja) {
      const notas = mias().notas;
      caja.innerHTML = `
        <div class="opciones-fila" role="radiogroup" aria-label="Qué es">${['Falla', 'Idea', 'Pido algo'].map((c, i) => `<button class="opcion" type="button" role="radio" aria-checked="${!i}" data-clase="${c}">${c}</button>`).join('')}</div>
        <textarea class="lab-campo" rows="3" maxlength="3000" aria-label="Tu nota" placeholder="Qué pasó, dónde, o qué necesitas"></textarea>
        <div class="lab-botones"><button class="boton boton--chico" type="button" data-mandar>Mandar nota</button></div>
        ${notas.length ? `<p class="texto-apoyo">Lo que has mandado, guardado solo en este aparato. Borrarlo aquí no borra mi copia, para eso pídemelo con tu llave.</p>
        <ul class="lab-mias">${notas.map((n, i) => `<li><span>${esc(n.clase)}, ${esc(n.fecha)}. ${esc(n.texto)}</span> <button class="lab-borrar" type="button" data-borrar="${i}">Borrar</button></li>`).join('')}</ul>` : ''}`;
    }, async tocar(b, caja) {
      if (b.dataset.clase) return caja.querySelectorAll('[data-clase]').forEach(x => x.setAttribute('aria-checked', x === b));
      if (b.dataset.borrar) { const m = mias(); m.notas.splice(+b.dataset.borrar, 1); guardarMias(m); return this.pintar(caja); }
      if (!('mandar' in b.dataset)) return;
      const campo = caja.querySelector('textarea'), texto = campo.value.trim(), clase = caja.querySelector('[aria-checked="true"]').dataset.clase;
      if (!texto) { avisar('Escribe la nota antes de mandarla.'); return campo.focus(); }
      b.disabled = true;
      if (await mandar('nota', `${clase}: ${texto}`, { texto })) {
        const m = mias(); m.notas.unshift({ clase, texto, fecha: new Date().toLocaleDateString('sv') }); guardarMias(m); this.pintar(caja);
      } else b.disabled = false;
    } },

    { id: 'aparato', nombre: 'Los datos de tu aparato', que: 'Me sirven para revisar la página en celulares y compus que no tengo', nivel: 1, pintar(caja) {
      caja.innerHTML = `<p class="texto-apoyo">Esto es todo lo que se manda, sin tu nombre ni tu ubicación.</p>
        <dl class="lab-ficha">${Object.entries(ficha()).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        <div class="lab-botones"><button class="boton boton--chico" type="button" data-mandar>Mandar estos datos</button></div>`;
    }, async tocar(b) {
      if (!('mandar' in b.dataset)) return;
      const f = ficha(); b.disabled = true;
      if (!await mandar('aparato', Object.entries(f).map(([k, v]) => `${k} ${v}`).join(', '), { ficha: f })) { b.disabled = false; return; }
      /* prueba escondida: abrir con datos móviles la descubre */
      if (f['Red'] === 'cellular') descubrir('2026-11-02-datos-moviles', 'escondida');
    } },

    { id: 'logros', nombre: 'Tus medallas', que: 'Qué ganaste y cómo se gana lo demás', nivel: 1, pintar(caja) {
      const m = mias(), todos = (typeof LOGROS_LAB !== 'undefined' ? LOGROS_LAB : []);
      caja.innerHTML = `<ul class="lab-medallas">${todos.map(l => {
          const g = m.logros.includes(l.id), oculta = l.oculto && !g;
          return `<li class="${g ? 'ganada' : ''}"><span class="lab-sello lab-sello--chico${g ? ' ganada' : ''}" aria-hidden="true">${oculta ? '?' : signo(l)}</span><span><b>${oculta ? 'Escondida' : esc(l.nombre)}</b><small>${oculta ? 'Se gana usando la página de cierta forma.' : esc(l.como)}</small></span></li>`;
        }).join('')}</ul>
        <p class="texto-apoyo">Pronto vas a ver aquí la lista de quienes más ayudan, con nombres de pigmento y no con nombres reales. Si no quieres salir ahí, lo quitas con un toque.</p>`;
    } },

    { id: 'ragebait', nombre: 'Ragebait cualquier día', que: 'El martes de ragebait cuando quieras, en todas las páginas', nivel: 1, apagada: true }
  ];

  const mias_ = () => FUNCIONES.filter(f => f.nivel <= st.nivel);
  const prendida = id => !!st && st.prendidas.includes(id);

  function pintar() {
    const lab = document.getElementById('lab'); if (!lab) return;
    const sec = lab.closest('.laboratorio');
    [...sec.children].forEach(el => { if (el !== lab && !el.matches('h2')) el.hidden = !!st; });
    lab.hidden = !st;
    if (!st) return (lab.innerHTML = '');
    const conPerfil = preguntas().every(respondida);
    const salir = '<button class="boton boton--linea boton--chico" type="button" data-salir>Salir del laboratorio</button>';
    lab.innerHTML = `
      <div class="lab-arriba"><p>Entraste al laboratorio en este aparato.</p>${salir}</div>
      <ol class="lab-como">
        <li>Primero me cuentas quién eres y qué usas, para mandarte solo pruebas de lo que tienes.</li>
        <li>Cada semana te tocan unas pruebas cortas. Cada una dice qué hacer y cuánto tarda, y al terminar me cuentas cómo te fue.</li>
        <li>Con lo que me cuentas arreglo la página y los servicios, y cada prueba te da puntos.</li>
      </ol>
      ${tarjeta()}
      ${mias_().filter(f => f.pintar && prendida(f.id)).map(f => {
        const abierta = (f.id === 'perfil' && !conPerfil) || (f.id === 'tanda' && conPerfil);
        return `<details class="plegable lab-funcion" data-funcion="${f.id}"${abierta ? ' open' : ''}>
          <summary><span class="lab-funcion__titulo">${f.paso ? `<span class="lab-funcion__paso">${f.paso}</span>` : ''}${esc(f.nombre)}</span><span class="lab-funcion__que">${esc(f.que)}.</span></summary>
          <div class="lab-caja"></div></details>`;
      }).join('')}
      <details class="plegable lab-ajustes"><summary><span class="lab-funcion__titulo">Elegir qué ves aquí</span><span class="lab-funcion__que">Prende o apaga cada parte del laboratorio.</span></summary>
        <div class="lab-interruptores">${mias_().map(f => `<label class="opcion-calc"><input type="checkbox" data-prender="${f.id}"${prendida(f.id) ? ' checked' : ''}><span>${esc(f.nombre)}<small>${esc(f.que)}</small></span><span></span></label>`).join('')}</div>
      </details>
      <div class="lab-salida">${salir}<p class="texto-apoyo">Para volver, escribe tu llave otra vez aquí en Laboratorio.</p></div>`;
    lab.querySelectorAll('[data-funcion]').forEach(d => FUNCIONES.find(f => f.id === d.dataset.funcion).pintar(d.querySelector('.lab-caja')));
    const m = mias(); if (m.nuevos.length) { m.nuevos = []; guardarMias(m); }
  }

  function guardar() { escribir(CLAVE, st); fijarMarca(); pintar(); }
  function activar(llave) {
    st = { h: llave.h, nivel: llave.nivel || 1, duenio: !!llave.duenio, perfil: (st && st.perfil) || [], desde: new Date().toLocaleDateString('sv'), prendidas: FUNCIONES.filter(f => !f.apagada).map(f => f.id), vistas: FUNCIONES.map(f => f.id) };
    guardar();
    document.getElementById('laboratorio')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  const buscar = h => (typeof LLAVES_LAB !== 'undefined' ? LLAVES_LAB : []).find(l => l.h === h) || null;
  const huella = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(x => x.toString(16).padStart(2, '0')).join('');
  /* la llave se escribe aquí, en la sección del laboratorio; el campo de descuento la sigue aceptando por si alguien la pone ahí */
  async function entrar(e) {
    e.preventDefault();
    const campo = document.getElementById('llave-campo'), estado = document.getElementById('llave-estado');
    const texto = campo.value.trim().toUpperCase().replace(/\s+/g, '');
    if (!texto) { estado.textContent = 'Escribe la llave que te mandé por mensaje.'; return campo.focus(); }
    const llave = buscar(await huella(texto));
    if (!llave) { estado.textContent = 'Esa llave no existe. Revisa que esté igual que en mi mensaje, con el guion.'; return; }
    campo.value = ''; estado.textContent = '';
    activar(llave);
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* una llave que se quitó o se cambió deja de servir en cuanto se publica */
    if (st && typeof LLAVES_LAB !== 'undefined' && !buscar(st.h)) { st = null; escribir(CLAVE, null); fijarMarca(); }
    else if (st) {
      const l = buscar(st.h); if (l) { st.nivel = l.nivel; st.duenio = !!l.duenio; }
      const vistas = new Set(st.vistas || st.prendidas || []);
      FUNCIONES.filter(f => !f.apagada && !vistas.has(f.id)).forEach(f => st.prendidas.push(f.id));
      st.prendidas = st.prendidas.filter(id => FUNCIONES.some(f => f.id === id));
      st.vistas = FUNCIONES.map(f => f.id); st.perfil = st.perfil || [];
      escribir(CLAVE, st); fijarMarca();
    }
    document.getElementById('lab-entrar')?.addEventListener('submit', entrar);
    const lab = document.getElementById('lab'); if (!lab) return;
    pintar();
    lab.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if ('salir' in b.dataset) { st = null; escribir(CLAVE, null); fijarMarca(); pintar(); return avisar('Listo, el laboratorio ya no está en este aparato.'); }
      const d = b.closest('[data-funcion]'); if (d) FUNCIONES.find(f => f.id === d.dataset.funcion).tocar?.(b, d.querySelector('.lab-caja'));
    });
    lab.addEventListener('change', e => {
      const id = e.target.dataset.prender;
      if (id) {
        st.prendidas = e.target.checked ? [...new Set([...st.prendidas, id])] : st.prendidas.filter(x => x !== id);
        guardar();
        if (id === 'ragebait') avisar(e.target.checked ? 'El ragebait sale al abrir otra página o al recargar.' : 'Listo, sin ragebait.');
        return;
      }
      const d = e.target.closest('[data-funcion]');
      if (d) FUNCIONES.find(f => f.id === d.dataset.funcion)?.cambio?.(e, d.querySelector('.lab-caja'));
    });
  });

  return { buscar, activar, prendida, get activo() { return !!st; } };
})();
