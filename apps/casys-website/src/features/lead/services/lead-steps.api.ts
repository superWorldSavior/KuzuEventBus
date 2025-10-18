import type { DomainMetrics, DomainOntology } from '../types';

import { DEFAULT_API_BASE } from './lead.api';

export interface Step1Result {
  id: string;
  domain: string;
  metrics: DomainMetrics;
  ontology?: DomainOntology;
  competitors: { url: string; title?: string; description?: string }[];
  businessContext: {
    industry?: string;
    targetAudience?: string;
    contentType?: string;
    businessDescription?: string;
    rawAnalysis?: string;
  };
  proposedSeeds: string[];
  siteKeywords?: string[];
  language: string;
  region: string;
}

export interface Step2Result {
  id: string;
  keywordClusters: { keyword: string; searchVolume?: number; difficulty?: number; trend?: string }[];
  quickWins: { keyword: string; searchVolume?: number; difficulty?: number; score: number }[];
  suggestedTopics: { title: string; keywords: string[]; estimatedTraffic?: number; difficulty?: number }[];
}

export async function executeStep1(domain: string, force?: boolean, apiBase?: string): Promise<Step1Result> {
  const base = apiBase ?? DEFAULT_API_BASE;
  const res = await fetch(`${base}/api/lead/step1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, force }),
  });
  if (!res.ok) throw new Error(`Step1 failed: ${res.status}`);
  return (await res.json()) as Step1Result;
}

export async function executeStep2(snapshotId: string, selectedSeeds?: string[], apiBase?: string): Promise<Step2Result> {
  const base = apiBase ?? DEFAULT_API_BASE;
  const res = await fetch(`${base}/api/lead/step2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotId, selectedSeeds }),
  });
  if (!res.ok) throw new Error(`Step2 failed: ${res.status}`);
  return (await res.json()) as Step2Result;
}
