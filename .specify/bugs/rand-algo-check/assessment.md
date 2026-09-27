# Bug Assessment: Random draw clusters partners

- **Slug**: rand-algo-check
- **Created**: 2026-09-27
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> check randomization algo if that is optimal and good. i just have a feeling it may put same players in pairs more and other players don't play more. you don't have to agree with me. i need your objecting algo check. slug=rand-algo-check

## Symptom

On the default Americano draw (`mix-and-match`), who sits out is balanced. Who partners whom is not.

Across a normal night the same two players can team up several times while other pairs never happen. That is sampling variance from a shuffle that barely remembers history, not a generator that prefers particular names. Games played stay within one of each other for anyone who stays active the whole session.

Expected, if the format label is taken at its word ("Random fair rotation — new partners each round"), pair counts in a session would differ by at most one whenever a balanced schedule exists. The current draw does not do that.

## Reproduction

Checked by reading `generateAmericanoRound` / `generateMixAmericanoRound` and by running the real generators over seeded sessions (Mulberry32), not by guessing.

Americano, 8 active players, 2 courts, 10 rounds, `avoidImmediateRepeat: true`, 2000 seeds:

1. Every player plays all 10 rounds (nobody rests). Mean games per player index are identical (10.00).
2. Each round a player has one partner and seven possible partners, so a balanced schedule would put every pair together 1 or 2 times (expected 10/7 ≈ 1.43).
3. Observed maximum for any one pair, averaged over seeds: **3.41**. Histogram of that maximum: 2 times in 1.1% of sessions, 3 in 59.3%, 4 in 37.3%, 5 in 2.3%.
4. In 99.8% of those sessions at least one possible pair never occurs (count 0).
5. Immediate back-to-back partner repeats: **0** across 3600 round transitions. The 30-retry cap is not what produces the clustering at this size.

Same setup with the avoid-repeat toggle off is worse (mean max pair count 3.96, coefficient of variation 0.77 vs 0.66).

Play-count check, same generator, 400 seeds, 10 rounds:

| Roster | Courts | Rest slots / round | Games played, max − min | Mean games by player index |
| ------ | ------ | ------------------ | ----------------------- | -------------------------- |
| 8      | 2      | 0                  | 0                       | all 10.00                  |
| 10     | 2      | 2                  | 0                       | all 8.00                   |
| 12     | 2      | 4                  | 1                       | 6.62–6.71                  |
| 7      | 1      | 3                  | 1                       | 5.69–5.75                  |
| 16     | 3      | 4                  | 1                       | 7.45–7.54                  |

A 21-round Americano with 8 players (long enough that each pair should meet exactly 3 times) still averaged a max of 5.83 and a min of 0.54, and 47% of sessions still had a pair at 0. Longer nights shrink the relative spread; they do not reach a balanced design.

Mix Americano, 6 men + 6 women, 2 courts, 12 rounds, 300 seeds: the two men who rested together share a court on the next round **52.6%** of the time (1737/3300). If the four men who play were paired at random, that rate would be 1/3 ≈ 33%. Americano does not have this clump: with 10 players and 2 courts, co-resters share a court next round 38.0% of the time, next to the uniform 3/7 ≈ 42.9%.

Mexicano is a different rule. It rests the bottom of the ranking on purpose. With no scores recorded, name order is stable, so the same players sit every round. That is seeding, not the random draw.

## Suspected Code Paths

- `src/lib/teams.ts:145-163` — Americano. Shuffle, then stable-sort by rest count descending, then take the first `courts × 4` as playing. That part equalizes rests. Partners come from a second shuffle chunked into fours (`chunkInto`), rejected only when a partnership repeats the immediately previous round, and only for 30 tries.
- `src/lib/teams.ts:12-21` — Fisher–Yates. Correct unbiased shuffle. Not the source of the skew.
- `src/lib/teams.ts:48-55` and `src/lib/teams.ts:38-45` — repeat check looks only at partner pairs from `rounds[rounds.length - 1]`. No cumulative pair counts, no opponent counts.
- `src/lib/teams.ts:57-75` — inside each four, slots `[0,1]` vs `[2,3]` become the teams. Fair among permutations; no memory.
- `src/lib/teams.ts:264-306` — Mix Americano uses the same rest sort, then assigns courts in that queue order (men 0–1 on court 1, and so on). It does not reshuffle the picked players. Only two mixed pairings per court are considered, and the first is kept unless it repeats last round.
- `src/lib/defaults.ts:39-42` — Americano is described as "new partners each round." The code only tries to avoid last round's partners.
- `src/lib/teams.test.ts:187-217` — rest spread is tested (±2 slack on a 20-round run). No test that partner counts stay close over a session.
- `src/lib/teams.ts:174-209` — Mexicano ignores rest history and re-seeds 1+4 vs 2+3. Out of scope for the random-draw feeling, included so the two behaviors are not mixed up.

