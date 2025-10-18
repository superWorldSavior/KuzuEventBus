import { component$ } from '@builder.io/qwik';

export interface GraphCountsProps {
  counts: { nodes: number; edges: number } | null;
  label: string;
}

export default component$<GraphCountsProps>(({ counts, label }) => {
  return (
    <div class="space-y-1">
      <span class="text-sm text-neutral-600 dark:text-neutral-400">{label}:</span>
      <div class="text-sm text-neutral-900 dark:text-neutral-100">
        {counts ? `${counts.nodes} nodes / ${counts.edges} edges` : '—'}
      </div>
    </div>
  );
});
