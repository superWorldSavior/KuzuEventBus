import { component$ } from '@builder.io/qwik';

export interface KeywordCluster {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  trend?: string;
}

export interface KeywordClustersTableProps {
  clusters: KeywordCluster[];
  lang?: string;
}

export default component$<KeywordClustersTableProps>(({ clusters, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    title: locale === 'fr' ? 'Clusters keywords' : 'Keyword clusters',
    keyword: locale === 'fr' ? 'Mot-clé' : 'Keyword',
    volume: locale === 'fr' ? 'Volume' : 'Volume',
    difficulty: locale === 'fr' ? 'Difficulté' : 'Difficulty',
    trend: locale === 'fr' ? 'Tendance' : 'Trend',
  };

  const fmt = (n?: number) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '—';
  const list = clusters.slice(0, 20);

  if (list.length === 0) return null;

  return (
    <div class="mb-6">
      <h3 class="font-semibold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-3">
        {t.title}
      </h3>
      
      {/* Mobile: Cards */}
      <div class="block md:hidden space-y-2">
        {list.map((c) => (
          <div key={c.keyword} class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <div class="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-2">{c.keyword}</div>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div class="text-neutral-500 dark:text-neutral-400">{t.volume}</div>
                <div class="font-medium text-neutral-900 dark:text-neutral-100">{fmt(c.searchVolume)}</div>
              </div>
              <div>
                <div class="text-neutral-500 dark:text-neutral-400">{t.difficulty}</div>
                <div class="font-medium text-neutral-900 dark:text-neutral-100">{c.difficulty ?? '—'}</div>
              </div>
              <div>
                <div class="text-neutral-500 dark:text-neutral-400">{t.trend}</div>
                <div class="font-medium text-neutral-900 dark:text-neutral-100">{c.trend ?? 'stable'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table */}
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-neutral-800">
              <th class="text-left py-2 px-3 font-semibold text-neutral-600 dark:text-neutral-400">{t.keyword}</th>
              <th class="text-right py-2 px-3 font-semibold text-neutral-600 dark:text-neutral-400">{t.volume}</th>
              <th class="text-right py-2 px-3 font-semibold text-neutral-600 dark:text-neutral-400">{t.difficulty}</th>
              <th class="text-center py-2 px-3 font-semibold text-neutral-600 dark:text-neutral-400">{t.trend}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.keyword} class="border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <td class="py-2 px-3 font-medium text-neutral-900 dark:text-neutral-100">{c.keyword}</td>
                <td class="py-2 px-3 text-right text-neutral-700 dark:text-neutral-300">{fmt(c.searchVolume)}</td>
                <td class="py-2 px-3 text-right text-neutral-700 dark:text-neutral-300">{c.difficulty ?? '—'}</td>
                <td class="py-2 px-3 text-center text-neutral-700 dark:text-neutral-300">{c.trend ?? 'stable'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
