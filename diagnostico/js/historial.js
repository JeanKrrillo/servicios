/* ============================================================
   historial.js · las respuestas le llegan a Jean, cifradas
   ------------------------------------------------------------
   Pedestal, Anonimato y Principio Ético de Jean:
   · "Solo yo lo puedo ver, y esos datos se usan para mejorar el
     servicio, respetando la identidad de las personas".
   · Reglamento 2.1, 2.2 y 2.7.
   · Cada cambio (contestar, tocar defensas, borrar, dejar contacto)
     se junta y, unos segundos después del último toque, sale un paquete.
   · El paquete se cierra en el celular/navegador con la Web Crypto API:
     las respuestas y eventos con una llave AES-GCM 256 nueva, y esa
     llave con la llave pública RSA-OAEP 3072 de Jean.
   · Apps Script solo guarda filas cerradas; la llave privada vive
     en privado/formulario y nunca en la página ni en Google.
   · Mientras ENDPOINT esté vacío no se manda nada y la página no
     promete envío (ver privado/formulario/LEEME.md).
   ============================================================ */

const Historial = (() => {
  // Link de la app web de Apps Script (termina en /exec). Vacío = no se manda nada.
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxFKRQcKbN5AYbUAHlPffn8s4WCdQAZKXQJLNBnvWsZO4sN4Q5Wv_8pS3eRvbxuXAG_zA/exec';
  // Llave pública RSA-OAEP 3072 de Jean (SPKI en base64). La privada no sale de privado/.
  const LLAVE_PUBLICA = 'MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAskFlgutskoOD8wEIvbf6klI42pZs7zEU2boGFYghJtpuqmxwRZFBkddLFJ59AeOQ75bbs/lqZiLoz3audq0bnt3VyVTb6W1RRGPh5cGEXPnnjZSlVTblBszYizONdKRq5PgOq3/lm6f2eBZyXHYaZMNHBGLnwEcv5PpXEspo6rjM/4NL+hTUfUv40SOREnTkWBdmAPVdxvo7GN28UwOR+ivGZjvYRAbTwpgZYMCSQ1Jk/m9qlSyfmUeOH9B6w2+Sq6CEqwWGlcz4GXr9nUy+x3ib28Dg0PyD2lSzt26tC7LdowhQOF6IZF95OBe+NvGHn6XeM+xq+UZIePHHF8u/TJq/Uei9eb0+bhRFJFAJD7DEhwlVuNMjn1iKqURYBuJMNTLKxqsUrrochIJJpQiSWO3C7S3AAybrqrAhkc8LBzVuCyqtoTFJBv5rshJ3/N22NN9sT/EedJArol/ysqWfk9aDDnVnNcmeVBza2iTWrHDWIFVMhLF2ETtz3QoO5yAZAgMBAAE=';

  // Sin consentimiento explícito (ver notificacion.js) no sale ningún paquete.
  const consentido = () => { try { return localStorage.getItem('jk-consent') === 'si'; } catch (e) { return false; } };
  const activo = () => consentido() && !!ENDPOINT && !!(window.crypto && crypto.subtle);
  // Guardar un contacto ya es pedir que te contacten: eso se manda aunque no se haya aceptado medir la visita,
  // y en ese caso sin los datos técnicos, que la persona sí rechazó
  const pidioContacto = () => { try { return localStorage.getItem('jk-contacto') === 'si'; } catch (e) { return false; } };
  const puedeMandar = () => (consentido() || pidioContacto()) && !!ENDPOINT && !!(window.crypto && crypto.subtle);
  let espera = 0, pendiente = null, llave = null;

  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function llavePublica() {
    if (!llave) llave = await crypto.subtle.importKey('spki', deB64(LLAVE_PUBLICA), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    return llave;
  }

  async function cerrar(datos) {
    /* con una llave del laboratorio en este navegador, todo sale marcado como prueba (laboratorio.js) */
    let marca = window.JK_LAB_PRUEBA;
    if (marca === undefined) { try { const l = JSON.parse(localStorage.getItem('jk-lab')); marca = l && l.h ? (l.duenio ? 'jean' : 'laboratorio') : null; } catch (e) { marca = null; } }
    if (marca && datos && !datos.prueba) datos = { ...datos, prueba: marca };
    const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cuerpo = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(datos)));
    const crudo = await crypto.subtle.exportKey('raw', aes);
    const k = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, await llavePublica(), crudo);
    return { v: 1, k: b64(k), iv: b64(iv), c: b64(cuerpo) };
  }

  async function mandar() {
    if (!pendiente || !puedeMandar()) return;
    let datos = pendiente; pendiente = null;
    if (!consentido()) { datos = { ...datos }; delete datos.tecnico; }
    try {
      const paquete = await cerrar(datos);
      // El número de visita y la hora van a la vista para ordenar; no dicen nada de la persona
      const fila = JSON.stringify({ id: datos.id, t: datos.actualizado || new Date().toISOString(), p: paquete });
      const ok = navigator.sendBeacon?.(ENDPOINT, new Blob([fila], { type: 'text/plain' }));
      if (!ok) fetch(ENDPOINT, { method: 'POST', body: fila, mode: 'no-cors', keepalive: true }).catch(() => { });
    } catch (e) { /* si falla, el siguiente cambio vuelve a intentar */ }
  }

  // Identifica si hay contenido digno de enviarse: respuestas, apps, contacto o navegación activa
  const tieneAlgo = d => d && (
    d.borrado ||
    Object.keys(d.preguntas || {}).length > 0 ||
    (d.deslizar || []).length > 0 ||
    (d.orbita || []).length > 0 ||
    (d.fractura || []).length > 0 ||
    d.contacto ||
    d.contrasena ||
    (d.clics || []).length > 0 ||
    (d.tecnico && d.tecnico.eventos && d.tecnico.eventos.length >= 2) ||
    (d.tecnico && d.tecnico.uso && (d.tecnico.uso.segundos_en_pagina > 3 || d.tecnico.uso.misclics > 0))
  );

  function encolar(datos, ya) {
    if (!puedeMandar() || !tieneAlgo(datos)) return;
    pendiente = datos;
    clearTimeout(espera);
    espera = setTimeout(mandar, ya ? 0 : 3000);
  }

  document.addEventListener('estado:guardado', e => encolar(e.detail));
  // Borrar todo: se avisa que esa visita se borró en el celular (la copia de Jean se borra si la persona lo pide)
  document.addEventListener('estado:borrado', e => encolar({ id: e.detail.id, actualizado: new Date().toISOString(), borrado: true }, true));

  // Al salir de la página, si hay telemetría pendiente se envía de inmediato
  addEventListener('pagehide', () => {
    if (pendiente) {
      mandar();
    } else if (activo()) {
      // Si estamos en una página sin Estado explícito (ej. Servicios) o con telemetría acumulada
      try {
        if (typeof Medir !== 'undefined' && Medir.eventos >= 2) {
          // Mismo número que el autodiagnóstico: Identidad es la fuente única (localStorage compartido)
          const idSesion = (typeof Identidad !== 'undefined' && Identidad.id())
            || (typeof Estado !== 'undefined' && Estado.cargar && Estado.cargar().id)
            || (Medir.nuevoId ? Medir.nuevoId() : 'JK-PORT01');

          const datosSalida = {
            id: idSesion,
            creado: new Date().toISOString(),
            actualizado: new Date().toISOString(),
            preguntas: typeof forensicAnswers !== 'undefined' ? { ...forensicAnswers } : {},
            contacto: null,
            tecnico: Medir.resumen()
          };
          pendiente = datosSalida;
          mandar();
        }
      } catch (e) {}
    }
  });

  // El aviso dice la verdad: con envío activo menciona el cifrado; sin él, solo el celular
  document.addEventListener('DOMContentLoaded', () => {
    const nota = document.getElementById('aviso-envio');
    if (nota) nota.hidden = !activo();
  });

  /* Pedido o mensaje que la persona manda a propósito (calculadora, laboratorio): es pedir que la contacten, así que sale
     aunque no haya aceptado medir la visita, cifrado igual y sin datos técnicos. Dice si salió para avisarle (6.3) */
  async function enviar(datos) {
    if (!ENDPOINT || !(window.crypto && crypto.subtle)) return false;
    const id = (typeof Identidad !== 'undefined' && Identidad.id()) || 'JK-' + Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
    const ahora = new Date().toISOString();
    try {
      const fila = JSON.stringify({ id, t: ahora, p: await cerrar({ id, actualizado: ahora, ...datos }) });
      if (navigator.sendBeacon?.(ENDPOINT, new Blob([fila], { type: 'text/plain' }))) return true;
      await fetch(ENDPOINT, { method: 'POST', body: fila, mode: 'no-cors', keepalive: true });
      return true;
    } catch (e) { return false; }
  }

  return { get activo() { return activo(); }, endpoint: ENDPOINT, encolar, mandar, enviar };
})();
