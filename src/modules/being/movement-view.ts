import { escapeHtml } from '../../utils/escapeHtml';
import { getStretchLinks } from './exercise-data';
import { renderExerciseView } from './exercise-view';
import { initializeMovementVideos, renderMovementTutorials } from './movement-tutorials';

const ROUTINE_ICON = '<circle cx="12" cy="12" r="8"></circle><path d="m10 8 5 4-5 4z"></path>';
const WEIGHTS_ICON = '<path d="M6 9v6M3 10v4M18 9v6M21 10v4M6 12h12"></path>';
const STRETCH_ICON = '<circle cx="8" cy="3" r="1.5"></circle><path d="M8 5v5l4 3 4-5M8 10l-3 4M12 13l-1 7"></path>';

function renderTab(id: string, label: string, icon: string, selected = false): string {
  return `<button type="button" class="movement-tab" id="movement-tab-${id}" data-movement-tab="${id}" role="tab" aria-controls="movement-panel-${id}" aria-selected="${selected}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>
    <span>${label}</span>
  </button>`;
}

function youtubeId(url: string): string | null {
  const parsed = new URL(url);
  if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1) || null;
  return parsed.searchParams.get('v');
}

export function renderMovementView(host: HTMLElement, today: Date): void {
  const stretchVideos = getStretchLinks()
    .map(link => ({ ...link, videoId: youtubeId(link.url) }))
    .filter((link): link is typeof link & { videoId: string } => Boolean(link.videoId));

  host.innerHTML = `
    <div class="movement-tabs" role="tablist" aria-label="Movement">
      ${renderTab('routine', 'Routine', ROUTINE_ICON, true)}
      ${renderTab('weights', 'Weights', WEIGHTS_ICON)}
      ${renderTab('stretch', 'Stretch', STRETCH_ICON)}
    </div>
    ${renderMovementTutorials()}
    <section class="movement-panel" data-movement-panel="weights" id="movement-panel-weights" role="tabpanel" aria-labelledby="movement-tab-weights" hidden>
      <div data-weights></div>
    </section>
    <section class="movement-panel" data-movement-panel="stretch" id="movement-panel-stretch" role="tabpanel" aria-labelledby="movement-tab-stretch" hidden>
      <div class="movement-video-grid">
        ${stretchVideos.map(video => `<button type="button" class="movement-video movement-video--icon" data-video="${escapeHtml(video.videoId)}" data-video-title="${escapeHtml(video.label)}" aria-pressed="false"><span>${escapeHtml(video.label)}</span></button>`).join('')}
      </div>
      <div class="movement-player" data-movement-player hidden></div>
    </section>
  `;

  const weights = host.querySelector<HTMLElement>('[data-weights]');
  if (weights) renderExerciseView(weights, today);
  initializeMovementVideos(host);

  host.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const close = target?.closest<HTMLButtonElement>('[data-close-video]');
    if (close) {
      const panel = close.closest<HTMLElement>('[data-movement-panel]');
      panel?.classList.remove('movement-panel--playing');
      const player = panel?.querySelector<HTMLElement>('[data-movement-player]');
      player?.replaceChildren();
      if (player) player.hidden = true;
      panel?.querySelectorAll<HTMLButtonElement>('[data-video]').forEach(button => {
        button.setAttribute('aria-pressed', 'false');
      });
      return;
    }

    const tab = target?.closest<HTMLButtonElement>('[data-movement-tab]');
    if (!tab?.dataset.movementTab) return;

    host.querySelectorAll<HTMLButtonElement>('[data-movement-tab]').forEach(button => {
      button.setAttribute('aria-selected', String(button === tab));
    });
    host.querySelectorAll<HTMLElement>('[data-movement-panel]').forEach(panel => {
      panel.hidden = panel.dataset.movementPanel !== tab.dataset.movementTab;
      panel.classList.remove('movement-panel--playing');
    });
    host.querySelectorAll<HTMLElement>('[data-movement-player]').forEach(player => {
      player.replaceChildren();
      player.hidden = true;
    });
    host.querySelectorAll<HTMLButtonElement>('[data-video]').forEach(button => {
      button.setAttribute('aria-pressed', 'false');
    });
  });
}
