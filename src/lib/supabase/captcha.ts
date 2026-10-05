type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | undefined;
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      reject(
        new Error(
          'Verification could not load. Check your connection and try again.',
        ),
      );
    };
    const timer = setTimeout(fail, 15000);
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    };
    document.head.append(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

// Each request gets a fresh, single-use token. Supabase Auth validates it.
// No script or third-party request is made when Turnstile is not configured.
export async function requestCaptchaToken(): Promise<string | undefined> {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!sitekey) return undefined;
  const turnstile = await loadTurnstile();
  return new Promise((resolve, reject) => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'verification-dialog';
    dialog.setAttribute('aria-label', 'Security verification');
    const heading = document.createElement('h2');
    heading.textContent = 'A quick security check';
    const message = document.createElement('p');
    message.textContent = 'Please wait while we verify your browser.';
    message.setAttribute('role', 'status');
    const container = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'button button-secondary';
    cancel.textContent = 'Cancel';
    cancel.type = 'button';
    dialog.append(heading, message, container, cancel);
    document.body.append(dialog);
    let widget: string | undefined;
    let finished = false;
    const finish = (token?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (widget !== undefined) turnstile.remove(widget);
      dialog.close();
      dialog.remove();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
      if (token) resolve(token);
      else
        reject(new Error('Verification was not completed. Please try again.'));
    };
    const timer = setTimeout(() => finish(), 120000);
    cancel.onclick = () => finish();
    dialog.oncancel = (event) => {
      event.preventDefault();
      finish();
    };
    try {
      dialog.showModal();
      widget = turnstile.render(container, {
        sitekey,
        size: 'flexible',
        theme: 'auto',
        callback: (token: string) => finish(token),
        'expired-callback': () => finish(),
        'error-callback': () => {
          finish();
          return true;
        },
        'timeout-callback': () => finish(),
      });
    } catch {
      finish();
    }
  });
}
