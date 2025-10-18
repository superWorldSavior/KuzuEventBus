import { component$, type QRL } from '@builder.io/qwik';

export interface TopProgressBarProps {
  steps: { label: string }[];
  activeIndex: number; // 0-based
  onStepClick$?: QRL<(index: number) => void>;
}

export default component$<TopProgressBarProps>(({ steps, activeIndex, onStepClick$ }) => {
  if (!Array.isArray(steps) || steps.length === 0) return null as any;
  const clamped = Math.max(0, Math.min(activeIndex ?? 0, steps.length - 1));
  const progress = steps.length > 1 ? (clamped / (steps.length - 1)) : 1;

  return (
    <div class="w-full rounded-xl p-4 bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center justify-between text-sm mb-3">
        {steps.map((s, i) => {
          const isActive = i === clamped;
          const base = 'transition-colors';
          const active = 'font-semibold text-neutral-900 dark:text-neutral-100';
          const inactive = 'text-neutral-500 dark:text-neutral-400';
          return (
            <button
              key={s.label}
              class={`${base} ${isActive ? active : inactive}`}
              onClick$={onStepClick$ ? (() => onStepClick$!(i)) : undefined}
              type="button"
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div class="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full bg-[linear-gradient(90deg,#22c55e,#6366f1)] transition-[width] duration-500"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
});
