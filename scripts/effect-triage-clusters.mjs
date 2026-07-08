import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IN_CSV = resolve(ROOT, 'effect-triage.csv');
const OUT_MD = resolve(ROOT, 'effect-triage-clusters.md');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function rows() {
  const text = readFileSync(IN_CSV, 'utf8').trim();
  const [, ...lines] = text.split(/\r?\n/);
  return lines.filter(Boolean).map((line) => {
    const [set, cardNumber, name, category, bucket, capabilities, unmappedOps, reasons, effectText] = parseCsvLine(line);
    return {
      set,
      cardNumber,
      name,
      category,
      bucket,
      capabilities: capabilities ? capabilities.split('+').filter(Boolean) : [],
      unmappedOps: unmappedOps ? unmappedOps.split('+').filter(Boolean) : [],
      reasons: reasons ? reasons.split('+').filter(Boolean) : [],
      effectText,
    };
  });
}

const CLUSTERS = [
  {
    id: 'activate-main-trigger',
    label: 'Trigger activates this card/main effect',
    risk: 'medium',
    match: /\[Trigger\].*Activate this card's \[(Main|Counter)\] effect|activate this card's \[(Main|Counter)\] effect/i,
    note: 'Can reuse existing ability ops, but needs a clean trigger-to-main lowering path.',
  },
  {
    id: 'top-or-bottom-deck-remainder',
    label: 'Look/search top deck, then place rest/top cards top or bottom',
    risk: 'medium',
    match: /top or bottom of (your )?deck|place (them|the rest|it) at the top or bottom/i,
    note: 'Existing search supports bottom/trash and all-looked top-or-bottom; mixed pick-plus-top/bottom needs resolver expansion.',
  },
  {
    id: 'look-reorder-life',
    label: 'Look at all Life cards and reorder/restore',
    risk: 'medium',
    match: /Look at all (of )?(your|your opponent's) Life cards|place them back in (their|your) Life area in any order/i,
    note: 'Needs hidden-zone reorder choices, but isolated from combat math.',
  },
  {
    id: 'cannot-add-life-to-hand',
    label: 'Cannot add Life cards to hand by effects',
    risk: 'medium',
    match: /cannot add Life cards to (your|their) hand using your own effects/i,
    note: 'A prevention modifier over Life-to-hand effects; useful for several blue/red clauses.',
  },
  {
    id: 'delayed-set-active-don',
    label: 'Set DON/cards active at end/start of turn',
    risk: 'medium',
    match: /set up to \d+ of your DON!! cards as active at the end|rests 1 of their active DON!! cards at the start/i,
    note: 'Needs delayed effect queue, not just immediate setActive.',
  },
  {
    id: 'play-stage-or-event',
    label: 'Play Stage/Event or activate Event from hand/trash',
    risk: 'medium',
    match: /play up to 1 .*Stage|play 1 \[.*\] from your trash|activate up to 1 .*Event|activate the \[Main\] effect of .*Event/i,
    note: 'Current playFromHand/playFromTrash are Character-oriented; widening may unlock several rows.',
  },
  {
    id: 'opponent-hand-reveal',
    label: 'Opponent hand reveal / choose revealed card',
    risk: 'low',
    match: /opponent.*reveals? (that card|those cards|their hand)|Choose \d+ cards? from your opponent's hand/i,
    note: 'Mostly pending-choice plus visibility/logging; likely small engine surface.',
  },
  {
    id: 'bottom-deck-character',
    label: 'Place Character/card at bottom of owner deck',
    risk: 'low',
    match: /place .*Character.* at the bottom of the owner's deck|place .* at the bottom of the owner's deck|return .* to (?:the )?deck and shuffle/i,
    note: 'Some support exists via moveCards; gaps are usually cost/source variants.',
  },
  {
    id: 'draw-until-hand-size',
    label: 'Draw until / draw equal to / draw per count',
    risk: 'medium',
    match: /draw cards so that you have|draw cards equal to|draw cards? for every|for every .* gains \+\d+ power/i,
    note: 'Dynamic count binding helps several draw/power rows.',
  },
  {
    id: 'multi-timing',
    label: 'Same ability on multiple timings',
    risk: 'low',
    match: /\[On Play\]\/\[When Attacking\]|\[Main\]\/\[Counter\]|\[When Attacking\]\/\[On Block\]/i,
    note: 'Often expressible by duplicate templates once the inner function exists.',
  },
  {
    id: 'rested-life-face',
    label: 'Turn Life face-up/down',
    risk: 'low',
    match: /turn .*Life cards? face-(up|down)|face-up Life|face-down/i,
    note: 'Some top-Life support exists; all-Life or replacement variants are still missing.',
  },
  {
    id: 'unlimited-deck-copies',
    label: 'Any number of this card in deck',
    risk: 'low',
    match: /any number of this card in your deck/i,
    note: 'Deck construction rule metadata, probably not runtime effect logic.',
  },
];

function score(cluster, cards) {
  const bucketWeight = cards.reduce((n, c) => n + (c.bucket === 'needsPrimitive' ? 2 : 1), 0);
  const riskWeight = cluster.risk === 'low' ? 1.25 : cluster.risk === 'medium' ? 1 : 0.6;
  return bucketWeight * riskWeight;
}

const allRows = rows();
const clusters = CLUSTERS.map((cluster) => {
  const cards = allRows.filter((row) => cluster.match.test(row.effectText));
  return { cluster, cards, score: score(cluster, cards) };
}).filter((entry) => entry.cards.length > 0).sort((a, b) => b.score - a.score);

const unmatched = allRows.filter((row) => !CLUSTERS.some((cluster) => cluster.match.test(row.effectText)));

const md = [];
md.push('# Effect Triage Clusters', '');
md.push('_Generated by `node scripts/effect-triage-clusters.mjs` from `effect-triage.csv`._', '');
md.push('| Rank | Cluster | Risk | Cards | needsPrimitive | defer | Score |', '| ---: | --- | --- | ---: | ---: | ---: | ---: |');
clusters.forEach((entry, index) => {
  const needs = entry.cards.filter((c) => c.bucket === 'needsPrimitive').length;
  const defer = entry.cards.filter((c) => c.bucket === 'defer').length;
  md.push(`| ${index + 1} | \`${entry.cluster.id}\` ${entry.cluster.label} | ${entry.cluster.risk} | ${entry.cards.length} | ${needs} | ${defer} | ${entry.score.toFixed(1)} |`);
});
md.push('', '## Cluster Details', '');
for (const entry of clusters) {
  md.push(`### ${entry.cluster.id}`, '');
  md.push(`Risk: **${entry.cluster.risk}**. ${entry.cluster.note}`, '');
  for (const card of entry.cards.slice(0, 12)) {
    const caps = card.capabilities.length ? card.capabilities.join('+') : '-';
    const reasons = card.reasons.length ? card.reasons.join('+') : '-';
    md.push(`- \`${card.cardNumber}\` ${card.name} (${card.bucket}; caps ${caps}; reasons ${reasons})`);
  }
  if (entry.cards.length > 12) md.push(`- ...and ${entry.cards.length - 12} more`);
  md.push('');
}
md.push('## Unmatched', '');
md.push(`Unmatched cards: **${unmatched.length}**`, '');
for (const card of unmatched.slice(0, 40)) md.push(`- \`${card.cardNumber}\` ${card.name} (${card.bucket})`);
if (unmatched.length > 40) md.push(`- ...and ${unmatched.length - 40} more`);
md.push('');

writeFileSync(OUT_MD, md.join('\n'), 'utf8');
console.log(`[triage:clusters] wrote ${OUT_MD}`);
for (const entry of clusters.slice(0, 8)) {
  const needs = entry.cards.filter((c) => c.bucket === 'needsPrimitive').length;
  const defer = entry.cards.filter((c) => c.bucket === 'defer').length;
  console.log(`${entry.cluster.id.padEnd(32)} cards=${String(entry.cards.length).padStart(2)} needs=${String(needs).padStart(2)} defer=${String(defer).padStart(2)} score=${entry.score.toFixed(1)}`);
}
