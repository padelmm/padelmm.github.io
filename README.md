# Padel Mix & Match

Mobile-first PWA to run a 3-hour Padel **Mix & Match** session entirely on one phone.

**Live:** <https://sedoychel.github.io/>

## Features

- 4 to 16 players, up to 3 courts
- Random teams every round (with optional "don't repeat last round's partners")
- Fair rotation of who sits out
- Simplified scoring: every game totals 24 points (e.g. `17:7`, `12:12`)
- Pause / unpause players who take a break — they're skipped until they return
- Live total-points ranking, always visible
- Works **offline** once loaded (PWA, installs to home screen)
- No accounts, no backend, no cost — all state lives on the host phone in `localStorage`

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v3
- [Zustand](https://github.com/pmndrs/zustand) with `persist` middleware → `localStorage`
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (service worker, manifest)
- Deployed via GitHub Actions to [GitHub Pages](https://pages.github.com/) (free).

## Development

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev        # local dev server on http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm run typecheck  # tsc --noEmit only
```

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes `dist/` to GitHub Pages.

For this to work, the repo's **Settings → Pages → Source** must be set to
**GitHub Actions** (not "Deploy from a branch").

## Privacy

The app stores its session data only in the browser's `localStorage`. Nothing is
ever uploaded. To wipe a session, use **Session → New mix & match**.
