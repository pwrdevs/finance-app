import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      colors: {
        primary: '#8F9B7A',
        'primary-dark': '#606B50',
        'primary-light': '#C4CCB6',
        background: '#F7F8F5',
        surface: '#FFFFFF',
        foreground: '#1F241C',
        muted: '#6F7668',
        border: '#DDE2D4'
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"IBM Plex Sans"', 'sans-serif']
      },
      boxShadow: {
        soft: '0 10px 30px rgba(36, 46, 30, 0.08)',
        panel: '0 1px 0 rgba(31, 36, 28, 0.08), 0 20px 40px rgba(36, 46, 30, 0.06)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      }
    }
  }
} satisfies Config
