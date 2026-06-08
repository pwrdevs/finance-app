import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-dark': 'rgb(var(--color-primary-dark) / <alpha-value>)',
        'primary-light': 'rgb(var(--color-primary-light) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)'
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
