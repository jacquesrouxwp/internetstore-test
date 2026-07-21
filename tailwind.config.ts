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
        surface: "#FFFFFF",
        canvas: "#F4F4F5",
        ink: "#1A1A1A",
        muted: "#71717A",
        line: "#E4E4E7",
        accent: {
          DEFAULT: "#C1121F",
          hover: "#A10E19",
          soft: "#FEF2F2",
        },
        success: "#15803D",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        container: "1240px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26, 26, 26, 0.04)",
        lift: "0 12px 32px rgba(26, 26, 26, 0.08)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
