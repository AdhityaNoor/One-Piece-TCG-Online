import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { GameState } from '../../engine/state/game';
import { normalizeEngineZone } from './boardAnchors';
import type { BoardZoneId, CardMovementSpec, MovementAnchor } from './types';

const STAGGER_MS = 75;

function isDonDefinition(cardDefinitionId: string): boolean {
  return cardDefinitionId === 'DON-GENERIC';
}

function instanceMeta(
  instanceId: string,
  prevState: GameState,
  nextState: GameState,
  images: Record<string, string | null>,
): {
  playerId: string;
  cardDefinitionId: string;
  imageUrl: string | null;
  faceDown: boolean;
  isDon: boolean;
} | null {
  const inst = nextState.cardsById[instanceId] ?? prevState.cardsById[instanceId];
  if (!inst) return null;
  const isDon = isDonDefinition(inst.cardDefinitionId);
  return {
    playerId: inst.ownerId,
    cardDefinitionId: inst.cardDefinitionId,
    imageUrl: isDon ? null : images[inst.cardDefinitionId] ?? null,
    faceDown: inst.faceState === 'faceDown',
    isDon,
  };
}

function anchor(zone: BoardZoneId, instanceId?: string): MovementAnchor {
  return instanceId ? { zone, instanceId } : { zone };
}

function shouldAnimateMove(from: BoardZoneId | null, to: BoardZoneId | null): boolean {
  if (!from || !to) return false;
  if (from === to) return false;
  return true;
}

function pushSpec(
  specs: CardMovementSpec[],
  base: Omit<CardMovementSpec, 'id' | 'delayMs' | 'revealFaceOnLand'>,
  logId: string,
  index: number,
): void {
  specs.push({
    ...base,
    revealFaceOnLand: false,
    id: `${logId}-${index}`,
    delayMs: index * STAGGER_MS,
  });
}

