/* ============================================================
   Fractura (fracture) · fase 2, tercera actividad (ficha A-03)
   ------------------------------------------------------------
   21 apps alrededor del bloque SMS. Cada app que tocas abre una
   grieta hacia el centro, el vacío crece y el SMS se carga.
   Por fuera es el juego de la v2; por dentro:
   · se arma UNA vez; al cambiar de tamaño solo se reacomoda, con el
     mismo orden y la misma selección (antes se revolvía, A-00);
   · las apps están quietas hasta que se tocan; el temblor dura 3
     cuadros y lo causa el toque;
   · grietas en SVG dibujadas con stroke-dashoffset, vacío con scale,
     sin sombras, filtros ni desenfoque.
   ============================================================ */

let currentFractureApps = [];
let fractureSelectedApps = [];
let fractureTotalWeight = 0;
let fractureContainer;
let fractureNodes = [];        // { app, el, jx, jy, x, y, w, h }
let fractureBuilt = false;

const SVG_NS = 'http://www.w3.org/2000/svg';

function initFracture() {
    fractureContainer = document.getElementById('fracture-container');
    if (!fractureContainer) return;
    if (!fractureContainer.clientWidth) return;     // oculta: el observador la arma al aparecer
    if (fractureBuilt) return relayoutFracture();
    fractureBuilt = true;

    currentFractureApps = distributedData.fracture || [];
    fractureTotalWeight = currentFractureApps.reduce((acc, app) => acc + app.weight, 0);
    const elegidas = new Set(fractureSelectedApps.map(a => a.name));

    fractureContainer.innerHTML = `
        <div class="fracture-void"></div>
        <svg class="fracture-grietas" aria-hidden="true"></svg>
        <div class="fracture-ui-layer">
            <div class="fracture-title" id="fracture-title"><h3>Fractura</h3></div>
            <div id="fracture-risk"><div id="fracture-risk-display">00%</div></div>
        </div>
        <div id="sms-block" class="fracture-core">SMS</div>`;

    fractureNodes = currentFractureApps.map((app, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'fracture-node' + (app.weight === 5 ? ' critical-node' : '');
        el.innerHTML = `<span class="fracture-node-logo" style="background-color:${app.color}">${getAppLogoHtml(app, 'w-full h-full p-[15%] object-contain')}</span><span>${app.name}</span>`;
        el.setAttribute('aria-pressed', elegidas.has(app.name) ? 'true' : 'false');
        el.setAttribute('aria-label', app.name);
        el.title = app.name;
        if (elegidas.has(app.name)) el.classList.add('selected');
        fractureContainer.appendChild(el);
        // Semilla fija por app: el reacomodo no la mueve al azar
        const nd = { app, el, jx: Math.random() * 2 - 1, jy: Math.random() * 2 - 1 };
        el.addEventListener('click', () => tocarNodo(nd));
        gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
        gsap.to(el, { scale: 1, opacity: 1, duration: 0.5, delay: i * 0.03, ease: 'back.out(1.3)' });
        return nd;
    });

    relayoutFracture();
    pintarFractura(false);
}

