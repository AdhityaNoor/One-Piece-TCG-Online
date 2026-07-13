/**
 * Grid picker over the predefined avatar catalog (lib/avatars.ts). Used on
 * SettingsScreen. Every option is a transparent-background webp — tiles
 * intentionally carry no solid fill behind the art, only a hairline border
 * + selected-state ring, so the character silhouette reads directly against
 * the panel background instead of sitting in a filled box.
 */
import { AVATAR_OPTIONS } from '../lib/avatars';
import { resolveAssetUrl } from '../lib/assetUrl';

export interface AvatarPickerProps {
  value: string;
  onChange: (avatarId: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="Avatar">
      {AVATAR_OPTIONS.map((avatar) => {
        const active = avatar.id === value;
        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={avatar.label}
            onClick={() => onChange(avatar.id)}
            className={[
              'group relative flex aspect-square items-center justify-center border p-1.5 transition-colors',
              active ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/[0.03] hover:border-white/30',
            ].join(' ')}
          >
            <img
              src={resolveAssetUrl(avatar.path) ?? avatar.path}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
            />
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
