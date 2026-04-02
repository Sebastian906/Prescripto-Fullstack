export interface PriorityItem<T> {
    value: T;
    priority: number; // mayor número = mayor prioridad
}

/**
 * Min-Heap implementado con array.
 * Para Max-Heap: invertir el signo de priority al insertar.
 *
 * insert:  O(log n)
 * extract: O(log n)
 * peek:    O(1)
 */
export class PriorityQueue<T> {
    private heap: PriorityItem<T>[] = [];

    get size(): number { return this.heap.length; }
    isEmpty(): boolean { return this.heap.length === 0; }
    peek(): PriorityItem<T> | null { return this.heap[0] ?? null; }

    insert(value: T, priority: number): void {
        this.heap.push({ value, priority });
        this.bubbleUp(this.heap.length - 1);
    }

    extractMax(): PriorityItem<T> | null {
        if (this.isEmpty()) return null;
        const top = this.heap[0];
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.sinkDown(0);
        }
        return top;
    }

    private bubbleUp(idx: number): void {
        while (idx > 0) {
            const parent = Math.floor((idx - 1) / 2);
            if (this.heap[parent].priority >= this.heap[idx].priority) break;
            [this.heap[parent], this.heap[idx]] = [this.heap[idx], this.heap[parent]];
            idx = parent;
        }
    }

    private sinkDown(idx: number): void {
        const n = this.heap.length;
        while (true) {
            let largest = idx;
            const l = 2 * idx + 1;
            const r = 2 * idx + 2;
            if (l < n && this.heap[l].priority > this.heap[largest].priority) largest = l;
            if (r < n && this.heap[r].priority > this.heap[largest].priority) largest = r;
            if (largest === idx) break;
            [this.heap[largest], this.heap[idx]] = [this.heap[idx], this.heap[largest]];
            idx = largest;
        }
    }
}