/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Theme Unified Colors (Gold, Cream, Navy) ────────────────────
        'brand-primary': '#F5D170',   // Gold Accent (Replaces Sky Blue)
        'brand-accent':  '#111827',   // Navy Base
        'brand-sky':     '#F5D170',   // Gold
        'brand-light':   '#FDF8E7',   // Soft Gold-Cream
        'brand-cream':   '#F4F3ED',   // Warm Cream Background
        'brand-gold':    '#F5D170',   // Prepay Card / Active Accent
        
        // ── Pastel Promo Cards ──────────────────────────────────────────
        'brand-promo-pink':   '#FCE7F3',
        'brand-promo-yellow': '#FEF08A',
        'brand-promo-orange': '#FFEDD5',
        'brand-promo-blue':   '#E0F2FE',

        // ── App Surfaces (White & Cream) ────────────────────────────────
        'app-bg':        '#F4F3ED',   // Warm Cream Background
        'app-surface':   '#FFFFFF',   // Surfaces are White
        'app-card':      '#FFFFFF',   // Card Background

        // ── Legacy Compatibility Aliases (No blue shades!) ─────────────
        'brand-navy':    '#111827',   // Navy
        'brand-blue':    '#F5D170',   // Aliased to Gold
        'brand-teal':    '#111827',   // Aliased to Navy
        'accent-gold':   '#F5D170',   // Gold
        'bg-light':      '#F4F3ED',   // Cream
        'text-primary':  '#111827',   // Navy
        'muted':         '#6B7280',   // Gray
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        sans:    ['"DM Sans"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        'card': '18px',
        'btn':  '14px',
        'xl2':  '20px',
      },
      boxShadow: {
        'card':   '0 4px 20px rgba(2,132,199,0.06)',
        'accent': '0 8px 24px rgba(2,132,199,0.25)',
        'blue':   '0 8px 24px rgba(2,132,199,0.30)',
        'inner-dark': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'enter': 'enter 0.2s ease-out',
        'leave': 'leave 0.15s ease-in forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        enter: {
          '0%':   { transform: 'translateY(8px)', opacity: 0 },
          '100%': { transform: 'translateY(0)',   opacity: 1 },
        },
        leave: {
          '0%':   { transform: 'translateY(0)',   opacity: 1 },
          '100%': { transform: 'translateY(8px)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
