/* ============================================================
   acceso-visor.js · atajo privado al visor de Jean
   ------------------------------------------------------------
   · No es un candado: el visor en Apps Script solo responde a la
     cuenta de Google de Jean (ver Codigo.gs, esDueno_). Esto solo
     ahorra tener que ir a buscar el link; cualquiera que lo active
     y entre, igual topa con el login de Google y una página vacía.
   · Secuencia: Alt+J y luego Alt+K (en ese orden). El logo queda
     "armado" 3 segundos; si se hace clic en él en ese lapso, lleva
     al visor. Si no, el logo vuelve a su destino normal (la portada).
   ============================================================ */

(() => {
  // URL /exec del visor (Apps Script). Solo abre el panel para la cuenta dueña.
  const VISOR = 'https://script.google.com/macros/s/AKfycbyGtYJJtj5bFo8SuCnzPQ5TdTCIEZiu2GNCPSe-8K_MwqyQnrQk6lJr85LmE842P7HqFw/exec';

  const logo = document.querySelector('.marca-jk');
  if (!logo) return;

  let paso = 0;          // 0 = nada, 1 = Alt+J visto (espera Alt+K)
  let armado = false;
  let destinoOriginal = logo.getAttribute('href');
  let temporizador = 0;

  function desarmar() {
    armado = false;
    clearTimeout(temporizador);
    logo.classList.remove('marca-jk--armado');
    logo.setAttribute('href', destinoOriginal);
    logo.removeAttribute('title');
  }

  function armar() {
    armado = true;
    logo.classList.add('marca-jk--armado');
    logo.setAttribute('href', VISOR);
    logo.setAttribute('title', 'Abrir el visor privado');
    clearTimeout(temporizador);
    temporizador = setTimeout(desarmar, 3000);   // 3 s y vuelve a la normalidad
  }

  document.addEventListener('keydown', e => {
    if (!e.altKey) { paso = 0; return; }
    const k = (e.key || '').toLowerCase();
    if (k === 'j') { paso = 1; return; }
    if (k === 'k' && paso === 1) { paso = 0; armar(); return; }
    paso = 0;
  });

  // El clic al visor abre en pestaña nueva y no desarma hasta navegar; si no estaba armado, comportamiento normal.
  logo.addEventListener('click', e => {
    if (!armado) return;                 // logo normal → deja pasar al destino de siempre
    e.preventDefault();
    window.open(VISOR, '_blank', 'noopener');
    desarmar();
  });
})();
