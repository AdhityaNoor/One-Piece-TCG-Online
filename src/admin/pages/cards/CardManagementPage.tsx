import { useState } from 'react';
import { CardGalleryTab } from './CardGalleryTab';
import { CurationStatusTab } from './CurationStatusTab';
import { CardLegalityTab } from './CardLegalityTab';

type Tab = 'gallery' | 'curation' | 'legality';

const TABS: { id: Tab; label: string }[] = [
  { id: 'gallery', label: 'Card Gallery' },
  { id: 'curation', label: 'Curation Status' },
  { id: 'legality', label: 'Card Legality' },
];

export function CardManagementPage() {
  const [tab, setTab] = useState<Tab>('gallery');

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-white">Card Management</h1>

      <div className="mb-5 flex gap-2 border-b border-[rgb(var(--op-gold-rgb)/0.18)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? 'border-[rgb(var(--op-gold-rgb)/0.7)] text-white' : 'border-transparent text-white/55 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'gallery' && <CardGalleryTab />}
      {tab === 'curation' && <CurationStatusTab />}
      {tab === 'legality' && <CardLegalityTab />}
    </div>
  );
}
