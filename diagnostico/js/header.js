// Calendario oficial de vinculación 2026: índice = último dígito del celular.
// fecha = día límite (a medianoche). El día exacto se marca como "Plazo vencido".
const PLAZOS = [
    { d: 0, mes: 'agosto', dia: 15, fecha: new Date(2026, 7, 15) },
    { d: 1, mes: 'agosto', dia: 31, fecha: new Date(2026, 7, 31) },
    { d: 2, mes: 'septiembre', dia: 15, fecha: new Date(2026, 8, 15) },
    { d: 3, mes: 'septiembre', dia: 30, fecha: new Date(2026, 8, 30) },
    { d: 4, mes: 'octubre', dia: 15, fecha: new Date(2026, 9, 15) },
    { d: 5, mes: 'octubre', dia: 31, fecha: new Date(2026, 9, 31) },
    { d: 6, mes: 'noviembre', dia: 15, fecha: new Date(2026, 10, 15) },
    { d: 7, mes: 'noviembre', dia: 30, fecha: new Date(2026, 10, 30) },
    { d: 8, mes: 'diciembre', dia: 15, fecha: new Date(2026, 11, 15) },
    { d: 9, mes: 'diciembre', dia: 31, fecha: new Date(2026, 11, 31) }
];

// Días-calendario desde HOY (00:00) hasta el día del plazo. 0 = hoy es el plazo.
const hoy0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const diasHasta = fecha => Math.round((fecha - hoy0()) / 86400000);

function updateTimer() {
    const el = document.getElementById('timer');
    const lbl = document.getElementById('timer-label');
    const next = document.getElementById('timer-next');
    const caja = el && el.closest('.jk-header__plazo');
    if (!el) return;

    // Plazo vigente: el primero cuyo día aún no ha pasado (incluye hoy).
    // Es un dato, no una alarma: sin rojo, sin parpadeo.
    const idx = PLAZOS.findIndex(p => diasHasta(p.fecha) >= 0);
    if (idx === -1) {
        if (lbl) lbl.textContent = 'Calendario';
        el.textContent = 'cerrado';
        if (next) next.textContent = '';
        return;
    }
    const p = PLAZOS[idx];
    const dias = diasHasta(p.fecha);
    if (lbl) lbl.innerHTML = `Dígito ${p.d}<span class="cd-fecha">, ${p.dia} de ${p.mes}</span>`;
    el.textContent = dias === 0 ? 'vence hoy' : `${dias} día${dias === 1 ? '' : 's'}`;
    caja?.classList.toggle('hoy', dias === 0);
    if (next) {
        const sig = PLAZOS[idx + 1];
        next.textContent = sig ? `Sigue el dígito ${sig.d}, el ${sig.dia} de ${sig.mes}, en ${diasHasta(sig.fecha)} días` : '';
    }
}

// Hojas (dialog): abren desde abajo en celular, cierran con Esc o tocando fuera
function abrirHoja(d, abrir) {
    if (!d) return;
    if (abrir === undefined) abrir = !d.open;
    if (abrir && !d.open) { d.showModal ? d.showModal() : d.setAttribute('open', ''); }
    else if (!abrir && d.open) d.close();
}
document.addEventListener('click', e => { if (e.target.matches?.('dialog.hoja-diag')) e.target.close(); });

function toggleCalendarInfo(show) {
    const d = document.getElementById('calendar-modal');
    const lista = document.getElementById('cal-lista');
    if (lista && !lista.childElementCount) {
        const idx = PLAZOS.findIndex(p => diasHasta(p.fecha) >= 0);
        lista.innerHTML = PLAZOS.map((p, i) => {
            const dias = diasHasta(p.fecha);
            const estado = dias < 0 ? 'ya pasó' : dias === 0 ? 'vence hoy' : `faltan ${dias} días`;
            return `<li class="${i === idx ? 'es-hoy' : dias < 0 ? 'paso' : ''}"><b>${p.d}</b><span>${p.dia} de ${p.mes}</span><small>${estado}</small></li>`;
        }).join('');
    }
    abrirHoja(d, show);
}

