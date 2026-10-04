import { DoublyLinkedList, type DNode } from './DoublyLinkedList';
import type { Song, RepeatMode } from './types';

export class Playlist implements Iterable<Song> {
  private list = new DoublyLinkedList<Song>();
  private current: DNode<Song> | null = null;
  repeat: RepeatMode = 'off';
  shuffle = false;
  constructor(private release: (song: Song) => void = () => {}, private random: () => number = Math.random) {}
  private selectIfEmpty(node: DNode<Song>): void { this.current ??= node; }
  addFirst(song: Song): void { this.selectIfEmpty(this.list.addFirst(song)); }
  addLast(song: Song): void { this.selectIfEmpty(this.list.addLast(song)); }
  addAt(index: number, song: Song): void { this.selectIfEmpty(this.list.addAt(index, song)); }
  remove(id: string): Song | null {
    const index = this.indexOf(id);
    if (index === -1) return null;
    const node = this.list.getNodeAt(index);
    if (node === this.current) this.current = node.next ?? node.prev;
    const song = this.list.removeNode(node);
    this.release(song);
    return song;
  }
  next(automatic = false): Song | null {
    if (!this.current) return null;
    if (automatic && this.repeat === 'one') return this.current.value;
    if (this.shuffle && this.size > 1) {
      const currentIndex = this.indexOf(this.current.value.id);
      const candidate = Math.min(this.size - 2, Math.max(0, Math.floor(this.random() * (this.size - 1))));
      this.current = this.list.getNodeAt(candidate >= currentIndex ? candidate + 1 : candidate);
    } else if (this.current.next) this.current = this.current.next;
    else if (this.repeat === 'all') this.current = this.list.head;
    else return null;
    return this.getCurrent();
  }
  prev(): Song | null {
    if (!this.current) return null;
    if (this.current.prev) this.current = this.current.prev;
    else if (this.repeat === 'all') this.current = this.list.tail;
    else return null;
    return this.getCurrent();
  }
  playById(id: string): Song | null {
    let node = this.list.head;
    while (node) { if (node.value.id === id) { this.current = node; return node.value; } node = node.next; }
    return null;
  }
  toggleFavorite(id: string): boolean {
    for (const song of this) { if (song.id === id) { song.favorite = !song.favorite; return song.favorite; } }
    throw new Error('La canción ya no está en la cola.');
  }
  indexOf(id: string): number { return this.list.indexOf(song => song.id === id); }
  move(id: string, destination: number): void {
    const index = this.indexOf(id);
    if (index < 0) throw new Error('La canción ya no está en la cola.');
    this.list.move(index, destination);
  }
  clear(): void {
    this.current = null;
    while (this.list.head) this.release(this.list.removeNode(this.list.head));
  }
  getCurrent(): Song | null { return this.current?.value ?? null; }
  get size(): number { return this.list.size; }
  get canNext(): boolean { return !!this.current && (!!this.current.next || this.repeat === 'all' || (this.shuffle && this.size > 1)); }
  get canPrev(): boolean { return !!this.current && (!!this.current.prev || this.repeat === 'all'); }
  get totalDuration(): number { let total = 0; for (const song of this) total += song.duration ?? 0; return total; }
  toArray(): Song[] { return this.list.toArray(); }
  [Symbol.iterator](): Iterator<Song> { return this.list[Symbol.iterator](); }
}
