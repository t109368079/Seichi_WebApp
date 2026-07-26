import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#f7f4ef",
        rail: "#d9e4dd",
        field: "#2f6f63",
        signal: "#b5412e",
        night: "#26324a",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
