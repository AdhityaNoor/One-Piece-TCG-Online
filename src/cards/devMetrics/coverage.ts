/**
 * Effect runtime-template coverage classification.
 * Checks each card against the curated EffectProgram registry.
 */
import { parseEffect } from '../effectParser';
import { isStaticEngineKeywordOnly } from '../effectParser/staticKeywordOnly';
import { CURATED_EFFECT_PROGRAMS } from '../effectTemplates';
import type { CatalogCard, CoverageRow } from './types';

function effectActionCount(ability: { actions: { op: string }[] }): number {
  return ability.actions.filter((a) => a.op !== 'grantKeyword').length;
}

/** Classify one catalog card into curated / needsTemplate / vanilla. */
export function classifyCoverage(card: CatalogCard): CoverageRow {
  const text = card.en?.effectText ?? '';
  const base = {
    setCode: card.setCode,
    cardNumber: card.cardNumber,
    name: card.en?.name ?? '',
    category: card.category,
    effectText: text,
  };

  if (!text.trim()) {
    return { ...base, status: 'vanilla', curatedAbilities: 0, effectAbilities: 0, runtimeTriggers: '', parserReview: false };
  }

  const parsed = parseEffect(card.cardNumber, text);
  const effectAbilities = parsed.abilities.filter((a) => effectActionCount(a) > 0).length;
  const program = CURATED_EFFECT_PROGRAMS[card.cardNumber];
  const curatedAbilities = program ? program.abilities.length : 0;
  const runtimeTriggers = program ? [...new Set(program.abilities.map((a) => a.timing))].sort().join('|') : '';

  let status: CoverageRow['status'];
  if (program) status = 'curated';
  else if (isStaticEngineKeywordOnly(text)) status = 'curated';
  else status = 'needsTemplate';

  return {
    ...base,
    status,
    curatedAbilities,
    effectAbilities,
    runtimeTriggers: runtimeTriggers || (isStaticEngineKeywordOnly(text) ? 'staticKeyword' : ''),
    parserReview: parsed.needsReview,
  };
}
