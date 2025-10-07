// @ts-check
import starlight from '@astrojs/starlight';
import vercel from '@astrojs/vercel';
import qwikdev from '@qwikdev/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  // Déploiement Vercel (autorise SSR si nécessaire, majoritairement statique)
  adapter: vercel(),

  // Server config (port non-standard pour éviter conflits)
  server: {
    port: 4322,
    host: true,
  },

  integrations: [
    starlight({
      title: 'CasysDB',
      description: 'An embedded graph database with ISO GQL support',
      logo: {
        src: './public/icons/logo.svg',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/casysai/casysdb',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'GQL Syntax',
          autogenerate: { directory: 'gql' },
        },
        {
          label: 'Python SDK',
          autogenerate: { directory: 'sdk/python' },
        },
        {
          label: 'TypeScript SDK',
          autogenerate: { directory: 'sdk/typescript' },
        },
        {
          label: 'Examples',
          autogenerate: { directory: 'examples' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'api' },
        },
      ],
      customCss: [
        './src/styles/starlight.css',
      ],
      defaultLocale: 'en',
      locales: {
        en: { label: 'English' },
        fr: { label: 'Français' },
      },
    }),
    icon(),
    qwikdev()
  ],

  // Configuration pour les articles MDX
  markdown: {
    // Activer la coloration syntaxique
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid', 'math'],
    },
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
    // Mermaid est géré par l'intégration @astrojs/mermaid
  },

  vite: {
    clearScreen: false, // Ne pas nettoyer l'écran pour conserver l'historique des logs
    // @ts-expect-error - Vite 7 plugin type mismatch with @tailwindcss/vite
    plugins: [tailwindcss()],
    define: {
      // Expose CASYS_API_URL au client (aligné avec .env racine)
      'import.meta.env.CASYS_API_URL': JSON.stringify(process.env.CASYS_API_URL ?? 'http://localhost:3001'),
    },
    resolve: {
      alias: {
        '~': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
