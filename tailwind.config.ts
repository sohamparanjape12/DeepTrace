import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--brand-bg)",
          surface: "var(--brand-surface)",
          border: "var(--brand-border)",
          text: "var(--brand-text)",
          muted: "var(--brand-muted)",
          accent: "var(--brand-accent)",
          "red-muted": "var(--brand-red-muted)",
          "red-text": "var(--brand-red-text)",
          "blue-muted": "var(--brand-blue-muted)",
          "blue-text": "var(--brand-blue-text)",
          "green-muted": "var(--brand-green-muted)",
          "green-text": "var(--brand-green-text)",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0,0,0,0.02)",
        "soft-lg": "0 10px 30px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
