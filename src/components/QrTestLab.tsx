import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { exportSession } from '../lib/share';
import type { Game, Player, Round, SessionState } from '../lib/types';

/**
 * Hidden diagnostic page used to find the practical upper bound for how
 * much session data a single QR can carry from one phone's screen to
 * another phone's camera. Reachable via `/?lab=qr` — not linked from any
 * normal UI.
 *
 * For each test case we synthesize a realistic session, run it through
 * the production exportSession() pipeline, and render the resulting QR
 * at multiple display sizes so a host can scan each one and see at what
 * payload + size combination decoding starts to fail.
 */

interface TestCase {
  label: string;
  players: number;
  games: number;
}

const TEST_CASES: TestCase[] = [
  { label: 'Tiny — just-started session', players: 4, games: 0 },
  { label: 'Small — 1 round complete', players: 8, games: 3 },
  { label: 'Medium — 3 rounds', players: 12, games: 9 },
  { label: 'Standard — 5 rounds', players: 16, games: 15 },
  { label: 'Long — 8 rounds', players: 16, games: 24 },
  { label: 'Full 3-hour avond — 12 rounds', players: 16, games: 36 },
  { label: 'Marathon — 20 rounds (multi-chunk?)', players: 16, games: 60 },
];

// Sizes the host can compare side by side. Smallest is "would fit on a
// half-screen widget"; largest fills most of the phone screen.
const DISPLAY_SIZES = [200, 280, 360];

function makeTestSession(playerCount: number, gameCount: number): SessionState {
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
    id: 'p_' + Math.random().toString(36).slice(2, 11),
    name: `Player ${String.fromCharCode(65 + i)}`,
    status: 'active' as const,
    bonus: 0,
  }));

  const gamesPerRound = Math.min(3, Math.floor(playerCount / 4));
  const courts = gamesPerRound;
  const roundCount = gameCount === 0 ? 0 : Math.ceil(gameCount / gamesPerRound);
  const rounds: Round[] = [];
  let remaining = gameCount;

  for (let r = 0; r < roundCount; r++) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const gamesThisRound = Math.min(gamesPerRound, remaining);
    const games: Game[] = [];
    for (let c = 0; c < gamesThisRound; c++) {
      const p = c * 4;
      const scoreA = Math.floor(Math.random() * 25);
      games.push({
        id: 'g_' + Math.random().toString(36).slice(2, 11),
        court: c,
        teamA: {
          playerIds: [shuffled[p]!.id, shuffled[p + 1]!.id],
          score: scoreA,
        },
        teamB: {
          playerIds: [shuffled[p + 2]!.id, shuffled[p + 3]!.id],
          score: 24 - scoreA,
        },
        recorded: true,
      });
      remaining -= 1;
    }
    const restingPlayerIds = shuffled.slice(gamesThisRound * 4).map((p) => p.id);
    rounds.push({
      id: 'r_' + Math.random().toString(36).slice(2, 11),
      number: r + 1,
      games,
      restingPlayerIds,
      createdAt: Date.now() + r * 60_000,
    });
  }

  return {
    schemaVersion: 1,
    status: 'running',
    config: { targetTotal: 24, maxCourts: courts, avoidImmediateRepeat: true },
    players,
    rounds,
    createdAt: Date.now() - 60 * 60_000,
  };
}

interface CaseResult {
  spec: TestCase;
  rawJsonChars: number;
  isSingle: boolean;
  codeChars: number;
  url: string;
  qrVersion: number;
  modulesPerSide: number;
  svgBySize: Record<number, string>;
  error?: string;
}

async function buildCase(spec: TestCase): Promise<CaseResult> {
  const state = makeTestSession(spec.players, spec.games);
  const rawJsonChars = JSON.stringify(state).length;
  const exp = await exportSession(state);
  const url = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}#import=${exp.singleCode}`;
  try {
    // QRCode.create gives us the structural metadata (version + modules) so
    // we can show density numbers next to each QR.
    const obj = QRCode.create(url, { errorCorrectionLevel: 'L' });
    const svgBySize: Record<number, string> = {};
    for (const s of DISPLAY_SIZES) {
      svgBySize[s] = await QRCode.toString(url, {
        type: 'svg',
        errorCorrectionLevel: 'L',
        margin: 2,
        width: s,
        color: { dark: '#0c1a36', light: '#ffffff' },
      });
    }
    return {
      spec,
      rawJsonChars,
      isSingle: exp.isSingle,
      codeChars: exp.singleCode.length,
      url,
      qrVersion: obj.version,
      modulesPerSide: obj.modules.size,
      svgBySize,
    };
  } catch (e) {
    return {
      spec,
      rawJsonChars,
      isSingle: exp.isSingle,
      codeChars: exp.singleCode.length,
      url,
      qrVersion: -1,
      modulesPerSide: 0,
      svgBySize: {},
      error: (e as Error).message,
    };
  }
}

