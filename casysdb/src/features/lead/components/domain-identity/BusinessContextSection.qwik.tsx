import { component$ } from '@builder.io/qwik';

export interface BusinessContextSectionProps {
  industry?: string;
  targetAudience?: string;
  contentType?: string;
  businessDescription?: string;
  rawAnalysis?: string;
  lang?: string;
}

export default component$<BusinessContextSectionProps>(({ industry, targetAudience, contentType, businessDescription, lang }) => {
  const locale = lang ?? 'en';
  const hasData = !!(industry ?? targetAudience ?? contentType ?? businessDescription);

  const t = {
    title: locale === 'fr' ? 'Contexte business' : 'Business context',
    industry: locale === 'fr' ? 'Industrie' : 'Industry',
    audience: locale === 'fr' ? 'Audience' : 'Audience',
    contentType: locale === 'fr' ? 'Type contenu' : 'Content type',
    loading: locale === 'fr' ? 'Analyse en cours...' : 'Analyzing...',
  };

  return (
    <div>
      <h3 class="font-semibold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-400 mb-3">
        {t.title}
      </h3>

      {!hasData ? (
        // Skeleton loader
        <div class="space-y-2 text-sm animate-pulse">
          <div class="flex items-start gap-2">
            <div class="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
            <div class="h-4 bg-neutral-300 dark:bg-neutral-600 rounded w-32"></div>
          </div>
          <div class="flex items-start gap-2">
            <div class="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
            <div class="h-4 bg-neutral-300 dark:bg-neutral-600 rounded w-40"></div>
          </div>
          <div class="flex items-start gap-2">
            <div class="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
            <div class="h-4 bg-neutral-300 dark:bg-neutral-600 rounded w-28"></div>
          </div>
          <div class="mt-2 h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
        </div>
      ) : (
        // Actual data
        <div class="space-y-2 text-sm">
          {industry && (
            <div class="flex items-start gap-2">
              <span class="font-medium text-neutral-700 dark:text-neutral-300 min-w-[80px]">{t.industry}:</span>
              <span class="text-neutral-900 dark:text-neutral-100">{industry}</span>
            </div>
          )}
          {targetAudience && (
            <div class="flex items-start gap-2">
              <span class="font-medium text-neutral-700 dark:text-neutral-300 min-w-[80px]">{t.audience}:</span>
              <span class="text-neutral-900 dark:text-neutral-100">{targetAudience}</span>
            </div>
          )}
          {contentType && (
            <div class="flex items-start gap-2">
              <span class="font-medium text-neutral-700 dark:text-neutral-300 min-w-[80px]">{t.contentType}:</span>
              <span class="text-neutral-900 dark:text-neutral-100">{contentType}</span>
            </div>
          )}
          {businessDescription && (
            <p class="mt-2 text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed">{businessDescription}</p>
          )}
        </div>
      )}
    </div>
  );
});
