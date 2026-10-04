import { describe, it, expect, vi } from 'vitest';
import { Playlist } from '../src/core/Playlist';
import type { Song } from '../src/core/types';
const song = (id: string): Song => ({ id, title: id, artist: 'Artista', duration: 60, source: 'youtube', videoId: 'abcdefghijk' });
describe('Playlist', () => {
  it('cola vacía y extremos no rompen el puntero', () => {
    const p = new Playlist(); expect(p.next()).toBeNull(); expect(p.prev()).toBeNull();
    p.addLast(song('a')); expect(p.next()).toBeNull(); expect(p.prev()).toBeNull(); expect(p.getCurrent()?.id).toBe('a');
  });
  it('agregar al inicio y mover conservan la actual', () => {
    const p = new Playlist(); p.addLast(song('a')); p.addFirst(song('b')); p.move('a', 0);
    expect(p.getCurrent()?.id).toBe('a'); expect([...p].map(s => s.id)).toEqual(['a', 'b']);
  });
  it('eliminar la actual usa siguiente, anterior y null', () => {
    const release = vi.fn(), p = new Playlist(release); for (const id of ['a','b','c']) p.addLast(song(id));
    p.remove('a'); expect(p.getCurrent()?.id).toBe('b'); p.playById('c'); p.remove('c'); expect(p.getCurrent()?.id).toBe('b');
    p.remove('b'); expect(p.getCurrent()).toBeNull(); expect(p.size).toBe(0); expect(release).toHaveBeenCalledTimes(3);
  });
  it('repetir una solo afecta final automático; repetir todas une extremos', () => {
    const p = new Playlist(); p.addLast(song('a')); p.addLast(song('b')); p.repeat = 'one';
    expect(p.next(true)?.id).toBe('a'); expect(p.next()?.id).toBe('b'); p.repeat = 'all';
    expect(p.next()?.id).toBe('a'); expect(p.prev()?.id).toBe('b');
  });
  it('aleatorio recorre nodos y evita repetir la actual con más de una canción', () => {
    const p = new Playlist(() => {}, () => 0); p.addLast(song('a')); p.addLast(song('b')); p.shuffle = true;
    expect(p.next()?.id).toBe('b'); expect(p.next()?.id).toBe('a');
  });
  it('vaciar libera recursos una vez y resetea la actual', () => {
    const release = vi.fn(), p = new Playlist(release); p.addLast(song('a')); p.addLast(song('b'));
    p.clear(); p.clear(); expect(release).toHaveBeenCalledTimes(2); expect(p.getCurrent()).toBeNull();
  });
});

it('favoritas conservan orden y canción actual', () => {
  const p = new Playlist(); p.addLast(song('a')); p.addLast(song('b'));
  expect(p.toggleFavorite('b')).toBe(true); expect(p.getCurrent()?.id).toBe('a');
  expect([...p].map(s => s.id)).toEqual(['a','b']); expect(p.toggleFavorite('b')).toBe(false);
  expect(() => p.toggleFavorite('missing')).toThrow();
});
