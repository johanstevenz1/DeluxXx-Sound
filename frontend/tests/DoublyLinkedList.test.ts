import { describe, it, expect } from 'vitest';
import { DoublyLinkedList } from '../src/core/DoublyLinkedList';
function invariant<T>(list: DoublyLinkedList<T>, expected: T[]): void {
  const forward: T[] = [], backward: T[] = [];
  let node = list.head;
  while (node) { if (node.next) expect(node.next.prev).toBe(node); forward.push(node.value); node = node.next; }
  node = list.tail;
  while (node) { if (node.prev) expect(node.prev.next).toBe(node); backward.push(node.value); node = node.prev; }
  expect(forward).toEqual(expected);
  expect(backward).toEqual([...expected].reverse());
  expect(list.size).toBe(expected.length);
  expect(list.head?.prev ?? null).toBeNull();
  expect(list.tail?.next ?? null).toBeNull();
}
describe('Lista doble', () => {
  it('inserta en ambos extremos y en el medio', () => {
    const list = new DoublyLinkedList<number>(); invariant(list, []);
    list.addFirst(2); expect(list.head).toBe(list.tail);
    list.addFirst(1); list.addLast(4); list.addAt(2, 3); invariant(list, [1, 2, 3, 4]);
  });
  it('elimina primero, medio y último', () => {
    const list = new DoublyLinkedList<number>(); for (const n of [1, 2, 3, 4]) list.addLast(n);
    list.removeAt(0); invariant(list, [2, 3, 4]); list.removeAt(1); invariant(list, [2, 4]);
    list.removeAt(1); invariant(list, [2]); list.removeAt(0); invariant(list, []);
  });
  it.each([-1, NaN, Infinity, 0.5, 2])('rechaza índice inválido %s sin mutar', index => {
    const list = new DoublyLinkedList<number>(); list.addLast(1);
    expect(() => list.getNodeAt(index)).toThrow(RangeError);
    expect(() => list.removeAt(index)).toThrow(RangeError);
    expect(() => list.addAt(index, 9)).toThrow(RangeError); invariant(list, [1]);
  });
  it('admite size para inserción pero no para consulta', () => {
    const list = new DoublyLinkedList<number>(); list.addAt(0, 1); list.addAt(1, 2);
    expect(() => list.getNodeAt(2)).toThrow(RangeError); invariant(list, [1, 2]);
  });
  it('rechaza nodo ajeno, eliminado y vaciado', () => {
    const a = new DoublyLinkedList<number>(), b = new DoublyLinkedList<number>();
    const own = a.addLast(1), foreign = b.addLast(2);
    expect(() => a.removeNode(foreign)).toThrow(); a.removeNode(own);
    expect(() => a.removeNode(own)).toThrow(); const old = a.addLast(3); a.clear();
    expect(old.next).toBeNull(); expect(old.prev).toBeNull(); expect(() => a.removeNode(old)).toThrow(); invariant(a, []);
  });
  it('reordena conservando el nodo y todos los enlaces', () => {
    const list = new DoublyLinkedList<number>(); for (const n of [1, 2, 3, 4]) list.addLast(n);
    const node = list.head; list.move(0, 3); expect(list.tail).toBe(node); invariant(list, [2, 3, 4, 1]);
    list.move(3, 0); expect(list.head).toBe(node); invariant(list, [1, 2, 3, 4]);
    list.move(1, 2); invariant(list, [1, 3, 2, 4]);
  });
});
