import { createSafeHtml } from '../../utils/escapeHtml';

const ICONS = {
  breathe: '<path d="M5 8h8.5a2.5 2.5 0 1 0-2.5-2.5"></path><path d="M3 12h15a3 3 0 1 1-3 3"></path><path d="M4 16h6.5a2 2 0 1 1-2 2"></path>',
  stretch: '<circle cx="8" cy="3" r="1.5"></circle><path d="M8 5v5l4 3 4-5M8 10l-3 4M12 13l-1 7"></path>',
  balance: '<circle cx="12" cy="4" r="1.5"></circle><path d="M12 6v6M5 9l7 3 7-3M12 12l-4 7M12 12l4 7"></path>',
  cold: '<path d="M12 2v20M4 7l16 10M20 7 4 17M8 4l4 3 4-3M8 20l4-3 4 3"></path>',
  sauna: '<path d="M7 20c-2-3 2-4 0-7s2-4 0-7M13 20c-2-3 2-4 0-7s2-4 0-7M19 20c-2-3 2-4 0-7s2-4 0-7"></path>',
  massage: '<path d="M5 16c3-4 6-5 10-4l4 1M5 20c4-3 8-4 14-3"></path><circle cx="8" cy="7" r="3"></circle>',
  light: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"></path>',
} as const;

function cue(icon: keyof typeof ICONS, name: string, context?: string): string {
  return `<div class="recovery-cue">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[icon]}</svg>
    <span>${createSafeHtml(name)}</span>
    ${context ? `<small>${createSafeHtml(context)}</small>` : ''}
  </div>`;
}

export function renderRecoveryView(host: HTMLElement): void {
  host.innerHTML = `
    <section class="recovery-capsule" aria-labelledby="recovery-capsule-title">
      <h2 id="recovery-capsule-title">Post-sleep · 30 min</h2>
      <div class="recovery-cues recovery-cues--daily">
        ${cue('breathe', 'Breathe')}
        ${cue('stretch', 'Stretch')}
        ${cue('balance', 'Balance')}
      </div>
    </section>
    <section class="recovery-tools" aria-label="Recovery tools">
      <div class="recovery-cues">
        ${cue('cold', 'Cold', 'Intense')}
        ${cue('sauna', 'Sauna', 'Light')}
        ${cue('massage', 'Massage', 'Weekly')}
        ${cue('light', 'Red light', 'Rest')}
      </div>
    </section>
  `;
}
