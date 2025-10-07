import { $, component$, type QRL } from '@builder.io/qwik';

export interface SeedSelectorProps {
  seeds: string[];
  selected: string[];
  disabled?: boolean;
  onChange$: QRL<(nextSelected: string[]) => void>;
  onRerun$?: QRL<() => void>;
  lang?: string;
}

export default component$<SeedSelectorProps>(({ seeds, selected, disabled, onChange$, onRerun$, lang }) => {
  const locale = lang ?? 'en';
  const isSelected = (s: string) => selected.includes(s);
  const toggle$ = $((s: string) => {
    const set = new Set(selected);
    if (set.has(s)) set.delete(s); else set.add(s);
    onChange$(Array.from(set));
  });

  return (
    <div class="mb-8">
      <h3 class="font-semibold mb-2">{locale === 'fr' ? 'Mots-clés seeds (sélection)' : 'Seed keywords (selection)'}</h3>
      <div class="flex flex-wrap gap-2">
        {seeds.map((s) => (
          <button
            type="button"
            disabled={disabled}
            onClick$={() => toggle$(s)}
            class={
              'px-3 py-1 rounded-full border transition-colors ' +
              (isSelected(s)
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black'
                : 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100')
            }
          >
            {s}
          </button>
        ))}
      </div>
      {onRerun$ && (
        <div class="mt-3">
          <button disabled={disabled} onClick$={onRerun$} class="px-3 py-2 rounded-lg font-semibold text-white bg-neutral-800 dark:bg-neutral-200 dark:text-black disabled:opacity-60">
            {locale === 'fr' ? 'Relancer avec sélection' : 'Rerun with selection'}
          </button>
        </div>
      )}
    </div>
  );
});
