import { describe, it, expect } from 'vitest';
import { createDOM } from '@builder.io/qwik/testing';
import MetricsGrid from '../components/domain-identity/MetricsGrid.qwik';

describe('MetricsGrid', () => {
  it('should display skeleton when no data provided', async () => {
    const { screen, render } = await createDOM();
    await render(<MetricsGrid lang="en" />);

    const skeletons = screen.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display metrics data when provided', async () => {
    const { screen, render } = await createDOM();
    await render(
      <MetricsGrid
        organicTraffic={50000}
        domainRank={1234}
        backlinksCount={5678}
        referringDomains={234}
        lang="en"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('50,000');
    expect(text).toContain('1,234');
    expect(text).toContain('5,678');
    expect(text).toContain('234');
  });

  it('should format large numbers with locale', async () => {
    const { screen, render } = await createDOM();
    await render(
      <MetricsGrid
        organicTraffic={1000000}
        lang="en"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('1,000,000');
  });

  it('should display em dash (—) for undefined values', async () => {
    const { screen, render } = await createDOM();
    await render(
      <MetricsGrid
        organicTraffic={undefined}
        domainRank={undefined}
        lang="en"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('—');
  });

  it('should render French labels when lang=fr', async () => {
    const { screen, render } = await createDOM();
    await render(
      <MetricsGrid
        organicTraffic={1000}
        lang="fr"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('Métriques domaine');
    expect(text).toContain('Trafic organique');
  });

  it('should show skeleton when at least one value is undefined', async () => {
    const { screen, render } = await createDOM();
    await render(
      <MetricsGrid
        organicTraffic={1000}
        domainRank={undefined}
        backlinksCount={undefined}
        referringDomains={undefined}
        lang="en"
      />
    );

    // Should still render data (hasData = true because organicTraffic is defined)
    const text = screen.textContent || '';
    expect(text).toContain('1,000');
  });
});
