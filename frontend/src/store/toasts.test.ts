import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './toasts';

describe('Toast Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useToastStore.getState().clearAllToasts();
  });

  it('adds a toast correctly', () => {
    const { addToast, toasts } = useToastStore.getState();
    
    const toastId = addToast({
      type: 'success',
      message: 'Test message',
      title: 'Test title',
    });

    expect(toastId).toBeDefined();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      type: 'success',
      message: 'Test message',
      title: 'Test title',
    });
  });

  it('removes a toast correctly', () => {
    const { addToast, removeToast, toasts } = useToastStore.getState();
    
    const toastId = addToast({
      type: 'info',
      message: 'Test message',
    });

    expect(toasts).toHaveLength(1);
    
    removeToast(toastId);
    
    expect(toasts).toHaveLength(0);
  });

  it('limits number of toasts', () => {
    const { addToast, toasts } = useToastStore.getState();
    
    // Add more toasts than the limit
    for (let i = 0; i < 10; i++) {
      addToast({
        type: 'info',
        message: `Message ${i}`,
      });
    }

    // Should not exceed maxToasts
    expect(toasts).toHaveLength(5); // maxToasts = 5
  });

  it('sets correct default durations', () => {
    const { addToast, toasts } = useToastStore.getState();
    
    addToast({ type: 'success', message: 'Success' });
    addToast({ type: 'error', message: 'Error' });
    
    expect(toasts[1].duration).toBe(4000); // success duration
    expect(toasts[0].persistent).toBe(true); // error is persistent
  });

  it('creates helper toast methods correctly', () => {
    const { success, error, warning, info, toasts } = useToastStore.getState();
    
    success('Success message');
    error('Error message');
    warning('Warning message');
    info('Info message');

    expect(toasts).toHaveLength(4);
    expect(toasts.map(t => t.type)).toEqual(['info', 'warning', 'error', 'success']);
  });

  it('clears all toasts', () => {
    const { addToast, clearAllToasts, toasts } = useToastStore.getState();
    
    addToast({ type: 'info', message: 'Test 1' });
    addToast({ type: 'info', message: 'Test 2' });
    
    expect(toasts).toHaveLength(2);
    
    clearAllToasts();
    
    expect(toasts).toHaveLength(0);
  });

  it('updates toast correctly', () => {
    const { addToast, updateToast, toasts } = useToastStore.getState();
    
    const toastId = addToast({
      type: 'info',
      message: 'Original message',
    });

    updateToast(toastId, {
      type: 'success',
      message: 'Updated message',
    });

    expect(toasts[0]).toMatchObject({
      type: 'success',
      message: 'Updated message',
    });
  });
});