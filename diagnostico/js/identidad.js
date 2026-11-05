/* ============================================================
   identidad.js · el número de visita (JK) de la persona, uno solo
   para todas las páginas del sitio
   ------------------------------------------------------------
   · Fuente única del JK-XXXXXX. Vive en localStorage (compartido
     entre páginas del mismo dominio), así la portada y el
     autodiagnóstico usan el MISMO número: la actividad de una
     persona se ve como un recorrido, no como visitas sueltas.
   · Sigue siendo local y borrable: "reiniciar" en el
     autodiagnóstico lo renueva. Es un seudónimo (luego pigmento),
     nunca un dato personal (reglamento 10 y 11).
   · estado.js (autodiagnóstico) usa este mismo número para no
     generar uno aparte; la portada lo lee con Identidad.id.
   ============================================================ */

const Identidad = (() => {
  const CLAVE = 'jk-id';
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin letras que se confunden

  function nuevo() {
    let r;
    try { r = crypto.getRandomValues(new Uint8Array(6)); }
    catch (e) { r = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256)); }
    return 'JK-' + [...r].map(n => abc[n % abc.length]).join('');
  }

  function leer() {
    try { const v = localStorage.getItem(CLAVE); return /^JK-[A-Z0-9]{6}$/.test(v || '') ? v : null; } catch (e) { return null; }
  }

  function id() {
    let v = leer();
    if (!v) { v = nuevo(); try { localStorage.setItem(CLAVE, v); } catch (e) {} }
    return v;
  }

  // Lo usa "reiniciar": renueva el número (la persona empieza de cero).
  function renovar() {
    const v = nuevo();
    try { localStorage.setItem(CLAVE, v); } catch (e) {}
    return v;
  }

  return { id, renovar, nuevo };
})();

window.Identidad = Identidad;
