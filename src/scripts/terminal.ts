const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Milliseconds to wait before each kind of line appears. */
const PAUSE: Record<string, number> = {
  cmd: 200,
  'cmd-more': 120,
  meta: 650,
  step: 520,
  call: 420,
  result: 760,
  done: 520,
  answer: 380,
};

function initTabs(terminal: HTMLElement): void {
  const tabs = [...terminal.querySelectorAll<HTMLButtonElement>('[data-tab]')];

  const select = (tab: HTMLButtonElement): void => {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      const pane = document.getElementById(other.getAttribute('aria-controls') ?? '');
      if (pane) pane.hidden = !selected;
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + step + tabs.length) % tabs.length]!;
      select(next);
      next.focus();
    });
  });
}

/** Plays the sample run line by line, the way it scrolls past in a terminal. */
function initPlayback(terminal: HTMLElement): void {
  // Scoped to the trace: the highlighted Go snippet has its own `.line` spans.
  const lines = [...terminal.querySelectorAll<HTMLElement>('.trace .line')];
  if (reducedMotion || lines.length === 0) return;

  let timers: number[] = [];
  const play = (): void => {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
    for (const line of lines) line.classList.remove('is-on');

    let at = 0;
    for (const line of lines) {
      at += PAUSE[line.dataset.kind ?? ''] ?? 400;
      timers.push(window.setTimeout(() => line.classList.add('is-on'), at));
    }
  };

  terminal.classList.add('is-armed');
  terminal.querySelector('[data-term-replay]')?.addEventListener('click', play);

  if (!('IntersectionObserver' in window)) {
    play();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      play();
    },
    { threshold: 0.4 },
  );
  observer.observe(terminal);
}

export function initTerminal(): void {
  for (const terminal of document.querySelectorAll<HTMLElement>('[data-term]')) {
    initTabs(terminal);
    initPlayback(terminal);
  }
}