## Root Cause Hypothesis

Confidence: **high**.

Rest selection is optimal for a fixed active roster. Sorting "most rests first" and breaking ties with a shuffle keeps every active player's rest count within 1 of the others. Simulation never saw a larger gap. There is no player-index bias. The feeling that some people play less is not what this generator does, as long as they stay active for the whole session. Pausing removes someone from the active list without adding rests, so a returning player can sit extra rounds until their rest count catches up; that is separate from the shuffle.

Partner selection is memoryless apart from one round. Fisher–Yates makes every pairing equally likely in a single round, so nobody is favored in expectation. Over a short night the variance is large: a few pairs land on 3–5 meetings and many land on 0. Avoiding only the previous round removes back-to-back repeats (the retry cap did not fire in these runs) and does not pull the histogram toward 1-or-2.

Mix Americano adds a structural clump. Players who share the strictly highest rest count sit at the front of the gender queue and are dealt onto courts in that order. When exactly two men (or two women) are ahead, they are placed on the same court every time. That is why co-resters share a court ~53% of the time instead of ~33%.

## Proposed Remediation

**Preferred**: Keep most-rested-first for who plays. Change how teams are built.

For Americano, score candidate shuffles by the sum of how many times each formed partnership has already happened (opponents as a lighter second term if wanted). Draw on the order of a few dozen shuffles from the same RNG and keep the minimum-cost draw that also has no immediate repeat when one exists. A min-cost pairing on the same weights is the cleaner version if the search is too weak at 8–16 players. Target for tests: on 8 players, 2 courts, 7 rounds, every pair appears once (or the max−min of pair counts is at most 1).

For Mix Americano, stop dealing courts straight from the rest-sorted queue. Reshuffle each gender's picked players, or run the same cost search over opposite-gender partners, so two people who rested together are not glued to court 1.

**Alternatives**:

- Precompute a social-golfer schedule. Optimal when the roster and court count never change; breaks as soon as someone pauses, leaves, or the court count changes mid-session. The cost search survives that.
- Leave the draw as it is and only change the format description so it does not say "new partners each round." Honest, and it leaves the clustering the report describes.

**Files likely to change**:

- `src/lib/teams.ts`
- `src/lib/teams.test.ts`
- `src/lib/defaults.ts` (only if the description stays broader than the algorithm)
- `scripts/simulate-session.ts` (optional: print pair-count spread, not only immediate repeats)

**Tests to add or update**:

- Americano, 8 players, 2 courts, 7 rounds, fixed seed: each unordered pair appears exactly once, or max−min ≤ 1 if the implementation is a heuristic.
- Existing rest test stays green: over 20 rounds with 6 players and 1 court, rest counts differ by at most 1 (the current test allows ±2).
- Mix Americano, 6+6, 2 courts: rate that a resting male pair shares a court next round is near 1/3, not ~1/2, across many seeds.
- One regression that `avoidImmediateRepeat: false` still returns a full draw.

## Risks & Considerations

- Seeded draws will change. Tests that snapshot an exact pairing for a seed (`teams.test.ts` determinism test) need updating. Saved sessions are unaffected; only new rounds change.
- A harder "no repeat ever" constraint is impossible once rounds exceed the number of distinct partners. Optimize counts; do not fail the round.
- Manual swaps and re-shuffles already rewrite `restingPlayerIds` and partnerships. The next round should read that updated history, which the current rest counter already does.
- Cost: dozens of shuffles of at most 80 ids is negligible on a phone.
- No secrets, credentials, or certificates are involved. Randomness here is game mechanics (`Math.random` / Mulberry32), not a cryptographic key.

## Open Questions

- [NEEDS CLARIFICATION: none required to judge the algorithm. If a fix is implemented, confirm the host wants partner balance on Americano only, or on Mix Americano as well.]
