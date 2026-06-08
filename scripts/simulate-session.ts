#!/usr/bin/env node
/**
 * Run a scripted Mix & Match session from a JSON fixture.
 *
 * Usage:
 *   npm run simulate -- tests/fixtures/six-players.json
 *   npm run simulate -- tests/fixtures/six-players.json --rounds 20
 *
 * Fixture shape (all fields except `rounds` have defaults):
 *   {
 *     "seed": 42,
 *     "rounds": 10,
 *     "players": ["Alice", "Bob", ...]   // or full { id, name } objects
 *     "config": {
 *       "targetTotal": 24,
 *       "maxCourts": 1,
 *       "avoidImmediateRepeat": true
 *     }
 *   }
 *
 * Output: per-player rest counts + immediate partner-repeat violations.
 * Use this to sanity-check fairness before/after generator changes.
 */
import { readFileSync } from 'node:fs';
import { defaultSessionConfig, isValidTournament } from '../src/lib/defaults';
import { mulberry32 } from '../src/lib/random';
import { generateRound } from '../src/lib/teams';
import type { Player, Round, SessionConfig } from '../src/lib/types';

interface FixturePlayer {
  id?: string;
  name: string;
}

interface Fixture {
  seed?: number;
  rounds?: number;
  players: string[] | FixturePlayer[];
  config?: Partial<SessionConfig> & { tournament?: string };
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function parseFixture(path: string): Fixture {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Fixture;
  if (!raw.players?.length) {
    throw new Error('Fixture must include a non-empty "players" array.');
  }
  return raw;
}

function toPlayers(spec: Fixture['players']): Player[] {
  return spec.map((p, i) => {
    if (typeof p === 'string') {
      return { id: `p${i + 1}`, name: p, status: 'active' as const, bonus: 0 };
    }
    return {
      id: p.id ?? `p${i + 1}`,
      name: p.name,
      status: 'active' as const,
      bonus: 0,
    };
  });
}

const fixturePath = process.argv[2];
if (!fixturePath) {
  console.error('Usage: simulate <fixture.json> [--rounds N]');
  process.exit(1);
}

let roundOverride: number | undefined;
const roundsIdx = process.argv.indexOf('--rounds');
if (roundsIdx !== -1) {
  roundOverride = Number(process.argv[roundsIdx + 1]);
  if (!Number.isFinite(roundOverride) || roundOverride < 1) {
    console.error('--rounds must be a positive integer.');
    process.exit(1);
  }
}

const fixture = parseFixture(fixturePath);
const seed = fixture.seed ?? 1;
const roundCount = roundOverride ?? fixture.rounds ?? 10;
const rawCfg = { ...defaultSessionConfig(), ...fixture.config };
const config: SessionConfig = {
  ...rawCfg,
  tournament: isValidTournament(rawCfg.tournament ?? '')
    ? rawCfg.tournament
    : defaultSessionConfig().tournament,
};
const players = toPlayers(fixture.players);
const random = mulberry32(seed);

const rounds: Round[] = [];
let partnerRepeatViolations = 0;

for (let i = 0; i < roundCount; i++) {
  const { round, message } = generateRound({ players, rounds, config, random });
  if (!round) {
    console.error(`Round ${i + 1} failed: ${message ?? 'unknown'}`);
    process.exit(1);
  }

  if (config.avoidImmediateRepeat && rounds.length > 0) {
    const prev = rounds[rounds.length - 1]!;
    const prevPairs = new Set<string>();
    for (const g of prev.games) {
      prevPairs.add(pairKey(g.teamA.playerIds[0], g.teamA.playerIds[1]));
      prevPairs.add(pairKey(g.teamB.playerIds[0], g.teamB.playerIds[1]));
    }
    for (const g of round.games) {
      if (prevPairs.has(pairKey(g.teamA.playerIds[0], g.teamA.playerIds[1]))) {
        partnerRepeatViolations++;
      }
      if (prevPairs.has(pairKey(g.teamB.playerIds[0], g.teamB.playerIds[1]))) {
        partnerRepeatViolations++;
      }
    }
  }

  rounds.push(round);
}

const rests = new Map<string, number>();
for (const r of rounds) {
  for (const id of r.restingPlayerIds) {
    rests.set(id, (rests.get(id) ?? 0) + 1);
  }
}

const nameById = new Map(players.map((p) => [p.id, p.name]));
const activeCount = players.filter((p) => p.status === 'active').length;
const courts = Math.min(config.maxCourts, Math.floor(activeCount / 4));
const restsPerRound = activeCount - courts * 4;

console.log('── Simulation summary ──');
console.log(`Fixture:  ${fixturePath}`);
console.log(`Seed:     ${seed}`);
console.log(`Rounds:   ${roundCount}`);
console.log(`Players:  ${activeCount} active, ${courts} court(s), ${restsPerRound} rest(s)/round`);
console.log(
  `Config:   target=${config.targetTotal}, courts=${config.maxCourts}, format=${config.tournament}, avoidRepeat=${config.avoidImmediateRepeat}`,
);
console.log('');
console.log('Rest counts (lower = played more):');
const sorted = [...rests.entries()].sort((a, b) => a[1] - b[1]);
for (const [id, count] of sorted) {
  console.log(`  ${(nameById.get(id) ?? id).padEnd(16)} ${count}`);
}
// Players who never rested
for (const p of players) {
  if (!rests.has(p.id)) console.log(`  ${p.name.padEnd(16)} 0`);
}

  // Mexicano pairs by fixed rank seeding (1+4 vs 2+3) — repeats are
  // expected when the same quartet stays on a court. Only Americano /
  // Mix Americano honour avoidImmediateRepeat.
  const checkPartnerRepeats =
    config.avoidImmediateRepeat &&
    config.tournament !== 'mexicano';

  if (checkPartnerRepeats) {
    console.log('');
    console.log(`Immediate partner-repeat violations: ${partnerRepeatViolations}`);
    if (partnerRepeatViolations > 0) {
      console.error('FAIL: generator produced back-to-back partner repeats.');
      process.exit(1);
    }
    console.log('OK: no immediate partner repeats detected.');
  } else if (config.avoidImmediateRepeat && config.tournament === 'mexicano') {
    console.log('');
    console.log(
      'Partner-repeat check skipped (Mexicano uses ranking-based seeding).',
    );
  }
