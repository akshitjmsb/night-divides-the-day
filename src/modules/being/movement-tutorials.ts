import { escapeHtml } from '../../utils/escapeHtml';

/** Official publisher videos; full runtimes checked on 2026-09-07. */
const WARMUP_TUTORIALS = [
  { name: 'Shoulder circles', prescription: '10 × 2', videoId: 'shcSlZEnNp0', seconds: 35, publisher: 'Vive Health' },
  { name: 'Dynamic lunges', prescription: '8 / leg', videoId: 'DhPDsFdcgxU', seconds: 50, publisher: 'Twin Cities Orthopedics' },
  { name: 'Torso rotations', prescription: '10 / side', videoId: 'h6XyzlM8m24', seconds: 14, publisher: 'Runna' },
] as const;

const WORKOUT_TUTORIALS = [
  { name: 'Squats', prescription: '12', videoId: 'GvrvBJYaOSM', seconds: 27, publisher: 'Nuffield Health' },
  { name: 'Push-ups', prescription: '10', videoId: 'WDIpL0pjun0', seconds: 14, publisher: 'NASM' },
  { name: 'Lunges', prescription: '10 / leg', videoId: 'FOXMtZ2dqow', seconds: 33, publisher: 'Bupa Australia' },
  { name: 'Plank', prescription: '1 min', videoId: 'QpOgJLqeo14', seconds: 33, publisher: 'Nuffield Health' },
  { name: 'Superman', prescription: '12', videoId: 'uexOGyxLr7E', seconds: 49, publisher: 'Cleveland Clinic' },
] as const;

type Tutorial = (typeof WARMUP_TUTORIALS)[number] | (typeof WORKOUT_TUTORIALS)[number];

function renderTutorial(tutorial: Tutorial): string {
  const title = `${tutorial.name} — ${tutorial.publisher} (${tutorial.seconds} seconds)`;
  return `<button type="button" class="movement-video" data-video="${escapeHtml(tutorial.videoId)}" data-video-title="${escapeHtml(title)}" aria-pressed="false">
    <span>${escapeHtml(tutorial.name)}</span>
    <small>${escapeHtml(tutorial.prescription)}</small>
  </button>`;
}

export function renderMovementTutorials(): string {
  return `<section class="movement-panel" data-movement-panel="routine" id="movement-panel-routine" role="tabpanel" aria-labelledby="movement-tab-routine">
    <h2 class="movement-panel__title">Tennis Foundation</h2>
    <h3 class="movement-panel__label">Warm-up</h3>
    <div class="movement-video-grid">${WARMUP_TUTORIALS.map(renderTutorial).join('')}</div>
    <h3 class="movement-panel__label">Workout</h3>
    <div class="movement-video-grid">${WORKOUT_TUTORIALS.map(renderTutorial).join('')}</div>
    <div class="movement-player" data-movement-player hidden></div>
  </section>`;
}

/** All Movement videos use one on-demand, privacy-enhanced inline player. */
export function initializeMovementVideos(host: HTMLElement): void {
  host.querySelectorAll<HTMLButtonElement>('[data-video]').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.closest<HTMLElement>('[data-movement-panel]');
      const player = panel?.querySelector<HTMLElement>('[data-movement-player]');
      const videoId = button.dataset.video;
      if (!panel || !player || !videoId) return;

      host.querySelectorAll<HTMLButtonElement>('[data-video]').forEach(other => {
        other.setAttribute('aria-pressed', String(other === button));
      });
      player.replaceChildren();
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'movement-player__close';
      close.dataset.closeVideo = '';
      close.setAttribute('aria-label', 'Close video');
      close.textContent = '×';
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
      frame.title = button.dataset.videoTitle ?? button.textContent?.trim() ?? 'Movement tutorial';
      frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      player.append(close, frame);
      player.hidden = false;
      panel.classList.add('movement-panel--playing');
    });
  });
}
