// @vitest-environment jsdom
import { act, type ReactElement } from 'react';
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

/**
 * The restriction labels ("Can't attack" / "Can't block" / "Nullified"). The projection's own
 * suite (board/projection/__tests__/cardStatus.test.ts) proves the engine actually produces these
 * statuses; here the question is only whether the tile puts them on the card, in both the desktop
 * and the compact/mobile badge layouts, and gets out of the way of the battle-power overlay.
 */
function buildAttackLockedCardView() {
  const source = makeCharacterDef({ cardDefinitionId: 'TEST-ATTACK-LOCK-SOURCE', cardNumber: 'TEST-ATTACK-LOCK-SOURCE', name: 'Attack Locker' });
  const affected = makeCharacterDef({ cardDefinitionId: 'TEST-ATTACK-LOCKED', cardNumber: 'TEST-ATTACK-LOCKED', name: 'Locked Character' });

  let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
  let sourceId: string;
  let affectedId: string;
  ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source));
  ({ rig, instanceId: affectedId } = putCharacterInPlay(rig, 'p2', affected));

  const registry = buildRegistryFromAssignments([
    {
      cardNumber: source.cardDefinitionId,
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }],
      },
    },
  ]);

  const activated = executeAction(
    rig.state,
    { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceId, effectId: 'activateMain', donInstanceIds: [] },
    rig.defs,
    registry,
  );
  const resolved = executeAction(
    activated.state,
    { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: activated.state.pendingChoices[0].id, response: [affectedId] },
    rig.defs,
    registry,
  );

  return buildCardView(rig.defs, resolved.state, {}, affectedId);
}

describe('BoardCardTile status labels', () => {
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

  const render = (element: ReactElement) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container!);
      root.render(element);
    });
    return container!;
  };

  it("shows a Can't attack label after a real effect locks the Character out of attacking", () => {
    const host = render(<BoardCardTile card={buildAttackLockedCardView()} />);
    const label = host.querySelector('[data-card-status="cannotAttack"]');

    expect(label).not.toBeNull();
    expect(label!.textContent).toBe("Can't attack");
    // The tooltip has to answer "who did this to me, and until when" — a bare label does not.
    expect(label!.getAttribute('title')).toContain('Attack Locker');
  });

  it('renders every status in the compact (mobile) badge layout too', () => {
    const card = {
      ...buildAttackLockedCardView(),
      statuses: [
        { key: 'cannotAttack' as const, label: "Can't attack", detail: 'Cannot declare an attack (during this turn).' },
        { key: 'cannotBlock' as const, label: "Can't block", detail: 'Cannot activate [Blocker] (during this turn).' },
        { key: 'nullified' as const, label: 'Nullified', detail: 'Effects are negated (during this turn).' },
      ],
    };

    const host = render(<BoardCardTile card={card} compactBadges />);

    expect(host.querySelectorAll('[data-card-status]')).toHaveLength(3);
    expect(host.querySelector('[data-card-status="nullified"]')!.textContent).toBe('Nullified');
  });

  it('stands down while the battle-power overlay owns the centre of the tile', () => {
    const host = render(<BoardCardTile card={buildAttackLockedCardView()} showBattlePower />);

    expect(host.querySelector('[data-card-status]')).toBeNull();
  });
});
