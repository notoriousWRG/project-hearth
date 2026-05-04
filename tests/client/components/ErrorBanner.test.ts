// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { createErrorBanner } from '../../../src/client/components/ErrorBanner.js';

describe('createErrorBanner', () => {
  it('renders a div with error-banner class', () => {
    const el = createErrorBanner('Something went wrong');
    expect(el.tagName.toLowerCase()).toBe('div');
    expect(el.classList.contains('error-banner')).toBe(true);
  });

  it('displays the message text', () => {
    const el = createErrorBanner('Could not load todos.');
    expect(el.querySelector('.error-banner__message')?.textContent).toBe('Could not load todos.');
  });

  it('has role="alert" for screen readers', () => {
    const el = createErrorBanner('Oops');
    expect(el.getAttribute('role')).toBe('alert');
  });

  it('has aria-live="assertive"', () => {
    const el = createErrorBanner('Oops');
    expect(el.getAttribute('aria-live')).toBe('assertive');
  });

  it('dismiss button has accessible label', () => {
    const el = createErrorBanner('Error');
    const btn = el.querySelector('.error-banner__dismiss');
    expect(btn?.getAttribute('aria-label')).toBe('Dismiss error');
  });

  it('removes itself from DOM when dismissed', () => {
    const container = document.createElement('div');
    const el = createErrorBanner('Error');
    container.appendChild(el);
    expect(container.contains(el)).toBe(true);

    (el.querySelector('.error-banner__dismiss') as HTMLButtonElement).click();
    expect(container.contains(el)).toBe(false);
  });

  it('calls onDismiss callback when dismissed', () => {
    const onDismiss = vi.fn();
    const el = createErrorBanner('Error', onDismiss);
    (el.querySelector('.error-banner__dismiss') as HTMLButtonElement).click();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('works without onDismiss callback', () => {
    const el = createErrorBanner('Error');
    expect(() => {
      (el.querySelector('.error-banner__dismiss') as HTMLButtonElement).click();
    }).not.toThrow();
  });
});
