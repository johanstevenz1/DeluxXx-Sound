import type { Song } from './types';
export interface PlayerPort {
  load(song: Song): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void;
  readonly time: number;
  readonly duration: number;
  readonly playing: boolean;
  onEnded: () => void;
  onChange: () => void;
  onError: (message: string) => void;
}
