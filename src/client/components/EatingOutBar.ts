import type { EatingOutState } from '../../shared/types.js';
import { createErrorBanner } from './ErrorBanner.js';

interface EatingOutApi {
  get: () => Promise<EatingOutState>;
  subtract: (amount: number) => Promise<EatingOutState>;
  reset: () => Promise<EatingOutState>;
}

export function createEatingOutBar(api: EatingOutApi): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'eating-out-bar';

  let state: EatingOutState = { remaining: 0, weeklyAmount: 0, weekStart: '' };

  const header = document.createElement('div');
  header.className = 'eating-out-bar__header';
  const label = document.createElement('span');
  label.className = 'eating-out-bar__label';
  label.textContent = 'Eating out this week';
  const remaining = document.createElement('span');
  remaining.className = 'eating-out-bar__remaining';
  remaining.setAttribute('aria-live', 'polite');
  header.appendChild(label);
  header.appendChild(remaining);
  bar.appendChild(header);

  const controls = document.createElement('div');
  controls.className = 'eating-out-bar__controls';

  // Preset quick-subtract buttons
  const presets = [5, 10, 15, 20, 25];
  for (const amount of presets) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eating-out-bar__preset';
    btn.textContent = `−$${amount}`;
    btn.dataset.amount = String(amount);
    btn.addEventListener('click', () => handleSubtract(amount));
    controls.appendChild(btn);
  }

  // Custom amount input
  const customWrap = document.createElement('div');
  customWrap.className = 'eating-out-bar__custom';
  const customInput = document.createElement('input');
  customInput.type = 'number';
  customInput.min = '0.01';
  customInput.step = '0.01';
  customInput.placeholder = 'Other';
  customInput.className = 'eating-out-bar__custom-input';
  customInput.setAttribute('aria-label', 'Custom spend amount');
  const customBtn = document.createElement('button');
  customBtn.type = 'button';
  customBtn.className = 'eating-out-bar__custom-btn';
  customBtn.textContent = '−';
  customBtn.addEventListener('click', () => {
    const val = parseFloat(customInput.value);
    if (!isNaN(val) && val > 0) {
      handleSubtract(val);
      customInput.value = '';
    }
  });
  customWrap.appendChild(customInput);
  customWrap.appendChild(customBtn);
  controls.appendChild(customWrap);

  // Reset-to-full button
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'eating-out-bar__reset';
  resetBtn.textContent = 'Reset';
  resetBtn.title = 'Reset to weekly amount';
  resetBtn.addEventListener('click', () => {
    resetBtn.disabled = true;
    api
      .reset()
      .then((s) => {
        state = s;
        rerender();
        resetBtn.disabled = false;
      })
      .catch((err: unknown) => {
        bar.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
        resetBtn.disabled = false;
      });
  });
  controls.appendChild(resetBtn);

  bar.appendChild(controls);

  function rerender(): void {
    const dollars = state.remaining.toFixed(2);
    remaining.textContent = `$${dollars} left`;
    remaining.className =
      'eating-out-bar__remaining' + (state.remaining < 0 ? ' eating-out-bar__remaining--over' : '');
  }

  function handleSubtract(amount: number): void {
    api
      .subtract(amount)
      .then((s) => {
        state = s;
        rerender();
      })
      .catch((err: unknown) => {
        bar.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
      });
  }

  // Load initial state
  api
    .get()
    .then((s) => {
      state = s;
      rerender();
    })
    .catch((err: unknown) => {
      bar.prepend(createErrorBanner(err instanceof Error ? err.message : 'Error'));
    });

  rerender();
  return bar;
}
