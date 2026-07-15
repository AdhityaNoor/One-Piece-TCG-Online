export type EffectRuntimeMode = 'v1' | 'v2';

export const EFFECT_RUNTIME_MODE: EffectRuntimeMode =
  import.meta.env.VITE_EFFECT_SYSTEM === 'v2' ? 'v2' : 'v1';

export const EFFECT_RUNTIME_LABEL =
  EFFECT_RUNTIME_MODE === 'v2' ? 'V2 Effects' : 'V1 Effects';
