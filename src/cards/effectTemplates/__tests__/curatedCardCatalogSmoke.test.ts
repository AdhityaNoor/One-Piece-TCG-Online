import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CardDefinition } from '../../../engine/state/card';
import { classifyCoverage } from '../../devMetrics/coverage';
import type { CatalogCard } from '../../devMetrics/types';
import { buildCuratedEffectRegistry, CURATED_EFFECT_PROGRAMS } from '../curatedPrograms';
import { ALL_ASSIGNMENTS } from '../assignments';

interface CatalogRow {
  cardNumber?: string;
  setCode?: string;
  category?: string;
  en?: { name?: string | null; effectText?: string };
  definition?: CardDefinition;
}

function catalogSetsDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../public/cards/sets');
}

function loadCatalogDefinitions(): Map<string, CardDefinition> {
  return new Map(loadCatalogCards().flatMap((row) => (row.definition?.cardNumber ? [[row.definition.cardNumber, row.definition]] : [])));
}

function loadCatalogCards(): CatalogRow[] {
  const setsDir = catalogSetsDir();
  if (!existsSync(setsDir)) throw new Error(`Missing catalog sets directory: ${setsDir}`);

  const cards: CatalogRow[] = [];
  for (const file of readdirSync(setsDir).filter((name) => name.endsWith('.json'))) {
    const rows = JSON.parse(readFileSync(resolve(setsDir, file), 'utf8')) as CatalogRow[];
    if (!Array.isArray(rows)) continue;
    cards.push(...rows);
  }
  return cards;
}

function asCatalogCard(row: CatalogRow): CatalogCard {
  return {
    cardNumber: row.cardNumber ?? row.definition?.cardNumber ?? '',
    setCode: row.setCode ?? row.definition?.cardNumber?.split('-')[0] ?? '',
    category: row.category ?? row.definition?.category ?? '',
    en: {
      name: row.en?.name ?? row.definition?.name ?? null,
      effectText: row.en?.effectText ?? row.definition?.text ?? '',
    },
  };
}

const CATALOG_CARDS = loadCatalogCards().map(asCatalogCard).filter((card) => card.cardNumber);
const CATALOG_DEFS = loadCatalogDefinitions();
const CURATED_CARD_NUMBERS = [...new Set(ALL_ASSIGNMENTS.map((assignment) => assignment.cardNumber))].sort();
const NO_RUNTIME_CARD_NUMBERS = new Set(
  ALL_ASSIGNMENTS.flatMap((assignment) => {
    const bindings = 'templates' in assignment ? assignment.templates : [assignment];
    return bindings.some((binding) => binding.templateId === 'noRuntime') ? [assignment.cardNumber] : [];
  }),
);

describe('curated card catalog smoke coverage', () => {
  it.each(CURATED_CARD_NUMBERS)('%s has real catalog data and binds into the match registry', (cardNumber) => {
    const definition = CATALOG_DEFS.get(cardNumber);
    expect(definition, `${cardNumber} is assigned but missing from public/cards/sets`).toBeDefined();
    expect(CURATED_EFFECT_PROGRAMS[cardNumber], `${cardNumber} has no assembled curated program`).toBeDefined();

    const defs = {
      [definition!.cardDefinitionId]: definition!,
    };
    const registry = buildCuratedEffectRegistry(defs);

    expect(registry[definition!.cardDefinitionId], `${cardNumber} did not bind by cardDefinitionId`).toBe(CURATED_EFFECT_PROGRAMS[cardNumber]);
    expect(registry[definition!.cardNumber], `${cardNumber} did not bind by printed cardNumber`).toBe(CURATED_EFFECT_PROGRAMS[cardNumber]);
    expect(JSON.parse(JSON.stringify(registry[definition!.cardDefinitionId]))).toEqual(registry[definition!.cardDefinitionId]);
  });

  it.each(CATALOG_CARDS)('$cardNumber has an explicit coverage classification', (card) => {
    const row = classifyCoverage(card);
    expect(row.cardNumber).toBe(card.cardNumber);
    expect(['curated', 'needsTemplate', 'vanilla']).toContain(row.status);

    if (!card.en.effectText.trim()) {
      expect(row.status, `${card.cardNumber} has no effect text and should classify as vanilla`).toBe('vanilla');
    }

    if (row.status === 'curated' && CURATED_EFFECT_PROGRAMS[card.cardNumber] && !NO_RUNTIME_CARD_NUMBERS.has(card.cardNumber)) {
      expect(row.curatedAbilities, `${card.cardNumber} is curated but has no runtime abilities`).toBeGreaterThan(0);
      expect(row.runtimeTriggers, `${card.cardNumber} is curated but reports no runtime timings`).not.toBe('');
    }

    if (NO_RUNTIME_CARD_NUMBERS.has(card.cardNumber)) {
      expect(row.status, `${card.cardNumber} has a reviewed noRuntime assignment`).toBe(card.en.effectText.trim() ? 'curated' : 'vanilla');
      expect(row.curatedAbilities, `${card.cardNumber} noRuntime assignment should not emit runtime abilities`).toBe(0);
    }
  });
});
