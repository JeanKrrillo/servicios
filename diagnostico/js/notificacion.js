/* ============================================================
   notificacion.js · consentimiento antes de medir nada
   ------------------------------------------------------------
   Pedestal y Principio Ético de Jean:
   · "respetando la identidad de las personas".
   · El interruptor va ANTES de recolectar, no antes de enviar:
     así el botón "No, gracias" dice la verdad. Mientras
     no haya un "sí" explícito, medir.js e historial.js se quedan
     dormidos (ver la guarda al inicio de cada uno).
   · No se borra nada: solo se enciende la telemetría con permiso.

   Contrato con los demás módulos:
   · Bandera: localStorage 'jk-consent' = 'si' | 'no' | (ausente).
   · window.JK_CONSENT lo refleja de forma síncrona para los scripts.
   · Al aceptar, se emite el evento 'jk:consentido' por si algún
     módulo quiere (re)inicializarse en ese momento.
   ============================================================ */

(() => {
  const CLAVE = 'jk-consent';

  const leer = () => { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } };
  const guardar = v => { try { localStorage.setItem(CLAVE, v); } catch (e) {} };
  window.JK_CONSENT = leer();

  /* Texto de la reestructuración del 2026-10-23 (1.2), tal cual. Pendiente de Jean: medir.js todavía junta más de lo
     que dice esta lista (huella del aparato, lo conectado y lo que se escribe); él decide si se recorta medir.js */
  const QUE_SE_MIDE = 'Qué tan rápido carga la página y dónde falla, junto con tu dirección de red, tu aparato, tu navegador, tus clics o toques y cuánto tiempo te quedas.';

  function cerrar(decision) {
    guardar(decision);
    window.JK_CONSENT = decision;
    document.getElementById('jk-consent-aviso')?.remove();
    if (decision === 'si') document.dispatchEvent(new CustomEvent('jk:consentido'));
  }

  // Franja abajo que deja usar la página mientras se decide (reglamento 16.1): sin decidir no se mide nada
  function construir() {
    if (document.getElementById('jk-consent-aviso')) return;
    const caja = document.createElement('section');
    caja.id = 'jk-consent-aviso';
    caja.setAttribute('aria-labelledby', 'jk-consent-titulo');
    caja.style.cssText = 'position:fixed;left:max(12px, env(safe-area-inset-left));right:max(12px, env(safe-area-inset-right));bottom:calc(var(--alto-pestanas, 0px) + 12px);z-index:9999;max-width:560px;margin:0 auto;max-height:70dvh;overflow:auto;background:var(--papel,#f3f2ee);color:var(--tinta,#121217);border:2px solid var(--tinta,#121217);border-radius:16px;padding:12px 14px;font:400 .9rem/1.4 var(--f-texto,system-ui)';
    const boton = 'flex:1 1 auto;font:700 .9rem/1.2 var(--f-titulo,sans-serif);cursor:pointer;min-height:44px;padding:.5em .9em;border-radius:999px;border:2px solid var(--tinta,#121217)';
    const actual = leer();
    caja.innerHTML = `
      <p style="margin:0">Este sitio mide tu visita para ver dónde se traba y arreglarlo, solo si tú aceptas. Si no aceptas, no se mide nada y todo funciona igual.</p>
      <details style="margin:0 0 .3em"><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;text-decoration:underline;text-underline-offset:3px">¿Qué se mide?</summary>
        <p style="margin:.3em 0 0">${QUE_SE_MIDE}</p></details>
      <p style="margin:0 0 .5em"><b id="jk-consent-titulo">¿Dejas que se mida tu visita?</b>${actual ? ` <span style="opacity:.75">Hoy: ${actual === 'si' ? 'sí' : 'no'}.</span>` : ''}</p>
      <div style="display:flex;flex-wrap:wrap;gap:.5em">
        <button type="button" id="jk-consent-no" style="${boton};background:var(--tinta,#121217);color:var(--papel,#f3f2ee)">No, gracias</button>
        <button type="button" id="jk-consent-si" style="${boton};background:transparent;color:var(--tinta,#121217)">Sí, está bien</button>
      </div>
      <p style="margin:.6em 0 0;font-size:.8rem;opacity:.8">Puedes cambiar tu respuesta cuando quieras desde Privacidad, que está arriba o en el menú de cada pantalla.</p>`;
    (document.body || document.documentElement).appendChild(caja);
    document.getElementById('jk-consent-no').addEventListener('click', () => cerrar('no'));
    document.getElementById('jk-consent-si').addEventListener('click', () => cerrar('si'));
    // Esc = la opción prudente, nunca un sí por accidente; si ya había respuesta, Esc solo cierra
    caja.addEventListener('keydown', e => { if (e.key === 'Escape') actual ? caja.remove() : cerrar('no'); });
    if (actual) document.getElementById('jk-consent-titulo').closest('p').scrollIntoView?.({ block: 'nearest' });
  }

  /* Botón Privacidad en la barra de arriba de cada página (y el del pie): vuelve a abrir la pregunta */
  function ponerBoton() {
    const menu = document.querySelector('#menu-panel'), vecino = document.querySelector('[data-tema-boton]');
    // En el autodiagnóstico la fila de arriba no tiene lugar (en celular tapaba el título), así que va en su menú
    if (menu && !menu.querySelector('[data-privacidad]')) {
      menu.querySelector('a[href="principios.html"]')?.insertAdjacentHTML('beforebegin', '<button type="button" class="jk-header__accion" data-privacidad><i class="ph ph-lock-simple" aria-hidden="true"></i><span>Privacidad</span></button>');
    } else if (vecino && !document.querySelector('.privacidad-boton')) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'privacidad-boton', textContent: 'Privacidad' });
      b.dataset.privacidad = '';
      b.style.cssText = 'font-size:var(--fs-chico,.85rem);min-height:44px;padding:0 .35rem;border:0;background:none;color:inherit;text-decoration:underline;text-underline-offset:.18em;cursor:pointer';
      vecino.parentElement.insertBefore(b, vecino.parentElement.querySelector('.musica-boton') || vecino);
    }
    document.addEventListener('click', e => { if (e.target.closest('[data-privacidad]')) { document.getElementById('jk-consent-aviso')?.remove(); construir(); document.getElementById('jk-consent-no')?.focus(); } });
  }
  window.Privacidad = { abrir: construir };

  const iniciar = () => { ponerBoton(); if (!leer()) construir(); };   // se pregunta una sola vez y se guarda la respuesta
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
