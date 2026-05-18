import type { SessionState } from './types';

const PREFIX = 'PADELMM/v1/';

function toBase64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}

function fromBase64Utf8(s: string): string {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function exportSession(state: SessionState): string {
  return PREFIX + toBase64Utf8(JSON.stringify(state));
}

export interface ImportResult {
  ok: boolean;
  state?: SessionState;
  error?: string;
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

export function importSession(raw: string): ImportResult {
  const text = raw.trim();
  if (!text) return { ok: false, error: 'Empty input.' };
  if (!text.startsWith(PREFIX)) {
    return { ok: false, error: 'Not a Padel M&M share code (must start with PADELMM/v1/).' };
  }
  let decoded: string;
  try {
    decoded = fromBase64Utf8(text.slice(PREFIX.length));
  } catch {
    return { ok: false, error: 'Corrupted share code: could not decode.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return { ok: false, error: 'Corrupted share code: invalid JSON.' };
  }
  if (!validateState(parsed)) {
    return { ok: false, error: 'Share code is not a valid Padel M&M session.' };
  }
  // Normalize: ensure players have a bonus field even if the export is older.
  const state = parsed as SessionState;
  state.players = state.players.map((p) => ({ ...p, bonus: p.bonus ?? 0 }));
  return { ok: true, state };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  // Fallback for non-secure contexts (rare on iOS Safari over local network).
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
