import { component$ } from '@builder.io/qwik';

export interface StepItem {
  label: string;
  done: boolean;
}

export interface StepperProps {
  steps: StepItem[];
}

export default component$<StepperProps>(({ steps }) => {
  if (!Array.isArray(steps) || steps.length === 0) return null as any;
  return (
    <ol class="space-y-2">
      {steps.map((s, i) => {
        const badgeDone = 'bg-[linear-gradient(90deg,#000,#dbbddb)] text-white dark:bg-white dark:text-black';
        const badgeTodo = 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100';
        const textDone = 'text-neutral-900 dark:text-neutral-100';
        const textTodo = 'text-neutral-500 dark:text-neutral-400';
        return (
          <li class="flex items-center gap-3 text-sm">
            <span class={`flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 font-semibold ${s.done ? badgeDone : badgeTodo}`}>
              {i + 1}
            </span>
            <span class={s.done ? textDone : textTodo}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
});
