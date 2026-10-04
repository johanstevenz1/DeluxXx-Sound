import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YouTubePlayer, youtubeError, type YTOptions } from '../src/players/YouTubePlayer';
import type { YouTubeSong } from '../src/core/types';
const song: YouTubeSong = {id:'yt',title:'Tema',artist:'A',duration:1,source:'youtube',videoId:'VskJsNnVPq0'};
let options: YTOptions | null;
const cue = vi.fn(), loadVideo = vi.fn(), playVideo = vi.fn(), stop = vi.fn(), unmute = vi.fn(), volume = vi.fn();
beforeEach(() => {
  options = null; vi.clearAllMocks();
  class FakePlayer {
    constructor(_target: string, value: YTOptions) { options = value; }
    destroy = vi.fn();
    cueVideoById = cue; loadVideoById = loadVideo; playVideo = playVideo; stopVideo = stop; unMute = unmute; setVolume = volume;
    pauseVideo = vi.fn(); getCurrentTime = ():number => 0; getDuration = ():number => 180; getPlayerState = ():number => 2;
  }
  vi.stubGlobal('window', {YT:{Player:FakePlayer},setTimeout,clearTimeout});
  vi.stubGlobal('document',{getElementById:()=>({parentElement:{append:vi.fn()},replaceWith:vi.fn()}),createElement:()=>({id:''})});
  vi.stubGlobal('location', {origin:'http://127.0.0.1:8000'});
});
afterEach(() => vi.unstubAllGlobals());
async function ready(player: YouTubePlayer): Promise<void> {
  const pending = player.load(song); await Promise.resolve(); options!.events.onReady(); await pending;
}
describe('YouTube y audio', () => {
  it('inicializa con el ID real y arranca audio con una sola operación', async () => {
    const player = new YouTubePlayer('youtube-player'); await ready(player);
    expect(options?.videoId).toBe(song.videoId); expect(options?.playerVars.autoplay).toBe(0);
    expect(cue).not.toHaveBeenCalled(); player.setVolume(.6); await player.play();
    expect(unmute).toHaveBeenCalledOnce(); expect(volume).toHaveBeenLastCalledWith(60);
    expect(loadVideo).toHaveBeenCalledWith(song.videoId); expect(playVideo).not.toHaveBeenCalled();
    await player.play(); expect(playVideo).toHaveBeenCalledOnce();
  });
  it('cambiar de fuente antes de onReady cancela la carga y evita stopVideo vacío', async () => {
    const player = new YouTubePlayer('youtube-player'), pending = player.load(song);
    await Promise.resolve(); player.stop(); expect(stop).not.toHaveBeenCalled(); options!.events.onReady(); await pending;
    expect(cue).not.toHaveBeenCalled(); expect(player.playing).toBe(false); await player.play(); expect(loadVideo).not.toHaveBeenCalled();
  });
  it('valida el ID antes de construir el iframe', async () => {
    const player = new YouTubePlayer('youtube-player'); await expect(player.load({...song,videoId:'https://youtube.com/watch?v=bad'})).rejects.toThrow('identificador'); expect(options).toBeNull();
  });
  it('recupera error 2 una vez, y no entra en un ciclo de recargas', async () => {
    const player = new YouTubePlayer('youtube-player'); await ready(player); player.onError = vi.fn();
    options!.events.onError({data:2}); expect(loadVideo).toHaveBeenCalledOnce(); expect(player.onError).not.toHaveBeenCalled();
    options!.events.onError({data:2}); expect(loadVideo).toHaveBeenCalledOnce(); expect(player.onError).toHaveBeenCalledWith(youtubeError(2));
  });
  it('ignora errores después de detener y diferencia restricciones de argumentos', async () => {
    const player = new YouTubePlayer('youtube-player'); await ready(player); player.onError = vi.fn(); player.stop(); player.stop();
    expect(stop).toHaveBeenCalledOnce(); options!.events.onError({data:2}); expect(player.onError).not.toHaveBeenCalled();
    expect(youtubeError(2)).toContain('identificador'); expect(youtubeError(150)).toContain('propietario');
  });
});

