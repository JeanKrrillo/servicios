/**
 * MOTOR DE PONDERACIÓN DE RIESGO - PROTOCOLO DE RESILIENCIA 2025
 * Este archivo centraliza los pesos, valores y lógica de cálculo, 
 * sin generalizar opciones, incluyendo "No sé" y "No la uso".
 */

const RISK_CONFIG = {
  // PESOS DE LAS FASES (Suman 100%)
  // Cómo se reparte el resultado (mapa/riesgo.md). La contraseña de prueba no entra:
  // la página pide no usar la real, así que no dice nada del riesgo de la persona.
  PONDERACION_TOTAL: {
    QUIZ: 0.5,
    ASSETS: 0.5,
    PASSWORD: 0
  },

  // Peso de cada pregunta según cuánto acerca a perder el acceso si se pierde el número.
  // 3 = te deja sin entrar o muestra un ataque en curso, 2 = lo hace más probable, 1 = contexto.
  // La 15 es una preferencia y no cuenta.
  IMPACTO: { 1: 1, 2: 2, 3: 3, 4: 3, 5: 1, 6: 2, 7: 3, 8: 3, 9: 3, 10: 3, 11: 2, 12: 2, 13: 2, 14: 1 },

  // Cuánto pesa cada respuesta: la de riesgo cuenta entera, no sé cuenta la mitad
  // (no saber también es un hueco), la buena no suma.
  VALOR_RESPUESTA: { negativo: 1, neutro: 0.5, positivo: 0 },

  // En Clasifica la persona dice si la app depende del SMS. En Órbita y Fractura solo dice
  // que la usa con su número, sin decir si tiene otra forma de entrar: cuenta un poco más de la mitad.
  VALOR_APP: { vulnerable: 1, depende: 0.6, protegida: 0 },

  // FASE 1: PREGUNTAS (15 Preguntas)
  // Cada respuesta suma puntos. El máximo posible se usa para normalizar al 30%.
  questions: [
    { 
      id: 1, 
      text: "¿Sabes qué sucede con las líneas no registradas?",
      opciones: {
        positivo: { label: "Ya registré mi número con mi operadora", value: 0 },
        neutro: { label: "Sé que existe pero no sé qué hacer", value: 20 },
        negativo: { label: "No sabía nada de esto", value: 40 }
      }
    },
    { 
      id: 2, 
      text: "¿Usas la misma contraseña en más de un servicio?", 
      opciones: {
        positivo: { label: "No, cada cuenta tiene la suya", value: 0 },
        neutro: { label: "No lo sé", value: 20 },
        negativo: { label: "Sí, repito alguna en varios lugares", value: 40 }
      }
    },
    { 
      id: 3, 
      text: "Cuando una app te pide un código para entrar ¿cómo te llega?",
      opciones: {
        positivo: { label: "Lo genero en una app (Authenticator, Authy)", value: 0 },
        neutro: { label: "No lo tengo activado o no lo sé", value: 20 },
        negativo: { label: "Me llega por mensaje de texto (SMS)", value: 40 }
      }
    },
    { 
      id: 4, 
      text: "Si pierdes tu correo ¿podrías recuperarlo sin tu número?",
      opciones: {
        positivo: { label: "Sí, tengo correo alterno o llaves de recuperación", value: 0 },
        neutro: { label: "No lo sé", value: 20 },
        negativo: { label: "No, el único método que tengo es un SMS", value: 40 }
      }
    },
    { 
      id: 5, 
      text: "Cuando usas Wi-Fi público ¿qué haces normalmente?",
      opciones: {
        positivo: { label: "Uso VPN o prefiero mis datos móviles", value: 0 },
        neutro: { label: "No uso Wi-Fi público", value: 0 },
        negativo: { label: "Me conecto sin ninguna protección adicional", value: 40 }
      }
    },
    { 
      id: 6, 
      text: "¿Cómo guardas actualmente tus contraseñas?", 
      opciones: {
        positivo: { label: "Uso un gestor de contraseñas", value: 0 },
        neutro: { label: "El navegador las recuerda por mí", value: 20 },
        negativo: { label: "Las memorizo o las anoto en papel o notas", value: 40 }
      }
    },
    { 
      id: 7, 
      text: "¿Alguna vez te llegó un código SMS de verificación que no pediste?",
      opciones: {
        positivo: { label: "No, nunca", value: 0 },
        neutro: { label: "No lo recuerdo", value: 20 },
        negativo: { label: "Sí, me ha pasado", value: 40 }
      }
    },
    { 
      id: 8, 
      text: "¿Tu celular ha perdido señal de repente y sin razón?",
      opciones: {
        positivo: { label: "No, nunca", value: 0 },
        neutro: { label: "No lo sé", value: 20 },
        negativo: { label: "Sí, tardó horas o días en volver", value: 40 }
      }
    },
    { 
      id: 9, 
      text: "¿Tienes cuentas registradas con un número que ya no usas?",
      opciones: {
        positivo: { label: "No, siempre actualizo cuando cambio", value: 0 },
        neutro: { label: "Nunca lo había pensado", value: 20 },
        negativo: { label: "Posiblemente, he cambiado de número sin actualizar", value: 40 }
      }
    },
    { 
      id: 10, 
      text: "¿Tienes los códigos de emergencia de tus cuentas guardados fuera del celular?",
      opciones: {
        positivo: { label: "Sí, los tengo guardados fuera del celular", value: 0 },
        neutro: { label: "No tengo verificación en dos pasos activada", value: 20 },
        negativo: { label: "No sabía que existían", value: 40 }
      }
    },
    { 
      id: 11, 
      text: "¿Cuántos servicios tienen guardado tu número de celular?",
      opciones: {
        positivo: { label: "1-5 apps", value: 0 },
        neutro: { label: "6-15 apps", value: 20 },
        negativo: { label: "+15 apps", value: 40 }
      }
    },
    { 
      id: 12, 
      text: "¿Has perdido o te han robado el celular en el último año?", 
      opciones: {
        positivo: { label: "No en este último año", value: 0 },
        neutro: { label: "No lo sé", value: 20 },
        negativo: { label: "Sí, me pasó recientemente", value: 40 }
      }
    },
    { 
      id: 13, 
      text: "¿Tu chip tiene el PIN activado, diferente al de la pantalla?",
      opciones: {
        positivo: { label: "Sí, lo tengo activado", value: 0 },
        neutro: { label: "No sabía que eso existía", value: 20 },
        negativo: { label: "No, pero quiero hacerlo", value: 40 }
      }
    },
    { 
      id: 14, 
      text: "¿Estarás fuera de México durante los próximos meses?",
      opciones: {
        positivo: { label: "No, voy a estar en México", value: 0 },
        neutro: { label: "No lo sé", value: 20 },
        negativo: { label: "Sí, voy a viajar en ese periodo", value: 40 }
      }
    },
    { 
      id: 15, 
      text: "¿Cómo prefieres resolver lo que encontremos?", 
      opciones: {
        positivo: { label: "Con ayuda — Prefiero que alguien me ayude haciéndolo", value: 0 },
        neutro: { label: "No lo sé", value: 20 },
        negativo: { label: "Por mi cuenta — Prefiero aprender y hacerlo con una guía", value: 40 }
      }
    }
  ],

  // FASE 2: INVENTARIO DE ACTIVOS (63 Aplicaciones)
  // Opciones: "No la uso" (0 pts), "Protegida" (0 pts), "Vulnerable" (Suma el peso)
  apps: {
    criticas: {
      peso: 5,
      list: [
        // Nombres alineados con MASTER_APPS (app.js) para que el match por includes() no falle.
        "WhatsApp", "Apple", "Google", "Microsoft", "Outlook", "Bitwarden",
        "BBVA", "Santander", "Banorte", "HSBC", "Nu", "Binance", "Bitso",
        "PayPal", "Revolut", "Samsung", "Signal"
      ]
    },
    moderadas: {
      peso: 3,
      list: [
        "Instagram", "TikTok", "Facebook", "LinkedIn", "Telegram", "X",
        "Amazon", "Mercado Libre", "Uber", "ChatGPT", "Claude", "Yahoo!", 
        "Rappi", "DiDi", "Zoom", "Reddit", "Discord", "Adobe", "Canva", 
        "Figma", "Notion", "Airbnb", "Aeroméxico", "Volaris", "Walmart", 
        "Liverpool", "Coppel", "Trello", "Messenger"
      ]
    },
    bajas: {
      peso: 1,
      list: [
        "Netflix", "Spotify", "YouTube", "Twitch", "Disney+", "Nintendo", 
        "Pinterest", "Temu", "Shein", "Dropbox", "Shazam", "Snapchat", 
        "Steam", "Epic Games", "Xbox", "Roblox", "Evernote"
      ]
    }
  },

  // FASE 3: HIVE SYSTEMS (Password Strength)
  password_risk: {
    "instantaneo": { percent: 100, label: "Instantáneo", color: "Púrpura/Rojo brillante" },
    "minutos_horas": { percent: 85, label: "Minutos / Horas", color: "Rojo suave" },
    "dias_meses": { percent: 55, label: "Días / Meses", color: "Naranja" },
    "anos": { percent: 30, label: "Años", color: "Amarillo" },
    "siglos": { percent: 10, label: "Siglos", color: "Verde claro" },
    "milenios": { percent: 0, label: "Milenios+", color: "Verde oscuro" }
  }
};

