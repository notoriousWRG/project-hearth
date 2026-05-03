interface VerifyPinFn {
  (pin: string): Promise<{ valid: boolean }>;
}

export function createPinGate(
  onSuccess: (pin: string) => void,
  onCancel: () => void,
  verifyPin: VerifyPinFn,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'pin-gate';

  const heading = document.createElement('h2');
  heading.textContent = 'Enter PIN';
  el.appendChild(heading);

  const form = document.createElement('form');

  const input = document.createElement('input');
  input.type = 'password';
  input.inputMode = 'numeric';
  input.maxLength = 4;
  input.placeholder = '••••';
  input.autocomplete = 'off';
  input.required = false;
  form.appendChild(input);

  const errorMsg = document.createElement('p');
  errorMsg.className = 'pin-gate__error';
  errorMsg.hidden = true;
  errorMsg.textContent = 'Incorrect PIN';
  form.appendChild(errorMsg);

  const actions = document.createElement('div');
  actions.className = 'pin-gate__actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Unlock';
  actions.appendChild(submitBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.dataset.action = 'cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', onCancel);
  actions.appendChild(cancelBtn);

  form.appendChild(actions);
  el.appendChild(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = input.value.trim();
    errorMsg.hidden = true;
    submitBtn.disabled = true;

    verifyPin(pin).then(({ valid }) => {
      submitBtn.disabled = false;
      if (valid) {
        onSuccess(pin);
      } else {
        errorMsg.hidden = false;
        input.value = '';
        input.focus();
      }
    });
  });

  return el;
}
