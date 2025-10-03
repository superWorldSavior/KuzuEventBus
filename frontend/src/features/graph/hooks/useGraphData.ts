import { useEffect, useState } from "react";
import Graph from "graphology";
import { queryApi } from "@/features/query-execution/services/queryApi";
import { buildGraphFromRows } from "@/features/graph/services/graphBuilder";

export function useGraphData(databaseId: string | null, snapshotId: string | null, query?: string) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!databaseId) {
        setGraph(null);
        return;
      }
      
      setIsLoading(true);
      try {
        // Query to fetch graph data: nodes with relationships
        // Note: Return scalar properties only (Kuzu can't return full nodes in this version)
        const graphQuery = query ?? `
          // Default sample; callers can pass a custom query to the hook
          MATCH (a:Person)-[e:KNOWS]->(b:Person)
          RETURN a.name AS a_name, a.age AS a_age,
                 b.name AS b_name, b.age AS b_age,
                 e.since AS e_since
          LIMIT 100
        `;

        if (!databaseId) return;
        const submitResult = await queryApi.submitQuery(databaseId, { query: graphQuery });
        const txId = submitResult?.transaction_id;

        if (!txId) {
          console.warn("No transaction_id for graph query");
          setGraph(new Graph());
          setIsLoading(false);
          return;
        }

        // Wait for completion via SSE instead of polling
        const waitForCompletion = (): Promise<'completed' | 'failed'> => {
          return new Promise((resolve) => {
            let resolved = false;
            
            // SSE listener
            const handleSSEEvent = (event: Event) => {
              const customEvent = event as CustomEvent;
              const data = customEvent.detail;
              if (data.transaction_id === txId && !resolved) {
                resolved = true;
                window.removeEventListener('sse:event', handleSSEEvent);
                clearTimeout(fallbackTimeout);
                if (data.event_type === 'completed') {
                  resolve('completed');
                } else {
                  resolve('failed');
                }
              }
            };
            
            // Fallback timeout (30s max)
            const fallbackTimeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                window.removeEventListener('sse:event', handleSSEEvent);
                console.warn('Graph query SSE timeout, falling back to poll');
                // One-shot poll as fallback
                queryApi.getQueryStatus(txId).then((s: any) => {
                  resolve(s?.status === 'completed' ? 'completed' : 'failed');
                }).catch(() => resolve('failed'));
              }
            }, 30000);
            
            window.addEventListener('sse:event', handleSSEEvent);
          });
        };

        const status = await waitForCompletion();
        
        if (status !== "completed") {
          console.warn("Graph query failed or timeout");
          if (!cancelled) {
            setGraph(new Graph());
            setIsLoading(false);
          }
          return;
        }

        // Fetch results (small delay for cache write)
        await new Promise((r) => setTimeout(r, 300));
        const resultsData: any = await queryApi.getQueryResults(txId);
        const rows = resultsData?.results || [];

        console.log(`Building graph from ${rows.length} rows`);

        // Build graph from results using generic builder
        const g = buildGraphFromRows(rows);
        if (!cancelled) setGraph(g);
      } catch (e) {
        console.error("Graph load error:", e);
        if (!cancelled) setGraph(new Graph());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [databaseId, snapshotId]);

  return { graph, isLoading } as const;
}