/**
 * Función principal de cálculo
 * @param {Object} userData - Estado actual de respuestas del usuario
 */
function calculateFinalRisk(userData) {
  // Ver mapa/riesgo.md. Reglamento 1.4: lo que no se contesta no cuenta, y cada parte
  // se calcula solo con lo contestado.
  const C = RISK_CONFIG;
  const partes = [];

  // 1. Preguntas, con su peso de impacto
  let suma = 0, pesos = 0;
  userData.quizAnswers.forEach(({ questionId, value }) => {
    const w = C.IMPACTO[questionId];
    if (!w || !(value in C.VALOR_RESPUESTA)) return;
    suma += w * C.VALOR_RESPUESTA[value];
    pesos += w;
  });
  if (pesos > 0) partes.push({ peso: C.PONDERACION_TOTAL.QUIZ, valor: suma / pesos });

  // 2. Apps que la persona usa, con el peso de cada app (5 crítica, 3 media, 1 baja)
  let ganados = 0, total = 0;
  userData.appStatus.forEach(app => {
    let w = 0;
    if (C.apps.criticas.list.includes(app.name)) w = C.apps.criticas.peso;
    else if (C.apps.moderadas.list.includes(app.name)) w = C.apps.moderadas.peso;
    else if (C.apps.bajas.list.includes(app.name)) w = C.apps.bajas.peso;
    if (app.status === 'no_uso' || !(app.status in C.VALOR_APP)) return;
    total += w;
    ganados += w * C.VALOR_APP[app.status];
  });
  if (total > 0) partes.push({ peso: C.PONDERACION_TOTAL.ASSETS, valor: ganados / total });

  const reparto = partes.reduce((acc, p) => acc + p.peso, 0);
  let totalRisk = reparto > 0 ? partes.reduce((acc, p) => acc + p.peso * p.valor, 0) / reparto * 100 : 0;

  // Punto único de falla: los códigos llegan por SMS y el correo solo se recupera por SMS.
  // Perder el número es perder las dos llaves a la vez, así que el riesgo no baja de 70.
  const q3 = userData.quizAnswers.find(q => q.questionId === 3);
  const q4 = userData.quizAnswers.find(q => q.questionId === 4);
  userData.puntoUnico = !!(q3 && q3.value === 'negativo' && q4 && q4.value === 'negativo');
  if (userData.puntoUnico && totalRisk < 70) totalRisk = 70;

  // Con muy poco contestado un número engaña (una sola respuesta mala daría 100 %).
  // Hace falta, sumando preguntas y apps, al menos un tercio de lo que da un resultado confiable.
  const pesoTotal = Object.values(C.IMPACTO).reduce((a, b) => a + b, 0);
  userData.suficiente = (pesos / pesoTotal + total / 25) >= 1 / 3 || userData.puntoUnico;
  userData.sinDatos = partes.length === 0;
  userData.partes = partes.length;
  if (!userData.suficiente) return 0;
  return Math.round(totalRisk);
}

