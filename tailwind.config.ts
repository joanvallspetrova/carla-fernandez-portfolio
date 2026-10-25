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
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        gallery: {
          white: "#FFFFFF",
          offwhite: "#FAFAFA",
          charcoal: "#111111",
          muted: "#666666",
          subtle: "#E5E5E5",
        },
      },
    },
  },
  plugins: [],
};
export default config;
