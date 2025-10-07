/**
 * Types frontend pour Lead Analysis
 * Dupliqués depuis @casys/core pour éviter les dépendances backend dans le frontend
 */

export interface OntologyNode {
  id: string;
  label: string;
  type: string;
  keywords: string[];
  description: string;
  volume?: number;
  avgPosition?: number;
  metadata?: {
    source?: 'ai' | 'hybrid';
    confidence?: number;
    extractedFrom?: string[];
  };
}

export interface OntologyEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  weight: number;
  metadata?: {
    source?: 'ai' | 'hybrid';
    confidence?: number;
  };
}

export interface DomainOntology {
  domain: string;
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  createdAt?: string;
  version?: number;
  metadata?: {
    totalVolume?: number;
    avgConfidence?: number;
    pagesAnalyzed?: number;
  };
}

export interface DomainMetrics {
  domain: string;
  domainRank?: number;
  organicTraffic?: number;
  backlinksCount?: number;
  referringDomains?: number;
  detectedCountryCode?: string;
  detectedLanguageCode?: string;
}
