# Bug Assessment: Name-field focus and off-center +/− circles

- **Slug**: name-focus-button-align
- **Created**: 2026-09-27
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> fixing some visuals
> 1. keep input foucus on user name input during name input. currently the focus is lost after every username input.
> 2. there multiple + and - buttons in drawn in the circles on different pages. the drawing are missliged, + and - are not in the circuit center

## Symptom

While the host is entering player names, the name field loses focus after each name is submitted, so the next name cannot be typed until the field is tapped again. Expected: the caret stays in the name input for the whole add-names pass.

Separately, circular `+` and `−` controls on several screens draw the glyph off the centre of the circle. Expected: the mark sits in the geometric centre of the circle on every page that uses those buttons.

## Reproduction

Focus:

1. Open **Setup** (or **Players** during a session).
2. Tap the “Add player” / “Add a new player” field and type a name.
3. Submit with **Add** or the keyboard return key.
4. The field clears. Focus is no longer in the input; the keyboard typically dismisses. The next name requires another tap.

[NEEDS CLARIFICATION: whether focus also drops on every keystroke inside an existing name. Rename fields already keep a local draft and do not write the roster until blur/Enter, so per-character loss is not explained by the current rename path.]

Alignment:

1. Open **Setup** and expand custom points, or look at **Number of courts** — the `−` / `+` circles on `NumberStepper`.
2. Open **Round** (Play), **History**, or the add-game sheet — the two `+` circles on `ScoreSlider`.
3. Open **Ranking**, expand a player, and look at the bonus `−` / `+` circles.
4. The glyph sits off the circle centre (and `+` and `−` do not share the same optical centre).

## Suspected Code Paths

- `src/components/Setup.tsx:30-34` — `submit()` calls `addPlayer` and `setName('')` and never focuses `#player-name` again.
- `src/components/Setup.tsx:76-98` — add-player `<input>` has no ref; the **Add** button takes the click, which blurs the field.
- `src/components/Players.tsx:34-38` and `src/components/Players.tsx:58-80` — same pattern for `#add-player`.
- `src/components/PlayerNameField.tsx:49-90` — rename draft; `onChange` only updates local state. Focus is restored only when a duplicate commit fails (`requestAnimationFrame` + `focus()`). A successful Enter blurs on purpose.
- `src/components/NumberStepper.tsx:120-128` and `src/components/NumberStepper.tsx:175-183` — `h-9 w-9 rounded-full … leading-none` buttons whose children are the text glyphs `−` and `+`, with no flex/grid centring.
- `src/components/ScoreSlider.tsx:46-72` — same button classes; both circles render `+` (left team / right team). Used from `Play.tsx`, `History.tsx`, and `AddGameSheet.tsx`.
- `src/components/Ranking.tsx:185-208` — bonus `−` / `+` use `grid place-items-center`, which centres the em box, not the ink of the glyph.

## Root Cause Hypothesis

**Confidence: high** for both symptoms as stated.

**Focus.** The add-player inputs are controlled local state. Submitting does not keep them focused. Tapping **Add** moves focus to the button (standard click behaviour). Pressing return does not call `preventDefault` and does not re-focus; on a phone the return key dismisses the keyboard. Nothing in `submit` / `submitAdd` puts the caret back, so every completed username ends the editing session. Rename is a different control (`PlayerNameField`): keystrokes stay local, and the roster re-sorts only after a successful commit, which was the earlier `player-name-update` fix. That path does not explain “after every username” on the add field.

**Alignment.** Circle buttons paint a font glyph (`+` U+002B, `−` U+2212) inside a fixed square. `NumberStepper` and `ScoreSlider` do not centre that text (`button` stays inline content; `leading-none` tightens the line box to the em square, so the baseline sits low in the 36px circle). System UI fonts also place `+` and `−` on different vertical axes inside the em box, so the two marks do not line up with each other or with the circle. Ranking’s `place-items-center` centres the line box only; the ink is still optically off because of those font metrics. The app uses the system sans (`src/index.css` `font-family`), so the offset varies by OS but is present on iOS and desktop.

## Proposed Remediation

**Preferred**:

1. **Keep the add-name caret.** Give `#player-name` and `#add-player` a ref. After a successful add, clear the draft and call `focus()` (use `requestAnimationFrame` so it wins over the button click). On Enter, `preventDefault()` and follow the same path. Leave `PlayerNameField` as the rename control: it should stay focused while typing and blur only on a successful commit or Escape.
2. **Centre the marks with drawing, not font glyphs.** Replace the text `+` / `−` with a small inline SVG (or a shared button) whose strokes are centred in the viewBox, and lay the button out with `inline-flex items-center justify-center`. Use one shared class or component so Setup steppers, score circles, and ranking bonus buttons match. Keep the existing hit size (`h-9 w-9` or `h-12 w-12`), colours, and `aria-label`s.

**Alternatives**:
- CSS-only nudge (`inline-flex items-center justify-center` plus a per-glyph `translate`). Faster, but the offset still depends on the OS font and `+` vs `−` will not match. SVG is more reliable across the pages the report calls out.
- Refocus only on Enter and not on the **Add** tap. That leaves the common phone path (tap Add) broken.

**Files likely to change**:
- `src/components/Setup.tsx`
- `src/components/Players.tsx`
- `src/components/NumberStepper.tsx`
- `src/components/ScoreSlider.tsx`
- `src/components/Ranking.tsx`
- A small shared circle-button (new file or a class in `src/index.css`) if the three call sites should not duplicate the SVG

**Tests to add or update**:
- There is no component test harness (Vitest covers `src/lib/` only). Verify in the browser: add several names on Setup and on Players without re-tapping the field; confirm rename of an existing name still keeps the caret while typing and still blurs after a unique commit.
- Visually check circle centres on Setup (courts / custom points), Round, History or add-game, and Ranking bonus, in dark and light theme.

## Risks & Considerations

- Refocusing after **Add** must not trap focus when the roster is full or the name is a duplicate (those submits no-op today; only refocus after a real add, or refocus whenever the field should stay the editing target — duplicate already shows an inline warning and the draft is kept).
- Do not refocus in a way that fights `PlayerNameField`’s intentional blur on a successful rename.
- SVG buttons must keep the current accessible names (`Decrease …`, `Award a point to the left team`, bonus labels). Decorative SVG should be `aria-hidden`.
- No data model, persistence, or API change.

## Open Questions

- [NEEDS CLARIFICATION: if the caret also jumps away on each character while editing an existing name (Setup list or Players list), say which screen. Current `PlayerNameField` does not write the store on each keystroke.]
