import type { Config } from 'tailwindcss';

export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                forest: {
                    50: '#F0F7F2', 100: '#D8EADF', 200: '#B3D4C1', 300: '#84B79A',
                    400: '#4F9573', 500: '#2D6A4F', 600: '#1B4332', 700: '#14352A',
                    800: '#0B2B1F', 900: '#081C15'
                },
                cream: {
                    50: '#FFFDF8', 100: '#FBF5E8', 200: '#F3E9D2', 300: '#E8D9B8'
                },
                hhred: {
                    50: '#FEF2F2', 100: '#FDE8E8', 500: '#D62839', 600: '#C1121F', 700: '#9B0F19'
                }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['Fraunces', 'ui-serif', 'Georgia', 'serif']
            }
        }
    }
} satisfies Config;