function relayoutFracture() {
    if (!fractureContainer) return;
    const w = fractureContainer.clientWidth, h = fractureContainer.clientHeight;
    if (!w || !h) return;
    const svg = fractureContainer.querySelector('.fracture-grietas');
    svg?.setAttribute('viewBox', `0 0 ${w} ${h}`);
    // En angosto cada app es solo su logo, en círculo, y el nombre sale al tocarla (reglamento 5.2),
    // así caben los mismos tres anillos alrededor del SMS que en pantalla ancha
    const angosto = w < 560;
    fractureContainer.classList.toggle('fracture-zone--compacta', angosto);
    const n = fractureNodes.length;
    fractureNodes.forEach(nd => { nd.el.style.maxWidth = ''; nd.w = nd.el.offsetWidth; nd.h = nd.el.offsetHeight; });

    {
        // Tres anillos alrededor del SMS, estirados a la forma de la zona, con una repulsión corta para que no se toquen
        const per = Math.ceil(n / 3);
        const nodo = Math.max(...fractureNodes.map(nd => Math.max(nd.w, nd.h)));
        const rx = w / 2 - nodo / 2 - 10, ry = (h - 40) / 2 - nodo / 2 - 6;
        const centro = angosto ? 0.42 : 0.38;
        const fracciones = [centro, centro + (1 - centro) / 2, 1];
        fractureNodes.forEach((nd, i) => {
            const anillo = Math.min(2, Math.floor(i / per));
            const idx = i - anillo * per, tam = Math.min(per, n - anillo * per);
            const ang = (idx / Math.max(tam, 1)) * Math.PI * 2 + anillo * 0.45 + nd.jx * 0.08;
            nd.x = Math.cos(ang) * rx * fracciones[anillo];
            nd.y = Math.sin(ang) * ry * fracciones[anillo];
        });
        for (let paso = 0; paso < 40; paso++) {
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
                const a = fractureNodes[i], b = fractureNodes[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const mx = (a.w + b.w) / 2 + 12, my = (a.h + b.h) / 2 + 12;
                if (Math.abs(dx) < mx && Math.abs(dy) < my) {
                    const ox = mx - Math.abs(dx), oy = my - Math.abs(dy);
                    if (ox < oy) { const p = ox / 2 * (dx > 0 ? 1 : -1); a.x -= p; b.x += p; }
                    else { const p = oy / 2 * (dy > 0 ? 1 : -1); a.y -= p; b.y += p; }
                }
            }
            fractureNodes.forEach(nd => {
                const lx = w / 2 - nd.w / 2 - 12, ly = h / 2 - nd.h / 2 - 12;
                nd.x = Math.max(-lx, Math.min(lx, nd.x));
                nd.y = Math.max(-ly + 30, Math.min(ly, nd.y));
                const fw = 60 + nd.w / 2, fh = 28 + nd.h / 2;
                if (Math.abs(nd.x) < fw && Math.abs(nd.y) < fh) {
                    if (fw - Math.abs(nd.x) < fh - Math.abs(nd.y)) nd.x = (nd.x >= 0 ? 1 : -1) * fw;
                    else nd.y = (nd.y >= 0 ? 1 : -1) * fh;
                }
            });
        }
    }
    fractureNodes.forEach(nd => gsap.set(nd.el, { left: '50%', top: '50%', x: nd.x, y: nd.y }));
    redibujarGrietas(false);
}

function redibujarGrietas(animar, soloEsta) {
    const svg = fractureContainer?.querySelector('.fracture-grietas');
    if (!svg) return;
    const w = fractureContainer.clientWidth, h = fractureContainer.clientHeight;
    const elegidas = new Set(fractureSelectedApps.map(a => a.name));
    if (!animar) svg.innerHTML = '';
    fractureNodes.forEach(nd => {
        let linea = svg.querySelector(`[data-app="${CSS.escape(nd.app.name)}"]`);
        if (!elegidas.has(nd.app.name)) { linea?.remove(); return; }
        if (linea && soloEsta !== nd) return;
        if (!linea) { linea = document.createElementNS(SVG_NS, 'line'); linea.dataset.app = nd.app.name; svg.appendChild(linea); }
        const x1 = w / 2 + nd.x, y1 = h / 2 + nd.y, x2 = w / 2, y2 = h / 2;
        linea.setAttribute('x1', x1); linea.setAttribute('y1', y1);
        linea.setAttribute('x2', x2); linea.setAttribute('y2', y2);
        const largo = Math.hypot(x2 - x1, y2 - y1);
        linea.style.strokeDasharray = largo;
        if (animar && soloEsta === nd) {
            gsap.fromTo(linea, { strokeDashoffset: largo }, { strokeDashoffset: largo * 0.12, duration: 0.6, ease: 'power2.out' });
        } else {
            linea.style.strokeDashoffset = largo * 0.12;   // la grieta se detiene antes del SMS
        }
    });
}

function tocarNodo(nd) {
    const el = nd.el;
    const ya = fractureSelectedApps.some(a => a.name === nd.app.name);
    if (ya) {
        fractureSelectedApps = fractureSelectedApps.filter(a => a.name !== nd.app.name);
        allSelectedApps = allSelectedApps.filter(a => a.name !== nd.app.name);
    } else {
        fractureSelectedApps.push(nd.app);
        if (!allSelectedApps.find(a => a.name === nd.app.name)) allSelectedApps.push(nd.app);
    }
    el.classList.toggle('selected', !ya);
    el.setAttribute('aria-pressed', String(!ya));
    redibujarGrietas(true, nd);
    pintarFractura(true);
    if (typeof RiskEngine !== 'undefined') {
        RiskEngine.setAssetsPhase({ fracture: { selectedApps: fractureSelectedApps, totalApps: currentFractureApps } });
    }
    if (typeof Estado !== 'undefined') Estado.guardar();
}

