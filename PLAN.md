# DeluxXx Sound — Propuesta de desarrollo

Estado: MVP implementado. Consulta README.md para iniciar y VALIDACION.md para pruebas y límites verificados.

## Objetivo
Aplicación web de música en español que cumple el taller de listas doblemente enlazadas y combina archivos de audio locales con búsqueda de canciones de YouTube Music mediante ytmusicapi.

## Arquitectura
- Frontend: Vite, TypeScript estricto, sin frameworks y CSS plano en style.css.
- Núcleo: lista doble genérica implementada a mano y Playlist con puntero al nodo actual. No usar Array, Map ni Set como almacenamiento de la cola.
- Audio local: HTMLAudioElement, archivos del usuario y ObjectURL.
- Catálogo: backend Python 3.10+ con FastAPI y ytmusicapi. El navegador consulta nuestro backend; nunca ejecuta la biblioteca Python ni recibe credenciales de YouTube.
- Reproducción del catálogo: YouTube IFrame Player API, conservando el reproductor visible y los controles exigidos por su documentación. Verificar reproducción por videoId; algunos contenidos no admiten inserción o tienen restricciones. Mostrar error y ofrecer abrir el contenido en YouTube Music.
- Coordinación: interfaz común PlayerPort para adaptadores LocalAudioPlayer y YouTubePlayer; solo uno puede estar activo. Ambos notifican fin, errores, estado y progreso.
- Persistencia posterior: IndexedDB para registros y Blob locales. Recrear ObjectURL al restaurar; nunca guardar blob: como dirección permanente.

La integración de catálogo no presupone URLs de audio descargables. ytmusicapi es una biblioteca no oficial y sus cambios o fallos no deben impedir reproducir archivos locales.

## Modelo de canción
Unión discriminada LocalSong | YouTubeSong. Campos compartidos: id, title, artist, duration (segundos o null si desconocida), artwork opcional.
LocalSong: source = local, src y file. YouTubeSong: source = youtube, videoId. Cada entrada tiene id propio aunque dos entradas compartan videoId.
La playlist contiene nodos de esta unión. Resultados de búsqueda y colecciones temporales pueden usar arrays; la playlist nunca.

## Interfaz propuesta
Tema oscuro con acentos violeta y azul, identidad DeluxXx Sound y diseño adaptable.
1. Cabecera: nombre y búsqueda del catálogo.
2. Panel lateral: carga de archivos, título/artista opcionales, ubicación Inicio / Final / Posición.
3. Centro: resultados del catálogo y cola de reproducción; agregar un resultado respeta la ubicación elegida.
4. Reproductor: carátula, título, artista, anterior, reproducir/pausar, siguiente, progreso y volumen; reproductor de YouTube visible al usar esa fuente.
5. Extras del MVP: repetir, aleatorio, saltos de 10 segundos, búsqueda local y contador/duración conocida.
Estados: vacío, cargando, sin resultados, error de red, archivo incompatible y video no reproducible. Avisos en pantalla accesibles, sin alert.
Posiciones internas desde 0; indicar explícitamente este criterio en el formulario.

## Estructura prevista
```text
DeluxXx Sound/
  AGENTS.md
  AGENTS.original.md
  README.md
  PLAN.md
  frontend/
    index.html
    package.json
    tsconfig.json
    src/
      main.ts
      style.css
      core/{types,DoublyLinkedList,Playlist,PlayerPort}.ts
      players/{LocalAudioPlayer,YouTubePlayer,PlayerCoordinator}.ts
      services/{fileLoader,catalogClient,storage}.ts
      ui/{render,events}.ts
    tests/{DoublyLinkedList,Playlist,PlayerCoordinator}.test.ts
  backend/
    app/{main,schemas,ytmusic_service}.py
    requirements.txt
    tests/test_catalog.py
```
AudioPlayer se ubica en players porque depende de APIs del navegador; core permanece independiente del DOM y de servicios globales del navegador.