let _qaCargado = false;
async function toggleQAModal(show) {
    const d = document.getElementById('qa-modal');
    abrirHoja(d, show);
    if (!d?.open || _qaCargado) return;
    const caja = document.getElementById('qaModalContainer');
    if (window.PREGUNTAS_HTML) { caja.innerHTML = window.PREGUNTAS_HTML; _qaCargado = true; return; }
    try {
        const html = await (await fetch('preguntas.html')).text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const secciones = [...doc.querySelectorAll('.qa-seccion')];
        if (!secciones.length) throw new Error('sin secciones');
        caja.innerHTML = secciones.map(x => x.outerHTML).join('');
        _qaCargado = true;
    } catch (e) {
        caja.innerHTML = '<p>No cargaron aquí, quizá por la conexión. Ábrelas en <a href="preguntas.html">la página de preguntas</a>.</p>';
    }
}

// Búsqueda sin acentos ni mayúsculas
const _limpio = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function filterModalQA() {
    const q = _limpio(document.getElementById('qaModalSearchInput')?.value.trim() || '');
    let vistas = 0;
    document.querySelectorAll('#qaModalContainer .qa').forEach(det => {
        const ve = !q || _limpio(det.textContent).includes(q);
        det.hidden = !ve;
        if (ve) vistas++;
        det.open = !!(q && ve && q.length > 2);
    });
    document.querySelectorAll('#qaModalContainer .qa-seccion').forEach(sec => { sec.hidden = !sec.querySelector('.qa:not([hidden])'); });
    const r = document.getElementById('qa-resultado');
    if (r) r.textContent = q ? (vistas ? `${vistas} pregunta${vistas === 1 ? '' : 's'}` : 'Ninguna pregunta tiene esa palabra.') : '';
}
document.addEventListener('input', e => { if (e.target.id === 'qaModalSearchInput') filterModalQA(); });

// Barra de lectura y estado del encabezado: un solo listener pasivo, un rAF por cuadro,
// y la altura del documento medida con ResizeObserver en lugar de en cada evento.
(function () {
    let alto = 0, pendiente = false;
    const medir = () => { alto = document.documentElement.scrollHeight - innerHeight; };
    const pintar = () => {
        pendiente = false;
        const y = scrollY;
        const barra = document.getElementById('reading-bar');
        if (barra) barra.style.transform = `scaleX(${alto > 0 ? Math.min(1, y / alto) : 0})`;
        document.getElementById('header')?.classList.toggle('scrolled-header', y > 50);
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }, { passive: true });
    document.addEventListener('DOMContentLoaded', () => {
        new ResizeObserver(() => { medir(); pintar(); }).observe(document.body);
        // Alto real del encabezado (con las fases dentro), para que lo fijo no tape lo que sigue
        const raiz = document.documentElement.style;
        const header = document.getElementById('header');
        if (header) new ResizeObserver(() => raiz.setProperty('--alto-header', header.offsetHeight + 'px')  /* incluye la muesca (safe-area) */).observe(header);
        medir(); pintar();
    });
})();

document.addEventListener("DOMContentLoaded", function () {
    updateTimer();
    setInterval(updateTimer, 60000); // refresco por si cruza medianoche
});

// Menú del encabezado, desplegable en todas las pantallas
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('menu-header');
    const panel = document.getElementById('menu-panel');
    if (!btn || !panel) return;
    const cerrar = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => {
        const abrir = panel.hidden;
        panel.hidden = !abrir;
        btn.setAttribute('aria-expanded', String(abrir));
    });
    panel.addEventListener('click', e => { if (e.target.closest('.jk-header__accion')) cerrar(); });
    document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('#menu-panel, #menu-header')) cerrar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
});

// El acuerdo del DOF se carga dentro de una hoja solo cuando se pide
function abrirAcuerdo() {
    const d = document.getElementById('acuerdo-modal');
    const f = document.getElementById('acuerdo-marco');
    abrirHoja(d, true);
    // Se pide después de abrir: un marco dentro de una hoja cerrada no carga
    if (f && !f.getAttribute('src')) requestAnimationFrame(() => { f.src = 'https://dof.gob.mx/nota_detalle_popup.php?codigo=5775677'; });
}
