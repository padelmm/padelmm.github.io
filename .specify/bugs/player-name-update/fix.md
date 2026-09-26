# Bug Fix: Player rename last character, focus, and duplicates

- **Slug**: player-name-update
- **Fixed**: 2026-09-26
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Rename is now a local draft that commits on blur/Enter. Empty drafts restore the previous name (so `"Alex"` can be wiped and retyped). The roster only re-sorts after a successful unique commit, which keeps focus while typing. Duplicate names are rejected the same way as Add; a clash keeps the field focused.

## Changes

| File                                 | Change                                             | Notes                                                              |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/players.ts`                 | added `isDuplicatePlayerName`, `applyPlayerRename` | Shared commit rules; sort only on success                          |
| `src/lib/players.test.ts`            | added tests                                        | Empty, trim, duplicate, empty-then-new-name                        |
| `src/lib/store.ts`                   | modified `renamePlayer` / `addPlayer`              | Rename returns `{ ok, reason? }`; add uses shared duplicate helper |
| `src/components/PlayerNameField.tsx` | added                                              | Draft + blur commit; duplicate keeps focus                         |
| `src/components/Setup.tsx`           | modified                                           | Uses `PlayerNameField`                                             |
| `src/components/Players.tsx`         | modified                                           | Uses `PlayerNameField`                                             |
| `CHANGELOG.md`                       | modified                                           | Unreleased notes                                                   |

## Diff Highlights (optional)

`applyPlayerRename` rejects `""` / whitespace and case-insensitive duplicates; UI never writes those keystrokes to the store.

`PlayerNameField` on blur: empty → restore previous; duplicate → `focus()` again; unique → `renamePlayer`.

## Tests Added or Updated

- `src/lib/players.test.ts` — `isDuplicatePlayerName` ignores self, detects clash
- `src/lib/players.test.ts` — `applyPlayerRename` empty / `"  Ann  "` / duplicate / empty-then-`Cara`

## Local Verification

- Commands run: `npm test -- --run` → 76 passed; `npm run typecheck` → success
- Manual checks: not run in browser this pass (no component test harness)

## Deviations from Assessment

- Duplicate rejection on rename was listed as optional; the user confirmed it for this fix.
- User asked to keep focus unless a unique new name is typed: implemented by not committing/sorting until then, and by refocusing on duplicate blur.
- Extracted `PlayerNameField` (not listed in assessment) so Setup and Players share one draft/commit path.

## Follow-ups

- `/speckit-bug-test slug=player-name-update`
- Optional: Escape already cancels the draft; worth a short Players-tab hint if hosts miss it.
