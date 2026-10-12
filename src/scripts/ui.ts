const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const THEME_COLORS = { dark: '#06080c', light: '#f3f1ec' } as const;
type Theme = keyof typeof THEME_COLORS;

function onVisible(elements: Iterable<Element>, callback: (element: Element) => void, rootMargin = '0px'): void {
  if (!('IntersectionObserver' in window)) {
    for (const element of elements) callback(element);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        callback(entry.target);
      }
    },
    { rootMargin, threshold: 0.12 },
  );
  for (const element of elements) observer.observe(element);
}

export function initTheme(): void {
  const root = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  const apply = (theme: Theme, persist: boolean): void => {
    root.dataset.theme = theme;
    meta?.setAttribute('content', THEME_COLORS[theme]);
    if (persist) {
      try {
        localStorage.setItem('theme', theme);
      } catch {
        // Private browsing can block storage. The choice then lasts for this page only.
      }
    }
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  };

  const current = (): Theme => (root.dataset.theme === 'light' ? 'light' : 'dark');
  meta?.setAttribute('content', THEME_COLORS[current()]);

  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.addEventListener('click', () => apply(current() === 'dark' ? 'light' : 'dark', true));
  }

  // Follow the system setting until the visitor picks a theme themselves.
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (event) => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('theme');
    } catch {
      stored = null;
    }
    if (!stored) apply(event.matches ? 'light' : 'dark', false);
  });
}

export function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  const syncStuck = (): void => {
    header.classList.toggle('is-stuck', window.scrollY > 12);
  };
  syncStuck();
  window.addEventListener('scroll', syncStuck, { passive: true });

  const menu = header.querySelector<HTMLButtonElement>('[data-menu]');
  const setOpen = (open: boolean): void => {
    header.classList.toggle('is-open', open);
    menu?.setAttribute('aria-expanded', String(open));
  };
  menu?.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  const links = [...header.querySelectorAll<HTMLAnchorElement>('[data-nav] a')];
  for (const link of links) link.addEventListener('click', () => setOpen(false));

  const sections = links
    .map((link) => document.querySelector<HTMLElement>(link.hash))
    .filter((section): section is HTMLElement => section !== null);
  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  // A section is current while it crosses a thin band below the header.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-35% 0px -60% 0px' },
  );
  for (const section of sections) observer.observe(section);
}

export function initReveal(): void {
  // The hero is the first screen, so it enters on load instead of waiting for
  // scroll. Two frames let the hidden state paint first, so the transition runs.
  const eager = document.querySelectorAll('[data-reveal="eager"]');
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      for (const element of eager) element.classList.add('is-in');
    });
  });

  onVisible(
    document.querySelectorAll('[data-reveal]:not([data-reveal="eager"])'),
    (element) => element.classList.add('is-in'),
    '0px 0px -6% 0px',
  );
}

export function initCounters(): void {
  if (reducedMotion) return;
  const duration = 1400;

  onVisible(document.querySelectorAll<HTMLElement>('[data-count]'), (element) => {
    const target = Number((element as HTMLElement).dataset.count);
    if (!Number.isFinite(target)) return;
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      element.textContent = String(Math.round(target * eased));
      if (t < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  });
}

export function initTilt(): void {
  if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const maxDegrees = 4.5;

  for (const card of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--rx', `${((0.5 - y) * 2 * maxDegrees).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((x - 0.5) * 2 * maxDegrees).toFixed(2)}deg`);
      card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
}

export function initCopy(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    const label = button.querySelector<HTMLElement>('[data-copy-label]');
    const idle = label?.textContent ?? '';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? '');
        if (label) label.textContent = 'Copied';
      } catch {
        if (label) label.textContent = 'Copy failed';
      }
      window.setTimeout(() => {
        if (label) label.textContent = idle;
      }, 1600);
    });
  }
}
