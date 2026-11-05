/* ============================================================
   informe.js · fase 4, el resultado (fichas R-01 a R-08)
   ------------------------------------------------------------
   Se rehace en vivo con cada respuesta (reglamento 1.2 y 1.4).
   Dice el número, con cuánto se calculó, qué revisar, qué ya está
   cubierto, qué apps cubrir primero y qué sigue. No tiene precios
   propios: pedir ayuda usa el pedido de la portada (reglamento 3.3)
   con el mensaje ya escrito (3.2), y todo apunta a @jean.krrillo (3.1).
   ============================================================ */

const Informe = (() => {
    const CONTACTO = { usuario: '@jean.krrillo', instagram: 'https://www.instagram.com/jean.krrillo/' };
    const GUIAS = 'https://github.com/JeanKrrillo/autodiagnostico-digital';
    // Fuerza de la contraseña (qué tan difícil de adivinar). No revisa filtraciones.
    const FUERZA_CLAVE = 'https://bitwarden.com/es-la/password-strength/#Password-Strength-Testing-Tool';
    // ¿Ya se filtró? Comprueba sin enviar la contraseña completa (k-anonymity).
    const FILTRADA_CLAVE = 'https://haveibeenpwned.com/Passwords';
    let textoPlano = '';

    const NIVEL = {
        critical: { nombre: 'Mucho por revisar', frase: 'Muchas de tus cuentas dependen del SMS. Si tu línea deja de funcionar, pierdes acceso a bancos, correos y redes, y se puede resolver.' },
        vulnerable: { nombre: 'Algo por revisar', frase: 'Tienes algunas protecciones, pero varias cuentas siguen dependiendo de tu número.' },
        optimal: { nombre: 'Poco por revisar', frase: 'Tus cuentas principales ya no dependen solo del chip. Si algo le pasa a tu número, tu acceso sigue funcionando.' },
        sin_datos: { nombre: 'Sin respuestas todavía', frase: 'Contesta lo que quieras, en el orden que quieras, y aquí aparece tu resultado.' },
        pocos_datos: { nombre: 'Faltan respuestas', frase: 'Con lo que llevas todavía no hay un número confiable. Contesta unas cuantas preguntas más, sobre todo las de códigos, correo y respaldo, o clasifica algunas apps.' },
    };

    const $ = id => document.getElementById(id);
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function listas() {
        const revisar = [], cubierto = [];
        if (typeof RISK_CONFIG === 'undefined' || typeof QUIZ_SYNTHESIS === 'undefined') return { revisar, cubierto };
        RISK_CONFIG.questions.forEach(q => {
            if (q.id === 15) return;
            const k = forensicAnswers['q' + q.id];
            const t = k && QUIZ_SYNTHESIS['q' + q.id]?.[k];
            if (!t) return;
            (k === 'positivo' ? cubierto : revisar).push(t);
        });
        return { revisar, cubierto };
    }

    function lomasImportante(top) {
        if (top?.length) return `Tu cuenta de ${top[0].name}, porque entra con tu chip y un solo SIM swapping la abre.`;
        const a = forensicAnswers;
        if (a.q3 === 'negativo') return 'Tus códigos llegan por SMS. Pasarlos a una app hace que ya no dependan del chip.';
        if (a.q2 === 'negativo') return 'Repites contraseñas. Si se filtra una, se abren varias cuentas, y un gestor lo resuelve.';
        if (a.q10 === 'negativo') return 'No tienes códigos de respaldo. Si pierdes el celular, son tu forma de entrar.';
        if (a.q13 === 'negativo') return 'Tu chip no tiene PIN. Quien lo saque y lo ponga en otro teléfono tiene tu número.';
        return '';
    }

    function cobertura(c) {
        const partes = [`${c.preguntas} de 14 preguntas`, c.apps ? `${c.apps} apps` : 'ninguna app'];
        let t = `Calculado con ${partes.join(' y ')}. Lo que no contestas no cuenta como bueno ni como malo.`;
        if (c.contrasena) t += ' La contraseña que probaste no cuenta, porque es de prueba.';
        if (c.puntoUnico) t += ' Tus códigos y la recuperación de tu correo dependen del SMS, así que lo que queda por revisar no baja de 70 por ciento.';
        return t;
    }

    function pintar() {
        const st = RiskEngine.getState();
        const total = st.total || 0;
        const c = st.cobertura || { preguntas: 0, apps: 0, contrasena: false, sinDatos: true };
        if (!c.suficiente) c.sinDatos = true;
        const nivel = NIVEL[st.level] || NIVEL.sin_datos;
        const color = RiskEngine.getColorForRisk(total);

        const anillo = $('riskDonutFinal');
        if (anillo) { anillo.style.setProperty('--p', c.sinDatos ? 0 : total); anillo.style.setProperty('--c', color); }
        if ($('final-risk-num')) $('final-risk-num').textContent = c.sinDatos ? '--' : total + '%';
        if ($('final-risk-tag')) $('final-risk-tag').textContent = nivel.nombre;
        if ($('informe-frase')) $('informe-frase').textContent = nivel.frase;
        if ($('informe-cobertura')) $('informe-cobertura').textContent = c.sinDatos ? '' : cobertura(c);
        if ($('report-meta')) $('report-meta').textContent = (typeof Apodo !== 'undefined' && Apodo.de(Estado.id).texto) || Estado.id || '';
        if ($('report-date')) $('report-date').textContent = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

        const { revisar, cubierto } = listas();
        $('informe-revisar').innerHTML = revisar.length ? revisar.map(t => `<li>${esc(t)}</li>`).join('') : '<li class="vacio">Nada por ahora con lo que contestaste.</li>';
        const cuenta = $('informe-cubierto-cuenta'); if (cuenta) cuenta.textContent = cubierto.length ? `(${cubierto.length})` : '';
        $('informe-cubierto').innerHTML = cubierto.length ? cubierto.map(t => `<li>${esc(t)}</li>`).join('') : '<li class="vacio">Todavía nada marcado.</li>';

        // Apps a cubrir: las que dependen del SMS, de mayor a menor peso (antes "puntos críticos")
        const usadas = RiskEngine.getUsedApps().filter(a => a.status === 'vulnerable' || a.status === 'depende');
        const appsHtml = usadas.map(a => {
            const meta = MASTER_APPS.find(m => m.name === a.name) || a;
            const peso = (a.weight >= 5 ? 'Crítica' : a.weight >= 3 ? 'Media' : 'Baja') + (a.status === 'depende' ? ' · la usas' : ' · por SMS');  // corto: el título del bloque ya dice que dependen de tu número
            return `<li><span class="informe-app__logo" style="background:${meta.color || '#121217'}">${getAppLogoHtml(meta, 'w-full h-full p-[18%] object-contain')}</span><span><b>${esc(a.name)}</b><small>${peso}</small></span></li>`;
        }).join('');
        $('informe-apps').innerHTML = appsHtml || '<li class="vacio">Ninguna app marcada como dependiente del SMS.</li>';

        const top = RiskEngine.getTopApps();
        const imp = lomasImportante(top);
        $('informe-importante').hidden = !imp;
        $('informe-importante-texto').textContent = imp;

        // Qué sigue: primero lo que la persona eligió en la pregunta 15
        const conAyuda = forensicAnswers.q15 === 'positivo';
        const sigue = $('informe-sigue');
        if (sigue) sigue.classList.toggle('ayuda-primero', conAyuda);
        const pedir = $('informe-pedir');
        if (pedir) pedir.href = `index.html?diagnostico=${encodeURIComponent(Estado.id || '')}&revisar=${c.sinDatos ? '' : total}#pedir-2fa`;

        textoPlano = armarTexto(total, nivel, revisar, cubierto, usadas, imp, c);
        if ($('results-copy-area')) $('results-copy-area').value = textoPlano;
    }

    function armarTexto(total, nivel, revisar, cubierto, apps, imp, c) {
        const L = [];
        const apodoTxt = (typeof Apodo !== 'undefined' && Apodo.de(Estado.id).texto) || '';
        L.push(`Autodiagnóstico de tu número · ${apodoTxt ? apodoTxt + ' · ' : ''}${Estado.id || ''} · ${new Date().toLocaleDateString('es-MX')}`);
        L.push('');
        L.push(c.sinDatos ? 'Sin respuestas todavía.' : `${nivel.nombre}, ${total} %. ${nivel.frase}`);
        if (!c.sinDatos) L.push(cobertura(c));
        if (revisar.length) { L.push('', 'Conviene revisar'); revisar.forEach(t => L.push(`- ${t}`)); }
        if (cubierto.length) { L.push('', 'Ya tienes cubierto'); cubierto.forEach(t => L.push(`- ${t}`)); }
        if (apps.length) { L.push('', 'Apps que dependen del SMS'); apps.forEach(a => L.push(`- ${a.name}`)); }
        if (imp) { L.push('', 'Lo más importante', imp); }
        L.push('', 'Este diagnóstico revisa tu seguridad digital. No está asociado al registro de líneas ni promueve vincular tu CURP.');
        return L.join('\n');
    }

    async function copiarTexto(btn) {
        let ok = false;
        try { await navigator.clipboard.writeText(textoPlano); ok = true; } catch (e) { }
        if (!ok) { const a = $('results-copy-area'); a?.select(); ok = document.execCommand?.('copy') || false; }
        if (btn) {
            const antes = btn.textContent;
            btn.textContent = ok ? 'Copiado' : 'Selecciona el texto y cópialo';
            setTimeout(() => { btn.textContent = antes; }, 2000);
        }
        return ok;
    }

    // Instagram no deja escribir el mensaje por la persona ni abrir el chat desde una página: se copia y se abre el perfil
    async function escribirInstagram(btn) {
        await copiarTexto(btn);
        window.open(CONTACTO.instagram, '_blank', 'noopener');
    }

    // Cada plataforma sugiere el dato que el navegador ya tenga guardado (autocomplete nativo)
    const PISTAS = {
        whatsapp:  { ph: 'Tu número de WhatsApp',   ac: 'tel',             im: 'tel' },
        instagram: { ph: 'Tu usuario, ej. @nombre', ac: 'username',        im: 'text' },
        telegram:  { ph: 'Tu usuario, ej. @nombre', ac: 'username',        im: 'text' },
        signal:    { ph: 'Tu número en Signal',     ac: 'tel',             im: 'tel' },
        correo:    { ph: 'Tu correo',               ac: 'email',           im: 'email' },
        otro:      { ph: 'Cómo prefieres',          ac: 'on',              im: 'text' },
    };

    function ajustarContacto(form) {
        const p = form.querySelector('select')?.value || 'whatsapp';
        const inp = form.querySelector('input');
        const h = PISTAS[p] || PISTAS.otro;
        if (inp) { inp.placeholder = h.ph; inp.autocomplete = h.ac; inp.inputMode = h.im; }
    }

    function guardarContacto(form) {
        const v = form.querySelector('input')?.value.trim();
        const plataforma = form.querySelector('select')?.value || 'otro';
        const aviso = form.querySelector('.contacto__aviso');
        if (!v) { if (aviso) aviso.textContent = 'Escribe tu dato de contacto o quita esta sección si prefieres no dejarlo.'; return false; }
        try { localStorage.setItem('jk-contacto', 'si'); } catch (e) { }
        Estado.ponerContacto({ plataforma, medio: v, cuando: new Date().toISOString() });
        if (aviso) aviso.textContent = 'Listo, se manda cifrado con tu resultado y te escriben por ahí. Puedes quitarlo cuando quieras.';
        form.querySelector('.contacto__borrar').hidden = false;
        return false;
    }

    function borrarContacto(form) {
        Estado.ponerContacto(null);
        form.querySelector('input').value = '';
        const s = form.querySelector('select'); if (s) s.value = 'whatsapp';
        ajustarContacto(form);
        form.querySelector('.contacto__aviso').textContent = 'Se quitó el contacto.';
        form.querySelector('.contacto__borrar').hidden = true;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const f = document.getElementById('contacto-form');
        const c = Estado.datos?.contacto;
        if (f && c?.medio) {
            if (c.plataforma) { const s = f.querySelector('select'); if (s) s.value = c.plataforma; }
            ajustarContacto(f);
            f.querySelector('input').value = c.medio;
            f.querySelector('.contacto__borrar').hidden = false;
        }
        const cf = document.getElementById('informe-fuerza-clave');
        if (cf) cf.href = FUERZA_CLAVE;
        const cfl = document.getElementById('informe-filtrada-clave');
        if (cfl) cfl.href = FILTRADA_CLAVE;
        const gu = document.getElementById('informe-guia');
        if (gu) gu.href = GUIAS;
    });

    return { pintar, copiarTexto, escribirInstagram, guardarContacto, borrarContacto, ajustarContacto, get texto() { return textoPlano; } };
})();
