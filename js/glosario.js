/* glosario.js · palabras que no todos conocen (sección 10 de la reestructuración del 2026-10-23, tal cual).
   La primera vez que aparecen en cada sección se vuelven tocables y abren una glosa corta.
   Cada término va en una frase que empieza con "X es", y explica sin asustar. */
const GLOSARIO = [
  { t: 'laboratorio', d: 'Laboratorio es ser usuario de pruebas beta, o sea probar servicios nuevos antes de que salgan al público.' },
  { t: 'trueque', d: 'Trueque es dar tu tiempo o lo que sabes a cambio de un servicio, sin dinero.' },
  { t: 'cuota', alias: ['cuotas'], d: 'Cuota es el nivel de precio que eliges. Hay cuatro y eliges la tuya.' },
  { t: '2FA', d: '2FA es un segundo paso al entrar. Además de la contraseña, pide un código que solo tú tienes.' },
  { t: 'SMS', d: 'SMS es un mensaje de texto. Si tus códigos llegan por ahí, dependen de tu chip.' },
  { t: 'SIM swapping', alias: ['SIM Swapping'], d: 'SIM swapping es cuando alguien consigue un chip con tu número y recibe tus códigos.' },
  { t: 'gestor de contraseñas', d: 'Gestor de contraseñas es una app que guarda una contraseña distinta para cada cuenta, como Bitwarden.' },
  { t: 'códigos de respaldo', alias: ['códigos de emergencia'], d: 'Códigos de respaldo son códigos de un solo uso para entrar si pierdes el celular. Se guardan en papel.' },
  { t: 'PIN', d: 'PIN es una clave de 4 dígitos del chip, distinta a la de la pantalla. Sin ella, nadie puede usar tu chip.' },
  { t: 'VPN', d: 'VPN es una conexión cifrada para usar Wi-Fi público con más seguridad.' },
  { t: 'APK', d: 'APK es un archivo para instalar una app en Android sin pasar por la Play Store.' },
  { t: 'IoT', d: 'IoT son aparatos de casa que controlas desde el celular, como focos o enchufes.' },
  { t: 'NFC', d: 'NFC es un chip que se lee al acercar el celular.' },
  { t: 'RFID', d: 'RFID es un chip que se lee con un lector cercano, como el de una credencial de acceso.' },
  { t: 'pigmento', alias: ['pigmentos'], d: 'Pigmento es el nombre natural de México que identifica a cada persona atendida. Es solo suyo y siempre el mismo.' },
];
