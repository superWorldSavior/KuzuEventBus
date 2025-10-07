import { component$, type QRL } from '@builder.io/qwik';

export interface UnlockFormProps {
  email: string;
  disabled?: boolean;
  onEmailChange$: QRL<(email: string) => void>;
  onSubscribe$: QRL<() => void>;
  onLoadFull$: QRL<() => void>;
  lang?: string;
}

export default component$<UnlockFormProps>(({ email, disabled, onEmailChange$, onSubscribe$, onLoadFull$, lang }) => {
  const locale = lang ?? 'en';
  return (
    <div class="flex items-center gap-2">
      <label class="sr-only" for="unlock-email">Email</label>
      <input
        id="unlock-email"
        type="email"
        placeholder={locale === 'fr' ? 'vous@exemple.com' : 'you@example.com'}
        class="px-3 py-2 rounded border border-neutral-200 dark:border-neutral-800 flex-1 bg-white text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:ring-white/30"
        value={email}
        onInput$={(e) => onEmailChange$((e.target as HTMLInputElement).value)}
      />
      <button
        disabled={disabled}
        onClick$={onSubscribe$}
        class="px-3 py-2 rounded font-semibold text-white bg-[linear-gradient(90deg,#000,#dbbddb)] disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {locale === 'fr' ? "S'abonner" : 'Subscribe'}
      </button>
      <button
        disabled={disabled}
        onClick$={onLoadFull$}
        class="px-3 py-2 rounded border border-neutral-200 dark:border-neutral-800"
      >
        {locale === 'fr' ? 'Charger le complet' : 'Load full'}
      </button>
    </div>
  );
});
