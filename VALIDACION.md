# Validación de DeluxXx Sound

## Verificado
- Compilación TypeScript estricta y build Vite de producción.
- 29 pruebas frontend: enlaces en ambos sentidos, extremos, índices inválidos, nodos ajenos/eliminados, reordenamiento, puntero actual, repetir/aleatorio, limpieza de ObjectURL y cancelación de cargas entre fuentes, favoritas sin alterar el puntero, inicialización con ID válido, reproducción/unmute, recuperación acotada del error 2 y eventos tardíos.
- 8 pruebas backend: metadatos, límites, consultas, tipos de búsqueda, identificadores, errores externos y timeout.
- Auditoría npm: 0 vulnerabilidades conocidas en las dependencias instaladas.
- Navegador: carga y reproducción de MP3 y WAV generados para pruebas; avance automático MP3 → WAV y fin de cola.
- Navegador: inserción en posición intermedia, cambio de orden y eliminación de la actual con reproducción de la siguiente.
- Navegador: eliminar la única canción deja el reproductor vacío y deshabilita los controles correspondientes.
- Navegador: rechazo de archivo de texto con mensaje en pantalla.
- Búsqueda real de canciones y videos musicales en YouTube Music; adición del resultado a la lista.
- Interfaz inspeccionada en escritorio y móvil de 390 × 844; sin elementos que desborden horizontalmente.
- Inicio mediante launcher.py: servidor local levantado y URL de apertura verificada, sin abrir otra ventana durante esa comprobación.

## Límites observados
- Las pruebas anteriores con Yellow y Never Gonna Give You Up recibieron error 150. El propietario puede bloquear la inserción de contenidos específicos; no equivale al error 2 corregido. La disponibilidad depende de YouTube, del contenido y del navegador.
- La cola se almacena en memoria; recargar o cerrar la pestaña la vacía. Persistencia IndexedDB e ID3 quedan como mejoras opcionales.
- El script de detener valida que el proceso pertenece a esta carpeta. No se ejecutó su parada durante la prueba: el entorno de esta sesión bloquea la consulta del inventario de procesos de Windows.
- Pytest informa una advertencia de deprecación de Starlette sobre su adaptador httpx; las ocho pruebas pasan.

Los archivos de audio de prueba permanecen fuera del proyecto, en el directorio de trabajo de la sesión. No se agregaron canciones de demostración a la lista del usuario.

## Actualización de interfaz y reproducción — 4 de octubre de 2026
- Pantalla completa inspirada en la referencia: menú, vinilo, reproductor, búsqueda y seis colecciones funcionales; colores azul oscuro y vinotinto.
- Prueba remota real con Ay Jalisco No Te Rajes, La Hija del Mariachi, videoId VskJsNnVPq0: reproducción activa y avance de 0:12 a 0:18 y 0:57; controles nativos mostraron Silenciar (audio activado), sin errores en consola.
- Marcado como favorita y navegación a Favoritas mostrando la canción correcta.
- Carga mediante el panel modal de dos archivos de prueba, reproducción MP3 y avance automático a Segunda WAV hasta 0:05; fin de cola correcto.
- Inspección de escritorio 1586 × 992 y 1280 × 720, y móvil 390 × 844. Sin desbordamiento horizontal; ajustes disponibles también desde la barra móvil.
- 29 pruebas frontend y 8 backend pasan; build de producción actualizado.

- Tema claro/oscuro: botón superior verificado en escritorio y móvil; alternancia correcta, paneles adaptados, preferencia conservada tras recargar, sin desbordamiento horizontal a 390 px. Compilación estricta y build pasan.

## Recuperación de contenido bloqueado — 4 de octubre de 2026
- Ante errores 100, 101 o 150, búsqueda automática de la misma canción/artista y hasta tres alternativas; descarta otra interpretación, karaoke, remixes y duración incompatible.
- Prueba real: Por Amarte Así, Natanael Cano; original u8vLc0JlK9s bloqueado y alternativa j3BJIvjHmEY en reproducción. Tiempo 0:04 → 0:16, audio sin silenciar; pausa y reanudación verificadas.
- Pruebas frontend: 32 pasan, incluyendo selección de alternativas, agotamiento de intentos y cancelación de respuestas tardías. Build de producción pasa. El backend no cambió (8 pruebas existentes).
- La recuperación no elimina restricciones de YouTube. Si todas las versiones compatibles están bloqueadas, se muestra una explicación y la opción de cargar audio local.

## Recuperación aislada por versión — 4 de octubre de 2026
- Reproductor nuevo por canción/alternativa: destroy del anterior, nueva instancia y eventos ligados a su generación. Errores repetidos de la misma instancia y eventos de instancias anteriores no consumen alternativas.
- Hasta ocho alternativas, priorización de letra/audio, búsqueda por título sin créditos feat y artista principal; consulta adicional con letra. Se rechazan type beats, karaoke, covers, remixes y villancicos no solicitados.
- 35 pruebas frontend pasan; build TypeScript/Vite actualizado.
- Antes de la corrección se reprodujo el fallo de agotamiento con Hasta Que Me Olvides. Después reprodujo la versión en vivo de Luis Miguel uqqKl9YuUHA y avanzó a 0:15.
- Cambio a Por Amarte Así, Natanael Cano: alternativa j3BJIvjHmEY reprodujo y avanzó a 0:08.
- Chococono: se rechazó una coincidencia incorrecta type beat; prueba final con versión CHOCOCONO - Kris R, fHtjdOxoSL0, duración 3:36, reproducción activa y control nativo Silenciar.
- No se garantiza que todos los contenidos permitan reproducción: las restricciones específicas siguen dependiendo de YouTube. El bloqueo del historial Git de este entorno impidió registrar el commit; los archivos y el build están guardados.

