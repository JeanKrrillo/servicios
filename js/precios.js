/* precios.js · las cuentas de los precios.
   Reciben datos y devuelven números: no tocan la pantalla ni la red, así se prueban solas
   (taller_v3/pruebas/precios.test.js) y las usan igual la calculadora, el panel privado y el visor.
   Precio de una parte = base del servicio × peso de la parte × tamaño × nivel, redondeado a 5 en cuota justa,
   y después × cuota × dólar × prudencia × conciencia, redondeado otra vez. Base = minutos × tarifa de mercado ÷ 60 × percepción. */
const Precios = (() => {
  /* el primer redondeo limpia el ruido de los decimales (150 × 1.15 da 172.4999…), así las medias suben siempre */
  const redondear = (v, paso) => Math.round(Math.round(v * 1e4) / 1e4 / paso) * paso;
  /* campos vacíos, con letras o negativos cuentan como cero; los decimales se cortan */
  const entero = c => Math.max(0, Math.floor(Number(c) || 0));
  const buscar = (lista, id) => (lista || []).find(x => x.id === id) || null;

  /* Cada unidad extra cuesta una fracción fija de la anterior (tasa), así el total crece cada vez menos y nunca pasa del tope.
     Abajo de la cantidad de referencia baja suave: a la mitad cuesta 38 % menos, porque revisar la primera unidad siempre cuesta.
     null = pasa del máximo y se cotiza por mensaje */
  function factorDeTamano(t, cantidad) {
    const n = entero(cantidad);
    if (!n) return 0;
    if (n > t.maximo) return null;
    if (t.lineal) return 1 + t.lineal * (n - t.base);
    return n >= t.base ? t.tope - (t.tope - 1) * Math.pow(t.tasa, n - t.base) : Math.pow(n / t.base, .7);
  }

  const base = s => s.minutos_reales * s.tarifa_de_mercado_por_hora / 60 * s.percepcion;

  /* El dólar mueve el precio con una curva: cada peso extra pesa menos que el anterior, sube con 0.5 y baja con 0.4, entre 0.85 y 1.30 */
  function factorDeDolar(dolar, c, sensibilidad = 1) {
    if (!dolar) return 1;
    const r = dolar / c.tipo_de_cambio_base;
    return Math.min(c.dolar.maximo, Math.max(c.dolar.minimo, 1 + (r >= 1 ? c.dolar.subida : c.dolar.bajada) * sensibilidad * Math.log(r)));
  }

  const nivelDe = (p, opcion) => (p.tipo === 'elegir' ? (buscar(p.opciones, opcion) || {}).nivel || 0 : 1);
  const cuotaDe = (cuota, c) => (cuota in c.factor_de_cuota ? cuota : 'justa');   // la mutua se mide con la justa

  function precioJusto(s, p, cantidad, nivel, c) {
    const t = p.tamano ? factorDeTamano(p.tamano, cantidad) : 1;
    return t === null ? null : redondear(base(s) * p.peso * t * nivel, c.redondeo);
  }

  function precioDeParte(s, p, cantidad, nivel, cuota, c, e = {}) {
    const j = precioJusto(s, p, cantidad, nivel, c);
    if (j === null) return null;
    const d = p.sigue_al_dolar === false ? 1 : factorDeDolar(e.tipo_de_cambio_en_uso, c, s.sensibilidad_dolar);
    return redondear(j * c.factor_de_cuota[cuotaDe(cuota, c)] * d * c.ajustes.prudencia * c.ajustes.conciencia, c.redondeo);
  }

  /* Una persona: la suma de sus partes, una línea por parte. En video la duración multiplica todo y va como su propia línea */
  function sumaDeUnaPersona(s, sel, cuota, c, e) {
    const lineas = [];
    let suma = 0, cotizar = false;
    (sel.partes || []).forEach(el => {
      const p = buscar(s.partes, el.parte), nivel = p && nivelDe(p, el.opcion);
      if (!nivel) return;
      const precio = precioDeParte(s, p, el.cantidad, nivel, cuota, c, e);
      if (precio === null) cotizar = true;
      else if (!precio) return;
      else suma += precio;
      lineas.push({ parte: p.id, nombre: p.nombre, cantidad: p.tamano ? entero(el.cantidad) : 0, opcion: p.tipo === 'elegir' ? buscar(p.opciones, el.opcion).nombre : '', precio });
    });
    if (s.duracion && suma) {
      const n = entero(sel.minutos) || s.duracion.base, f = factorDeTamano(s.duracion, n);
      if (f === null) cotizar = true;
      else if (n !== s.duracion.base) {
        const total = redondear(suma * f, c.redondeo);
        lineas.push({ parte: 'duracion', nombre: 'Duración', cantidad: n, precio: total - suma });
        suma = total;
      }
    }
    return { suma, lineas, cotizar };
  }

  function descuentoDePersonas(n, c) {
    return c.descuento_personas.reduce((d, tramo) => (n >= tramo.desde ? tramo.valor : d), 0);
  }

  /* pedido = { cuota, servicios: [{ servicio, partes: [{ parte, cantidad, opcion }], minutos, personas }], codigo: { tipo: 'pesos' | 'porcentaje', valor } }
     estado = { tipo_de_cambio_en_uso }. El combo y el descuento por personas no se suman: cada servicio recibe el mayor.
     Ningún pedido baja más de 20 % en total, y el código no lo baja del mínimo (salvo en mutua, que no cobra) */
  function cotizar(pedido, c, e = {}) {
    const cuota = cuotaDe(pedido.cuota, c), servicios = [];
    let cotizarPorMensaje = false;
    (pedido.servicios || []).forEach(sel => {
      const s = buscar(c.servicios, sel.servicio);
      if (!s) return;
      const personas = s.por_persona === false ? 1 : Math.max(1, entero(sel.personas)), una = sumaDeUnaPersona(s, sel, cuota, c, e);
      if (una.cotizar) cotizarPorMensaje = true;
      if (una.suma || una.cotizar) servicios.push({ servicio: s.id, nombre: s.nombre, personas, lineas: una.lineas, subtotal: una.suma * personas, cotizar: una.cotizar });
    });
    const combo = servicios.length >= 2 ? c.descuento_combo : 0;
    let bruto = 0, total = 0, maxPersonas = 1;
    servicios.forEach(x => {
      const s = buscar(c.servicios, x.servicio);
      const porPersonas = cuota === 'comunitaria' || s.por_persona === false ? 0 : descuentoDePersonas(x.personas, c);
      x.descuento = Math.max(combo, porPersonas);
      x.motivo = !x.descuento ? '' : porPersonas > combo ? 'personas' : 'combo';
      x.neto = redondear(x.subtotal * (1 - x.descuento), c.redondeo);
      bruto += x.subtotal; total += x.neto; maxPersonas = Math.max(maxPersonas, x.personas);
    });
    let codigo = 0;
    if (pedido.codigo && total) {
      const k = pedido.codigo;
      codigo = redondear(k.tipo === 'porcentaje' ? total * k.valor : k.valor, c.redondeo);
      codigo = Math.max(0, Math.min(codigo, total - Math.ceil(bruto * (1 - c.descuento_maximo) / c.redondeo) * c.redondeo));
    }
    total -= codigo;
    const minimo = (c.minimo_por_pedido[cuota] || 0) * maxPersonas, conMinimo = total > 0 && total < minimo;
    return {
      cuota: pedido.cuota || 'justa', mutua: pedido.cuota === 'mutua', servicios, combo, codigo, bruto,
      total: conMinimo ? minimo : total, minimo: conMinimo ? minimo : 0, cotizar_por_mensaje: cotizarPorMensaje,
      version: c.version, tipo_de_cambio: e.tipo_de_cambio_en_uso || c.tipo_de_cambio_base
    };
  }

  /* Desde X pesos: las partes que ya vienen, 1 unidad de la primera parte con cantidad y la primera opción, sin casillas, nunca menos del mínimo */
  function desde(s, c, cuota = 'justa', e) {
    let primera = true;
    const partes = s.partes.filter(p => p.tipo !== 'casilla').map(p => {
      if (p.tipo === 'elegir') return { parte: p.id, opcion: p.opciones[0].id };
      if (!p.tamano) return { parte: p.id };
      const cantidad = primera ? 1 : 0;
      primera = false;
      return { parte: p.id, cantidad };
    });
    return Math.max(cotizar({ cuota, servicios: [{ servicio: s.id, partes }] }, c, e).total, c.minimo_por_pedido[cuotaDe(cuota, c)]);
  }

  /* Para el panel privado: los minutos que toma una parte y lo que deja por hora */
  const minutosDeParte = (s, p, cantidad = p.tamano && p.tamano.base, nivel = 1) => s.minutos_reales * p.peso * (p.tamano ? factorDeTamano(p.tamano, cantidad) || 0 : 1) * nivel;
  const porHora = (precio, minutos) => (minutos ? Math.round(precio / minutos * 60) : 0);

  return { redondear, entero, factorDeTamano, factorDeDolar, base, precioJusto, precioDeParte, descuentoDePersonas, cotizar, desde, minutosDeParte, porHora, buscar };
})();
if (typeof module !== 'undefined') module.exports = Precios;
