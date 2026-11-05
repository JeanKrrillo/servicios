let DATA = [];

let currentIndex = 0;
let scanAnimation = null;
let swipedHistory = [];
let hintTimeout = null;
let swipeLock = false; // Nuevo flag para evitar eventos simultáneos

// Mapeo de dirección física y semántica consistente en móvil y desktop:
// ← izquierda = respaldada (protegida) · → derecha = aún depende de SMS.
function isMobileSwipe() {
    return window.matchMedia('(max-width: 768px)').matches;
}
function semanticDir(physical) {
    return physical;
}

// Sincroniza el estado de los botones Deshacer (desktop #btn-undo y móvil #btn-undo-mobile)
function setUndoActive(on) {
    document.querySelectorAll('#btn-undo, #btn-undo-mobile')
        .forEach(b => b.classList.toggle('active', on));
}

function getSwipedVulnerableApps() {
    // Retorna los objetos de la data que hayan sido swipeados a la derecha (vulnerables)
    return swipedHistory.filter(h => h.direction === 1).map(h => DATA[h.index]);
}

function getLogo(app) {
    const color = app.color || "var(--texto-3)";
    return `
        <div class="swipe-app-logo" style="background: ${color}; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; width: 100%; height: 100%;">
            ${getAppLogoHtml(app, "w-full h-full p-[23%] object-contain")}
        </div>
    `;
}

function initStack() {
    const container = document.getElementById('stack-container');
    if (!container) return;

    // Restaurar la mecánica de swipe si venía de un estado completado:
    // quitar el resumen, re-mostrar la zona y el footer de botones.
    const swipeZone = document.getElementById('swipe-zone');
    if (swipeZone) {
        const pane = swipeZone.closest('.pane-interactive');
        pane?.querySelector('#swipe-summary')?.remove();
        swipeZone.style.display = '';
        const footer = swipeZone.closest('.split-layout-container')?.querySelector('.pane-footer');
        if (footer) { footer.style.display = ''; footer.style.opacity = ''; }
    }

    // Sincronización con el motor maestro
    DATA = distributedData.swipe || [];

    container.innerHTML = '';
    swipedHistory = [];
    currentIndex = 0;
    setUndoActive(false);

    // Avisar al dashboard del reset
    if (typeof updateCalculatedRisk === 'function') updateCalculatedRisk();

    [...DATA].reverse().forEach((app, reverseIndex) => {
        const realIndex = DATA.length - 1 - reverseIndex;
        const card = document.createElement('div');
        card.className = 'swipe-card';
        card.id = `card-${realIndex}`;

        card.innerHTML = `
            <div class="scan-line"></div>
            <div class="swipe-label label-vulnerable">Depende del SMS</div>
            <div class="swipe-label label-seguro">Protegida</div>
            <div class="swipe-label label-no-uso">No la uso</div>

            ${getLogo(app)}
            <h3>${app.name}</h3>
            <p>${app.desc}</p>
        `;
        container.appendChild(card);
    });

    updateStackVisuals(true);
    updateUI();
    resetHintTimeout();
}

function updateStackVisuals(isInit = false) {
    if (typeof gsap === 'undefined') return;
    for (let i = currentIndex; i < DATA.length; i++) {
        const card = document.getElementById(`card-${i}`);
        if (card) {
            const relIdx = i - currentIndex;
            const isVisible = relIdx < 3;

            if (isVisible) {
                // BUG FIX: gsap.to() no puede animar 'display'; usar set() para mostrarlo primero,
                // luego animar opacidad y escala de forma fluida.
                gsap.set(card, { display: 'flex' });
                gsap.to(card, {
                    scale: relIdx === 0 ? 1 : (relIdx === 1 ? 0.94 : 0.88),
                    y: relIdx * -12,
                    zIndex: 100 - relIdx,
                    opacity: relIdx === 0 ? 1 : (relIdx === 1 ? 0.8 : 0.4),
                    duration: isInit ? 0 : 0.5,
                    ease: "back.out(1.2)"
                });
            } else {
                // Ocultar físicamente solo tras completar el fade, sin romper la animación
                gsap.to(card, {
                    opacity: 0,
                    duration: isInit ? 0 : 0.3,
                    onComplete: () => gsap.set(card, { display: 'none' })
                });
            }
        }
    }
    makeTopCardDraggable();
}

