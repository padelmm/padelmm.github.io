/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import NumberStepper from './NumberStepper';
import Players from './Players';
import Ranking from './Ranking';
import ScoreSlider from './ScoreSlider';
import Setup from './Setup';
import { useSession } from '../lib/store';
import type { Player } from '../lib/types';

function setInputValue(input: HTMLInputElement, value: string) {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  proto?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function expectCenteredGlyph(button: Element, kind: 'plus' | 'minus') {
  expect(button.className).toContain('inline-flex');
  expect(button.className).toContain('items-center');
  expect(button.className).toContain('justify-center');
  const svg = button.querySelector('svg');
  expect(svg?.getAttribute('aria-hidden')).toBe('true');
  expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  expect(svg?.querySelector('path')?.getAttribute('d')).toBe(
    kind === 'plus' ? 'M12 5v14M5 12h14' : 'M5 12h14',
  );
  expect(button.textContent?.trim()).toBe('');
}

describe('name field focus and circle marks', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    localStorage.clear();
    await act(async () => {
      await useSession.persist.rehydrate();
      useSession.getState().newSession();
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  async function render(node: JSX.Element) {
    await act(async () => {
      root.render(node);
    });
  }

  async function commitName(input: HTMLInputElement, name: string, via: 'enter' | 'click') {
    await act(async () => {
      input.focus();
      setInputValue(input, name);
    });
    if (via === 'enter') {
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
    } else {
      const add = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Add');
      expect(add).toBeTruthy();
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      add!.dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      await act(async () => {
        add!.click();
      });
    }
    await act(async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }

  it('keeps Setup focus after each name is added', async () => {
    await render(<Setup />);
    const input = host.querySelector('#player-name') as HTMLInputElement;

    await commitName(input, 'Anna', 'enter');
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(useSession.getState().players.map((p) => p.name)).toEqual(['Anna']);

    await commitName(input, 'Boris', 'click');
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(useSession.getState().players.map((p) => p.name)).toEqual(['Anna', 'Boris']);
  });

  it('keeps Players focus after each name is added', async () => {
    await render(<Players />);
    const input = host.querySelector('#add-player') as HTMLInputElement;

    await commitName(input, 'Cara', 'click');
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(useSession.getState().players.map((p) => p.name)).toEqual(['Cara']);
  });

  it('does not add a duplicate, and leaves the draft focused', async () => {
    await render(<Setup />);
    const input = host.querySelector('#player-name') as HTMLInputElement;
    await commitName(input, 'Anna', 'enter');
    await commitName(input, 'Anna', 'enter');
    expect(input.value).toBe('Anna');
    expect(document.activeElement).toBe(input);
    expect(useSession.getState().players).toHaveLength(1);
  });

  it('draws stepper and score marks through the centre of the circle', async () => {
    await render(
      <NumberStepper value={2} min={1} max={4} onChange={() => {}} aria-label="Courts" />,
    );
    expectCenteredGlyph(host.querySelector('[aria-label="Decrease Courts by 1"]')!, 'minus');
    expectCenteredGlyph(host.querySelector('[aria-label="Increase Courts by 1"]')!, 'plus');

    await render(<ScoreSlider target={16} scoreA={8} onChange={() => {}} />);
    expectCenteredGlyph(
      host.querySelector('[aria-label="Award a point to the left team"]')!,
      'plus',
    );
    expectCenteredGlyph(
      host.querySelector('[aria-label="Award a point to the right team"]')!,
      'plus',
    );
  });

  it('draws ranking bonus marks through the centre of the circle', async () => {
    const player: Player = { id: 'p1', name: 'Alex', status: 'active', bonus: 0 };
    useSession.setState({ players: [player] });
    await render(<Ranking />);
    const row = host.querySelector('[aria-expanded="false"]') as HTMLButtonElement;
    await act(async () => {
      row.click();
    });
    expectCenteredGlyph(
      host.querySelector('[aria-label="Subtract one bonus point from Alex"]')!,
      'minus',
    );
    expectCenteredGlyph(
      host.querySelector('[aria-label="Add one bonus point to Alex"]')!,
      'plus',
    );
  });
});
