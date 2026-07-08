import fs from 'fs';
import path from 'path';

const dir = 'src/cards/effectTemplates/assignments';

/** cardNumber -> assignment snippet (without trailing comma on outer object - script adds comma) */
export const NEW_ASSIGNMENTS = {
  OP09: {
    'OP09-001': `{ cardNumber: 'OP09-001', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } }`,
    'OP09-008': `{ cardNumber: 'OP09-008', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { excludeSelf: true } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } }`,
    'OP09-009': `{ cardNumber: 'OP09-009', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } }`,
    'OP09-013': `{ cardNumber: 'OP09-013', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'untilStartOfNextTurn' }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } }] }`,
    'OP09-014': `// PARTIAL: "4000 power or less" blocker filter dropped.
  { cardNumber: 'OP09-014', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn' }] } }`,
    'OP09-033': `{ cardNumber: 'OP09-033', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'koImmunityControllerCharactersAll', scope: 'effect', duration: 'untilStartOfNextTurn', anyOfTypes: ['ODYSSEY', 'Straw Hat Crew'] }] } }`,
    'OP09-036': `{ cardNumber: 'OP09-036', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose one', options: [{ label: 'restDon', functions: [{ fn: 'restOpponentDon', maxTargets: 1 }] }, { label: 'restChar', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] }] }] } }`,
    'OP09-076': `{ cardNumber: 'OP09-076', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } }`,
    'OP09-092': `{ cardNumber: 'OP09-092', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'opponentHandMoreThanSelfBy', atLeast: 3 }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'trashFromHand', count: 1 }] } }`,
    'OP09-101': `{ cardNumber: 'OP09-101', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifPrevious: 'previousMovedAny' }] } }`,
    'OP09-115': `// PARTIAL: [Trigger] filter on Character with [Trigger] dropped; mapped Main KO maxCost 3 + lifeTrigger draw.
  { cardNumber: 'OP09-115', templates: [{ templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } }] }`,
    'OP09-117': `// PARTIAL: exclude [Dereshi!] name filter dropped.
  { cardNumber: 'OP09-117', templates: [{ templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { hasTrigger: true }, remainder: 'bottom' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } }] }`,
  },
  PRB: {
    'PRB02-007': `{ cardNumber: 'PRB02-007', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea', excludeSelfName: true }, remainder: 'bottom' }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } }] }`,
    'PRB02-012': `{ cardNumber: 'PRB02-012', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true }, remainder: 'bottom' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } }] }`,
    'PRB02-013': `{ cardNumber: 'PRB02-013', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxCost: 4 }, rested: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } }`,
    'PRB02-015': `// PARTIAL: static Blocker/+4 cost deferred; mapped onKO KO maxBaseCost 4 with Blackbeard gate.
  { cardNumber: 'PRB02-015', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, optional: true }] } }`,
    'PRB02-016': `{ cardNumber: 'PRB02-016', templates: [{ templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } }] }`,
    'PRB02-002': `// PARTIAL: KO-replacement −2000 deferred; mapped When Attacking −2000 opp Character.
  { cardNumber: 'PRB02-002', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } }`,
    'PRB02-001': `{ cardNumber: 'PRB02-001', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Navy' }] } }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, optional: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 6 }], ifPrevious: 'previousSelectedAny' }] } }] }`,
  },
};

function removeNoteBlock(txt, cardNumber) {
  const re = new RegExp(
    `\\n  \\/\\/ ${cardNumber.replace('-', '\\-')}[^\\n]*\\n(?:  \\/\\/[^\\n]*\\n)*  \\/\\/ NOTE: not yet implemented[^\\n]*\\n`,
    'g',
  );
  return txt.replace(re, '\n');
}

function applySet(setName, assignments) {
  const fp = path.join(dir, `${setName}.ts`);
  let txt = fs.readFileSync(fp, 'utf8');
  let added = 0;
  for (const [cardNumber, snippet] of Object.entries(assignments)) {
    if (txt.includes(`cardNumber: '${cardNumber}'`)) {
      txt = removeNoteBlock(txt, cardNumber);
      continue;
    }
    txt = removeNoteBlock(txt, cardNumber);
    const insertMarker = txt.includes('// --- codegen batch ---')
      ? '  // --- codegen batch ---'
      : '];';
    const block = `\n  // ${cardNumber} — curated expressible.\n  ${snippet},\n\n`;
    if (insertMarker === '];') {
      txt = txt.replace(/\n\];\n$/, `${block}];`);
    } else {
      txt = txt.replace(insertMarker, `${block}${insertMarker}`);
    }
    added++;
  }
  fs.writeFileSync(fp, txt);
  console.log(`${setName}: added ${added} assignments`);
}

for (const [set, cards] of Object.entries(NEW_ASSIGNMENTS)) {
  applySet(set, cards);
}
