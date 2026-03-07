import type { Config } from "tailwindcss";

export default {
  content: ["./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        se: {
          navy: "#1B2A4A",
          teal: "#2AADAD",
          amber: "#F59E0B",
          coral: "#F87171",
          sky: "#7DD3FC",
          cream: "#FFF8F0",
          sage: "#86EFAC",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Nunito", "system-ui", "sans-serif"],
        story: ["Merriweather", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
