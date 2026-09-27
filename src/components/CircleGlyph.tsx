interface Props {
  kind: 'plus' | 'minus';
  /** `sm` fits the h-9 score and stepper circles; `md` fits the h-12 ranking circles. */
  size?: 'sm' | 'md';
}

/**
 * Plus or minus as strokes through the centre of a 24×24 box.
 * Text glyphs sit on the font baseline, so `+` and `−` look off-centre
 * inside a circle and do not line up with each other. These paths are
 * centred on (12, 12) and inherit the button colour.
 */
export default function CircleGlyph({ kind, size = 'sm' }: Props) {
  const box = size === 'md' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`pointer-events-none block ${box}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d={kind === 'plus' ? 'M12 5v14M5 12h14' : 'M5 12h14'} />
    </svg>
  );
}