// Notas de después de contestar (reglamento 6.3): explican qué significa la respuesta
// y qué se puede hacer, en tono de conocido, sin felicitar ni regañar.
const POST_RESPONSES = {
  q1: {
    negativo: "Es normal, el registro es nuevo. Aquí ves qué te toca y para cuándo.",
    neutro: "Con el calendario del encabezado sabes tu fecha según el último dígito de tu número.",
    positivo: "Registrarte cuida tu línea, pero tus cuentas pueden seguir dependiendo del SMS, y eso va aparte."
  },
  q2: {
    negativo: "Es lo más común. Un gestor de contraseñas te deja tener una distinta en cada cuenta sin memorizarlas.",
    neutro: "Si no lo sabes, un gestor de contraseñas te dice cuáles se repiten.",
    positivo: "Así una filtración se queda en una sola cuenta."
  },
  q3: {
    negativo: "Los códigos por SMS dependen del chip. Pasarlos a una app hace que ya no dependan de él.",
    neutro: "Activar la verificación en dos pasos con una app es de lo que más protege una cuenta.",
    positivo: "Una app de códigos no depende de tu chip, así que un SIM swapping no los alcanza."
  },
  q4: {
    negativo: "Agregar otro correo o guardar códigos de recuperación lo resuelve en unos minutos.",
    neutro: "Se revisa en la configuración de seguridad de tu correo, en la parte de recuperación.",
    positivo: "Con eso tu correo no depende solo de tu número."
  },
  q5: {
    negativo: "En redes abiertas conviene usar tus datos móviles o una VPN para lo importante.",
    neutro: "Si no usas wifi público, eso no te toca.",
    positivo: "Así lo que mandas no viaja abierto en la red."
  },
  q6: {
    negativo: "Nadie memoriza decenas de claves distintas. Un gestor las crea, las guarda cifradas y las llena por ti.",
    neutro: "El navegador sirve, pero si alguien entra a tu cuenta del navegador ve todas. Un gestor aparte es más difícil de abrir.",
    positivo: "Un gestor crea claves difíciles de adivinar y las recuerda por ti."
  },
  q7: {
    negativo: "Alguien intentó entrar a esa cuenta. Conviene cambiar su contraseña y activar la verificación con app.",
    neutro: "Si llega uno, no se lo des a nadie y cambia la contraseña de esa cuenta.",
    positivo: "Si algún día te llega uno, ya sabes qué significa."
  },
  q8: {
    negativo: "Puede ser una falla de la red o un SIM swapping. Si coincidió con correos o SMS raros, revisa tus cuentas principales.",
    neutro: "Si pasa sin razón y tarda en volver, llama a tu operadora y revisa tus cuentas.",
    positivo: "Si algún día pasa, ya sabes qué revisar."
  },
  q9: {
    negativo: "Nadie avisa cuando reasignan un número. Se cambia en la configuración de cada cuenta, empezando por bancos y correo.",
    neutro: "Se revisa rápido en la configuración de tus cuentas principales.",
    positivo: "Así nadie entra a tus cuentas con un número que ya no es tuyo."
  },
  q10: {
    negativo: "Se generan en la configuración de seguridad de cada cuenta, y conviene imprimirlos o guardarlos en un gestor.",
    neutro: "Al activar la verificación en dos pasos te los dan, y son tu entrada si pierdes el celular.",
    positivo: "Son tu entrada si pierdes el celular, y no dependen de señal ni batería."
  },
  q11: {
    negativo: "Con tantas apps, perder el número afecta varias a la vez, así que conviene empezar por las de dinero y correo.",
    neutro: "Es lo más común, y con un plan por orden de importancia se resuelve.",
    positivo: "Con pocas apps, pasarlas a métodos que no dependan del SMS toma poco tiempo."
  },
  q12: {
    negativo: "Si tenías bancos o redes abiertas, conviene cambiar sus contraseñas y cerrar las sesiones desde otro dispositivo.",
    neutro: "Activar el borrado remoto del celular sirve por si algún día pasa.",
    positivo: "Activar el borrado remoto sirve por si algún día pasa."
  },
  q13: {
    negativo: "Se activa en la configuración del celular, en la parte de la SIM, en unos minutos.",
    neutro: "Casi nadie lo conoce. Se activa en la configuración del celular, en la parte de la SIM.",
    positivo: "Casi nadie lo tiene activado, así tu chip no sirve en otro teléfono."
  },
  q14: {
    negativo: "Conviene dejar todo configurado antes de salir, porque recuperar la línea desde fuera es más difícil.",
    neutro: "Si viajas, conviene dejar todo listo antes de salir.",
    positivo: "Hay margen para resolverlo con calma."
  },
  q15: {
    negativo: "En tu resultado aparece primero la guía para hacerlo por tu cuenta.",
    neutro: "En tu resultado aparecen las dos formas.",
    positivo: "En tu resultado aparece primero cómo pedir ayuda."
  }
};

