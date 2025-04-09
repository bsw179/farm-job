import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'window',
  },
  resolve: {
    alias: {
      buffer: require.resolve('buffer/'),
      './window': path.resolve(__dirname, 'src/shims/empty.js'),
      '@': path.resolve(__dirname, 'src'),
      '../internals/define-window-property': path.resolve(__dirname, 'src/shims/empty.js'),
      '../internals/window-this': path.resolve(__dirname, 'src/shims/empty.js'),
    },
  },
  optimizeDeps: {
    include: ['buffer'],
    exclude: [],
    esbuildOptions: {
      define: {
        global: 'window',
      },
    },
  },
  build: {
    sourcemap: true, // ✅ Enables source maps for easier debugging
  },
});
