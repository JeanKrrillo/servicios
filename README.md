# jean.krrillo · servicios

Sitio de servicios digitales de jean.krrillo: lo reviso, lo arreglo, te explico. Publicado el 14 de octubre de 2026.

Página estática, sin servidor, sin cuentas y sin librerías externas: todo lo que usa vive en este repositorio y se publica con GitHub Pages.

## Qué contiene

**Portada (`index.html`).** Abre con el carrusel de las 11 defensas animadas a pincel y pregunta qué necesitas: cuentas, compu o celular, fotos y video, que te hagan algo, u otra cosa. Cada necesidad muestra sus defensas con lo que se hace, cuánto tarda y cuánto cuesta. Debajo están:

- **Cómo funciona.** Las cuatro cuotas por hora (mutua, comunitaria, justa y solidaria) con los grupos para quienes suele ser cada una, cómo sale el precio con un ejemplo, las reglas de cobro y los cinco pasos de un pedido.
- **Casos resueltos.** Reportes de entrega sin datos de nadie: qué se encontró y qué se entregó, con un seudónimo de pigmento natural de México.
- **Preguntas antes de pedir**, **Mordentes del laboratorio** y **Lo que circula**, frases que se comparten revisadas con su fuente.
- **Pedir ayuda.** Un pedido por toques, sin escribir, que arma el mensaje para mandarlo por Instagram.

**Autodiagnóstico (`autodiagnostico.html`).** Quince preguntas, actividades y un informe que miden qué tan expuesto está lo tuyo frente al registro de líneas móviles. Las respuestas se guardan en tu aparato y lo que se manda viaja cifrado.

**Registro de líneas (`preguntas.html`)** y **Cómo se trabaja aquí (`fundamentos.html`)**: preguntas frecuentes del registro con sus fuentes, y los principios con los que se trabaja.

## Cómo está hecho

- HTML, CSS y JavaScript nativos. Tres colores: tinta, papel y ocre, con modo oscuro.
- Animaciones Lottie locales, que se cargan después de que la página abrió.
- Fondo de arena en WebGL que el puntero levanta como humo.
- Música en tres piezas encadenadas, comprimida, que solo se descarga si suena.
- Pensado primero para el celular: nada más alto que la pantalla, áreas de toque de 44 px, teclado, lector de pantalla y movimiento reducido.

## Publicación

Cada subida a `main` pasa por una revisión automática (`.github/workflows/publicar.yml`): que exista cada archivo que piden las páginas, que no haya archivos internos ni llaves privadas y que nada pese de más. Si la revisión pasa, el sitio se publica solo en GitHub Pages; si no, se queda la versión anterior.

El código de este repositorio es la versión de publicación: ya viene sin comentarios y comprimido.
