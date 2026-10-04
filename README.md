# DeluxXx Sound

Reproductor web local en español con archivos de audio y búsqueda real de YouTube Music. La cola usa una lista doblemente enlazada propia en TypeScript; el catálogo se consulta desde Python con ytmusicapi.

## Abrir en Windows

Las dependencias y el build están preparados en esta carpeta. Haz doble clic en **Iniciar DeluxXx Sound.cmd**. Abre http://127.0.0.1:8000 en el navegador. Si la carpeta se copia a otro equipo, ejecuta primero **Instalar.cmd** con Python 3.10+ y Node.js 22.12+ instalados.

**Detener DeluxXx Sound.cmd** cierra el servidor iniciado por el acceso directo. Cerrar la pestaña detiene el audio, pero no el servidor. Los registros del acceso directo están en `.runtime/server.log`.

## Funciones

- Diseño completo azul oscuro y vinotinto, vinilo animado durante la reproducción, transiciones y adaptación a móviles. Inicio, Explorar, Biblioteca, Favoritas, Subir música y Ajustes funcionan con datos reales de la cola.
- Botón de sol/luna en la barra superior para alternar tema claro y oscuro en toda la aplicación. La elección se guarda en el navegador.
- Favoritas por canción, colecciones de archivos locales/YouTube y preferencia de animaciones guardada en el navegador. También se respeta la preferencia de movimiento reducido del sistema.

- Subir o arrastrar MP3, WAV, OGG, M4A, AAC, FLAC y WEBM, hasta 50 MB por archivo. La decodificación depende del navegador. Los archivos permanecen en el navegador; no se envían al servidor.
- Insertar al inicio, al final o en una posición desde 0. Una selección múltiple conserva el orden original.
- Reproducir/pausar, navegar, cambiar volumen, buscar una posición y saltar ±10 segundos.
- Reproducción automática de la siguiente canción, repetir todas/una y aleatorio.
- Eliminar la actual selecciona siguiente o anterior; vaciar la cola libera recursos.
- Reordenar con botones o arrastrando filas; filtrar por título/artista y ver duración total.
- Buscar canciones o videos musicales en YouTube Music y agregar resultados a la misma cola o escucharlos directamente. El video se reproduce con el reproductor oficial visible; hay enlace a YouTube Music cuando no permite inserción.
- Atajos: Espacio para reproducir/pausar; flechas izquierda/derecha para anterior/siguiente, fuera de controles de edición.

La cola vive en memoria y se vacía al cerrar o recargar. IndexedDB, lectura de etiquetas ID3 y sincronización con una cuenta de YouTube son mejoras opcionales pendientes. Título y artista pueden editarse antes de agregar un archivo; el título opcional solo aplica a selecciones de un archivo.

## Desarrollo desde VS Code

Abre la carpeta completa DeluxXx Sound o `DeluxXx Sound.code-workspace`. En la terminal situada en esa carpeta:

```powershell
npm run dev
```

Este comando inicia el backend con su Python de `.venv` y el frontend con Vite. Abre http://127.0.0.1:5173. Ctrl+C detiene los procesos que ese comando inició; los servicios de DeluxXx ya abiertos se reutilizan. Un puerto ocupado por otra aplicación produce un mensaje claro.

También puedes usar F5 con la configuración **DeluxXx: iniciar sistema**, o Ctrl+Shift+B para ejecutar la tarea de inicio. Si faltan dependencias, ejecuta `Instalar.cmd` primero. En PowerShell usa `npm.cmd run dev` si Windows bloquea el script `npm.ps1`.

Comandos desde la raíz: `npm run dev:frontend`, `npm run dev:backend`, `npm run build`, `npm test`, `npm start` (build de producción en puerto 8000). El backend separado también puede iniciarse desde `backend` con `.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000`.

## Despliegue

Se incluye Dockerfile de dos etapas: compila el frontend y sirve frontend/API desde Python en un único origen. No requiere Vite ni Node en ejecución en el servidor.

```powershell
docker build -t deluxxx-sound .
docker run --rm -p 8000:8000 deluxxx-sound
```

Abre http://localhost:8000. El proceso de producción respeta `PORT` (8000 por defecto) y `HOST` (0.0.0.0 por defecto en el contenedor). La comprobación de servicio es `/api/health`.

Sin Docker: instala `backend/requirements-lock.txt`, compila con `npm run build` y ejecuta `python -m app.serve` desde `backend`, usando el entorno Python correcto. El despliegue público todavía necesita elegir un proveedor y dominio. La imagen Docker no se ha compilado aquí porque Docker no está instalado.

## Pruebas y compilación

En `frontend`: `npm test` y `npm run build`.
En `backend`: `.\.venv\Scripts\python.exe -m pytest -q`.
Versiones reproducibles: `frontend/package-lock.json` y `backend/requirements-lock.txt`. Se usa el cargador nativo de configuración Vite para evitar resolución innecesaria de directorios superiores en Windows.

## Diseño técnico

