import { useEffect, useState } from "react";
import Graph from "graphology";
import { queryApi } from "@/features/query-execution/services/queryApi";

export function useGraphData(databaseId: string | null, snapshotId: string | null) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!databaseId) {
        setGraph(null);
        return;
      }
      // Disable auto-loading for now - graph will update when user runs manual queries
      // This avoids confusing automatic queries on page load
      setGraph(new Graph());
      setIsLoading(false);
      return;
      
      setIsLoading(true);
      try {
        // Query to fetch graph data: nodes with relationships
        // Note: Return scalar properties only (Kuzu can't return full nodes in this version)
        const graphQuery = `
          MATCH (a:Person)-[e:KNOWS]->(b:Person)
          RETURN a.name AS a_name, a.age AS a_age,
                 b.name AS b_name, b.age AS b_age,
                 e.since AS e_since
          LIMIT 100
        `;

        const submitResult = await queryApi.submitQuery(databaseId, { query: graphQuery });
        const txId = submitResult?.transaction_id;

        if (!txId) {
          console.warn("No transaction_id for graph query");
          setGraph(new Graph());
          setIsLoading(false);
          return;
        }

        // Poll for completion
        let status = "pending";
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 500));
          try {
            const statusResult: any = await queryApi.getQueryStatus(txId);
            status = statusResult?.status || status;
            if (status === "completed") break;
            if (status === "failed" || status === "timeout") break;
          } catch {}
        }

        if (status !== "completed") {
          console.warn("Graph query timeout or failed");
          setGraph(new Graph());
          setIsLoading(false);
          return;
        }

        // Fetch results
        await new Promise((r) => setTimeout(r, 300)); // Wait for cache write
        const resultsData: any = await queryApi.getQueryResults(txId);
        const rows = resultsData?.results || [];

        console.log(`Building graph from ${rows.length} rows`);

        // Build graph from results
        const g = new Graph({ multi: true });

        const addNode = (id: string | number, labels?: string[], props?: Record<string, any>) => {
          const key = String(id);
          if (!g.hasNode(key)) {
            g.addNode(key, {
              label: (props && (props.name || props.id)) || key,
              color: '#2563eb',
              size: 2,
              labels: labels || [],
              ...props,
            });
          }
        };

        const addEdge = (a: string | number, b: string | number, type?: string) => {
          const sa = String(a); const sb = String(b);
          if (sa === sb) return;
          const edgeKey = `${sa}->${sb}-${g.size}`;
          if (!g.hasEdge(sa, sb)) {
            g.addEdge(sa, sb, { label: type || '', color: '#94a3b8' });
          } else {
            // allow multi edges with distinct key
            g.addEdgeWithKey(edgeKey, sa, sb, { label: type || '', color: '#94a3b8' });
          }
        };

        if (Array.isArray(rows)) {
          rows.forEach((row: any) => {
            // Extract scalar properties returned by Kuzu
            const a_name = row.a_name ?? row['a_name'];
            const a_age = row.a_age ?? row['a_age'];
            const b_name = row.b_name ?? row['b_name'];
            const b_age = row.b_age ?? row['b_age'];
            const e_since = row.e_since ?? row['e_since'] ?? '';

            // Build property objects from scalar values
            const a_props = { name: a_name, age: a_age };
            const b_props = { name: b_name, age: b_age };

            // Use names as IDs
            if (a_name !== undefined) addNode(a_name, ['Person'], a_props);
            if (b_name !== undefined) addNode(b_name, ['Person'], b_props);
            if (a_name !== undefined && b_name !== undefined) addEdge(a_name, b_name, 'KNOWS');
          });
        }

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
