/* ============================================================
   Preguntas · fase 1 (fichas P-00 a P-15)
   Las 15 están a la vista desde el inicio y se contestan en el
   orden que la persona quiera (reglamento 1.2). Contestar es un
   toque, la nota aparece dentro de la misma tarjeta y nada mueve
   la página (1.6). Cada respuesta se puede cambiar o borrar (2.5).
   ============================================================ */

let historyState = {};   // { n: { anim, optionKey } } para deshacer el dibujo al cambiar o borrar
let q11Valor = null;     // valor del deslizador de la pregunta 11, para retomarlo

const TOTAL_PREGUNTAS = 15;

function updateHUD() {
    pintarIndice();
}

function avisarMotor() {
    const smsDependent = forensicAnswers['q3'] === 'negativo';
    const noRecovery = forensicAnswers['q4'] === 'negativo';
    if (typeof RiskEngine !== 'undefined') RiskEngine.setQuizPhase(forensicAnswers, { smsDependent, noRecovery });
}

function ans(qIndex, optionKey, anim, btn) {
    try {
        if (historyState[qIndex]) resetAnimation(qIndex, historyState[qIndex].anim);
        if (typeof Medir !== 'undefined') Medir.hito('primera_respuesta');
        historyState[qIndex] = { anim, optionKey };
        forensicAnswers['q' + qIndex] = optionKey;
        if (qIndex === 15) needsDFY = optionKey === 'positivo';
        avisarMotor();

        const card = document.getElementById(`q${qIndex}`);
        if (card) {
            card.querySelectorAll('[data-respuesta]').forEach(b => {
                const es = b === btn;
                b.classList.toggle('selected', es);
                b.classList.toggle('dimmed', !es);
                b.setAttribute('aria-pressed', String(es));
            });
            card.classList.add('answered');
            ponerNota(card, qIndex, optionKey);
        }
        triggerAnimation(anim);
    } catch (e) {
        console.error('[ans] Error en pregunta', qIndex, e);
    }
    updateHUD();
    if (typeof Estado !== 'undefined') Estado.guardar();
}

