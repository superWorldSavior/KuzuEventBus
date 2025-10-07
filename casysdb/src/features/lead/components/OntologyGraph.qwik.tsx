import { component$, useSignal, useVisibleTask$, type Signal } from '@builder.io/qwik';
import * as d3 from 'd3';

import type { DomainOntology } from '@casys/core';

interface OntologyNode {
  id: string;
  label: string;
  type: string;
  keywords: string[];
  description: string;
  volume?: number;
  level?: number;
}

interface OntologyEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  weight: number;
}

export interface OntologyGraphProps {
  ontology?: DomainOntology | null;
  lang?: string;
}

export default component$<OntologyGraphProps>(({ ontology, lang }) => {
  const svgRef = useSignal<SVGSVGElement>();
  const nodes = useSignal<OntologyNode[]>(ontology?.nodes ?? []);
  const edges = useSignal<OntologyEdge[]>(ontology?.edges ?? []);
  const status = useSignal(ontology ? 'Static view' : 'Initializing...');
  const isComplete = useSignal(!!ontology);
  const tooltipVisible = useSignal(false);
  const tooltipContent = useSignal<OntologyNode | null>(null);
  const tooltipPosition = useSignal({ x: 0, y: 0 });
  const locale = lang ?? 'en';
  
  const t = {
    title: locale === 'fr' ? 'Ontologie SEO' : 'SEO Ontology',
    nodes: locale === 'fr' ? 'concepts' : 'concepts',
    totalVolume: locale === 'fr' ? 'Volume total' : 'Total volume',
    legend: locale === 'fr' ? 'Légende' : 'Legend',
    types: locale === 'fr' ? 'Types de concepts' : 'Concept types',
    size: locale === 'fr' ? 'Taille = volume de recherche' : 'Size = search volume',
  };
  
  // Color mapping for legend
  const nodeTypes = [
    { type: 'service', color: '#3b82f6', label: locale === 'fr' ? 'Service' : 'Service' },
    { type: 'feature', color: '#8b5cf6', label: locale === 'fr' ? 'Fonctionnalité' : 'Feature' },
    { type: 'benefit', color: '#ec4899', label: locale === 'fr' ? 'Bénéfice' : 'Benefit' },
    { type: 'audience', color: '#f59e0b', label: locale === 'fr' ? 'Audience' : 'Audience' },
    { type: 'topic', color: '#10b981', label: locale === 'fr' ? 'Sujet' : 'Topic' },
    { type: 'product', color: '#06b6d4', label: locale === 'fr' ? 'Produit' : 'Product' },
  ];

  // Render graph when ontology data arrives or updates
  useVisibleTask$(({ track }) => {
    // Track ontology changes to re-render when nodes/edges arrive via SSE
    track(() => ontology);
    
    if (ontology && ontology.nodes.length > 0 && svgRef.value) {
      nodes.value = ontology.nodes;
      edges.value = ontology.edges;
      status.value = `${ontology.nodes.length} nodes loaded`;
      
      // Get dimensions from SVG element
      const svg = svgRef.value;
      const rect = svg.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 600;
      
      updateGraph(svgRef, nodes, edges, width, height, tooltipVisible, tooltipContent, tooltipPosition);
      isComplete.value = true;
    }
  });

  const hasData = ontology && ontology.nodes.length > 0;

  return (
    <section class="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6 bg-gradient-to-br from-white/90 to-neutral-50/80 dark:from-neutral-900/90 dark:to-neutral-950/80 backdrop-blur-sm shadow-lg">
      <div class="flex items-center justify-end mb-4 gap-4">
        <span class={`text-sm font-medium ${isComplete.value ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
          {status.value}
        </span>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">
          {nodes.value.length} {t.nodes} • {edges.value.length} relations
        </div>
      </div>

      <div class="ontology-graph-container relative w-full bg-white dark:bg-neutral-900 rounded-lg overflow-hidden">
        {/* Custom tooltip */}
        {tooltipVisible.value && tooltipContent.value && (
          <div 
            class="absolute z-50 pointer-events-none"
            style={`left: ${tooltipPosition.value.x}px; top: ${tooltipPosition.value.y}px; transform: translate(-50%, -100%) translateY(-12px);`}
          >
            <div class="bg-neutral-900 dark:bg-neutral-800 text-white rounded-lg shadow-2xl p-4 max-w-xs border border-neutral-700">
              <div class="font-semibold text-sm mb-2">{tooltipContent.value.label}</div>
              <div class="space-y-1 text-xs">
                <div class="flex items-center gap-2">
                  <span class="text-neutral-400">Type:</span>
                  <span class="font-medium capitalize">{tooltipContent.value.type}</span>
                </div>
                {tooltipContent.value.volume !== undefined && tooltipContent.value.volume > 0 && (
                  <div class="flex items-center gap-2">
                    <span class="text-neutral-400">Volume:</span>
                    <span class="font-medium">{Math.round(tooltipContent.value.volume).toLocaleString()}</span>
                  </div>
                )}
                {tooltipContent.value.keywords && tooltipContent.value.keywords.length > 0 && (
                  <div class="mt-2 pt-2 border-t border-neutral-700">
                    <div class="text-neutral-400 mb-1">Keywords:</div>
                    <div class="flex flex-wrap gap-1">
                      {tooltipContent.value.keywords.slice(0, 5).map(kw => (
                        <span key={kw} class="px-2 py-0.5 bg-neutral-700 rounded text-xs">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {tooltipContent.value.description && (
                  <div class="mt-2 pt-2 border-t border-neutral-700 text-neutral-300 italic">
                    {tooltipContent.value.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Fixed 16:9 aspect ratio for consistent layout */}
        <div class="aspect-video w-full">
          {!hasData ? (
            // Skeleton loader
            <div class="w-full h-full flex items-center justify-center animate-pulse">
              <div class="text-center space-y-4">
                <div class="flex justify-center gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} class="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
                  ))}
                </div>
                <div class="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} class="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
                  ))}
                </div>
                <div class="text-sm text-neutral-500 dark:text-neutral-400">
                  {locale === 'fr' ? 'Construction de l\'ontologie...' : 'Building ontology...'}
                </div>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              class="w-full h-full"
            />
          )}
        </div>
      </div>

      {/* Legend - Bottom */}
      {hasData && (
        <div class="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div class="flex flex-wrap justify-center items-center gap-6">
            {/* Type colors */}
            <div class="flex flex-wrap gap-x-4 gap-y-2">
              {nodeTypes.map(nt => (
                <div key={nt.type} class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" style={`background-color: ${nt.color}`}></div>
                  <span class="text-xs text-neutral-700 dark:text-neutral-300">{nt.label}</span>
                </div>
              ))}
            </div>
            {/* Separator */}
            <div class="h-4 w-px bg-neutral-300 dark:bg-neutral-600"></div>
            {/* Size indicator */}
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-neutral-400"></div>
                <span class="text-xs text-neutral-500 dark:text-neutral-400">petit</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded-full bg-neutral-400"></div>
                <span class="text-xs text-neutral-500 dark:text-neutral-400">moyen</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-neutral-400"></div>
                <span class="text-xs text-neutral-500 dark:text-neutral-400">grand</span>
              </div>
              <span class="text-xs italic text-neutral-400 ml-2">({t.size})</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

/**
 * D3 Force-Directed Graph Update Function
 */
function updateGraph(
  svgRef: Signal<SVGSVGElement | undefined>,
  nodes: Signal<OntologyNode[]>,
  edges: Signal<OntologyEdge[]>,
  _width: number,
  _height: number,
  tooltipVisible: Signal<boolean>,
  tooltipContent: Signal<OntologyNode | null>,
  tooltipPosition: Signal<{ x: number; y: number }>
) {
  const svg = svgRef.value;
  if (!svg) return;

  // Measure actual container size
  const rect = svg.getBoundingClientRect();
  const width = Math.max(320, rect.width);
  const height = Math.max(320, rect.height);

  const d3Svg = d3.select(svg);
  d3Svg.selectAll('*').remove();

  // Zoom / pan container
  const g = d3Svg.append('g');
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 4])
    .on('zoom', (event) => g.attr('transform', event.transform));
  d3Svg.call(zoom as any);

  // Build hierarchy (left-to-right) from edges
  const nodeMap = new Map(nodes.value.map(n => [n.id, n] as const));
  const inDegree = new Map<string, number>();
  const childrenMap = new Map<string, OntologyNode[]>();

  nodes.value.forEach(n => inDegree.set(n.id, 0));
  edges.value.forEach(e => {
    if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
      inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
      const arr = childrenMap.get(e.from) ?? [];
      arr.push(nodeMap.get(e.to)!);
      childrenMap.set(e.from, arr);
    }
  });

  const roots = nodes.value.filter(n => (inDegree.get(n.id) ?? 0) === 0);
  const visited = new Set<string>();
  const build = (n: OntologyNode): any => {
    if (visited.has(n.id)) return { ...n, children: [] };
    visited.add(n.id);
    const kids = (childrenMap.get(n.id) ?? [])
      .filter(c => !visited.has(c.id))
      .map(c => build(c));
    return { ...n, children: kids };
  };

  const forest = (roots.length ? roots : nodes.value.slice(0, 1)).map(build);
  const root = d3.hierarchy({ id: '__root__', label: 'root', children: forest } as any);

  // Tidy Tree Layout with optimized spacing
  const margin = { top: 60, right: 120, bottom: 60, left: 120 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  
  // Horizontal tree (left-to-right) for better label visibility
  const tree = d3.tree<any>()
    .size([innerH, innerW])
    .separation((a: any, b: any) => {
      // More spacing between nodes to avoid label overlap
      return (a.parent === b.parent ? 1.5 : 2) * (a.depth === 1 ? 1.2 : 1);
    });
  
  tree(root);

  const container = g.attr('transform', `translate(${margin.left},${margin.top})`);

  // Link generator (horizontal left-to-right)
  const link = d3.linkHorizontal<any, any>()
    .x((d: any) => d.y)
    .y((d: any) => d.x);

  // Draw links with curved paths (skip links from virtual root at depth 0)
  container.append('g')
    .selectAll('path')
    .data(root.links().filter((d: any) => d.source.depth > 0))
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.6)
    .attr('d', link as any);

  // Node styles with color by type
  const allowedTypes = ['service', 'feature', 'benefit', 'audience', 'topic', 'product'];
  const colorScale = d3.scaleOrdinal<string>()
    .domain(allowedTypes)
    .range(['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']);

  const nodeG = container.append('g')
    .selectAll('g')
    .data(root.descendants().filter((d: any) => d.depth > 0))
    .join('g')
    .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

  // Node circles with size based on volume
  nodeG.append('circle')
    .attr('r', (d: any) => {
      const vol = (d.data as OntologyNode).volume ?? 1000;
      const level = (d.data as OntologyNode).level ?? 1;
      // Level 1 nodes are bigger
      return level === 1 ? 16 + Math.min(12, Math.sqrt(vol) / 15) : 10 + Math.min(8, Math.sqrt(vol) / 20);
    })
    .attr('fill', (d: any) => {
      const t = (d.data as OntologyNode).type;
      return allowedTypes.includes(t) ? colorScale(t) : '#22c55e';
    })
    .attr('stroke', '#1f2937')
    .attr('stroke-width', 2)
    .attr('opacity', 0.9);

  // Labels always visible, positioned to the right of nodes
  nodeG.append('text')
    .attr('dx', (d: any) => {
      const level = (d.data as OntologyNode).level ?? 1;
      return level === 1 ? 25 : 18; // More space for level 1
    })
    .attr('dy', '0.35em')
    .attr('text-anchor', 'start')
    .attr('fill', '#111827')
    .attr('class', 'dark:fill-neutral-100')
    .attr('font-size', (d: any) => {
      const level = (d.data as OntologyNode).level ?? 1;
      return level === 1 ? '13px' : '11px'; // Bigger font for level 1
    })
    .attr('font-weight', (d: any) => {
      const level = (d.data as OntologyNode).level ?? 1;
      return level === 1 ? '600' : '500';
    })
    .text((d: any) => {
      const nd = d.data as OntologyNode;
      const vol = nd.volume ? ` (${Math.round(nd.volume)})` : '';
      return `${nd.label}${vol}`;
    });

  // Tooltip interactions with HTML tooltip
  nodeG
    .on('mouseenter', function(event: MouseEvent, d: any) {
      const node = d.data as OntologyNode;
      const svgRect = svg.getBoundingClientRect();
      tooltipContent.value = node;
      tooltipPosition.value = {
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
      tooltipVisible.value = true;
    })
    .on('mousemove', function(event: MouseEvent) {
      const svgRect = svg.getBoundingClientRect();
      tooltipPosition.value = {
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
    })
    .on('mouseleave', function() {
      tooltipVisible.value = false;
      tooltipContent.value = null;
    });
}
