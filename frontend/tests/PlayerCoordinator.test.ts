import { describe, it, expect, vi } from 'vitest';
import { PlayerCoordinator } from '../src/players/PlayerCoordinator';
import type { PlayerPort } from '../src/core/PlayerPort';
import type { Song } from '../src/core/types';
function port(): PlayerPort {
  return {load:vi.fn().mockResolvedValue(undefined),play:vi.fn().mockResolvedValue(undefined),pause:vi.fn(),stop:vi.fn(),seek:vi.fn(),setVolume:vi.fn(),time:0,duration:120,playing:false,onEnded:()=>{},onChange:()=>{},onError:()=>{}};
}
const yt: Song = {id:'yt',title:'YT',artist:'A',duration:120,source:'youtube',videoId:'abcdefghijk'};
const local: Song = {id:'local',title:'Local',artist:'A',duration:120,source:'local',src:'blob:test',file:{} as File};
describe('Coordinación de fuentes', () => {
  it('detiene ambas fuentes antes de cargar otra y reenvía solo eventos activos', async () => {
    const a = port(), b = port(), player = new PlayerCoordinator(a,b), ended = vi.fn(); player.onEnded = ended;
    await player.load(local, true); expect(a.play).toHaveBeenCalledOnce();
    await player.load(yt, true); expect(a.stop).toHaveBeenCalledTimes(2); expect(b.play).toHaveBeenCalledOnce();
    a.onEnded(); expect(ended).not.toHaveBeenCalled(); b.onEnded(); expect(ended).toHaveBeenCalledOnce();
  });
  it('una carga antigua no inicia audio después de cambiar de canción', async () => {
    const a = port(), b = port(); let resolve = (): void => {};
    b.load = () => new Promise<void>(done => { resolve = done; });
    const player = new PlayerCoordinator(a,b), pending = player.load(yt,true);
    await player.load(local,true); resolve(); await pending;
    expect(b.play).not.toHaveBeenCalled(); expect(a.play).toHaveBeenCalledOnce(); expect(player.loading).toBe(false);
  });
  it('notifica rechazo de reproducción y permite reintentar', async () => {
    const a = port(), b = port(), player = new PlayerCoordinator(a,b); player.onError = vi.fn();
    a.play = vi.fn().mockRejectedValueOnce(new Error('blocked')).mockResolvedValue(undefined);
    await player.load(local,true); expect(player.onError).toHaveBeenCalledWith('blocked');
    await player.toggle(local); expect(a.play).toHaveBeenCalledTimes(2);
  });
});

it('un error activo no presenta la canción como lista y se limpia al cambiar de fuente',async()=>{
  const a=port(),b=port(),player=new PlayerCoordinator(a,b);
  await player.load(yt,true); b.onError('YouTube: 150');
  expect(player.error).toBe('YouTube: 150'); expect(player.ready).toBe(false);
  await player.load(local,true); expect(player.error).toBeNull(); expect(player.ready).toBe(true);
});
