export const BREATH_GUIDE_URL = '/audio/breath-guide.mp3';
export const BREATH_GUIDE_VOLUME = 0.65;
export const GUIDED_BREATH_CYCLE_MS = 16_000;

export type GuidedBreathPhase = 'Inhale' | 'Hold' | 'Exhale';

export interface GuidedBreathCue {
  phase: GuidedBreathPhase;
  count: 1 | 2 | 3 | 4;
}

const GUIDED_PHASES: readonly GuidedBreathPhase[] = [
  'Inhale',
  'Hold',
  'Exhale',
  'Hold',
];

/** The spoken track and ring share this 4-4-4-4 phase clock. */
export function getGuidedBreathCue(elapsedMs: number): GuidedBreathCue {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const cycleElapsed = safeElapsed % GUIDED_BREATH_CYCLE_MS;
  const phaseIndex = Math.floor(cycleElapsed / 4_000);
  const count = (Math.floor((cycleElapsed % 4_000) / 1_000) + 1) as 1 | 2 | 3 | 4;
  return { phase: GUIDED_PHASES[phaseIndex], count };
}

export interface BreathGuideAudio {
  loop: boolean;
  preload: string;
  volume: number;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
}

export interface BreathGuideSound {
  start(): void;
  stop(): void;
}

/** A continuous 4-4-4-4 guide stays alive through iOS screen lock. */
export function createBreathGuideSound(
  audio: BreathGuideAudio,
  onPlaybackError: (error: unknown) => void = error =>
    console.warn('[breathe] guide playback rejected:', error)
): BreathGuideSound {
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = BREATH_GUIDE_VOLUME;

  return {
    start: () => {
      audio.currentTime = 0;
      try {
        const playback = audio.play();
        if (playback && typeof playback.catch === 'function') {
          playback.catch(onPlaybackError);
        }
      } catch (error) {
        onPlaybackError(error);
      }
    },
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
  };
}
