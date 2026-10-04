import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileToSong, releaseSong } from '../src/services/fileLoader';
class MetadataAudio {
  preload = '';
  duration = 12;
  onloadedmetadata: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) { queueMicrotask(() => this.onloadedmetadata?.()); }
  removeAttribute(): void {}
  load(): void {}
}
afterEach(() => vi.unstubAllGlobals());
function setup(audio: typeof MetadataAudio = MetadataAudio): { revoke: ReturnType<typeof vi.fn> } {
  const revoke = vi.fn();
  vi.stubGlobal('Audio', audio);
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: revoke });
  return { revoke };
}
describe('Archivos locales y memoria', () => {
  it('acepta MIME vacío con extensión válida y libera el objeto al eliminar', async () => {
    const { revoke } = setup(); const song = await fileToSong(new File(['audio'], 'tema.mp3'));
    expect(song.duration).toBe(12); expect(song.title).toBe('tema'); releaseSong(song); expect(revoke).toHaveBeenCalledWith('blob:test');
  });
  it('rechaza archivos ajenos y audio con extensión incompatible', async () => {
    setup(); await expect(fileToSong(new File(['text'], 'no.txt', { type: 'text/plain' }))).rejects.toThrow('compatible');
    await expect(fileToSong(new File(['audio'], 'no.exe', { type: 'audio/mpeg' }))).rejects.toThrow('compatible');
  });
  it('revoca ObjectURL si el navegador rechaza el audio', async () => {
    class BrokenAudio extends MetadataAudio { set src(_value: string) { queueMicrotask(() => this.onerror?.()); } }
    const { revoke } = setup(BrokenAudio);
    await expect(fileToSong(new File(['bad'], 'tema.wav', { type: 'audio/wav' }))).rejects.toThrow('dañado');
    expect(revoke).toHaveBeenCalledOnce();
  });
  it('limita archivos a 50 MB antes de crear una URL', async () => {
    const { revoke } = setup(); const file = new File([], 'huge.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', {value:51*1024*1024}); await expect(fileToSong(file)).rejects.toThrow('50 MB'); expect(revoke).not.toHaveBeenCalled();
  });
});
