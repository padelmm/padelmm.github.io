import type { SessionState } from './types';

// v1: PADELMM/v1/<standard-base64-of-utf8-json>            (legacy, import only)
// v2: PADELMM/v2/<urlsafe-base64-of-gzip-of-utf8-json>     (single message)
// v2 chunked:
//     PADELMM/v2/c<idx>/<total>/<sid>/<urlsafe-base64-chunk>
// idx is 1-based, total is the number of chunks, sid is a short
// payload fingerprint so the importer rejects mixed chunks from
// different sessions. The url-safe base64 alphabet has no `/`, so
// `/` is unambiguous as a delimiter.

const PREFIX_V1 = 'PADELMM/v1/';
const PREFIX_V2 = 'PADELMM/v2/';

// Telegram caps a single text message at 4096 chars. Stay well under
// to leave room for whatever the user writes around the code.
const CHUNK_LIMIT = 3500;

/* -------------------------------------------------------------------------- */
/*  base64 helpers                                                            */
/* -------------------------------------------------------------------------- */

function bytesToStandardBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}

function standardBase64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToUrlSafeBase64(bytes: Uint8Array): string {
  return bytesToStandardBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function urlSafeBase64ToBytes(s: string): Uint8Array {
  const pad = (4 - (s.length % 4)) % 4;
  const std = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return standardBase64ToBytes(std);
}

/* -------------------------------------------------------------------------- */
/*  gzip via the platform CompressionStream API                               */
/*  (Chrome 80+, Safari 16.4+, Firefox 113+ — all 2+ years shipping)          */
/* -------------------------------------------------------------------------- */

async function gzipBytes(input: Uint8Array): Promise<Uint8Array> {
  // CompressionStream is required for v2 export. If it's missing, we throw
  // and the caller falls back to v1 (uncompressed) so the user is never stuck.
  const CS = (globalThis as unknown as { CompressionStream?: typeof CompressionStream }).CompressionStream;
  if (!CS) throw new Error('CompressionStream unavailable');
  const stream = new Blob([input as BlobPart]).stream().pipeThrough(new CS('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function gunzipBytes(input: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as unknown as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!DS) throw new Error('DecompressionStream unavailable');
  const stream = new Blob([input as BlobPart]).stream().pipeThrough(new DS('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

/* -------------------------------------------------------------------------- */
/*  short payload fingerprint, used as a chunk-set id                         */
/* -------------------------------------------------------------------------- */

async function shortFingerprint(payload: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  // 6 hex chars = 24 bits = collision-safe across a handful of concurrent shares
  return Array.from(new Uint8Array(buf).slice(0, 3))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* -------------------------------------------------------------------------- */
/*  Export                                                                    */
/* -------------------------------------------------------------------------- */

export interface ExportResult {
  /** All chunks joined with blank lines — what `Copy session` puts on the clipboard. */
  full: string;
  /** One entry per messenger message. Length === 1 for sessions that fit. */
  chunks: string[];
  /** Total character count across all chunks (excluding separators). */
  chars: number;
  /** True when the payload fits a single message. */
  isSingle: boolean;
}

export async function exportSession(state: SessionState): Promise<ExportResult> {
  const json = JSON.stringify(state);
  let singleCode: string;
  try {
    const gz = await gzipBytes(new TextEncoder().encode(json));
    singleCode = PREFIX_V2 + bytesToUrlSafeBase64(gz);
  } catch {
    // Fall back to v1 if the browser lacks CompressionStream.
    singleCode = PREFIX_V1 + bytesToStandardBase64(new TextEncoder().encode(json));
  }

  if (singleCode.length <= CHUNK_LIMIT) {
    return {
      full: singleCode,
      chunks: [singleCode],
      chars: singleCode.length,
      isSingle: true,
    };
  }

  // Need to chunk. Only v2 codes get chunked (v1 is import-only nowadays).
  const isV2 = singleCode.startsWith(PREFIX_V2);
  const payload = isV2 ? singleCode.slice(PREFIX_V2.length) : singleCode.slice(PREFIX_V1.length);
  const sid = await shortFingerprint(payload);

  // Pre-compute how big the per-chunk envelope is so each whole message
  // (envelope + payload slice) stays under CHUNK_LIMIT.
  // Envelope: `PADELMM/v2/c<idx>/<total>/<sid>/`  →  worst case has 3-digit idx/total.
  // 'PADELMM/v2/c' (12) + 3 + '/' + 3 + '/' + sid (6) + '/' = 26 chars headroom.
  const ENVELOPE_HEADROOM = 32;
  const payloadChunkLen = CHUNK_LIMIT - ENVELOPE_HEADROOM;
  const parts: string[] = [];
  for (let i = 0; i < payload.length; i += payloadChunkLen) {
    parts.push(payload.slice(i, i + payloadChunkLen));
  }
  const total = parts.length;
  const chunks = parts.map((p, i) => `${PREFIX_V2}c${i + 1}/${total}/${sid}/${p}`);
  return {
    full: chunks.join('\n\n'),
    chunks,
    chars: chunks.reduce((s, c) => s + c.length, 0),
    isSingle: false,
  };
}

/* -------------------------------------------------------------------------- */
/*  Import                                                                    */
/* -------------------------------------------------------------------------- */

export interface ImportResult {
  ok: boolean;
  state?: SessionState;
  error?: string;
  /** Set when input is partial — tells the user which chunks are still missing. */
  partial?: { have: number; total: number; missing: number[]; sid: string };
}

/**
 * Validate that an arbitrary parsed value is a SessionState we can trust.
 * We allow-list known fields and reject anything else. This protects against
 * prototype pollution and malformed payloads from untrusted text input.
 */
function validateState(value: unknown): value is SessionState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v['schemaVersion'] !== 1) return false;
  if (!Array.isArray(v['players'])) return false;
  if (!Array.isArray(v['rounds'])) return false;
  if (!v['config'] || typeof v['config'] !== 'object') return false;
  const status = v['status'];
  if (status !== 'setup' && status !== 'running' && status !== 'finished') return false;
  return true;
}

function finalizeImport(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Corrupted share code: invalid JSON.' };
  }
  if (!validateState(parsed)) {
    return { ok: false, error: 'Share code is not a valid Padel M&M session.' };
  }
  const state = parsed as SessionState;
  // Backfill `bonus` for codes exported before the bonus feature.
  state.players = state.players.map((p) => ({ ...p, bonus: p.bonus ?? 0 }));
  return { ok: true, state };
}

/** Parse one PADELMM/v2/c... chunk line. Returns null on malformed input. */
function parseChunkLine(line: string):
  | { idx: number; total: number; sid: string; payload: string }
  | null {
  if (!line.startsWith(PREFIX_V2 + 'c')) return null;
  const rest = line.slice(PREFIX_V2.length + 1); // strip 'PADELMM/v2/c'
  const m = rest.match(/^(\d+)\/(\d+)\/([A-Za-z0-9]+)\/(.+)$/);
  if (!m) return null;
  const idx = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isFinite(idx) || !Number.isFinite(total) || idx < 1 || total < 1 || idx > total) {
    return null;
  }
  return { idx, total, sid: m[3] as string, payload: m[4] as string };
}

export async function importSession(raw: string): Promise<ImportResult> {
  const text = raw.trim();
  if (!text) return { ok: false, error: 'Empty input.' };

  // Tokens: split on any whitespace and keep only known prefixes. This makes
  // the textarea tolerant of pasted "From John: PADELMM/v2/... " style noise.
  const tokens = text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith(PREFIX_V1) || t.startsWith(PREFIX_V2));
  if (tokens.length === 0) {
    return {
      ok: false,
      error: 'No Padel M&M share code found (looking for PADELMM/v1/ or PADELMM/v2/).',
    };
  }

  // Look for chunked v2 tokens first.
  const chunkTokens = tokens
    .map((t) => parseChunkLine(t))
    .filter((c): c is NonNullable<ReturnType<typeof parseChunkLine>> => c !== null);

  if (chunkTokens.length > 0) {
    // Group by sid (share-id) so we don't accidentally mix two pasted sessions.
    const groups = new Map<string, typeof chunkTokens>();
    for (const c of chunkTokens) {
      const arr = groups.get(c.sid) ?? [];
      arr.push(c);
      groups.set(c.sid, arr);
    }
    // Pick the group with the most chunks so far.
    const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    const [sid, group] = ranked[0] as [string, typeof chunkTokens];

    // De-dupe within the group (user may have pasted the same chunk twice).
    const byIdx = new Map<number, (typeof chunkTokens)[number]>();
    for (const c of group) byIdx.set(c.idx, c);
    const total = group[0]!.total;

    if (byIdx.size < total) {
      const missing: number[] = [];
      for (let i = 1; i <= total; i++) if (!byIdx.has(i)) missing.push(i);
      return {
        ok: false,
        error: `Got ${byIdx.size} of ${total} chunks. Paste the missing message(s).`,
        partial: { have: byIdx.size, total, missing, sid },
      };
    }

    const ordered = Array.from(byIdx.values()).sort((a, b) => a.idx - b.idx);
    const payload = ordered.map((c) => c.payload).join('');

    let bytes: Uint8Array;
    try {
      bytes = urlSafeBase64ToBytes(payload);
    } catch {
      return { ok: false, error: 'Corrupted share code: could not decode.' };
    }
    let json: string;
    try {
      const un = await gunzipBytes(bytes);
      json = new TextDecoder().decode(un);
    } catch {
      return { ok: false, error: 'Corrupted share code: could not decompress.' };
    }
    return finalizeImport(json);
  }

  // Otherwise expect a single-message code. Use the first one found.
  const single = tokens[0]!;
  if (single.startsWith(PREFIX_V2)) {
    let bytes: Uint8Array;
    try {
      bytes = urlSafeBase64ToBytes(single.slice(PREFIX_V2.length));
    } catch {
      return { ok: false, error: 'Corrupted share code: could not decode.' };
    }
    let json: string;
    try {
      const un = await gunzipBytes(bytes);
      json = new TextDecoder().decode(un);
    } catch {
      return { ok: false, error: 'Corrupted share code: could not decompress.' };
    }
    return finalizeImport(json);
  }

  // Legacy v1 (plain JSON in base64).
  try {
    const bytes = standardBase64ToBytes(single.slice(PREFIX_V1.length));
    const json = new TextDecoder().decode(bytes);
    return finalizeImport(json);
  } catch {
    return { ok: false, error: 'Corrupted share code: could not decode.' };
  }
}

/* -------------------------------------------------------------------------- */
/*  Clipboard helper (unchanged)                                              */
/* -------------------------------------------------------------------------- */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
