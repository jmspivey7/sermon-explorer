import type { Config } from "tailwindcss";

export default {
  content: ["./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        se: {
          navy: "#1B2A4A",
          blue: "#1d88a9",
          green: "#80ad40",
          purple: "#785992",
          brown: "#7c6752",
          grayblue: "#54636c",
          cream: "#FFF8F0",
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
        display: ['"Source Sans 3"', "system-ui", "sans-serif"],
        story: ['"Source Sans 3"', "Georgia", "serif"],
        accent: ["Devonshire", "cursive"],
      },
    },
  },
  plugins: [],
} satisfies Config;