## API interna propuesta
- GET /api/health: estado del servicio.
- GET /api/search?q=...: búsqueda de canciones con yt.search(q, filter="songs"); devolver como máximo 20 resultados normalizados.
- GET /api/songs/{video_id}: metadatos con yt.get_song(video_id).
Validar consulta e identificadores, configurar timeout de llamadas externas y convertir errores en respuestas claras. Ejecutar llamadas bloqueantes fuera del event loop. Usar proxy /api de Vite en desarrollo y restringir CORS al origen configurado.
Primera versión: consultas públicas sin conectar una cuenta. Sincronización con la biblioteca personal se deja para otra fase, con autenticación y secretos exclusivamente en backend.

## Ajustes necesarios al AGENTS original
- getNodeAt debe lanzar RangeError; no devolver null para índice inválido. Validar Number.isInteger, valores negativos, NaN, Infinity y límites; addAt admite size, lectura/eliminación no.
- removeNode debe rechazar nodos ajenos o ya eliminados sin cambiar size. Usar pertenencia mediante token de propietario; conservar eliminación O(1).
- clear debe desenlazar los nodos e invalidar su pertenencia. La liberación de ObjectURL pertenece al gestor de recursos del navegador, inyectado por callback; no al núcleo.
- Revocar ObjectURL al eliminar, vaciar, fallar la lectura de metadatos y cerrar la aplicación. Detener y descargar el audio activo antes de revocar su URL.
- Repetir una aplica al final automático; los botones de siguiente/anterior siguen permitiendo navegación manual.
- Eliminar la actual selecciona siguiente o anterior; coordinar también el reproductor. Si era la única, detener y limpiar el estado.
- Leer metadatos con timeout, limpiar el audio temporal y comprobar duración finita. La extensión puede complementar MIME vacío; la compatibilidad real depende del navegador.
- Con aleatorio, recorrer hasta un índice al azar sin convertir la lista a array. Definir anterior como nodo previo de la cola en el MVP.
- Manejar rechazo de play y bloqueo de reproducción automática incluso después de cambios de fuente.

## Fases y entregables
0. Crear frontend/backend, configuración estricta, scripts y Git independiente. Commit por fase.
1. Modelo discriminado y contratos de reproducción.
2. Lista doble: inserción, eliminación, validación, pertenencia y pruebas de enlaces en ambos sentidos.
3. Playlist: puntero actual, navegación, repetir, aleatorio y pruebas de casos borde.
4. Audio local: carga, pausa, progreso, volumen, saltos y manejo de errores.
5. Carga de archivos: formatos del taller, límite propuesto de 50 MB, metadatos y limpieza de recursos.
6. Interfaz adaptable y accesible; completar primero todos los requisitos locales R1–R7.
7. Backend ytmusicapi, búsqueda normalizada, cliente frontend e inserción en la misma lista doble.
8. Reproductor YouTube y coordinación entre fuentes; probar una transición local → YouTube → local.
9. Extras, persistencia opcional y documentación final.
10. Vitest en modo no interactivo, build de producción y comprobación manual en escritorio/móvil.

## Criterios de aceptación
- MP3 y al menos otro formato compatible se cargan y reproducen.
- Inserción en inicio/final/posición, eliminación y navegación funcionan con cola vacía y no vacía.
- Índices inválidos no mutan la lista y se muestran como errores accesibles.
- Enlaces prev/next, head/tail/size y current mantienen sus invariantes.
- ObjectURL liberadas en todos los caminos; eliminar la canción activa no deja audio sonando.
- Búsqueda real mediante ytmusicapi y agregado del resultado a la cola; fallos de red recuperables.
- Videos compatibles reproducen mediante IFrame; los incompatibles presentan un aviso claro.
- Solo una fuente suena; ended avanza con la política de repetición definida.
- Tres extras como mínimo, controles por teclado y UI adaptable.
- Pruebas de núcleo, coordinación y normalización del catálogo pasan; build TypeScript sin errores.
- Pruebas automatizadas del backend usan respuestas simuladas; prueba manual real separada, sin depender de YouTube en cada ejecución.

## Complejidad
Inicio/final O(1), inserción por índice O(n), nodo conocido O(1), eliminación por id O(n), siguiente/anterior O(1), búsqueda y aleatorio O(n). El enlace prev permite retroceder sin recorrer desde head.

## Fuentes
- https://github.com/sigma67/ytmusicapi
- https://ytmusicapi.readthedocs.io/en/stable/faq.html
- Documentación a verificar durante implementación: https://developers.google.com/youtube/iframe_api_reference
