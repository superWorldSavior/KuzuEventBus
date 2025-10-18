import { component$, useSignal, $, useTask$ } from '@builder.io/qwik';
import Controls from './Controls';
import BranchViz from './BranchViz';
import GraphViz from './GraphViz';

interface GraphNode { id: string; label: string }
interface GraphEdge { from: string; to: string; rel: string }

type BranchMap = Record<string, string[]>;

export const PlaygroundQwik = component$(() => {
  // Branch state
  const branches = useSignal<BranchMap>({ main: ['c1'] });
  const current = useSignal<string>('main');
  const commits = useSignal<string[]>(['c1']);
  const v = useSignal<number>(1); // bump to trigger re-render of visualizers

  const nodes = useSignal<GraphNode[]>([
    { id: 'N1', label: 'Alice', branch: 'main' },
    { id: 'N2', label: 'Bob', branch: 'main' },
    { id: 'N3', label: 'Carol', branch: 'main' },
  ]);
  const edges = useSignal<GraphEdge[]>([
    { from: 'N1', to: 'N2', rel: 'KNOWS', branch: 'main' } as any,
    { from: 'N1', to: 'N3', rel: 'WORKS_WITH', branch: 'main' } as any,
  ]);

  const reset = $(() => {
    branches.value = { main: ['c1'] };
    current.value = 'main';
    commits.value = ['c1'];
    nodes.value = [
      { id: 'N1', label: 'Alice', branch: 'main' } as any,
      { id: 'N2', label: 'Bob', branch: 'main' } as any,
      { id: 'N3', label: 'Carol', branch: 'main' } as any,
    ];
    edges.value = [
      { from: 'N1', to: 'N2', rel: 'KNOWS', branch: 'main' } as any,
      { from: 'N1', to: 'N3', rel: 'WORKS_WITH', branch: 'main' } as any,
    ];
    v.value++;
  });

  const insert = $(() => {
    const id = `c${commits.value.length + 1}`;
    commits.value = [...commits.value, id];
    branches.value = {
      ...branches.value,
      [current.value]: [...(branches.value[current.value] || []), id],
    };
    // Add a new node and a relation from Alice for demo
    const nid = `N${nodes.value.length + 1}`;
    const pending = current.value !== 'main';
    const branchName = current.value;
    nodes.value = [
      ...nodes.value,
      { id: nid, label: `Node ${nodes.value.length}`, branch: branchName, pending } as any,
    ];
    edges.value = [
      ...edges.value,
      { from: 'N1', to: nid, rel: 'KNOWS', branch: branchName, pending } as any,
    ];
    v.value++;
  });

  const branch = $(() => {
    const name = 'dev';
    const curArr = branches.value[current.value] || [];
    const head = curArr[curArr.length - 1];
    if (!branches.value[name]) {
      branches.value = { ...branches.value, [name]: [head] };
    }
    current.value = name;
    v.value++;
  });

  const merge = $(() => {
    if (current.value === 'main') { v.value++; return; }
    const id = `m${commits.value.length + 1}`;
    commits.value = [...commits.value, id];
    branches.value = {
      ...branches.value,
      main: [...(branches.value.main || []), id],
    };
    // Clear pending markers on merge and convert to main color
    nodes.value = nodes.value.map((n: any) => n.pending ? ({ ...n, pending: false, branch: 'main' }) : n);
    edges.value = edges.value.map((e: any) => e.pending ? ({ ...e, pending: false, branch: 'main' }) : e);
    current.value = 'main';
    v.value++;
  });

  const recovery = $(() => {
    const base = branches.value.main?.[1] || branches.value.main?.[branches.value.main.length - 1];
    const name = 'recovery';
    if (!branches.value[name]) {
      const id = `r${commits.value.length + 1}`;
      commits.value = [...commits.value, id];
      branches.value = { ...branches.value, [name]: base ? [base, id] : [id] };
    }
    current.value = name;
    v.value++;
  });

  useTask$(({ track }) => { track(() => v.value); });

  return (
    <div class="w-full">
      {/* Controls */}
      <Controls
        onInsert$={insert}
        onBranch$={branch}
        onMerge$={merge}
        onRecovery$={recovery}
        onReset$={reset}
      />

      {/* Visuals: single rectangle with split layout (Branches 1/3, Graph 2/3) */}
      <div class="mt-6">
        <div class="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden h-[420px] lg:h-[460px]">
          <div class="grid lg:grid-cols-3">
            <div class="lg:col-span-1 p-3 lg:border-r border-[var(--border)] h-full overflow-auto">
              <BranchViz branches={branches.value} current={current.value} version={v.value} />
            </div>
            <div class="lg:col-span-2 p-3 h-full overflow-hidden">
              <GraphViz nodes={nodes.value} edges={edges.value} version={v.value} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PlaygroundQwik;
