import type { Song, CatalogSong } from '../core/types';
import { MAX_ALTERNATIVES } from '../services/playbackAlternatives';
import type { PlayerPort } from '../core/PlayerPort';
export interface YTInstance {
  destroy(): void;
  cueVideoById(id: string): void;
  loadVideoById(id: string, seconds?: number): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  unMute(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
}
export interface YTOptions {
  videoId: string;
  width: string; height: string;
  playerVars: { origin: string; playsinline: number; controls: number; autoplay: number };
  events: {
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
    onError: (event: { data: number }) => void;
    onAutoplayBlocked: () => void;
  };
}
declare global {
  interface Window {
    YT?: { Player: new (target: string, options: YTOptions) => YTInstance };
    onYouTubeIframeAPIReady?: () => void;
  }
}
let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => { apiPromise = null; script.remove(); reject(new Error('YouTube no respondió. Comprueba tu conexión e intenta de nuevo.')); }, 15000);
    window.onYouTubeIframeAPIReady = () => { window.clearTimeout(timer); resolve(); };
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { window.clearTimeout(timer); apiPromise = null; script.remove(); reject(new Error('No se pudo conectar con YouTube.')); };
    document.head.append(script);
  });
  return apiPromise;
}
export function youtubeError(code: number): string {
  switch (code) {
    case 2: return 'YouTube rechazó el identificador o la carga de la canción. Pulsa reproducir para reintentar.';
    case 5: return 'YouTube no pudo decodificar el audio en este navegador. Intenta de nuevo.';
    case 100: return 'Esta canción fue retirada o es privada en YouTube.';
    case 101: case 150: return 'El propietario de esta canción no permite reproducción integrada. Prueba otra versión desde Explorar o ábrela en YouTube Music.';
    case 153: return 'YouTube no pudo identificar este navegador. Abre la aplicación en Edge o Chrome desde Iniciar DeluxXx Sound.cmd.';
    default: return `No se pudo iniciar YouTube (código ${code}). Intenta de nuevo.`;
  }
}
export class YouTubePlayer implements PlayerPort {
  private cancelReady: (() => void) | null = null;
  private deferredError: number | null = null;
  private instance = 0;
  private rejectedInstance = -1;
  private player: YTInstance | null = null;
  private ready: Promise<void> | null = null;
  private version = 0;
  private selected = false;
  private initialized = false;
  private videoId: string | null = null;
  private startsPending = true;
  private volume = 80;
  private recoveryAttempted = false;
  onEnded = (): void => {};
  onChange = (): void => {};
  onError = (_message: string): void => {};
  private song: CatalogSong | null = null;
  private alternatives: CatalogSong[] | null = null;
  private alternativeIndex = 0;
  private resolving = false;
  private resolverController: AbortController | null = null;
  private pendingAlternative: CatalogSong | null = null;
  onRecovery = (_message: string): void => {};
  onAlternative = (_song: CatalogSong): void => {};
  constructor(private target: string, private resolveAlternatives?: (song: CatalogSong, signal: AbortSignal) => Promise<CatalogSong[]>) {}
  private resetInstance(): void {
    this.cancelReady?.(); this.cancelReady = null;
    this.ready = null; this.initialized = false; this.deferredError = null;
    this.instance++;
    if (!this.player) return;
    const container = document.getElementById(this.target)?.parentElement;
    if (!container) throw new Error('No se pudo preparar el reproductor. Recarga la aplicación.');
    this.player.destroy();
    const host = document.createElement('div'); host.id = this.target;
    container.append(host);
    this.player = null; this.ready = null; this.initialized = false;
  }
  private async recoverRestriction(code: number): Promise<void> {
    if (this.resolving || !this.song || !this.resolveAlternatives) return;
    const version = this.version;
    this.resolving = true;
    this.onRecovery('Esta versión está bloqueada. Buscando una alternativa de la misma canción…');
    const controller = new AbortController();
    this.resolverController = controller;
    const timer = window.setTimeout(() => controller.abort(),25000);
    try {
      if (!this.alternatives) {
        const candidates = await this.resolveAlternatives(this.song,controller.signal);
        if (version !== this.version || !this.selected) return;
        this.alternatives = candidates.filter((candidate,index) =>
          /^[A-Za-z0-9_-]{11}$/.test(candidate.videoId) && candidate.videoId !== this.song?.videoId &&
          candidates.findIndex(other => other.videoId === candidate.videoId) === index).slice(0,MAX_ALTERNATIVES);
      }
      if (version !== this.version || !this.selected) return;
      const candidate = this.alternatives[this.alternativeIndex++];
      if (!candidate) {
        this.onError(`YouTube no permite reproducir esta canción en el reproductor integrado (código ${code}). Las ${this.alternatives.length} alternativas probadas tampoco están disponibles. Pulsa «Abrir original» para escucharla en YouTube Music.`);
        return;
      }
      this.pendingAlternative = candidate;
      this.videoId = candidate.videoId;
      this.startsPending = false;
      this.recoveryAttempted = false;
      this.onRecovery(`Probando una versión alternativa de «${this.song.title}» (${this.alternativeIndex}/${this.alternatives.length})…`);
      this.resetInstance();
      await this.initialize(candidate.videoId);
      if (version !== this.version || !this.selected) return;
      this.resolving = false;
      if (this.deferredError !== null) { const error = this.deferredError; this.deferredError = null; void this.recoverRestriction(error); return; }
      this.player!.unMute();
      this.player!.setVolume(this.volume);
      this.player!.playVideo();
    } catch {
      if (version === this.version && this.selected) this.onError(`${youtubeError(code)} No se pudo completar la búsqueda automática de alternativas.`);
    } finally {
      window.clearTimeout(timer);
      if (version === this.version && this.resolverController === controller) { this.resolving = false; this.resolverController = null; }
    }
  }
  private initialize(videoId: string): Promise<void> {
    if (this.ready) return this.ready;
    const instance = ++this.instance;
    const pending = loadApi().then(() => new Promise<void>((resolve, reject) => {
      if (instance !== this.instance) { reject(new DOMException('Carga cancelada','AbortError')); return; }
      const timer = window.setTimeout(() => reject(new Error('El reproductor de YouTube no está disponible. Recarga e intenta de nuevo.')), 15000);
      this.cancelReady = () => { window.clearTimeout(timer); reject(new DOMException('Carga cancelada','AbortError')); };
      // Configurar identidad y permisos ANTES de navegar el iframe. La API admite
      // controlar un iframe existente; el modo de privacidad es oficial de YouTube.
      const host = document.getElementById(this.target);
      if (!host) { window.clearTimeout(timer); reject(new Error('No se encontró el reproductor de YouTube.')); return; }
      const iframe = document.createElement('iframe');
      iframe.id = this.target; iframe.title = 'Reproductor de YouTube';
      iframe.width = '100%'; iframe.height = '270';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
      url.search = new URLSearchParams({enablejsapi:'1',origin:location.origin,
        widget_referrer:location.origin,playsinline:'1',controls:'1',autoplay:'0'}).toString();
      iframe.src = url.toString();
      host.replaceWith(iframe);
      this.player = new window.YT!.Player(this.target, {
        videoId, width: '100%', height: '270',
        playerVars: { origin: location.origin, playsinline: 1, controls: 1, autoplay: 0 },
        events: {
          onReady: () => { if (instance !== this.instance) return; this.initialized = true; this.cancelReady = null; window.clearTimeout(timer); resolve(); },
          onStateChange: event => {
            if (!this.selected || instance !== this.instance) return;
            if (event.data === 1) {
              this.recoveryAttempted = false;
              if (this.pendingAlternative) { const song = this.pendingAlternative; this.pendingAlternative = null; this.onAlternative(song); }
            }
            this.onChange();
            if (event.data === 0 && !this.resolving && !this.pendingAlternative) this.onEnded();
          },
          onError: event => {
            if (instance !== this.instance) return;
            if (!this.initialized || !this.selected || this.resolving) { this.deferredError = event.data; return; }
            console.warn(`[DeluxXx/YouTube] code=${event.data} videoId=${this.videoId} instance=${instance}`);
            // Error 2 transitorio: recargar UNA vez el ID validado, sin borrar la selección.
            if (event.data === 2 && this.videoId && !this.recoveryAttempted) {
              this.recoveryAttempted = true;
              this.player!.unMute();
              this.player!.setVolume(this.volume);
              this.player!.loadVideoById(this.videoId);
              return;
            }
            if ((event.data === 101 || event.data === 150 || event.data === 100) && this.resolveAlternatives) {
              if (this.rejectedInstance === instance) return;
              this.rejectedInstance = instance;
              void this.recoverRestriction(event.data); return;
            }
            this.onError(youtubeError(event.data));
          },
          onAutoplayBlocked: () => {
            if (this.selected && instance === this.instance) this.onError('El navegador requiere un clic directo: pulsa el botón de reproducción dentro del reproductor de YouTube.');
          },
        },
      });
    })).catch((reason: unknown) => { if (instance === this.instance) { this.ready = null; this.cancelReady = null; } throw reason; });
    this.ready = pending;
    return pending;
  }
  async load(song: Song): Promise<void> {
    if (song.source !== 'youtube' || !/^[A-Za-z0-9_-]{11}$/.test(song.videoId)) {
      throw new Error('La canción tiene un identificador de YouTube inválido. Agrégala de nuevo desde la búsqueda.');
    }
    this.stop();
    const version = this.version;
    this.resetInstance();
    try { await this.initialize(song.videoId); }
    catch (reason) { if (version !== this.version) return; throw reason; }
    if (version !== this.version) return;
    this.song = { videoId:song.videoId,title:song.title,artist:song.artist,duration:song.duration,artwork:song.artwork };
    this.alternatives = null; this.alternativeIndex = 0; this.pendingAlternative = null;
    this.videoId = song.videoId;
    this.selected = true;
    this.startsPending = true;
    this.recoveryAttempted = false;

  }
  async play(): Promise<void> {
    if (!this.selected || !this.videoId || !this.initialized) return;
    if (this.deferredError !== null) { const error = this.deferredError; this.deferredError = null;
      if ([100,101,150].includes(error) && this.resolveAlternatives) { void this.recoverRestriction(error); return; }
      this.onError(youtubeError(error)); return;
    }
    this.player!.unMute();
    this.player!.setVolume(this.volume);
    // Cargar y reproducir es una sola operación; no adelantar play a un cue asincrónico.
    if (this.startsPending) { this.startsPending = false; this.player!.loadVideoById(this.videoId); }
    else this.player!.playVideo();
  }
  pause(): void { if (this.initialized && this.selected) this.player?.pauseVideo(); }
  stop(): void {
    this.version++;
    this.cancelReady?.(); this.cancelReady = null;
    if (!this.initialized) { this.instance++; this.ready = null; }
    this.resolverController?.abort(); this.resolverController = null;
    this.resolving = false; this.pendingAlternative = null; this.song = null;
    const wasSelected = this.selected;
    this.selected = false;
    this.videoId = null;
    // stopVideo en un reproductor sin selección también provoca errores de argumento.
    if (this.initialized && wasSelected) this.player?.stopVideo();
  }
  seek(seconds: number): void { if (this.initialized && this.selected && Number.isFinite(seconds)) this.player?.seekTo(Math.max(0, Math.min(this.duration, seconds)), true); }
  setVolume(volume: number): void { this.volume = Math.max(0, Math.min(1, volume)) * 100; if (this.initialized) this.player?.setVolume(this.volume); }
  get time(): number { return this.initialized && this.selected ? this.player?.getCurrentTime() || 0 : 0; }
  get duration(): number { return this.initialized && this.selected ? this.player?.getDuration() || 0 : 0; }
  get playing(): boolean { return this.initialized && this.selected && this.player?.getPlayerState() === 1; }
}