// ===== REPARACIÓN CRÍTICA: resetHintTimeout limpia correctamente =====
function resetHintTimeout() {
    if (typeof gsap === 'undefined') return;
    clearTimeout(hintTimeout);

    // Forzar re-aparición de la mano
    const hintEl = document.getElementById('swipe-hint');
    if (hintEl) {
        hintEl.classList.remove('muestra');
        gsap.to(hintEl, { opacity: 0, duration: 0.1 });
    }

    if (currentIndex < DATA.length) {
        hintTimeout = setTimeout(() => {
            const h = document.getElementById('swipe-hint');
            if (h) { h.classList.add('muestra'); gsap.to(h, { opacity: 0.8, duration: 0.4 }); }
        }, 2000); // Reducido de 4s a 2s para que aparezca más rápido en móvil
    }
}

function makeTopCardDraggable() {
    if (currentIndex >= DATA.length) return showCompletion();
    if (typeof Draggable === 'undefined') return;

    const card = document.getElementById(`card-${currentIndex}`);
    if (!card) return;
    card.style.display = 'flex';

    const scanLine = card.querySelector('.scan-line');
    // Línea de escaneo: mecánica, recorre la carta con transform
    if (scanAnimation) scanAnimation.kill();
    gsap.set(scanLine, { opacity: 0.6, y: 0 });
    scanAnimation = gsap.to(scanLine, { y: () => card.clientHeight - 2, duration: 2, repeat: -1, yoyo: true, ease: 'none' });

    setUndoActive(swipedHistory.length > 0);

    const existingDraggable = Draggable.get(card);
    if (existingDraggable) {
        existingDraggable.enable();
        return;
    }

    Draggable.create(card, {
        type: "x,y",
        edgeResistance: 0.7,
        onDragStart: () => {
            resetHintTimeout();
            gsap.to(card, { scale: 1.02, borderColor: tono('tinta'), duration: 0.25 });
        },
        onDrag: function () {
            const x = this.x;
            const y = this.y;
            const progress = Math.min(Math.abs(x) / 100, 1);
            const lRisk = card.querySelector('.label-vulnerable');
            const lSafe = card.querySelector('.label-seguro');
            const lNone = card.querySelector('.label-no-uso');

            gsap.set(this.target, { rotationZ: x / 20 });

            if (y > 100) { // Deslizar hacia abajo
                lNone.style.opacity = Math.min(y / 150, 1);
                lRisk.style.opacity = 0; lSafe.style.opacity = 0;
            } else {
                lNone.style.opacity = 0;
                // El color confirma el SIGNIFICADO del lado, no el lado físico
                const sem = semanticDir(x > 0 ? 1 : -1);
                const label = sem === 1 ? lRisk : lSafe;
                const other = sem === 1 ? lSafe : lRisk;
                label.style.opacity = progress; other.style.opacity = 0;
            }
        },
        onDragEnd: function () {
            // Umbrales relativos al tamaño REAL de la zona (leídos al soltar,
            // no al crear): la tarjeta escala con el viewport fluido y la
            // distancia de descarte escala con ella.
            const zone = card.closest('.swipe-zone');
            const thX = Math.max(60, (zone?.clientWidth || 320) * 0.30);
            const thY = Math.max(90, (zone?.clientHeight || 420) * 0.35);
            if (this.y > thY) {
                handleAction(card, 0); // No la uso
            } else if (this.x > thX) {
                handleAction(card, semanticDir(1), 1);
            } else if (this.x < -thX) {
                handleAction(card, semanticDir(-1), -1);
            } else {
                gsap.to(this.target, {
                    x: 0, y: 0, rotationZ: 0,
                    borderColor: '', scale: 1,
                    duration: 0.5, ease: "elastic.out(1, 0.6)"
                });
                gsap.to(card.querySelectorAll('.swipe-label'), { opacity: 0 });
            }
        }
    });
}

