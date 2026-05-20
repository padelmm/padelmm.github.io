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

Did the previous host hand you a `PADELMM/...` share code? On the Setup
screen tap **Import session** at the top, paste the code into the box,
and tap **Replace current session with this**. The app jumps straight
to the Round view with all players, scores, and ranking already in
place — no need to add any players manually.

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

- **Slide toward a side to award that side points.** Drag right and the
  right team's score climbs (24 at the far right). Drag left and the left
  team climbs.
- The two **+** buttons next to the digits do the same thing one point at
  a time: left **+** awards a point to the left team, right **+** to the
  right team.
- Enter just one side — the other auto-fills to make 24 (so if you set 17,
  the other team gets 7).
- Tap **Save score** when the score is final. To fix a mistake, tap
  **Edit score** on that court to re-open the slider.

The colours follow the score live:

- **Digits** glow per their own value — 0 is cyan, 12 yellow, 24 red.
- **Slider track** is a live two-stop gradient: left end takes the colour
  of the left team's score, right end takes the colour of the right
  team's score. A blowout (24 : 0) shows red on the winning side and
  cyan on the losing side; a balanced 12 : 12 turns the whole track
  yellow.
- **Thumb glow** picks up the same colour at its current position, so it
  cools from red toward cyan as the score evens out.
- The scale under the slider reads **24 · 0 · 24** — the centre is a
  balanced draw, both edges are a maximum lead.

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

Ties are broken in this order: total points → wins → points-against
(lower is better) → games played (fewer is better, i.e. higher points
per game) → name.

#### Start final round

When you're ready to crown the avond, scroll to the bottom of the Ranking
tab and tap the gold **Start final round** button. It opens a preview
sheet showing exactly how the courts will be drawn, so you can eyeball
the matches before committing.

How the final is seeded:

- **Who plays.** The top `4 × Max courts` active players (so 12 with 3
  courts, 8 with 2, 4 with 1). The rest sit out for the round; their
  ranking and points are untouched.
- **Which court.** Strongest 4 share **Court 1** (the championship
  court), the next 4 share Court 2, and so on.
- **Which side.** Within each court the top and bottom seed pair up
  against the middle two — so on Court 1 it's `(rank 1 + rank 4)` vs
  `(rank 2 + rank 3)`, on Court 2 `(rank 5 + rank 8)` vs
  `(rank 6 + rank 7)`, and so on. That keeps each two-on-two match
  evenly weighted.

After you confirm, the final lands as a new round with a gold accent and
a **FINAL** badge — visible on the Round tab while you play it and in
History afterwards. Final scores count toward the leaderboard exactly
like any other round.

Conditions for the button to be enabled (it tells you which one is
missing if it's disabled):

- the session is running,
- at least one game has been saved (so a ranking actually exists),
- enough active players for `4 × Max courts`,
- no final has been played in this session yet.

Only **one final per session.** If you want another one with the same
group, use **Session → Clear games** to wipe scores while keeping the
roster, then play and finalise again.

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
  clipboard. Paste it into any messenger to hand the session over.
    - When the code is too long for a single chat message (typical for
      sessions with many recorded games), the Session menu splits it
      into smaller *part 1 of N*, *part 2 of N*, … pieces and shows a
      per-part **Copy** button. Send each part as its own message.
    - A **Show share code text** drawer below lets you inspect or copy
      the raw text directly.
- **Import session** — paste any combination of share parts into the
  text box and tap **Replace current session with this**. The form
  tolerates extra chat around the code and tells you which parts are
  still missing if it's incomplete. **Warning:** importing overwrites
  whatever is on the current phone.
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
- **Final round vs. last normal round.** The Final is deterministic
  (best 4 on Court 1, top + bottom pair on each court). A normal round
  is randomly shuffled. If you'd rather end on a random round, just keep
  hitting *Generate next round* — the Final button is opt-in.

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
