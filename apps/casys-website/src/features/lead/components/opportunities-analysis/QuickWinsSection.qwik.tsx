import { component$ } from '@builder.io/qwik';

export interface QuickWin {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  score: number;
}

export interface QuickWinsSectionProps {
  quickWins: QuickWin[];
  lang?: string;
}

export default component$<QuickWinsSectionProps>(({ quickWins, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    title: locale === 'fr' ? 'Quick Wins' : 'Quick Wins',
    subtitle: locale === 'fr' ? 'Faible concurrence + Fort volume' : 'Low competition + High volume',
  };

  const fmt = (n?: number) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '—';
  const list = quickWins.slice(0, 10);

  if (list.length === 0) return null;

  return (
    <div class="mb-6">
      <div class="mb-3">
        <h3 class="font-semibold text-sm uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
          {t.title}
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t.subtitle}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((qw) => (
          <div key={qw.keyword} class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-green-50/50 to-white/50 dark:from-green-900/10 dark:to-neutral-900/50">
            <div class="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-2">{qw.keyword}</div>
            <div class="flex items-center justify-between text-xs">
              <div>
                <span class="text-neutral-500 dark:text-neutral-400">Vol: </span>
                <span class="font-medium text-neutral-900 dark:text-neutral-100">{fmt(qw.searchVolume)}</span>
              </div>
              <div>
                <span class="text-neutral-500 dark:text-neutral-400">Diff: </span>
                <span class="font-medium text-neutral-900 dark:text-neutral-100">{qw.difficulty ?? '—'}</span>
              </div>
              <div>
                <span class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                  {qw.score.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