async function settle(): Promise<void> { for (let i=0;i<5;i++) await Promise.resolve(); }
it('cada alternativa tiene su iframe; errores duplicados o antiguos no consumen intentos', async () => {
  const alternative = {...song,videoId:'abcdefghijk'};
  const resolver = vi.fn().mockResolvedValue([alternative,{...song,videoId:'lmnopqrstuv'}]);
  const player = new YouTubePlayer('youtube-player',resolver);
  player.onError = vi.fn(); player.onAlternative = vi.fn(); await ready(player);
  const original = options!;
  original.events.onError({data:150}); original.events.onError({data:150}); await settle();
  expect(options!.videoId).toBe('abcdefghijk'); expect(player.onError).not.toHaveBeenCalled();
  original.events.onError({data:150}); expect(options!.videoId).toBe('abcdefghijk');
  expect(player.onAlternative).not.toHaveBeenCalled(); options!.events.onReady(); await settle();
  options!.events.onStateChange({data:1}); expect(player.onAlternative).toHaveBeenCalledWith(alternative);
  const first = options!;
  first.events.onError({data:101}); await settle(); expect(options!.videoId).toBe('lmnopqrstuv');
  first.events.onError({data:150}); expect(options!.videoId).toBe('lmnopqrstuv');
  options!.events.onReady(); await settle(); expect(resolver).toHaveBeenCalledOnce();
  options!.events.onError({data:150}); await settle();
  expect(player.onError).toHaveBeenCalledOnce(); expect(playVideo).toHaveBeenCalledTimes(2);
});
it('detener cancela la búsqueda y evita reproducir una respuesta tardía', async () => {
  let resolve!: (songs: typeof song[]) => void;
  const resolver = vi.fn((_song,signal:AbortSignal) => { expect(signal.aborted).toBe(false); return new Promise<typeof song[]>(done => { resolve = done; }); });
  const player = new YouTubePlayer('youtube-player',resolver); await ready(player);
  options!.events.onError({data:150}); player.stop();
  expect(resolver.mock.calls[0][1].aborted).toBe(true);
  resolve([{...song,videoId:'abcdefghijk'}]); await Promise.resolve();
  expect(loadVideo).not.toHaveBeenCalled();
});

it('una inicialización cancelada no borra la carga nueva ni sus callbacks', async () => {
  const player = new YouTubePlayer('youtube-player');
  const old = player.load(song); await Promise.resolve(); const stale = options!;
  const current = player.load({...song,id:'new',videoId:'abcdefghijk'});
  await settle(); const active = options!;
  stale.events.onReady(); active.events.onReady(); await Promise.all([old,current]);
  await player.play(); expect(loadVideo).toHaveBeenLastCalledWith('abcdefghijk');
  player.onError = vi.fn(); stale.events.onError({data:150}); expect(player.onError).not.toHaveBeenCalled();
});
it('un error anterior a onReady se recupera después de preparar el reproductor', async () => {
  const resolver = vi.fn().mockResolvedValue([{...song,videoId:'abcdefghijk'}]);
  const player = new YouTubePlayer('youtube-player',resolver);
  const loading = player.load(song); await settle(); options!.events.onError({data:150});
  options!.events.onReady(); await loading; await player.play(); await settle();
  expect(resolver).toHaveBeenCalledOnce(); expect(options!.videoId).toBe('abcdefghijk');
  options!.events.onReady(); await settle(); expect(playVideo).toHaveBeenCalled();
});

it('el iframe conserva identidad del sitio y permisos antes de conectarse a la API', async () => {
  const replace = vi.fn();
  const iframe: Partial<HTMLIFrameElement> = {};
  vi.stubGlobal('document',{getElementById:()=>({replaceWith:replace}),createElement:()=>iframe});
  const player = new YouTubePlayer('youtube-player'); await ready(player);
  const url = new URL(iframe.src!);
  expect(url.origin).toBe('https://www.youtube-nocookie.com');
  expect(url.pathname).toBe(`/embed/${song.videoId}`);
  expect(url.searchParams.get('origin')).toBe('http://127.0.0.1:8000');
  expect(url.searchParams.get('enablejsapi')).toBe('1');
  expect(iframe.referrerPolicy).toBe('strict-origin-when-cross-origin');
  expect(iframe.allow).toContain('autoplay'); expect(iframe.allow).toContain('encrypted-media');
  expect(replace).toHaveBeenCalledWith(iframe);
});

it('renderizar durante la recuperación no consulta métodos de un iframe aún sin inicializar', async () => {
  const resolver = vi.fn().mockResolvedValue([{...song,videoId:'abcdefghijk'}]);
  const player = new YouTubePlayer('youtube-player',resolver); await ready(player);
  // La API real agrega sus métodos cuando onReady confirma la conexión.
  class PendingPlayer { constructor(_target:string,value:YTOptions) {options=value;} destroy=vi.fn(); }
  vi.stubGlobal('window',{YT:{Player:PendingPlayer},setTimeout,clearTimeout});
  options!.events.onError({data:150}); await settle();
  expect(player.playing).toBe(false); expect(player.time).toBe(0); expect(player.duration).toBe(0);
  expect(()=>player.seek(10)).not.toThrow(); player.stop(); await settle();
});

it('los mensajes del reproductor conservan tildes UTF-8',()=>{
  expect(youtubeError(2)).toContain('rechazó');
  expect(youtubeError(150)).toContain('canción');
  expect(youtubeError(153)).toContain('aplicación');
});
