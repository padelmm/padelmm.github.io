---
name: blue-lions-design
description: Translucent LCD design system used by Padel Mix & Match. Use when editing any UI component, choosing colors, adding new screens, or adjusting layout — anywhere visual consistency with the Blue Lions club brand matters.
---

# Blue Lions · Translucent LCD Design

The app's visual identity is a frosted-glass / LCD-arcade hybrid sitting
on a deep navy "padel court at night" background. The design tokens live
in `tailwind.config.js#theme.extend` and the utility classes in
`src/index.css`. Use them — do not invent new color hexes inline.

## Color tokens (Tailwind)

Defined under `theme.extend.colors.bl` and used as `bg-bl-navy`,
`text-bl-cyan`, etc.

| Token        | Hex      | Role |
|--------------|----------|------|
| `bl-navy`    | `#0a1428` | Page background, deep base |
| `bl-deep`    | `#0f1f3d` | Background gradient top |
| `bl-ink`     | `#1a2a4a` | Lifted surfaces |
| `bl-mist`    | `#243558` | Hover / pressed surfaces |
| `bl-gold`    | `#facc15` | Final round, podium, attention |
| `bl-cyan`    | `#22d3ee` | Primary action, LCD glow, score balance |

Accent role conventions (don't break these):

- **Cyan** — primary affordance, balanced scores, low intensity.
- **Gold / amber** — caution, second-tap confirms, final round, podium #1.
- **Rose** — destructive (New mix & match), lopsided scores, high intensity.
- **Emerald** — success / "copied to clipboard" flash.

## Utility classes

Defined in `src/index.css`:

- `.glass` — frosted card. Use for any panel, sheet, or button base.
- `.glass-strong` — slightly heavier blur + tint. Use for modal / Splash
  primary buttons and other "lifted above .glass" elements.
- `.lcd-num` — LCD glow text, monospace tabular nums. Use for every
  number the host reads at a glance: score digits, ranking total, bonus.
  Tint via inline `color: hsl(...)` so the digit and its glow share hue.
- `.score-slider` — range input style. CSS variables drive its dynamic
  two-stop gradient; do not override colours in component code.

## Shadows (Tailwind extensions)

- `shadow-lcd` — cyan glow halo. Use on primary cyan buttons.
- `shadow-lcd-gold` — gold glow halo. Use on final-round buttons and
  confirm states.
- `shadow-glass` — soft drop + inset highlight; built into `.glass`.

## Typography

System sans for everything; the mono stack (`SF Mono` family) is reserved
for `.lcd-num` numbers. Never use bold weights heavier than `font-bold`;
the LCD glow already provides emphasis.

## Layout conventions

- Mobile-first. All layouts are designed for a single hand on a phone.
- Standard container: `flex flex-col gap-3 px-4 pb-24 pt-4`. The `pb-24`
  reserves space for the bottom nav.
- Section headers: `text-[10px] uppercase tracking-[0.2em] text-slate-400`.
  Use within `<section>` blocks or as standalone `<h2>` between buttons.
- Safe-area top padding on first-screen surfaces (Splash, AppHeader,
  Setup): `pt-[max(env(safe-area-inset-top),Xrem)]` so the iOS notch
  doesn't clip the logo.
- Bottom sheets animate in with `.sheet-in` (180 ms slide-up); their
  backdrop uses `.fade-in` (150 ms).

## Buttons — pattern library

### Primary action
```tsx
<button className="rounded-2xl bg-cyan-500/90 px-4 py-4 text-sm font-semibold text-slate-900 shadow-lcd transition active:scale-[0.99]">
  Action
</button>
```

### Glass button (neutral)
```tsx
<button className="glass w-full rounded-2xl px-4 py-4 text-sm font-medium text-slate-200 transition active:scale-[0.99]">
  Neutral action
</button>
```

### Two-tap confirm
First tap arms a 4-second amber state, second tap commits. See
`SessionMenu.tsx#onClearGames` and `#onFinish` for the canonical pattern.
Mandatory for any destructive or one-way action.

```tsx
className={
  'w-full rounded-2xl px-4 py-4 text-sm font-medium transition active:scale-[0.99] ' +
  (confirmState
    ? 'bg-amber-500 text-slate-900 shadow-lcd-gold'
    : 'glass text-amber-300')
}
```

### Destructive (most severe)
Same morph as confirm but the *base* color is rose, not slate. Reserved
for actions that wipe data: `'New mix & match (clear data)'`.

## Logos and imagery

- Dark theme (current default): `public/bl-logo.png` is the transparent
  Blue Lions crest on dark backgrounds.
- Light theme (planned): `res/images/blLogoLight.png` exists for the
  inverted background. Always pair logo file to active theme.
- PWA install icon: `public/bl-icon.png` (opaque, colored crest) — used
  on the iOS / Android home screen where the OS forces a square tile.

Never use the logo as a CSS mask; use it as an `<img>` with `alt` set.

## Light theme (planned, item 3)

When light mode lands:

- Tokens move to CSS variables defined in `:root[data-theme="dark"]` and
  `:root[data-theme="light"]`. Tailwind `darkMode` switches to
  `['class','[data-theme="dark"]']`.
- The `.glass` utility's `rgba(255,255,255,...)` tint inverts to a
  near-black tint over a warm off-white background.
- `<meta name="theme-color">` gets duplicated with `media` queries so
  iOS Safari's status-bar tint follows the theme.

Do not introduce any light-mode-specific code until item 3 of the PRD is
explicitly being implemented.

## Don'ts

- ❌ Hardcoded `#hex` color in TSX. Use Tailwind tokens.
- ❌ A button without `active:scale-[0.99]`. Tactile feedback is part of
  the brand.
- ❌ Solid `bg-slate-800` panels. Use `.glass` for translucency.
- ❌ Non-rounded buttons. Everything is `rounded-2xl` or `rounded-full`.
- ❌ Inventing a new accent color when cyan / gold / rose / emerald
  already covers the four roles above.
