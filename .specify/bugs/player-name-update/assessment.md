# Bug Assessment: Cannot erase last character when renaming a player

- **Slug**: player-name-update
- **Created**: 2026-09-26
- **Source**: pasted text (`docs/tofix.txt` also notes the same: "user name change: first latter can not be erased" plus lost focus during typing)
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> when we try to update/change an already existing username, it is not possible to erase the very first character for example username "Alex" -> "A" can not be erases. slug=player-name-update

Related note in `docs/tofix.txt`:

> user name change: first latter can not be erased
> keep foucus on user name input during name input. currently the focus is lost after every input.

## Symptom

Editing an existing player name is a controlled input bound to `player.name`. Deleting down to a single character (e.g. `"Alex"` → `"A"`) works; deleting that last character does nothing — the field snaps back to `"A"`. Expected: the field can go empty while editing so the host can type a new name from scratch.

A related issue (same code path): each keystroke may drop focus from the name field because the store re-sorts the roster on every rename.

## Reproduction

1. Start or open a session with at least one player named e.g. `Alex`.
2. On **Setup** or **Players**, tap the name field.
3. Delete characters until only `A` remains — this works.
4. Delete `A`. The input stays `A`; the last character cannot be cleared.

Related (focus):

1. Rename a player so the A→Z order would change (e.g. `Zoe` → `Ann`).
2. After a character that changes sort position, the field can lose focus.

## Suspected Code Paths

- `src/lib/store.ts:164-171` — `renamePlayer` trims then **returns without updating** if the result is empty: `if (!name) return`. This is the last-character block.
- `src/lib/store.ts:167-170` — same action always calls `sortPlayersByName(...)` on every keystroke, which reorders `players` and can move the focused row.
- `src/components/Players.tsx:111-114` — controlled `<input value={p.name} onChange={renamePlayer(...)} />` (Players tab).
- `src/components/Setup.tsx:132-135` — same pattern on Setup.

## Root Cause Hypothesis

**Confidence: high.**

`renamePlayer` treats empty (and whitespace-only) input as invalid and no-ops. The UI is a **controlled** input whose `value` is `p.name`. When the host deletes the last remaining character, `onChange` fires with `""`, the store refuses the write, React re-renders with the previous name, and the last character reappears.

`trim()` also means a name of only spaces is rejected the same way. Duplicate-name checks are **not** applied on rename (only on `addPlayer`), so that is not the last-character failure.

The focus-loss note is a second defect on the same path: sorting the array on every `onChange` remounts/moves list items. Even with `key={p.id}`, moving the focused node in the DOM often drops caret/focus on mobile Safari.

## Proposed Remediation

**Preferred**: Split “draft while typing” from “commit a valid name”:

1. Allow `renamePlayer` to persist a non-empty trimmed name as today, but **do not reject intermediate empty input in the UI**. Keep a local draft in the input (or allow the store to hold `""` only as an in-progress edit that is **not** committed on blur if still empty).
2. Practical, small fix:
   - Stop calling `renamePlayer` with `trim()`-to-empty as a hard reject for the **controlled value**. Either:
     - **A (store):** persist `rawName` as-typed (no trim, allow `""` while editing); on **blur**, trim; if empty, restore previous name (or leave unchanged); if duplicate, flash and restore.
     - **B (UI):** local `draft` state per row; `onChange` only updates local state; `onBlur` calls `renamePlayer` with the trimmed name. Empty blur = keep old name.
   - Stop **re-sorting on every keystroke**. Sort on blur / after commit, or sort only when the committed name actually changed. That restores focus while typing.

**B is preferred** for the UI (local draft + blur commit) because it also fixes focus: the list does not reorder until the edit is finished. Keep `renamePlayer`’s empty-name guard so a persisted roster never has blank names.

**Alternatives**:
- Allow empty names in the store (bad — ranking/history would show blank chips).
- Debounce rename + sort (still blocks last character unless empty is allowed in the draft).

**Files likely to change**:
- `src/components/Players.tsx` — draft + blur commit; do not live-sort while focused.
- `src/components/Setup.tsx` — same.
- `src/lib/store.ts` — optionally stop sorting inside `renamePlayer`; sort after a committed rename, or expose `sortPlayersByName` at commit time only. Keep empty-name rejection for **committed** names.
- Tests under `src/lib/` if store behavior changes.

**Tests to add or update**:
- Store: `renamePlayer` with `""` does not persist a blank name (committed state).
- Store: `renamePlayer` with `"  Ann  "` stores `"Ann"` (if trim stays on commit).
- Component-level or store: renaming `"Alex"` through `"A"` then `""` then `"Bob"` results in `"Bob"` without getting stuck on `"A"`.
- Optional: after rename commit, roster is still A→Z.

## Risks & Considerations

- If empty is persisted even briefly, ranking/round chips could flash blank; prefer local draft or restore-on-blur.
- Duplicate names on rename are currently allowed; blur-commit is a good place to add a duplicate check if desired (out of scope unless we touch that path).
- Alphabetical order should still apply **after** a successful rename, not mid-keystroke.
- No schema / persistence migration required.

## Open Questions

- None required to fix the last-character bug.
- Optional: should rename also reject duplicate names (same as add)? Currently it does not.
