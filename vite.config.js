import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The @tailwindcss/vite plugin is what makes Tailwind v4 work with Vite:
// it scans your JSX for class names and generates the CSS on the fly.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
