import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 포트 3011 고정, /api 는 백엔드(4011)로 프록시 (생태계 dev 컨벤션)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3011,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4011',
        changeOrigin: true,
      },
    },
  },
});
