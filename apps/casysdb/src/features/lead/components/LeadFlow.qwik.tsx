import { $, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

import { DEFAULT_API_BASE } from '../services/lead.api';
import { executeStep2, type Step1Result, type Step2Result } from '../services/lead-steps.api';
import DomainIdentityDashboard from './DomainIdentityDashboard.qwik';
import TopProgressBar from './TopProgressBar.qwik';
import OpportunitiesAnalysis from './OpportunitiesAnalysis.qwik';

export interface LeadFlowProps {
  domain?: string;
  apiBase?: string;
  lang?: string;
}

export default component$<LeadFlowProps>((props) => {
  const domainProp = props.domain;
  const apiBase = props.apiBase;
  const lang = props.lang ?? 'en';

  // State
  const domain = useSignal<string>(domainProp ?? '');
  const currentStep = useSignal<1 | 2>(1);
  const running = useSignal<boolean>(false);
  const message = useSignal<string>('');

  // Step 1 data (SSE streaming)
  const step1Data = useSignal<Step1Result | null>(null);
  const metrics = useSignal<any>(null);
  const businessContext = useSignal<any>(null);
  const ontologyNodes = useSignal<any[]>([]);
  const ontologyEdges = useSignal<any[]>([]);
  const proposedSeeds = useSignal<string[]>([]);
  const selectedSeeds = useSignal<Set<string>>(new Set());

  // Step 2 data
  const step2Data = useSignal<Step2Result | null>(null);

  // Active EventSource pour éviter les doublons si l'utilisateur relance l'analyse
  const activeEventSource = useSignal<EventSource | null>(null);

  const t = {
    step1Title: lang === 'fr' ? 'Photo d\'identité' : 'Identity Card',
    step2Title: lang === 'fr' ? 'Opportunités' : 'Opportunities',
    continueBtn: lang === 'fr' ? 'Continuer vers les opportunités →' : 'Continue to opportunities →',
    backBtn: lang === 'fr' ? '← Retour' : '← Back',
    loading: lang === 'fr' ? 'Analyse en cours...' : 'Analyzing...',
    errorDomain: lang === 'fr' ? 'Veuillez entrer un domaine valide.' : 'Please enter a valid domain.',
  };

  // Execute Step 1 with SSE streaming
  const runStep1 = $(async () => {
    // Nettoyer l'input : enlever https://, http://, www., trailing slash
    let d = domain.value.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    
    if (!d || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) {
      message.value = t.errorDomain;
      return;
    }

    domain.value = d;
    running.value = true;
    message.value = '';
    
    // Fermer l'EventSource précédent si encore actif
    if (activeEventSource.value) {
      console.log('[LeadFlow] Closing previous EventSource to avoid duplicates');
      activeEventSource.value.close();
      activeEventSource.value = null;
    }
    
    // Reset SSE data
    metrics.value = null;
    businessContext.value = null;
    ontologyNodes.value = [];
    ontologyEdges.value = [];
    step1Data.value = null;

    // Keep URL in sync
    try {
      if (typeof window !== 'undefined') {
        const u = new URL(window.location.href);
        u.searchParams.set('domain', d);
        window.history.replaceState({}, '', u.toString());
      }
    } catch {
      // noop
    }

    try {
      const base = apiBase ?? DEFAULT_API_BASE;
      const eventSource = new EventSource(`${base}/api/lead/step1/stream?domain=${d}`);
      activeEventSource.value = eventSource;
      
      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse((e as MessageEvent).data as string);
        console.debug('[SSE] status', data);
      });
      
      eventSource.addEventListener('metrics', (e) => {
        const data = JSON.parse((e as MessageEvent).data as string);
        console.debug('[SSE] metrics', data);
        metrics.value = data;
      });
      
      eventSource.addEventListener('businessContext', (e) => {
        const data = JSON.parse((e as MessageEvent).data as string);
        console.debug('[SSE] businessContext', data);
        businessContext.value = data;
      });
      
      eventSource.addEventListener('node', (e) => {
        const node = JSON.parse((e as MessageEvent).data as string);
        console.debug('[SSE] node', node);
        
        // Si c'est un vrai node (pas preview), nettoyer tous les preview nodes
        const isPreview = node.metadata?.source?.includes('keyword-preview');
        const hasPreviewNodes = ontologyNodes.value.some(n => n.metadata?.source?.includes('keyword-preview'));
        const isFirstRealNode = !isPreview && hasPreviewNodes;
        
        if (isFirstRealNode) {
          console.log('[SSE] First real node received - clearing all preview nodes');
          ontologyNodes.value = ontologyNodes.value.filter(n => !n.metadata?.source?.includes('keyword-preview'));
        }
        
        if (!ontologyNodes.value.some(n => n.id === node.id)) {
          ontologyNodes.value = [...ontologyNodes.value, node];
        }
      });
      
      eventSource.addEventListener('edge', (e) => {
        const edge = JSON.parse((e as MessageEvent).data as string);
        console.debug('[SSE] edge', edge);
        if (!ontologyEdges.value.some(ed => ed.id === edge.id)) {
          ontologyEdges.value = [...ontologyEdges.value, edge];
        }
      });
      
      eventSource.addEventListener('done', (e) => {
        const result = JSON.parse((e as MessageEvent).data as string).result;
        console.log('[LeadFlow] Step1 complete:', result);
        step1Data.value = result;
        proposedSeeds.value = result?.proposedSeeds ?? [];
        selectedSeeds.value = new Set(result?.proposedSeeds ?? []);
        currentStep.value = 1;
        running.value = false;
        eventSource.close();
        activeEventSource.value = null;
      });

      eventSource.addEventListener('error', () => {
        message.value = 'Stream error occurred';
        running.value = false;
        eventSource.close();
        activeEventSource.value = null;
      });
    } catch (e) {
      console.error('[LeadFlow] Step1 error:', e);
      message.value = e instanceof Error ? e.message : 'Error';
      running.value = false;
    }
  });

  // Execute Step 2 (manual, after user clicks "Continue")
  const runStep2 = $(async () => {
    if (!step1Data.value) return;

    running.value = true;
    message.value = '';

    try {
      const result = await executeStep2(
        step1Data.value.id,
        Array.from(selectedSeeds.value),
        apiBase ?? DEFAULT_API_BASE
      );
      step2Data.value = result;
      currentStep.value = 2;
      message.value = '';
    } catch (e) {
      message.value = e instanceof Error ? e.message : 'Error';
    } finally {
      running.value = false;
    }
  });

  // Initialize domain from URL query params on mount
  useVisibleTask$(() => {
    if (typeof window !== 'undefined' && !domainProp) {
      const params = new URLSearchParams(window.location.search);
      const urlDomain = params.get('domain');
      if (urlDomain) {
        domain.value = urlDomain;
      }
    }
  });

  // Auto-start step1 if domain provided and no data exists
  useVisibleTask$(({ track }) => {
    track(() => domain.value);
    const d = domain.value.trim();
    const hasAnyData = !!step1Data.value || !!metrics.value || ontologyNodes.value.length > 0;
    console.log('[LeadFlow] Domain changed:', { domain: d, running: running.value, hasAnyData });
    if (d && d.length > 0 && !running.value && !hasAnyData) {
      console.log('[LeadFlow] Auto-starting runStep1 for domain:', d);
      void runStep1();
    }
  });

  // Progress bar steps (persistent across the flow)
  const stepsBar = [
    { label: 'Overview' },
    { label: 'Keyword research' },
    { label: 'Content creation' },
    { label: 'Backlinks' },
    { label: 'Dashboard' },
  ];
  const progressIndex = currentStep.value === 1 ? 1 : 2;

  return (
    <section class="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <TopProgressBar steps={stepsBar} activeIndex={progressIndex} />
      {message.value && <p class="mb-4 text-red-500">{message.value}</p>}

      {/* Step 1: Domain Identity - SSE Streaming */}
      {currentStep.value === 1 && (
        <>
          <DomainIdentityDashboard
            domain={step1Data.value?.domain ?? domain.value}
            metrics={metrics.value}
            ontology={ontologyNodes.value.length > 0 ? { nodes: ontologyNodes.value, edges: ontologyEdges.value, domain: domain.value, createdAt: new Date().toISOString(), version: 1 } : null}
            businessContext={businessContext.value}
            loading={running.value}
            lang={lang}
          />

          {!running.value && step1Data.value && (
            <div class="flex justify-end mt-6">
              <button
                onClick$={runStep2}
                class="px-6 py-3 rounded-lg font-semibold text-white bg-[linear-gradient(90deg,#000,#dbbddb)] hover:opacity-90 transition-opacity"
              >
                {t.continueBtn}
              </button>
            </div>
          )}
        </>
      )}

      {/* Step 2: Opportunities */}
      {currentStep.value === 2 && step2Data.value && (
        <>
          <div class="flex justify-start mb-6">
            <button
              onClick$={() => (currentStep.value = 1)}
              class="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {t.backBtn}
            </button>
          </div>

          <OpportunitiesAnalysis
            keywordClusters={step2Data.value.keywordClusters}
            quickWins={step2Data.value.quickWins}
            suggestedTopics={step2Data.value.suggestedTopics}
            loading={running.value}
            lang={lang}
          />
        </>
      )}
    </section>
  );
});
