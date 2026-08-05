import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  ssr: {
    // Bundle all deps into the SSR output rather than leaving CJS-only
    // packages (react-slick, fontawesome, etc.) as native Node imports —
    // several of them don't interop cleanly as bare externals.
    noExternal: true,
  },
})
