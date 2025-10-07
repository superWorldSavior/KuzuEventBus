import { component$ } from '@builder.io/qwik';

import BusinessContextSection from './domain-identity/BusinessContextSection.qwik';
import DomainHeader from './domain-identity/DomainHeader.qwik';
import MetricsGrid from './domain-identity/MetricsGrid.qwik';
import OntologyGraph from './OntologyGraph.qwik';

export interface DomainMetrics {
  domain: string;
  domainRank?: number;
  organicTraffic?: number;
  keywordsCount?: number;
  domainValue?: number;
  detectedCountryCode?: string;
  detectedLanguageCode?: string;
}

export interface BusinessContext {
  industry?: string;
  targetAudience?: string;
  contentType?: string;
  businessDescription?: string;
  rawAnalysis?: string;
}

export interface DomainIdentityDashboardProps {
  domain: string;
  metrics?: DomainMetrics | null;
  ontology?: import('@casys/core').DomainOntology | null;
  businessContext?: BusinessContext | null;
  loading?: boolean;
  lang?: string;
}

export default component$<DomainIdentityDashboardProps>(({ domain, metrics, ontology, businessContext, loading, lang }) => {
  const locale = lang ?? 'en';
  const t = {
    loading: locale === 'fr' ? 'Analyse en cours...' : 'Analyzing...',
  };

  return (
    <div class="space-y-6">
      <DomainHeader
        domain={domain}
        languageCode={metrics?.detectedLanguageCode}
        countryCode={metrics?.detectedCountryCode}
        lang={lang}
      />

      {/* Grid layout: metrics + business context side by side on desktop */}
      {/* Always show components - they have internal skeleton states */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsGrid
          organicTraffic={metrics?.organicTraffic}
          domainRank={metrics?.domainRank}
          keywordsCount={metrics?.keywordsCount}
          domainValue={metrics?.domainValue}
          lang={lang}
        />

        <BusinessContextSection
          industry={businessContext?.industry}
          targetAudience={businessContext?.targetAudience}
          contentType={businessContext?.contentType}
          businessDescription={businessContext?.businessDescription}
          lang={lang}
        />
      </div>

      {/* Ontology Graph: always show with skeleton state */}
      <OntologyGraph ontology={ontology} lang={lang} />
    </div>
  );
});
