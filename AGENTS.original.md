# AGENTS.md — Taller Reproductor de Música (Listas Dobles)

> Guía paso a paso para que un agente (o un desarrollador) construya el proyecto completo.
> Léela entera antes de escribir código y sigue las fases en orden.

---

## 1. Objetivo

Crear una **aplicación web en TypeScript** que simule una **lista de reproducción de canciones** usando una **lista doblemente enlazada** (estructura de datos implementada a mano, **sin usar `Array` como estructura principal**).

### Requisitos del taller (obligatorios)

| # | Requisito | Dónde se resuelve |
|---|-----------|-------------------|
| R1 | Frontend con el que el usuario pueda interactuar | Fase 6 |
| R2 | Agregar canción **al inicio**, **al final** y **en cualquier posición** | Fase 2 y 6 |
| R3 | **Eliminar** una canción de la lista | Fase 2 y 6 |
| R4 | **Adelantar** canción (siguiente) | Fase 3 |
| R5 | **Retroceder** canción (anterior) | Fase 3 |
| R6 | Otras funcionalidades pertinentes | Fase 8 |
| R7 | **Subir archivos de audio** (MP3, WAV, OGG, M4A, etc.) | Fase 5 |

---

## 2. Stack y reglas

- **Lenguaje:** TypeScript con `strict: true`.
- **Bundler:** Vite (plantilla `vanilla-ts`). Sin frameworks (React/Vue) para que el foco sea la estructura de datos.
- **Estilos:** CSS plano (un solo archivo `style.css`).
- **Audio:** API nativa `HTMLAudioElement` + `URL.createObjectURL(file)`.
- **Persistencia (opcional, Fase 8):** IndexedDB (los `Blob` de audio no caben en `localStorage`).
- **Pruebas:** Vitest para la lista doble y el manejador de la playlist.

### Reglas para el agente

1. **No uses `Array`, `Set` ni `Map` para guardar la playlist.** Solo la lista doblemente enlazada. (`toArray()` solo se permite para *renderizar* la UI.)
2. La lógica de datos (`/core`) **no debe tocar el DOM**. El DOM vive solo en `/ui`.
3. Todo método público de la lista debe validar índices y lanzar `RangeError` si son inválidos.
4. Libera memoria: cada `URL.createObjectURL` debe tener su `URL.revokeObjectURL` al eliminar la canción.
5. Nada de `any`. Tipa todo.
6. Haz commits pequeños: uno por fase.

---

## 3. Estructura de carpetas

```
reproductor-musica/
├── AGENTS.md
├── index.html
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts                  # Punto de entrada: conecta core + ui
│   ├── style.css
│   ├── core/
│   │   ├── types.ts             # Interfaz Song
│   │   ├── DoublyLinkedList.ts  # Lista doble genérica
│   │   ├── Playlist.ts          # Lista + puntero a canción actual
│   │   └── AudioPlayer.ts       # Envoltorio de HTMLAudioElement
│   ├── services/
│   │   ├── fileLoader.ts        # Subida y lectura de archivos de audio
│   │   └── storage.ts           # IndexedDB (opcional)
│   └── ui/
│       ├── render.ts            # Pinta la lista y el reproductor
│       └── events.ts            # Eventos de botones y formularios
└── tests/
    ├── DoublyLinkedList.test.ts
    └── Playlist.test.ts
```

---

## 4. Paso a paso

### Fase 0 — Preparar el proyecto

```bash
npm create vite@latest reproductor-musica -- --template vanilla-ts
cd reproductor-musica
npm install
npm install -D vitest
```

En `tsconfig.json` verifica `"strict": true`. Agrega en `package.json`: `"test": "vitest"`.

---

### Fase 1 — Modelo de datos (`core/types.ts`)

```ts
export interface Song {
  id: string;          // crypto.randomUUID()
  title: string;
  artist: string;
  duration: number;    // segundos
  src: string;         // URL de objeto (blob:) o URL remota
  file?: File;         // archivo original si fue subido
}
```

---

### Fase 2 — Lista doblemente enlazada (`core/DoublyLinkedList.ts`)

**Concepto:** cada nodo guarda su valor y dos punteros: `prev` (anterior) y `next` (siguiente). La lista guarda `head`, `tail` y `size`.