const QUIZ_SYNTHESIS = {
  q1: {
    negativo: "No conocías el registro obligatorio de línea.",
    neutro: "Conoces el registro, pero todavía no registras tu línea.",
    positivo: "Ya registraste tu línea con tu compañía."
  },
  q2: {
    negativo: "Usas la misma contraseña en varias cuentas.",
    neutro: "No sabes si repites contraseñas.",
    positivo: "Cada cuenta tiene su propia contraseña."
  },
  q3: {
    negativo: "Tus códigos de verificación llegan por SMS.",
    neutro: "No tienes verificación en dos pasos activada.",
    positivo: "Tus códigos salen de una app."
  },
  q4: {
    negativo: "Tu correo solo se recupera por SMS.",
    neutro: "No sabes cómo se recupera tu correo principal.",
    positivo: "Tu correo tiene métodos de recuperación que no dependen del chip."
  },
  q5: {
    negativo: "Te conectas a wifi público sin VPN ni datos móviles.",
    neutro: "No usas wifi público.",
    positivo: "Usas VPN o datos móviles en redes públicas."
  },
  q6: {
    negativo: "Guardas contraseñas de memoria, en papel o en notas del celular.",
    neutro: "El navegador guarda tus contraseñas.",
    positivo: "Usas un gestor de contraseñas."
  },
  q7: {
    negativo: "Has recibido códigos de verificación que no pediste.",
    neutro: "No recuerdas si te han llegado códigos que no pediste.",
    positivo: "No te han llegado códigos que no hayas pedido."
  },
  q8: {
    negativo: "Tu celular perdió la señal de repente.",
    neutro: "No sabes si tu celular ha perdido la señal de repente.",
    positivo: "Tu celular no ha perdido la señal de repente."
  },
  q9: {
    negativo: "Tienes cuentas con un número que ya no usas.",
    neutro: "No sabes si alguna cuenta tiene un número viejo.",
    positivo: "Actualizas tus datos de contacto cuando cambias de número."
  },
  q10: {
    negativo: "No tienes códigos de respaldo guardados fuera del celular.",
    neutro: "No tienes verificación en dos pasos activada.",
    positivo: "Tienes códigos de respaldo guardados fuera del celular."
  },
  q11: {
    negativo: "Más de 15 apps dependen de tu número.",
    neutro: "Entre 6 y 15 apps dependen de tu número.",
    positivo: "Menos de 5 apps dependen de tu número."
  },
  q12: {
    negativo: "Perdiste o te robaron el celular en el último año.",
    neutro: "No sabes si alguien pudo usar tu celular.",
    positivo: "No has perdido ni te han robado el celular en el último año."
  },
  q13: {
    negativo: "Tu chip no tiene PIN activado.",
    neutro: "No sabías que el chip puede tener PIN.",
    positivo: "Tu chip tiene PIN activado."
  },
  q14: {
    negativo: "Vas a estar fuera de México en los próximos meses.",
    neutro: "No sabes si vas a estar en México en los próximos meses.",
    positivo: "Vas a estar en México en los próximos meses."
  }
};

// Exportación Global para el Navegador o Node.js
if (typeof window !== 'undefined') {
    window.RISK_CONFIG = RISK_CONFIG;
    window.calculateFinalRisk = calculateFinalRisk;
    window.POST_RESPONSES = POST_RESPONSES;
    window.QUIZ_SYNTHESIS = QUIZ_SYNTHESIS;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RISK_CONFIG, calculateFinalRisk, POST_RESPONSES, QUIZ_SYNTHESIS };
}

