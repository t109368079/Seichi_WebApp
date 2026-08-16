import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#fffaf1",
        rail: "#e5d9c8",
        field: "#2f6f63",
        signal: "#b5412e",
        night: "#26324a",
        sky: "#8cc7d8",
        blossom: "#ef9b91",
        ticket: "#f2c35e",
        leaf: "#9fbf7a",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
