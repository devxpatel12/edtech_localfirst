import type { VectorClock } from "@/types/documents";

export function compareClocks(a: VectorClock, b: VectorClock): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let aGreater = false;
  let bGreater = false;

  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    if (av > bv) aGreater = true;
    if (bv > av) bGreater = true;
  }

  if (aGreater && !bGreater) return 1;
  if (bGreater && !aGreater) return -1;
  return 0;
}

export function incrementClock(clock: VectorClock, clientId: string): VectorClock {
  return { ...clock, [clientId]: (clock[clientId] ?? 0) + 1 };
}

export function mergeClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = { ...a };
  for (const [key, value] of Object.entries(b)) {
    merged[key] = Math.max(merged[key] ?? 0, value);
  }
  return merged;
}

export function maxClock(clocks: VectorClock[]): VectorClock {
  return clocks.reduce((acc, clock) => mergeClocks(acc, clock), {} as VectorClock);
}
