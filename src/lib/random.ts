/**
 * Deterministic pseudo-random generator (Mulberry32).
 *
 * Why we need this:
 *  - Production code happily uses `Math.random()` for shuffling
 *    players into courts and tie-breaking sort orders.
 *  - Tests need reproducible output: "given this roster + this seed,
 *    the generator should always produce these exact games". With
 *    `Math.random()`, fairness tests would have to assert on
 *    statistical properties over thousands of iterations instead
 *    of a single concrete expectation.
 *  - The CLI simulator (PRD item 7) needs deterministic seeds so
 *    QA can rerun the same scenario from a text-file config.
 *
 * Implementation notes:
 *  - Mulberry32 is a tiny, vetted 32-bit PRNG with good statistical
 *    properties for non-cryptographic use. Produces a uniform
 *    distribution in `[0, 1)` matching `Math.random()`'s contract,
 *    so callers can swap in/out without any other changes.
 *  - NOT cryptographically secure. Do not use for anything that
 *    needs unpredictability — only for game-mechanics randomness.
 *    Cryptographic randomness (UUIDs, share-code nonces, etc.) uses
 *    `crypto.randomUUID()` / `crypto.getRandomValues()` elsewhere.
 *  - Source: De Bruyn Kops, "Mulberry32", public domain, derived
 *    from the Apache-licensed splitmix64 family.
 */

/**
 * Function shape compatible with `Math.random` — returns a float in
 * the half-open interval `[0, 1)`. Used wherever `teams.ts` and
 * other generators need randomness.
 */
export type Random = () => number;

/**
 * Construct a seeded PRNG. Same seed ⇒ same sequence forever.
 *
 * The seed is forced through `>>> 0` to coerce floats / negatives /
 * NaN into a 32-bit unsigned int so callers can pass any number
 * shape (e.g. `Date.now()`, a hash, a fixture index) without having
 * to pre-mask it.
 */
export function mulberry32(seed: number): Random {
  let a = (seed | 0) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Drop-in replacement for `Math.random` used by production code
 * paths. Re-exported so callers can pin the dependency in one
 * place — tests pass their own seeded function instead.
 */
export const defaultRandom: Random = Math.random;
