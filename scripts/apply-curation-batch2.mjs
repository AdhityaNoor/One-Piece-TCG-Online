import fs from 'fs';
import path from 'path';

const dir = 'src/cards/effectTemplates/assignments';

const BATCH2 = {
  OP09: {
    'OP09-005': `// PARTIAL: "5000+ base power" gate → opponentCharacterCount≥2 proxy. [Blocker] is printed.
  { cardNumber: 'OP09-005', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentCharacterCount', atLeast: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } }`,
    'OP09-017': `// PARTIAL: Leader 7000+ power gate dropped.
  { cardNumber: 'OP09-017', templateId: 'ability', params: { timing: 'onEnterPlay', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderType', type: 'Kid Pirates' }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent' }] } }`,
    'OP09-058': `// PARTIAL: [Main] opponent-chooses return deferred; mapped [Trigger] only.
  { cardNumber: 'OP09-058', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }`,
    'OP09-061': `// PARTIAL: DON-return trigger + add/rest DON deferred; mapped static +1 cost aura.
  { cardNumber: 'OP09-061', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraControllerCharacters', amount: 1, duration: 'permanent' }] } }`,
    'OP09-074': `// PARTIAL: onDonReturned trigger deferred; mapped endOfTurn setActive DON as weak stand-in.
  { cardNumber: 'OP09-074', templateId: 'ability', params: { timing: 'endOfTurn', oncePerTurn: true, condition: { turn: 'your' }, functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } }`,
    'OP09-084': `{ cardNumber: 'OP09-084', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose keyword', options: [{ label: 'doubleAttack', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'untilStartOfNextTurn' }] }, { label: 'banish', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'untilStartOfNextTurn' }] }, { label: 'blocker', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'untilStartOfNextTurn' }] }] }] } }`,
  },
  OP16: {
    'OP16-001': `// PARTIAL: 8000-power reveal cost → selfHandMatching gate.
  { cardNumber: 'OP16-001', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } }`,
    'OP16-005': `// PARTIAL: 8000-power reveal → selfHandMatching gate.
  { cardNumber: 'OP16-005', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } }`,
    'OP16-007': `{ cardNumber: 'OP16-007', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } }`,
    'OP16-008': `// PARTIAL: trash 10000 base Character cost deferred; mapped KO on gate only.
  { cardNumber: 'OP16-008', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } }`,
    'OP16-009': `{ cardNumber: 'OP16-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } }`,
    'OP16-010': `{ cardNumber: 'OP16-010', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }`,
    'OP16-011': `{ cardNumber: 'OP16-011', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'draw', amount: 1 }] } }`,
    'OP16-012': `{ cardNumber: 'OP16-012', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'giveDon', count: 1 }] } }`,
    'OP16-015': `// PARTIAL: base-power swap deferred; mapped −1000 on gate.
  { cardNumber: 'OP16-015', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } }`,
    'OP16-017': `{ cardNumber: 'OP16-017', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfHand', atMost: 3 }] } }] } }`,
    'OP16-020': `{ cardNumber: 'OP16-020', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 5 } }] } }`,
    'OP16-045': `{ cardNumber: 'OP16-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } }`,
    'OP16-047': `{ cardNumber: 'OP16-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifGate: [{ kind: 'opponentHand', atLeast: 5 }] }] } }`,
    'OP16-050': `{ cardNumber: 'OP16-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } }`,
    'OP16-060': `{ cardNumber: 'OP16-060', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashFromHand', count: 1 }] } }`,
    'OP16-065': `{ cardNumber: 'OP16-065', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 4 } }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 4 } }] } }`,
    'OP16-079': `{ cardNumber: 'OP16-079', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } }`,
    'OP16-084': `// PARTIAL: trash-self play cost deferred; mapped onKO draw.
  { cardNumber: 'OP16-084', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 2 }] } }`,
    'OP16-087': `// PARTIAL: cost-20 trash-self play deferred; mapped playFromHand maxCost 5.
  { cardNumber: 'OP16-087', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5 } }] } }`,
  },
  PRB: {
    'PRB02-010': `// PARTIAL: opponent 6+ DON gate dropped.
  { cardNumber: 'PRB02-010', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Big Mom Pirates', minPower: 6000, maxPower: 8000 }, ifPrevious: 'previousSelectedAny' }] } }`,
    'PRB02-014': `// PARTIAL: static −3 cost in hand deferred; [Blocker] is printed.
  { cardNumber: 'PRB02-014', templateId: 'ability', params: { timing: 'onEnterPlay', gate: [{ kind: 'selfTrashCount', atLeast: 15 }], functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: -3, duration: 'permanent' }] } }`,
    'PRB02-018': `// PARTIAL: face-up Life gate + play from trash deferred; mapped hand play only.
  { cardNumber: 'PRB02-018', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 2, anyOf: [{ name: 'Sabo' }, { name: 'Portgas.D.Ace' }, { name: 'Monkey.D.Luffy' }] } }] } }`,
  },
  P: {
    'P-074': `// PARTIAL: "return this Character" not instance-locked; mapped optional char→hand then reorder.
  { cardNumber: 'P-074', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }, { fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom', ifPrevious: 'previousMovedAny' }] } }`,
    'P-081': `// PARTIAL: return-self + leader gate + play Cross Guild cost 5 deferred; mapped playFromHand only.
  { cardNumber: 'P-081', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Cross Guild', atLeast: 3 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild', maxCost: 5 } }] } }`,
  },
  OP13: {
    'OP13-002': `// PARTIAL: onOpponentsAttack −2000 only; damage/KO draw trigger deferred.
  { cardNumber: 'OP13-002', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } }`,
    'OP13-007': `{ cardNumber: 'OP13-007', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn', ifGate: [{ kind: 'selfGivenDonCount', atLeast: 2 }] }] } }`,
    'OP13-031': `{ cardNumber: 'OP13-031', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } }`,
    'OP13-053': `// PARTIAL: trash ally for [Banish] deferred; mapped onPlay draw.
  { cardNumber: 'OP13-053', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } }`,
    'OP13-079': `{ cardNumber: 'OP13-079', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Roger Pirates' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }`,
    'OP13-080': `{ cardNumber: 'OP13-080', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Roger Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Roger Pirates', maxCost: 3 }, rested: true }] } }`,
    'OP13-081': `{ cardNumber: 'OP13-081', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'draw', amount: 1, ifGate: [{ kind: 'selfTrashCount', atLeast: 10 }] }] } }`,
    'OP13-082': `{ cardNumber: 'OP13-082', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }`,
    'OP13-084': `{ cardNumber: 'OP13-084', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } }`,
    'OP13-099': `{ cardNumber: 'OP13-099', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } }`,
  },
  OP14: {
    'OP14-068': `{ cardNumber: 'OP14-068', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } }`,
    'OP14-069': `{ cardNumber: 'OP14-069', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 4 } }] } }`,
    'OP14-077': `{ cardNumber: 'OP14-077', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }`,
    'OP14-078': `{ cardNumber: 'OP14-078', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } }`,
    'OP14-080': `{ cardNumber: 'OP14-080', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } }`,
    'OP14-091': `// PARTIAL: play from hand OR trash deferred; mapped hand only.
  { cardNumber: 'OP14-091', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 3 } }] } }`,
    'OP14-094': `{ cardNumber: 'OP14-094', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } }`,
    'OP14-103': `// PARTIAL: combined-Life reorder deferred; mapped draw on lifeTrigger.
  { cardNumber: 'OP14-103', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } }`,
    'OP14-105': `{ cardNumber: 'OP14-105', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } }`,
  },
  OP11: {
    'OP11-006': `// PARTIAL: <Special> attribute filter dropped.
  { cardNumber: 'OP11-006', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -5000, duration: 'duringThisTurn', optional: true }] } }`,
    'OP11-050': `{ cardNumber: 'OP11-050', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfControlsNamed', name: 'Kelly Funk' }] } }] } }`,
    'OP11-077': `{ cardNumber: 'OP11-077', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } }`,
    'OP11-095': `{ cardNumber: 'OP11-095', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } }`,
  },
  OP12: {
    'OP12-019': `{ cardNumber: 'OP12-019', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Silvers Rayleigh' }], functions: [{ fn: 'giveDon', count: 1, rested: false }] } }`,
    'OP12-036': `{ cardNumber: 'OP12-036', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } }`,
    'OP12-072': `// PARTIAL: onDonReturned trigger deferred; mapped onRested addDon.
  { cardNumber: 'OP12-072', templateId: 'ability', params: { timing: 'onRested', oncePerTurn: true, condition: { turn: 'your' }, functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } }`,
  },
};

function insertAssignment(txt, snippet) {
  const block = `\n  ${snippet},\n`;
  if (txt.includes('// --- codegen batch ---')) {
    return txt.replace('  // --- codegen batch ---', `${block}\n  // --- codegen batch ---`);
  }
  const next = txt.replace(/\r?\n\];\r?\n?$/, `${block}\r\n];\r\n`);
  return next === txt ? null : next;
}

let totalAdded = 0;
let totalFailed = 0;
for (const [setName, assignments] of Object.entries(BATCH2)) {
  const fp = path.join(dir, `${setName}.ts`);
  let txt = fs.readFileSync(fp, 'utf8');
  let added = 0;
  for (const [cardNumber, snippet] of Object.entries(assignments)) {
    if (txt.includes(`cardNumber: '${cardNumber}'`)) continue;
    const inserted = insertAssignment(txt, snippet);
    if (!inserted) {
      console.error(`${setName} ${cardNumber}: INSERT FAILED`);
      totalFailed++;
      continue;
    }
    txt = inserted;
    added++;
  }
  fs.writeFileSync(fp, txt);
  totalAdded += added;
  if (added) console.log(`${setName}: +${added}`);
}
console.log(`Batch2 total: +${totalAdded}, failed: ${totalFailed}`);
