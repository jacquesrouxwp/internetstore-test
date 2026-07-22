import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "rgba(255,255,255,0.06)",
        canvas: "#0a0c14",
        ink: "#f4f4f5",
        muted: "#94a3b8",
        line: "rgba(255,255,255,0.12)",
        accent: {
          DEFAULT: "#C1121F",
          hover: "#A10E19",
          soft: "rgba(193,18,31,0.15)",
        },
        success: "#22c55e",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        container: "1240px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.25)",
        lift: "0 12px 40px rgba(0, 0, 0, 0.45)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