## Arranque en VS Code y continuidad — 4 de octubre de 2026
- Reproducido npm run dev en la raíz: ENOENT por falta de package.json. Añadidos comandos raíz y scripts/dev.mjs; usa el Python del entorno virtual, inicia backend y Vite, comprueba salud y detecta puertos ocupados sin detener aplicaciones ajenas.
- Configuración VS Code: F5, tarea de arranque y compilación estricta, intérprete Python y archivo code-workspace.
- Verificado npm run dev en la raíz (8000/5173) y arranque aislado desde cero (8001/5174) con --check, salud 200 y salida 0. La comprobación detuvo sus procesos hijos.
- Cancelación de cargas pendientes y protección de promesas/eventos de instancias anteriores. Los errores anteriores a onReady se procesan al estar listo; cada intento conserva su propio controlador de cancelación.
- 37 pruebas frontend y 8 backend pasan; TypeScript estricto y build de producción pasan.
- Prueba continua en 5173: Por Amarte Así/Natanael Cano avanzó a 0:47; Ay Jalisco No Te Rajes/La Hija del Mariachi reprodujo. Chococono agotó siete versiones bloqueadas. Canción anterior recuperó Ay Jalisco y avanzó a 0:15; después Hasta Que Me Olvides/Luis Miguel reprodujo alternativa Z2wmhVDudgE y avanzó a 0:18. Un bloqueo de contenido ya no impide escuchar otra canción.
- Dockerfile, .dockerignore y app.serve preparan frontend/API en el mismo origen y puerto PORT. La imagen Docker no se construyó: Docker no está instalado en este equipo. No se realizó despliegue público.
- YouTube puede restringir canciones concretas; no se garantiza reproducción integrada de todo el catálogo. No se eliminan las restricciones del propietario.

## Identificación del iframe y compatibilidad con Brave — 4 de octubre de 2026
- Usuario reporta todas las canciones fallando en Brave. No hay conexión de automatización a Brave en este equipo; el bloqueo global en ese navegador aún no se pudo reproducir ni confirmar como resuelto.
- Antes del cambio, una canción de control VskJsNnVPq0 reprodujo 25 segundos en el navegador disponible. No se atribuye el bloqueo de todas las canciones a sus propietarios: el aviso ahora diferencia la posibilidad de un bloqueo del navegador/sesión.
- Iframe explícito en youtube-nocookie.com (modo oficial de privacidad), con origin real, enablejsapi, widget_referrer, Referrer-Policy configurada antes de la navegación y permisos autoplay/encrypted-media/fullscreen/picture-in-picture. Referrer-Policy también en HTML, Vite y FastAPI.
- Detectado durante recuperación: getPlayerState no existe antes de onReady; el render podía lanzar TypeError mientras preparaba una alternativa. Se protegen estado, tiempo, duración y seek hasta inicialización confirmada; prueba de regresión incluida.
- 39 pruebas frontend y 9 backend pasan; build estricto actualizado. Advertencia existente de deprecación de Starlette/httpx.
- Prueba real final: Por Amarte Así/Natanael Cano recuperó j3BJIvjHmEY en youtube-nocookie.com y avanzó a 0:23. Cambio a Ay Jalisco No Te Rajes/VskJsNnVPq0 reprodujo, botón Pausar, Silenciar nativo y avance 0:01. Los cuatro TypeError de la consola pertenecen a la prueba anterior al arreglo (18:52:43–18:52:44 UTC); no se repitieron después de recargar la versión corregida.
- No se cambió la configuración de Brave. Sus filtros pueden bloquear recursos externos; requiere comprobar la versión actualizada en el navegador del usuario. No se garantiza disponibilidad de contenido que YouTube restringe.
- Fuentes: https://developers.google.com/youtube/iframe_api_reference ; https://developers.google.com/youtube/terms/required-minimum-functionality ; https://support.google.com/youtube/answer/171780 ; https://support.brave.com/hc/en-us/articles/360023646212-How-do-I-configure-global-and-site-specific-Shields-settings

## Reproducción de casos reportados y codificación — 4 de octubre de 2026
- Corregida doble codificación Windows-1252/UTF-8 de YouTubePlayer.ts y nombres de pruebas. No quedan secuencias de mojibake en los archivos afectados; prueba de tildes incluida.
- Eliminado retorno anticipado cuando la primera consulta tenía ocho coincidencias. Se consultan siempre videos y letra antes de ordenar y limitar; resultados parciales se conservan si una consulta falla y cancelación descarta resultados. Tres pruebas nuevas cubren esos casos.
- Reproducido YOKO/Alvaro Diaz (jOXSgG5YI08): original y ocho alternativas reciben 150 en la aplicación, aun después de corregir la búsqueda. Libre/Nino Bravo (TQkAIx4YjSo) también agota ocho alternativas. Estos casos siguen sin reproducción integrada; no se marcan como resueltos.
- Página independiente diagnostico-youtube.html: iframe oficial estándar sin cola/alternativas devuelve 150 para jOXSgG5YI08. En el mismo origen y configuración, VskJsNnVPq0 reproduce con audio activado. El original YOKO sí inicia en youtube.com/watch. Evidencia de que cambiar de navegador o el estado de la cola no habilita por sí solo ese contenido restringido en iframe.
- El aviso ya no recomienda Edge cuando el usuario está en Edge; el estado del reproductor deja de anunciar Todo listo tras un error. La página de diagnóstico permite repetir la comparación en el navegador del usuario y también se incluye en el build.
- Para garantizar música completa integrada se necesita una fuente de audio con permisos de reproducción; ytmusicapi no otorga esos permisos ni entrega streams autorizados. No se cambió a una extracción o descarga del contenido.
