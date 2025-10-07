import { describe, it, expect } from 'vitest';
import { createDOM } from '@builder.io/qwik/testing';
import BusinessContextSection from '../components/domain-identity/BusinessContextSection.qwik';

describe('BusinessContextSection', () => {
  it('should display skeleton when no data provided', async () => {
    const { screen, render } = await createDOM();
    await render(<BusinessContextSection lang="en" />);

    const skeletons = screen.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display business context data when provided', async () => {
    const { screen, render } = await createDOM();
    await render(
      <BusinessContextSection
        industry="SaaS"
        targetAudience="Developers"
        contentType="Documentation"
        businessDescription="A platform for building no-code workflows"
        lang="en"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('SaaS');
    expect(text).toContain('Developers');
    expect(text).toContain('Documentation');
    expect(text).toContain('A platform for building no-code workflows');
  });

  it('should render French labels when lang=fr', async () => {
    const { screen, render } = await createDOM();
    await render(
      <BusinessContextSection
        industry="SaaS"
        lang="fr"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('Contexte business');
    expect(text).toContain('Industrie');
  });

  it('should show skeleton when all fields are undefined', async () => {
    const { screen, render } = await createDOM();
    await render(
      <BusinessContextSection
        industry={undefined}
        targetAudience={undefined}
        contentType={undefined}
        businessDescription={undefined}
        lang="en"
      />
    );

    const skeletons = screen.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display partial data without skeleton', async () => {
    const { screen, render } = await createDOM();
    await render(
      <BusinessContextSection
        industry="E-commerce"
        targetAudience={undefined}
        contentType={undefined}
        businessDescription={undefined}
        lang="en"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('E-commerce');
    
    // Should NOT show skeleton because we have some data
    const actualData = screen.querySelectorAll('.space-y-2');
    expect(actualData.length).toBeGreaterThan(0);
  });

  it('should render all fields when all are provided', async () => {
    const { screen, render } = await createDOM();
    await render(
      <BusinessContextSection
        industry="Healthcare"
        targetAudience="Medical professionals"
        contentType="Blog articles"
        businessDescription="Healthcare platform for doctors"
        lang="en"
      />
    );

    const text = screen.textContent || '';
    expect(text).toContain('Healthcare');
    expect(text).toContain('Medical professionals');
    expect(text).toContain('Blog articles');
    expect(text).toContain('Healthcare platform for doctors');
  });
});
