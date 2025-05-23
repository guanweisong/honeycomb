import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./apps/**/*.{ts,tsx,js,jsx}", "./packages/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
