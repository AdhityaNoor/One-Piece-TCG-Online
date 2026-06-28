/**
 * Procedural part of game setup: 5-2-1-1 through 5-2-1-3, plus DON!! deck
 * placement (5-1-2). These steps are not player decisions — nothing here
 * waits on a GameAction — so this is a plain factory, not a validate/execute
 * pair like the two genuine decisions (going-first, mulligan) that follow it
 * in applyChooseGoingFirst.ts / applyMulliganDecision.ts.
 *
 * On success, the returned GameState is parked at
 * currentPhase: 'setup', setupState.stage: 'awaitingGoingFirstChoice',
 * with a PendingChoice already queued for the deciding player (5-2-1-4/5).
 */
import type { CardInstance } from '../state/card';
import type { GameState, SetupState } from '../state/game';
import type { PlayerState } from '../state/player';
import type { Zone } from '../state/zone';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';
import type { RngState } from '../rng/rng';
import { createSeededRng } from '../rng/seededRng';
import { mintDeckInstanceId, mintDonInstanceId, mintLeaderInstanceId } from './instanceIds';
import { resolveDonDeckSize, validatePlayerSetupInput, type PlayerSetupInput } from './setupInput';

export interface CreatePreGameStateOptions {
  /** 5-2-1-4: the player who gets to decide go-first-or-second. Resolved OUTSIDE the engine (RPS-or-similar, 5-2-1-4-1) and supplied here as plain data. */
  decidingPlayerId: string;
  rngState: RngState;
}

export type CreatePreGameStateResult = { ok: true; state: GameState } | { ok: false; reasons: string[] };

type DraftLogEntry = Omit<GameLogEntry, 'id' | 'sequence' | 'turnNumber' | 'phase' | 'causedByActionId'>;

function createLogger() {
  const log: GameLogEntry[] = [];
  let sequence = 0;
  return {
    log,
    push(entry: DraftLogEntry): void {
      sequence += 1;
      log.push({
        id: `setup-log-${sequence}`,
        sequence,
        turnNumber: 0,
        phase: 'setup',
        causedByActionId: null,
        ...entry,
      });
    },
  };
}

function emptyZone(id: Zone['id'], visibility: Zone['visibility'], maxSize?: number): Zone {
  // Omit `maxSize` entirely when absent rather than setting it to `undefined`
  // — see sampleGameState.ts fixture comment for why an explicit undefined
  // value would break JSON-serializability.
  return maxSize === undefined ? { id, visibility, cardIds: [] } : { id, visibility, cardIds: [], maxSize };
}

interface MintedPlayer {
  player: PlayerState;
  unshuffledDeckIds: string[];
}

function mintPlayer(input: PlayerSetupInput, cardsById: Record<string, CardInstance>, pushLog: (entry: DraftLogEntry) => void): MintedPlayer {
  const leaderInstance: CardInstance = {
    instanceId: mintLeaderInstanceId(input.playerId),
    cardDefinitionId: input.leader.cardDefinitionId,
    ownerId: input.playerId,
    controllerId: input.playerId,
    currentZone: 'leaderArea',
    orientation: 'active', // 4-4-1 (Leader area cards are active/rested); default-active-on-entry mirrors 3-7-5/3-8-4 — no Leader-specific citation found for this default, flagging alongside blueprint TODOs if this needs confirmation.
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all', // 3-6-2, open zone
    ...(input.leader.basePower !== undefined ? { currentPower: input.leader.basePower } : {}),
  };
  cardsById[leaderInstance.instanceId] = leaderInstance;
  pushLog({
    actorPlayerId: input.playerId,
    type: 'CARD_MOVED',
    message: `${input.playerId} placed their Leader face-up in the Leader area (5-2-1-3).`,
    data: { zone: 'leaderArea' },
    relatedCardInstanceIds: [leaderInstance.instanceId],
    visibility: 'public',
  });

  const deckIds: string[] = input.deck.map((def, index) => {
    const instance: CardInstance = {
      instanceId: mintDeckInstanceId(input.playerId, index),
      cardDefinitionId: def.cardDefinitionId,
      ownerId: input.playerId,
      controllerId: input.playerId,
      currentZone: 'deck',
      orientation: null, // 4-4-1: only Leader/Character/Stage/cost areas have orientation
      faceState: 'faceDown',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: [], // 3-2-2, secret
    };
    cardsById[instance.instanceId] = instance;
    return instance.instanceId;
  });

  const donDeckSize = resolveDonDeckSize(input);
  const donIds: string[] = Array.from({ length: donDeckSize }, (_, index) => {
    const instance: CardInstance = {
      instanceId: mintDonInstanceId(input.playerId, index),
      cardDefinitionId: input.donCard.cardDefinitionId,
      ownerId: input.playerId,
      controllerId: input.playerId,
      currentZone: 'donDeck',
      orientation: null,
      faceState: 'faceDown', // 3-3-2: face-down despite the zone being open
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: 'all', // 3-3-2, open zone
    };
    cardsById[instance.instanceId] = instance;
    return instance.instanceId;
  });
  // DON!! deck order is NOT shuffled here: the rules never give a DON!! deck
  // shuffle instruction, and its contents/order are fully open information
  // anyway (3-3-2). See blueprint Section 19 TODO #3 (still open).
  pushLog({
    actorPlayerId: input.playerId,
    type: 'CARD_MOVED',
    message: `${input.playerId} placed their DON!! deck (${donIds.length} cards).`,
    data: { zone: 'donDeck', count: donIds.length },
    relatedCardInstanceIds: donIds,
    visibility: 'public',
  });

  const player: PlayerState = {
    playerId: input.playerId,
    leaderInstanceId: leaderInstance.instanceId,
    leaderLifeValue: input.leader.life as number, // positive number guaranteed by validatePlayerSetupInput
    deck: emptyZone('deck', 'secret'), // cardIds filled in by the caller after shuffling (5-2-1-2)
    donDeck: { id: 'donDeck', visibility: 'open', cardIds: donIds },
    hand: emptyZone('hand', 'secret'),
    characterArea: emptyZone('characterArea', 'open', 5),
    stageArea: emptyZone('stageArea', 'open', 1),
    costArea: emptyZone('costArea', 'open'),
    trash: emptyZone('trash', 'open'),
    lifeArea: emptyZone('lifeArea', 'secret'),
    hasGoneFirst: false,
    hasMulliganed: false,
  };

  return { player, unshuffledDeckIds: deckIds };
}

