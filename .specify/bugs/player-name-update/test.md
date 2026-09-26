# Bug Verification: Player rename last character, focus, and duplicates

- **Slug**: player-name-update
- **Tested**: 2026-09-26
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The original last-character / empty-name failure does not reproduce at the commit layer: `applyPlayerRename("", …)` leaves the roster unchanged, and a following unique name (`Cara`) applies. `PlayerNameField` writes only a local draft on each keystroke, so the store no longer blocks deleting `"A"`. Full unit suite and typecheck pass. In-browser Setup/Players click-through was **not** run (no browser automation in this session), so the result is partial rather than verified end-to-end.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Automated equivalent: `applyPlayerRename` empty then unique; inspect `PlayerNameField` `onChange` → `setDraft` only | pass | Original UI steps (tap Setup/Players, delete last char) not clicked in a browser |
| New / updated tests | `npm test -- --run src/lib/players.test.ts` | pass | 7 tests (empty, trim, duplicate, empty-then-Cara) |
| Regression suite | `npm test -- --run` | pass | 10 files, 76 tests |
| Lint / type-check | `npm run typecheck` | pass | `tsc -b --noEmit` |

## Output Excerpts

```
Test Files  1 passed (1)
     Tests  7 passed (7)

Test Files  10 passed (10)
     Tests  76 passed (76)

> tsc -b --noEmit
```

`PlayerNameField` `onChange` only calls `setDraft`; `renamePlayer` runs on blur/Enter after non-empty unique draft. Empty blur restores the previous `name`. Duplicate blur returns `false` and refocuses.

## Residual Risks

- Mobile Safari focus/refocus on duplicate blur was not exercised in a device browser.
- Draft vs store can diverge until blur; ranking chips still show the committed name until then (intentional).

## Recommendation

Ship as a patch — automated commit rules match the assessment, and the live input no longer binds `value` to a store that rejects `""`. Optional follow-up: one Setup + Players pass on an iPhone to confirm caret/refocus. Do not reopen the bug on current evidence.