export default function QrTestLab() {
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [activeSizeByCase, setActiveSizeByCase] = useState<Record<string, number>>({});
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResults(null);
    Promise.all(TEST_CASES.map(buildCase)).then((rs) => {
      if (!cancelled) {
        setResults(rs);
        setActiveSizeByCase(Object.fromEntries(rs.map((r) => [r.spec.label, 280])));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [seed]);

  const headerStats = useMemo(() => {
    if (!results) return null;
    const fitting = results.filter((r) => r.isSingle && !r.error).length;
    return { total: results.length, fitting };
  }, [results]);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <header className="mb-4 flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">Diagnostic</p>
        <h1 className="text-xl font-bold">QR Test Lab</h1>
        <p className="text-xs text-slate-400">
          Each card shows a fake session of a given size. Scan each QR with another
          phone (camera app or the in-app Import scanner) and note the largest size
          your camera can still read.
        </p>
        {headerStats && (
          <p className="text-[11px] text-slate-500">
            {headerStats.fitting} of {headerStats.total} fit in a single QR.{' '}
            Anything bigger has to be chunked over text instead.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="rounded-lg bg-cyan-500/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lcd transition active:scale-95"
          >
            Regenerate
          </button>
          <a
            href="/"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition active:scale-95 hover:bg-white/10"
          >
            Back to app
          </a>
        </div>
      </header>

      {!results && (
        <p className="text-sm text-slate-400">Generating test sessions…</p>
      )}

      {results &&
        results.map((r) => {
          const activeSize = activeSizeByCase[r.spec.label] ?? 280;
          const svg = r.svgBySize[activeSize];
          // Approximate device-pixels per QR module at the chosen CSS size
          // and the iPhone's typical ~3x device-pixel ratio. This is just a
          // rough indicator — actual reading depends on viewing distance.
          const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
          const pxPerModuleCss =
            r.modulesPerSide > 0 ? (activeSize / r.modulesPerSide).toFixed(2) : '—';
          const pxPerModuleDevice =
            r.modulesPerSide > 0
              ? ((activeSize * dpr) / r.modulesPerSide).toFixed(2)
              : '—';

          return (
            <section
              key={r.spec.label}
              className="glass mb-3 flex flex-col gap-3 rounded-2xl p-3"
            >
              <header className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">{r.spec.label}</h2>
                <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                  {r.spec.players}p · {r.spec.games}g
                </span>
              </header>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <dt className="text-slate-500">Raw JSON</dt>
                <dd>{r.rawJsonChars.toLocaleString()} ch</dd>
                <dt className="text-slate-500">Compressed code</dt>
                <dd>
                  {r.codeChars.toLocaleString()} ch{' '}
                  {!r.isSingle && (
                    <span className="rounded bg-amber-500/20 px-1 text-[10px] text-amber-200">
                      multi-chunk
                    </span>
                  )}
                </dd>
                <dt className="text-slate-500">QR version</dt>
                <dd>
                  {r.qrVersion > 0 ? `v${r.qrVersion}` : '—'} · {r.modulesPerSide}×
                  {r.modulesPerSide} modules
                </dd>
                <dt className="text-slate-500">Density @ {activeSize}px</dt>
                <dd>
                  {pxPerModuleCss} css · {pxPerModuleDevice} device px/module
                </dd>
              </dl>

              {r.error && (
                <p className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/40">
                  Cannot render as a single QR: {r.error}
                </p>
              )}

              {svg && (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="inline-block overflow-hidden rounded-xl leading-none ring-1 ring-white/15 [&_svg]:block"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <div className="flex gap-1">
                    {DISPLAY_SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setActiveSizeByCase((m) => ({ ...m, [r.spec.label]: s }))
                        }
                        className={
                          'rounded-md px-2 py-1 text-[11px] font-medium transition ' +
                          (activeSize === s
                            ? 'bg-cyan-500 text-slate-900'
                            : 'bg-white/10 text-slate-200 hover:bg-white/15')
                        }
                      >
                        {s}px
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <details className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                <summary className="cursor-pointer text-[11px] text-slate-400">
                  Encoded URL ({r.url.length.toLocaleString()} ch)
                </summary>
                <textarea
                  readOnly
                  value={r.url}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-md bg-black/40 p-2 font-mono text-[10px] leading-tight text-slate-300"
                />
              </details>
            </section>
          );
        })}
    </main>
  );
}
