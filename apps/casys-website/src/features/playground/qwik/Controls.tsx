import { component$, PropFunction } from '@builder.io/qwik';

export interface ControlsProps {
  onInsert$: PropFunction<() => void>;
  onBranch$: PropFunction<() => void>;
  onMerge$: PropFunction<() => void>;
  onRecovery$: PropFunction<() => void>;
  onReset$: PropFunction<() => void>;
}

export const Controls = component$((props: ControlsProps) => {
  return (
    <div class="space-y-3">
      <div class="text-sm uppercase tracking-wide text-[var(--muted)]">Étapes</div>
      <div class="flex flex-wrap gap-2">
        <button class="px-3 py-2 rounded-lg font-semibold border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--acc)] hover:bg-[var(--acc-soft)] transition-colors text-sm" onClick$={props.onBranch$}>1. Branch</button>
        <button class="px-3 py-2 rounded-lg font-semibold border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--acc)] hover:bg-[var(--acc-soft)] transition-colors text-sm" onClick$={props.onInsert$}>2. Insert</button>
        <button class="px-3 py-2 rounded-lg font-semibold border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--acc)] hover:bg-[var(--acc-soft)] transition-colors text-sm" onClick$={props.onRecovery$}>3. Branch from c2</button>
        <button class="px-3 py-2 rounded-lg font-semibold border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--acc)] hover:bg-[var(--acc-soft)] transition-colors text-sm" onClick$={props.onMerge$}>4. Merge</button>
        <button class="px-3 py-2 rounded-lg font-semibold border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--acc)] hover:bg-[var(--acc-soft)] transition-colors text-sm" onClick$={props.onReset$}>Reset</button>
      </div>
    </div>
  );
});

export default Controls;
