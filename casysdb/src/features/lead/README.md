# Lead Analysis Feature (Qwik + Astro)

## Structure

```
src/features/lead/
├── components/
│   ├── LeadFlow.qwik.tsx        # Composant principal avec SSE
│   ├── SeedSelector.qwik.tsx    # Sélection keywords seeds
│   ├── Stepper.qwik.tsx         # Progression visuelle
│   ├── UnlockForm.qwik.tsx      # Email pour unlock
│   ├── GraphCounts.qwik.tsx     # Affichage counts preview/full
│   └── ResultSummary.qwik.tsx   # Résumé du résultat
├── services/
│   └── lead.api.ts              # API client (SSE, fetch)
└── README.md                    # Ce fichier
```

## Usage dans Astro

```astro
---
import LeadFlow from '../features/lead/components/LeadFlow.qwik';
const lang = (Astro as any).currentLocale ?? 'en';
---

<LeadFlow domain="example.com" lang={lang} />
```

## ⚠️ IMPORTANT: Qwik + Astro SSR

### NE PAS utiliser de directives `client:*`

```astro
<!-- ❌ MAUVAIS -->
<LeadFlow client:load ... />
<LeadFlow client:only="qwik" ... />
<LeadFlow client:visible ... />

<!-- ✅ BON -->
<LeadFlow ... />
```

**Raison:** Qwik utilise la "resumability" et non l'hydratation classique. Les directives `client:*` d'Astro cassent le système de sérialisation de Qwik (erreur: `Converting circular structure to JSON`).

### NE PAS accéder au DOM en SSR

```tsx
// ❌ MAUVAIS - document n'existe pas en SSR
const lang = document.documentElement.lang;

// ✅ BON - Passer via props depuis Astro
export interface MyComponentProps {
  lang?: string;
}
const locale = props.lang ?? 'en';
```

**Raison:** Astro fait du SSR statique au build. `document` et `window` n'existent pas côté serveur. Utiliser les props pour passer les données du contexte Astro.

## Flux utilisateur

1. **Hero (`/`)** → Saisie domaine → Redirect `/lead?domain=...`
2. **Lead page** → Composant LeadFlow hydrate avec le domaine pré-rempli
3. **SSE Analysis** → Le stepper se remplit au fur et à mesure
4. **Seeds selection** → Option de sélectionner les seeds et relancer
5. **Unlock** → Email pour débloquer le graphe complet

## API

Le service `lead.api.ts` communique avec:
- `POST /api/lead/start` - Démarre l'analyse (SSE)
- `GET /api/lead/:id/result` - Récupère le résultat
- `GET /api/lead/:id/preview` - Graph preview
- `POST /api/lead/:id/subscribe` - S'abonner avec email
- `GET /api/lead/:id/full` - Graph complet (avec email)

## Props principales

### LeadFlow

| Prop | Type | Description |
|------|------|-------------|
| `domain` | `string?` | Domaine pré-rempli (depuis URL) |
| `apiBase` | `string?` | Base URL API (défaut: env var) |
| `lang` | `string?` | Langue ('en' ou 'fr', défaut: 'en') |

## Styles

Tous les composants utilisent les utilitaires Tailwind alignés avec le thème du site:
- Gradient: `bg-[linear-gradient(90deg,#000,#dbbddb)]`
- Neutral borders: `border-neutral-200 dark:border-neutral-800`
- Dark mode: `dark:bg-neutral-900 dark:text-neutral-100`

## Migration depuis Svelte

Cette feature remplace l'ancienne app `apps/lead-app/` (SvelteKit).

Composants migrés:
- ✅ Stepper (Svelte → Qwik)
- ✅ SeedSelector (Svelte → Qwik)
- ✅ UnlockForm (Svelte → Qwik)
- ✅ GraphCounts (Svelte → Qwik)
- ✅ ResultSummary (Svelte → Qwik)
- ✅ LeadFlow (Svelte store → Qwik signals)

## Build

```bash
# Dev
pnpm --filter casys-app dev

# Build
pnpm --filter casys-app build

# Preview
pnpm --filter casys-app preview
```
