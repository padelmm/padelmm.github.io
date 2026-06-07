import { useState } from 'react';
import { useSession } from '../lib/store';
import { APP_DEFAULTS, normalisePointsPerGame } from '../lib/defaults';
import { useTheme } from '../lib/use-theme';
import ImportSessionForm from './ImportSessionForm';
import NumberStepper from './NumberStepper';

export default function Setup() {
  const players = useSession((s) => s.players);
  const config = useSession((s) => s.config);
  const addPlayer = useSession((s) => s.addPlayer);
  const removePlayer = useSession((s) => s.removePlayer);
  const renamePlayer = useSession((s) => s.renamePlayer);
  const startSession = useSession((s) => s.startSession);
  const setConfig = useSession((s) => s.setConfig);

  const { resolved } = useTheme();
  const logoSrc = resolved === 'light' ? '/bl-logo-light.png' : '/bl-logo.png';

  const [name, setName] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  // Whether the "Custom" points stepper is shown. We initialise this
  // off the *persisted* target so a host whose previous session ended
  // with e.g. 26 lands back in Custom mode on their next setup.
  const [customPointsOpen, setCustomPointsOpen] = useState(
    !APP_DEFAULTS.pointsPerGameOptions.includes(
      config.targetTotal as (typeof APP_DEFAULTS.pointsPerGameOptions)[number],
    ),
  );

  const trimmed = name.trim();
  const duplicate = players.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase() && trimmed.length > 0,
  );
  const canAdd =
    trimmed.length > 0 && !duplicate && players.length < APP_DEFAULTS.maxPlayers;
  const canStart = players.length >= APP_DEFAULTS.minPlayers;

  const submit = () => {
    if (!canAdd) return;
    addPlayer(trimmed);
    setName('');
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-32 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="flex items-center gap-3">
        <img
          src={logoSrc}
          alt=""
          aria-hidden="true"
          className="block h-12 w-12 object-contain"
          draggable={false}
        />
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">Blue Lions</p>
          <h1 className="text-xl font-bold leading-tight">Mix &amp; Match</h1>
        </div>
      </header>

      <section className="glass flex flex-col gap-2 rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Continuing from another phone?</h2>
            <p className="text-[11px] text-slate-400">
              Paste a share code to pick up where the previous host left off.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition active:scale-95 hover:bg-white/10"
          >
            {importOpen ? 'Cancel' : 'Import session'}
          </button>
        </div>
        {importOpen && <ImportSessionForm />}
      </section>

      <section className="glass rounded-2xl p-4">
        <label className="block text-sm font-medium text-slate-300" htmlFor="player-name">
          Add player
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="player-name"
            type="text"
            inputMode="text"
            autoCapitalize="words"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Name"
            maxLength={24}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canAdd}
            className="rounded-xl bg-cyan-500/90 px-5 py-3 text-base font-semibold text-slate-900 shadow-lcd transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700/60 disabled:text-slate-500 disabled:shadow-none"
          >
            Add
          </button>
        </div>
        {duplicate && trimmed.length > 0 && (
          <p className="mt-2 text-xs text-amber-300">Name already in the list.</p>
        )}
        {players.length >= APP_DEFAULTS.maxPlayers && (
          <p className="mt-2 text-xs text-amber-300">
            Maximum is {APP_DEFAULTS.maxPlayers} players.
          </p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Players</h2>
          <span className="text-xs text-slate-400">
            {players.length} / {APP_DEFAULTS.maxPlayers} ·{' '}
            {Math.min(config.maxCourts, Math.floor(players.length / 4))} courts
          </span>
        </div>
        {players.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-6 text-center text-sm text-slate-400">
            No players yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {players.map((p, i) => (
              <li
                key={p.id}
                className="glass flex items-center gap-2 rounded-2xl px-3 py-2"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-300">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => renamePlayer(p.id, e.target.value)}
                  maxLength={24}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-base text-slate-100 focus:bg-black/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removePlayer(p.id)}
                  className="rounded-lg px-3 py-2 text-xs text-rose-300 transition active:scale-95 hover:bg-rose-500/10"
                  aria-label={`Remove ${p.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-300">Settings</h2>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Points per game</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              sum
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {APP_DEFAULTS.pointsPerGameOptions.map((n) => {
              const selected = !customPointsOpen && config.targetTotal === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setCustomPointsOpen(false);
                    setConfig({ targetTotal: n });
                  }}
                  className={
                    'h-9 min-w-[3rem] rounded-lg border px-2 text-sm font-medium transition ' +
                    (selected
                      ? 'border-cyan-400 bg-cyan-500/80 text-slate-900 shadow-lcd'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10')
                  }
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setCustomPointsOpen(true);
                // If the host had a preset selected, switch to the
                // nearest even custom value so the stepper has a sane
                // starting point.
                setConfig({
                  targetTotal: normalisePointsPerGame(config.targetTotal),
                });
              }}
              className={
                'h-9 rounded-lg border px-3 text-sm font-medium transition ' +
                (customPointsOpen
                  ? 'border-cyan-400 bg-cyan-500/80 text-slate-900 shadow-lcd'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10')
              }
            >
              Custom
            </button>
          </div>
          {customPointsOpen && (
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400">
                Custom value
                <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">
                  {APP_DEFAULTS.pointsPerGameMin}–{APP_DEFAULTS.pointsPerGameMax} · even
                </span>
              </span>
              <NumberStepper
                value={config.targetTotal}
                min={APP_DEFAULTS.pointsPerGameMin}
                max={APP_DEFAULTS.pointsPerGameMax}
                step={APP_DEFAULTS.pointsPerGameStep}
                onChange={(n) => setConfig({ targetTotal: n })}
                aria-label="Points per game"
                unit="pts"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span>Number of courts</span>
          <NumberStepper
            value={config.maxCourts}
            min={APP_DEFAULTS.courtsMin}
            max={APP_DEFAULTS.courtsMax}
            step={1}
            onChange={(n) => setConfig({ maxCourts: n })}
            aria-label="Number of courts"
          />
        </div>

        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">Avoid same partners in consecutive rounds</span>
          <input
            type="checkbox"
            checked={config.avoidImmediateRepeat}
            onChange={(e) => setConfig({ avoidImmediateRepeat: e.target.checked })}
            className="h-5 w-5 accent-cyan-500"
          />
        </label>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-white/10 bg-bl-navy/85 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-md">
        <button
          type="button"
          disabled={!canStart}
          onClick={startSession}
          className="w-full rounded-xl bg-emerald-500 px-4 py-4 text-base font-semibold text-slate-900 shadow-lcd-gold transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700/60 disabled:text-slate-500 disabled:shadow-none"
        >
          {canStart
            ? `Start session (${players.length} players)`
            : `Add ${APP_DEFAULTS.minPlayers - players.length} more player${
                APP_DEFAULTS.minPlayers - players.length === 1 ? '' : 's'
              }`}
        </button>
      </div>
    </div>
  );
}
