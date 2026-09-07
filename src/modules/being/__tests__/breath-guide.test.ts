import { describe, expect, it } from 'vitest';
import {
  BREATH_GUIDE_VOLUME,
  createBreathGuideSound,
  getGuidedBreathCue,
} from '../breath-guide';

function audioHarness(play: () => Promise<void> | void = () => undefined) {
  const calls = { pause: 0, play: 0 };
  const audio = {
    loop: false,
    preload: '',
    volume: 1,
    currentTime: 12,
    play: () => {
      calls.play += 1;
      return play();
    },
    pause: () => {
      calls.pause += 1;
    },
  };
  return { audio, calls };
}

describe('screen-free breath guide', () => {
  it('configures and starts a quiet continuous media track', () => {
    const { audio, calls } = audioHarness();
    const sound = createBreathGuideSound(audio);

    expect(audio.loop).toBe(true);
    expect(audio.preload).toBe('auto');
    expect(audio.volume).toBe(BREATH_GUIDE_VOLUME);
    sound.start();
    expect(calls.play).toBe(1);
    expect(audio.currentTime).toBe(0);
  });

  it('stops and rewinds immediately', () => {
    const { audio, calls } = audioHarness();
    const sound = createBreathGuideSound(audio);
    sound.start();
    audio.currentTime = 7;
    sound.stop();
    expect(calls.pause).toBe(1);
    expect(audio.currentTime).toBe(0);
  });

  it('reports rejected playback without throwing', async () => {
    const rejected = new Error('blocked');
    const errors: unknown[] = [];
    const { audio } = audioHarness(() => Promise.reject(rejected));
    const sound = createBreathGuideSound(audio, error => errors.push(error));

    expect(() => sound.start()).not.toThrow();
    await Promise.resolve();
    expect(errors).toEqual([rejected]);
  });
});

describe('guided breath cue', () => {
  it('paces a complete 4-4-4-4 cycle', () => {
    expect(getGuidedBreathCue(0)).toEqual({ phase: 'Inhale', count: 1 });
    expect(getGuidedBreathCue(3_999)).toEqual({ phase: 'Inhale', count: 4 });
    expect(getGuidedBreathCue(4_000)).toEqual({ phase: 'Hold', count: 1 });
    expect(getGuidedBreathCue(8_000)).toEqual({ phase: 'Exhale', count: 1 });
    expect(getGuidedBreathCue(12_000)).toEqual({ phase: 'Hold', count: 1 });
    expect(getGuidedBreathCue(15_999)).toEqual({ phase: 'Hold', count: 4 });
    expect(getGuidedBreathCue(16_000)).toEqual({ phase: 'Inhale', count: 1 });
  });
});
