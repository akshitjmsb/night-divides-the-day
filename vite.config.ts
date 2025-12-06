import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY), // Removed
      'process.env.PERPLEXITY_API_KEY': JSON.stringify(env.PERPLEXITY_API_KEY || env.VITE_PERPLEXITY_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        // Multiple entry points for different pages
        input: {
          main: path.resolve(__dirname, 'index.html'),
          todo: path.resolve(__dirname, 'todo.html'),
          meditate: path.resolve(__dirname, 'meditate.html'),
          quantum: path.resolve(__dirname, 'quantum.html'),
          health: path.resolve(__dirname, 'health.html'),
          travel: path.resolve(__dirname, 'travel.html'),
        },
        // Remove external configuration for @google/genai since it's used client-side
        // The import map in HTML will handle the external dependency
      }
    }
  };
});
