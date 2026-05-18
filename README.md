# Blue Lions · Padel Mix & Match

A tiny web app to run a Padel **Mix & Match avond** on one phone.
Random teams every round, simple 24-point scoring, live ranking.

**Open it:** <https://padelmm.github.io/>

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

Did the previous host hand you a `PADELMM/...` share code, or scan a QR
they showed you? On the Setup screen, tap **Import session** at the top,
paste the code into the box, and tap **Replace current session with
this**. (If you scanned the QR, the app opens with a confirmation screen
instead — just tap **Replace & open**.) The app jumps straight to the
Round view with all players, scores, and ranking already in place — no
need to add any players manually.

If the previous host sent you multiple messages labelled *part 1 of N*,
*part 2 of N*, etc., paste them all into the same box (any order, with
or without other chat in between) and the app will reassemble them.

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
to 24, and a fresh game opens at **12 : 12** with the slider centered.

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

Each game row has two small action buttons on the right:

- **✎ Edit** — expands an inline editor with tappable player chips and
  the score slider. Tap any chip to swap that player with anyone in the
  session (including players who were resting in that round). Score
  changes save instantly. Tap **Done** to collapse the editor.
- **🗑 Delete** — first tap turns the icon into **Sure?** for ~3 s; a
  second tap removes the game from the round entirely. Useful when a
  court fell through, or a game was recorded by mistake.

### ⚙️ Session

Tools for managing the session itself.

- **Copy session** — captures everything (players, scores, rounds,
  settings) and copies a compressed `PADELMM/v2/...` code to your
  clipboard. The Session menu shows three things after you tap it:
    - **QR code** — when the session fits a single message (almost
      always), point the next host's phone camera at it and they'll get
      a one-tap import link.
    - **Per-part Copy buttons** — when the session is unusually big
      (very long avond with hundreds of games), the code is split into
      smaller pieces that each fit in a single chat message. Tap each
      *Copy part N* button and send those messages one by one. The
      receiver pastes them all into Import in one go.
    - **Show share code text** — the raw text, in case you want to
      inspect it or paste it manually.
- **Import session** — paste any combination of share parts into the
  box and tap **Replace current session with this**. **Warning:** this
  overwrites whatever is on the current phone. If you're still missing
  parts, the form will tell you which ones.
- **Finish session (keeps ranking visible)** — locks the session as
  read-only. You can still browse Ranking and History; just no more
  rounds.
- **Clear games (keep players)** — wipes all rounds and scores but keeps
  the player list and settings. Handy for starting a fresh avond with the
  same group. Tap twice to confirm.
- **New mix & match (clear data)** — wipes everything and goes back to
  the Setup screen. Tap twice to confirm.
- **About** — re-opens the Blue Lions welcome panel (logo, name, version).
  Useful when handing the phone to someone for the first time, or just to
  re-check the app version.

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
