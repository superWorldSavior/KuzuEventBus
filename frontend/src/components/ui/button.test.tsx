import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { Button } from './button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600'); // Default variant
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="outline">Outline</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('border', 'border-gray-300');
    
    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('text-gray-700', 'hover:bg-gray-100');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    
    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards refs correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref test</Button>);
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('spreads additional props', () => {
    render(<Button data-testid="test-button" aria-label="Test button">Test</Button>);
    
    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('aria-label', 'Test button');
  });
});