import { component$ } from '@builder.io/qwik';

import KeywordClustersTable from './opportunities-analysis/KeywordClustersTable.qwik';
import OpportunitiesHeader from './opportunities-analysis/OpportunitiesHeader.qwik';
import QuickWinsSection from './opportunities-analysis/QuickWinsSection.qwik';
import SuggestedTopicsGrid from './opportunities-analysis/SuggestedTopicsGrid.qwik';

export interface KeywordCluster {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  trend?: string;
}

export interface QuickWin {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  score: number;
}

export interface SuggestedTopic {
  title: string;
  keywords: string[];
  estimatedTraffic?: number;
  difficulty?: number;
}

export interface OpportunitiesAnalysisProps {
  keywordClusters: KeywordCluster[];
  quickWins: QuickWin[];
  suggestedTopics: SuggestedTopic[];
  loading?: boolean;
  lang?: string;
}

export default component$<OpportunitiesAnalysisProps>(({ keywordClusters, quickWins, suggestedTopics, loading, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    loading: locale === 'fr' ? 'Analyse en cours...' : 'Analyzing...',
  };

  return (
    <section class="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6 bg-gradient-to-br from-white/90 to-neutral-50/80 dark:from-neutral-900/90 dark:to-neutral-950/80 backdrop-blur-sm shadow-lg">
      <OpportunitiesHeader
        totalClusters={keywordClusters.length}
        totalQuickWins={quickWins.length}
        totalTopics={suggestedTopics.length}
        lang={lang}
      />

      {loading && (
        <div class="text-center py-8 text-neutral-500 dark:text-neutral-400 animate-pulse">{t.loading}</div>
      )}

      {!loading && (
        <>
          <QuickWinsSection quickWins={quickWins} lang={lang} />
          <SuggestedTopicsGrid topics={suggestedTopics} lang={lang} />
          <KeywordClustersTable clusters={keywordClusters} lang={lang} />
        </>
      )}
    </section>
  );
});
