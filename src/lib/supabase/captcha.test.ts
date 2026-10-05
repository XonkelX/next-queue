import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestCaptchaToken } from './captcha';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete window.turnstile;
  document.body.innerHTML = '';
});
function widget() {
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'public-test-key');
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(),
  });
  const render = vi.fn(
    (_container: HTMLElement, options: Record<string, unknown>) => {
      callbacks = options;
      return 'widget';
    },
  );
  let callbacks: Record<string, unknown> = {};
  const remove = vi.fn();
  window.turnstile = { render, remove };
  return { render, remove, callbacks: () => callbacks };
}
describe('on-demand bot verification', () => {
  it('does not load third-party code while unconfigured', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
    expect(await requestCaptchaToken()).toBeUndefined();
    expect(document.querySelector('script[src*="turnstile"]')).toBeNull();
  });
  it('uses fresh challenges and removes completed widgets', async () => {
    const fake = widget();
    const first = requestCaptchaToken();
    await Promise.resolve();
    (fake.callbacks().callback as (value: string) => void)('token-one');
    expect(await first).toBe('token-one');
    expect(fake.remove).toHaveBeenCalledWith('widget');
    expect(document.querySelector('dialog')).toBeNull();
    const second = requestCaptchaToken();
    await Promise.resolve();
    (fake.callbacks().callback as (value: string) => void)('token-two');
    expect(await second).toBe('token-two');
    expect(fake.render).toHaveBeenCalledTimes(2);
  });
  it('allows cancellation and restores keyboard focus', async () => {
    const fake = widget();
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    const pending = requestCaptchaToken();
    const rejection = expect(pending).rejects.toThrow('not completed');
    await Promise.resolve();
    (document.querySelector('dialog button') as HTMLButtonElement).click();
    await rejection;
    expect(fake.remove).toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
  });
  it('never returns a token when the challenge expires', async () => {
    const fake = widget();
    const pending = requestCaptchaToken();
    const rejection = expect(pending).rejects.toThrow('not completed');
    await Promise.resolve();
    (fake.callbacks()['expired-callback'] as () => void)();
    await rejection;
  });
});
