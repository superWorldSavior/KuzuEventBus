/**
 * Cypher query utilities for PITR and graph operations
 */

/**
 * Check if a Cypher query is mutating (modifies data)
 */
export function isMutatingQuery(query: string): boolean {
  const mutatingPattern = /(CREATE|MERGE|SET\s+|DELETE|REMOVE|LOAD|COPY|DROP|ALTER|ATTACH|IMPORT)/i;
  return mutatingPattern.test(query);
}

/**
 * Derive a read-only preview query from a mutating query
 * to visualize created/merged entities
 */
export function derivePreviewQuery(query: string): string | null {
  try {
    const text = query.trim().replace(/\s+/g, ' ');
    
    // Pattern 1: CREATE/MERGE (n:Label { ... })
    const nodePattern = /(CREATE|MERGE)\s*\((\w+):([A-Za-z_][A-Za-z0-9_]*)\s*\{([^}]*)\}\)/i;
    const nodeMatch = text.match(nodePattern);
    if (nodeMatch) {
      const varName = nodeMatch[2];
      const label = nodeMatch[3];
      const props = nodeMatch[4]?.trim();
      const propFilter = props ? `{ ${props} }` : '';
      return `MATCH (${varName}:${label} ${propFilter}) RETURN ${varName} LIMIT 100`;
    }

    // Pattern 2: CREATE/MERGE (a:LA? {..})-[r:TYPE]->(b:LB? {..})
    const relPattern = /(CREATE|MERGE)\s*\(\s*(\w+)(?::([A-Za-z_][A-Za-z0-9_]*))?\s*(\{[^}]*\})?\s*\)\s*-\s*\[\s*(\w+)?(?::([A-Za-z_][A-Za-z0-9_]*))?\s*\]\s*->\s*\(\s*(\w+)(?::([A-Za-z_][A-Za-z0-9_]*))?\s*(\{[^}]*\})?\s*\)/i;
    const relMatch = text.match(relPattern);
    if (relMatch) {
      const aVar = relMatch[2];
      const aLabel = relMatch[3] ? `:${relMatch[3]}` : '';
      const aProps = relMatch[4] ? ` ${relMatch[4]} ` : '';
      const rVar = relMatch[5] || 'r';
      const rType = relMatch[6] ? `:${relMatch[6]}` : '';
      const bVar = relMatch[7];
      const bLabel = relMatch[8] ? `:${relMatch[8]}` : '';
      const bProps = relMatch[9] ? ` ${relMatch[9]} ` : '';
      return `MATCH (${aVar}${aLabel}${aProps})-[${rVar}${rType}]->(${bVar}${bLabel}${bProps}) RETURN ${aVar}, ${rVar}, ${bVar} LIMIT 100`;
    }

    return null;
  } catch {
    return null;
  }
}
