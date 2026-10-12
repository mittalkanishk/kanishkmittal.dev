import { initTerminal } from './terminal';
import { initCopy, initCounters, initHeader, initReveal, initTheme, initTilt } from './ui';

initTheme();
initHeader();
initReveal();
initCounters();
initTilt();
initCopy();
initTerminal();

// three.js loads in its own chunk, after the page is already usable.
void import('../scene/boot').then(({ bootScene }) => bootScene());
