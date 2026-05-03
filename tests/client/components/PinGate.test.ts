// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinGate } from '../../../src/client/components/PinGate.js';

function makeVerifyPin(valid: boolean) {
  return vi.fn(async () => ({ valid }));
}

describe('createPinGate', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a form with a PIN input and submit button', () => {
    const el = createPinGate(vi.fn(), vi.fn(), makeVerifyPin(true));
    expect(el.querySelector('input')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('calls onSuccess with the entered PIN when valid', async () => {
    const onSuccess = vi.fn();
    const el = createPinGate(onSuccess, vi.fn(), makeVerifyPin(true));
    container.appendChild(el);

    const input = el.querySelector('input') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;
    input.value = '1234';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('1234');
    });
  });

  it('shows an error message when PIN is invalid', async () => {
    const el = createPinGate(vi.fn(), vi.fn(), makeVerifyPin(false));
    container.appendChild(el);

    const input = el.querySelector('input') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;
    input.value = '0000';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(el.textContent).toContain('Incorrect PIN');
    });
  });

  it('does not call onSuccess when PIN is invalid', async () => {
    const onSuccess = vi.fn();
    const el = createPinGate(onSuccess, vi.fn(), makeVerifyPin(false));
    container.appendChild(el);

    const input = el.querySelector('input') as HTMLInputElement;
    const form = el.querySelector('form') as HTMLFormElement;
    input.value = '0000';
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await new Promise((r) => setTimeout(r, 50));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('submits with empty input when no PIN is set (server returns valid: true)', async () => {
    const onSuccess = vi.fn();
    const verifyPin = vi.fn(async () => ({ valid: true }));
    const el = createPinGate(onSuccess, vi.fn(), verifyPin);
    container.appendChild(el);

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await vi.waitFor(() => {
      expect(verifyPin).toHaveBeenCalledWith('');
      expect(onSuccess).toHaveBeenCalledWith('');
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    const el = createPinGate(vi.fn(), onCancel, makeVerifyPin(true));
    container.appendChild(el);

    const cancelBtn = el.querySelector('[data-action="cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    expect(onCancel).toHaveBeenCalled();
  });
});
