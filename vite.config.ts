import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/AIBook/' : './',
  build: {
    reportCompressedSize: false,
    copyPublicDir: process.env.AIBOOK_SKIP_PUBLIC_COPY !== '1',
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
