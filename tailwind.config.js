/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bl: {
          navy: "#0a1428",
          deep: "#0f1f3d",
          ink: "#1a2a4a",
          mist: "#243558",
          gold: "#facc15",
          cyan: "#22d3ee",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ['"SF Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      boxShadow: {
        glass:
          "0 8px 24px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        lcd: "0 0 12px rgba(34,211,238,0.35)",
        "lcd-gold": "0 0 12px rgba(250,204,21,0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
