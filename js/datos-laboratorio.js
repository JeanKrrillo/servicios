/* datos-laboratorio.js · lo que se prueba en el laboratorio, el perfil que elige qué aplica y los logros.
   Se edita a mano desde las tablas de ../laboratorio/laboratorio_jk.md (Lo que se prueba en cada servicio).
   Cada prueba lleva un id con su fecha, que no se cambia ni se reusa, porque las respuestas se juntan por id.
   Campos de una prueba:
     id · servicio · texto (lo que se le dice, en una oración) · para (qué decisión cambia) · minutos
     nivel (1 todos, 2 quien lleva más tiempo) · riesgo (bajo, medio, alto)
     quien (jean la hace Jean; poco una nota o captura de la persona; receta la persona con guía)
     aplica (la clave del servicio; 'pagina' le toca a todos) · puntos · oculto (sale al usar la página de cierta forma)
   Las de quien 'jean' no salen en la tanda de nadie: las prueba Jean en su propio entorno. */

const SERVICIOS_LAB = ['pagina', 'cuentas', 'correo', 'rapidez', 'limpieza', 'codigo', 'video', 'web', 'apps', 'casa', 'parental'];

const PRUEBAS_LAB = [
  { id: '2026-11-02-aparatos', servicio: 'La página', texto: 'Abre esta página en otro celular, compu o tablet que tengas, y desde ahí mándame los datos de ese aparato.', para: 'Así sé en qué pantallas se ve mal.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'pagina', puntos: 10 },
  { id: '2026-11-02-claro-oscuro', servicio: 'La página', texto: 'Pon tu celular con letra grande y abre la página en modo claro y en modo oscuro. Dime si algo no se lee.', para: 'Así sé si la puede leer alguien que usa letra grande.', minutos: 4, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'pagina', puntos: 10 },
  { id: '2026-11-02-pedido', servicio: 'La página', texto: 'Arma un pedido de prueba en Elige tu precio hasta el final, sin mandarlo, y dime en qué paso te quedaste pensando.', para: 'Así sé qué parte del pedido se entiende menos.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'pagina', puntos: 15 },
  { id: '2026-11-02-autodiagnostico', servicio: 'Autodiagnóstico', texto: 'Haz el autodiagnóstico y dime qué pregunta no entendiste o no quisiste contestar.', para: 'Así quito o reescribo las preguntas que estorban.', minutos: 10, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'pagina', puntos: 15 },
  { id: '2026-11-02-buscar', servicio: 'La página', texto: 'Escribe en el buscador lo que te pasa, con tus palabras, y dime si salió el servicio que esperabas.', para: 'Así aprendo cómo nombra la gente cada problema.', minutos: 3, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'pagina', puntos: 10 },
  { id: '2026-11-02-datos-moviles', servicio: 'La página', texto: 'Abre la página sin wifi, solo con datos, y mándame los datos de tu aparato.', para: 'Así sé cuánto tarda en abrir con la señal de todos los días.', minutos: 3, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'pagina', puntos: 10, oculto: true },

  { id: '2026-11-02-cuentas-lista', servicio: 'Cuentas seguras', texto: 'Escríbeme qué cuentas tienes y cuáles te mandan códigos por mensaje de texto. Sin contraseñas.', para: 'Así sé cuántas cuentas dependen de tu chip.', minutos: 10, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'cuentas', puntos: 15 },
  { id: '2026-11-02-cuentas-codigos', servicio: 'Cuentas seguras', texto: 'Sigue la guía para activar la app de códigos en una cuenta que casi no uses, cierra sesión y vuelve a entrar.', para: 'Así sé en qué paso se atora la gente.', minutos: 15, nivel: 1, riesgo: 'medio', quien: 'receta', aplica: 'cuentas', puntos: 25 },
  { id: '2026-11-02-cuentas-pwned', servicio: 'Cuentas seguras', texto: 'Sigue la guía para buscar tu correo en Have I Been Pwned y dime qué salió.', para: 'Así sé qué tan seguido aparece la gente en filtraciones.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'receta', aplica: 'cuentas', puntos: 15 },
  { id: '2026-11-02-cuentas-sesiones', servicio: 'Cuentas seguras', texto: 'Sigue la guía para ver en qué aparatos está abierta tu cuenta y cierra los que ya no usas.', para: 'Así sé cuántas sesiones viejas se quedan abiertas.', minutos: 10, nivel: 1, riesgo: 'medio', quien: 'receta', aplica: 'cuentas', puntos: 20 },

  { id: '2026-11-02-correo-conteo', servicio: 'Correo sin spam', texto: 'Cuenta cuántos correos te llegan en un día normal y cuántos lees.', para: 'Así sé cuánto spam llega de verdad.', minutos: 2, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'correo', puntos: 10 },
  { id: '2026-11-02-correo-script', servicio: 'Correo sin spam', texto: 'Sigue la guía para poner en tu Gmail una copia del script que solo marca la publicidad con una etiqueta, durante una semana.', para: 'Así sé si el filtro marca algo que no era publicidad.', minutos: 15, nivel: 1, riesgo: 'medio', quien: 'receta', aplica: 'correo', puntos: 25 },
  { id: '2026-11-02-correo-bajas', servicio: 'Correo sin spam', texto: 'Date de baja de cinco listas de correo que nunca abres y dime en una semana si siguen llegando.', para: 'Así sé si darse de baja sirve.', minutos: 10, nivel: 1, riesgo: 'bajo', quien: 'receta', aplica: 'correo', puntos: 15 },

  { id: '2026-11-02-rapidez-arranque', servicio: 'Equipos más rápidos', texto: 'Con el cronómetro de tu celular, mide cuánto tarda tu compu en prender y en abrir la app que más usas.', para: 'Así tengo el tiempo de antes para comparar después.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'rapidez', puntos: 15 },
  { id: '2026-11-02-rapidez-espacio', servicio: 'Equipos más rápidos', texto: 'Mándame una captura del espacio libre de tu compu o tu celular.', para: 'Así sé qué tan llenos están los aparatos.', minutos: 2, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'rapidez', puntos: 10 },
  { id: '2026-11-02-rapidez-internet', servicio: 'Equipos más rápidos', texto: 'Sigue la guía para medir tu internet y mándame el resultado.', para: 'Así sé si lo lento es el aparato o el internet.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'receta', aplica: 'rapidez', puntos: 15 },

  { id: '2026-11-02-limpieza-captura', servicio: 'Limpieza de compu', texto: 'Mándame una captura de tu escritorio y de tu carpeta de Descargas.', para: 'Así sé cómo guarda la gente sus archivos.', minutos: 3, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'limpieza', puntos: 10 },
  { id: '2026-11-02-limpieza-respaldo', servicio: 'Limpieza de compu', texto: 'Sigue la guía para guardar una copia de tus archivos en tu nube o en una USB.', para: 'Así sé cuánta gente no tiene copia de sus archivos.', minutos: 15, nivel: 1, riesgo: 'bajo', quien: 'receta', aplica: 'limpieza', puntos: 15 },

  { id: '2026-11-02-codigo-script', servicio: 'Corrección de código', texto: 'Mándame un script corto que te falle, con el error que marca.', para: 'Así sé qué errores trae la gente.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'codigo', puntos: 15 },
  { id: '2026-11-02-codigo-nota', servicio: 'Corrección de código', texto: 'Lee la nota de qué cambié en tu script y cuéntame con tus palabras qué entendiste.', para: 'Así sé si la nota se entiende sola.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'codigo', puntos: 15 },

  { id: '2026-11-02-video-crudo', servicio: 'Edición de video', texto: 'Mándame un minuto de un video tal como lo grabaste.', para: 'Así sé con qué material llega la gente.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'video', puntos: 15 },
  { id: '2026-11-02-video-whatsapp', servicio: 'Edición de video', texto: 'Mira el video terminado en tu celular y mándalo por WhatsApp. Dime cómo se ve.', para: 'Así sé cuánto lo empeora WhatsApp.', minutos: 3, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'video', puntos: 10 },

  { id: '2026-11-02-web-tres', servicio: 'Páginas web', texto: 'Escríbeme en tres renglones qué necesita tu página.', para: 'Así sé qué pide la gente cuando pide una página.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'web', puntos: 10 },
  { id: '2026-11-02-web-texto', servicio: 'Páginas web', texto: 'Sigue la guía para cambiar tú un texto de un borrador de página, y dime dónde te atoraste.', para: 'Así sé si alguien puede cuidar su página sin mí.', minutos: 10, nivel: 1, riesgo: 'medio', quien: 'receta', aplica: 'web', puntos: 20 },

  { id: '2026-11-02-apps-apk', servicio: 'Apps móviles', texto: 'Sigue la guía para instalar una app de prueba que no viene de la tienda. Android te va a avisar, es normal.', para: 'Así sé si la gente se anima y en qué paso se detiene.', minutos: 10, nivel: 1, riesgo: 'medio', quien: 'receta', aplica: 'apps', puntos: 25 },
  { id: '2026-11-02-apps-permisos', servicio: 'Apps móviles', texto: 'Sigue la guía para ver qué apps usan tu ubicación, tu cámara y tu micrófono, y dime cuántas son.', para: 'Así sé cuántos permisos de más hay en un celular.', minutos: 8, nivel: 1, riesgo: 'bajo', quien: 'receta', aplica: 'apps', puntos: 15 },

  { id: '2026-11-02-casa-aparatos', servicio: 'Casa inteligente', texto: 'Escríbeme qué aparatos tienes, como focos, enchufes, Alexa o tele, con su marca.', para: 'Así sé qué hay en las casas de verdad.', minutos: 3, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'casa', puntos: 10 },
  { id: '2026-11-02-casa-modem', servicio: 'Casa inteligente', texto: 'Sigue la guía para cambiar la contraseña que traía tu módem de fábrica.', para: 'Así sé cuántos módems siguen con la de fábrica.', minutos: 10, nivel: 1, riesgo: 'medio', quien: 'receta', aplica: 'casa', puntos: 20 },

  { id: '2026-11-02-parental-lista', servicio: 'Control parental', texto: 'Escríbeme qué aparatos usan los niños en tu casa, sin olvidar consola, tele y laptop de la escuela.', para: 'Así sé qué aparatos se le olvidan a la gente.', minutos: 5, nivel: 1, riesgo: 'bajo', quien: 'poco', aplica: 'parental', puntos: 10 },
  { id: '2026-11-02-parental-compra', servicio: 'Control parental', texto: 'Sigue la guía para revisar si la consola y las tiendas de apps piden permiso antes de comprar.', para: 'Así sé cuántas casas no tienen ese límite.', minutos: 10, nivel: 1, riesgo: 'medio', quien: 'receta', aplica: 'parental', puntos: 20 }
];

/* El perfil elige qué servicios le aplican a cada persona. Once preguntas, una por servicio, y hasta siete que salen
   de las respuestas. Cada una dice para qué sirve. 'pagina' le toca a todos y no se pregunta. */
const PERFIL = [
  { id: 'cuentas', texto: '¿Quieres cuidar mejor tu correo o tus redes?', para: 'Si dices que sí, te llegan pruebas de Cuentas seguras.' },
  { id: 'correo', texto: '¿Usas Gmail?', para: 'Si dices que sí, te llegan pruebas de Correo sin spam. Por ahora solo funcionan en Gmail.' },
  { id: 'rapidez', texto: '¿Tu compu o tu celular tarda en prender o en abrir cosas?', para: 'Si dices que sí, te llegan pruebas de Equipos más rápidos.' },
  { id: 'limpieza', texto: '¿Tu compu ya casi no tiene espacio?', para: 'Si dices que sí, te llegan pruebas de Limpieza de compu.' },
  { id: 'codigo', texto: '¿Programas en Python, C++ o SQL?', para: 'Si dices que sí, te llegan pruebas de Corrección de código.' },
  { id: 'video', texto: '¿Grabas o editas videos?', para: 'Si dices que sí, te llegan pruebas de Edición de video.' },
  { id: 'web', texto: '¿Tienes una página web o quieres una?', para: 'Si dices que sí, te llegan pruebas de Páginas web.' },
  { id: 'apps', texto: '¿Tu celular es Android?', para: 'Si dices que sí, te llegan pruebas de Apps móviles.' },
  { id: 'casa', texto: '¿Tienes focos, enchufes o Alexa que manejas desde el celular?', para: 'Si dices que sí, te llegan pruebas de Casa inteligente.' },
  { id: 'parental', texto: '¿Hay niños en tu casa que usan celular, tablet o consola?', para: 'Si dices que sí, te llegan pruebas de Control parental.' }
];

/* Quién es la persona. Van antes del PERFIL, una por pantalla. En el laboratorio ya hay autorización, por eso se pide el nombre real.
   tipo 'texto' se escribe, 'opcion' se toca. Todas se pueden saltar. */
const IDENTIDAD = [
  { id: 'nombre', tipo: 'texto', texto: '¿Cómo te llamo?', para: 'Solo lo veo yo. Es para escribirte por tu nombre.' },
  { id: 'uso', tipo: 'opcion', texto: '¿Para qué usas más tu celular o tu compu?', para: 'Elige lo que más se acerque.', opciones: ['Trabajo', 'Estudio', 'Juegos', 'Cosas de la casa', 'De todo un poco'] },
  { id: 'soltura', tipo: 'opcion', texto: '¿Cómo te llevas con la tecnología?', para: 'Sin pena, así sé cómo explicarte.', opciones: ['Me cuesta', 'Me defiendo', 'Arreglo lo de mi familia'] },
  { id: 'explicar', tipo: 'opcion', texto: '¿Cómo prefieres que te explique?', para: 'Lo uso en las guías y en los mensajes.', opciones: ['Paso a paso', 'Rápido y directo', 'Por llamada'] }
];

/* Logros que se ganan al juntar puntos o al descubrir una prueba oculta. Solo data; el panel los pinta. */
const LOGROS_LAB = [
  { id: 'primera', signo: '1', nombre: 'Primera prueba', como: 'Contesta tu primera prueba.', puntos: 0 },
  { id: 'cinco', signo: '5', nombre: 'Cinco pruebas', como: 'Contesta cinco pruebas.', puntos: 0 },
  { id: 'cien', signo: '100', nombre: 'Cien puntos', como: 'Junta cien puntos.', puntos: 100 },
  { id: 'escondida', signo: '◎', nombre: 'Prueba escondida', como: 'Encuentra una prueba escondida usando la página.', puntos: 0, oculto: true }
];

