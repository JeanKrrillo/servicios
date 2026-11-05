/* calculadora.js · los servicios con su precio (sección 5) y Tu pedido (sección 6) de la reestructuración del 2026-10-23.
   Desde el 2026-10-23 es un solo camino con ¿Qué necesitas?: la cuota en cuatro botones, solo los servicios de lo que elegiste
   (servicios.js marca cuál con data-ver) y cada uno se abre ahí mismo con + Más detalles, sus situaciones y sus campos.
   Un servicio abierto a la vez, cada parte con su campo y su precio al lado, el total al momento y sin botón de calcular.
   Las cuentas las hace precios.js con datos-precios.js; aquí solo se arman los campos y se muestra el resultado.
   Lo que la persona cambia a mano se guarda en su aparato (localStorage) por 2 días, así no lo pierde si cierra o toca
   otra cosa por error; se borra al enviar. Las cantidades empiezan en 0 y ninguna cuota viene elegida (2026-10-23).
   Lo que se toca se anota en el registro de clics solo si la persona aceptó medir; las cantidades no, hasta que envía. */
const Calculadora = (() => {
  const CLAVE = 'jk-pedido';
  const fmt = n => Number(n).toLocaleString('es-MX');
  const pesos = n => `${fmt(n)} pesos`;
  const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const minus = t => t.charAt(0).toLowerCase() + t.slice(1);
  const estado = { tipo_de_cambio_en_uso: PRECIOS.tipo_de_cambio_base };
  const servicioDe = id => PRECIOS.servicios.find(s => s.id === id);
  const unidad = (u, n) => (u ? u[+n === 1 ? 0 : 1] : '');

  const DURA = 2 * 24 * 60 * 60 * 1000;
  const nuevo = () => ({ cuota: '', servicios: {}, codigo: null, otra: '', contar: '', urgencia: 'semana', publicar: 'secreto' });
  let st = (() => {
    try { const g = JSON.parse(localStorage.getItem(CLAVE)); return g && Date.now() - g.guardado < DURA ? { ...nuevo(), ...g } : nuevo(); } catch (e) { return nuevo(); }
  })();
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify({ ...st, contacto: undefined, guardado: Date.now() })); } catch (e) { /* sin almacenamiento */ } };
  const cuotaElegida = () => CUOTAS.find(c => c.id === st.cuota);
  const delServicio = id => (st.servicios[id] ||= { q: {}, on: {}, op: {}, minutos: '', personas: '', situacion: '' });

  /* ═══ DEL ESTADO AL PEDIDO ═══
   Lleno es que ya contestaste algo y se puede calcular; activo es que además tocaste Agregar a mi pedido (2026-10-23).
   Así nada entra al total ni al ticket de Tu pedido sin que la persona lo acepte */
  const lleno = (s, x) => !!x && (!!x.situacion || s.partes.some(p => (p.tamano ? +x.q[p.id] > 0 : p.tipo === 'casilla' ? x.on[p.id] : p.tipo === 'elegir' ? !!x.op[p.id] : false)));
  const activo = (s, x) => lleno(s, x) && !!x.agregado;
  const iconoDe = id => { const d = DEFENSAS.find(z => z.id === id); return d ? ` style="--icono:url('${new URL(`animaciones/iconos/${d.icono}.svg`, location.href).href}')"` : ''; };
  const wa = r => `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(mensaje(r))}`;
  function seleccion(s, x) {
    const partes = [];
    s.partes.forEach(p => {
      if (p.tipo === 'elegir') { if (x.op[p.id]) partes.push({ parte: p.id, opcion: x.op[p.id] }); }
      else if (p.tamano) { if (+x.q[p.id] > 0) partes.push({ parte: p.id, cantidad: x.q[p.id] }); }
      else if (p.tipo === 'casilla' ? x.on[p.id] : x.on[p.id] !== false) partes.push({ parte: p.id });
    });
    return { servicio: s.id, partes, minutos: x.minutos, personas: x.personas };
  }
  const activos = () => PRECIOS.servicios.filter(s => activo(s, st.servicios[s.id]));
  const pedido = () => ({ cuota: st.cuota, servicios: activos().map(s => seleccion(s, st.servicios[s.id])), codigo: st.codigo });
  const cotizacion = () => Precios.cotizar(pedido(), PRECIOS, estado);

  /* ═══ CAMPOS ═══
   Un solo precio por servicio (2026-10-23): los campos no llevan precio al lado ni ejemplos, porque con cuatro cifras
   no se sabía cuál era el real. El renglón del servicio dice Desde X y en cuanto escribes cambia a lo que cuesta lo tuyo */
  const numero = (id, etiqueta, dato, extra = '') => `
    <div class="parte parte--cantidad">
      <label for="${id}">${etiqueta}</label>
      <div class="paso-num">
        <button type="button" data-paso="-1" aria-label="Uno menos" tabindex="-1">−</button>
        <input id="${id}" type="number" inputmode="numeric" ${/\bmin=/.test(dato) ? '' : 'min="0" '}step="1" ${dato}>
        <button type="button" data-paso="1" aria-label="Uno más" tabindex="-1">+</button>
      </div>
      ${extra}
    </div>`;

  function campos(s) {
    const x = delServicio(s.id), id = k => `c-${s.id}-${k}`;
    const partes = s.partes.map(p => {
      if (p.tipo === 'elegir') return `
        <fieldset class="parte parte--elegir"><legend>${p.pregunta}</legend>
          ${p.opciones.map(o => `<label class="opcion-calc"><input type="radio" name="${id(p.id)}" data-op="${p.id}" value="${o.id}"${x.op[p.id] === o.id ? ' checked' : ''}><span>${o.nombre}</span></label>`).join('')}
        </fieldset>`;
      if (p.tamano) return numero(id(p.id), p.pregunta, `data-q="${p.id}" value="${esc(x.q[p.id] || 0)}"`,
        p.nota ? `<p class="parte__nota">${p.nota}</p>` : '');
      /* lo que ya viene se dice, no se pregunta */
      if (p.tipo === 'incluida') return `<p class="parte parte--incluye">Incluye ${minus(p.nombre)}.</p>`;
      return `<label class="parte parte--casilla"><input type="checkbox" data-on="${p.id}"${x.on[p.id] ? ' checked' : ''}><span>${p.nombre}</span></label>`;
    }).join('');
    const duracion = s.duracion ? numero(id('minutos'), s.duracion.pregunta, `data-minutos value="${esc(x.minutos || 0)}"`,
      `<p class="parte__nota">Más de 10 minutos te lo cotizo por mensaje.</p>`) : '';
    /* una ayuda con link (el diagnóstico en Cuentas seguras) va arriba de las preguntas, donde se necesita, como recuadro */
    const [duda, accion] = s.ayuda?.href ? s.ayuda.texto.split(/\?\s*/).map((t, i) => (i ? t : t + '?')) : [];
    const llamado = s.ayuda?.href ? `<a class="llamado" href="${s.ayuda.href}"><span>${duda}</span><b>${accion} <span aria-hidden="true">→</span></b></a>` : '';
    const ayuda = s.ayuda && !s.ayuda.href ? `<p class="parte__ayuda">${s.ayuda.texto}.</p>` : '';
    /* empieza en 1 (quien pide ya es una persona) y la nota dice el descuento real, de datos-precios.js */
    const tramos = (PRECIOS.descuento_personas || []).map((t, i) => `${Math.round(t.valor * 100)}${i ? '' : ' por ciento menos'} con ${t.desde}${i ? '' : ' personas'}`);
    const personas = s.por_persona === false ? '' : numero(id('personas'), '¿Cuántas personas lo van a recibir?', `data-personas min="1" value="${esc(x.personas || 1)}"`,
      `<p class="parte__nota">Cuéntate a ti. Si es para más gente, cada quien paga ${tramos.slice(0, -1).join(', ')} y ${tramos.at(-1).replace(' con ', ' desde ')}.</p>`);
    const d = DEFENSAS.find(z => z.id === s.id), mas = d ? `
      <button class="mas-detalles" type="button" aria-expanded="false" aria-controls="mas-${s.id}">+ Más detalles</button>
      <div class="servicio__mas" id="mas-${s.id}" hidden><p>${d.mas}</p>
        <ul class="situaciones" aria-label="Toca la que se parece a lo tuyo">${d.situaciones.map((t, i) => `<li><button type="button" class="situacion" data-servicio="${s.id}" data-i="${i}">${t}</button></li>`).join('')}</ul>
      </div>` : '';
    const nPreg = s.partes.filter(p => p.tamano || p.tipo !== 'incluida').length + (s.duracion ? 1 : 0) + (s.por_persona === false ? 0 : 1);
    const guia = `<p class="preguntas__guia">${nPreg === 1 ? 'Contesta esta pregunta' : `Contesta estas ${nPreg} preguntas`} y abajo sale tu precio.</p>`;
    return mas + llamado + `<div class="preguntas-servicio">${guia}${partes}${duracion}${personas}</div>` + ayuda
      + `<div class="recibo" data-recibo="${s.id}" aria-live="polite"></div>`;
  }

  function pintar() {
    const cont = $('#calc-servicios');
    if (!cont) return;
    /* cada cuota dice para quién suele ser, así se elige sabiendo cómo encaja cada una */
    const lista = xs => { const t = xs.map((x, i) => (i ? minus(x) : x)); return t.length > 1 ? `${t.slice(0, -1).join(', ')} y ${t.at(-1)}` : t[0]; };
    $('#cuota-opciones').innerHTML = CUOTAS.map(c => `<label class="cuota-op"><input type="radio" name="cuota" value="${c.id}"${c.id === st.cuota ? ' checked' : ''}>
      <span class="cuota-op__caja"><span class="cuota-op__nombre">${c.nombre}</span><span class="cuota-op__para">${lista(c.para)}.</span></span></label>`).join('');
    const ver = cont.dataset.ver;
    cont.innerHTML = PRECIOS.servicios.map(s => {
      const d = DEFENSAS.find(x => x.id === s.id), grupo = GRUPOS.find(g => g.defensas.includes(s.id))?.id, icono = iconoDe(s.id);
      return `<details class="calc-servicio${ver && ver !== grupo ? ' es-otro' : ''}" name="calc-servicio" data-id="${s.id}" data-grupo="${grupo}" id="calc-${s.id}">
        <summary><span class="calc-servicio__icono" aria-hidden="true"${icono}></span><span class="calc-servicio__titulo"><span class="calc-servicio__nombre">${s.nombre}</span>${d && d.desde ? `<span class="calc-servicio__anio" title="Lo hago desde ${d.desde}">desde ${d.desde}</span>` : ''}</span><span class="calc-servicio__desde" data-desde="${s.id}"></span>
          <span class="calc-servicio__linea">${d ? d.linea : ''}</span></summary>
        <div class="calc-servicio__cuerpo">${campos(s)}</div>
      </details>`;
    }).join('');
    actualizar(true);
  }

  /* ═══ TOTAL AL MOMENTO ═══ */
  const queDe = (s, l) => {
    const p = s.partes.find(q => q.id === l.parte);
    return l.parte === 'duracion' ? `${l.cantidad} ${unidad(s.duracion.unidad, l.cantidad)}` : `${l.nombre}${l.opcion ? `, ${minus(l.opcion)}` : ''}${p && p.tamano ? `, ${fmt(l.cantidad)} ${unidad(p.unidad, l.cantidad)}` : ''}`;
  };

  /* ¿Por qué no se cobra? en la mutua: la razón corta, en la ficha de información (Glosa de comun.js) */
  const POR_QUE_MUTUA = 'Porque hay quien necesita el trabajo y no puede pagarlo. Lo sostiene quien elige la cuota solidaria, y se platica solo si pides un servicio y dejas tu contacto. Los números se ven igual porque el trabajo vale lo mismo.';

  /* Así se calcula: cada parte con su precio, las personas, el descuento y lo que cuesta este servicio, para que se vea
     por qué se cobra cada peso. Con la mutua son los mismos números, porque el trabajo vale lo mismo, y se dice que no los pagas */
  function recibo(s, x, mutua, agregado) {
    if (!x) return `<p class="recibo__vacio">Aquí sale tu precio en cuanto contestes.</p>
      <button class="boton boton--chico recibo__agregar" type="button" disabled>Agregar a mi pedido</button>`;
    const fila = (que, cuanto, clase = '') => `<li${clase ? ` class="${clase}"` : ''}><span>${que}</span><b class="numero">${cuanto}</b></li>`;
    const filas = x.lineas.map(l => fila(queDe(s, l), l.precio === null ? 'por mensaje' : pesos(l.precio)));
    if (x.personas > 1) filas.push(fila(`Para ${x.personas} personas`, `por ${x.personas}`));
    if (x.descuento) filas.push(fila(x.motivo === 'personas' ? `Por ser ${x.personas} personas, menos ${Math.round(x.descuento * 100)} por ciento` : `Por pedir más de un servicio, menos ${Math.round(x.descuento * 100)} por ciento`, `menos ${pesos(x.subtotal - x.neto)}`, 'recibo__descuento'));
    /* con la mutua el precio se ve tachado y opaco, y al lado lo que pagas, 0 pesos */
    const cuanto = x.cotizar ? 'te cotizo por mensaje' : mutua ? `<s class="recibo__tachado">${pesos(x.neto)}</s> 0 pesos` : pesos(x.neto);
    filas.push(fila('Este servicio', cuanto, 'recibo__total'));
    /* la cuenta entera con símbolos, como en un recibo: 35 + 55 = 90 × 2 personas = 180… */
    const precios = x.lineas.map(l => l.precio), sola = precios.length < 2 && x.personas < 2 && !x.descuento;
    const cuenta = x.cotizar || sola ? '' : [
      precios.length > 1 ? `${precios.map(fmt).join(' + ')} = ${fmt(x.subtotal / x.personas)}` : fmt(x.subtotal / x.personas),
      x.personas > 1 ? ` × ${x.personas} personas = ${fmt(x.subtotal)}` : '',
      x.descuento ? ` − ${fmt(x.subtotal - x.neto)} de descuento = ${fmt(x.neto)}` : '', ' pesos'].join('');
    return `<p class="recibo__titulo">Así se calcula</p><ul class="recibo__lineas">${filas.join('')}</ul>
      ${cuenta ? `<p class="recibo__cuenta">${cuenta}</p>` : ''}
      ${mutua ? `<p class="recibo__mutua">Con la mutua no pagas este trabajo. Hay ayuda sin costo para quien la necesita. <button type="button" class="glosa-termino" data-glosa-titulo="¿Por qué no se cobra?" data-glosa-texto="${esc(POR_QUE_MUTUA)}" aria-expanded="false">¿Por qué no se cobra?</button></p>` : ''}
      ${agregado ? `<p class="recibo__agregado">Está en tu pedido. <button class="ref" type="button" data-sacar="${s.id}">Quitarlo</button></p>
        <button class="boton boton--chico recibo__agregar" type="button" data-ver-pedido>Ver mi pedido y mandarlo</button>`
        : `<button class="boton boton--chico recibo__agregar" type="button" data-agregar-servicio="${s.id}">Agregar a mi pedido</button>`}`;
  }

  /* Tu pedido como ticket: un renglón por servicio con su dibujo, lo que pediste debajo y su precio; Quitar saca el servicio entero */
  function lineasDe(r, conQuitar) {
    const filas = [];
    r.servicios.forEach(x => {
      const s = servicioDe(x.servicio), sit = st.servicios[x.servicio]?.situacion;
      const cuanto = x.cotizar ? 'por mensaje' : r.mutua ? `<s class="recibo__tachado">${pesos(x.neto)}</s> 0 pesos` : pesos(x.neto);
      const partes = x.lineas.map(l => `<li>${queDe(s, l)}</li>`).join('')
        + (x.personas > 1 ? `<li>Para ${x.personas} personas${x.motivo === 'personas' ? `, menos ${Math.round(x.descuento * 100)} por ciento` : ''}</li>` : '')
        + (sit ? `<li class="total__situacion">${esc(sit)}</li>` : '');
      filas.push(`<li class="pedido__servicio"><span class="calc-servicio__icono" aria-hidden="true"${iconoDe(x.servicio)}></span>
        <div><p class="pedido__servicio-cabeza"><b>${x.nombre}</b><span class="numero">${cuanto}</span></p><ul class="pedido__partes">${partes}</ul>
        ${conQuitar ? `<p class="pedido__acciones"><a class="ref" href="#calc-${x.servicio}" data-cambiar="${x.servicio}">Cambiar</a> <button type="button" class="quitar" data-quitar="${x.servicio}">Quitar</button></p>` : ''}</div></li>`);
    });
    const combo = r.servicios.filter(x => x.motivo === 'combo').reduce((t, x) => t + x.subtotal - x.neto, 0);
    if (!r.mutua && combo) filas.push(`<li class="total__descuento">Combo, menos ${pesos(combo)}</li>`);
    if (!r.mutua && r.codigo) filas.push(`<li class="total__descuento">Código aplicado, menos ${pesos(r.codigo)}</li>`);
    if (!r.mutua && r.minimo) filas.push(`<li class="total__descuento">El mínimo por trabajo es ${pesos(r.minimo)}</li>`);
    return filas.join('');
  }

  function saber(r) {
    if (r.mutua || !r.servicios.length) return [];
    const ids = r.servicios.map(x => x.servicio), avisos = new Set(['minimo']);
    ids.forEach(id => (servicioDe(id).avisos || []).forEach(a => avisos.add(a)));
    if (r.total > 1000) avisos.add('anticipo');
    return [...avisos].map(a => AVISOS[a](st.cuota));
  }

  let ultimo = null, desdes = {};
  /* Un solo botón para pedir: mientras la barra del total está a la vista, el Pedir ayuda de las pestañas se esconde (calculadora.css) */
  const unBoton = () => { const t = $('#total'); document.body.classList.toggle('con-total', t.classList.contains('en-vista') || t.classList.contains('tiene-algo')); };
  function actualizar(cuotaCambio) {
    const r = ultimo = cotizacion(), mutua = st.cuota === 'mutua';
    const c = cuotaElegida();
    $('#total-titulo').textContent = c ? `Tu pedido · cuota ${minus(c.nombre)}` : 'Tu pedido';
    $('#precios').classList.toggle('es-mutua', mutua);
    /* un precio por servicio: Desde X hasta que eliges algo, y luego lo que cuesta lo tuyo, con su descuento si lo hay */
    if (cuotaCambio) desdes = Object.fromEntries(PRECIOS.servicios.map(s => [s.id, `Desde ${pesos(Precios.desde(s, PRECIOS, st.cuota, estado))}`]));
    PRECIOS.servicios.forEach(s => {
      const det = $(`#calc-${s.id}`);
      if (!det) return;
      const x = r.servicios.find(z => z.servicio === s.id), sx = st.servicios[s.id];
      const solo = x || (lleno(s, sx) ? Precios.cotizar({ cuota: st.cuota, servicios: [seleccion(s, sx)] }, PRECIOS, estado).servicios[0] : null);
      det.classList.toggle('esta-en-pedido', !!x);
      $(`[data-desde="${s.id}"]`, det).textContent = !solo ? desdes[s.id] : solo.cotizar ? 'Te cotizo por mensaje' : pesos(solo.neto);
      $(`[data-recibo="${s.id}"]`, det).innerHTML = recibo(s, solo, mutua, !!x);
    });
    /* el total */
    const vacio = !r.servicios.length;
    const anotado = vacio && !!st.otra.trim();
    $('#total-cifra').textContent = anotado ? 'Lo que anotaste te lo cotizo por mensaje' : vacio ? 'Agrega un servicio para ver tu total' : mutua ? 'Hay ayuda sin costo para quien la necesita' : r.cotizar_por_mensaje ? 'Para esta cantidad te cotizo por mensaje' : `Total, ${pesos(r.total)}`;
    $('#total-lineas').innerHTML = vacio ? '' : lineasDe(r, false) + (mutua ? `<li class="total__mutua">El trabajo que pides equivale a ${pesos(r.total)}.</li>` : '');
    $('#total-saber').innerHTML = saber(r).map(t => `<li>${t}</li>`).join('');
    const boton = $('#total-pedir');
    boton.disabled = vacio && !anotado;
    const rein = $('#total-reiniciar');
    if (rein) rein.hidden = rein.textContent !== 'Deshacer' && !st.cuota && vacio && !anotado && !Object.values(st.servicios).some(x => x && (x.situacion || Object.values(x.q || {}).some(v => +v > 0) || Object.values(x.on || {}).some(Boolean) || Object.values(x.op || {}).some(Boolean)));
    $('#total').classList.toggle('tiene-algo', !vacio);
    unBoton();
    if (!vacio) pasoSiguiente(4);
    guardar();
    if ($('#pedido')?.open) pintarPedido();
  }

  /* ═══ TOCAR LOS CAMPOS ═══ */
  function escuchar() {
    const calc = $('#precios');
    calc.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'cuota') {
        st.cuota = t.value; Registro.anotar('cuota', { cuota: t.value }); pasoSiguiente(3);
        return actualizar(true);
      }
      const det = t.closest('.calc-servicio');
      if (!det) return;
      const x = delServicio(det.dataset.id);
      if (t.dataset.on) x.on[t.dataset.on] = t.checked;
      if (t.dataset.op) x.op[t.dataset.op] = t.value;
      actualizar();
    });
    calc.addEventListener('input', e => {
      const t = e.target, det = t.closest('.calc-servicio');
      if (!det || t.type !== 'number') return;
      if (+t.value < 0) t.value = '';
      const x = delServicio(det.dataset.id), v = t.value === '' ? '' : String(Math.floor(+t.value));
      if (t.dataset.q) {
        x.q[t.dataset.q] = v;
        /* al poner la primera cantidad, las partes que ya vienen entran solas al pedido */
      }
      if ('minutos' in t.dataset) x.minutos = v;
      if ('personas' in t.dataset) x.personas = v;
      actualizar();
    });
    calc.addEventListener('click', e => {
      const mas = e.target.closest('.mas-detalles');
      if (mas) {
        const abierto = mas.getAttribute('aria-expanded') !== 'true';
        mas.setAttribute('aria-expanded', String(abierto));
        mas.textContent = abierto ? '− Menos detalles' : '+ Más detalles';
        $('#' + mas.getAttribute('aria-controls')).hidden = !abierto;
        if (abierto) Registro.anotar('detalles', { servicio: mas.closest('.calc-servicio').dataset.id });
        return;
      }
      if (e.target.closest('[data-ver-pedido]')) return abrirPedido();
      const agregar = e.target.closest('[data-agregar-servicio]'), sacar = e.target.closest('[data-sacar]');
      if (agregar || sacar) {
        const id = (agregar || sacar).dataset[agregar ? 'agregarServicio' : 'sacar'];
        delServicio(id).agregado = !!agregar;
        Registro.anotar(agregar ? 'agregar' : 'sacar', { servicio: id });
        return actualizar();
      }
      const sit = e.target.closest('.situacion');
      if (sit) {
        const texto = DEFENSAS.find(x => x.id === sit.dataset.servicio).situaciones[+sit.dataset.i];
        Registro.anotar('situacion', { servicio: sit.dataset.servicio, situacion: texto });
        return pedirConSituacion(sit.dataset.servicio, texto);
      }
      /* solo los botones − y + de un número: la sección de Servicios también lleva data-paso (el paso 1) y antes
         cualquier clic subía hasta ella y le sumaba 1 al primer campo de la página, el buscador */
      const b = e.target.closest('.paso-num > button[data-paso]');
      if (!b) return;
      const input = $('input', b.parentElement), n = Math.max(+input.min || 0, (Math.floor(+input.value) || 0) + +b.dataset.paso);
      input.value = n;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    /* un servicio abierto a la vez (los navegadores sin details[name] lo hacen aquí) */
    calc.addEventListener('toggle', e => {
      const det = e.target;
      if (!det.matches?.('.calc-servicio') || !det.open) return;
      $$('.calc-servicio[open]', calc).forEach(o => { if (o !== det) o.open = false; });
      Registro.anotar('servicio', { servicio: det.dataset.id });
    }, true);
    $('#total-pedir').addEventListener('click', () => { Registro.anotar('pedir', { cuota: st.cuota }); abrirPedido(); });
    $('#total-abrir').addEventListener('click', () => abrirPedido());
    /* Empezar de nuevo: todo vuelve a como estaba al abrir la página. En lugar de preguntar si estás seguro,
       el botón se vuelve Deshacer unos segundos (UX, deshacer en lugar de confirmar) */
    let antes = null, reloj = 0;
    $('#total-reiniciar')?.addEventListener('click', e => {
      const b = e.currentTarget;
      clearTimeout(reloj);
      if (antes) { st = antes; antes = null; b.textContent = 'Empezar de nuevo'; }
      else {
        antes = JSON.parse(JSON.stringify(st)); st = nuevo();
        b.textContent = 'Deshacer';
        reloj = setTimeout(() => { antes = null; b.textContent = 'Empezar de nuevo'; unBoton(); }, 8000);
      }
      guardar(); pintar();
      document.dispatchEvent(new CustomEvent('calc:reinicio'));
      avisar(antes ? 'Listo, empezaste de nuevo.' : 'Listo, regresó como estaba.');
    });
    $('#codigo-aplicar').addEventListener('click', aplicarCodigo);
    $('#codigo-campo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); aplicarCodigo(); } });
    /* en celular la barra del total se ve cuando la calculadora está en pantalla o cuando ya hay algo pedido */
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { $('#total').classList.toggle('en-vista', en.isIntersecting); unBoton(); }, { rootMargin: '0px 0px -30% 0px' }).observe(calc);
  }

  /* Abre un servicio en la calculadora y lleva el foco a su primer campo */
  function abrirServicio(id) {
    const det = $(`#calc-${id}`);
    if (!det) return;
    if (det.classList.contains('es-otro')) elegirGrupo(det.dataset.grupo);
    det.open = true;
    window.saltarA ? saltarA(det) : det.scrollIntoView({ block: 'start' });
    setTimeout(() => $('input:not([type=radio])', det)?.focus({ preventScroll: true }), 450);
  }

  /* Tocar una situación ya dice el problema: el servicio entra al pedido con lo mínimo y el pedido se abre listo para enviar */
  function pedirConSituacion(id, texto) {
    const s = servicioDe(id), x = delServicio(id);
    x.situacion = texto;
    x.agregado = true;   // tocar una situación ya es pedir ese servicio
    const primera = s.partes.find(p => p.tamano);
    if (primera && !(+x.q[primera.id] > 0)) x.q[primera.id] = '1';
    const elegir = s.partes.find(p => p.tipo === 'elegir');
    if (elegir && !x.op[elegir.id]) x.op[elegir.id] = elegir.opciones[0].id;
    pintar();
    abrirPedido();
  }

  /* ═══ CÓDIGOS DE DESCUENTO ═══
   datos-codigos.js trae solo la huella de cada código, nunca el código; aquí se calcula la huella de lo que escribes y se compara */
  async function huella(t) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  /* Los códigos hechos en el panel todavía no vienen en datos-codigos.js: se pregunta por su huella al receptor de
     Apps Script, que contesta solo lo público (valor, vencimiento y si se agotó). Si no contesta en 5 s, no existe */
  async function codigoDelPanel(h) {
    const url = typeof Historial !== 'undefined' && Historial.endpoint;
    if (!url) return null;
    try {
      const r = await fetch(`${url}?h=${h}`, { signal: AbortSignal.timeout(5000) });
      const k = await r.json();
      return k && k.h === h ? k : null;
    } catch (e) { return null; }
  }
  async function aplicarCodigo() {
    const texto = $('#codigo-campo').value.trim().toUpperCase().replace(/\s+/g, ''), estado_ = $('#codigo-estado');
    if (!texto) { st.codigo = null; estado_.textContent = ''; return actualizar(); }
    let h = '';
    try { h = await huella(texto); } catch (e) { estado_.textContent = 'No encontramos ese código.'; return; }
    /* la llave del laboratorio usa el mismo campo: prende las funciones beta en este navegador y no toca el precio (laboratorio.js) */
    const llave = typeof Laboratorio !== 'undefined' && Laboratorio.buscar(h);
    if (llave) { $('#codigo-campo').value = ''; estado_.textContent = 'Esa es tu llave del laboratorio, no un descuento. Ya entraste, está abajo en Laboratorio.'; return Laboratorio.activar(llave); }
    const k = (typeof CODIGOS !== 'undefined' ? CODIGOS : []).find(c => c.h === h) || await codigoDelPanel(h);
    const hoy = new Date().toISOString().slice(0, 10);
    if (!k) { st.codigo = null; estado_.textContent = 'No encontramos ese código.'; }
    else if (k.vence && k.vence < hoy) { st.codigo = null; estado_.textContent = 'Este código ya venció.'; }
    else if (k.agotado) { st.codigo = null; estado_.textContent = 'Este código ya se usó todas las veces.'; }
    else {
      st.codigo = { tipo: k.en, valor: k.valor, h };
      actualizar();
      estado_.textContent = `Código aplicado. Te baja ${pesos(ultimo.codigo)}.`;
      Registro.anotar('codigo', { codigo: h.slice(0, 12) });
      return;
    }
    actualizar();
  }

  /* ═══ TU PEDIDO (6) ═══ */
  const dlg = () => $('#pedido');
  let pedirOtra = false, aviso = '';
  function abrirPedido(foco) {
    const d = dlg();
    if (!d) return;
    if (foco === 'otra') pedirOtra = true;
    aviso = '';
    pintarPedido();
    if (!d.open) (d.showModal ? d.showModal() : d.setAttribute('open', ''));
    const objetivo = foco === 'otra' ? '#pedido-otra' : '#pedido-titulo';
    setTimeout(() => $(objetivo)?.focus(), 60);
  }

  const visita = () => { const q = new URLSearchParams(location.search); return { id: q.get('diagnostico'), pct: q.get('revisar') || q.get('riesgo') }; };
  function mensaje(r) {
    const c = cuotaElegida()?.nombre.toLowerCase() || 'sin elegir', u = URGENCIAS.find(x => x.id === st.urgencia).texto.toLowerCase();
    const lista = r.servicios.flatMap(x => x.lineas.map(l => `${x.nombre}, ${minus(l.nombre)}${l.opcion ? ` ${minus(l.opcion)}` : ''}${l.cantidad ? ` ${l.cantidad}` : ''}`)).join('; ');
    const situaciones = r.servicios.map(x => st.servicios[x.servicio]?.situacion).filter(Boolean).join(' ');
    const v = visita();
    return [
      `Hola${contacto.nombre ? `, soy ${contacto.nombre}` : ''}, necesito ayuda con esto: ${lista || 'algo que no está en la lista'}.`,
      situaciones,
      st.otra && `${st.otra}`,
      r.servicios.length ? (st.cuota === 'mutua' ? `Cuota mutua, el trabajo equivale a ${pesos(r.total)}.` : `Total, ${pesos(r.total)}, cuota ${c}.`) : `Cuota ${c}.`,
      `Es para ${u}.`,
      st.contar,
      v.id && `Vengo del autodiagnóstico, mi número de visita es ${v.id}${v.pct ? ` y me salió ${v.pct} % por revisar` : ''}.`
    ].filter(Boolean).join(' ');
  }

  /* Tu pedido en tres partes y sin todo de golpe (2026-10-23): el ticket con su total, cómo te respondo con un solo campo
     y su medio, y escribirme directo. Lo opcional (otra cosa, contar algo, urgencia, publicar) va plegado en Agregar detalles */
  function pintarPedido() {
    const r = ultimo || cotizacion(), vacio = !r.servicios.length, c = cuotaElegida(), mutua = st.cuota === 'mutua';
    const opciones = (nombre, lista, actual) => lista.map(o => `<label class="opcion-calc"><input type="radio" name="${nombre}" value="${o.id}"${o.id === actual ? ' checked' : ''}><span>${o.texto}${o.ayuda ? `<small>${o.ayuda}</small>` : ''}</span></label>`).join('');
    const m = MEDIOS.find(x => x.id === contacto.medio) || MEDIOS[0];
    const total = mutua ? `<s class="recibo__tachado">${pesos(r.total)}</s> 0 pesos` : r.cotizar_por_mensaje ? 'Te cotizo por mensaje' : pesos(r.total);
    const cuota = c ? `Cuota ${minus(c.nombre)}. <a class="ref" href="#cuotas" data-cerrar-y>Cambiar</a>` : `Todavía no eliges tu cuota, así que el precio va con la justa. <a class="ref" href="#cuotas" data-cerrar-y>Elegirla</a>`;
    const detalles = pedirOtra || st.otra || st.contar;
    $('#pedido-cuerpo').innerHTML = `
      ${vacio ? '<p class="pedido__vacio">Aún no agregas nada. Abre un servicio y toca Agregar a mi pedido.</p>' : `
      <div class="ticket">
        <ul class="pedido__lineas">${lineasDe(r, true)}</ul>
        <p class="ticket__total"><span>Total</span><b class="numero">${total}</b></p>
        <p class="ticket__nota">${cuota}${mutua ? ' Hay ayuda sin costo para quien la necesita.' : ' Es el precio máximo, si algo cambia te aviso antes de cobrar.'}</p>
      </div>`}
      <section class="pedido__bloque pedido__contacto" aria-labelledby="pedido-responder">
        <h3 class="pedido__subtitulo" id="pedido-responder">¿Cómo te respondo?</h3>
        <input class="pedido__campo" id="pedido-nombre" type="text" autocomplete="given-name" placeholder="Tu nombre o como quieras que te diga" aria-label="Tu nombre, opcional">
        <div class="medios" role="radiogroup" aria-label="Por dónde te respondo">${MEDIOS.map(x => `<label class="medio"><input type="radio" name="medio" value="${x.id}"${x.id === m.id ? ' checked' : ''}><span>${x.texto}</span></label>`).join('')}</div>
        <input class="pedido__campo" id="pedido-contacto" type="${m.tipo}" autocomplete="${m.tipo === 'tel' ? 'tel' : m.tipo === 'email' ? 'email' : 'off'}" placeholder="${m.ayuda}" aria-label="Tu contacto">
        <p class="texto-apoyo">Solo para responderte. El nombre y el contacto son opcionales.</p>
      </section>
      <div class="pedido__bloque pedido__directo">
        <p>O escríbeme directo</p>
        <div class="opciones-fila"><a class="boton boton--linea boton--chico" href="${wa(r)}" target="_blank" rel="noopener" data-whatsapp>WhatsApp</a>
          <a class="boton boton--linea boton--chico" href="${CONTACTO.url}" target="_blank" rel="noopener">${CONTACTO.usuario}</a></div>
      </div>
      <details class="plegable pedido__mas"${detalles ? ' open' : ''}>
        <summary>Agregar detalles</summary>
        <div class="pedido__antes">
          <label class="antetitulo" for="pedido-otra">Pedir otra cosa</label>
          <textarea id="pedido-otra" rows="2" data-campo="otra" placeholder="Lo que no está en la lista. Te digo tiempo y precio antes de empezar">${esc(st.otra)}</textarea>
          <label class="antetitulo" for="pedido-contar">¿Quieres contarme algo más?</label>
          <textarea id="pedido-contar" rows="2" data-campo="contar" placeholder="Qué pasó, desde cuándo y qué ya intentaste">${esc(st.contar)}</textarea>
          <fieldset><legend class="antetitulo">¿Qué tan urgente?</legend><div class="opciones-fila">${opciones('urgencia', URGENCIAS, st.urgencia)}</div></fieldset>
          <fieldset><legend class="antetitulo">¿Puede publicarse como caso resuelto?</legend><div class="opciones-fila">${opciones('publicar', PUBLICAR, st.publicar)}</div></fieldset>
          <details class="plegable"><summary>Ver el mensaje</summary><p class="pedido__mensaje" id="pedido-mensaje"></p></details>
        </div>
      </details>
      <div class="pedido__aviso" id="pedido-aviso" role="status">${aviso}</div>`;
    refrescar(r);
    $('#pedido-contacto').value = contacto.valor;
    $('#pedido-nombre').value = contacto.nombre;
  }

  /* el mensaje que se ve y el que se manda por WhatsApp son el mismo */
  function refrescar(r = ultimo || cotizacion()) {
    $('#pedido-mensaje').textContent = mensaje(r);
    $$('[data-whatsapp]', dlg()).forEach(a => { a.href = wa(r); });
  }

  /* El contacto no se guarda en el aparato: vive solo mientras la hoja está abierta */
  const contacto = { medio: 'whatsapp', valor: '', nombre: '' };
  function escucharPedido() {
    const d = dlg();
    if (!d) return;
    $$('[data-cerrar]', d).forEach(b => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', e => {
      if (e.target === d) return d.close();
      const q = e.target.closest('[data-quitar]');
      if (q) {
        const x = delServicio(q.dataset.quitar);
        x.agregado = false; x.situacion = '';
        pintar();
        return;
      }
      const cambiar = e.target.closest('[data-cambiar]');
      if (cambiar) { e.preventDefault(); e.stopPropagation(); d.close(); return abrirServicio(cambiar.dataset.cambiar); }
      if (e.target.closest('[data-cerrar-y]')) d.close();
      if (e.target.closest('[data-agregar]')) { aviso = ''; $('#pedido-aviso').innerHTML = ''; const t = $('#pedido-contacto'); t.scrollIntoView({ block: 'center' }); return t.focus({ preventScroll: true }); }
      if (e.target.closest('[data-enviar-asi]')) enviar(true);
    });
    d.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.campo) st[t.dataset.campo] = t.value;
      if (t.id === 'pedido-contacto') contacto.valor = t.value.trim();
      if (t.id === 'pedido-nombre') contacto.nombre = t.value.trim();
      guardar();
      refrescar();
    });
    d.addEventListener('change', e => {
      if (e.target.name === 'medio') {
        const m = MEDIOS.find(x => x.id === e.target.value), campo = $('#pedido-contacto');
        contacto.medio = m.id;
        Object.assign(campo, { type: m.tipo, placeholder: m.ayuda, autocomplete: m.tipo === 'tel' ? 'tel' : m.tipo === 'email' ? 'email' : 'off' });
        return campo.focus();
      }
      if (e.target.name === 'urgencia' || e.target.name === 'publicar') { st[e.target.name] = e.target.value; guardar(); refrescar(); }
    });
    $('#pedido-enviar').addEventListener('click', () => enviar(false));
  }

  async function enviar(sinContacto) {
    const r = ultimo || cotizacion(), caja = $('#pedido-aviso');
    if (!r.servicios.length && !st.otra.trim() && !st.contar.trim()) { caja.textContent = 'Aún no eliges nada. Abre un servicio para empezar.'; return; }
    if (!sinContacto && !contacto.valor) {
      aviso = `<p class="pedido__aviso-titulo">¿Dejas tus datos?</p>
        <p>Sin un contacto no tengo cómo responderte. También puedes mandarlo por WhatsApp, o enviarlo así.</p>
        <div class="opciones-fila"><button type="button" class="boton boton--chico" data-agregar>Dejar mis datos</button>
          <a class="boton boton--linea boton--chico" href="${wa(r)}" target="_blank" rel="noopener" data-whatsapp>Mandarlo por WhatsApp</a>
          <button type="button" class="boton boton--linea boton--chico" data-enviar-asi>Enviar así</button></div>`;
      caja.innerHTML = aviso;
      caja.scrollIntoView({ block: 'nearest', behavior: reduceMovimiento() ? 'auto' : 'smooth' });
      return;
    }
    const boton = $('#pedido-enviar');
    boton.disabled = true;
    const v = visita();
    const ok = typeof Historial !== 'undefined' && await Historial.enviar({
      tipo: 'pedido', prueba: (typeof window !== 'undefined' && window.JK_LAB_PRUEBA) || undefined, mensaje: mensaje(r), cuota: st.cuota, seleccion: pedido(), total: r.total, bruto: r.bruto, servicios: r.servicios, codigo: st.codigo && st.codigo.h,
      version: r.version, tipo_de_cambio: r.tipo_de_cambio, urgencia: st.urgencia, publicar: st.publicar, otra: st.otra, contar: st.contar,
      contacto: contacto.valor ? { plataforma: contacto.medio, medio: contacto.valor } : null, nombre: contacto.nombre || null, diagnostico: v.id || null,
      situaciones: r.servicios.map(x => st.servicios[x.servicio]?.situacion).filter(Boolean)
    });
    boton.disabled = false;
    if (!ok) { aviso = ''; caja.textContent = `No se pudo enviar. Intenta de nuevo, o escríbeme por WhatsApp o a ${CONTACTO.usuario} en Instagram.`; return; }
    st = { ...nuevo(), cuota: st.cuota };
    guardar();
    contacto.valor = contacto.nombre = ''; pedirOtra = false; aviso = '';
    pintar();
    dlg().close();
    avisar('Listo. Jean lo lee y te responde.');
  }

  /* Lo que no encontró el buscador pasa a Pedir otra cosa con lo que ya escribió */
  /* Ciberseguridad: tocar una acción la anota en Pedir otra cosa, un renglón por acción, y tocarla otra vez la quita.
     No abre el pedido, para no cortar lo que la persona estaba haciendo */
  const renglones = () => st.otra.split('\n').map(t => t.trim()).filter(Boolean);
  function anotar(texto) {
    const r = renglones(), i = r.indexOf(texto);
    i < 0 ? r.push(texto) : r.splice(i, 1);
    st.otra = r.join('\n'); guardar(); actualizar();
    return i < 0;
  }
  const anotada = texto => renglones().includes(texto);

  function pedirConTexto(texto) {
    if (texto && !st.otra.trim()) { st.otra = texto; guardar(); }
    abrirPedido('otra');
  }

  /* Pedir ayuda: con algo en el pedido abre la lista; sin nada, lleva a la calculadora. Otra cosa abre el campo para escribir */
  function pedirAyuda(cual) {
    if (cual === 'otra') return abrirPedido('otra');
    if (activos().length) return abrirPedido();
    const destino = $('#precios');
    if (destino) window.saltarA ? saltarA(destino) : destino.scrollIntoView();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('#precios')) return;
    pintar();
    escuchar();
    escucharPedido();
    document.addEventListener('click', e => {
      const p = e.target.closest('[data-pedir]');
      if (p) pedirAyuda(p.dataset.pedir);
    });
    /* el dólar en uso lo escribe una tarea diaria; si no se puede leer, se usa el de la tabla (factor 1) */
    fetch('tipo-de-cambio.json', { cache: 'no-cache' }).then(r => r.json()).then(j => {
      if (+j.en_uso > 0 && +j.en_uso !== estado.tipo_de_cambio_en_uso) { estado.tipo_de_cambio_en_uso = +j.en_uso; actualizar(true); }
    }).catch(() => {});
    const h = location.hash.match(/^#pedir(?:-(\w+))?$/);
    if (h) h[1] && servicioDe(h[1]) ? setTimeout(() => abrirServicio(h[1]), 300) : setTimeout(() => pedirAyuda(), 300);
  });

  return { pedirConSituacion, abrirServicio, abrirPedido, pedirConTexto, anotar, anotada };
})();
