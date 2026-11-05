/* nombres-datos.js · las palabras del nombre de cada persona (regla 11).
   Un nombre son tres palabras: objeto + de + algo ("faro de bahía") o objeto + en + lugar ("faro en bahía").
   Sin adjetivos y sin terminaciones de género: son cosas, y ninguna dice nada de quien las lleva.
   Todo en minúsculas; el apodo.js pone la mayúscula inicial donde el nombre empieza una frase.

   Qué combina con qué, para que cada nombre tenga sentido:
   · Cada objeto pertenece a una función (qué hace). La función es la identidad del nombre.
   · Cada objeto dice con qué clases de palabra se junta: "puente de piedra" sí, "puente de rocío" no.
   · Los objetos fijos (que no se mueven) también van con "en" y un paisaje: "faro en bahía".
   Agregar una palabra no cambia el nombre de quien ya lo tiene, salvo de quienes la nueva les quede mejor (apodo.js). */

window.NOMBRES = {
  /* se lee: "Faro es de las cosas que " + frase */
  funciones: {
    orienta: 'orientan: avisan por dónde ir sin llevar a nadie de la mano.',
    une: 'unen: juntan lo que estaba separado.',
    guarda: 'guardan: cuidan lo que importa para que siga ahí.',
    abre: 'abren: dan paso a lo que sigue.',
    mide: 'miden: dicen cuánto, sin opinar.',
    hace: 'hacen: dan forma a lo que antes no existía.',
    lleva: 'llevan: mueven lo que importa de un lado a otro.',
    alumbra: 'alumbran: muestran lo que ya estaba ahí.'
  },

  /* lo que va después de "de" */
  clases: {
    metal: ['cobre', 'hierro', 'bronce', 'latón', 'plata', 'estaño', 'acero', 'oro', 'zinc', 'peltre', 'plomo'],
    mineral: ['piedra', 'cantera', 'granito', 'mármol', 'pizarra', 'cuarzo', 'jade', 'basalto', 'caliza', 'sal', 'yeso', 'obsidiana', 'cornalina', 'pedernal', 'arena', 'tezontle', 'cal'],
    madera: ['cedro', 'roble', 'nogal', 'pino', 'bambú', 'caoba', 'olivo', 'fresno', 'encino', 'ébano', 'ciprés', 'parota', 'ocote', 'sabino'],
    fibra: ['lino', 'cáñamo', 'algodón', 'seda', 'lana', 'mimbre', 'junco', 'palma', 'ixtle', 'yute', 'henequén', 'rafia', 'carrizo'],
    cocido: ['barro', 'arcilla', 'adobe', 'cerámica', 'ladrillo', 'loza', 'talavera'],
    vidrio: ['vidrio', 'cristal', 'ámbar'],
    cera: ['cera'],
    paisaje: ['bahía', 'duna', 'valle', 'cumbre', 'isla', 'ribera', 'cañada', 'llanura', 'mesa', 'sierra', 'selva', 'marisma', 'costa', 'laguna', 'desierto', 'meseta',
      'arrecife', 'estero', 'barranca', 'loma', 'volcán', 'manglar', 'sabana', 'pradera', 'peñón', 'acantilado', 'cenote', 'risco', 'vega', 'bosque', 'páramo', 'cueva',
      'glaciar', 'delta', 'península', 'estuario', 'ensenada', 'istmo', 'oasis', 'quebrada', 'montaña', 'colina'],
    fenomeno: ['marea', 'niebla', 'rocío', 'brisa', 'aurora', 'ocaso', 'alba', 'lluvia', 'escarcha', 'bruma', 'oleaje', 'corriente', 'crepúsculo', 'estío', 'cierzo', 'deshielo',
      'madrugada', 'mediodía', 'nevada', 'viento', 'sol', 'luna', 'aguacero', 'llovizna', 'relente', 'solsticio', 'equinoccio', 'otoño', 'primavera', 'invierno', 'verano']
  },

  /* [objeto, función, fijo (1 = no se mueve), clases con las que se junta] */
  objetos: [
    ['faro', 'orienta', 1, ['paisaje', 'fenomeno']], ['brújula', 'orienta', 0, ['metal', 'paisaje', 'fenomeno']], ['mapa', 'orienta', 0, ['paisaje', 'fenomeno']],
    ['veleta', 'orienta', 1, ['metal', 'paisaje']], ['farol', 'orienta', 1, ['metal', 'fenomeno']], ['baliza', 'orienta', 1, ['paisaje', 'fenomeno']],
    ['atalaya', 'orienta', 1, ['paisaje', 'mineral']], ['sextante', 'orienta', 0, ['metal', 'fenomeno']], ['señal', 'orienta', 1, ['paisaje', 'fenomeno']],
    ['hito', 'orienta', 1, ['mineral', 'paisaje']], ['atlas', 'orienta', 0, ['paisaje']], ['poste', 'orienta', 1, ['madera']],

    ['puente', 'une', 1, ['mineral', 'madera', 'metal', 'paisaje']], ['telar', 'une', 0, ['madera', 'fibra']], ['hilo', 'une', 0, ['fibra', 'metal']],
    ['nudo', 'une', 0, ['fibra']], ['hebra', 'une', 0, ['fibra', 'metal']], ['amarre', 'une', 0, ['fibra']], ['cuerda', 'une', 0, ['fibra']], ['red', 'une', 0, ['fibra']],
    ['sendero', 'une', 1, ['paisaje']], ['pasarela', 'une', 1, ['madera', 'metal']], ['vereda', 'une', 0, ['paisaje']], ['eslabón', 'une', 0, ['metal']],

    ['ancla', 'guarda', 0, ['metal']], ['cofre', 'guarda', 0, ['madera', 'metal']], ['muro', 'guarda', 1, ['mineral', 'cocido']], ['candado', 'guarda', 0, ['metal']],
    ['cerco', 'guarda', 1, ['madera', 'fibra']], ['alacena', 'guarda', 0, ['madera']], ['refugio', 'guarda', 1, ['mineral', 'madera', 'paisaje']], ['jarra', 'guarda', 0, ['cocido']],
    ['cántaro', 'guarda', 0, ['cocido']], ['baúl', 'guarda', 0, ['madera', 'fibra']], ['bóveda', 'guarda', 0, ['mineral', 'cocido']], ['dique', 'guarda', 1, ['mineral', 'fenomeno']],

    ['llave', 'abre', 0, ['metal', 'madera']], ['puerta', 'abre', 0, ['madera', 'metal', 'mineral']], ['ventana', 'abre', 1, ['madera', 'vidrio']], ['portón', 'abre', 0, ['madera', 'metal']],
    ['escalera', 'abre', 0, ['madera', 'mineral', 'metal']], ['umbral', 'abre', 1, ['mineral', 'madera']], ['compuerta', 'abre', 0, ['metal', 'madera']], ['celosía', 'abre', 0, ['madera', 'cocido']],
    ['pórtico', 'abre', 1, ['mineral', 'madera']], ['balcón', 'abre', 1, ['madera', 'metal']], ['cerradura', 'abre', 0, ['metal']], ['portal', 'abre', 1, ['mineral', 'paisaje']],

    ['balanza', 'mide', 0, ['metal', 'madera']], ['reloj', 'mide', 0, ['metal', 'mineral', 'fenomeno']], ['lupa', 'mide', 0, ['vidrio', 'metal']], ['nivel', 'mide', 0, ['madera', 'metal']],
    ['regla', 'mide', 0, ['madera', 'metal']], ['plomada', 'mide', 0, ['fibra', 'metal']], ['compás', 'mide', 0, ['metal', 'madera']], ['escuadra', 'mide', 0, ['madera', 'metal']],
    ['péndulo', 'mide', 0, ['metal']], ['clepsidra', 'mide', 0, ['vidrio', 'mineral']], ['vara', 'mide', 0, ['madera']], ['pesa', 'mide', 0, ['metal', 'mineral']],

    ['yunque', 'hace', 0, ['metal']], ['horno', 'hace', 1, ['cocido', 'mineral']], ['torno', 'hace', 0, ['madera', 'metal']], ['fragua', 'hace', 1, ['metal', 'mineral']],
    ['martillo', 'hace', 0, ['madera', 'metal']], ['cincel', 'hace', 0, ['metal']], ['cepillo', 'hace', 0, ['madera']], ['gubia', 'hace', 0, ['metal']],
    ['prensa', 'hace', 0, ['madera', 'metal']], ['molino', 'hace', 1, ['mineral', 'madera', 'fenomeno']], ['alambique', 'hace', 0, ['metal', 'cocido']], ['noria', 'hace', 1, ['madera', 'metal']],

    ['barca', 'lleva', 0, ['madera', 'fenomeno', 'paisaje']], ['canoa', 'lleva', 0, ['madera', 'paisaje']], ['carreta', 'lleva', 0, ['madera', 'paisaje']], ['canasta', 'lleva', 0, ['fibra']],
    ['mochila', 'lleva', 0, ['fibra']], ['cesta', 'lleva', 0, ['fibra']], ['balsa', 'lleva', 0, ['madera', 'fibra']], ['remo', 'lleva', 0, ['madera']],
    ['timón', 'lleva', 0, ['madera', 'metal']], ['bote', 'lleva', 0, ['madera', 'metal']], ['caravana', 'lleva', 0, ['paisaje']], ['trineo', 'lleva', 0, ['madera', 'fenomeno']],

    ['lámpara', 'alumbra', 0, ['metal', 'vidrio']], ['vela', 'alumbra', 0, ['cera']], ['linterna', 'alumbra', 0, ['metal', 'vidrio']], ['antorcha', 'alumbra', 0, ['madera', 'fibra']],
    ['hoguera', 'alumbra', 1, ['madera', 'paisaje']], ['candil', 'alumbra', 0, ['cocido', 'metal']], ['quinqué', 'alumbra', 0, ['metal', 'vidrio']], ['fogata', 'alumbra', 1, ['madera', 'paisaje']],
    ['hogar', 'alumbra', 1, ['mineral', 'cocido']], ['chimenea', 'alumbra', 1, ['mineral', 'cocido']], ['brasero', 'alumbra', 0, ['metal', 'cocido']], ['mecha', 'alumbra', 0, ['fibra']]
  ]
};
