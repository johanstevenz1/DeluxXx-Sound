# AGENTS.md — DeluxXx Sound

Lee PLAN.md y AGENTS.original.md completos antes de implementar. PLAN.md adapta la guía al proyecto con dos fuentes musicales y prevalece ante contradicciones técnicas de los ejemplos originales.

- Frontend Vite vanilla TypeScript, strict, sin any; un solo style.css.
- Playlist almacenada exclusivamente en lista doble propia; toArray solo para renderizar.
- core no toca DOM, HTMLAudioElement, iframe ni ObjectURL; inyectar callbacks de recursos.
- Validar índices enteros y pertenencia de nodos; lanzar RangeError para índices inválidos.
- Backend Python con FastAPI y ytmusicapi; secretos únicamente en servidor.
- Usar YouTube IFrame Player API para el contenido del catálogo; no asumir que ytmusicapi entrega audio reproducible.
- Cumplir fases, pruebas y aceptación de PLAN.md. Hacer commits pequeños por fase dentro de un repositorio propio.
- No marcar requisitos como cumplidos sin evidencia. Documentar limitaciones de formatos y contenido insertable.
