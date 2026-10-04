import type { PlayerPort } from '../core/PlayerPort';
import type { Song } from '../core/types';
export class LocalAudioPlayer implements PlayerPort {
  private audio = new Audio();
  onEnded = (): void => {};
  onChange = (): void => {};
  onError = (_message: string): void => {};
  constructor() {
    this.audio.preload = 'metadata';
    this.audio.addEventListener('ended', () => this.onEnded());
    for (const event of ['timeupdate','play','pause','loadedmetadata','durationchange']) this.audio.addEventListener(event, () => this.onChange());
    this.audio.addEventListener('error', () => {
      if (this.audio.getAttribute('src')) this.onError('El navegador no pudo reproducir este archivo. Prueba otro formato.');
    });
  }
  async load(song: Song): Promise<void> {
    if (song.source !== 'local') throw new Error('Fuente de audio incorrecta.');
    this.audio.src = song.src;
    this.audio.load();
  }
  async play(): Promise<void> { await this.audio.play(); }
  pause(): void { this.audio.pause(); }
  stop(): void { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); }
  seek(seconds: number): void {
    if (Number.isFinite(seconds) && this.duration > 0) this.audio.currentTime = Math.max(0, Math.min(this.duration, seconds));
  }
  setVolume(volume: number): void { this.audio.volume = Math.max(0, Math.min(1, volume)); }
  get time(): number { return this.audio.currentTime || 0; }
  get duration(): number { return Number.isFinite(this.audio.duration) ? this.audio.duration : 0; }
  get playing(): boolean { return !this.audio.paused && !this.audio.ended; }
}
