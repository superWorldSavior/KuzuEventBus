import { component$ } from '@builder.io/qwik';

export interface OpportunitiesHeaderProps {
  totalClusters: number;
  totalQuickWins: number;
  totalTopics: number;
  lang?: string;
}

export default component$<OpportunitiesHeaderProps>(({ totalClusters, totalQuickWins, totalTopics, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    title: locale === 'fr' ? 'Opportunités détectées' : 'Detected opportunities',
    clusters: locale === 'fr' ? 'Clusters keywords' : 'Keyword clusters',
    quickWins: locale === 'fr' ? 'Quick wins' : 'Quick wins',
    topics: locale === 'fr' ? 'Topics suggérés' : 'Suggested topics',
  };

  return (
    <div class="mb-6">
      <h2 class="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-[linear-gradient(90deg,#000,#dbbddb)] dark:bg-[linear-gradient(90deg,#dbbddb,#ffffff)]">
        {t.title}
      </h2>
      <div class="grid grid-cols-3 gap-3">
        <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 text-center">
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalClusters}</div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{t.clusters}</div>
        </div>
        <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 text-center">
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalQuickWins}</div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{t.quickWins}</div>
        </div>
        <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 text-center">
          <div class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalTopics}</div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{t.topics}</div>
        </div>
      </div>
    </div>
  );
});
