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
        // ResolvaAgora — marca PRETO (superfícies/primário)
        brand: {
          50:  '#F4F4F5',
          100: '#E4E4E7',
          500: '#3F3F46',
          600: '#161616',
          700: '#0A0A0A',
          900: '#000000',
        },
        // Acento AMARELO (destaques/preenchimentos)
        accent: {
          50:  '#FFF7E0',
          100: '#FDE9A8',
          500: '#F5B301',
          600: '#D99E00',
          700: '#B8860B',
          900: '#7A5A00',
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
