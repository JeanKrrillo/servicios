/* ============================================================
   Órbita (vortex) · fase 2, segunda actividad (ficha A-02)
   ------------------------------------------------------------
   El chip es un agujero negro: 21 apps giran en tres órbitas de 7
   y al tocar una, el núcleo se la traga. Por fuera es el juego de
   la v2; por dentro:
   · se arma UNA vez por grupo de apps; al cambiar de tamaño solo
     se reacomodan los radios (antes se rearmaba y devolvía las apps
     tragadas, ver mapa/03_actividades.md A-00);
   · nada vibra ni respira sin causa: la órbita gira (mecánico) y el
     núcleo late una vez por app tragada;
   · solo transform y opacity; el lienzo de estrellas usa la densidad
     de la pantalla y se pausa fuera de vista.
   ============================================================ */

const LOW_END = (() => {
    const mem = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 8;
    return mem <= 4 || cores <= 4;
})();
const MOV_REDUCIDO = matchMedia('(prefers-reduced-motion: reduce)').matches;

let currentVortexApps = [];
let vortexRisk = 0;
let currentChains = 0;
let swallowedVortexApps = [];

let vortexCanvas, vortexCtx, vortexAnimFrame = 0;
let vortexParticles = [];
let vWidth = 0, vHeight = 0;
let vortexItems = [];          // { el, app, ring, base, r, orbit }
let vortexBuilt = false;
let vortexVisible = false;

// Proporciones respecto al lado menor de la zona (antes: tablas por ancho de pantalla)
const ORBITAS = [0.5, 0.75, 0.98];   // fracción del radio útil para cada anillo

function medirZona() {
    const zone = document.querySelector('.vortex-zone');
    if (!zone) return null;
    const w = zone.clientWidth, h = zone.clientHeight;
    if (!w || !h) return null;
    return { zone, w, h, lado: Math.min(w, h) };
}

function tamanoApp(lado) {
    // Toque cómodo: nunca menos de 44 px, nunca más de 72
    return Math.max(44, Math.min(72, lado * 0.12));
}

function ajustarLienzo(m) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    vWidth = m.w; vHeight = m.h;
    vortexCanvas.width = Math.round(m.w * dpr);
    vortexCanvas.height = Math.round(m.h * dpr);
    vortexCanvas.style.width = m.w + 'px';
    vortexCanvas.style.height = m.h + 'px';
    vortexCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

class VortexParticle {
    constructor() { this.reset(); }
    reset() {
        this.angle = Math.random() * Math.PI * 2;
        const base = Math.min(vWidth, vHeight) || 600;
        this.radius = Math.random() * (base * 0.42) + 40;
        this.speed = Math.random() * 0.002 + 0.0005;
        this.size = Math.random() * 1.5 + 0.3;
        this.ocre = Math.random() > 0.8;
    }
    draw(cTinta, cOcre) {
        // Las estrellas caen más rápido cuanto más riesgo hay: esa es su causa
        this.angle += this.speed * (1 + vortexRisk / 50);
        this.radius -= 0.15 * (1 + vortexRisk / 100);
        if (this.radius < 15) this.reset();
        const x = vWidth / 2 + Math.cos(this.angle) * this.radius;
        const y = vHeight / 2 + Math.sin(this.angle) * this.radius;
        vortexCtx.beginPath(); vortexCtx.arc(x, y, this.size, 0, Math.PI * 2);
        vortexCtx.fillStyle = this.ocre ? cOcre : cTinta; vortexCtx.fill();
    }
}

let _starFrame = 0;
function animateVortexStars() {
    vortexAnimFrame = 0;
    if (!vortexCtx || !vortexVisible) return;
    vortexAnimFrame = requestAnimationFrame(animateVortexStars);
    if (LOW_END && (_starFrame++ & 1)) return;
    // El HUD del vórtice es siempre oscuro (ver disfraz.css): fondo de tinta de día
    vortexCtx.fillStyle = 'rgba(18,18,23,0.18)';
    vortexCtx.fillRect(0, 0, vWidth, vHeight);
    const cT = 'rgba(236,235,229,0.75)', cO = tono('ocre');
    for (const p of vortexParticles) p.draw(cT, cO);
}

function arrancarEstrellas() {
    if (!vortexAnimFrame && vortexVisible && !MOV_REDUCIDO) vortexAnimFrame = requestAnimationFrame(animateVortexStars);
}

// --- EFECTOS (solo transform y opacity) ---
function createShockwave() {
    const zone = document.querySelector('.vortex-zone');
    const aro = document.createElement('div');
    aro.className = 'vortex-onda';
    zone.appendChild(aro);
    gsap.fromTo(aro, { scale: 0.3, opacity: 0.8 }, { scale: 3, opacity: 0, duration: 1.1, ease: 'expo.out', onComplete: () => aro.remove() });
}

