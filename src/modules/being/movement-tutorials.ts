import { escapeHtml } from '../../utils/escapeHtml';

/** Official publisher videos; full runtimes checked on 2026-09-07. */
const WARMUP_TUTORIALS = [
  { name: 'Shoulder circles', prescription: '10 backward + 10 forward', videoId: 'shcSlZEnNp0', seconds: 35, publisher: 'Vive Health' },
  { name: 'Dynamic lunges', prescription: '8 each leg', videoId: 'DhPDsFdcgxU', seconds: 50, publisher: 'Twin Cities Orthopedics' },
  { name: 'Torso rotations', prescription: '10 each side', videoId: 'h6XyzlM8m24', seconds: 14, publisher: 'Runna' },
] as const;

const WORKOUT_TUTORIALS = [
  { name: 'Squats', prescription: '12 reps', videoId: 'GvrvBJYaOSM', seconds: 27, publisher: 'Nuffield Health' },
  { name: 'Push-ups', prescription: '10 reps', videoId: 'WDIpL0pjun0', seconds: 14, publisher: 'NASM' },
  { name: 'Lunges', prescription: '10 each leg', videoId: 'FOXMtZ2dqow', seconds: 33, publisher: 'Bupa Australia' },
  { name: 'Plank', prescription: '1 minute', videoId: 'QpOgJLqeo14', seconds: 33, publisher: 'Nuffield Health' },
  { name: 'Superman', prescription: '12 reps', videoId: 'uexOGyxLr7E', seconds: 49, publisher: 'Cleveland Clinic' },
] as const;

const TUTORIALS = [...WARMUP_TUTORIALS, ...WORKOUT_TUTORIALS];

function renderTutorial(tutorial: (typeof TUTORIALS)[number]): string {
  return `
    <details class="movement-tutorial" data-tutorial="${escapeHtml(tutorial.videoId)}">
      <summary>
        <span>${escapeHtml(tutorial.name)}</span>
        <span class="ex-pointer__rx">${escapeHtml(tutorial.prescription)}</span>
      </summary>
      <div class="movement-tutorial__player"></div>
      <a class="movement-tutorial__source" href="https://www.youtube.com/watch?v=${escapeHtml(tutorial.videoId)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tutorial.publisher)} · ${tutorial.seconds}s ↗</a>
    </details>
  `;
}

export function renderMovementTutorials(): string {
  return `<div class="movement-tutorials">
    <h2 class="movement-routine__title">Day 2 — Tennis Foundation</h2>
    <h3 class="movement-routine__label">Warm-up</h3>
    ${WARMUP_TUTORIALS.map(renderTutorial).join('')}
    <h3 class="movement-routine__label">Workout</h3>
    ${WORKOUT_TUTORIALS.map(renderTutorial).join('')}
  </div>`;
}

/** Load only an opened tutorial; removing its frame also stops playback. */
export function initializeMovementTutorials(host: HTMLElement): void {
  host.querySelectorAll<HTMLDetailsElement>('[data-tutorial]').forEach(details => {
    details.addEventListener('toggle', () => {
      const player = details.querySelector<HTMLElement>('.movement-tutorial__player');
      if (!player) return;
      if (!details.open) {
        player.replaceChildren();
        return;
      }
      host.querySelectorAll<HTMLDetailsElement>('[data-tutorial]').forEach(other => {
        if (other !== details) {
          other.open = false;
          other.querySelector('.movement-tutorial__player')?.replaceChildren();
        }
      });
      const tutorial = TUTORIALS.find(item => item.videoId === details.dataset.tutorial);
      if (!tutorial || player.childElementCount > 0) return;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${tutorial.videoId}?rel=0&playsinline=1`;
      frame.title = `${tutorial.name} — ${tutorial.publisher} (${tutorial.seconds} seconds)`;
      frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      player.append(frame);
    });
  });
}
