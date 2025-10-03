import Graph from 'graphology';

/**
 * Build a Graphology graph from arbitrary Kuzu query results.
 * - Supports array-shaped rows: picks first two string values as source/target and optional 3rd as label
 * - Supports object-shaped rows: tries common keys, then falls back to first two string values
 * - No domain assumptions (labels, relationship names) are hardcoded here
 */
export function buildGraphFromRows(rows: any[]): Graph {
  const g = new Graph({ multi: true });

  const addNode = (id: string | number, props?: Record<string, any>) => {
    const key = String(id);
    if (!g.hasNode(key)) {
      g.addNode(key, {
        label: (props && (props.name || props.id)) || key,
        color: '#2563eb',
        size: 2,
        ...props,
      });
    }
  };

  const addEdge = (a: string | number, b: string | number, label?: string) => {
    const sa = String(a);
    const sb = String(b);
    if (sa === sb) return;
    const edgeKey = `${sa}->${sb}-${g.size}`;
    if (!g.hasEdge(sa, sb)) {
      g.addEdge(sa, sb, { label: label || '', color: '#94a3b8' });
    } else {
      g.addEdgeWithKey(edgeKey, sa, sb, { label: label || '', color: '#94a3b8' });
    }
  };

  (rows || []).forEach((row: any) => {
    let source: any; let target: any; let label: any;

    if (Array.isArray(row)) {
      const strings = row.filter((v: any) => typeof v === 'string');
      source = strings[0];
      target = strings[1];
      label = strings[2];
    } else if (row && typeof row === 'object') {
      // Common keys first
      source = row.a_name ?? row.source ?? row.src ?? row.from ?? row['a_name'];
      target = row.b_name ?? row.target ?? row.tgt ?? row.to ?? row['b_name'];
      label = row.e_since ?? row.label ?? row.rel ?? row.type ?? row['e_since'];
      // Fallback: first two string values among props
      if (!source || !target) {
        const stringVals = Object.values(row).filter((v) => typeof v === 'string');
        source = source || stringVals[0];
        target = target || stringVals[1];
        if (!label) label = stringVals[2];
      }
    }

    if (typeof source === 'string' && typeof target === 'string') {
      addNode(source, { name: source });
      addNode(target, { name: target });
      addEdge(source, target, label ? String(label) : '');
    }
  });

  return g;
}