// direction = significado (−1 respaldada · 1 depende de SMS · 0 no uso);
// physical = lado físico de salida de la tarjeta (en móvil pueden diferir).
function handleAction(card, direction, physical = direction) {
    // NUEVO: bloquear si ya hay una animación en curso
    if (swipeLock) return;
    swipeLock = true;

    swipedHistory.push({ index: currentIndex, direction: direction, physical: physical });
    if (scanAnimation) scanAnimation.kill();
    if (typeof Draggable !== 'undefined') Draggable.get(card).disable();

    if (typeof gsap !== 'undefined') {
        gsap.to(card, {
            x: physical === 0 ? 0 : physical * window.innerWidth,
            y: physical === 0 ? window.innerHeight : 0,
            rotationZ: physical === 0 ? 0 : physical * 40,
            opacity: 0,
            duration: 0.4,
            onComplete: () => {
                card.style.display = 'none';
                currentIndex++;
                swipeLock = false; // Desbloquear
                updateUI();
                updateStackVisuals();
                resetHintTimeout();
                if (typeof updateCalculatedRisk === 'function') updateCalculatedRisk();
                if (typeof Estado !== 'undefined') Estado.guardar();
            }
        });
    }
}

function undoSwipe() {
    if (swipedHistory.length === 0 || swipeLock) return;
    swipeLock = true;

    const last = swipedHistory.pop();
    currentIndex--;
    const card = document.getElementById(`card-${currentIndex}`);
    card.style.display = 'flex';
    if (typeof Draggable !== 'undefined') Draggable.get(card).enable();

    if (typeof gsap !== 'undefined') {
        gsap.fromTo(card, { x: (last.physical ?? last.direction) * 500, opacity: 0 },
            {
                x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.2)",
                onComplete: () => {
                    swipeLock = false;
                }
            });
    }
    // Si ya había terminado, vuelve el mazo
    const zona = document.getElementById('swipe-zone');
    if (zona && zona.style.display === 'none') {
        zona.closest('.pane-interactive')?.querySelector('#swipe-summary')?.remove();
        zona.style.display = '';
        const footer = zona.closest('.split-layout-container')?.querySelector('.pane-footer');
        if (footer) { footer.style.display = ''; footer.style.opacity = ''; }
    }
    updateUI();
    updateStackVisuals();
    if (typeof updateCalculatedRisk === 'function') updateCalculatedRisk();
    if (typeof Estado !== 'undefined') Estado.guardar();
}

function updateUI() {
    const pct = (currentIndex / DATA.length) * 100;
    const counter = document.getElementById('counter');
    if (counter) {
        counter.innerText = `${currentIndex} de ${DATA.length}`;
    }
    if (typeof gsap !== 'undefined') {
        gsap.to('#pct-text', { innerHTML: Math.round(pct) + '%', snap: "innerHTML" });
    }
    const pb = document.getElementById('progress-bar');
    if (pb) pb.style.transform = `scaleX(${pct / 100})`;
}

function showCompletion() {
    const enVivo = typeof Estado === 'undefined' || !Estado.restaurando;
    if (enVivo && typeof confetti !== 'undefined') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [tono('ocre'), tono('tinta'), tono('ocre')] });
    }

    const vulnerableCount = swipedHistory.filter(h => h.direction === 1).length;
    const safeCount = swipedHistory.filter(h => h.direction === -1).length;

    // Ocultar la mecánica de swipe (sin DESTRUIRLA: initStack debe poder
    // reconstruir el swipe si se reinicia la auditoría) y el footer de botones.
    const swipeZone = document.getElementById('swipe-zone');
    const pane = swipeZone?.closest('.pane-interactive');
    const footer = swipeZone?.closest('.split-layout-container')?.querySelector('.pane-footer');
    if (!pane) return;


    if (footer) {
        if (typeof gsap !== 'undefined') {
            gsap.to(footer, { opacity: 0, duration: 0.3, onComplete: () => { footer.style.display = 'none'; } });
        } else {
            footer.style.display = 'none';
        }
    }

    // Limpiar un resumen previo (por si se reentra) y ocultar la swipe-zone.
    pane.querySelector('#swipe-summary')?.remove();
    swipeZone.style.display = 'none';
    pane.style.overflow = 'visible';

    // Añadir el resumen como HERMANO de la swipe-zone, con el ancho completo
    // del panel (2/3 real), no confinado a la stack-container de 270px.
    const summary = document.createElement('div');
    summary.id = 'swipe-summary';
    summary.className = 'w-full max-w-md mx-auto text-center py-6 px-4';
    summary.innerHTML = `
        <i class="ph-fill ph-check-circle swipe-fin-icono" aria-hidden="true"></i>
        <h3 class="swipe-fin-titulo">Clasificaste las ${DATA.length} apps</h3>
        <div class="swipe-fin-cuentas">
            <div><b>${safeCount}</b><span>protegidas</span></div>
            <div class="es-riesgo"><b>${vulnerableCount}</b><span>dependen del SMS</span></div>
        </div>
        <p class="swipe-fin-nota">Puedes deshacer la última si te equivocaste.</p>
    `;
    pane.appendChild(summary);

    summary.insertAdjacentHTML('beforeend', `<a href="#vortex-section" class="swipe-siguiente" data-ir-seccion="vortex-section">Sigue con la órbita</a>`);
}

