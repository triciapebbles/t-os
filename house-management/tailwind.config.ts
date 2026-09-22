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
        brand: {
          50: "#f4f7f2",
          100: "#e5ebe0",
          200: "#c9d6bd",
          300: "#a4bb8f",
          400: "#7f9d67",
          500: "#5f7f49",
          600: "#4a6538",
          700: "#3c502e",
          800: "#324128",
          900: "#2b3723",
        },
      },
    },
  },
  plugins: [],
};
export default config;
