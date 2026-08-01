import type { GameAction } from '../../engine/actions';
import { validateAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';

const V2_PENDING_CHOICE_SOURCES = new Set([
  'v2:activationCost',
  'v2:selectMoveToHand',
  'v2:selectActionTarget',
  'v2:selectGiveDon',
  'v2:chooseOption',
  'v2:optionalResolution',
  'v2:reorderCards',
  'v2:selectPlayCard',
]);

function isLegalV2PendingChoiceAction(state: GameState, action: GameAction): boolean {
  if (action.type !== 'RESOLVE_PENDING_CHOICE') return false;
  const choice = state.pendingChoices.find((candidate) => candidate.id === action.choiceId);
  if (!choice || !V2_PENDING_CHOICE_SOURCES.has(choice.sourceEffectId ?? '')) return false;
  if (choice.playerId !== action.playerId) return false;

  const response = action.response;
  if (choice.kind === 'YES_NO') return typeof response === 'boolean';
  if (choice.kind === 'SELECT_OPTION') {
    const optionCount = choice.constraints.options?.length ?? 0;
    return typeof response === 'number' && Number.isInteger(response) && response >= 0 && response < optionCount;
  }
  if (choice.kind === 'SELECT_NUMBER') {
    const min = choice.constraints.numberMin ?? choice.constraints.min;
    const max = choice.constraints.numberMax ?? choice.constraints.max;
    return typeof response === 'number' && Number.isInteger(response) && response >= min && response <= max;
  }
  if (choice.kind !== 'SELECT_CARDS' || !Array.isArray(response)) return false;

  const candidates = choice.constraints.candidateInstanceIds ?? [];
  const candidateSet = new Set(candidates);
  const effectiveMin = Math.min(choice.constraints.min, candidates.length);
  const effectiveMax = Math.min(choice.constraints.max, candidates.length);
  if (response.length < effectiveMin || response.length > effectiveMax) return false;
  const seen = new Set<string>();
  for (const id of response) {
    if (typeof id !== 'string' || !candidateSet.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

export function isLegalAction(
  state: GameState,
  action: GameAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): boolean {
  if (isLegalV2PendingChoiceAction(state, action)) return true;
  return validateAction(state, action, defs, registry).legal;
}

export function uniqueActions(actions: GameAction[]): GameAction[] {
  const seen = new Set<string>();
  const out: GameAction[] = [];
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}
