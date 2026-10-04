import type { LocalSong, Song } from '../core/types';
const extensions = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i;
export async function fileToSong(file: File): Promise<LocalSong> {
  if ((!file.type.startsWith('audio/') && !(file.type === '' && extensions.test(file.name))) || !extensions.test(file.name)) {
    throw new Error(`«${file.name}» no es un audio compatible. Usa MP3, WAV, OGG, M4A, AAC, FLAC o WEBM.`);
  }
  if (file.size > 50 * 1024 * 1024) throw new Error(`«${file.name}» supera el límite de 50 MB.`);
  const src = URL.createObjectURL(file);
  try {
    const duration = await readDuration(src);
    return { id: crypto.randomUUID(), source: 'local', title: file.name.replace(/\.[^.]+$/, ''), artist: 'Archivo local', duration, src, file };
  } catch (error) { URL.revokeObjectURL(src); throw error; }
}
function readDuration(src: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const cleanup = (): void => { clearTimeout(timer); audio.onloadedmetadata = null; audio.onerror = null; audio.removeAttribute('src'); audio.load(); };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error('No se pudieron leer los metadatos del archivo.')); }, 12000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { const duration = Number.isFinite(audio.duration) ? audio.duration : null; cleanup(); resolve(duration); };
    audio.onerror = () => { cleanup(); reject(new Error('El archivo está dañado o su formato no es compatible con este navegador.')); };
    audio.src = src;
  });
}
export function releaseSong(song: Song): void { if (song.source === 'local') URL.revokeObjectURL(song.src); }
