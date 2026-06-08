import { describe, expect, it } from 'vitest';
import { exportSession, importSession } from './share';
import type { SessionState } from './types';

function tinySession(): SessionState {
  return {
    schemaVersion: 5,
    status: 'running',
    config: {
      targetTotal: 24,
      maxCourts: 2,
      avoidImmediateRepeat: true,
      tournament: 'mix-and-match',
    },
    players: [
      { id: 'p1', name: 'Alice', status: 'active', bonus: 0 },
      { id: 'p2', name: 'Bob', status: 'active', bonus: 0 },
      { id: 'p3', name: 'Carol', status: 'active', bonus: 0 },
      { id: 'p4', name: 'Dave', status: 'active', bonus: 0 },
    ],
    rounds: [
      {
        id: 'r1',
        number: 1,
        games: [
          {
            id: 'g1',
            court: 1,
            teamA: { playerIds: ['p1', 'p3'], score: 18 },
            teamB: { playerIds: ['p2', 'p4'], score: 6 },
            recorded: true,
          },
        ],
        restingPlayerIds: [],
        createdAt: 1700000000000,
      },
    ],
    createdAt: 1700000000000,
  };
}

describe('exportSession + importSession round-trip', () => {
  it('exports a v2 single-message code that imports back to the same state', async () => {
    const original = tinySession();
    const exp = await exportSession(original);
    expect(exp.isSingle).toBe(true);
    expect(exp.chunks).toHaveLength(1);
    expect(exp.chunks[0]).toMatch(/^PADELMM\/v2\//);

    const imp = await importSession(exp.full);
    expect(imp.ok, imp.error).toBe(true);
    expect(imp.state).toBeDefined();
    expect(imp.state!.schemaVersion).toBe(5);
    expect(imp.state!.players).toHaveLength(4);
    expect(imp.state!.rounds).toHaveLength(1);
    expect(imp.state!.rounds[0]!.games[0]!.teamA.score).toBe(18);
    expect(imp.state!.rounds[0]!.games[0]!.teamB.score).toBe(6);
  });

  it('chunks long sessions and reassembles them correctly', async () => {
    // Produce a session big enough to exceed CHUNK_LIMIT (3500 chars
    // after gzip+base64). Use high-entropy random-noise names so gzip
    // can't squash the fixture below the chunk threshold — the
    // earlier "lots of similar players" fixture was too compressible
    // and still came out as a single message.
    const noise = (i: number) => {
      let s = '';
      // Deterministic per-row noise so the test is reproducible.
      let x = (i + 1) * 2654435761; // Knuth multiplicative hash
      for (let k = 0; k < 48; k++) {
        x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
        // Map to printable ASCII ~32–126, excluding the few JSON-
        // problematic chars.
        const code = 0x21 + ((x >>> 0) % 0x5e);
        const ch = String.fromCharCode(code);
        s += ch === '"' || ch === '\\' ? '.' : ch;
      }
      return s;
    };

    const big = tinySession();
    big.players = Array.from({ length: 80 }, (_, i) => ({
      id: `p${i + 1}-${noise(i)}`,
      name: `${noise(i + 1000)}`,
      status: 'active',
      bonus: 0,
    }));
    big.rounds = Array.from({ length: 60 }, (_, ri) => ({
      id: `r${ri + 1}-${noise(ri + 10_000)}`,
      number: ri + 1,
      games: Array.from({ length: 4 }, (_, gi) => ({
        id: `r${ri}g${gi}-${noise(ri * 100 + gi)}`,
        court: gi + 1,
        teamA: {
          playerIds: [big.players[gi * 4]!.id, big.players[gi * 4 + 1]!.id] as [string, string],
          score: 12 + (ri % 13),
        },
        teamB: {
          playerIds: [big.players[gi * 4 + 2]!.id, big.players[gi * 4 + 3]!.id] as [string, string],
          score: 24 - (12 + (ri % 13)),
        },
        recorded: true,
      })),
      restingPlayerIds: [],
      createdAt: 1700000000000 + ri,
    }));

    const exp = await exportSession(big);
    expect(exp.isSingle).toBe(false);
    expect(exp.chunks.length).toBeGreaterThan(1);
    for (const chunk of exp.chunks) {
      expect(chunk).toMatch(/^PADELMM\/v2\/c\d+\/\d+\//);
    }

    const imp = await importSession(exp.full);
    expect(imp.ok, imp.error).toBe(true);
    expect(imp.state!.players).toHaveLength(80);
    expect(imp.state!.rounds).toHaveLength(60);
  });

  it('rejects empty input with a clear message', async () => {
    const imp = await importSession('   ');
    expect(imp.ok).toBe(false);
    expect(imp.error).toMatch(/empty/i);
  });

  it('rejects gibberish without a recognised prefix', async () => {
    const imp = await importSession('hello there, this is not a code');
    expect(imp.ok).toBe(false);
    expect(imp.error).toMatch(/no padel m&m share code/i);
  });

  it('reports a partial-chunk paste with the missing indices', async () => {
    // Build chunks but only paste 1 of them — importer should ask
    // for the rest. Uses the same high-entropy fixture as the
    // chunking test so gzip can't fold it into one message.
    const noise = (i: number) => {
      let x = (i + 1) * 2654435761;
      let s = '';
      for (let k = 0; k < 48; k++) {
        x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
        const code = 0x21 + ((x >>> 0) % 0x5e);
        const ch = String.fromCharCode(code);
        s += ch === '"' || ch === '\\' ? '.' : ch;
      }
      return s;
    };

    const big = tinySession();
    big.players = Array.from({ length: 80 }, (_, i) => ({
      id: `p${i}-${noise(i)}`,
      name: noise(i + 500),
      status: 'active',
      bonus: 0,
    }));
    big.rounds = Array.from({ length: 50 }, (_, ri) => ({
      id: `r${ri}-${noise(ri + 9000)}`,
      number: ri + 1,
      games: [],
      restingPlayerIds: [],
      createdAt: 1700000000000 + ri,
    }));

    const exp = await exportSession(big);
    expect(exp.isSingle).toBe(false);
    const imp = await importSession(exp.chunks[0]!);
    expect(imp.ok).toBe(false);
    expect(imp.partial).toBeDefined();
    expect(imp.partial!.have).toBe(1);
    expect(imp.partial!.total).toBe(exp.chunks.length);
  });

  it('imports a v1 (uncompressed legacy) code', async () => {
    // Hand-craft a v1 payload so the back-compat path is covered
    // without depending on the build's gzip availability.
    const original = tinySession();
    original.schemaVersion = 1; // legacy
    const json = JSON.stringify(original);
    const base64 = Buffer.from(json, 'utf8').toString('base64');
    const code = `PADELMM/v1/${base64}`;
    const imp = await importSession(code);
    expect(imp.ok, imp.error).toBe(true);
    expect(imp.state!.players).toHaveLength(4);
  });

  it('rejects a code claiming a schemaVersion newer than this build supports', async () => {
    const future = tinySession();
    (future as unknown as { schemaVersion: number }).schemaVersion = 999;
    const json = JSON.stringify(future);
    const code = `PADELMM/v1/${Buffer.from(json, 'utf8').toString('base64')}`;
    const imp = await importSession(code);
    expect(imp.ok).toBe(false);
    expect(imp.error).toMatch(/newer app version/i);
  });
});
