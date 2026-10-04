import type { CatalogSong } from '../core/types';
export async function searchCatalog(query: string, signal: AbortSignal, kind: string = 'songs'): Promise<CatalogSong[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&kind=${encodeURIComponent(kind)}`, { signal });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const detail = error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string' ? error.detail : 'No se pudo consultar el catálogo. Comprueba que el servidor esté iniciado.';
    throw new Error(detail);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('El catálogo devolvió una respuesta inesperada.');
  return data.filter((value: unknown): value is CatalogSong => {
    if (!value || typeof value !== 'object') return false;
    const song = value as Partial<CatalogSong>;
    return typeof song.videoId === 'string' && /^[\w-]{11}$/.test(song.videoId) && typeof song.title === 'string' && typeof song.artist === 'string' && (song.duration === null || (typeof song.duration === 'number' && Number.isFinite(song.duration))) && (song.artwork === undefined || typeof song.artwork === 'string');
  });
}
