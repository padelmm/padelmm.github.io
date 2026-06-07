---
name: versioning-and-releases
description: Semantic versioning rules, changelog conventions, and release workflow for Padel Mix & Match. Use when bumping the version, writing CHANGELOG entries, deciding patch vs minor vs major, or shipping a release commit.
---

# Versioning & Releases

The app uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
The single source of truth is `package.json#version`, surfaced into the
bundle at build time via `__APP_VERSION__` (see `vite.config.ts`).

## When to bump

While in the `0.x.y` line:

| Bump                          | When to use it                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PATCH** (`0.2.0` → `0.2.1`) | Bug fixes only. No new user-visible features, no schema changes.                                                                                         |
| **MINOR** (`0.2.0` → `0.3.0`) | New features, UX changes, refactors. Backward-compatible session imports. **Batch multiple features per minor — a "day's work" maps to one minor bump.** |
| **MAJOR** (`0.x.y` → `1.0.0`) | First "stable" release: data schema and IA frozen. Or: an export from an older minor cannot be imported.                                                 |

The project explicitly batches features. Don't bump twice in one day for
related work — accumulate the changes in `## [Unreleased]` then promote
them to a single dated `## [0.x.0]` section when committing.

## Where the version lives

1. **`package.json#version`** — primary source.
2. **`vite.config.ts`** — reads `package.json` and exposes `__APP_VERSION__`.
3. **`src/vite-env.d.ts`** — TypeScript declaration of the global.
4. **`src/components/Splash.tsx`** — renders `v{__APP_VERSION__}` in the
   About panel footer.

**Never hardcode a version string in components.** If a new surface
needs the version, read `__APP_VERSION__`.

## CHANGELOG conventions

`CHANGELOG.md` at the repo root follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Section template:

```markdown
## [0.X.0] — YYYY-MM-DD

Focus of this release: <one-sentence theme>.

### Added
- New feature, what it does, *why* the host cares.

### Changed
- Refactor or behaviour tweak that is visible.

### Fixed
- Bug fix — short, neutral language.

### Removed
- Anything cut.

### Security
- Anything privacy- or secrets-related.
```

Only include subsections you have entries for. Always close the release
out with link references at the bottom of the file (`[0.X.0]: <diff URL>`)
so GitHub auto-renders comparison links.

## Release workflow

Run from repo root, on `main`:

```bash
# 1. Confirm no uncommitted work
git status

# 2. Move "Unreleased" entries to a new dated section in CHANGELOG.md
#    + add the diff link at the bottom

# 3. Bump the version (no leading 'v' in package.json)
npm version minor   # or patch / major; creates a git tag like v0.3.0

# 4. Push commit + tag
git push --follow-tags
```

`npm version` automatically:
- Updates `package.json#version`.
- Creates a commit `0.3.0` (configurable with `npm config set tag-version-prefix ''`).
- Creates a git tag `v0.3.0` pointing at that commit.

If you want to amend `npm version`'s commit message or include the
CHANGELOG edit in the same commit, run `git add CHANGELOG.md` and use
`npm version minor -m "Release v%s — short summary"` so `%s` is replaced
with the new version.

## What goes in [Unreleased]

Update `CHANGELOG.md`'s `## [Unreleased]` section *as features land in
`main`*, not in batches at the end. The discipline keeps the next release
notes accurate even months later.

A short bullet of one or two lines is enough. The full PR description /
commit body is the long-form record; the changelog is the human summary.

## Anti-patterns

- ❌ Bumping the patch number for a small feature. Use minor.
- ❌ Bumping major just because it feels like a milestone. `1.0.0`
  signals stability; don't burn it on a normal feature push.
- ❌ Writing `v0.3` instead of `v0.3.0`. Always three components.
- ❌ Editing past dated sections. They are immutable historical record.
  If something is wrong, add a corrective note under the next release.
- ❌ Hardcoding the version anywhere outside `package.json`.
