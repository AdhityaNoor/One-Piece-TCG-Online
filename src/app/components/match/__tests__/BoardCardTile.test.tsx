// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { executeAction } from '../../../../engine/actions';
import { buildCardView } from '../../../../board/projection';
import { buildBaseRig, makeCharacterDef, nextTestId, putCharacterInPlay } from '../../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../../../../cards/effectTemplates/assembler';
import { BoardCardTile } from '../BoardCardTile';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function buildCostModifiedCardView() {
  const source = makeCharacterDef({
    cardDefinitionId: 'TEST-COST-MODIFIER',
    cardNumber: 'TEST-COST-MODIFIER',
    name: 'Cost Modifier',
    category: 'character',
    baseCost: 1,
    basePower: 3000,
  });
  const affected = makeCharacterDef({
    cardDefinitionId: 'TEST-AFFECTED-CHARACTER',
    cardNumber: 'TEST-AFFECTED-CHARACTER',
    name: 'Cost Changed Character',
    category: 'character',
    baseCost: 5,
    basePower: 5000,
  });
  let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
  let sourceId: string;
  let affectedId: string;
  ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source));
  ({ rig, instanceId: affectedId } = putCharacterInPlay(rig, 'p2', affected));

  const registry = buildRegistryFromAssignments([
    {
      cardNumber: source.cardDefinitionId,
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, optional: true }] },
    },
  ]);
  const activate = executeAction(
    rig.state,
    { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceId, effectId: 'activateMain', donInstanceIds: [] },
    rig.defs,
    registry,
  );
  const choice = activate.state.pendingChoices[0];
  const resolved = executeAction(
    activate.state,
    { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [affectedId] },
    rig.defs,
    registry,
  );

  return buildCardView(rig.defs, resolved.state, {}, affectedId);
}

describe('BoardCardTile cost modifier badge', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it('shows the small cost delta label after a real cost modifier effect affects a match-screen card', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const card = buildCostModifiedCardView();

    act(() => {
      root = createRoot(container!);
      root.render(<BoardCardTile card={card} />);
    });

    expect(container.textContent).toContain('-4');
  });

  it('hides the cost delta label while battle power is being shown', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const card = buildCostModifiedCardView();

    act(() => {
      root = createRoot(container!);
      root.render(<BoardCardTile card={card} showBattlePower />);
    });

    expect(container.textContent).not.toContain('-4');
    expect(container.textContent).toContain('5,000');
  });
});