function createDebris(x, y) {
    const zone = document.querySelector('.vortex-zone');
    const rect = zone.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
        const deb = document.createElement('div');
        deb.className = 'vortex-escombro';
        deb.style.left = (x - rect.left) + 'px';
        deb.style.top = (y - rect.top) + 'px';
        zone.appendChild(deb);
        gsap.to(deb, {
            x: Math.random() * 150 - 75, y: Math.random() * 150 - 75,
            rotation: Math.random() * 360, opacity: 0, scale: 0,
            duration: 0.6 + Math.random() * 0.6, ease: 'power2.out',
            onComplete: () => deb.remove()
        });
    }
}

// --- ARMADO (una vez por grupo de apps) ---
function initVortex() {
    vortexCanvas = document.getElementById('vortex-canvas');
    if (!vortexCanvas) return;
    vortexCtx = vortexCtx || vortexCanvas.getContext('2d');
    const m = medirZona();
    if (!m) return;                     // oculta: el ResizeObserver la arma al aparecer
    if (vortexBuilt) return relayoutVortex();
    vortexBuilt = true;

    currentVortexApps = distributedData.vortex || [];
    ajustarLienzo(m);
    vortexParticles = Array.from({ length: LOW_END ? 60 : 120 }, () => new VortexParticle());
    arrancarEstrellas();

    const container = document.getElementById('vortex-items-container');
    container.innerHTML = '';
    const tragadas = new Set(swallowedVortexApps.map(a => a.name));

    currentVortexApps.forEach((app, i) => {
        if (tragadas.has(app.name)) return;   // ya está dentro del chip
        const ring = Math.min(2, Math.floor(i / 7));
        const base = ((i % 7) / 7) * Math.PI * 2 + ring * 0.3;
        const it = { app, ring, base, r: 0 };

        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'vortex-item';
        el.style.backgroundColor = app.color;
        el.setAttribute('aria-label', app.name);
        el.innerHTML = getAppLogoHtml(app, 'w-full h-full p-[18%] object-contain')
            + `<span class="vortex-item-label">${app.name}</span>`;
        container.appendChild(el);
        it.el = el;

        // Entrada: crece desde cero (icono chico tipo sello, un rebote)
        it.s = 0; it.frena = MOV_REDUCIDO ? 0 : 1; it.ang = base;
        gsap.to(it, { s: 1, duration: 0.6, delay: i * 0.05, ease: 'back.out(1.3)' });

        // Apuntar: al pasar el ratón o apoyar el dedo la órbita de esa app frena
        const lento = () => { it.frena = MOV_REDUCIDO ? 0 : 0.15; gsap.to(it, { s: 1.08, duration: 0.25 }); };
        const normal = () => { it.frena = MOV_REDUCIDO ? 0 : 1; gsap.to(it, { s: 1, duration: 0.25 }); };
        el.addEventListener('pointerenter', lento);
        el.addEventListener('pointerleave', normal);
        el.addEventListener('pointerdown', lento);
        // Con teclado también frena, para poder elegirla sin perseguirla
        el.addEventListener('focus', lento);
        el.addEventListener('blur', normal);
        el.addEventListener('click', e => tragarApp(it, e));

        vortexItems.push(it);
    });

    relayoutVortex();
    updateVortexHUD();
}

