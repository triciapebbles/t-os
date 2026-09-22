import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "Consolas", "monospace"],
      },
      colors: {
        brand: {
          50: "#F4F5F6",
          100: "#ECEDEF",
          200: "#E1E3E6",
          300: "#C7C9CD",
          400: "#9A9DA3",
          500: "#6C6F75",
          600: "#494C51",
          700: "#3D4046",
          800: "#2B2D31",
          900: "#212327",
        },
        tricia: { DEFAULT: "#D6417E", soft: "#FBE3EC" },
        zane: { DEFAULT: "#2E6FD9", soft: "#E1EBFB" },
        flag: { DEFAULT: "#D97F2C", soft: "#FBEBD8" },
        done: { DEFAULT: "#2E9E63", soft: "#E1F3E9" },
        cat: {
          kitchen: { fg: "#8A6D1B", bg: "#FBF0C2" },
          plants: { fg: "#3F7A4C", bg: "#DCEEDD" },
          laundry: { fg: "#8B6544", bg: "#EFE0D2" },
          cats: { fg: "#5B6B2E", bg: "#E4EAC6" },
        },
      },
      borderRadius: {
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
export default config;
