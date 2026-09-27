# Bug Verification: Name-field focus and centered +/− circles

- **Slug**: name-focus-button-align
- **Tested**: 2026-09-27
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

All automated checks pass: both add-player fields retain DOM focus after submission, the circle controls use centered SVG paths, the full test suite passes, and the application type-checks and builds. Verification is partial because a real phone/browser was not available to confirm that the software keyboard stays open or to visually inspect the controls in dark and light themes.

## Checks Performed

| Check                                     | Command / Action                                                             | Result  | Notes                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Focus reproduction (automated equivalent) | `npx vitest run src/components/name-focus-button-align.test.tsx`             | pass    | Setup retains focus after Enter and Add; Players retains focus after Add; duplicate draft remains focused    |
| Circle alignment (automated geometry)     | `npx vitest run src/components/name-focus-button-align.test.tsx`             | pass    | Stepper, score, and ranking controls use `inline-flex` centering and paths crossing the 24×24 viewBox centre |
| Phone keyboard reproduction               | Add several names on a physical phone                                        | not-run | No browser or physical-device tooling was available                                                          |
| Visual reproduction                       | Inspect Setup, Round, History/add-game, and Ranking in dark and light themes | not-run | SVG geometry is covered, but appearance was not visually inspected                                           |
| Regression suite                          | `npm test`                                                                   | pass    | 11 files and 81 tests passed                                                                                 |
| Type-check                                | `npm run typecheck`                                                          | pass    | TypeScript completed with no errors                                                                          |
| Production build                          | `npm run build`                                                              | pass    | Vite transformed 84 modules and generated the PWA bundle                                                     |
| IDE diagnostics                           | Read diagnostics for all changed TypeScript/TSX files and Vitest config      | pass    | No linter errors found                                                                                       |

## Output Excerpts

Targeted regression:

```text
Test Files  1 passed (1)
Tests       5 passed (5)
```

Full regression:

```text
Test Files  11 passed (11)
Tests       81 passed (81)
```

Build:

```text
✓ 84 modules transformed.
✓ built in 605ms
PWA v0.20.5
```

## Residual Risks

- happy-dom verifies that the input owns `document.activeElement`, but it cannot prove that iOS or Android keeps the software keyboard visible after Add or Return.
- The SVG strokes mathematically cross the centre of their viewBox, but no visual check was made at the rendered 36px and 48px sizes.
- Dark- and light-theme contrast and optical appearance still need a short browser check.

## Recommendation

Hold final closure until a host performs a brief phone check: add at least three names using both Return and Add without re-tapping the input, then inspect the plus/minus circles on Setup, Round, History/add-game, and Ranking in both themes. If those checks pass, close the bug; no additional automated remediation is indicated.
