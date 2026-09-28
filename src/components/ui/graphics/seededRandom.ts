/**
 * seededRandom — deterministic pseudo-randomness for vector graphics.
 *
 * The primitives used to call `Math.random()` while rendering. That produces a
 * different tree on the server than on the client (hydration mismatch) and a
 * different one on every re-render. A graphics primitive must be a pure
 * function of its props.
 *
 * Mulberry32 — small, fast, and good enough for scattering glyphs.
 */

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
