/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Colores personalizados del Hotel Asturias
        hotel: {
          wine: {
            50: '#fdf4f4',
            100: '#fce8e9',
            200: '#f9d5d8',
            300: '#f4b5ba',
            400: '#ec8a93',
            500: '#e0606d',
            600: '#cc4250',
            700: '#a8202f',
            800: '#8d1d2b',
            900: '#781c29',
          },
          gold: {
            50: '#fdfbf3',
            100: '#faf5e0',
            200: '#f5e9ba',
            300: '#eed98a',
            400: '#e6c358',
            500: '#dfa936',
            600: '#c68a28',
            700: '#a46923',
            800: '#875423',
            900: '#704521',
          },
          cream: {
            50: '#fdfdf9',
            100: '#faf8f0',
            200: '#f5f1e1',
            300: '#ebe5cc',
            400: '#ddd4af',
            500: '#cebf8d',
            600: '#b9a774',
            700: '#9a8a5e',
            800: '#7e714f',
            900: '#685f43',
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
