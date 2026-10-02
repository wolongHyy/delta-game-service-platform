import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        surface2: 'rgb(var(--surface2-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        lineStrong: 'rgb(var(--line-strong-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          bright: 'rgb(var(--primary-bright-rgb) / <alpha-value>)',
          deep: 'rgb(var(--primary-deep-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          dim: 'rgb(var(--ink-dim-rgb) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint-rgb) / <alpha-value>)',
        },
        ok: 'rgb(var(--ok-rgb) / <alpha-value>)',
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        info: 'rgb(var(--info-rgb) / <alpha-value>)',
        gold: 'rgb(var(--gold-rgb) / <alpha-value>)',
        onPrimary: 'rgb(var(--on-primary-rgb) / <alpha-value>)',
      },
      borderRadius: {
        btn: 'var(--radius-sm)',
        card: 'var(--radius-md)',
        hud: 'var(--radius-lg)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--primary-rgb) / 0.12), 0 10px 28px rgb(0 0 0 / 0.22)',
        card: '0 1px 2px rgb(0 0 0 / 0.16), 0 12px 36px rgb(0 0 0 / 0.18)',
        dock: '0 -12px 36px rgb(0 0 0 / 0.3)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
        data: 'var(--font-mono)',
      },
      minHeight: {
        touch: '44px',
      },
      spacing: {
        13: '3.25rem',
      },
    },
  },
  plugins: [],
}

export default config