// Flash visual de color (glow + label) que replica el feedback de onDrag,
// para que el control por teclado tenga la misma respuesta cromática.
// direction: -1 protegido (verde), 1 vulnerable (rojo), 0 no-uso (gris).
function flashSwipeFeedback(card, direction) {
    const sello = card.querySelector(direction === 1 ? '.label-vulnerable' : direction === -1 ? '.label-seguro' : '.label-no-uso');
    if (sello) sello.style.opacity = 1;
}

// Líneas-botón de instrucción (móvil): clasifican la tarjeta superior.
// direction = significado (−1 respaldada · 1 depende de SMS · 0 no uso);
// el lado físico de salida se deriva para coincidir con la flecha mostrada.
function triggerSwipe(direction) {
    if (swipeLock || currentIndex >= DATA.length) return;
    const card = document.getElementById(`card-${currentIndex}`);
    if (!card) return;
    flashSwipeFeedback(card, direction);
    handleAction(card, direction, direction);
}

// Control por teclado para desktop — respeta swipeLock
document.addEventListener('keydown', (e) => {
    // Solo actuar si estamos en el paso 2 y hay una tarjeta activa
    // Las flechas mueven el mazo solo si está en pantalla y no se está escribiendo
    if (currentIndex >= DATA.length || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    const z = document.getElementById('swipe-zone')?.getBoundingClientRect();
    if (!z || z.bottom < 80 || z.top > innerHeight - 80) return;
    if (swipeLock) return; // NUEVO: respetar el flag de bloqueo

    const topCard = document.getElementById(`card-${currentIndex}`);
    if (!topCard) return;

    let direction;
    switch (e.key) {
        case 'ArrowLeft': direction = -1; break;
        case 'ArrowRight': direction = 1; break;
        case 'ArrowDown': direction = 0; break;
        default: return;
    }

    // Evitar el scroll nativo del navegador por las flechas.
    e.preventDefault();

    flashSwipeFeedback(topCard, direction);
    handleAction(topCard, direction);
});

// Retomar: vuelve a poner las cartas ya clasificadas sin animarlas (estado.js)
function restaurarSwipe(lista) {
    const porNombre = new Map(DATA.map((a, i) => [a.name, i]));
    lista.forEach(({ app, dir }) => {
        const i = porNombre.get(app);
        if (i === undefined || i !== currentIndex) return;   // el orden del mazo es el guardado
        swipedHistory.push({ index: i, direction: dir, physical: dir });
        const card = document.getElementById(`card-${i}`);
        if (card) { Draggable.get(card)?.disable(); card.style.display = 'none'; }
        currentIndex++;
    });
    updateUI();
    updateStackVisuals(true);
    setUndoActive(swipedHistory.length > 0);
    if (typeof updateCalculatedRisk === 'function') updateCalculatedRisk();
}

document.addEventListener('click', e => {
    const a = e.target.closest('[data-ir-seccion]');
    if (!a) return;
    e.preventDefault();
    const el = document.getElementById(a.dataset.irSeccion);
    const headerH = document.querySelector('.header-authority')?.offsetHeight || 80;
    if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - headerH - 16, behavior: 'smooth' });
});

// Volver a clasificar las 21 desde cero (reglamento 1.5: empezar de nuevo lo elige la persona)
function volverAClasificar() {
    if (swipeLock) return;
    initStack();
    if (typeof updateCalculatedRisk === 'function') updateCalculatedRisk();
    if (typeof Estado !== 'undefined') Estado.guardar();
}