```ts
export class DNode<T> {
  constructor(
    public value: T,
    public prev: DNode<T> | null = null,
    public next: DNode<T> | null = null,
  ) {}
}

export class DoublyLinkedList<T> {
  head: DNode<T> | null = null;
  tail: DNode<T> | null = null;
  size = 0;

  /** Agregar al INICIO — O(1) */
  addFirst(value: T): DNode<T> {
    const node = new DNode(value, null, this.head);
    if (this.head) this.head.prev = node;
    else this.tail = node;
    this.head = node;
    this.size++;
    return node;
  }

  /** Agregar al FINAL — O(1) */
  addLast(value: T): DNode<T> {
    const node = new DNode(value, this.tail, null);
    if (this.tail) this.tail.next = node;
    else this.head = node;
    this.tail = node;
    this.size++;
    return node;
  }

  /** Agregar en CUALQUIER POSICIÓN (0..size) — O(n) */
  addAt(index: number, value: T): DNode<T> {
    if (index < 0 || index > this.size) throw new RangeError("Índice fuera de rango");
    if (index === 0) return this.addFirst(value);
    if (index === this.size) return this.addLast(value);

    const next = this.getNodeAt(index)!;
    const prev = next.prev!;
    const node = new DNode(value, prev, next);
    prev.next = node;
    next.prev = node;
    this.size++;
    return node;
  }

  /** Eliminar un nodo concreto — O(1) si ya se tiene el nodo */
  removeNode(node: DNode<T>): T {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    node.prev = node.next = null;
    this.size--;
    return node.value;
  }

  /** Eliminar por posición — O(n) */
  removeAt(index: number): T {
    const node = this.getNodeAt(index);
    if (!node) throw new RangeError("Índice fuera de rango");
    return this.removeNode(node);
  }

  /** Obtener nodo por posición. Recorre desde el extremo más cercano. */
  getNodeAt(index: number): DNode<T> | null {
    if (index < 0 || index >= this.size) return null;
    let current: DNode<T>;
    if (index <= this.size / 2) {
      current = this.head!;
      for (let i = 0; i < index; i++) current = current.next!;
    } else {
      current = this.tail!;
      for (let i = this.size - 1; i > index; i--) current = current.prev!;
    }
    return current;
  }

  indexOf(predicate: (value: T) => boolean): number {
    let current = this.head;
    let i = 0;
    while (current) {
      if (predicate(current.value)) return i;
      current = current.next;
      i++;
    }
    return -1;
  }

  /** Solo para renderizar la UI */
  toArray(): T[] {
    const out: T[] = [];
    let current = this.head;
    while (current) {
      out.push(current.value);
      current = current.next;
    }
    return out;
  }

  clear(): void {
    this.head = this.tail = null;
    this.size = 0;
  }
}
```

**Pruebas mínimas (`tests/DoublyLinkedList.test.ts`):**
- Lista vacía: `head` y `tail` son `null`.
- `addFirst` / `addLast` en lista vacía dejan `head === tail`.
- `addAt` en el medio conecta bien `prev` y `next` en ambos sentidos.
- `removeAt` del primero, del último y de uno intermedio.
- Índices inválidos lanzan `RangeError`.
- Recorrer de `head` a `tail` y de `tail` a `head` da el mismo contenido invertido.

---

### Fase 3 — Playlist con canción actual (`core/Playlist.ts`)

La playlist envuelve la lista y mantiene un puntero `current` (el nodo que está sonando).

```ts
import { DoublyLinkedList, DNode } from "./DoublyLinkedList";
import type { Song } from "./types";

export type RepeatMode = "off" | "all" | "one";

export class Playlist {
  private list = new DoublyLinkedList<Song>();
  private current: DNode<Song> | null = null;
  repeat: RepeatMode = "off";

  // ---- Agregar (R2) ----
  addFirst(song: Song) { this.setCurrentIfEmpty(this.list.addFirst(song)); }
  addLast(song: Song)  { this.setCurrentIfEmpty(this.list.addLast(song)); }
  addAt(index: number, song: Song) { this.setCurrentIfEmpty(this.list.addAt(index, song)); }

  // ---- Eliminar (R3) ----
  remove(id: string): Song | null {
    const index = this.list.indexOf(s => s.id === id);
    if (index === -1) return null;
    const node = this.list.getNodeAt(index)!;

    // Si se borra la que suena, mover el puntero antes de desenlazar
    if (this.current === node) this.current = node.next ?? node.prev;

    const song = this.list.removeNode(node);
    if (song.file) URL.revokeObjectURL(song.src); // liberar memoria
    return song;
  }

  // ---- Adelantar (R4) ----
  next(): Song | null {
    if (!this.current) return null;
    if (this.repeat === "one") return this.current.value;
    if (this.current.next) this.current = this.current.next;
    else if (this.repeat === "all") this.current = this.list.head; // circular
    else return null; // fin de la lista
    return this.current.value;
  }

  // ---- Retroceder (R5) ----
  prev(): Song | null {
    if (!this.current) return null;
    if (this.current.prev) this.current = this.current.prev;
    else if (this.repeat === "all") this.current = this.list.tail; // circular
    else return null; // ya estamos en la primera
    return this.current.value;
  }

  // ---- Reproducir una canción específica ----
  playById(id: string): Song | null {
    let node = this.list.head;
    while (node) {
      if (node.value.id === id) { this.current = node; return node.value; }
      node = node.next;
    }
    return null;
  }

  getCurrent(): Song | null { return this.current?.value ?? null; }
  toArray(): Song[] { return this.list.toArray(); }
  get size(): number { return this.list.size; }

  private setCurrentIfEmpty(node: DNode<Song>) {
    if (!this.current) this.current = node;
  }
}
```

