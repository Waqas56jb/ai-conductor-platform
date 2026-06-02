/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Identité de marque Pratonna
        brand: {
          50: '#eef2ff',
          100: '#dbe3ff',
          200: '#bccbff',
          300: '#8fa6ff',
          400: '#5b78ff',
          500: '#2155FF', // Deep Blue principal
          600: '#1740e6',
          700: '#1230b8',
          800: '#142a91',
          900: '#162a73',
          950: '#0d1747',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        ink: {
          DEFAULT: '#0b1437',
          soft: '#3b4467',
          muted: '#6b7394',
        },
        cloud: '#f6f8ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 20px 60px -15px rgba(33, 85, 255, 0.45)',
        'glow-violet': '0 20px 60px -15px rgba(124, 58, 237, 0.45)',
        soft: '0 10px 40px -12px rgba(13, 23, 71, 0.12)',
        card: '0 4px 24px -6px rgba(13, 23, 71, 0.10)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2155FF 0%, #7c3aed 100%)',
        'hero-radial':
          'radial-gradient(1200px 600px at 70% -10%, rgba(124,58,237,0.18), transparent), radial-gradient(900px 500px at 10% 10%, rgba(33,85,255,0.16), transparent)',
        'mesh':
          'radial-gradient(at 0% 0%, rgba(33,85,255,0.10) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(124,58,237,0.10) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(91,120,255,0.08) 0px, transparent 50%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-22px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        shimmer: 'shimmer 2.5s infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
}
