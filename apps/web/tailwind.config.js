/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      spacing: {
        4.5: '1.125rem',
        18: '4.5rem',
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        surface: 'rgb(255 255 255)',
        border: 'rgb(229 231 235)',
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
        },
        success: '#16a34a',
        warning: '#ca8a04',
        error: '#dc2626',
      },
      keyframes: {
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(1rem)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%, 100%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        shimmer: 'shimmer 1.2s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, rgb(0 0 0 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '24px 24px',
      },
    },
  },
  safelist: [
    'antialiased', 'min-h-screen', 'm-0', 'font-sans', 'text-gray-900', 'bg-gray-50',
    'bg-slate-950', 'from-indigo-950', 'to-slate-900', 'text-white', 'bg-primary',
    'animate-pulse', 'animate-spin', 'animate-shimmer', 'animate-fade-in',
  ],
  plugins: [],
};
