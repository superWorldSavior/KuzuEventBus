/**
 * Kuzu Event Bus SDK - Main Entry Point
 */

// Polyfill fetch for Node.js environments
import 'cross-fetch/polyfill';

export { KuzuEventBusClient, createKuzuClient } from './client';
export type {
  KuzuClientConfig,
  Database,
  QueryRequest,
  QuerySubmitResponse,
  QueryStatusResponse,
  QueryResultsResponse,
  Snapshot,
  SnapshotListResponse,
  RestoreResponse,
  SseTokenResponse,
} from './client';

// Time Travel API
export { TimeTravelAPI } from './timeTravel';
export type {
  TimelineHistory,
  TimelineEvent,
  PreviewSnapshot,
  RestoreResult,
  ViewHistoryOptions,
  PreviewOptions,
} from './timeTravel';
