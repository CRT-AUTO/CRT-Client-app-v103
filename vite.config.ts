import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor': ['recharts'],
            'supabase-vendor': ['@supabase/supabase-js']
          }
        }
      }
    },
    server: {
      port: 3000,
      host: true,
      strictPort: true,
      hmr: {
        overlay: false
      }
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    }
  };
});