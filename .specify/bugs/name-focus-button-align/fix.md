# Bug Fix: Name-field focus and off-center +/− circles

- **Slug**: name-focus-button-align
- **Fixed**: 2026-09-27
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The blank Add player field on Setup and Players keeps the cursor after each name, so the next name can be typed without tapping the field again. Circled plus and minus controls draw a centred stroke instead of a font glyph, on the steppers, the score buttons, and the ranking bonus buttons. Renaming a name already in the list was left unchanged.

## Changes

| File                                              | Change   | Notes                                    |
| ------------------------------------------------- | -------- | ---------------------------------------- |
| `src/components/Setup.tsx`                        | modified | Refocus `#player-name` after Add / Enter |
| `src/components/Players.tsx`                      | modified | Same for `#add-player`                   |
| `src/components/CircleGlyph.tsx`                  | added    | Centred plus/minus strokes               |
| `src/components/NumberStepper.tsx`                | modified | Uses `CircleGlyph`                       |
| `src/components/ScoreSlider.tsx`                  | modified | Uses `CircleGlyph`                       |
| `src/components/Ranking.tsx`                      | modified | Bonus circles use `CircleGlyph`          |
| `src/components/name-focus-button-align.test.tsx` | added    | Focus and glyph markup                   |
| `vitest.config.ts`                                | modified | Include `*.test.tsx`                     |
| `CHANGELOG.md`                                    | modified | Unreleased notes; version not bumped     |

## Diff Highlights (optional)

Add player: Enter calls `preventDefault`, the Add button does not take focus on mouse down, and a successful add clears the draft then calls `focus()` inside the gesture plus once on the next frame.

`CircleGlyph` draws `M12 5v14M5 12h14` (plus) and `M5 12h14` (minus) in a 24×24 box, so both strokes pass through the centre. The button is `inline-flex items-center justify-center`. The SVG is `aria-hidden`; the button labels are unchanged.

## Tests Added or Updated

- `src/components/name-focus-button-align.test.tsx` — Setup keeps focus after Enter and after clicking Add; Players keeps focus after Add; a duplicate name is not added and the draft stays focused
- `src/components/name-focus-button-align.test.tsx` — stepper, score, and ranking bonus buttons contain a centred SVG path and no text glyph

## Local Verification

- Commands run: `npm test` → 81 passed; `npm run typecheck` → success
- Manual checks: not run in a browser. No browser tools were available in this session, so the phone keyboard and the on-screen position of the strokes were not looked at. The tests cover focus in happy-dom and that the strokes pass through the centre of the viewBox.

## Deviations from Assessment

- The open question was answered: focus is lost only on the blank Add player box, not while editing a name already in the list. `PlayerNameField` was not changed.
- The Add button also calls `preventDefault` on mouse down so the click does not move focus off the field. The assessment asked for `focus()` plus `requestAnimationFrame`; both are still there.
- `enterKeyHint="next"` was added on the two add inputs so the keyboard treats the field as another name, not the end of the form.
- `CHANGELOG.md` gained Unreleased notes. The version was not bumped, matching the project’s batching rule. The assessment did not list the changelog.

## Follow-ups

- `/speckit-bug-test slug=name-focus-button-align`
- On a phone, add several names with the Add button and confirm the keyboard stays open. happy-dom cannot show that.
