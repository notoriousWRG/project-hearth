export function createErrorBanner(message: string, onDismiss?: () => void): HTMLElement {
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'assertive');

  const msg = document.createElement('span');
  msg.className = 'error-banner__message';
  msg.textContent = message;
  banner.appendChild(msg);

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'error-banner__dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss error');
  dismissBtn.textContent = '×';
  dismissBtn.addEventListener('click', () => {
    banner.remove();
    onDismiss?.();
  });
  banner.appendChild(dismissBtn);

  return banner;
}