/** Turn a dispatch log delta into UI animation intents (Layer 5 — not game state). */
export function parseMovementSpecs(
  prevState: GameState,
  logDelta: GameLogEntry[],
  images: Record<string, string | null>,
): CardMovementSpec[] {
  const specs: CardMovementSpec[] = [];

  for (const entry of logDelta) {
    const data = entry.data;

    switch (entry.type) {
      case 'CARD_DRAWN': {
        const instanceId = entry.relatedCardInstanceIds[0];
        if (!instanceId || !entry.actorPlayerId) break;
        const meta = instanceMeta(instanceId, prevState, prevState, images);
        pushSpec(
          specs,
          {
            playerId: entry.actorPlayerId,
            cardDefinitionId: meta?.cardDefinitionId ?? instanceId,
            imageUrl: meta?.imageUrl ?? null,
            faceDown: true,
            isDon: meta?.isDon ?? false,
            from: anchor('deck'),
            to: anchor('hand', instanceId),
            suppressInstanceId: instanceId,
            revealFaceOnLand: false,
          },
          entry.id,
          0,
        );
        break;
      }

      case 'CARD_PLAYED': {
        const newId = entry.relatedCardInstanceIds[0];
        const oldId = typeof data.oldInstanceId === 'string' ? data.oldInstanceId : undefined;
        const toZone = normalizeEngineZone(data.to);
        const playerId = entry.actorPlayerId;
        if (!newId || !toZone || !playerId) break;
        const meta = instanceMeta(oldId ?? newId, prevState, prevState, images);
        pushSpec(
          specs,
          {
            playerId,
            cardDefinitionId: meta?.cardDefinitionId ?? newId,
            imageUrl: meta?.imageUrl ?? null,
            faceDown: false,
            isDon: false,
            from: anchor('hand', oldId),
            to: anchor(toZone, newId),
            suppressInstanceId: newId,
          },
          entry.id,
          0,
        );
        break;
      }

      case 'CARD_MOVED':
      case 'CHARACTER_KO': {
        const fromZone =
          entry.type === 'CHARACTER_KO'
            ? normalizeEngineZone(prevState.cardsById[String(data.targetInstanceId)]?.currentZone)
            : normalizeEngineZone(data.from);
        const toZone =
          entry.type === 'CHARACTER_KO'
            ? 'trash'
            : normalizeEngineZone(data.to ?? data.zone);

        // DON!! phase bulk add: { zone: 'costArea', count: N }
        if (!fromZone && toZone === 'costArea' && entry.relatedCardInstanceIds.length > 0) {
          entry.relatedCardInstanceIds.forEach((instanceId, index) => {
            const meta = instanceMeta(instanceId, prevState, prevState, images);
            if (!meta) return;
            pushSpec(
              specs,
              {
                playerId: meta.playerId,
                cardDefinitionId: meta.cardDefinitionId,
                imageUrl: null,
                faceDown: false,
                isDon: true,
                from: anchor('donDeck'),
                to: anchor('costArea', instanceId),
                suppressInstanceId: instanceId,
              },
              entry.id,
              index,
            );
          });
          break;
        }

        const instanceIds =
          entry.relatedCardInstanceIds.length > 0
            ? entry.relatedCardInstanceIds
            : [
                typeof data.instanceId === 'string'
                  ? data.instanceId
                  : typeof data.targetInstanceId === 'string'
                    ? data.targetInstanceId
                    : null,
              ].filter((id): id is string => !!id);

        instanceIds.forEach((instanceId, index) => {
          const meta = instanceMeta(instanceId, prevState, prevState, images);
          const playerId = meta?.playerId ?? entry.actorPlayerId;
          if (!playerId || !shouldAnimateMove(fromZone, toZone)) return;
          const toUsesInstance =
            toZone === 'hand' ||
            toZone === 'characterArea' ||
            toZone === 'leaderArea' ||
            toZone === 'stageArea' ||
            toZone === 'costArea';
          pushSpec(
            specs,
            {
              playerId,
              cardDefinitionId: meta?.cardDefinitionId ?? instanceId,
              imageUrl: meta?.imageUrl ?? null,
              faceDown: meta?.faceDown ?? false,
              isDon: meta?.isDon ?? false,
              from: anchor(fromZone!, instanceId),
              to: anchor(toZone!, toUsesInstance ? instanceId : undefined),
              suppressInstanceId: instanceId,
            },
            entry.id,
            index,
          );
        });
        break;
      }

      case 'DAMAGE_DEALT': {
        const lifeId = typeof data.lifeCardInstanceId === 'string' ? data.lifeCardInstanceId : null;
        if (!lifeId || !entry.actorPlayerId) break;
        const meta = instanceMeta(lifeId, prevState, prevState, images);
        const banished = data.banish === true;
        pushSpec(
          specs,
          {
            playerId: entry.actorPlayerId,
            cardDefinitionId: meta?.cardDefinitionId ?? lifeId,
            imageUrl: meta?.imageUrl ?? null,
            faceDown: false,
            isDon: false,
            from: anchor('life'),
            to: anchor(banished ? 'trash' : 'hand', banished ? lifeId : lifeId),
            suppressInstanceId: lifeId,
          },
          entry.id,
          0,
        );
        break;
      }

      case 'EFFECT_ACTIVATED': {
        const fromZone = normalizeEngineZone(data.from);
        const toZone = normalizeEngineZone(data.to);
        const instanceId = entry.relatedCardInstanceIds[0];
        const playerId = entry.actorPlayerId;
        if (!instanceId || !playerId || !shouldAnimateMove(fromZone, toZone)) break;
        const meta = instanceMeta(instanceId, prevState, prevState, images);
        pushSpec(
          specs,
          {
            playerId,
            cardDefinitionId: meta?.cardDefinitionId ?? instanceId,
            imageUrl: meta?.imageUrl ?? null,
            faceDown: false,
            isDon: meta?.isDon ?? false,
            from: anchor(fromZone!, instanceId),
            to: anchor(toZone!, toZone === 'trash' ? instanceId : undefined),
            suppressInstanceId: instanceId,
          },
          entry.id,
          0,
        );
        break;
      }

      case 'DON_GIVEN': {
        const donId = typeof data.donInstanceId === 'string' ? data.donInstanceId : null;
        const targetId = typeof data.targetInstanceId === 'string' ? data.targetInstanceId : null;
        const playerId = entry.actorPlayerId;
        if (!donId || !targetId || !playerId) break;
        const targetZone =
          normalizeEngineZone(prevState.cardsById[targetId]?.currentZone) ?? 'characterArea';
        pushSpec(
          specs,
          {
            playerId,
            cardDefinitionId: 'DON-GENERIC',
            imageUrl: null,
            faceDown: false,
            isDon: true,
            from: anchor('costArea', donId),
            to: anchor(targetZone, targetId),
            suppressInstanceId: donId,
          },
          entry.id,
          0,
        );
        break;
      }

      case 'DON_RETURNED': {
        const donId = typeof data.donInstanceId === 'string' ? data.donInstanceId : null;
        const targetId = typeof data.targetInstanceId === 'string' ? data.targetInstanceId : null;
        const playerId = entry.actorPlayerId;
        if (!donId || !targetId || !playerId) break;
        const targetZone =
          normalizeEngineZone(prevState.cardsById[targetId]?.currentZone) ?? 'characterArea';
        pushSpec(
          specs,
          {
            playerId,
            cardDefinitionId: 'DON-GENERIC',
            imageUrl: null,
            faceDown: false,
            isDon: true,
            from: anchor(targetZone, targetId),
            to: anchor('costArea', donId),
            suppressInstanceId: donId,
          },
          entry.id,
          0,
        );
        break;
      }

      default:
        break;
    }
  }

  return specs;
}
