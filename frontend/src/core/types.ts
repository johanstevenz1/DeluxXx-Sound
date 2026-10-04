interface BaseSong {
  id: string;
  title: string;
  artist: string;
  duration: number | null;
  artwork?: string;
  favorite?: boolean;
}
export interface LocalSong extends BaseSong { source: 'local'; src: string; file: File }
export interface YouTubeSong extends BaseSong { source: 'youtube'; videoId: string }
export type Song = LocalSong | YouTubeSong;
export type RepeatMode = 'off' | 'all' | 'one';
export interface CatalogSong { videoId: string; title: string; artist: string; duration: number | null; artwork?: string }
