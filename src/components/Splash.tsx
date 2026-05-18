interface Props {
  onContinue: () => void;
}

export default function Splash({ onContinue }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between px-6 py-10">
      <div className="flex-1" />

      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <div className="glass-strong relative grid h-40 w-40 place-items-center overflow-hidden rounded-3xl p-3 shadow-glass">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-400/20 via-transparent to-amber-300/10" />
          <img
            src="/bl-logo.jpeg"
            alt="Blue Lions logo"
            width={128}
            height={96}
            className="h-full w-full rounded-2xl object-contain mix-blend-screen drop-shadow-[0_0_18px_rgba(34,211,238,0.25)]"
          />
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Blue Lions</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-slate-50">
            Mix &amp; Match
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-amber-300/80">avond</p>
        </div>

        <p className="px-2 text-center text-sm text-slate-400">
          Random teams. Scores to 24. Live ranking — all on this phone.
        </p>
      </div>

      <div className="mt-8 w-full max-w-sm">
        <button
          type="button"
          onClick={onContinue}
          className="glass-strong w-full rounded-2xl px-6 py-4 text-base font-semibold tracking-wide text-cyan-200 shadow-lcd transition active:scale-[0.98]"
        >
          Tap to start
        </button>
        <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-slate-500">
          v0.1 · offline-first · no accounts
        </p>
      </div>
    </div>
  );
}
