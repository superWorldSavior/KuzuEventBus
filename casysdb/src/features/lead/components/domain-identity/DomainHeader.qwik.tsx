import { component$ } from '@builder.io/qwik';

export interface DomainHeaderProps {
  domain: string;
  languageCode?: string;
  countryCode?: string;
  lang?: string;
}

export default component$<DomainHeaderProps>(({ domain, languageCode, countryCode, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    title: locale === 'fr' ? 'Photo d\'identité SEO' : 'SEO Identity Card',
  };

  return (
    <div class="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
      <h2 class="text-2xl font-bold bg-clip-text text-transparent bg-[linear-gradient(90deg,#000,#dbbddb)] dark:bg-[linear-gradient(90deg,#dbbddb,#ffffff)]">
        {t.title}
      </h2>
      <div class="flex flex-col items-end gap-1">
        <code class="px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-sm font-semibold">
          {domain}
        </code>
        {languageCode && (
          <div class="flex gap-1 text-xs">
            <span class="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {languageCode}
            </span>
            <span class="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {countryCode}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