// La nota de después, dentro de la tarjeta, con la opción de borrar la respuesta
function ponerNota(card, qIndex, optionKey) {
    card.querySelector('.post-ans-feedback')?.remove();
    const texto = (typeof POST_RESPONSES !== 'undefined' && POST_RESPONSES['q' + qIndex]?.[optionKey]) || '';
    const nota = document.createElement('div');
    nota.className = 'post-ans-feedback';
    nota.setAttribute('role', 'status');
    nota.innerHTML = `${texto ? `<p>${texto}</p>` : ''}<div class="post-ans-feedback__acciones"><button type="button" class="borrar-respuesta" data-borrar="${qIndex}">Borrar respuesta</button></div>`;
    const opciones = card.querySelector('[data-respuesta]')?.parentElement;
    opciones?.after(nota);
    const quieto = typeof Estado !== 'undefined' && Estado.restaurando;
    if (typeof gsap !== 'undefined' && !quieto) gsap.fromTo(nota, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
    // Si la nota quedó bajo el borde, la página baja solo lo justo para verla completa
    if (!quieto) requestAnimationFrame(() => {
        const r = nota.getBoundingClientRect(), falta = r.bottom - innerHeight + 16;
        if (falta > 0) scrollBy({ top: falta, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    if (!quieto) avanzarSolo(nota, qIndex, texto);
}

// Avance sin botón (reglamento 16.7): una línea gris tenue se acorta mientras se lee la nota y al terminar
// la página baja a la siguiente sin contestar. Sin números ni color, para que no presione: apuntar a la
// tarjeta la pausa, y si la persona desliza, toca o usa el teclado, la línea se va y ya no avanza sola.
let avancePendiente = null;
function cancelarAvance() {
    if (!avancePendiente) return;
    avancePendiente.linea.remove();
    avancePendiente.quitar();
    avancePendiente = null;
}
function avanzarSolo(nota, qIndex, texto) {
    cancelarAvance();
    const sigue = siguienteSinContestar(qIndex);
    if (!sigue || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const palabras = texto ? texto.split(/\s+/).length : 0;
    const ms = Math.min(7000, Math.max(4000, 1800 + palabras * 260));
    const linea = document.createElement('span');
    linea.className = 'nota-avance'; linea.setAttribute('aria-hidden', 'true');
    linea.style.setProperty('--dur', ms + 'ms');
    nota.appendChild(linea);
    const card = nota.closest('.q-card') || nota.parentElement;
    // Solo el ratón pausa: un dedo que tocó la tarjeta no está leyendo con el cursor encima
    const pausa = e => { if (!e || e.pointerType === 'mouse') linea.style.animationPlayState = 'paused'; };
    const sigueLinea = e => { if (!e || e.pointerType === 'mouse') linea.style.animationPlayState = 'running'; };
    const tomaControl = () => cancelarAvance();
    // Esperar un instante: el propio toque que contestó no cuenta como tomar el control
    const escucha = ['wheel', 'touchstart', 'keydown'];
    const poner = setTimeout(() => escucha.forEach(ev => addEventListener(ev, tomaControl, { passive: true, once: true })), 400);
    card.addEventListener('pointerenter', pausa); card.addEventListener('pointerleave', sigueLinea);
    const quitar = () => {
        clearTimeout(poner);
        escucha.forEach(ev => removeEventListener(ev, tomaControl));
        card.removeEventListener('pointerenter', pausa); card.removeEventListener('pointerleave', sigueLinea);
    };
    if (matchMedia('(hover: hover)').matches && card.matches(':hover')) pausa();
    linea.addEventListener('animationend', () => {
        cancelarAvance();
        if (!forensicAnswers['q' + sigue]) irA(document.getElementById('q' + sigue));
    });
    avancePendiente = { linea, quitar };
}

function siguienteSinContestar(desde) {
    for (let i = 1; i < TOTAL_PREGUNTAS; i++) {
        const n = (desde + i - 1) % TOTAL_PREGUNTAS + 1;
        if (!forensicAnswers['q' + n]) return n;
    }
    return 0;
}

function borrarRespuesta(qIndex) {
    cancelarAvance();
    const prev = historyState[qIndex];
    if (prev) resetAnimation(qIndex, prev.anim);
    delete historyState[qIndex];
    delete forensicAnswers['q' + qIndex];
    if (qIndex === 11) {
        q11Valor = null;
        const sl = document.getElementById('app-slider');
        if (sl) sl.value = 0;
        const c = document.getElementById('app-counter'); if (c) c.innerText = '0';
        const l = document.getElementById('app-range-label'); if (l) { l.innerText = 'Mueve la barra'; l.style.color = ''; }
    }
    if (qIndex === 15) needsDFY = false;
    const card = document.getElementById(`q${qIndex}`);
    if (card) {
        card.classList.remove('answered');
        card.querySelectorAll('[data-respuesta]').forEach(b => { b.classList.remove('selected', 'dimmed'); b.setAttribute('aria-pressed', 'false'); });
        card.querySelector('.post-ans-feedback')?.remove();
        // Borrar se deshace con un toque durante unos segundos (reglamento 16.2); la 11 es barra y se vuelve a mover
        if (prev && qIndex !== 11) {
            const nota = document.createElement('div');
            nota.className = 'post-ans-feedback';
            nota.setAttribute('role', 'status');
            nota.innerHTML = `<p>Respuesta borrada.</p><button type="button" class="borrar-respuesta" data-deshacer="${qIndex}" data-clave="${prev.optionKey}">Deshacer</button>`;
            card.querySelector('[data-respuesta]')?.parentElement?.after(nota);
            setTimeout(() => nota.isConnected && !card.classList.contains('answered') && nota.remove(), 6000);
        }
    }
    avisarMotor();
    updateHUD();
    if (typeof Estado !== 'undefined') Estado.guardar();
}

// Índice de las 15: dice cuáles van contestadas y lleva a cualquiera (reglamento 1.3)
function pintarIndice() {
    const nav = document.getElementById('indice-preguntas');
    if (!nav) return;
    const lista = nav.querySelector('.indice-lista');
    if (lista && !lista.childElementCount) {
        lista.innerHTML = Array.from({ length: TOTAL_PREGUNTAS }, (_, i) =>
            `<a href="#q${i + 1}" data-ir="${i + 1}" aria-label="Pregunta ${i + 1}">${i + 1}</a>`).join('');
    }
    let hechas = 0;
    nav.querySelectorAll('[data-ir]').forEach(a => {
        const ok = !!forensicAnswers['q' + a.dataset.ir];
        a.classList.toggle('hecha', ok);
        if (ok) hechas++;
    });
    const cuenta = document.getElementById('indice-cuenta');
    if (cuenta) cuenta.textContent = `${hechas} de ${TOTAL_PREGUNTAS}`;
    if (typeof pintarPasos === 'function') pintarPasos();
}

function irA(el) {
    if (!el) return;
    const headerH = document.querySelector('.header-authority')?.offsetHeight || 80;
    const extra = el.closest('#step-1') ? (document.getElementById('indice-preguntas')?.offsetHeight || 0) : 0;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - headerH - extra - 12, behavior: 'smooth' });
}

// Un solo listener para las 15 tarjetas y el índice
document.addEventListener('click', e => {
    const b = e.target.closest('[data-respuesta]');
    if (b && b.closest('#quiz-container')) {
        ans(parseInt(b.dataset.q, 10), b.dataset.respuesta, b.dataset.anim || 'none', b);
        return;
    }
    const x = e.target.closest('[data-borrar]');
    if (x) { borrarRespuesta(parseInt(x.dataset.borrar, 10)); return; }
    const d = e.target.closest('[data-deshacer]');
    if (d) { [...(document.getElementById('q' + d.dataset.deshacer)?.querySelectorAll('[data-respuesta]') || [])].find(b => b.dataset.respuesta === d.dataset.clave)?.click(); return; }
    const ir = e.target.closest('[data-ir]');
    if (ir) { e.preventDefault(); irA(document.getElementById('q' + ir.dataset.ir)); }
});

// --- DIBUJOS: lo que mueve cada respuesta (reglamento 6.1) ---
// Solo transform y opacity; lo rígido no pasa de 5 % y lleva un solo rebote.

const enVivo = () => !(typeof Estado !== 'undefined' && Estado.restaurando);

function triggerAnimation(type) {
    const g = typeof gsap !== 'undefined' ? gsap : null;
    switch (type) {
        case 'burn': {
            // Se tachan los días del mes, uno tras otro, hasta el límite
            const dias = [...document.querySelectorAll('#calendar .calendar-day:not(.paso)')];
            dias.forEach((d, i) => { d.style.setProperty('--d', enVivo() ? `${i * 0.025}s` : '0s'); d.classList.add('burned'); });
            break;
        }
        case 'mirror':
            document.querySelectorAll('#q2 .mirror-icon').forEach(i => i.classList.add('synced'));
            document.querySelector('#q2 .dib-espejo')?.classList.add('synced');
            break;
        case 'toggle-vault':
        case 'toggle-sms': {
            const k = document.getElementById('toggle-knob');
            if (!k) break;
            const app = type === 'toggle-vault';
            k.innerHTML = `<i class="ph ${app ? 'ph-shield-check' : 'ph-chat-text'}" aria-hidden="true"></i> ${app ? 'App' : 'SMS'}`;
            const dx = app ? (k.parentElement.clientWidth - k.offsetWidth - 10) : 0;
            g ? g.to(k, { x: dx, duration: enVivo() ? 0.4 : 0, ease: 'back.out(1.2)' }) : (k.style.transform = `translateX(${dx}px)`);
            break;
        }
        case 'spin':
            if (g && enVivo()) g.fromTo('#ouro-ring', { rotation: 0 }, { rotation: 360, svgOrigin: '50 50', duration: 0.8, ease: 'power2.inOut' });
            break;
        case 'hook': {
            const hook = document.getElementById('wifi-hook');
            const box = document.getElementById('data-box');
            if (!hook || !box || !g) break;
            const baja = box.offsetTop - 26;
            if (!enVivo()) { g.set([hook, box], { yPercent: 0, y: -260 }); break; }
            // Antes de jalar, un tirón contrario de 6 px; después sube con los datos
            g.timeline()
                .set(hook, { yPercent: 0, y: -60 })
                .to(hook, { y: baja, duration: 0.5, ease: 'power2.out' })
                .to([hook, box], { y: '+=6', duration: 0.1, ease: 'power1.in' })
                .to(box, { borderColor: tono('ocre'), duration: 0.1 }, '<')
                .to([hook, box], { y: '-=220', duration: 0.6, ease: 'back.in(1)' });
            break;
        }
        case 'safe':
        case 'book':
        case 'browser': {
            const ids = { safe: 'safe-box', book: 'notebook', browser: 'browser-box' };
            Object.entries(ids).forEach(([k, id]) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.toggle('elegido', k === type);
                el.classList.toggle('apagado', k !== type);
                if (k === type && g && enVivo()) g.fromTo(el, { scale: 1 }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
            });
            break;
        }
        case 'dots': {
            const c = document.getElementById('threat-dots');
            if (!c) break;
            c.innerHTML = '';
            // Aparecen donde pasa la aguja, uno por cuarto de vuelta
            [[30, 28], [72, 38], [62, 74], [26, 64]].forEach(([x, y], i) => {
                const d = document.createElement('i');
                d.style.left = x + '%'; d.style.top = y + '%';
                d.style.animationDelay = enVivo() ? `${i * 1}s` : '0s';
                c.appendChild(d);
            });
            break;
        }
        case 'glitch': {
            const t = document.getElementById('glitch-target');
            const box = t?.closest('.dib-senal');
            if (!t || !box) break;
            box.classList.add('caida');
            t.innerText = 'Sin servicio';
            if (enVivo()) { t.classList.remove('glitch-text'); void t.offsetWidth; t.classList.add('glitch-text'); }
            break;
        }
        case 'flip':
            document.getElementById('id-card')?.classList.add('flipped');
            break;
        case 'print':
            document.querySelector('#q10 .dib-impresora')?.classList.add('imprime');
            break;
        case 'print-falla': {
            const im = document.querySelector('#q10 .dib-impresora');
            if (im && enVivo()) { im.classList.remove('traba'); void im.offsetWidth; im.classList.add('traba'); }
            break;
        }
        case 'panic': {
            const p = document.getElementById('panic-btn');
            if (!p) break;
            p.classList.add('perdido');
            if (g && enVivo()) g.fromTo(p, { x: -3 }, { x: 0, duration: 0.05, repeat: 2, yoyo: true, ease: 'none' });
            break;
        }
        case 'key-success':
            document.querySelectorAll('.pin-dot').forEach((dot, i) => setTimeout(() => { dot.className = 'pin-dot filled success'; }, enVivo() ? i * 90 : 0));
            g?.to('#keypad-break', { scaleX: 1, duration: 0.4 });
            break;
        case 'key-fail':
            document.querySelectorAll('.pin-dot').forEach((dot, i) => setTimeout(() => { dot.className = 'pin-dot filled fail'; }, enVivo() ? i * 70 : 0));
            g?.to('#keypad-break', { scaleX: 0, duration: enVivo() ? 1 : 0, ease: 'power3.inOut' });
            break;
        case 'globe-lock':
            document.querySelector('#q14 .dib-globo')?.classList.add('cerrado');
            break;
    }
}

// Deshacer el dibujo cuando la persona cambia o borra la respuesta
function resetAnimation(qIndex) {
    const g = typeof gsap !== 'undefined' ? gsap : null;
    switch (qIndex) {
        case 1: document.querySelectorAll('#calendar .calendar-day').forEach(d => { d.style.setProperty('--d', '0s'); d.classList.remove('burned'); }); break;
        case 2:
            document.querySelectorAll('#q2 .mirror-icon').forEach(i => i.classList.remove('synced'));
            document.querySelector('#q2 .dib-espejo')?.classList.remove('synced');
            break;
        case 3: {
            const k = document.getElementById('toggle-knob');
            if (k) { g?.set(k, { x: 0 }); k.innerHTML = '<i class="ph ph-chat-text" aria-hidden="true"></i> SMS'; }
            break;
        }
        case 4: g?.killTweensOf('#ouro-ring'); g?.set('#ouro-ring', { rotation: 0, svgOrigin: '50 50' }); break;
        case 5: {
            const hook = document.getElementById('wifi-hook'), box = document.getElementById('data-box');
            if (hook && box && g) { g.killTweensOf([hook, box]); g.set(hook, { y: 0, yPercent: -100 }); g.set(box, { y: 0, borderColor: '' }); }
            break;
        }
        case 6: ['safe-box', 'notebook', 'browser-box'].forEach(id => document.getElementById(id)?.classList.remove('elegido', 'apagado')); break;
        case 7: { const td = document.getElementById('threat-dots'); if (td) td.innerHTML = ''; break; }
        case 8: {
            const t = document.getElementById('glitch-target');
            if (t) { t.innerText = 'Con señal'; t.classList.remove('glitch-text'); t.closest('.dib-senal')?.classList.remove('caida'); }
            break;
        }
        case 9: document.getElementById('id-card')?.classList.remove('flipped'); break;
        case 10: document.querySelector('#q10 .dib-impresora')?.classList.remove('imprime', 'traba'); break;
        case 12: document.getElementById('panic-btn')?.classList.remove('perdido'); break;
        case 13:
            g?.killTweensOf('#keypad-break'); g?.set('#keypad-break', { scaleX: 1 });
            document.querySelectorAll('.pin-dot').forEach(d => { d.className = 'pin-dot'; });
            keypadPressedCount = 0;
            break;
        case 14: document.querySelector('#q14 .dib-globo')?.classList.remove('cerrado'); break;
    }
}

// --- PREGUNTA 11: el deslizador contesta al moverse ---
function updateAppCounter(v) {
    q11Valor = parseInt(v, 10);
    const count = q11Valor;
    const appCounter = document.getElementById('app-counter');
    if (appCounter) appCounter.innerText = count;

    let optionKey = 'positivo', rangeLabel = 'Pocas, hasta 5';
    if (count >= 6 && count <= 15) { optionKey = 'neutro'; rangeLabel = 'Varias, de 6 a 15'; }
    else if (count > 15) { optionKey = 'negativo'; rangeLabel = count <= 25 ? 'Muchas, más de 15' : 'Casi todas'; }
    const label = document.getElementById('app-range-label');
    if (label) { label.innerText = rangeLabel; label.style.color = optionKey === 'negativo' ? tono('ocre') : ''; }

    historyState[11] = { anim: 'slider', optionKey };
    forensicAnswers['q11'] = optionKey;
    const card11 = document.getElementById('q11');
    if (card11) {
        card11.classList.add('answered');
        card11.querySelectorAll('[data-respuesta]').forEach(b => { b.classList.remove('selected'); b.classList.add('dimmed'); b.setAttribute('aria-pressed', 'false'); });
        clearTimeout(updateAppCounter._nota);
        updateAppCounter._nota = setTimeout(() => ponerNota(card11, 11, optionKey), 250);
    }
    avisarMotor();
    updateHUD();
    if (typeof Estado !== 'undefined') Estado.guardar();
}

// --- PREGUNTA 1: el mes del plazo más cercano, con su día límite ---
function initCalendar() {
    const cal = document.getElementById('calendar');
    if (!cal) return;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const plazo = (typeof PLAZOS !== 'undefined' ? PLAZOS : []).find(p => p.fecha >= hoy);
    const ref = plazo ? plazo.fecha : hoy;
    const y = ref.getFullYear(), m = ref.getMonth();
    const mesTxt = ref.toLocaleDateString('es-MX', { month: 'long' });
    const cab = document.getElementById('cal-mes');
    if (cab) cab.textContent = `${mesTxt.charAt(0).toUpperCase()}${mesTxt.slice(1)} ${y}`;

    const primero = (new Date(y, m, 1).getDay() + 6) % 7;     // lunes primero
    const diasMes = new Date(y, m + 1, 0).getDate();
    let html = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<span class="sem">${d}</span>`).join('');
    html += '<span></span>'.repeat(primero);
    for (let d = 1; d <= diasMes; d++) {
        const f = new Date(y, m, d);
        const cls = ['calendar-day'];
        if (plazo && d === plazo.dia) cls.push('cal-target');
        else if (f < hoy) cls.push('paso');
        html += `<span class="${cls.join(' ')}">${d}</span>`;
    }
    cal.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
    updateHUD();
});

// --- PREGUNTA 13: el teclado se puede tocar, y al cuarto dígito señala el sí ---
let keypadPressedCount = 0;
function pressKey(el) {
    el.classList.add('key-active');
    setTimeout(() => el.classList.remove('key-active'), 150);
    if (keypadPressedCount >= 4) {
        keypadPressedCount = 0;
        document.querySelectorAll('.pin-dot').forEach(d => { d.className = 'pin-dot'; });
    }
    keypadPressedCount++;
    const dot = document.getElementById(`pin-dot-${keypadPressedCount}`);
    if (dot) dot.className = 'pin-dot filled';
    if (keypadPressedCount === 4 && typeof gsap !== 'undefined') {
        const si = document.querySelector('#q13 [data-respuesta="positivo"]');
        if (si && !si.classList.contains('selected')) gsap.fromTo(si, { scale: 1 }, { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1 });
    }
}

// El índice marca la pregunta que está en pantalla, para saber dónde se está entre las 15
document.addEventListener('DOMContentLoaded', () => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        const n = e.target.id.slice(1);
        document.querySelectorAll('.indice-lista a').forEach(a => a.classList.toggle('actual', a.dataset.ir === n));
    }), { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('.q-card[id^="q"]').forEach(c => io.observe(c));
});
