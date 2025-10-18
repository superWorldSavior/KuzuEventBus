// Déclarations TypeScript pour les fonctions globales personnalisées

declare global {
  interface Window {
    // Modal de création de projet
    openCreateProjectModal: () => void;
    closeCreateProjectModal: () => void;
  }
}

export {};
