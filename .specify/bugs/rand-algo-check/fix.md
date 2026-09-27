# Bug Fix: Balance partner repeats in the draw

- **Slug**: rand-algo-check
- **Fixed**: 2026-09-27
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Who plays is still most-rested-first. Who partners whom is now the draw with the fewest repeat partnerships, using opponent history only to break ties. Mix Americano shuffles the men onto courts and then assigns women to keep man–woman partnerships even.

## Changes

| File                          | Change   | Notes                                                                             |
| ----------------------------- | -------- | --------------------------------------------------------------------------------- |
| `src/lib/teams.ts`            | modified | Americano and Mix Americano team selection                                        |
| `src/lib/teams.test.ts`       | modified | Rest spread tightened; partner-coverage, allow-repeats, and Mix court tests added |
| `src/lib/defaults.ts`         | modified | Americano description matches the balancer                                        |
| `scripts/simulate-session.ts` | modified | Prints the highest partner-repeat count                                           |

## Diff Highlights (optional)

Americano keeps the rest sort, then picks teams by history:

```ts
const games = balancedAmericanoGames(
  playingIds,
  rounds,
  config.avoidImmediateRepeat,
  initialScore,
  random,
);
```

Up to 12 players the search lists every perfect matching and keeps a minimum-cost one (partner count, then immediate repeats when the toggle is on). That matching is seated onto courts to minimise opponent repeats. Larger rosters sample shuffles and greedy matchings. A round is always produced; repeats are allowed once they cannot be avoided.

## Tests Added or Updated

- `src/lib/teams.test.ts` — 6 players, 1 court, 20 rounds: rest counts differ by at most 1.
- `src/lib/teams.test.ts` — 8 players, 2 courts, 7 rounds, seed 1: every unordered pair partners exactly once.
- `src/lib/teams.test.ts` — `avoidImmediateRepeat: false` still fills both courts.
- `src/lib/teams.test.ts` — Mix Americano, 6+6, 2 courts, 40 seeds: two men who just rested share a court next round between 15% and 45% of the time.

## Local Verification

- Commands run: `npx vitest run` → 11 files, 84 tests passed.
- Commands run: `npx tsc -b --pretty false --noEmit` → passed.
- Seeded sessions of the real generator after the change:
  - Americano, 8 players, 2 courts: 7 rounds puts every pair together once; 10 rounds stays at 1 or 2; 21 rounds puts every pair together exactly 3 times. Games played differ by 0. Immediate repeats: 0.
  - Americano, 12 players, 3 courts, 10 rounds (fixture seed 2025): highest partner count is 1. Rest spread is 0.
  - Mix Americano, 6+6, 2 courts, 80 seeds × 12 rounds: co-resters share a court next round 242/880 = 27.5% (a random pairing of four men is 33%; the old queue seating was 52.6%).
- A 12-player round after the first takes about 3–10ms here.
- Browser: no browser tools in this session, so the Play screen was not clicked through. The draw is covered by the unit tests and the session simulator.

## Deviations from Assessment

- Up to 12 playing players the fixer uses an exact minimum-cost matching (the assessment's fallback when a few dozen shuffles cannot guarantee the 7-round schedule). Above that it samples 32 shuffles and 32 greedy matchings.
- Opponent history breaks ties while seating the chosen matching. It does not re-rank every matching by its best seating.
- Mix Americano shuffles the playing men into courts, then searches women and the man–woman pairing. Court groups of men stay a random pairing, which is what keeps the co-rest rate near one third.

## Follow-ups

- `README.md` and `docs/features.md` still describe the toggle as back-to-back partners only. The toggle still does that; the new balance runs on every Americano and Mix Americano draw. A doc pass could say so.
