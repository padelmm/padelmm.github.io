# Test harness (PRD #7)

Two ways to verify round generation and share-code round-trips without
opening the app in a browser.

## Unit tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

Tests live next to the code they exercise (`src/lib/*.test.ts`).

## CLI tools

### Decode a share code → JSON

Paste a `PADELMM/v2/…` code (or a file containing one) and get the
session JSON on stdout. Useful for inspecting what a phone exported,
or building fixtures from a real mid-session handoff.

```bash
npm run decode-share -- "PADELMM/v2/..."
npm run decode-share -- path/to/code.txt
cat code.txt | npm run decode-share
```

Requires Node.js 18+ (`CompressionStream` for v2 gzip payloads).

### Simulate a session from a fixture

Run N rounds with a fixed seed and print rest-count fairness stats.
Exits non-zero if the generator produces back-to-back partner repeats
when `avoidImmediateRepeat` is enabled.

```bash
npm run simulate -- tests/fixtures/six-players.json
npm run simulate -- tests/fixtures/twelve-players.json --rounds 30
```

### Fixture format

```json
{
  "seed": 42,
  "rounds": 10,
  "players": ["Alice", "Bob", "Carol", "Dave"],
  "config": {
    "targetTotal": 24,
    "maxCourts": 1,
    "avoidImmediateRepeat": true
  }
}
```

`players` can also be an array of `{ "id": "p1", "name": "Alice" }`
objects. All fields except `players` have sensible defaults.

### Workflow: export → fixture → simulate

1. On a phone: Session → Copy session (or Show share code text).
2. On a dev machine: `npm run decode-share -- code.txt > session.json`
3. Trim `session.json` down to a fixture (players + config + seed).
4. `npm run simulate -- my-fixture.json --rounds 50`
