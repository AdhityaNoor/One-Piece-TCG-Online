/**
 * Grid picker over the predefined banner catalog (lib/banners.ts). Mirrors
 * AvatarPicker.tsx's structure exactly, swapping an <img> tile for a CSS
 * gradient swatch since no banner art exists yet — see banners.ts's module
 * doc. Used on ProfileScreen (server-synced banner cosmetic), not Settings.
 */
import { BANNER_OPTIONS } from '../lib/banners';

export interface BannerPickerProps {
  value: string | null;
  onChange: (bannerId: string) => void;
}

export function BannerPicker({ value, onChange }: BannerPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Banner">
      {BANNER_OPTIONS.map((banner) => {
        const active = banner.id === value;
        return (
          <button
            key={banner.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={banner.label}
            onClick={() => onChange(banner.id)}
            className={[
              'group relative flex h-12 items-end overflow-hidden border p-1.5 transition-colors',
              active ? 'border-gold' : 'border-white/10 hover:border-white/30',
            ].join(' ')}
            style={{ background: banner.gradient }}
          >
            <span className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
              {banner.label}
            </span>
            {active && (
              <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-black">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
