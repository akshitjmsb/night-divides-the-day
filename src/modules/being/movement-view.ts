import { escapeHtml } from '../../utils/escapeHtml';
import { getStretchLinks, getStretchNow } from './exercise-data';
import { renderExerciseView } from './exercise-view';
import { initializeMovementTutorials, renderMovementTutorials } from './movement-tutorials';

export function renderMovementView(host: HTMLElement, today: Date): void {
  const stretch = getStretchNow(today);
  host.innerHTML = `
    ${renderMovementTutorials()}
    <section class="movement-section" aria-labelledby="movement-weights-title">
      <h2 class="movement-section__title" id="movement-weights-title">Weights</h2>
      <div data-weights></div>
    </section>
    <section class="movement-section" aria-labelledby="movement-stretch-title">
      <h2 class="movement-section__title" id="movement-stretch-title">Stretch</h2>
      <div class="movement-now">
        ${stretch ? `<button type="button" class="pillar-action movement-now__action" data-link="${escapeHtml(stretch.url)}">Stretch Now</button>` : ''}
      </div>
      <div class="being-links" aria-label="Stretch">
        ${getStretchLinks()
          .map(link => `<button type="button" class="stretch-btn" data-link="${escapeHtml(link.url)}">${escapeHtml(link.label)}</button>`)
          .join('')}
      </div>
    </section>
  `;

  const weights = host.querySelector<HTMLElement>('[data-weights]');
  if (weights) renderExerciseView(weights, today);
  initializeMovementTutorials(host);

  host.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest<HTMLButtonElement>('[data-link]');
    if (link?.dataset.link) window.open(link.dataset.link, '_blank', 'noopener');
  });
}
