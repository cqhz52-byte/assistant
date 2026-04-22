import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Relative base avoids broken absolute paths on GitHub Pages project sites.
  base: './',
})
