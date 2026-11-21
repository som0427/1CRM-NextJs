/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',  // Include all files under src
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/styles/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Custom green palette - moved to top for priority
        green: {
          100: "#E8F9F8",
          200: "#C7F0EE",
          300: "#9FE5E1",
          400: "#57D5CF",
          500: "#1BC5BD",  // As specified
          600: "#17A69F",
          700: "#118883",
          800: "#0C6964",
          900: "#074E4A",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "#4F4F4F", // Set default text color to black-500
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
        // Custom red palette
        red: {
          100: "#FEEFEF",
          200: "#FCDDDD",
          300: "#FAC0C0",
          400: "#F8898E",
          500: "#F64E60",  // As specified
          600: "#E23342",
          700: "#C41E2E",
          800: "#9C1623",
          900: "#78101A",
        },
        // Custom blue palette
        blue: {
          100: "#E1F0FF",
          200: "#C3E1FF",
          300: "#94C9FD",
          400: "#5FB0FC",
          500: "#3699FF",  // As specified
          600: "#2680D7",
          700: "#1967B0",
          800: "#104F89",
          900: "#0A3B68",
        },
        // Custom black palette (default/base color)
        black: {
          100: "#E6E6E6",
          200: "#CCCCCC",
          300: "#B3B3B3",
          400: "#808080",
          500: "#4F4F4F",  // As specified - default/base color
          600: "#3F3F3F",
          700: "#2F2F2F",
          800: "#1F1F1F",
          900: "#0F0F0F",
        },
        // Custom grey palette
        grey: {
          100: "#F2F2F2",
          200: "#E0E0E0",
          300: "#BDBDBD",
          400: "#A0A0A0",
          500: "#828282",  // As specified
          600: "#686868",
          700: "#4E4E4E",
          800: "#343434",
          900: "#1A1A1A",
        },
        // Custom yellow palette
        yellow: {
          100: "#FFF5E0",
          200: "#FFE7B3",
          300: "#FFD580",
          400: "#FFBE40",
          500: "#FFA800",  // As specified
          600: "#D68E00",
          700: "#AD7400",
          800: "#855A00",
          900: "#5C3F00",
        },
        // Custom purple palette
        purple: {
          100: "#F3E8FF",
          200: "#E4CCFF",
          300: "#CDA5FF",
          400: "#B276FF",
          500: "#9747FF",  // As specified
          600: "#7E3BD4",
          700: "#652FAA",
          800: "#4C2380",
          900: "#331756",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      maxWidth: {
        '4xl': '800px',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
