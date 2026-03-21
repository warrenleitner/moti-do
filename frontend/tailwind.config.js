/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kinetic Console surface hierarchy
        'surface-void': '#0B0E17',
        'surface-low': '#181B25',
        'surface': '#10131C',
        'surface-high': '#272A34',
        'surface-highest': '#32343F',
        'outline-variant': '#3B494C',
        // Neon accent colors
        'neon-cyan': '#00E5FF',
        'neon-cyan-dim': '#009bb8',
        'neon-cyan-light': '#C3F5FF',
        'neon-magenta': '#FF007F',
        'neon-magenta-dim': '#cc0066',
        'neon-magenta-light': '#FF4A8D',
        'neon-amber': '#FFC775',
        'neon-amber-dim': '#cc9f5a',
        // Text
        'text-primary': '#E0E0E0',
        'text-secondary': '#8A8F98',
        'text-muted': '#5A5E66',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      boxShadow: {
        'hard': '4px 4px 0px rgba(0, 0, 0, 0.5)',
        'hard-sm': '2px 2px 0px rgba(0, 0, 0, 0.3)',
        'pressed': '1px 1px 0px rgba(0, 0, 0, 0.8)',
        'glow-cyan': '0 0 12px rgba(0, 229, 255, 0.5)',
        'glow-cyan-sm': '0 0 8px rgba(0, 229, 255, 0.3)',
        'glow-magenta': '0 0 12px rgba(255, 0, 127, 0.5)',
        'glow-magenta-sm': '0 0 8px rgba(255, 0, 127, 0.3)',
        'glow-amber': '0 0 12px rgba(255, 199, 117, 0.5)',
        'glow-amber-sm': '0 0 8px rgba(255, 199, 117, 0.3)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'scanline': 'scanline 8s linear infinite',
        'fade-in-up': 'fadeInUp 200ms ease-out both',
        'slide-in-right': 'slideInRight 200ms ease-out both',
        'glow-pulse-box': 'glowPulse 2s ease-in-out infinite',
        'typewriter': 'typewriter 1s step-end infinite',
        'checkbox-pop': 'checkboxPop 200ms ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'scanline': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'fadeInUp': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideInRight': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'glowPulse': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(0, 229, 255, 0.2)' },
          '50%': { boxShadow: '0 0 12px rgba(0, 229, 255, 0.5)' },
        },
        'typewriter': {
          '0%, 100%': { borderRightColor: '#00E5FF' },
          '50%': { borderRightColor: 'transparent' },
        },
        'checkboxPop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}
