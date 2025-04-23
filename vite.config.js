import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHtmlPlugin } from 'vite-plugin-html'; // ✅ added

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    createHtmlPlugin() // ✅ added
  ],
  server: {
    historyApiFallback: true, // ✅ stops crash when refreshing on /jobs
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  resolve: {
    alias: {
      buffer: require.resolve('buffer/'),
      './window': path.resolve(__dirname, 'src/shims/empty.js'),
      '@': path.resolve(__dirname, 'src'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '../internals/define-window-property': path.resolve(__dirname, 'src/shims/empty.js'),
      '../internals/window-this': path.resolve(__dirname, 'src/shims/empty.js'),
      globals: path.resolve(__dirname, 'src/shims/empty.js'),
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
    sourcemap: true,
  },
});
