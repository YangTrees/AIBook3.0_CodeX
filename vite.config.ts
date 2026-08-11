import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'desktop' ? './' : process.env.NODE_ENV === 'production' ? '/AIBook/' : './',
  publicDir: mode === 'desktop' ? false : 'public',
  build: {
    outDir: mode === 'desktop' ? 'dist-desktop' : 'dist',
    reportCompressedSize: false,
    // 当前 Windows/Node 组合在桌面构建压缩阶段存在原生异常；客户端包由 asar 封装，关闭压缩不影响运行或素材保护。
    minify: mode === 'desktop' ? false : 'esbuild',
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
