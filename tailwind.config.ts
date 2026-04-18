import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#FAFAFA",         // Warm Bone White
          surface: "#FFFFFF",    // Pure White
          border: "#EAEAEA",     // Light Zinc
          text: "#1A1A1A",       // Charcoal
          muted: "#787774",      // Taupe/Gray
          accent: "#E11D48",     // Rose (Semantic only)
          "red-muted": "#FDEBEC",
          "red-text": "#9F2F2D",
          "blue-muted": "#E1F3FE",
          "blue-text": "#1F6C9F",
          "green-muted": "#EDF3EC",
          "green-text": "#346538",
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