export function createPreGameState(p1Input: PlayerSetupInput, p2Input: PlayerSetupInput, options: CreatePreGameStateOptions): CreatePreGameStateResult {
  const reasons = [...validatePlayerSetupInput(p1Input), ...validatePlayerSetupInput(p2Input)];
  if (p1Input.playerId === p2Input.playerId) {
    reasons.push('p1 and p2 must have distinct playerIds.');
  }
  if (options.decidingPlayerId !== p1Input.playerId && options.decidingPlayerId !== p2Input.playerId) {
    reasons.push(`decidingPlayerId '${options.decidingPlayerId}' must be one of the two players (5-2-1-4).`);
  }
  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const cardsById: Record<string, CardInstance> = {};
  const logger = createLogger();

  const minted1 = mintPlayer(p1Input, cardsById, logger.push);
  const minted2 = mintPlayer(p2Input, cardsById, logger.push);

  const seededRng = createSeededRng(options.rngState.seed);
  const shuffle1 = seededRng.shuffle(options.rngState, minted1.unshuffledDeckIds);
  const shuffle2 = seededRng.shuffle(shuffle1.nextState, minted2.unshuffledDeckIds);

  minted1.player.deck = { ...minted1.player.deck, cardIds: shuffle1.result };
  minted2.player.deck = { ...minted2.player.deck, cardIds: shuffle2.result };

  logger.push({
    actorPlayerId: p1Input.playerId,
    type: 'CARD_MOVED',
    message: `${p1Input.playerId} shuffled their deck and placed it face-down (5-2-1-2).`,
    data: { zone: 'deck', count: shuffle1.result.length },
    relatedCardInstanceIds: shuffle1.result,
    visibility: 'public', // count/placement is public (3-1-4); order itself stays hidden via Zone.visibility = 'secret'
  });
  logger.push({
    actorPlayerId: p2Input.playerId,
    type: 'CARD_MOVED',
    message: `${p2Input.playerId} shuffled their deck and placed it face-down (5-2-1-2).`,
    data: { zone: 'deck', count: shuffle2.result.length },
    relatedCardInstanceIds: shuffle2.result,
    visibility: 'public',
  });

  const setupState: SetupState = {
    decidingPlayerId: options.decidingPlayerId,
    stage: 'awaitingGoingFirstChoice',
  };

  const pendingChoices: PendingChoice[] = [
    {
      id: `${options.decidingPlayerId}__choose-going-first`,
      playerId: options.decidingPlayerId,
      kind: 'YES_NO',
      prompt: 'Will you go first or second?',
      constraints: { min: 1, max: 1, filterDescription: 'true = going first, false = going second (5-2-1-5).' },
      sourceInstanceId: null,
      sourceEffectId: null,
    },
  ];

  const state: GameState = {
    turnNumber: 0,
    activePlayerId: options.decidingPlayerId,
    currentPhase: 'setup',
    currentBattle: null,
    setupState,
    players: { [minted1.player.playerId]: minted1.player, [minted2.player.playerId]: minted2.player },
    cardsById,
    rng: shuffle2.nextState,
    continuousEffects: [],
    oncePerTurnUsage: {},
    pendingChoices,
    log: logger.log,
    gameOver: null,
    isFirstTurnOfGame: true,
  };

  return { ok: true, state };
}
