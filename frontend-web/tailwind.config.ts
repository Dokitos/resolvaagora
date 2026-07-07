import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ResolvaAgora brand red
        brand: {
          50:  '#FFF1F1',
          100: '#FFE0E0',
          500: '#E53935',
          600: '#CC0000',
          700: '#A30000',
          900: '#7A0000',
        },
        // Secondary accent blue
        accent: {
          50:  '#EEF2FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#1A56DB',
          700: '#1D4ED8',
          900: '#1E3A8A',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

export default config
