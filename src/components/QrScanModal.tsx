import { useEffect, useRef, useState } from 'react';
// jsQR is loaded on demand via a dynamic import in the effect below so the
// ~45 KB gzipped decoder is only fetched when a host actually opens the
// scanner. Keeps the initial PWA bundle small.
type JsQRFn = (typeof import('jsqr'))['default'];

interface Props {
  /** Called with the decoded QR text the moment a code is recognised. */
  onResult: (text: string) => void;
  /** Called when the user dismisses the scanner without scanning. */
  onClose: () => void;
}

type StatusKind =
  | { kind: 'starting' }
  | { kind: 'scanning' }
  | { kind: 'error'; message: string };

/**
 * Full-screen camera scanner for QR codes. Uses the platform `getUserMedia`
 * API to stream the rear camera and `jsQR` to decode each frame.
 *
 * Security / privacy notes:
 * - The video stream stays in-browser; nothing is uploaded.
 * - Stops all media tracks on unmount or successful decode — this is critical
 *   for battery life and for the OS-level camera-in-use indicator.
 * - Requires HTTPS or localhost (browser policy). padelmm.github.io is HTTPS,
 *   so this works out of the box.
 */
export default function QrScanModal({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const decodedRef = useRef(false);
  const jsQRRef = useRef<JsQRFn | null>(null);
  const [status, setStatus] = useState<StatusKind>({ kind: 'starting' });

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
        streamRef.current = null;
      }
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };

    const tick = () => {
      if (cancelled || decodedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const decode = jsQRRef.current;
      if (decode && video && canvas && video.readyState >= video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w > 0 && h > 0) {
          // Downscale long edge to ~640px for faster decoding without
          // sacrificing detection accuracy on standard QR codes.
          const longEdge = Math.max(w, h);
          const scale = longEdge > 640 ? 640 / longEdge : 1;
          const cw = Math.round(w * scale);
          const ch = Math.round(h * scale);
          if (canvas.width !== cw) canvas.width = cw;
          if (canvas.height !== ch) canvas.height = ch;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, cw, ch);
            const imageData = ctx.getImageData(0, 0, cw, ch);
            const code = decode(imageData.data, cw, ch, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              decodedRef.current = true;
              // Best-effort haptic feedback on Android; silently no-op on iOS.
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try {
                  navigator.vibrate(60);
                } catch {
                  /* ignore */
                }
              }
              stop();
              onResult(code.data);
              return;
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus({
          kind: 'error',
          message: 'Camera API not available in this browser. Paste the code instead.',
        });
        return;
      }
      // Kick off the jsQR download in parallel with the camera permission
      // prompt. By the time the stream is live, the decoder is usually ready.
      const decoderPromise = import('jsqr').then((m) => m.default);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stop();
          return;
        }
        video.srcObject = stream;
        // iOS Safari requires playsinline + muted to autoplay inline.
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch {
          /* Some browsers reject the promise even though playback proceeds. */
        }
        setStatus({ kind: 'scanning' });
        // Await the decoder before starting the scan loop. The camera preview
        // is already live by now, so the user just sees the viewfinder while
        // the (tiny) decoder finishes loading.
        try {
          const decode = await decoderPromise;
          if (cancelled) return;
          jsQRRef.current = decode;
          rafRef.current = requestAnimationFrame(tick);
        } catch {
          setStatus({
            kind: 'error',
            message: 'Could not load the QR decoder. Check your connection and try again.',
          });
        }
      } catch (e) {
        // Common cases: NotAllowedError (user denied), NotFoundError (no camera),
        // NotReadableError (camera in use by another app).
        const name = (e as { name?: string } | undefined)?.name ?? '';
        const friendly =
          name === 'NotAllowedError'
            ? 'Camera access was denied. Allow it in the browser settings, or paste the code below.'
            : name === 'NotFoundError'
              ? 'No camera found on this device. Paste the code below instead.'
              : name === 'NotReadableError'
                ? 'The camera is in use by another app. Close it and try again, or paste the code below.'
                : 'Could not access the camera. Paste the code below instead.';
        setStatus({ kind: 'error', message: friendly });
      }
    };

    void start();

    return () => {
      cancelled = true;
      stop();
    };
    // onResult is stable from caller (memoized handler).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan share QR code"
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <header className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <h2 className="text-sm font-semibold text-slate-100">Scan share QR</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 transition active:scale-95"
        >
          Close
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder reticle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-square w-3/4 max-w-sm">
            <div className="absolute inset-0 rounded-2xl border-2 border-cyan-300/80 shadow-[0_0_60px_rgba(34,211,238,0.25)]" />
            <span className="absolute -left-px -top-px h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-cyan-300" />
            <span className="absolute -right-px -top-px h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-cyan-300" />
            <span className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-cyan-300" />
            <span className="absolute -bottom-px -right-px h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-cyan-300" />
          </div>
        </div>

        {status.kind === 'starting' && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-slate-200">
            Starting camera…
          </div>
        )}

        {status.kind === 'error' && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-2xl bg-rose-500/20 p-4 text-center text-sm text-rose-100 ring-1 ring-rose-500/40">
            {status.message}
          </div>
        )}
      </div>

      <p className="bg-black/60 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 text-center text-xs text-slate-300">
        Aim the camera at the QR code shown on the other phone.
      </p>
    </div>
  );
}