// Un solo reloj mueve todas las apps: la órbita es mecánica, velocidad constante
let _ultimoTic = 0;
function moverOrbita() {
    const ahora = performance.now();
    const dt = _ultimoTic ? Math.min(64, ahora - _ultimoTic) : 16;
    _ultimoTic = ahora;
    if (!vortexVisible) return;
    for (const it of vortexItems) {
        it.ang += dt * 0.0003 * it.frena;
        const x = Math.cos(it.ang) * it.r, y = Math.sin(it.ang) * it.r;
        it.el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${it.s.toFixed(3)})`;
        it.x = x; it.y = y;
    }
}
gsap.ticker.add(moverOrbita);

// Reacomodo: solo cambian radios y tamaños, nunca el estado
function relayoutVortex() {
    const m = medirZona();
    if (!m || !vortexCtx) return;
    ajustarLienzo(m);
    const app = tamanoApp(m.lado);
    const util = m.lado / 2 - app / 2 - 8;
    const core = Math.max(64, m.lado * 0.24);
    const coreEl = document.getElementById('core');
    if (coreEl) {
        coreEl.style.width = coreEl.style.height = core + 'px';
        const txt = coreEl.querySelector('span');
        if (txt) txt.style.fontSize = Math.max(12, core * 0.22) + 'px';
    }
    for (const it of vortexItems) {
        it.r = Math.max(core / 2 + app / 2 + 4, util * ORBITAS[it.ring]);
        it.el.style.width = it.el.style.height = app + 'px';
    }
}

function tragarApp(it, e) {
    const el = it.el;
    if (el.classList.contains('dead')) return;
    el.classList.add('dead');
    el.disabled = true;
    vortexItems = vortexItems.filter(x => x !== it);
    gsap.set(el, { left: '50%', top: '50%', xPercent: -50, yPercent: -50, x: it.x || 0, y: it.y || 0, scale: it.s });

    createDebris(e.clientX || 0, e.clientY || 0);
    swallowedVortexApps.push(it.app);
    const totalW = currentVortexApps.reduce((acc, a) => acc + a.weight, 0) || 1;
    vortexRisk += (it.app.weight / totalW) * 100;
    currentChains++;
    if (!allSelectedApps.find(a => a.name === it.app.name)) allSelectedApps.push(it.app);

    updateVortexHUD();
    updateVortexRisk();
    impactCore();
    createShockwave();
    if (typeof Estado !== 'undefined') Estado.guardar();

    // Se calienta, gira hacia el centro y desaparece dentro del chip
    gsap.timeline({ onComplete: () => el.remove() })
        .to(el, { backgroundColor: tono('ocre'), scale: 1.08, duration: 0.18, ease: 'power2.out' })
        .to(el, { x: 0, y: 0, scaleX: 2.4, scaleY: 0.05, rotation: '+=540', opacity: 0, duration: 0.8, ease: 'expo.in' }, '+=0.08');
}

function updateVortexHUD() {
    const risk = Math.min(Math.round(vortexRisk), 100);
    const riskEl = document.getElementById('risk-val');
    if (riskEl) {
        riskEl.innerText = risk + '%';
        riskEl.style.color = risk > 30 ? tono('ocre') : '';
    }
    const ch = document.getElementById('chain-val');
    if (ch) ch.innerText = currentChains;
    document.getElementById('core')?.classList.toggle('core-alto', risk > 70);
}

function impactCore() {
    // Un latido por app tragada, más fuerte cuanto más riesgo (máximo 8 %)
    const s = 1 + Math.min(0.08, 0.03 + vortexRisk / 2000);
    gsap.fromTo('#core', { scale: 1 }, { scale: s, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
    gsap.fromTo('#halo', { scale: 1, opacity: 0.35 }, { scale: 1.25, opacity: 0, duration: 0.6, ease: 'power2.out' });
}

function updateVortexRisk() {
    if (typeof RiskEngine !== 'undefined') {
        RiskEngine.setAssetsPhase({ vortex: { vulnerableApps: swallowedVortexApps, rawScore: vortexRisk, lostChains: currentChains } });
    }
}

function getVortexRisk() { return vortexRisk; }

// Volver a jugar: borra lo tragado y arma de nuevo
function resetVortex() {
    vortexItems = [];
    swallowedVortexApps = [];
    vortexRisk = 0; currentChains = 0;
    vortexBuilt = false;
    const c = document.getElementById('vortex-items-container');
    if (c) c.innerHTML = '';
    initVortex();
    updateVortexRisk();
}

// Restaurar lo guardado (lo usa estado.js antes de armar)
function restaurarVortex(nombres) {
    const apps = distributedData.vortex || [];
    swallowedVortexApps = apps.filter(a => nombres.includes(a.name));
    const totalW = apps.reduce((acc, a) => acc + a.weight, 0) || 1;
    vortexRisk = swallowedVortexApps.reduce((acc, a) => acc + (a.weight / totalW) * 100, 0);
    currentChains = swallowedVortexApps.length;
    swallowedVortexApps.forEach(a => { if (!allSelectedApps.find(x => x.name === a.name)) allSelectedApps.push(a); });
    updateVortexRisk();
}

// Un solo observador de tamaño (reacomoda) y uno de visibilidad (pausa estrellas)
document.addEventListener('DOMContentLoaded', () => {
    const zone = document.querySelector('.vortex-zone');
    if (!zone) return;
    let pend = 0;
    new ResizeObserver(() => {
        cancelAnimationFrame(pend);
        pend = requestAnimationFrame(() => vortexBuilt ? relayoutVortex() : initVortex());
    }).observe(zone);
    new IntersectionObserver(([e]) => {
        vortexVisible = e.isIntersecting;
        if (vortexVisible) arrancarEstrellas();
        else if (vortexAnimFrame) { cancelAnimationFrame(vortexAnimFrame); vortexAnimFrame = 0; }
    }).observe(zone);
});
