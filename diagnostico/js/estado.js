/* ============================================================
   estado.js · lo que la persona contesta, guardado para retomar
   ------------------------------------------------------------
   Reglamento 1.5, 2.1, 2.2 y 2.5. Una sola fuente:
   · se guarda en el celular (localStorage) unos instantes después
     de cada cambio, así al volver sigue donde se quedó;
   · cada visita tiene un número al azar que la persona puede ver;
   · cambiar una respuesta la reemplaza (gana la más reciente);
   · borrar quita la respuesta del celular y avisa al historial.
   Nunca se guarda la contraseña probada, solo su celda de la tabla.
   El envío cifrado a Jean vive en historial.js (vuelta 9) y lee de
   aquí con Estado.instantanea().
   ============================================================ */

const Estado = (() => {
    const CLAVE = 'jk-autodiagnostico';
    const VERSION = 1;
    let datos = null;
    let espera = 0;
    let restaurando = false;

    // El número lo da Identidad (uno solo para todas las páginas). Si no está, genera uno local.
    function nuevoId() {
        if (typeof Identidad !== 'undefined') return Identidad.id();
        const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const r = crypto.getRandomValues(new Uint8Array(6));
        return 'JK-' + [...r].map(n => abc[n % abc.length]).join('');
    }

    function leer() {
        try {
            const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
            if (d && d.v === VERSION && d.id) return d;
        } catch (e) { }
        return null;
    }

    function escribir() {
        try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { }
    }

    function cargar() {
        const guardado = leer();
        if (guardado) {
            datos = guardado;
            // Sincroniza el id guardado hacia Identidad, para que la portada use el mismo número
            try { if (typeof Identidad !== 'undefined' && datos.id && Identidad.id() !== datos.id) localStorage.setItem('jk-id', datos.id); } catch (e) {}
        } else {
            datos = { v: VERSION, id: nuevoId(), creado: new Date().toISOString() };
        }
        return datos;
    }

    const nombres = arr => (arr || []).map(a => a && a.name).filter(Boolean);

    // Foto de lo que está en pantalla, sacada de los módulos de la página
    function instantanea() {
        return {
            v: VERSION,
            id: datos.id,
            creado: datos.creado,
            actualizado: new Date().toISOString(),
            reparto: {
                swipe: nombres(distributedData.swipe),
                vortex: nombres(distributedData.vortex),
                fracture: nombres(distributedData.fracture),
            },
            preguntas: { ...forensicAnswers },
            apps11: typeof q11Valor !== 'undefined' ? q11Valor : null,
            deslizar: (typeof swipedHistory !== 'undefined' ? swipedHistory : [])
                .map(h => ({ app: DATA[h.index]?.name, dir: h.direction })).filter(h => h.app),
            orbita: nombres(typeof swallowedVortexApps !== 'undefined' ? swallowedVortexApps : []),
            fractura: nombres(typeof fractureSelectedApps !== 'undefined' ? fractureSelectedApps : []),
            contrasena: window.hiveSeleccion || null,     // { row, col, time, color }, nunca el texto
            contacto: datos.contacto || null,
            tecnico: typeof Medir !== 'undefined' ? Medir.resumen() : null,
        };
    }

    function guardar() {
        if (restaurando || !datos) return;
        clearTimeout(espera);
        espera = setTimeout(() => {
            datos = instantanea();
            escribir();
            document.dispatchEvent(new CustomEvent('estado:guardado', { detail: datos }));
        }, 400);
    }

    // Reparto de apps guardado: así quien retoma ve las mismas apps en cada juego
    function repartoGuardado() {
        if (!datos.reparto) return false;
        const porNombre = n => MASTER_APPS.find(a => a.name === n);
        const r = {};
        for (const k of ['swipe', 'vortex', 'fracture']) {
            r[k] = (datos.reparto[k] || []).map(porNombre).filter(Boolean);
            if (!r[k].length) return false;
        }
        distributedData = r;
        return true;
    }

    // Vuelve a pintar lo guardado sin animaciones de entrada largas
    function aplicar() {
        if (!datos) return;
        restaurando = true;
        try {
            // Preguntas: se vuelve a tocar el botón elegido, con su dibujo
            Object.entries(datos.preguntas || {}).forEach(([q, clave]) => {
                const n = parseInt(q.slice(1), 10);
                if (n === 11 && datos.apps11 != null) {
                    const sl = document.getElementById('app-slider');
                    if (sl) { sl.value = datos.apps11; updateAppCounter(sl.value); }
                }
                const btn = botonDe(n, clave);
                if (btn) btn.click();
            });
            // Deslizar
            if (datos.deslizar?.length && typeof restaurarSwipe === 'function') restaurarSwipe(datos.deslizar);
            // Órbita y fractura: se marcan antes de armarse
            if (datos.orbita?.length) restaurarVortex(datos.orbita);
            if (datos.fractura?.length) restaurarFracture(datos.fractura);
            // Contraseña: la celda que se eligió
            const c = datos.contrasena;
            if (c) {
                const cel = document.querySelector(`.hive-cell[data-row="${c.row}"][data-col="${c.col}"]`);
                if (cel) selectHiveItem(cel, c.time, 0, c.color, true);
            }
        } finally {
            restaurando = false;
        }
    }

    function botonDe(n, clave) {
        const card = document.getElementById('q' + n);
        if (!card) return null;
        return [...card.querySelectorAll('[data-respuesta]')].find(b => b.dataset.respuesta === clave);
    }

    function borrarTodo() {
        try { localStorage.removeItem(CLAVE); } catch (e) { }
        const viejo = datos?.id;
        // Renueva el número compartido: la persona empieza de cero en todas las páginas
        const nid = (typeof Identidad !== 'undefined') ? Identidad.renovar() : nuevoId();
        datos = { v: VERSION, id: nid, creado: new Date().toISOString() };
        escribir();
        document.dispatchEvent(new CustomEvent('estado:borrado', { detail: { id: viejo } }));
        return datos.id;
    }

    function ponerContacto(c) { datos.contacto = c; guardar(); }

    // ¿La persona ya tiene algo contestado de una visita anterior? (para ofrecer retomar)
    function hayAvance() {
        const d = datos;
        if (!d) return false;
        return Object.keys(d.preguntas || {}).length > 0
            || (d.deslizar || []).length > 0
            || (d.orbita || []).length > 0
            || (d.fractura || []).length > 0
            || !!d.contrasena || !!d.contacto;
    }

    // La fase más avanzada donde la persona dejó actividad (para llevarla ahí al retomar).
    function ultimaFase() {
        const d = datos;
        if (!d) return 1;
        if (d.contacto) return 4;                                   // dejó contacto → informe
        if (d.contrasena) return 3;                                 // probó contraseña → fase 3
        if ((d.deslizar || []).length || (d.orbita || []).length || (d.fractura || []).length) return 2;  // clasificó apps → fase 2
        if (Object.keys(d.preguntas || {}).length) return 1;        // contestó preguntas → fase 1
        return 1;
    }

    return {
        cargar, guardar, aplicar, repartoGuardado, borrarTodo, instantanea, ponerContacto, hayAvance, ultimaFase,
        get id() { return datos?.id; },
        get restaurando() { return restaurando; },
        get datos() { return datos; },
    };
})();