// Vacío, porcentaje, carga del SMS y oscurecimiento por niveles
function pintarFractura(porToque) {
    if (!fractureContainer) return;
    const peso = fractureSelectedApps.reduce((acc, a) => acc + a.weight, 0);
    const impacto = fractureTotalWeight > 0 ? peso / fractureTotalWeight : 0;
    const risk = Math.round(impacto * 100);
    const disp = document.getElementById('fracture-risk-display');
    if (disp) disp.innerText = `${risk < 10 ? '0' : ''}${risk}%`;

    const vacio = fractureContainer.querySelector('.fracture-void');
    if (vacio) gsap.to(vacio, { scale: impacto, opacity: peso > 0 ? 1 : 0, duration: 0.8, ease: 'power2.out' });

    const sms = document.getElementById('sms-block');
    if (sms) sms.style.setProperty('--carga', Math.min(1, fractureSelectedApps.length / 8));

    fractureContainer.classList.toggle('fracture-dark-mode', impacto > 0.3);
    const critico = fractureSelectedApps.filter(a => a.weight === 5).reduce((acc, a) => acc + a.weight, 0);
    const nivel = fractureTotalWeight ? critico / fractureTotalWeight : 0;
    fractureContainer.dataset.glitch = nivel > 0.4 ? 'alto' : nivel > 0.2 ? 'medio' : nivel > 0.05 ? 'bajo' : '';

    if (porToque) {
        // El golpe hace temblar el letrero 3 cuadros, y arriba de 70 % también las apps sin tocar
        ['fracture-title', 'fracture-risk'].forEach(id => {
            const t = document.getElementById(id);
            if (t && nivel > 0.05) { t.classList.remove('tiembla'); void t.offsetWidth; t.classList.add('tiembla'); }
        });
        if (impacto > 0.7) fractureNodes.forEach(nd => {
            if (!nd.el.classList.contains('selected')) gsap.fromTo(nd.el, { x: nd.x - 2 }, { x: nd.x, duration: 0.05, repeat: 2, yoyo: true, ease: 'none', onComplete: () => gsap.set(nd.el, { x: nd.x }) });
        });
        if (fractureSelectedApps.length) barrasGlitch(Math.min(6, fractureSelectedApps.length));
    }
}

function barrasGlitch(cuantas) {
    for (let k = 0; k < cuantas; k++) {
        const bar = document.createElement('div');
        bar.className = 'fracture-glitch-bar';
        bar.style.top = (Math.random() * 90 + 5) + '%';
        bar.style.left = (Math.random() * 70 + 5) + '%';
        bar.style.width = (Math.random() * 120 + 40) + 'px';
        fractureContainer.appendChild(bar);
        gsap.fromTo(bar, { scaleX: 0.4, opacity: 0.9 }, { scaleX: 1.3, opacity: 0, duration: 0.35, delay: k * 0.03, ease: 'steps(3)', onComplete: () => bar.remove() });
    }
}

function getFractureRisk() {
    const peso = fractureSelectedApps.reduce((acc, a) => acc + a.weight, 0);
    return fractureTotalWeight ? (peso / fractureTotalWeight) * 35 : 0;
}

function finishFracture() { if (typeof goToStep === 'function') goToStep(3); }

// Se mantiene por compatibilidad con el botón Análisis: baja a la fractura
function showFracture() {
    const section = document.getElementById('fracture-section');
    if (!section) return;
    section.classList.remove('hidden');
    section.style.opacity = '1';
    const headerH = document.querySelector('.header-authority')?.offsetHeight || 80;
    scrollTo({ top: section.getBoundingClientRect().top + scrollY - headerH - 16, behavior: 'smooth' });
    requestAnimationFrame(() => initFracture());
}

function resetFracture() {
    fractureSelectedApps = [];
    fractureBuilt = false;
    fractureNodes = [];
    initFracture();
}

function restaurarFracture(nombres) {
    const apps = distributedData.fracture || [];
    fractureSelectedApps = apps.filter(a => nombres.includes(a.name));
    fractureTotalWeight = apps.reduce((acc, a) => acc + a.weight, 0);
    fractureSelectedApps.forEach(a => { if (!allSelectedApps.find(x => x.name === a.name)) allSelectedApps.push(a); });
    if (typeof RiskEngine !== 'undefined') RiskEngine.setAssetsPhase({ fracture: { selectedApps: fractureSelectedApps, totalApps: apps } });
}

document.addEventListener('DOMContentLoaded', () => {
    const zona = document.getElementById('fracture-container');
    if (!zona) return;
    let pend = 0;
    new ResizeObserver(() => {
        cancelAnimationFrame(pend);
        pend = requestAnimationFrame(() => fractureBuilt ? relayoutFracture() : initFracture());
    }).observe(zona);
});