**Casos borde que el agente debe probar:**
- Eliminar la canción actual cuando es la única → `current = null`.
- Eliminar la canción actual cuando es la última → `current` pasa a la anterior.
- `next()` en la última sin repetir → devuelve `null`, no rompe.
- `prev()` en la primera sin repetir → devuelve `null`.
- Agregar al inicio con una canción sonando **no** debe cambiar `current`.

---

### Fase 4 — Reproductor de audio (`core/AudioPlayer.ts`)

Envuelve `HTMLAudioElement` para que la UI no lo toque directamente.

Métodos mínimos: `load(song)`, `play()`, `pause()`, `toggle()`, `seek(seconds)`, `setVolume(0..1)`, `skip(deltaSeconds)` y eventos `onTimeUpdate`, `onEnded`.

Al disparar `ended` → llamar a `playlist.next()` y reproducir el resultado (reproducción automática de la siguiente).

> Nota: los navegadores bloquean `play()` hasta que haya una interacción del usuario. Llama a `play()` siempre desde un manejador de clic.

---

### Fase 5 — Subir canciones MP3 y otros audios (`services/fileLoader.ts`)

**Requisito R7.** Formatos aceptados: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`, `.webm`.

```ts
import type { Song } from "../core/types";

const ACCEPTED = /^audio\//;

export async function fileToSong(file: File): Promise<Song> {
  if (!ACCEPTED.test(file.type)) {
    throw new Error(`"${file.name}" no es un archivo de audio válido`);
  }
  const src = URL.createObjectURL(file);
  const duration = await readDuration(src);
  return {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^/.]+$/, ""), // quita la extensión
    artist: "Desconocido",
    duration,
    src,
    file,
  };
}

function readDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(0);
    audio.src = src;
  });
}
```

**En el HTML:**

```html
<input id="file-input" type="file" accept="audio/*" multiple />
```

**Flujo en la UI:**
1. El usuario elige uno o varios archivos (o los arrastra a una zona *drop*).
2. Por cada archivo → `fileToSong(file)`.
3. El usuario decide **dónde** insertarlo con un selector: *Al inicio / Al final / En la posición N*.
4. Se llama a `playlist.addFirst | addLast | addAt`.
5. Se re-renderiza la lista.

Validaciones: rechazar archivos que no sean audio, mostrar un mensaje de error claro (no `alert`, usa un aviso en pantalla), y limitar el tamaño si se desea (p. ej. 50 MB).

---

### Fase 6 — Interfaz de usuario (R1)

Pantalla dividida en 3 zonas:

**A. Panel del reproductor (arriba)**
- Título y artista de la canción actual.
- Barra de progreso (`<input type="range">`) con tiempo actual / duración.
- Botones: ⏮ Retroceder · ▶/⏸ Play-Pausa · ⏭ Adelantar.
- Control de volumen.
- Botones de modo: 🔁 Repetir (off / all / one) y 🔀 Aleatorio.

**B. Panel de agregar canciones (lateral)**
- Input de archivo (MP3/audio).
- Campos opcionales: título y artista.
- Selector de posición: *Inicio · Final · Posición N* (con input numérico visible solo si se elige "Posición N", validado entre `0` y `size`).
- Botón **Agregar**.

**C. Lista de reproducción (centro)**
- Cada fila: número, título, artista, duración, botón 🗑 **Eliminar**, botón ▶ para reproducir esa canción.
- Resaltar la fila de la canción actual.
- Estado vacío: "Tu lista está vacía. Sube una canción para empezar."

**Reglas de la UI**
- Después de cada operación sobre la lista se llama a `render()`, que repinta desde `playlist.toArray()`.
- Los botones se deshabilitan cuando no aplican (ej. Retroceder en la primera canción sin repetición).
- Diseño responsivo (que funcione en móvil).
- Accesible: `aria-label` en botones de iconos y navegación con teclado.

---

### Fase 7 — Conectar todo (`main.ts`)

1. Crear instancias: `Playlist`, `AudioPlayer`.
2. Registrar eventos de la UI (`ui/events.ts`).
3. Escuchar `audio.ended` → `next()` automático.
4. Llamar a `render()` al iniciar.
5. Probar el flujo completo manualmente (ver checklist de la sección 6).

---

### Fase 8 — Funcionalidades extra (R6)

Implementar en este orden de prioridad:

1. **Modo repetir** (`off | all | one`) — ya soportado por `Playlist`.
2. **Modo aleatorio (shuffle)** — elegir un nodo al azar recorriendo la lista hasta un índice aleatorio.
3. **Saltar ±10 segundos** dentro de la canción actual (adelantar/retroceder tiempo).
4. **Mover canción** de posición (subir/bajar) reenlazando nodos, sin recrearlos.
5. **Reordenar con arrastrar y soltar** (drag & drop).
6. **Buscar** canciones por título o artista (recorrido de la lista).
7. **Contador y duración total** de la playlist.
8. **Persistencia** con IndexedDB: guardar `Song` + `Blob` y reconstruir la lista al abrir la app.
9. **Leer metadatos ID3** (título, artista, carátula) con una librería como `music-metadata-browser`.
10. **Atajos de teclado**: `Espacio` play/pausa, `←`/`→` anterior/siguiente.
11. **Tema claro/oscuro**.

---

### Fase 9 — Pruebas y entrega

```bash
npm run test      # pruebas de la lista y la playlist
npm run build     # compilación de producción
npm run preview   # verificar el build
```

Entrega recomendada: repositorio en GitHub con un `README.md` que incluya capturas de pantalla, instrucciones de instalación y una breve explicación de por qué se usó una lista doblemente enlazada.

---

## 5. Complejidad esperada (incluir en el README)

| Operación | Complejidad |
|-----------|-------------|
| Agregar al inicio / final | O(1) |
| Agregar en posición N | O(n) |
| Eliminar un nodo conocido | O(1) |
| Eliminar por posición | O(n) |
| Siguiente / anterior | O(1) |
| Buscar | O(n) |

**Por qué lista doble y no simple:** el puntero `prev` permite **retroceder en O(1)** y eliminar un nodo sin recorrer la lista desde el inicio.

---

## 6. Checklist de aceptación

Marca todo antes de dar el proyecto por terminado:

- [ ] El proyecto compila sin errores con `strict: true`.
- [ ] La playlist usa una lista doblemente enlazada propia (sin `Array` como almacén).
- [ ] Se puede **subir** un MP3 y reproducirlo.
- [ ] Se puede subir otro formato de audio (WAV, OGG, M4A…).
- [ ] Se puede agregar al **inicio**, al **final** y en **cualquier posición**.
- [ ] Posición inválida muestra un error y no rompe la app.
- [ ] Se puede **eliminar** una canción (primera, intermedia, última y la que está sonando).
- [ ] **Adelantar** pasa a la siguiente canción.
- [ ] **Retroceder** pasa a la anterior.
- [ ] Al terminar una canción, suena la siguiente automáticamente.
- [ ] Con la lista vacía, ningún botón lanza errores.
- [ ] Se liberan los `ObjectURL` al eliminar canciones.
- [ ] Al menos 3 funcionalidades extra implementadas.
- [ ] Pruebas unitarias pasan (`npm run test`).
- [ ] La interfaz funciona en escritorio y móvil.

---

## 7. Errores comunes a evitar

- **Olvidar actualizar `tail`** al eliminar el último nodo (o `head` al eliminar el primero).
- **Perder el puntero `current`** al eliminar la canción que está sonando.
- **Reproducir sin interacción del usuario** (el navegador lo bloquea).
- **Guardar `Blob` en `localStorage`** (no cabe; usar IndexedDB).
- **Mezclar lógica de datos con DOM**, lo que impide probar la lista.
- **No validar `addAt(index)`** cuando `index > size`.