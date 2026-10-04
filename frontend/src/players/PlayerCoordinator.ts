import type { PlayerPort } from '../core/PlayerPort';
import type { Song } from '../core/types';
export class PlayerCoordinator {
  private active: PlayerPort | null = null;
  private generation = 0;
  private volume = 0.8;
  private loadedId: string | null = null;
  private selectedId: string | null = null;
  loading = false;
  error: string | null = null;
  onEnded = (): void => {};
  onChange = (): void => {};
  onError = (_message: string): void => {};
  constructor(private local: PlayerPort, private youtube: PlayerPort) {
    for (const port of [local, youtube]) {
      port.onEnded = () => { if (this.active === port) this.onEnded(); };
      port.onChange = () => { if (this.active === port) { if (port.playing) { this.loadedId = this.selectedId; this.error = null; } this.onChange(); } };
      port.onError = message => { if (this.active === port) { port.pause(); this.loadedId = null; this.error = message; this.onError(message); this.onChange(); } };
    }
  }
  async load(song: Song, autoplay = false): Promise<void> {
    this.stop();
    const generation = this.generation;
    const port = song.source === 'local' ? this.local : this.youtube;
    this.active = port;
    this.selectedId = song.id;
    this.loading = true;
    this.onChange();
    try {
      await port.load(song);
      if (generation !== this.generation) return;
      this.loadedId = song.id;
      port.setVolume(this.volume);
      if (autoplay) await port.play();
    } catch (error) {
      if (generation === this.generation) {
        this.loadedId = null;
        this.error = error instanceof Error ? error.message : 'No se pudo reproducir la canción.';
        this.onError(this.error);
      }
    } finally {
      if (generation === this.generation) { this.loading = false; this.onChange(); }
    }
  }
  async toggle(song: Song): Promise<void> {
    if (this.loadedId !== song.id) { await this.load(song, true); return; }
    if (this.playing) this.pause();
    else {
      try { await this.active?.play(); } catch { this.onError('No se pudo iniciar el audio. Pulsa reproducir de nuevo o prueba otra canción.'); }
    }
    this.onChange();
  }
  pause(): void { this.active?.pause(); this.onChange(); }
  stop(): void {
    this.generation++;
    this.error = null;
    this.active = null;
    this.selectedId = null;
    this.local.stop();
    this.youtube.stop();
    this.loadedId = null;
    this.loading = false;
    this.onChange();
  }
  seek(seconds: number): void { this.active?.seek(seconds); this.onChange(); }
  skip(seconds: number): void { this.seek(this.time + seconds); }
  setVolume(volume: number): void { this.volume = Math.max(0, Math.min(1, volume)); this.active?.setVolume(this.volume); }
  get ready(): boolean { return this.loadedId !== null && this.active !== null && !this.loading; }
  get time(): number { return this.active?.time ?? 0; }
  get duration(): number { return this.active?.duration ?? 0; }
  get playing(): boolean { return this.active?.playing ?? false; }
}
