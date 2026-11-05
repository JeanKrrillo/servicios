/* preguntas.js · aviso de temporada del registro de líneas. Llegar con #p12 abre esa respuesta; abrir una cierra las demás
   de su sección. Las fechas ya vencidas no se muestran, y quien dice en qué termina su número ve primero la suya.
   Desde el 15 de enero de 2027 la página queda marcada como archivada (y ya no sale en el índice, pestanas.js) */
document.addEventListener('DOMContentLoaded', () => {
  const hoy = new Date().toISOString().slice(0, 10);
  const temporada = $('[data-temporada-hasta]');
  if (temporada && hoy >= temporada.dataset.temporadaHasta) $('#antetitulo').textContent = 'Archivado el 15 de enero de 2027';

  const filas = $$('#fechas tr'), caja = $('#digitos'), tuya = $('#digito-fecha');
  filas.forEach(tr => { tr.hidden = tr.dataset.fecha < hoy; });
  if (caja) {
    caja.innerHTML = '<span class="digitos__pregunta">¿En qué termina tu número?</span>' + filas.map((tr, d) => `<button type="button" class="digito" aria-pressed="false" data-d="${d}">${d}</button>`).join('');
    caja.addEventListener('click', e => {
      const b = e.target.closest('[data-d]');
      if (!b) return;
      $$('.digito', caja).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const tr = filas[+b.dataset.d], fecha = tr.cells[1].textContent;
      tuya.hidden = false;
      tuya.textContent = tr.dataset.fecha < hoy ? `Tu fecha ya pasó, fue el ${fecha}.` : `Tu fecha: ${fecha} de 2026.`;
      filas.forEach(x => x.classList.toggle('es-tuya', x === tr));
      if (tr.dataset.fecha >= hoy) tr.parentElement.prepend(tr);
    });
  }

  const abrir = () => {
    const d = document.getElementById(location.hash.slice(1));
    if (d && d.tagName === 'DETAILS') { d.open = true; d.scrollIntoView({ block: 'start' }); }
  };
  abrir();

  /* Buscador: deja solo las preguntas que tienen la palabra, sin importar acentos */
  const limpio = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const campo = $('#buscar'), aviso = $('#buscar-resultado');
  campo?.addEventListener('input', () => {
    const q = limpio(campo.value.trim());
    let vistas = 0;
    $$('.qa').forEach(d => {
      const ve = !q || limpio(d.textContent).includes(q);
      d.hidden = !ve;
      if (ve) vistas++;
      if (q && ve && q.length > 2) d.open = true;
      if (!q) d.open = false;
    });
    $$('.qa-seccion').forEach(sec => { const tiene = $$('.qa', sec).length; if (tiene) sec.hidden = !$$('.qa:not([hidden])', sec).length; });
    aviso.hidden = !q;
    aviso.textContent = vistas ? `${vistas} pregunta${vistas === 1 ? '' : 's'}` : 'Ninguna pregunta tiene esa palabra.';
  });
  addEventListener('hashchange', abrir);
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open || $('#buscar')?.value.trim()) return;
    $$('details[open]', d.parentElement).forEach(x => { if (x !== d) x.open = false; });
  }, true);
});
