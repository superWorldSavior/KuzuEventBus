import { component$, useSignal, useVisibleTask$, PropFunction } from '@builder.io/qwik';

export interface BranchVizProps {
  branches: Record<string, string[]>; // name -> commits ids
  current: string; // current branch name
  version: number; // bump to re-render
}

export const BranchViz = component$((props: BranchVizProps) => {
  const container = useSignal<HTMLElement>();

  useVisibleTask$(async ({ track }) => {
    track(() => props.version);
    if (!container.value) return;

    // Dynamically import local @gitgraph/js package (bundled)
    const mod: any = await import('@gitgraph/js');
    const createGitgraph = mod.createGitgraph || mod.default?.createGitgraph;
    const templateExtend = mod.templateExtend || mod.default?.templateExtend;
    const TemplateName = mod.TemplateName || mod.default?.TemplateName;
    if (!createGitgraph) return;

    // Clear previous render
    container.value.innerHTML = '';
    const template = templateExtend?.(TemplateName?.Metro || {}, {
      commit: {
        message: { display: false },
        dot: { size: 8 },
        spacing: 28,
        tooltipHTMLFormatter: () => '',
      },
      branch: {
        label: { display: false },
      },
    });
    const graph = createGitgraph(container.value, { template });

    // Create branches starting from main
    const created: Record<string, any> = {};
    const ensureBranch = (name: string) => {
      if (created[name]) return created[name];
      if (name === 'main' || name === 'master') {
        created[name] = graph.branch('main');
      } else {
        // branch from main HEAD by default
        const base = created['main'] || graph.branch('main');
        created[name] = base.branch(name);
      }
      return created[name];
    };

    // Commit sequences
    // Ensure main exists first
    ensureBranch('main');
    // Replay commits per branch (compact: no extra messages)
    Object.entries(props.branches).forEach(([name, commits]) => {
      const br = ensureBranch(name);
      // show only last 6 commits for compactness
      const recent = commits.slice(Math.max(0, commits.length - 6));
      recent.forEach((cid, idx) => {
        const msg = idx === commits.length - 1 && name === props.current ? `${cid} (HEAD)` : cid;
        br.commit(msg);
      });
    });

    // If non-main branches should be merged, user will do via state; here we just show sequences
  });

  return (
    <div ref={container} class="min-h-[260px]" />
  );
});

export default BranchViz;
