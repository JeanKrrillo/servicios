/* ciber.js · Ciberseguridad, en beta (datos en datos-ciber.js).
   Dos lugares, un solo nivel de desplegable en cada uno:
   · dentro de cada servicio que tiene contraparte, abajo del precio, Ciberseguridad · beta con sus acciones;
   · debajo de la calculadora, la franja con todos, más chica que los servicios, en almagre (tabla de medidas, 2026-11-02).
   Cada acción es una etiqueta: tocarla la anota en el pedido (Pedir otra cosa) y tocarla otra vez la quita. No abre el
   pedido ni saca a la persona de donde está, así no corta el camino para pedir un servicio. Sin precio todavía.
   Si en el buscador se escribe algo de seguridad, abajo de los resultados sale un link a la franja. */
(() => {
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const limpio = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nombreDe = id => (typeof DEFENSAS !== 'undefined' && DEFENSAS.find(d => d.id === id)?.nombre) || '';
  const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const texto = (c, i) => `Ciberseguridad, ${c.acciones[i].charAt(0).toLowerCase() + c.acciones[i].slice(1)}`;
  const anotada = (c, i) => typeof Calculadora !== 'undefined' && Calculadora.anotada?.(texto(c, i));
  const etiquetas = c => `<ul class="ciber__acciones">${c.acciones.map((t, i) => `
    <li><button class="ciber__accion" type="button" data-ciber="${esc(c.id)}" data-accion="${i}" aria-pressed="${!!anotada(c, i)}">${esc(t)}</button></li>`).join('')}</ul>`;

  function franja() {
    const caja = document.getElementById('ciber');
    if (!caja || typeof CIBER === 'undefined') return;
    caja.innerHTML = `<details class="ciber__todo">
      <summary><span class="ciber__titulo" id="ciber-titulo">Ciberseguridad</span><span class="ciber__marca">Beta</span>
        <span class="ciber__ayuda">Esto lo estoy aprendiendo y todavía no tiene precio. Toca lo que quieras que haga y lo agrego a tu pedido como nota.</span></summary>
      <ul class="ciber__lista">${CIBER.map(c => `
        <li class="ciber__item" id="${esc(c.id)}"><p class="ciber__cabeza"><span class="ciber__nombre">${esc(c.nombre)}</span><span class="ciber__de">${esc(nombreDe(c.servicio))}</span></p>${etiquetas(c)}</li>`).join('')}
      </ul>
      <p class="ciber__pie">Siempre sobre lo tuyo, o con tu permiso por escrito.</p>
    </details>`;
  }

  /* dentro de cada servicio, abajo del precio */
  function enServicios() {
    CIBER.forEach(c => {
      const cuerpo = document.querySelector(`#calc-${c.servicio} .calc-servicio__cuerpo`);
      if (!cuerpo || cuerpo.querySelector('.ciber-mini')) return;
      cuerpo.insertAdjacentHTML('beforeend', `<details class="ciber-mini">
        <summary><span class="ciber__titulo">Ciberseguridad</span><span class="ciber__marca">Beta</span><span class="ciber-mini__que">${esc(c.linea)}</span></summary>
        <p class="ciber-mini__ayuda">Esto lo estoy aprendiendo y todavía no tiene precio. Toca lo que quieras que haga y lo agrego a tu pedido como nota.</p>${etiquetas(c)}
      </details>`);
    });
  }

  /* tocar una acción la anota o la quita, y se ve igual en los dos lugares */
  document.addEventListener('click', e => {
    const b = e.target.closest('.ciber__accion');
    if (b) {
      const c = CIBER.find(x => x.id === b.dataset.ciber), i = +b.dataset.accion;
      if (typeof Calculadora === 'undefined' || !Calculadora.anotar) return;
      const puesta = Calculadora.anotar(texto(c, i));
      document.querySelectorAll(`.ciber__accion[data-ciber="${c.id}"][data-accion="${i}"]`).forEach(x => x.setAttribute('aria-pressed', String(puesta)));
      if (typeof avisar === 'function') avisar(puesta ? 'Lo agregué a tu pedido.' : 'Lo quité de tu pedido.');
      return;
    }
    const a = e.target.closest('.buscar__ciber a'); if (!a) return;
    e.preventDefault();
    const todo = document.querySelector('.ciber__todo'); if (!todo) return;
    todo.open = true;
    (window.saltarA || (el => el.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' })))(todo);
  });
  /* al empezar de nuevo el pedido, lo anotado se borra: se vuelve a pintar todo */
  document.addEventListener('calc:reinicio', () => { franja(); enServicios(); });
  /* si la calculadora vuelve a pintar un servicio, se pone otra vez */
  document.addEventListener('toggle', e => { if (e.target.matches?.('.calc-servicio') && e.target.open) enServicios(); }, true);

  function buscador() {
    const campo = document.getElementById('buscar-servicio'), lista = document.getElementById('buscar-resultados');
    if (!campo || !lista || typeof CIBER_CLAVES === 'undefined') return;
    const claves = CIBER_CLAVES.split(' ');
    campo.addEventListener('input', () => {
      const palabras = limpio(campo.value).split(/[^a-z0-9]+/).filter(w => w.length > 3);
      if (!palabras.some(w => claves.some(k => k === w || (k.length > 5 && w.startsWith(k.slice(0, 6)))))) return;
      lista.insertAdjacentHTML('beforeend', `<li class="buscar__ciber"><a href="#ciber">Ver Ciberseguridad, en beta <span aria-hidden="true">→</span></a></li>`);
    });
  }

  const listo = () => { if (typeof CIBER === 'undefined') return; franja(); buscador(); enServicios(); setTimeout(enServicios, 600); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listo); else listo();
})();
