import { component$ } from '@builder.io/qwik';

export interface MetricsGridProps {
  organicTraffic?: number;
  domainRank?: number;
  keywordsCount?: number;
  domainValue?: number;
  lang?: string;
}

export default component$<MetricsGridProps>(({ organicTraffic, domainRank, keywordsCount, domainValue, lang }) => {
  const locale = lang ?? 'en';
  // Always show data - display "—" for missing values instead of infinite skeleton
  const hasData = true;
  
  const t = {
    title: locale === 'fr' ? 'Métriques domaine' : 'Domain metrics',
    traffic: locale === 'fr' ? 'Trafic organique' : 'Organic traffic',
    rank: locale === 'fr' ? 'Rank' : 'Rank',
    keywords: locale === 'fr' ? 'Mots-clés' : 'Keywords',
    value: locale === 'fr' ? 'Valeur domaine' : 'Domain value',
  };

  const fmt = (n?: number) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '—';

  return (
    <div>
      <h3 class="font-semibold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-3">
        {t.title}
      </h3>
      
      {!hasData ? (
        // Skeleton loader
        <div class="grid grid-cols-2 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
              <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20 mb-2"></div>
              <div class="h-6 bg-neutral-300 dark:bg-neutral-600 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        // Actual data
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t.traffic}</div>
            <div class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{fmt(organicTraffic)}</div>
          </div>
          <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t.rank}</div>
            <div class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{fmt(domainRank)}</div>
          </div>
          <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t.keywords}</div>
            <div class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{fmt(keywordsCount)}</div>
          </div>
          <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t.value}</div>
            <div class="text-lg font-bold text-neutral-900 dark:text-neutral-100">${fmt(domainValue)}</div>
          </div>
        </div>
      )}
    </div>
  );
});
