/**
 * The registry, the generated manifest and the files on disk are three copies
 * of the same list. This is what keeps them from drifting: a cue whose asset
 * was never generated is a silent bug at runtime, and an orphaned asset is
 * dead weight in the bundle.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SOUND_CUES, SOUND_CUE_IDS, cuesInGroup, isSoundCueId } from '../cues';

const PUBLIC_DIR = join(process.cwd(), 'public');

interface Manifest {
  cues: { id: string; file: string; durationMs: number; brief: string }[];
}

const manifest = JSON.parse(
  readFileSync(join(PUBLIC_DIR, 'audio', 'sfx', 'manifest.json'), 'utf-8'),
) as Manifest;

describe('sound cue registry', () => {
  it('ships an asset on disk for every cue', () => {
    const missing = SOUND_CUE_IDS.filter((id) => !existsSync(join(PUBLIC_DIR, SOUND_CUES[id].src)));
    expect(missing).toEqual([]);
  });

  it('has no orphaned placeholder assets', () => {
    const registered = new Set(SOUND_CUE_IDS.map((id) => SOUND_CUES[id].src));
    const orphans = manifest.cues.filter((cue) => !registered.has(cue.file)).map((cue) => cue.id);
    expect(orphans).toEqual([]);
  });

  it('gives every generated cue a replacement brief', () => {
    const briefless = manifest.cues.filter((cue) => !cue.brief || cue.brief.length < 10);
    expect(briefless).toEqual([]);
  });

  it('keeps every cue within sane mix bounds', () => {
    for (const id of SOUND_CUE_IDS) {
      const def = SOUND_CUES[id];
      expect(def.gain, `${id} gain`).toBeGreaterThan(0);
      expect(def.gain, `${id} gain`).toBeLessThanOrEqual(1);
      expect(def.duckMusicTo, `${id} duck`).toBeGreaterThan(0);
      expect(def.duckMusicTo, `${id} duck`).toBeLessThanOrEqual(1);
      expect(def.maxVoices, `${id} maxVoices`).toBeGreaterThanOrEqual(1);
      expect(def.throttleMs, `${id} throttleMs`).toBeGreaterThanOrEqual(0);
      expect(def.priority, `${id} priority`).toBeGreaterThanOrEqual(0);
    }
  });

  it('only lets the music bus loop, and never ducks itself', () => {
    for (const id of SOUND_CUE_IDS) {
      const def = SOUND_CUES[id];
      if (def.loop) expect(def.bus, `${id} loops`).toBe('music');
      if (def.bus === 'music') expect(def.duckMusicTo, `${id}`).toBe(1);
    }
  });

  it('preloads the UI set at boot and the board set with the match', () => {
    expect(cuesInGroup('boot').every((id) => id.startsWith('ui.'))).toBe(true);
    expect(cuesInGroup('match')).toContain('battle.ko');
    expect(cuesInGroup('match')).toContain('card.draw');
    // Music is the heaviest payload and is never needed before a screen asks for it.
    expect(cuesInGroup('lazy').every((id) => SOUND_CUES[id].bus === 'music')).toBe(true);
  });

  it('narrows unknown strings', () => {
    expect(isSoundCueId('battle.ko')).toBe(true);
    expect(isSoundCueId('battle.nope')).toBe(false);
    expect(isSoundCueId(42)).toBe(false);
  });
});
