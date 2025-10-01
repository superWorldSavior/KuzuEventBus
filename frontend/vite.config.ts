import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  // HMR: serve on the same origin as the app. Browser connects to ws://localhost:3100
  
  return {
    plugins: [react()],
    logLevel: 'info',
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@/components": path.resolve(__dirname, "./src/components"),
        "@/pages": path.resolve(__dirname, "./src/pages"),
        "@/hooks": path.resolve(__dirname, "./src/hooks"),
        "@/store": path.resolve(__dirname, "./src/store"),
        "@/services": path.resolve(__dirname, "./src/services"),
        "@/types": path.resolve(__dirname, "./src/types"),
        "@/shared/lib": path.resolve(__dirname, "./src/shared/lib"),
      },
    },
    
    server: {
      port: 3000,
      host: true, // Enable access from Docker containers
      // HMR served on server port (3000). Browser connects via host port 3100
      hmr: {
        host: 'localhost',
        clientPort: 3100,
        protocol: 'ws',
      },
      // Watch for changes with polling (important for Docker)
      watch: {
        usePolling: true,
        // Ignore node_modules to improve performance
        ignored: ['**/node_modules/**', '**/dist/**']
      },
      proxy: {
        "/api": {
          target: "http://api:8000", // Docker service name (container-to-container on VM)
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            console.log('[Vite Proxy] Rewriting:', path);
            return path;
          },
        },
      },
    },

    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: !isProduction,
      
      rollupOptions: {
        output: {
          // Improved manual chunks with better splitting
          manualChunks: (id) => {
            // Vendor chunks - React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            
            // Query and data fetching
            if (id.includes('@tanstack/react-query') || id.includes('axios')) {
              return 'vendor-query';
            }
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'vendor-forms';
            }
            
            // Icons and UI utilities
            if (id.includes('@phosphor-icons') || id.includes('tailwind') || id.includes('clsx')) {
              return 'vendor-ui-utils';
            }
            
            // Heavy visualization libraries
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'monaco-editor';
            }
            
            if (id.includes('d3')) {
              return 'd3-visualization';
            }
            
            if (id.includes('recharts')) {
              return 'charts';
            }
            
            // App-specific chunks based on routes
            if (id.includes('src/pages/auth') || id.includes('src/hooks/useAuth') || id.includes('src/store/auth')) {
              return 'route-auth';
            }
            
            if (id.includes('src/pages/databases')) {
              return 'route-databases';
            }
            
            if (id.includes('src/pages/queries') || id.includes('src/components/queries')) {
              return 'route-queries';
            }
            
            if (id.includes('src/pages/visualizations') || id.includes('src/components/visualizations')) {
              return 'route-visualizations';
            }
            
            if (id.includes('src/pages/analytics')) {
              return 'route-analytics';
            }
            
            if (id.includes('src/pages/search')) {
              return 'route-search';
            }
            
            if (id.includes('src/pages/settings')) {
              return 'route-settings';
            }
            
            // Shared components
            if (id.includes('src/components/ui') || id.includes('src/components/layout')) {
              return 'shared-ui';
            }
            
            // Other node_modules
            if (id.includes('node_modules')) {
              return 'vendor-misc';
            }
          },
          
          // Optimize chunk names
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || 'asset';
            const extType = name.split('.').pop();
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|ttf|otf/i.test(extType || '')) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      
      chunkSizeWarningLimit: 1000,
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'axios',
        'clsx',
        'tailwind-merge',
      ],
    },
  };
});
