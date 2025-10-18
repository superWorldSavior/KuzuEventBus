// @ts-check
import starlight from '@astrojs/starlight';
import vercel from '@astrojs/vercel';
import qwikdev from '@qwikdev/astro';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const rkMod = require('remark-kroki');
const remarkKroki = rkMod?.remarkKroki || rkMod?.default || rkMod;

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
      components: {
        Head: './src/components/overrides/Head.astro',
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
          label: 'Core Concepts',
          autogenerate: { directory: 'core' },
        },
        {
          label: 'ORM',
          autogenerate: { directory: 'orm' },
        },
      ],
      customCss: [
        './src/styles/starlight.css',
      ],
      // Mermaid rendu côté client via script global (sans Playwright)
    }),
    mdx(),
    icon(),
    qwikdev()
  ],

  // Configuration pour les articles MDX
  markdown: {
    // Pré-rendu Mermaid via Kroki (SVG inline, sans Chromium)
    remarkPlugins: [[remarkKroki, { server: 'https://kroki.io', output: 'inline-svg' }]],
    // Activer la coloration syntaxique
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid', 'math'],
    },
  },
  vite: {
    clearScreen: false,
    define: {
      'import.meta.env.CASYS_API_URL': JSON.stringify(process.env.CASYS_API_URL ?? 'http://localhost:3001'),
    },
    resolve: {
      alias: {
        '~': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
