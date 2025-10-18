import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

export interface GraphNode { id: string; label: string }
export interface GraphEdge { from: string; to: string; rel: string }
export interface GraphVizProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: number; // bump to re-render
}

export const GraphViz = component$((props: GraphVizProps) => {
  const container = useSignal<HTMLElement>();

  useVisibleTask$(async ({ track }) => {
    track(() => props.version);
    if (!container.value) return;

    const d3: any = await import('d3');

    // Clear previous
    container.value.innerHTML = '';

    const width = container.value.clientWidth || 600;
    const height = 320;

    const svg = d3.select(container.value)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .style('display', 'block')
      .style('maxWidth', '100%')
      .style('background', 'var(--card-bg)');

    const zoom = d3.zoom().on('zoom', (event: any) => {
      g.attr('transform', event.transform);
    });
    svg.call(zoom as any);

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 14)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--acc)');

    const g = svg.append('g');

    const nodes = props.nodes.map((n: any) => ({ ...n }));
    const links = props.edges.map((e: any) => ({ source: e.from, target: e.to, rel: e.rel, pending: e.pending, branch: e.branch }));

    // Branch color palette
    const branchColor = (b?: string) => (
      b === 'dev' ? '#bfdbfe' : b === 'recovery' ? '#bbf7d0' : '#e9d5ff'
    );

    const idIndex: Record<string, number> = {};
    nodes.forEach((n, i) => idIndex[n.id] = i);

    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-240))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('radial', d3.forceRadial(Math.min(width, height) / 4, width / 2, height / 2).strength(0.04));

    // kick simulation to settle towards center
    sim.alpha(1).restart();

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => d.pending ? '#f59e0b' : branchColor(d.branch))
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', (d: any) => d.pending ? '4,3' : null)
      .attr('marker-end', 'url(#arrow)');

    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('font-size', 10)
      .attr('fill', 'var(--text-secondary)')
      .text((d: any) => d.rel);

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes as any)
      .enter()
      .append('circle')
      .attr('r', 14)
      .attr('fill', (d: any) => d.pending ? '#fde68a' : branchColor(d.branch))
      .attr('stroke', (d: any) => d.pending ? '#f59e0b' : 'var(--acc)')
      .attr('stroke-width', 1)
      .call((d3.drag() as any)
        .on('start', (event: any, d: any) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event: any, d: any) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event: any, d: any) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    const labels = g.append('g')
      .selectAll('text.label')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('font-size', 12)
      .attr('fill', 'var(--text-primary)')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .text((d: any) => d.label);

    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });
  });

  return (
    <div ref={container} class="min-h-[320px]" />
  );
});

export default GraphViz;