- `frontend/src/core`: modelo discriminado LocalSong/YouTubeSong, lista genérica, Playlist y contrato PlayerPort. Sin DOM ni objetos del navegador en la lógica de datos.
- `frontend/src/players`: adaptadores de audio/YouTube y coordinador. Detiene las dos fuentes antes de cambiar; cancela cargas antiguas y filtra eventos de la fuente inactiva.
- `frontend/src/services`: lectura de archivos, ObjectURL y cliente del catálogo.
- `frontend/src/ui`: render y eventos accesibles. `toArray()` solo se llama para renderizar.
- `backend/app`: FastAPI, validación, búsqueda y metadatos. Llamadas síncronas ejecutadas por FastAPI en su pool de hilos; sesión independiente con timeout por petición.

`getNodeAt`, `addAt`, `removeAt` y `move` validan índices enteros. Los nodos ajenos/eliminados se rechazan. Mover reenlaza el mismo nodo y conserva el puntero actual. El adaptador del navegador libera cada URL de objeto al eliminar o vaciar; falla de metadatos también revoca la URL.

| Operación | Complejidad |
|---|---|
| Inicio/final | O(1) |
| Insertar por posición | O(n) |
| Eliminar nodo conocido | O(1) |
| Eliminar por id/posición | O(n) |
| Siguiente/anterior | O(1) |
| Filtrar, aleatorio, reordenar | O(n) |

`prev` permite retroceder en O(1). No se usan Array, Map ni Set para almacenar la cola. Arrays se usan para resultados externos, render y pruebas.

## Catálogo y límites

ytmusicapi es una biblioteca no oficial, no un servicio de streaming de audio. No se descargan canciones ni se extraen URLs de audio: reproducción remota mediante YouTube IFrame Player API. Algunos videos tienen restricciones regionales, de inserción o de autenticación. La aplicación muestra errores recuperables y el enlace al contenido. La carga local funciona sin el catálogo; YouTube y fuentes tipográficas requieren conexión.

La consulta usa `language="en"` internamente: durante la comprobación real, `language="es"` devolvió resultados vacíos. Esto no cambia el idioma de la interfaz. No se requieren credenciales para la búsqueda pública y no se modifica tu cuenta.

Fuentes: [ytmusicapi](https://github.com/sigma67/ytmusicapi), [documentación](https://ytmusicapi.readthedocs.io/), [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference).

La guía original se conserva en AGENTS.original.md. PLAN.md documenta las fases y criterios previstos; VALIDACION.md recoge los resultados verificados y las limitaciones.

El error 2 se distingue de las restricciones de inserción: el reproductor inicia con un videoId validado, carga y reproduce en una sola operación, activa el audio y recupera una vez una carga transitoria inválida. La prueba con «Ay Jalisco No Te Rajes» de La Hija del Mariachi reprodujo correctamente en el navegador integrado.

Cuando YouTube bloquea una grabación (errores 100/101/150), el reproductor busca automáticamente hasta ocho versiones compatibles de la misma canción y artista, sin cambiar la posición en la lista. Anuncia la alternativa solo cuando realmente comienza a reproducirse. Cambiar de canción cancela búsquedas pendientes. Si no hay una versión reproducible, puedes cargar un archivo de audio local.

### Compatibilidad con Brave y reproductores integrados
El reproductor usa el modo oficial de privacidad de YouTube (`youtube-nocookie.com`), mantiene visible el video y sus controles, envía el origen real y permite autoplay y encrypted-media en el iframe. La página establece Referrer-Policy: strict-origin-when-cross-origin tanto en desarrollo como en producción.
Si todas las canciones fallan únicamente en Brave, compara la misma dirección y canción en Edge/Chrome. Brave Shields o extensiones pueden bloquear scripts/recursos de terceros; esta aplicación no puede cambiar permisos del navegador. No es prueba de que el fallo sea igual en un teléfono. El código 150 por sí solo no identifica un fallo global del catálogo.
Después de actualizar: reinicia npm run dev y recarga con Ctrl+Shift+R. Las restricciones de inserción de canciones concretas permanecen vigentes.

## Despliegue en Vercel

El archivo `vercel.json` configura dos servicios en un solo proyecto: Vite en `frontend` y FastAPI en `backend`. Las rutas `/api/*` llegan al backend conservando el prefijo; el resto llega al frontend. No hace falta definir una URL de API en el navegador.

Importar el repositorio `johanstevenz1/DeluxXx-Sound` desde la raíz, sin seleccionar `frontend` como Root Directory. Vercel instala y compila cada servicio con su configuración. Tras desplegar, verificar `/api/health`, una búsqueda real y la reproducción de un video compatible. La publicación no está confirmada hasta superar estas comprobaciones.

La búsqueda pública no necesita credenciales de YouTube. Los archivos locales elegidos por cada usuario permanecen en su navegador. No subir `.env`, archivos de autenticación, `.venv` ni `node_modules` al repositorio.

Referencia: https://vercel.com/docs/services
