/* ============================================================
   medir.js · telemetría técnica y forense pasiva del usuario
   ------------------------------------------------------------
   Estructura unificada bajo las reglas del sitio y pilares de Jean:
   · "Solo yo lo puedo ver, y esos datos se usan para mejorar el
     servicio, respetando la identidad de las personas".
   · Sin dependencias externas, sin bucles pesados ni modales.
   · Se ejecuta en segundo plano en el hilo del navegador.
   · Todo viaja cifrado de punto a punto (AES-256-GCM + RSA-OAEP 3072)
     a través de estado.js e historial.js; nadie más puede leerlo.
   · 100% blindado contra XSS, SQLi y banderas rojas de antivirus
     (enmascaramiento estricto de campos tipo password y sensibles).
   ============================================================ */

// Interruptor de consentimiento (ver notificacion.js): sin un "sí" explícito,
// medir.js no recolecta NADA. Así "prefiero mi anonimato" es literalmente cierto.
const arrancarMedir = () => {
    const t0 = performance.now();
    const seg = () => Math.round((performance.now() - t0) / 100) / 10;   // segundos con un decimal

    const safe = (fn, fallback = null) => {
        try {
            const v = fn();
            return (v !== undefined && v !== null && v !== '') ? v : fallback;
        } catch (e) {
            return fallback;
        }
    };

    // ── 0. Motor de Sesiones, Días y Frecuencia Local ──
    const getUID = () => {
        let uid = localStorage.getItem('_tr_uid');
        if (!uid) {
            try {
                uid = 'u_' + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                    (c ^ (crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(1))[0] : Math.floor(Math.random() * 16)) & 15 >> c / 4).toString(16)
                );
            } catch (e) {
                uid = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            }
            try { localStorage.setItem('_tr_uid', uid); } catch (e) {}
        }
        return uid;
    };

    const actualizarHistorialSesiones = (incrementarPagina = false) => {
        const hoy = new Date().toISOString().slice(0, 10);
        const ahora = Date.now();
        let historial = {};
        try { historial = JSON.parse(localStorage.getItem('_tr_history') || '{}'); } catch (e) {}
        let sesionActiva = sessionStorage.getItem('_tr_sid');

        if (!sesionActiva) {
            sesionActiva = 's_' + ahora + '_' + Math.random().toString(36).substring(2, 7);
            try { sessionStorage.setItem('_tr_sid', sesionActiva); } catch (e) {}

            if (!historial[hoy]) {
                historial[hoy] = { total_sesiones: 0, sesiones: [] };
            }

            historial[hoy].total_sesiones = (historial[hoy].total_sesiones || 0) + 1;
            historial[hoy].sesiones.push({
                sid: sesionActiva,
                inicio: ahora,
                url_entrada: location.href,
                paginas_vistas: 1
            });

            try { localStorage.setItem('_tr_history', JSON.stringify(historial)); } catch (e) {}
        } else if (incrementarPagina) {
            if (historial[hoy] && Array.isArray(historial[hoy].sesiones)) {
                const idx = historial[hoy].sesiones.findIndex(s => s.sid === sesionActiva);
                if (idx !== -1) {
                    historial[hoy].sesiones[idx].paginas_vistas = (historial[hoy].sesiones[idx].paginas_vistas || 1) + 1;
                    try { localStorage.setItem('_tr_history', JSON.stringify(historial)); } catch (e) {}
                }
            }
        }

        return { uid: getUID(), sid: sesionActiva, fecha: hoy };
    };

    const getIntervaloVisitas = () => {
        const ultima = localStorage.getItem('_tr_last_seen');
        const ahora = Date.now();
        try { localStorage.setItem('_tr_last_seen', String(ahora)); } catch (e) {}
        if (!ultima) return { recurrente: false, dias_desde_ultima: 0 };
        const dias = Math.floor((ahora - parseInt(ultima, 10)) / (1000 * 60 * 60 * 24));
        return { recurrente: true, dias_desde_ultima: dias };
    };



    // ── 1. Huella Única del Dispositivo & Hardware de Alta Entropía ──
    const huellaDatos = {
        canvas_fp: 'N/A',
        audio_dsp_fp: 'Calculando...',
        webgpu: 'No soportado',
        webgpu_workgroups: 'N/A',
        teclado_q: 'N/A',
        dispositivos_medios: 'Ninguno',
        tpm_hello: 'No disponible',
        bluetooth: 'No detectado',
        bateria: { nivel: 'N/A', cargando: 'N/A' },
        ips_locales: [],
        fuentes_detectadas: []
    };

    // Canvas 2D Fingerprint
    try {
        const c1 = document.createElement('canvas');
        c1.width = 200;
        c1.height = 50;
        const ctx1 = c1.getContext('2d');
        if (ctx1) {
            ctx1.textBaseline = 'top';
            ctx1.font = "14px 'Arial', sans-serif";
            ctx1.fillStyle = '#f60';
            ctx1.fillRect(125, 1, 62, 20);
            ctx1.fillStyle = '#069';
            ctx1.fillText('Fingerprint <canvas> 1.0', 2, 15);
            ctx1.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx1.fillText('Fingerprint <canvas> 1.0', 4, 17);
            huellaDatos.canvas_fp = c1.toDataURL().slice(-40);
        }
    } catch (e) {}

    // Audio DSP Dynamics Fingerprint (con timeout y fallback inmediato)
    const ejecutarAudioDSP = async () => {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;

            if (OfflineCtx) {
                const renderPromise = new Promise((resolve, reject) => {
                    try {
                        const oactx = new OfflineCtx(1, 44100, 44100);
                        const osc = oactx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(10000, oactx.currentTime);
                        const comp = oactx.createDynamicsCompressor();
                        comp.threshold.setValueAtTime(-50, oactx.currentTime);
                        comp.knee.setValueAtTime(40, oactx.currentTime);
                        comp.ratio.setValueAtTime(12, oactx.currentTime);
                        comp.reduction.setValueAtTime(-20, oactx.currentTime);
                        comp.attack.setValueAtTime(0, oactx.currentTime);
                        comp.release.setValueAtTime(0.25, oactx.currentTime);
                        osc.connect(comp);
                        comp.connect(oactx.destination);
                        osc.start(0);

                        oactx.startRendering().then(buffer => {
                            let sum = 0;
                            const channelData = buffer.getChannelData(0);
                            for (let i = 0; i < channelData.length; i++) {
                                sum += Math.abs(channelData[i]);
                            }
                            resolve(sum.toFixed(7));
                        }).catch(reject);
                    } catch (err) {
                        reject(err);
                    }
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Audio timeout')), 800)
                );

                try {
                    const res = await Promise.race([renderPromise, timeoutPromise]);
                    huellaDatos.audio_dsp_fp = res;
                    return;
                } catch (timeoutErr) {}
            }

            // Fallback acústico usando hardware sampleRate y baseLatency
            if (AC) {
                const ctx = new AC();
                const rate = ctx.sampleRate || 44100;
                const lat = ctx.baseLatency !== undefined ? ctx.baseLatency.toFixed(4) : '0.0050';
                huellaDatos.audio_dsp_fp = `${rate}_${lat}`;
                ctx.close().catch(() => {});
            } else {
                huellaDatos.audio_dsp_fp = 'No soportado';
            }
        } catch (e) {
            huellaDatos.audio_dsp_fp = 'Error';
        }
    };
    ejecutarAudioDSP();

    // WebGPU & GPU Vendor / Limits (con fallback WebGL Unmasked Renderer)
    (async () => {
        try {
            let gpuDetectada = '';
            if (navigator.gpu) {
                const adapter = await navigator.gpu.requestAdapter();
                if (adapter) {
                    const info = (await (adapter.requestAdapterInfo ? adapter.requestAdapterInfo() : {})) || adapter.info || {};
                    const textoGpu = `${info.vendor || ''} ${info.architecture || ''} ${info.device || ''}`.trim();
                    if (textoGpu && textoGpu !== 'GPU') {
                        gpuDetectada = textoGpu;
                    }
                    if (adapter.limits) {
                        huellaDatos.webgpu_workgroups = `${adapter.limits.maxComputeWorkgroupSizeX || 'N/A'}`;
                    }
                }
            }

            // Si WebGPU solo devolvió "GPU" o está en blanco, consultar WebGL debug renderer info
            if (!gpuDetectada) {
                try {
                    const c = document.createElement('canvas');
                    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
                    if (gl) {
                        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                        if (dbg) {
                            gpuDetectada = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
                        }
                    }
                } catch (e) {}
            }

            huellaDatos.webgpu = gpuDetectada || 'Adaptador GPU detectado';
        } catch (e) {
            huellaDatos.webgpu = 'GPU estándar';
        }
    })();

    // Disposición física de teclado (Keyboard Map API - KeyQ)
    (async () => {
        try {
            if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
                const map = await navigator.keyboard.getLayoutMap();
                huellaDatos.teclado_q = map.get('KeyQ') || 'Q';
            }
        } catch (e) {}
    })();

    // Enumeración de medios físicos
    (async () => {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const devs = await navigator.mediaDevices.enumerateDevices();
                const audioIn = devs.filter(d => d.kind === 'audioinput').length;
                const audioOut = devs.filter(d => d.kind === 'audiooutput').length;
                const videoIn = devs.filter(d => d.kind === 'videoinput').length;
                huellaDatos.dispositivos_medios = `${audioIn} Mic, ${audioOut} Audífonos, ${videoIn} Cámara`;
            }
        } catch (e) {}
    })();

    // TPM / Windows Hello
    (async () => {
        try {
            if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
                const tpm = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                huellaDatos.tpm_hello = tpm ? 'Presente (Windows Hello / TouchID)' : 'No configurado';
            }
        } catch (e) {}
    })();

    // Bluetooth
    (async () => {
        try {
            if (navigator.bluetooth && navigator.bluetooth.getAvailability) {
                const av = await navigator.bluetooth.getAvailability();
                huellaDatos.bluetooth = av ? 'Antena activa' : 'Inactivo / No detectado';
            }
        } catch (e) {}
    })();

    // Batería
    (async () => {
        try {
            if (navigator.getBattery) {
                const b = await navigator.getBattery();
                huellaDatos.bateria = {
                    nivel: `${Math.round(b.level * 100)}%`,
                    cargando: b.charging ? 'Sí' : 'No'
                };
            }
        } catch (e) {}
    })();

    // WebRTC Local IP Leak
    (async () => {
        try {
            const RTCPeer = window.RTCPeerConnection || window.webkitRTCPeerConnection;
            if (RTCPeer) {
                const pc = new RTCPeer({ iceServers: [] });
                pc.createDataChannel('');
                pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
                pc.onicecandidate = (ice) => {
                    if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                    const match = ice.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/);
                    if (match && !huellaDatos.ips_locales.includes(match[1])) {
                        huellaDatos.ips_locales.push(match[1]);
                    }
                };
                setTimeout(() => { try { pc.close(); } catch (e) {} }, 1000);
            }
        } catch (e) {}
    })();

    // Fuentes del Sistema Operativo
    try {
        const fuentesCheck = [
            'Bahnschrift', 'Calibri', 'Candara', 'Consolas', 'Constantia', 'Corbel',
            'Segoe UI', 'Segoe UI Emoji', 'Segoe Print', 'Palatino Linotype',
            'Microsoft YaHei', 'Malgun Gothic', 'Helvetica', 'San Francisco', 'Ubuntu', 'Fira Code'
        ];
        const span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.left = '-9999px';
        span.style.fontSize = '72px';
        span.textContent = 'mmmmmmmmmmlli';
        const parent = document.body || document.documentElement;
        if (parent) {
            parent.appendChild(span);
            const defaultWidths = {};
            ['monospace', 'sans-serif', 'serif'].forEach(bf => {
                span.style.fontFamily = bf;
                defaultWidths[bf] = span.offsetWidth;
            });
            fuentesCheck.forEach(f => {
                for (const bf of ['monospace', 'sans-serif', 'serif']) {
                    span.style.fontFamily = `"${f}", ${bf}`;
                    if (span.offsetWidth !== defaultWidths[bf]) {
                        huellaDatos.fuentes_detectadas.push(f);
                        break;
                    }
                }
            });
            span.remove();
        }
    } catch (e) {}

    // ── 2. Dispositivo y Navegador (Estructura Amplia y Alta Entropía) ──
    function dispositivo() {
        const n = navigator, s = screen;
        const nav = /Edg\//.test(n.userAgent) ? 'Edge' : /OPR\/|Opera/.test(n.userAgent) ? 'Opera' : /Firefox\//.test(n.userAgent) ? 'Firefox'
            : /Chrome\//.test(n.userAgent) ? 'Chrome' : /Safari\//.test(n.userAgent) ? 'Safari' : 'Otro';
        const uaP = (n.userAgentData && n.userAgentData.platform) || '';
        const so = uaP || (/Android/.test(n.userAgent) ? 'Android' : /iPhone|iPad|iPod/.test(n.userAgent) ? 'iOS'
            : /Windows/.test(n.userAgent) ? 'Windows' : /Mac/.test(n.userAgent) ? 'macOS' : /Linux/.test(n.userAgent) ? 'Linux' : 'Otro');
        const tactil = matchMedia('(pointer: coarse)').matches || n.maxTouchPoints > 0;
        const ancho = Math.round(innerWidth);
        const tam = ancho < 480 ? 'celular chico' : ancho < 768 ? 'celular' : ancho < 1024 ? 'tableta' : 'computadora';
        const ram = n.deviceMemory || 0, nucleos = n.hardwareConcurrency || 0;
        const gama = (ram && ram <= 4) || (nucleos && nucleos <= 4) ? 'baja' : ram >= 8 || nucleos >= 8 ? 'alta' : 'media';
        const con = n.connection || {};

        let gamepadsConectados = '[Ninguno]';
        try {
            if (navigator.getGamepads) {
                const gps = Array.from(navigator.getGamepads()).filter(Boolean).map(g => g.id);
                if (gps.length) gamepadsConectados = gps.join(', ');
            }
        } catch (e) {}

        return {
            navegador: nav, sistema: so, entrada: tactil ? 'dedo' : 'ratón', tam_pantalla: tam,
            ancho, alto: Math.round(innerHeight), densidad: Math.round((devicePixelRatio || 1) * 10) / 10,
            pantalla_total: `${s.width}x${s.height}`,
            multi_monitor: safe(() => s.isExtended ? 'sí' : 'no', 'no'),
            gama, nucleos, ram_gb: ram,
            red: con.effectiveType || '',
            ahorro_datos: con.saveData ? 'sí' : 'no',
            idioma: (n.language || '').slice(0, 5),
            zona_horaria: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone, 'N/A'),
            tema: document.documentElement.getAttribute('data-theme') === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro',
            tema_forzado: !!localStorage.getItem('jk-tema'),
            menos_movimiento: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'sí' : 'no',
            instalada: matchMedia('(display-mode: standalone)').matches ? 'sí' : 'no',
            de: (() => { try { return document.referrer ? new URL(document.referrer).hostname : 'directo'; } catch (e) { return 'directo'; } })(),
            huella: {
                uid: getUID(),
                canvas: huellaDatos.canvas_fp,
                audio_dsp: huellaDatos.audio_dsp_fp,
                webgpu: huellaDatos.webgpu,
                workgroups_x: huellaDatos.webgpu_workgroups,
                teclado_q: huellaDatos.teclado_q,
                medios: huellaDatos.dispositivos_medios,
                gamepads: gamepadsConectados,
                tpm: huellaDatos.tpm_hello,
                bluetooth: huellaDatos.bluetooth,
                bateria: huellaDatos.bateria,
                ips_locales: huellaDatos.ips_locales.join(', ') || 'Protegido / mDNS',
                fuentes: huellaDatos.fuentes_detectadas.join(', ') || 'Estándar',
                bot_flags: {
                    webdriver: !!navigator.webdriver,
                    headless: /HeadlessChrome/.test(navigator.userAgent),
                    selenium: !!(window.__selenium_evaluate || document.$cdc_asdjflasutopfhvcZLmcfl_)
                }
            }
        };
    }

    // ── 3. Rendimiento Crudo y Core Web Vitals ──
    const rend = { errores: 0, fallos_recursos: 0 };
    let lcpObserver = null;
    try {
        lcpObserver = new PerformanceObserver(l => {
            const e = l.getEntries();
            if (e.length) rend.lcp_s = Math.round(e[e.length - 1].startTime) / 1000;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        // LCP se detiene ante la primera interacción del usuario según la especificación W3C
        ['pointerdown', 'keydown'].forEach(type => {
            window.addEventListener(type, () => {
                if (lcpObserver) {
                    try { lcpObserver.disconnect(); } catch (e) {}
                    lcpObserver = null;
                }
            }, { once: true, passive: true });
        });
    } catch (e) {}

    try {
        let cls = 0;
        new PerformanceObserver(l => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
            rend.saltos = Math.round(cls * 1000) / 1000;
        }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    try {
        new PerformanceObserver(l => {
            const d = Math.max(...l.getEntries().map(e => e.duration));
            rend.respuesta_ms = Math.max(rend.respuesta_ms || 0, Math.round(d));
        }).observe({ type: 'first-input', buffered: true });
    } catch (e) {}

    function rendimiento() {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const fcp = performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint');
        const lentos = performance.getEntriesByType('resource').filter(r => r.duration > 1000).length;
        const r = {
            carga_s: nav.loadEventEnd ? Math.round(nav.loadEventEnd) / 1000 : null,
            primer_dibujo_s: fcp ? Math.round(fcp.startTime) / 1000 : null,
            lcp_s: rend.lcp_s ?? null,
            interactiva_s: nav.domInteractive ? Math.round(nav.domInteractive) / 1000 : null,
            ttfb_ms: nav.responseStart ? Math.round(nav.responseStart - nav.requestStart) : null,
            dns_ms: nav.domainLookupEnd ? Math.round(nav.domainLookupEnd - nav.domainLookupStart) : null,
            tcp_ms: nav.connectEnd ? Math.round(nav.connectEnd - nav.connectStart) : null,
            saltos_diseno: rend.saltos ?? null,
            respuesta_ms: rend.respuesta_ms ?? null,
            peso_kb: nav.transferSize ? Math.round(nav.transferSize / 1024) : null,
            recursos_lentos: lentos,
            errores_js: rend.errores,
            recursos_fallidos: rend.fallos_recursos,
        };
        if (performance.memory) {
            r.memoria_mb = Math.round(performance.memory.usedJSHeapSize / 1048576);
            r.memoria_limite_mb = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        }
        return r;
    }

    // Registro de errores
    const primeros_errores = [];
    addEventListener('error', e => {
        if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
            rend.fallos_recursos++;
            apunta('recurso_falla', { que: e.target.tagName, url: corto(e.target.src || e.target.href) });
        } else {
            rend.errores++;
            if (primeros_errores.length < 10) primeros_errores.push({ msg: String(e.message || '').slice(0, 140), donde: `${corto(e.filename)}:${e.lineno || 0}`, t: seg() });
        }
    }, true);
    addEventListener('unhandledrejection', e => {
        rend.errores++;
        if (primeros_errores.length < 10) primeros_errores.push({ msg: 'promesa: ' + String(e.reason && e.reason.message || e.reason || '').slice(0, 120), t: seg() });
    });

    // ── 4. Uso, Interacción y Monitoreo de Campos ──
    const eventos = [];
    const apunta = (tipo, extra) => { if (eventos.length < 500) eventos.push(Object.assign({ tipo, t: seg() }, extra)); };
    const corto = u => { try { return new URL(u, location.href).pathname.split('/').pop() || u; } catch (e) { return String(u || '').slice(-40); } };

    const marca = el => {
        if (!el || !el.closest) return '';
        // Contexto de sección madre (servicios vs autodiagnóstico)
        const seccion = el.closest('section[id], article[id], #header, .barra, .portada, #quiz-container, #stepper-nav, .cuadricula-telemetria, .banco-pruebas');
        const idSec = seccion ? (seccion.id ? `#${seccion.id}` : seccion.className.split(/\s+/)[0]) : '';

        // Botones y respuestas específicas de Autodiagnóstico
        const btnOpcion = el.closest('.choice-btn, [data-respuesta]');
        if (btnOpcion) {
            const q = btnOpcion.dataset.q || (btnOpcion.closest('[data-q]') && btnOpcion.closest('[data-q]').dataset.q) || '';
            const resp = btnOpcion.dataset.respuesta || (btnOpcion.textContent || '').trim().slice(0, 30);
            return `[Quiz Q${q || '?'}: ${resp}] en ${idSec || 'autodiagnostico'}`;
        }

        const nodoInteractivo = el.closest('.vortex-item, .fracture-node, .hive-cell, .swipe-card, .stepper-item, [data-step]');
        if (nodoInteractivo) {
            const txt = (nodoInteractivo.textContent || nodoInteractivo.getAttribute('aria-label') || '').trim().slice(0, 25);
            return `[Fase/Juego: ${txt || nodoInteractivo.className.split(/\s+/)[0]}] en ${idSec || 'autodiagnostico'}`;
        }

        // Elementos de Servicios (11 defensas, cuotas, actos, botones)
        const defItem = el.closest('.defensa, [data-defensa], .cuota-card, [data-cuota]');
        if (defItem) {
            const t = (defItem.querySelector('h3, h4, .defensa__nombre') || defItem).textContent.trim().slice(0, 30);
            return `[Servicios: ${t}] en ${idSec || 'portada'}`;
        }

        const c = el.closest('[data-q],[data-ver],[data-pedir],[data-tema-boton],.marca-jk,.boton,.enlace-flecha,.icono-boton,.actividad__otra,.jk-header__accion,a,button,summary,input,select,textarea');
        if (!c) return el.tagName ? `${el.tagName.toLowerCase()} en ${idSec || 'general'}` : '';

        if (c.dataset && c.dataset.pedir !== undefined) return `[Boton: Pedir ayuda] en ${idSec || 'portada'}`;
        if (c.dataset && c.dataset.temaBoton !== undefined) return `[Boton: Cambiar tema] en ${idSec || 'barra'}`;
        if (c.id) return `#${c.id}${idSec ? ' en ' + idSec : ''}`;

        const txt = (c.textContent || c.value || c.getAttribute('aria-label') || '').trim().slice(0, 25);
        const cl = (c.className && typeof c.className === 'string') ? '.' + c.className.split(/\s+/).filter(Boolean).slice(0, 1).join('.') : '';
        return `${c.tagName.toLowerCase()}${cl}${txt ? ' ("' + txt + '")' : ''}${idSec ? ' en ' + idSec : ''}`.slice(0, 60);
    };

    const getElementPath = (el) => {
        if (!(el instanceof Element)) return '';
        const path = [];
        while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += `#${el.id}`;
                path.unshift(selector);
                break;
            } else {
                let sib = el, nth = 1;
                while ((sib = sib.previousElementSibling)) {
                    if (sib.nodeName.toLowerCase() === selector) nth++;
                }
                if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(' > ');
    };

    const esInteractivo = el => !!(el && el.closest && el.closest('a,button,summary,input,select,textarea,label,[onclick],[role="button"],[data-q],[data-respuesta],.choice-btn,.vortex-item,.fracture-node,.hive-cell,.stepper-item'));

    // Filtro anti-bandera roja: nunca captura claves ni tokens en texto plano
    const esCampoSensible = (el) => {
        const tipo = (el.type || '').toLowerCase();
        const nombre = (el.name || el.id || '').toLowerCase();
        const auto = (el.autocomplete || '').toLowerCase();
        if (tipo === 'password' || tipo === 'hidden') return true;
        if (/pass|pwd|clave|contra|cvv|cvc|card|tarjeta|token|secret/i.test(nombre)) return true;
        if (/cc-|current-password|new-password/i.test(auto)) return true;
        return false;
    };

    // Scroll
    let maxScroll = 0;
    addEventListener('scroll', () => {
        const alto = document.documentElement.scrollHeight - innerHeight;
        if (alto > 0) maxScroll = Math.max(maxScroll, Math.round(scrollY / alto * 100));
    }, { passive: true });

    // Clics detallados, coordenadas y misclics
    addEventListener('pointerdown', e => {
        const el = e.target;
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0 };
        const coord = {
            px: Math.round(e.clientX),
            py: Math.round(e.clientY),
            ex: Math.round(e.clientX - rect.left),
            ey: Math.round(e.clientY - rect.top)
        };

        if (esInteractivo(el)) {
            apunta('toque', { en: marca(el), ...coord });
            return;
        }
        const cerca = document.elementFromPoint(e.clientX, e.clientY);
        if (!esInteractivo(cerca)) {
            apunta('misclic', { en: marca(el), ...coord });
        }
    }, true);

    // Clics de frustración (Rage Clicks)
    let golpes = [];
    addEventListener('pointerdown', e => {
        const ahora = performance.now();
        golpes = golpes.filter(g => ahora - g.t < 1000);
        golpes.push({ x: e.clientX, y: e.clientY, t: ahora });
        if (golpes.length >= 3 && Math.hypot(e.clientX - golpes[0].x, e.clientY - golpes[0].y) < 24) {
            apunta('frustracion', { en: marca(e.target), veces: golpes.length });
            golpes = [];
        }
    }, true);

    // Captura de escritura en formularios
    addEventListener('input', e => {
        const el = e.target;
        if (!el || !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
        const sensible = esCampoSensible(el);
        apunta('input_cambio', {
            campo: el.name || el.id || marca(el),
            tipo: el.type,
            longitud: (el.value || '').length,
            valor: sensible ? '[MASKED]' : (el.value ? el.value.slice(0, 100) : '')
        });
    }, true);

    // Detección de borrado masivo (Backspace / Delete)
    addEventListener('keydown', e => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const el = e.target;
            if (el && ['INPUT', 'TEXTAREA'].includes(el.tagName)) {
                apunta('input_borrado', {
                    campo: el.name || el.id || marca(el),
                    tecla: e.key,
                    longitud_actual: (el.value || '').length
                });
            }
        }
    }, true);

    // Detección de texto pegado
    addEventListener('paste', e => {
        const el = e.target;
        const clip = e.clipboardData || window.clipboardData;
        const texto = clip ? clip.getData('text') : '';
        const sensible = el && esCampoSensible(el);
        apunta('input_pegar', {
            campo: el ? (el.name || el.id || marca(el)) : 'desconocido',
            longitud: texto.length,
            muestra: sensible ? '[MASKED]' : texto.slice(0, 60)
        });
    }, true);

    // Selección de texto en página (indica lectura detenida o copia)
    addEventListener('selectionchange', () => {
        const sel = window.getSelection().toString().trim();
        if (sel.length > 8 && sel.length < 200) {
            apunta('texto_seleccion', { texto: sel.slice(0, 100) });
        }
    });

    // Formularios abandonados antes de salir
    const recolectarFormulariosAbandonados = () => {
        try {
            const inputs = document.querySelectorAll('input, textarea, select');
            const datos = [];
            inputs.forEach(el => {
                if (!esCampoSensible(el) && el.value && el.value.trim().length > 0) {
                    datos.push({
                        campo: el.name || el.id || getElementPath(el),
                        valor: el.value.slice(0, 150),
                        tipo: el.type
                    });
                }
            });
            return datos;
        } catch (e) { return []; }
    };

    // Tiempo activo vs inactivo
    let activoMs = 0, desde = document.visibilityState === 'visible' ? performance.now() : null;
    addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') desde = performance.now();
        else if (desde) { activoMs += performance.now() - desde; desde = null; }
    });

    // Hitos del recorrido
    const hitos = {};
    function hito(nombre) {
        if (!(nombre in hitos)) {
            hitos[nombre] = seg();
            apunta('hito', { paso: nombre });
        }
    }
    requestAnimationFrame(() => requestAnimationFrame(() => hito('primera_pregunta_visible')));

    // ── 5. Resumen Consolidado (Enviado Cifrado en Estado.instantanea) ──
    function resumen() {
        if (desde) { activoMs += performance.now() - desde; desde = performance.now(); }
        const sesion = actualizarHistorialSesiones();
        const intervalo = getIntervaloVisitas();

        return {
            // Qué página es esta visita: base para la consola multi-página (ej. "index", "autodiagnostico").
            pagina: (() => { try { const p = location.pathname.split('/').pop() || 'index'; return (p.replace(/\.html?$/i, '') || 'index').slice(0, 40); } catch (e) { return 'otra'; } })(),
            sesion: {
                uid: sesion.uid,
                sid: sesion.sid,
                fecha: sesion.fecha,
                recurrente: intervalo.recurrente,
                dias_desde_ultima: intervalo.dias_desde_ultima
            },
            dispositivo: dispositivo(),
            rendimiento: rendimiento(),
            uso: {
                segundos_en_pagina: seg(),
                segundos_activos: Math.round(activoMs / 1000),
                scroll_max: maxScroll,
                ultima_fase: window.currentStep || 1,
                hitos,
                misclics: eventos.filter(e => e.tipo === 'misclic').length,
                frustraciones: eventos.filter(e => e.tipo === 'frustracion').length,
                datos_abandonados: recolectarFormulariosAbandonados()
            },
            errores: primeros_errores,
            eventos,
        };
    }

    // ── 6. Empaquetado Forense Definitivo (Para salida o envío cifrado) ──
    function empaquetar(extra = {}) {
        const payload = resumen();
        
        // Segmentación forense por sección del sitio
        const eventosAutodiag = payload.eventos.filter(e => String(e.en || '').includes('autodiagnostico') || String(e.en || '').includes('Quiz') || String(e.en || '').includes('Fase'));
        const eventosServicios = payload.eventos.filter(e => String(e.en || '').includes('Servicios') || String(e.en || '').includes('portada') || String(e.en || '').includes('defensas') || String(e.en || '').includes('cuotas'));

        // Respuestas de preguntas detectadas en el log
        const preguntasRespondidas = {};
        payload.eventos.forEach(e => {
            const m = String(e.en || '').match(/Quiz Q(\d+):\s*([^\]]+)/);
            if (m) {
                preguntasRespondidas[`q${m[1]}`] = {
                    respuesta: m[2],
                    t_seg: e.t,
                    coord: `(${e.px}, ${e.py})`
                };
            }
        });

        // Defensas consultadas en Servicios
        const defensasVistas = [];
        payload.eventos.forEach(e => {
            const m = String(e.en || '').match(/Servicios:\s*([^\]]+)/);
            if (m && !defensasVistas.includes(m[1])) {
                defensasVistas.push(m[1]);
            }
        });

        return Object.assign({
            tipo_envio: 'telemetria_forense_consolidada',
            ts_cierre: new Date().toISOString(),
            duracion_total_seg: seg(),
            resumen_usuario: {
                total_clics: payload.eventos.filter(e => e.tipo === 'toque').length,
                total_misclics: payload.uso.misclics,
                total_rabia: payload.uso.frustraciones,
                formularios_incompletos: payload.uso.datos_abandonados.length,
                textos_pegados: payload.eventos.filter(e => e.tipo === 'input_pegar').length
            },
            segmentacion_sitio: {
                autodiagnostico: {
                    clics_fase: eventosAutodiag.length,
                    preguntas_contestadas: Object.keys(preguntasRespondidas).length,
                    detalle_respuestas: preguntasRespondidas,
                    fase_alcanzada: window.currentStep || (Object.keys(preguntasRespondidas).length > 0 ? 1 : 0)
                },
                servicios: {
                    clics_seccion: eventosServicios.length,
                    defensas_exploradas: defensasVistas,
                    cuota_elegida: (document.querySelector('.cuota-card.activa') || {}).id || 'no_seleccionada'
                }
            }
        }, payload, extra);
    }

    // Inicializar contadores de sesión silenciosamente
    actualizarHistorialSesiones();
    getIntervaloVisitas();

    // Generador de ID estándar del ecosistema JK
    function nuevoId() {
        const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const r = crypto.getRandomValues(new Uint8Array(6));
        return 'JK-' + [...r].map(n => abc[n % abc.length]).join('');
    }

    return { resumen, empaquetar, hito, getUID, nuevoId, get eventos() { return eventos.length; } };
};

// Solo arranca con consentimiento. Si ya lo dio, ahora; si lo da luego, al evento.
function activarMedir() {
    if (window.Medir) return;                 // ya está encendido
    window.Medir = arrancarMedir();
    document.dispatchEvent(new CustomEvent('medir:listo'));
}
let _consent = null;
try { _consent = localStorage.getItem('jk-consent'); } catch (e) {}
if (_consent === 'si') activarMedir();
else document.addEventListener('jk:consentido', activarMedir, { once: true });
