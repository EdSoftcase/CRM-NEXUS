
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_KEY': JSON.stringify(env.VITE_SUPABASE_KEY),
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        // Redireciona chamadas do frontend (/api-bridge) para o backend (port 3001)
        // Isso faz o navegador pensar que está falando com o mesmo servidor, evitando bloqueios.
        '/api-bridge': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-bridge/, '')
        }
      }
    },
    build: {
      // Aumenta o limite do aviso para 1600kb para evitar alertas desnecessários em apps grandes
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          // Estratégia manual de divisão de código (Code Splitting)
          // Separa bibliotecas grandes em arquivos individuais para melhor cache e carregamento
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'react-vendor';
              }
              if (id.includes('recharts')) {
                return 'charts';
              }
              if (id.includes('leaflet')) {
                return 'maps';
              }
              if (id.includes('xlsx') || id.includes('html2pdf')) {
                return 'utils';
              }
              if (id.includes('@supabase') || id.includes('@google/genai')) {
                return 'services';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              // Qualquer outra dependência vai para o chunk 'vendor' genérico
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
