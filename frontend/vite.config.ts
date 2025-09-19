import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/pages": path.resolve(__dirname, "./src/pages"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/store": path.resolve(__dirname, "./src/store"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          'vendor-query': ['@tanstack/react-query', 'axios'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-icons': ['@phosphor-icons/react'],
          
          // Heavy libraries
          'monaco-editor': ['@monaco-editor/react', 'monaco-editor'],
          'd3-visualization': ['d3'],
          'charts': ['recharts'],
          
          // App chunks
          'auth': [
            './src/pages/auth/LoginPage',
            './src/pages/auth/RegisterPage',
            './src/hooks/useAuth',
            './src/store/auth'
          ],
          'database': [
            './src/pages/databases/DatabasesPage',
            './src/pages/databases/DatabaseDetailsPage'
          ],
          'queries': [
            './src/pages/queries/QueriesPage',
            './src/pages/queries/VisualQueryBuilderPage',
            './src/components/queries/QueryExecutor',
            './src/components/queries/CypherEditor'
          ],
          'visualizations': [
            './src/pages/visualizations/NetworkVisualizationPage',
            './src/components/visualizations/NetworkDiagram',
            './src/components/visualizations/ResultsGraph'
          ],
          'analytics': ['./src/pages/analytics/AnalyticsPage'],
          'search': ['./src/pages/search/SearchPage'],
          'settings': ['./src/pages/settings/SettingsPage']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1000kb
  }
});
