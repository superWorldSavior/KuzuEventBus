import { component$ } from '@builder.io/qwik';

export interface SuggestedTopic {
  title: string;
  keywords: string[];
  estimatedTraffic?: number;
  difficulty?: number;
}

export interface SuggestedTopicsGridProps {
  topics: SuggestedTopic[];
  lang?: string;
}

export default component$<SuggestedTopicsGridProps>(({ topics, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    title: locale === 'fr' ? 'Topics suggérés' : 'Suggested topics',
    traffic: locale === 'fr' ? 'Trafic estimé' : 'Est. traffic',
    difficulty: locale === 'fr' ? 'Difficulté' : 'Difficulty',
  };

  const fmt = (n?: number) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '—';
  const list = topics.slice(0, 12);

  if (list.length === 0) return null;

  return (
    <div class="mb-6">
      <h3 class="font-semibold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-3">
        {t.title}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((topic) => (
          <div key={topic.title} class="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 hover:shadow-md transition-shadow">
            <h4 class="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-2 line-clamp-2">
              {topic.title}
            </h4>
            <div class="flex flex-wrap gap-1 mb-3">
              {topic.keywords.slice(0, 3).map((kw) => (
                <span key={kw} class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
                  {kw}
                </span>
              ))}
            </div>
            <div class="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <div>
                <span>{t.traffic}: </span>
                <span class="font-medium text-neutral-900 dark:text-neutral-100">{fmt(topic.estimatedTraffic)}</span>
              </div>
              <div>
                <span>{t.difficulty}: </span>
                <span class="font-medium text-neutral-900 dark:text-neutral-100">{topic.difficulty ?? '—'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
