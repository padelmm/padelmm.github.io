import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  /** The full deep-link URL to embed, e.g. https://padelmm.github.io/#import=PADELMM/v2/... */
  url: string;
  /** Pixel size of the SVG. Defaults to 280 — comfortable on phone screens. */
  size?: number;
}

/**
 * Renders the share URL as a scannable QR code.
 *
 * QR code constraints: a single byte-mode QR can hold at most ~2,953 bytes
 * with error correction level L. Our compressed share codes are typically
 * 2–2.5 KB plus the app URL prefix (~30 chars), so they fit. If the payload
 * is too big, qrcode.toString throws and we render a friendly fallback.
 *
 * Layout note: the wrapper uses `inline-block` + `leading-none` and the SVG
 * is forced to `display: block`. That makes the wrapper shrink-wrap the SVG
 * exactly, so the white card hugs the QR with no padding mismatch.
 */
export default function ShareQr({ url, size = 280 }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setErr(null);
    QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'L',
      margin: 2,
      width: size,
      color: { dark: '#0c1a36', light: '#ffffff' },
    })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message || 'QR generation failed');
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (err) {
    return (
      <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">
        Session too big for a single QR ({err}). Use the text share instead.
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-white/5 text-xs text-slate-400"
        style={{ width: size, height: size }}
      >
        Generating…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/*
        Wrapper is inline-block + leading-none so it sizes exactly to the SVG.
        overflow-hidden + rounded-xl clips the SVG's white background to the
        rounded card. dangerouslySetInnerHTML is safe here because the SVG is
        generated locally from data we fully control (a deep-link URL plus our
        own base64 payload), so there's no user-supplied markup in the source.
      */}
      <div
        className="inline-block overflow-hidden rounded-xl leading-none ring-1 ring-white/15 [&_svg]:block"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-center text-[11px] text-slate-400">
        Scan with the other phone&apos;s camera or with the in-app{' '}
        <span className="text-slate-300">Scan QR</span> button.
      </p>
    </div>
  );
}
