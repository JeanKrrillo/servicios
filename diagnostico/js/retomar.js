/* ============================================================
   retomar.js · al volver con respuestas guardadas se sigue donde
   se quedó, y empezar de nuevo se ofrece sin tapar la página
   ------------------------------------------------------------
   · Las respuestas viven en el celular (estado.js) y no se borran
     al salir. Si la persona vuelve y ya tenía avance, la página sigue
     donde lo dejó, sin un aviso que la detenga.
   · Empezar de nuevo: tres toques (va avisando), para que nadie pierda su
     avance por un toque accidental. Reglamento: buena UX, la
     persona manda sobre sus datos.
   · Solo aparece si de verdad hay algo contestado de antes.
   ============================================================ */

(() => {
  // Espera a que Estado exista y tenga datos cargados (app.js llama Estado.cargar en initMaster).
  function listo() {
    return typeof Estado !== 'undefined' && Estado.datos && typeof Estado.hayAvance === 'function';
  }

  function arranca() {
    if (!listo()) { setTimeout(arranca, 120); return; }
    if (!Estado.hayAvance()) return;               // primera vez o sin avance: no molesta
    if (sessionStorage.getItem('jk-retomar-visto')) return;  // ya decidió en esta sesión
    try { sessionStorage.setItem('jk-retomar-visto', '1'); } catch (e) {}
    construir();
  }

  // Ya está restaurado, así que se sigue sin preguntar y se lleva a la fase donde se quedó.
  // Empezar de nuevo se ofrece una vez en una franja que no tapa la página (16.1), con los tres toques de la 13.2.
  function construir() {
    if (document.getElementById('jk-retomar')) return;
    try {
      const fase = typeof Estado.ultimaFase === 'function' ? Estado.ultimaFase() : 1;
      if (fase > 1 && typeof goToStep === 'function') setTimeout(() => goToStep(fase), 150);
    } catch (e) {}

    const caja = document.createElement('section');
    caja.id = 'jk-retomar';
    caja.setAttribute('role', 'status');
    const consentimiento = document.getElementById('jk-consent-aviso');
    const abajo = consentimiento ? consentimiento.offsetHeight + 24 : 12;
    caja.style.cssText = `position:fixed;left:max(12px, env(safe-area-inset-left));right:max(12px, env(safe-area-inset-right));bottom:calc(${abajo}px + var(--alto-pestanas, 0px));z-index:9998;max-width:560px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:.4em .8em;background:var(--papel,#f3f2ee);color:var(--tinta,#121217);border:2px solid var(--tinta,#121217);border-radius:16px;padding:10px 14px;font:400 .92rem/1.4 var(--f-texto,system-ui)`;
    const boton = 'min-height:44px;padding:.4em .9em;border-radius:999px;cursor:pointer;font:600 .88rem/1.2 var(--f-texto,sans-serif)';
    caja.innerHTML = `
      <p style="margin:0;flex:1 1 12rem">Seguiste donde lo dejaste.</p>
      <button type="button" id="jk-retomar-reiniciar" data-faltan="3" style="${boton};background:transparent;color:var(--tinta,#121217);border:2px solid var(--tinta-35,currentColor)">Empezar de nuevo (3 toques)</button>
      <button type="button" id="jk-retomar-seguir" style="${boton};background:var(--tinta,#121217);color:var(--papel,#f3f2ee);border:2px solid var(--tinta,#121217)">Listo</button>`;
    (document.body || document.documentElement).appendChild(caja);

    const cerrar = () => caja.remove();
    document.getElementById('jk-retomar-seguir').addEventListener('click', cerrar);
    caja.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

    const btn = document.getElementById('jk-retomar-reiniciar');
    btn.addEventListener('click', () => {
      const faltan = parseInt(btn.dataset.faltan, 10) - 1;
      btn.dataset.faltan = faltan;
      if (faltan <= 0) {
        btn.textContent = 'Empezando de nuevo';
        try { Estado.borrarTodo(); } catch (e) {}
        location.reload();
        return;
      }
      btn.textContent = faltan === 1 ? 'Un toque más' : `${faltan} toques más`;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca);
  else arranca();
})();
