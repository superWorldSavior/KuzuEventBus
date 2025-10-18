import { component$ } from '@builder.io/qwik';

export interface KeywordData {
  keyword: string;
  position?: number;
  searchVolume?: number;
}

export interface KeywordsSectionProps {
  keywords?: KeywordData[];
  siteKeywords?: string[];
  lang?: string;
}

export default component$<KeywordsSectionProps>(({ keywords, siteKeywords, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    title: locale === 'fr' ? 'Mots-clés identifiés' : 'Identified keywords',
    ranked: locale === 'fr' ? 'Mots-clés rankés' : 'Ranked keywords',
    site: locale === 'fr' ? 'Mots-clés du site' : 'Site keywords',
    position: locale === 'fr' ? 'Position' : 'Position',
    volume: locale === 'fr' ? 'Volume' : 'Volume',
  };

  const rankedKwList = Array.isArray(keywords) ? keywords.slice(0, 10) : [];
  const siteKwList = Array.isArray(siteKeywords) ? siteKeywords.slice(0, 10) : [];

  if (rankedKwList.length === 0 && siteKwList.length === 0) return null;

  return (
    <div class="mb-6">
      <h3 class="font-semibold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-3">
        {t.title}
      </h3>
      
      {/* Ranked keywords with metrics */}
      {rankedKwList.length > 0 && (
        <div class="mb-4">
          <h4 class="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">{t.ranked}</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rankedKwList.map((kw) => (
              <div key={kw.keyword} class="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70">
                <div class="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">{kw.keyword}</div>
                <div class="flex gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {kw.position !== undefined && kw.position !== null && (
                    <span>{t.position}: #{kw.position}</span>
                  )}
                  {kw.searchVolume !== undefined && kw.searchVolume !== null && (
                    <span>{t.volume}: {kw.searchVolume.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Site keywords */}
      {siteKwList.length > 0 && (
        <div>
          <h4 class="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">{t.site}</h4>
          <div class="flex flex-wrap gap-2">
            {siteKwList.map((kw) => (
              <span key={kw} class="px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 text-sm bg-white/70 dark:bg-neutral-900/70 text-neutral-900 dark:text-neutral-100 font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
