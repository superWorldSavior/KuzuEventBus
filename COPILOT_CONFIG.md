# Copilot Configuration pour KuzuEventBus Frontend

## Vue d'ensemble

Cette configuration optimise GitHub Copilot pour le développement du frontend KuzuEventBus, un projet React/TypeScript moderne utilisant Vite, Tailwind CSS, et une architecture propre.

## Configuration mise en place

### 1. Instructions Copilot (`.github/copilot-instructions.md`)

- Guide complet pour l'architecture du projet
- Standards de codage et patterns recommandés
- Conventions d'importation et structure des composants
- Bonnes pratiques TypeScript et React

### 2. Configuration frontend locale (`frontend/.copilotrc.md`)

- Référence rapide pour la stack technique
- Alias de chemins et templates de composants
- Patterns d'API et gestion d'état
- Guidelines de styling

### 3. Configuration ESLint (`frontend/.eslintrc.cjs`)

- Règles TypeScript et React optimisées
- Organisation automatique des imports
- Standards de qualité du code

### 4. Configuration VS Code (`frontend/.vscode/`)

- **settings.json**: Configuration Copilot et outils de développement
- **extensions.json**: Extensions recommandées
- Formatage automatique et correction des erreurs

### 5. Configuration Prettier (`frontend/.prettierrc`)

- Style de code cohérent
- Support Tailwind CSS
- Configuration adaptée au projet

## Stack technique détectée

### Frontend

- **Framework**: React 18 avec TypeScript
- **Build Tool**: Vite 7.1.6
- **Styling**: Tailwind CSS avec shadcn/ui
- **State Management**:
  - Zustand pour l'état global
  - React Query (@tanstack/react-query) pour l'état serveur
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form avec validation Zod
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Charts**: Recharts et D3.js
- **Code Editor**: Monaco Editor

### Configuration détectée

- **TypeScript strict mode** activé
- **Path aliases** configurés (@/ pour src/)
- **Proxy API** vers localhost:8000 (backend)
- **Auto-import** et organisation des imports

## Utilisation avec Copilot

### Génération de composants

Copilot générera automatiquement des composants suivant ce pattern :

```typescript
interface ComponentProps {
  title: string;
  isVisible?: boolean;
  onAction?: () => void;
}

export function Component({
  title,
  isVisible = true,
  onAction,
}: ComponentProps) {
  return (
    <div className={cn("base-styles", { "conditional-styles": isVisible })}>
      {title}
    </div>
  );
}
```

### Gestion des formulaires

```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    /* ... */
  },
});
```

### Appels API

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["resource"],
  queryFn: () => apiClient.get("/endpoint"),
});
```

## Architecture respectée

```
src/
├── components/         # Composants réutilisables
│   ├── charts/        # Composants de graphiques
│   ├── dashboard/     # Composants spécifiques au dashboard
│   ├── layout/        # Composants de layout
│   └── ui/            # Composants UI de base
├── hooks/             # Hooks React personnalisés
├── pages/             # Composants de page (niveau route)
├── services/          # Clients API et services externes
├── store/             # Stores Zustand
├── types/             # Définitions TypeScript
└── utils/             # Fonctions utilitaires
```

## Conventions d'import

1. Packages React et externes
2. Composants et hooks internes
3. Types (avec `import type`)
4. Utilitaires et constantes

## Recommendations

1. **Utilisez les path aliases** : `@/components/Button` au lieu de `../../components/Button`
2. **Types explicites** : Toujours définir les interfaces des props
3. **Validation Zod** : Pour tous les formulaires et données API
4. **Tailwind CSS** : Utiliser les classes utilitaires avec `cn()` pour le styling conditionnel
5. **React Query** : Pour tous les appels API et cache de données
6. **Zustand** : Pour l'état global (auth, navigation)

Cette configuration permet à Copilot de générer du code cohérent avec l'architecture existante et les standards du projet.
