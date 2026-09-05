/**
 * The registry, the generated manifest and the files on disk are three copies
 * of the same list. This is what keeps them from drifting: a cue whose asset
 * was never generated is a silent bug at runtime, and an orphaned asset is
 * dead weight in the bundle.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SOUND_CUES, SOUND_CUE_IDS, cuesInGroup, isSoundCueId, type SoundCueId } from '../cues';

const PUBLIC_DIR = join(process.cwd(), 'public');

interface Manifest {
  cues: { id: string; file: string; durationMs: number; placeholder: boolean; brief: string }[];
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

  it('agrees with the manifest about which cues are still placeholders', () => {
    // The manifest is what a sound designer reads to find the remaining work,
    // so a cue repointed at a real recording without regenerating it sends
    // them after a file that is already done. `npm run audio:manifest` fixes.
    const flagged = new Map(manifest.cues.map((c) => [c.id, c.placeholder]));
    const wrong = SOUND_CUE_IDS.filter(
      (id) => flagged.get(id) !== !SOUND_CUES[id].src.startsWith('/audio/sfx/src/'),
    );
    expect(wrong).toEqual([]);
  });

  it('keeps every shared recording readable as separate gestures', () => {
    // Cues cut from the same file separate themselves by pitch. Two cues on
    // one file at the same bias and comparable gain are the same sound twice.
    const byFile = new Map<string, SoundCueId[]>();
    for (const id of SOUND_CUE_IDS) {
      const list = byFile.get(SOUND_CUES[id].src) ?? [];
      list.push(id);
      byFile.set(SOUND_CUES[id].src, list);
    }
    const collisions: string[] = [];
    for (const [file, ids] of byFile) {
      if (ids.length < 2) continue;
      const seen = new Map<number, SoundCueId>();
      for (const id of ids) {
        const def = SOUND_CUES[id];
        if (def.bus === 'music') continue; // beds are never pitched, by design
        const twin = seen.get(def.detuneBiasCents);
        if (twin && Math.abs(SOUND_CUES[twin].gain - def.gain) < 0.05) {
          collisions.push(`${file}: ${twin} and ${id}`);
        }
        seen.set(def.detuneBiasCents, id);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('keeps pitch bias inside an octave either way', () => {
    // Past ±1200 cents a sample stops sounding like itself and starts
    // sounding like a bug.
    for (const id of SOUND_CUE_IDS) {
      expect(Math.abs(SOUND_CUES[id].detuneBiasCents), `${id} bias`).toBeLessThanOrEqual(1200);
    }
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
