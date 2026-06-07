// @vitest-environment happy-dom
/**
 * Clipboard tests need a DOM + navigator stubs. happy-dom provides
 * document/body; we mock the Clipboard API to assert the async
 * ClipboardItem path that fixes iOS Safari's user-gesture timeout.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './share';

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses ClipboardItem with a Promise blob for async text (iOS-safe path)', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('ClipboardItem', class ClipboardItem {
      types: string[];
      constructor(public items: Record<string, Blob | Promise<Blob>>) {
        this.types = Object.keys(items);
      }
    });
    vi.stubGlobal('navigator', {
      clipboard: { write, writeText: vi.fn() },
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    const ok = await copyToClipboard(
      new Promise((resolve) => {
        setTimeout(() => resolve('PADELMM/v2/async-test'), 5);
      }),
    );

    expect(ok).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    const item = write.mock.calls[0]![0]![0] as { types: string[]; items: Record<string, Promise<Blob>> };
    const blob = await item.items['text/plain'];
    expect(await blob.text()).toBe('PADELMM/v2/async-test');
  });

  it('falls back to writeText for synchronous string input', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    // No ClipboardItem → skips the async path
    vi.stubGlobal('ClipboardItem', undefined);

    const ok = await copyToClipboard('hello padel');

    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello padel');
  });

  it('uses execCommand fallback when clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    vi.stubGlobal('ClipboardItem', undefined);
    // happy-dom has no document.execCommand — stub it like legacy browsers.
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      configurable: true,
    });

    const ok = await copyToClipboard('fallback text');

    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });
});
