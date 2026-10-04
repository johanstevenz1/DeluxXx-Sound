import type { CatalogSong } from '../core/types';
import { searchCatalog } from './catalogClient';
export const MAX_ALTERNATIVES = 8;
function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function overlap(expected: string, actual: string): number {
  const tokens = normalized(expected).split(' ').filter(token => token.length > 1);
  const value = ` ${normalized(actual)} `;
  return tokens.length ? tokens.filter(token => value.includes(` ${token} `)).length / tokens.length : 0;
}
function titleForMatch(title: string): string {
  return title.replace(/\s*[\[(](?:feat\.?|ft\.?|featuring|official|video oficial|audio oficial|remaster)[^\])]*[\])]/gi,'');
}
function artistMatches(song: CatalogSong,candidate: CatalogSong): boolean {
  const mainArtist = song.artist.split(',')[0];
  return overlap(mainArtist,candidate.artist) >= .8 || overlap(mainArtist,candidate.title) >= .8;
}
function score(song: CatalogSong,candidate: CatalogSong): number {
  const lyric = /\b(letra|lyrics|lyric|audio)\b/.test(normalized(candidate.title));
  return overlap(titleForMatch(song.title),candidate.title)+overlap(song.artist,candidate.artist)+(lyric ? 2 : 0);
}
export function rankAlternatives(song: CatalogSong, results: CatalogSong[]): CatalogSong[] {
  return results.filter((candidate,index) => candidate.videoId !== song.videoId &&
    results.findIndex(other => other.videoId === candidate.videoId) === index &&
    overlap(titleForMatch(song.title),candidate.title) >= .8 &&
    artistMatches(song,candidate) &&
    !/\b(karaoke|cover|instrumental|remix|reaction|tutorial|villancico|beat|beats|acapella|slowed)\b/.test(normalized(candidate.title).replace(normalized(song.title),'')) &&
    (!song.duration || !candidate.duration || Math.abs(song.duration-candidate.duration) <= Math.max(35,song.duration*.25))
  ).sort((a,b) => score(song,b)-score(song,a)).slice(0,MAX_ALTERNATIVES);
}
export async function findPlaybackAlternatives(song: CatalogSong, signal: AbortSignal): Promise<CatalogSong[]> {
  const query = `${titleForMatch(song.title)} ${song.artist.split(',')[0]}`.slice(0,140);
  // Ocho coincidencias no equivalen a ocho versiones insertables. Consultar letra
  // siempre, antes de limitar los intentos, incluso cuando la búsqueda general llena el cupo.
  const searches = await Promise.allSettled([
    searchCatalog(query,signal,'videos'),
    searchCatalog(`${query} letra`,signal,'videos'),
  ]);
  if (signal.aborted) throw new DOMException('Búsqueda cancelada','AbortError');
  const results: CatalogSong[] = [];
  for (const search of searches) if (search.status === 'fulfilled') results.push(...search.value);
  if (searches.every(search => search.status === 'rejected')) throw new Error('No se pudo buscar otra versión. Comprueba tu conexión.');
  if (rankAlternatives(song,results).length < MAX_ALTERNATIVES) {
    try { results.push(...await searchCatalog(query,signal,'songs')); }
    catch { if (signal.aborted) throw new DOMException('Búsqueda cancelada','AbortError'); }
  }
  return rankAlternatives(song,results);
}
