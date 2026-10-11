import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#070b1f", 2: "#0c1332" },
        ink: "#e8ecff", dim: "#8b93c7", electric: "#3ba7ff", cyan: "#5ee6ff", violet: "#8b5cf6", magenta: "#c05cff",
        ok: "#3ee08f", bad: "#ff5f72", warn: "#ffc857",
      },
      fontFamily: { display: ["var(--f-display)"], body: ["var(--f-body)"], mono: ["var(--f-mono)"] },
    },
  },
  plugins: [],
};
export default config;
