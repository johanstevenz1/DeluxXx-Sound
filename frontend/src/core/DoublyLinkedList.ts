export class DNode<T> {
  prev: DNode<T> | null = null;
  next: DNode<T> | null = null;
  constructor(public value: T, public owner: symbol | null = null) {}
}

/** Los nodos son referencias internas: el consumidor no debe modificar sus enlaces. */
export class DoublyLinkedList<T> implements Iterable<T> {
  private token = Symbol('list');
  head: DNode<T> | null = null;
  tail: DNode<T> | null = null;
  size = 0;

  private validate(index: number, insertion = false): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.size + Number(insertion)) {
      throw new RangeError(`Posición inválida: ${index}.`);
    }
  }
  addFirst(value: T): DNode<T> {
    const node = new DNode(value, this.token);
    node.next = this.head;
    if (this.head) this.head.prev = node;
    else this.tail = node;
    this.head = node;
    this.size++;
    return node;
  }
  addLast(value: T): DNode<T> {
    const node = new DNode(value, this.token);
    node.prev = this.tail;
    if (this.tail) this.tail.next = node;
    else this.head = node;
    this.tail = node;
    this.size++;
    return node;
  }
  addAt(index: number, value: T): DNode<T> {
    this.validate(index, true);
    if (index === 0) return this.addFirst(value);
    if (index === this.size) return this.addLast(value);
    const after = this.getNodeAt(index);
    const node = new DNode(value, this.token);
    node.prev = after.prev;
    node.next = after;
    after.prev!.next = node;
    after.prev = node;
    this.size++;
    return node;
  }
  getNodeAt(index: number): DNode<T> {
    this.validate(index);
    let node: DNode<T>;
    if (index <= this.size / 2) {
      node = this.head!;
      for (let i = 0; i < index; i++) node = node.next!;
    } else {
      node = this.tail!;
      for (let i = this.size - 1; i > index; i--) node = node.prev!;
    }
    return node;
  }
  removeNode(node: DNode<T>): T {
    if (node.owner !== this.token) throw new Error('El nodo no pertenece a esta lista.');
    this.detach(node);
    node.owner = null;
    this.size--;
    return node.value;
  }
  private detach(node: DNode<T>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = node.next = null;
  }
  removeAt(index: number): T { return this.removeNode(this.getNodeAt(index)); }
  /** Destino en la lista final; conserva la identidad del nodo. */
  move(from: number, to: number): void {
    this.validate(from);
    this.validate(to);
    if (from === to) return;
    const node = this.getNodeAt(from);
    this.detach(node);
    this.size--;
    const after = to === this.size ? null : this.getNodeAt(to);
    node.next = after;
    node.prev = after ? after.prev : this.tail;
    if (node.prev) node.prev.next = node;
    else this.head = node;
    if (after) after.prev = node;
    else this.tail = node;
    this.size++;
  }
  indexOf(predicate: (value: T) => boolean): number {
    let index = 0;
    for (const value of this) { if (predicate(value)) return index; index++; }
    return -1;
  }
  *[Symbol.iterator](): Generator<T> {
    let node = this.head;
    while (node) { yield node.value; node = node.next; }
  }
  /** Únicamente para presentar datos en la UI. */
  toArray(): T[] { return Array.from(this); }
  clear(): void { while (this.head) this.removeNode(this.head); }
}
