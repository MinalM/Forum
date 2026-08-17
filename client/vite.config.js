import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: 'REACT_APP_',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:2000'
    }
  },
  build: {
    outDir: 'build'
  },
  // Source files use JSX in .js files (CRA convention) rather than .jsx —
  // esbuild only parses JSX in .jsx/.tsx by default, so opt .js in too.
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  }
});
