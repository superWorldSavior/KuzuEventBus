import { component$ } from '@builder.io/qwik';

export interface Competitor {
  url: string;
  title?: string;
  description?: string;
}

export interface CompetitorsSectionProps {
  competitors: Competitor[];
  lang?: string;
}

function hostname(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

export default component$<CompetitorsSectionProps>(({ competitors, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    title: locale === 'fr' ? 'Concurrents SERP' : 'SERP competitors',
  };

  const compList = Array.isArray(competitors) ? competitors.slice(0, 5) : [];

  if (compList.length === 0) return null;

  return (
    <div>
      <h3 class="font-semibold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-3">
        {t.title}
      </h3>
      <ul class="space-y-2">
        {compList.map((c) => (
          <li key={c.url} class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
            <a href={c.url} target="_blank" rel="noopener" class="font-semibold text-sm underline text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-300">
              {c.title ?? hostname(c.url)}
            </a>
            <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{hostname(c.url)}</div>
            {c.description && (
              <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">{c.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});
