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
        primary: {
          DEFAULT: "#4F8A6B",
          50: "#f0f7f4",
          100: "#d9ede5",
          200: "#b5dace",
          300: "#8bbf9f",
          400: "#6fa98b",
          500: "#4F8A6B",
          600: "#3d6e54",
          700: "#305744",
          800: "#274538",
          900: "#1e3329",
        },
        secondary: "#6FA98B",
        accent: "#8BBF9F",
        background: "#F8FAF8",
        border: "#E5E7EB",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.1), 0 2px 6px -2px rgb(0 0 0 / 0.08)",
        float: "0 20px 60px -10px rgb(79 138 107 / 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
