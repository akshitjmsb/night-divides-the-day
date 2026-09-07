import { escapeHtml } from '../../utils/escapeHtml';
import { getStretchLinks, getStretchNow } from './exercise-data';
import { renderExerciseView } from './exercise-view';
import { initializeMovementTutorials, renderMovementTutorials } from './movement-tutorials';

export function renderMovementView(host: HTMLElement, today: Date): void {
  const renderOverview = (): void => {
    host.innerHTML = `
      ${renderMovementTutorials()}
      <div class="movement-choose">
        <button type="button" class="pillar-action movement-choose__action" data-movement="choose">Choose</button>
      </div>
    `;
    initializeMovementTutorials(host);
  };

  const renderChoice = (): void => {
    const stretch = getStretchNow(today);
    host.innerHTML = `
      <button type="button" class="pillar-back" data-movement-back>← Movement</button>
      <div class="movement-now">
        <button type="button" class="pillar-action movement-now__action" ${stretch ? `data-stretch-now="${escapeHtml(stretch.url)}"` : 'data-movement="stretch"'}>Stretch Now</button>
      </div>
      <button type="button" class="pillar-action movement-choice__weights" data-movement="weights">Weights</button>
      <div class="being-links" aria-label="Stretch">
        ${getStretchLinks()
          .map(link => `<button type="button" class="stretch-btn" data-link="${escapeHtml(link.url)}">${escapeHtml(link.label)}</button>`)
          .join('')}
      </div>
    `;
  };

  host.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const immediate = target?.closest<HTMLButtonElement>('[data-stretch-now]');
    if (immediate?.dataset.stretchNow) {
      window.open(immediate.dataset.stretchNow, '_blank', 'noopener');
      return;
    }
    if (target?.closest('[data-movement-back]')) {
      renderOverview();
      return;
    }
    const movement = target?.closest<HTMLButtonElement>('[data-movement]');
    if (movement?.dataset.movement === 'choose' || movement?.dataset.movement === 'stretch') {
      renderChoice();
      return;
    }
    if (movement?.dataset.movement === 'weights') {
      host.innerHTML = '<button type="button" class="pillar-back" data-movement-back>← Movement</button><div data-weights></div>';
      const weights = host.querySelector<HTMLElement>('[data-weights]');
      if (weights) renderExerciseView(weights, today);
      return;
    }
    const link = target?.closest<HTMLButtonElement>('[data-link]');
    if (link?.dataset.link) window.open(link.dataset.link, '_blank', 'noopener');
  });

  renderOverview();
}
