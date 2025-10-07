import { component$ } from '@builder.io/qwik';

export interface ResultSummaryProps {
  result: any;
}

export default component$<ResultSummaryProps>(({ result }) => {
  if (!result) return null as any;
  try {
    const lang = result?.language ?? 'n/a';
    const tags = Array.isArray(result?.keywordPlan?.tags) ? result.keywordPlan.tags : [];
    const competitors = Array.isArray(result?.competitors) ? result.competitors : [];
    const trends = Array.isArray(result?.trends) ? result.trends : [];
    return (
      <div class="card p-4 space-y-2 border border-neutral-200 dark:border-neutral-800 rounded-lg">
        <div class="text-sm text-neutral-600 dark:text-neutral-400">Language: <strong class="text-neutral-900 dark:text-neutral-100">{lang}</strong></div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">Tags: <strong class="text-neutral-900 dark:text-neutral-100">{tags.length}</strong></div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">Competitors: <strong class="text-neutral-900 dark:text-neutral-100">{competitors.length}</strong></div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">Trends: <strong class="text-neutral-900 dark:text-neutral-100">{trends.length}</strong></div>
      </div>
    );
  } catch {
    return (
      <pre class="text-xs bg-neutral-100 dark:bg-neutral-900 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
    );
  }
});
