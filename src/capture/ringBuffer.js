/**
 * Bounded ring buffer. Single producer is fine; not thread-safe
 * across workers. Cheap snapshot() returns a new array each call.
 */
export function createRingBuffer(capacity = 128) {
  if (!Number.isFinite(capacity) || capacity < 1) capacity = 128;
  const buf = new Array(capacity);
  let head = 0;
  let count = 0;

  return {
    push(item) {
      buf[head] = item;
      head = (head + 1) % capacity;
      if (count < capacity) count += 1;
    },
    snapshot() {
      if (count === 0) return [];
      const out = new Array(count);
      const start = (head - count + capacity) % capacity;
      for (let i = 0; i < count; i += 1) {
        out[i] = buf[(start + i) % capacity];
      }
      return out;
    },
    size() { return count; },
    capacity() { return capacity; },
    clear() { head = 0; count = 0; for (let i = 0; i < capacity; i += 1) buf[i] = undefined; },
  };
}
