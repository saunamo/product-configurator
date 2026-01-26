import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        green: {
          50: "#f0f7f4",
          100: "#d9ede4",
          200: "#b7dcc9",
          300: "#88c4a6",
          400: "#5aa682",
          500: "#3d8a68",
          600: "#2d6f54",
          700: "#255945",
          800: "#1a3a2e",
          900: "#0f231a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
