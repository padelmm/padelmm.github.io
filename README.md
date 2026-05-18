# Blue Lions · Padel Mix & Match

A tiny web app to run a Padel **Mix & Match avond** on one phone.
Random teams every round, simple 24-point scoring, live ranking.

**Open it:** <https://sedoychel.github.io/>

No account, no install required, no data leaves your phone.

---

## Install on your phone (optional, recommended)

The app works from any browser, but installing it gets you a real home-screen
icon and offline support.

- **iPhone (Safari)** — Share → *Add to Home Screen*.
- **Android (Chrome)** — ⋮ menu → *Install app* / *Add to Home screen*.

After installing, opening the icon launches it like a normal app, even with no
internet.

---

## Quick start (60 seconds to your first game)

1. **Open the app.** Tap **Tap to start** on the welcome screen.
2. **Add players.** Type a name, tap **Add**. Repeat for everyone (4–16).
3. (Optional) Pick **Max courts** (1–3) and toggle *Avoid same partners in
   consecutive rounds*.
4. Tap **Start session**.
5. Tap **Generate first round** to draw teams. Set each court's score and
   tap **Save score**. When every court is saved, tap **Generate next
   round** and keep going.

### Taking over from another host

Did the previous host hand you a `PADELMM/v1/...` share code? On the Setup
screen, tap **Import session** at the top, paste the code into the box,
and tap **Replace current session with this**. The app jumps straight to
the Round view with all players, scores, and ranking already in place —
no need to add any players manually.

---

## The screens

Once a session is running, five tabs sit along the bottom. The Blue Lions
strip at the top stays visible everywhere so you always know which app
you're in.

### 🎾 Round

This is where you play.

- **Generate first round / Generate next round** — draws fresh random
  teams across as many courts as you have players for (4 players per
  court). Anyone over capacity sits out; the app rotates the rest so the
  same people don't get parked. The button stays disabled (*"Save all
  scores to continue"*) until every court in the current round is saved.
- **⟳ Re-shuffle teams** — re-rolls the *current* round's teams. Only
  available before you've saved any scores for the round (otherwise the
  data you've already saved would be lost).
- **Tap a player chip** — opens a **Swap** sheet. Pick any other player
  (playing on another court, or resting) to swap places. You can't swap
  someone in a game whose score is already saved.

#### Entering scores

Each court shows a compact `A : B` scorebar. The two numbers always add up
to 24.

- **Slide** to set the score, or use the **− / +** buttons for fine
  adjustments.
- Enter just one side — the other auto-fills to make 24 (so if you set 17,
  the other team gets 7).
- Tap **Save score** when the score is final. To fix a mistake, tap
  **Edit score** on that court to re-open the slider.

The digits are color-coded: low scores glow cyan, high scores glow red,
12-12 sits in the middle as yellow.

### 👥 Players

Manage the roster mid-session without leaving the game.

- **Add player** — same as in Setup; new joiners start playing from the
  next round.
- **Rename** — just type into the name field.
- **Status**:
  - **Active** — included in upcoming rounds.
  - **Paused** — sits out the next rounds, but stays on the leaderboard.
    Use this for water breaks, phone calls, etc.
  - **Left** — has gone home. Skipped from rounds; their existing points
    stay on the board.

Toggle status back to **Active** at any time to bring someone back in.

### 🏆 Ranking

Always-on leaderboard, sorted by total points.

- The big number is **total points** = sum of game scores + any bonus you
  awarded.
- Tap a player row to expand it and use **−1 / +1** buttons to add or
  subtract **bonus points** manually. Useful for "best dressed," lateness
  penalties, or settling a disputed point.

Ties are broken by wins, then points-against (lower is better), then name.

### 📜 History

Scroll through every round of the session in reverse order, with
timestamps, who rested, and every saved score. The current round is
highlighted at the top.

### ⚙️ Session

Tools for managing the session itself.

- **Copy session** — generates a `PADELMM/v1/...` text code that captures
  everything (players, scores, rounds, settings) and copies it to your
  clipboard. Send it to the next host via any messenger.
- **Import session** — paste a share code into the box and tap **Replace
  current session with this**. **Warning:** this overwrites whatever is on
  the current phone.
- **Finish session (keeps ranking visible)** — locks the session as
  read-only. You can still browse Ranking and History; just no more
  rounds.
- **Clear games (keep players)** — wipes all rounds and scores but keeps
  the player list and settings. Handy for starting a fresh avond with the
  same group. Tap twice to confirm.
- **New mix & match (clear data)** — wipes everything and goes back to
  the Setup screen. Tap twice to confirm.

---

## Tips

- **One phone at a time.** The app saves to the phone it's running on.
  Two hosts on two phones will drift apart. Use **Copy session** to hand
  off between phones.
- **No internet needed** once the page has loaded once. The PWA caches
  itself; the next host can connect from court-side Wi-Fi or not at all.
- **Re-shuffle vs. swap.** Re-shuffle when the whole table feels off and
  nothing has been scored yet. Swap when you just want to move one or two
  people around.
- **Pausing.** Paused players step out of the rotation completely. When
  they un-pause they slot back in with whatever rest count they had
  before — no penalty, no freebie.

---

## Privacy

Everything lives in your browser's `localStorage`. The app has no server,
no analytics, no telemetry. The only way data leaves your phone is the
share-code you choose to copy and send.

To wipe a phone clean, use **Session → New mix & match** (or clear the
site data in your browser settings).

---

## For developers

Stack: Vite + React + TypeScript, Tailwind CSS, Zustand (with `persist`),
`vite-plugin-pwa`. Hosted on GitHub Pages, deployed automatically by
GitHub Actions from `.github/workflows/deploy.yml` on every push to
`main`.

```bash
npm install
npm run dev        # local dev server on http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm run typecheck  # tsc --noEmit only
```

For Pages deployment to work, the repo's **Settings → Pages → Source**
must be set to **GitHub Actions**.
