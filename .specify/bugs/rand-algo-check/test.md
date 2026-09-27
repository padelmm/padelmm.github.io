# Bug Verification: Partner balance in the draw

- **Slug**: rand-algo-check
- **Tested**: 2026-09-27
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The reported clustering does not reproduce on the assessment's 8-player, 10-round Americano night: every pair meets 1 or 2 times, nobody is left at 0, and games played stay equal. Mix Americano no longer seats co-resters together about half the time. The full suite and typecheck pass.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Seeded `generateAmericanoRound` / `generateMixAmericanoRound` over the assessment sizes | pass | Same generator the assessment measured |
| New / updated tests | `npm test -- --run src/lib/teams.test.ts` | pass | 22 tests, including the 7-round seed and the Mix court-rate test |
| Regression suite | `npm test -- --run` | pass | 11 files, 84 tests |
| Lint / type-check | `npm run typecheck` | pass | `tsc -b --noEmit` |

## Output Excerpts

```
Test Files  1 passed (1)
     Tests  22 passed (22)

Test Files  11 passed (11)
     Tests  84 passed (84)

> tsc -b --noEmit
```

Post-fix simulation (assessment case was max pair 3.41 and a missing pair in 99.8% of sessions):

```
A8-2c-10r-avoid | seeds=200 | pairMaxAvg=2.00 | pairMinAvg=1.00 | sessionsWithZero=0 | gamesSpreadAvg=0.00 | immediateRepeats=0/1800
A8-2c-21r       | seeds=20  | pairMaxAvg=3.30 | pairMinAvg=2.70 | sessionsWithZero=0 | gamesSpreadMax=0
A12-2c-10r      | seeds=40  | pairMaxAvg=1.00 | pairMinAvg=0.00 | gamesSpreadAvg=1.00 | immediateRepeats=0/360
A16-4c-10r      | seeds=10  | pairMaxAvg=1.00 | pairMinAvg=0.00 | gamesSpreadAvg=0.00 | immediateRepeats=0/90
mix-6+6-2c co-rest same court 245/880 = 27.8%
```

Before the fix, that Mix rate was 52.6%. A random pairing of the four men who play is 33%.

## Residual Risks

- A 7-round, 8-player night is a perfect "everyone partners once" schedule on the locked seed (`mulberry32(1)`). On 6 of 30 other seeds the minimum-cost matchings leave no unused perfect matching by round 6, so one pair sits at 2 and one at 0 until later rounds. By round 10 those sessions are back to 1 or 2, with no pair at 0 (0 of 200 seeds).
- Above 12 players on court the draw samples shuffles instead of listing every matching. A 16-player, 4-court, 10-round sample still never repeated a partnership.
- The Play screen was not clicked in a browser. The draw itself is what the simulator and unit tests exercise.

## Recommendation

Close the bug. The night the report described (8 players, 2 courts, 10 rounds) now keeps partnerships within one of each other, and playing time was already even. Ship as patch 0.6.4.
