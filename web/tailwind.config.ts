import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        gold: {
          DEFAULT: "#B8924A",
          light: "#D4AF71",
          dark: "#8B6635",
          50: "#FDF8EF",
          100: "#F9EDCF",
          200: "#F2D99F",
          300: "#ECC06A",
          400: "#E2A340",
          500: "#B8924A",
          600: "#9A7A3D",
          700: "#7C6230",
          800: "#5E4A24",
          900: "#3F3218",
        },
        navy: {
          DEFAULT: "#141B25",
          dark: "#0A1018",
          50: "#E8EBF0",
          100: "#C5CBD5",
          200: "#A2ABB8",
          300: "#7F8B9B",
          400: "#5C6B7E",
          500: "#394B61",
          600: "#2A3A50",
          700: "#1E2D3F",
          800: "#141B25",
          900: "#0A1018",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        uber: "cubic-bezier(0.2, 0, 0, 1)",
      },
      keyframes: {
        "border-beam": {
          "100%": { "offset-distance": "100%" },
        },
        "shimmer-gold": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
      },
      animation: {
        "border-beam": "border-beam 6s linear infinite",
        "shimmer-gold": "shimmer-gold 3s ease infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        blob: "blob 9s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
