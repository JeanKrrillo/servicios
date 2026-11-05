/* ============================================================
   apodo.js · el nombre de pigmento de cada visita (regla 11)
   ------------------------------------------------------------
   · El número de visita real (JK-XXXXXX) sigue por dentro: viaja
     cifrado y se valida en Apps Script. Aquí solo se deriva, de
     forma determinista, el apodo que ve la persona: un pigmento
     natural de México + un adjetivo positivo neutro, p. ej.
     "almagre alegre". Mismo número → siempre el mismo apodo.
   · Adjetivos en terminación neutra -e (regla 11.3), positivos y
     que nadie pueda tomar a mal (regla 11.4). El adjetivo no se
     describe; la descripción es solo del pigmento (regla 11.2).
   ============================================================ */

const Apodo = (() => {
  // Adjetivos positivos, neutros en -e, con carácter y sin doble lectura.
  // Nada espiritual, geográfico ni de relleno (regla 11.4).
  const ADJETIVOS = [
    // Neutros por naturaleza (-e, -z, -able/-ible, -ante/-ente): valen igual para todes.
    'alegre', 'amable', 'valiente', 'paciente', 'ingeniose', 'curiose',
    'risueñe', 'atente', 'brillante', 'elocuente', 'detalliste', 'constante',
    'prudente', 'entusiaste', 'serene', 'perspicaz', 'sagaz', 'tenaz',
    'afable', 'cordial', 'gentil', 'noble', 'firme', 'dulce',
    'despierte', 'vivaz', 'ocurrente', 'platicadore', 'trabajadore', 'creative',
    'observadore', 'decidide', 'confiable', 'sensate', 'cuidadose', 'hábil',
    'sonriente', 'cálide', 'jovial', 'expresive', 'reflexive', 'resuelte',
    'atinade', 'audaz', 'capaz', 'eficaz', 'veloz', 'locuaz',
    'agradable', 'adorable', 'admirable', 'apreciable', 'estimable', 'notable',
    'razonable', 'sociable', 'tratable', 'leal', 'cabal', 'formal',
    'puntual', 'genial', 'especial', 'inteligente', 'competente', 'diligente',
    'coherente', 'consciente', 'persistente', 'exigente', 'elegante', 'galante',
    'pujante', 'vibrante', 'importante', 'abundante', 'tolerante', 'interesante',
    'estimulante', 'alentadore', 'animadore', 'organizadore', 'planeadore', 'soñadore',
    'luchadore', 'ganadore', 'triunfadore', 'emprendedore', 'innovadore', 'conversadore',
    'escuchadore', 'acompañadore', 'narradore', 'juguetone', 'bromiste', 'chistose',
    'imaginative', 'inventive', 'intuitive', 'atractive', 'receptive', 'proactive',
    'comprensive', 'persuasive', 'colaborative', 'participative', 'educative', 'positive',
    'calmade', 'tranquile', 'apacible', 'sensible', 'accesible', 'flexible',
    'invencible', 'increíble', 'memorable', 'favorable', 'saludable', 'sustentable',
    'confortable', 'disponible', 'responsable', 'honeste', 'modeste', 'juste',
    'robuste', 'protectore', 'cuidadore', 'guardián', 'defensore', 'estudiose',
    'aplicade', 'esforzade', 'preparade', 'informade', 'enterade', 'animose',
    'briose', 'talentose', 'virtuose', 'generose', 'bondadose', 'cariñose',
    'amistose', 'graciose', 'donose', 'primorose', 'esmerade', 'dedicade',
    'entregade', 'comprometide', 'motivade', 'optimiste', 'realiste', 'dicharachere',
    'parlanchine', 'chambeadore', 'arrojade', 'templade', 'aguzade', 'espabilade',
  ].filter((v, i, a) => a.indexOf(v) === i && !/[oa]$/.test(v));

  // Hash estable y pequeño del número de visita (FNV-1a de 32 bits).
  function hash(txt) {
    let h = 0x811c9dc5;
    for (let i = 0; i < txt.length; i++) {
      h ^= txt.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  const PIGS = () => (Array.isArray(window.PIGMENTOS) ? window.PIGMENTOS : []);

  // Del número de visita saca pigmento + adjetivo, siempre el mismo.
  function de(numero) {
    const pigs = PIGS();
    if (!numero || !pigs.length) return { pigmento: '', adjetivo: '', texto: '', descripcion: '' };
    const h = hash(String(numero));
    const p = pigs[h % pigs.length];
    const a = ADJETIVOS[(Math.floor(h / pigs.length)) % ADJETIVOS.length];
    // p = [nombre, color, descripción]
    return { pigmento: p[0], color: p[1] || '', adjetivo: a, texto: `${p[0]} ${a}`, descripcion: p[2] || '' };
  }

  // "Hola, buenas tardes" según la hora local.
  function saludo(d = new Date()) {
    const h = d.getHours();
    if (h < 12) return 'Hola, buen día';
    if (h < 19) return 'Hola, buenas tardes';
    return 'Hola, buenas noches';
  }

  return { de, saludo };
})();

window.Apodo = Apodo;
