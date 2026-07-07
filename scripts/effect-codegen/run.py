#!/usr/bin/env python3
"""Compositional shape-cluster codegen. Parses prefixes (timing, oncePerTurn,
condition, gate(s), cost) then matches the remaining effect body (whole, split
on ' Then, ', or a 'Choose one:' bullet list) against single-clause matchers.
Emits only on FULL consumption, and only constructs that are expressible by the
engine's AbilityFunction / AbilityGate / AbilityCost unions.
  python3 scripts/effect-codegen/run.py [--write]"""
import csv, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV = os.path.join(ROOT, 'effect-coverage.csv')
ASSIGN = os.path.join(ROOT, 'src', 'cards', 'effectTemplates', 'assignments') + os.sep
STATIC_KW = re.compile(r'\[(Blocker|Rush|Double Attack|Banish)\]', re.I)
KWMAP = {'Rush':'rush','Blocker':'blocker','Double Attack':'doubleAttack','Banish':'banish'}
TIMING = {'On Play':'onPlay','When Attacking':'whenAttacking','On K.O.':'onKO','On Block':'onBlock',
          'Activate: Main':'activateMain','Main':'activateMain','Counter':'counter','Trigger':'lifeTrigger','End of Your Turn':'endOfTurn'}

def norm(t):
    t = re.sub(r'\([^)]*\)', '', t)
    # protect keyword GRANTS ("gains [Rush]") so the static-keyword strip below
    # doesn't eat them; they become "gains KW_<name>" for m_keyword to match.
    t = re.sub(r'gains? \[(Blocker|Rush|Double Attack|Banish)\]', lambda m: 'gains KW_' + KWMAP[m.group(1)], t)
    t = STATIC_KW.sub('', t)
    return re.sub(r'\s+', ' ', t).strip()
def set_file(cn):
    s = cn.split('-')[0]
    return 'EB' if s.startswith('EB') else 'PRB' if s.startswith('PRB') else s

# --------------------------------------------------------------------------- #
# Single-clause body matchers. Each returns a JS AbilityFunction object literal
# (a member of the SequencedAbilityFunction union) or None.
# --------------------------------------------------------------------------- #
def m_ko(b):
    m=re.fullmatch(r"K\.O\. up to 1 of your opponent's (rested )?Characters with a cost of (\d+) or less\.?",b)
    if m:
        f=("rested: true, " if m.group(1) else "")+f"maxCost: {m.group(2)}"
        return f"{{ fn: 'ko', target: {{ group: 'characters', player: 'opponent', filter: {{ {f} }} }}, optional: true }}"
    m=re.fullmatch(r"K\.O\. up to 1 of your opponent's (rested )?Characters with (\d+) power or less\.?",b)
    if m:
        f=("rested: true, " if m.group(1) else "")+f"maxPower: {m.group(2)}"
        return f"{{ fn: 'ko', target: {{ group: 'characters', player: 'opponent', filter: {{ {f} }} }}, optional: true }}"
    return None
def m_koall(b):
    m=re.fullmatch(r"K\.O\. all Characters with a cost of (\d+) or less\.?",b)
    if m: return f"{{ fn: 'koAllCharacters', filter: {{ maxCost: {m.group(1)} }} }}"
    m=re.fullmatch(r"K\.O\. all Characters with (\d+) power or less\.?",b)
    if m: return f"{{ fn: 'koAllCharacters', filter: {{ maxPower: {m.group(1)} }} }}"
    return None
def m_rest(b):
    m=re.fullmatch(r"Rest up to 1 of your opponent's Characters with a cost of (\d+) or less\.?",b)
    if m: return f"{{ fn: 'rest', target: {{ group: 'characters', player: 'opponent', filter: {{ maxCost: {m.group(1)} }} }}, optional: true }}"
    m=re.fullmatch(r"Rest up to 1 of your opponent's Characters with (\d+) power or less\.?",b)
    if m: return f"{{ fn: 'rest', target: {{ group: 'characters', player: 'opponent', filter: {{ maxPower: {m.group(1)} }} }}, optional: true }}"
    return None
def m_preventrefresh(b):
    # "Up to N of your opponent's rested Characters will not become active in your opponent's next Refresh Phase."
    m=re.fullmatch(r"Up to (?:a total of )?(\d+) of your opponent's rested Characters? will not become active in your opponent's next (?:Refresh Phase|turn)\.?",b)
    if m: return f"{{ fn: 'preventRefresh', target: {{ group: 'characters', player: 'opponent', filter: {{ rested: true }} }}, optional: true, maxTargets: {m.group(1)} }}"
    m=re.fullmatch(r"Up to (?:a total of )?(\d+) of your opponent's rested Leader and Character cards will not become active in your opponent's next (?:Refresh Phase|turn)\.?",b)
    if m: return f"{{ fn: 'preventRefresh', target: {{ group: 'leaderOrCharacters', player: 'opponent', filter: {{ rested: true }} }}, optional: true, maxTargets: {m.group(1)} }}"
    return None
def m_draw(b):
    m=re.fullmatch(r"[Dd]raw (\d+) cards?\.?",b)
    if m: return f"{{ fn: 'draw', amount: {m.group(1)} }}"
    m=re.fullmatch(r"[Dd]raw (\d+) cards? and trash (\d+) cards? from your hand\.?",b)
    if m: return f"{{ fn: 'drawAndTrash', drawCount: {m.group(1)}, trashCount: {m.group(2)} }}"
    return None
def m_minuspower(b):
    m=re.fullmatch(r"[Gg]ive up to 1 of your opponent's Characters [−-](\d+) power during this turn\.?",b)
    if m: return f"{{ fn: 'addPower', target: {{ group: 'characters', player: 'opponent' }}, amount: -{m.group(1)}, duration: 'duringThisTurn', optional: true }}"
    m=re.fullmatch(r"[Gg]ive up to 1 of your opponent's Leader or Character cards [−-](\d+) power during this turn\.?",b)
    if m: return f"{{ fn: 'addPower', target: {{ group: 'leaderOrCharacters', player: 'opponent' }}, amount: -{m.group(1)}, duration: 'duringThisTurn', optional: true }}"
    return None
def m_buff(b):
    m=re.fullmatch(r"[Uu]p to 1 of your Leader or Character cards gains \+(\d+) power during this (turn|battle)\.?",b)
    if m:
        dur='duringThisTurn' if m.group(2)=='turn' else 'duringThisBattle'
        return f"{{ fn: 'addPower', target: {{ group: 'leaderOrCharacters', player: 'controller' }}, amount: {m.group(1)}, duration: '{dur}', optional: true }}"
    m=re.fullmatch(r"[Uu]p to 1 of your Characters gains \+(\d+) power during this (turn|battle)\.?",b)
    if m:
        dur='duringThisTurn' if m.group(2)=='turn' else 'duringThisBattle'
        return f"{{ fn: 'addPower', target: {{ group: 'characters', player: 'controller' }}, amount: {m.group(1)}, duration: '{dur}', optional: true }}"
    return None
def m_allbuff(b):
    # "All of your {X} type Characters gain +N power during this turn." (one-shot only — needs a duration).
    m=re.fullmatch(r"All of your (?:\{([^}]+)\} type )?Characters gain \+(\d+) power during this turn\.?",b)
    if m:
        filt=f", filter: {{ typeIncludes: '{m.group(1)}' }}" if m.group(1) else ""
        return f"{{ fn: 'addPowerControllerCharactersAll', amount: {m.group(2)}, duration: 'duringThisTurn'{filt} }}"
    return None
def m_selfbuff(b):
    m=re.fullmatch(r"[Tt]his Character gains \+(\d+) power during this (turn|battle)\.?",b)
    if m:
        dur='duringThisTurn' if m.group(2)=='turn' else 'duringThisBattle'
        return f"{{ fn: 'addPowerSelf', amount: {m.group(1)}, duration: '{dur}' }}"
    return None
def m_koimmself(b):
    m=re.fullmatch(r"[Tt]his Character cannot be K\.O\.'d in battle during this turn\.?",b)
    if m: return "{ fn: 'koImmunitySelf', scope: 'battle', duration: 'duringThisTurn' }"
    m=re.fullmatch(r"[Tt]his Character cannot be K\.O\.'d (?:by effects )?during this turn\.?",b)
    if m: return "{ fn: 'koImmunitySelf', scope: 'any', duration: 'duringThisTurn' }"
    return None
def m_addcost(b):
    m=re.fullmatch(r"[Gg]ive up to 1 of your opponent's Characters [−-](\d+) cost during this turn\.?",b)
    if m: return f"{{ fn: 'addCost', target: {{ group: 'characters', player: 'opponent' }}, amount: -{m.group(1)}, duration: 'duringThisTurn', optional: true }}"
    return None
def m_bottomdeck(b):
    m=re.fullmatch(r"[Pp]lace up to 1 (of your opponent's )?Characters? with a cost of (\d+) or less at the bottom of the owner's deck\.?",b)
    if m:
        pl='opponent' if m.group(1) else 'any'
        return f"{{ fn: 'moveCards', from: {{ zone: 'characters', player: '{pl}', filter: {{ maxCost: {m.group(2)} }} }}, to: {{ zone: 'deck', player: 'owner', position: 'bottom' }}, optional: true }}"
    return None
def m_returnhand(b):
    # Bounce an opponent Character to hand (an expressible moveCards).
    m=re.fullmatch(r"[Rr]eturn up to 1 of your opponent's Characters? with a cost of (\d+) or less to the owner's hand\.?",b)
    if m: return f"{{ fn: 'moveCards', from: {{ zone: 'characters', player: 'opponent', filter: {{ maxCost: {m.group(1)} }} }}, to: {{ zone: 'hand', player: 'owner' }}, optional: true }}"
    m=re.fullmatch(r"[Rr]eturn up to 1 of your opponent's Characters? with (\d+) power or less to the owner's hand\.?",b)
    if m: return f"{{ fn: 'moveCards', from: {{ zone: 'characters', player: 'opponent', filter: {{ maxPower: {m.group(1)} }} }}, to: {{ zone: 'hand', player: 'owner' }}, optional: true }}"
    return None
def m_givedon(b):
    m=re.fullmatch(r"[Gg]ive up to (\d+) rested DON!! cards? to (?:your Leader or 1 of your Characters|1 of your Characters or your Leader)\.?",b)
    if m: return f"{{ fn: 'giveDon', count: {m.group(1)} }}"
    m=re.fullmatch(r"[Gg]ive up to (\d+) rested DON!! cards? to (?:your Leader|this Leader)\.?",b)
    if m: return f"{{ fn: 'giveDonControllerLeader', count: {m.group(1)} }}"
    return None
def m_setdon(b):
    m=re.fullmatch(r"[Ss]et up to (\d+) of your DON!! cards? as active\.?",b)
    if m: return f"{{ fn: 'setActiveControllerDon', maxTargets: {m.group(1)} }}"
    if re.fullmatch(r"[Ss]et this Character as active\.?",b): return "{ fn: 'setActiveSelf' }"
    return None
def m_restopdon(b):
    if re.fullmatch(r"[Rr]est up to 1 of your opponent's DON!! cards?\.?",b): return "{ fn: 'restOpponentDon', maxTargets: 1 }"
    return None
def m_adddon(b):
    if re.fullmatch(r"[Aa]dd up to 1 DON!! card from your DON!! deck and set it as active\.?",b): return "{ fn: 'addDonFromDeck', count: 1, rested: false }"
    if re.fullmatch(r"[Aa]dd up to 1 DON!! card from your DON!! deck and rest it\.?",b): return "{ fn: 'addDonFromDeck', count: 1, rested: true }"
    return None
def m_trashtop(b):
    m=re.fullmatch(r"[Tt]rash (\d+) cards? from the top of your deck\.?",b)
    if m: return f"{{ fn: 'trashTopDeck', count: {m.group(1)} }}"
    return None
def m_life_to_hand(b):
    if re.fullmatch(r"[Aa]dd 1 card from the top of your Life cards to your hand\.?",b): return "{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } }"
    return None
def m_searcher(b):
    m=re.fullmatch(r"[Ll]ook at (\d+) cards? from the top of your deck; reveal up to 1 card with a cost of (\d+) or more and add it to your hand\. Then, place the rest at the bottom of your deck in any order\.?",b)
    if m: return f"{{ fn: 'searchTopDeck', look: {m.group(1)}, pick: 1, reveal: true, destination: 'hand', filter: {{ minCost: {m.group(2)} }}, remainder: 'bottom' }}"
    m=re.fullmatch(r"[Ll]ook at (\d+) cards? from the top of your deck; reveal up to 1 \{([^}]+)\} type card and add it to your hand\. Then, place the rest at the bottom of your deck in any order\.?",b)
    if m: return f"{{ fn: 'searchTopDeck', look: {m.group(1)}, pick: 1, reveal: true, destination: 'hand', filter: {{ typeIncludes: '{m.group(2)}' }}, remainder: 'bottom' }}"
    return None
def m_playhand(b):
    m=re.fullmatch(r"[Pp]lay up to 1 \{([^}]+)\} type Character card with a cost of (\d+) or less from your hand\.?",b)
    if m: return f"{{ fn: 'playFromHand', filter: {{ category: 'character', typeIncludes: '{m.group(1)}', maxCost: {m.group(2)} }} }}"
    m=re.fullmatch(r"[Pp]lay up to 1 Character card with a cost of (\d+) or less from your hand\.?",b)
    if m: return f"{{ fn: 'playFromHand', filter: {{ category: 'character', maxCost: {m.group(1)} }} }}"
    return None
def m_playtrash(b):
    m=re.fullmatch(r"[Pp]lay up to 1 \{([^}]+)\} type Character card with a cost of (\d+) or less from your trash\.?",b)
    if m: return f"{{ fn: 'playFromTrash', filter: {{ category: 'character', typeIncludes: '{m.group(1)}', maxCost: {m.group(2)} }} }}"
    return None
def m_playself(b):
    # [Trigger] Play this card. — resolve the Event/Character itself for free.
    if re.fullmatch(r"[Pp]lay this card\.?",b): return "{ fn: 'triggerPlaySelf' }"
    return None
def m_keyword(b):
    # Keyword grants (norm() rewrote "gains [Rush]" -> "gains KW_rush"). No duration
    # word => permanent (while in play); "during this turn" => duringThisTurn.
    m=re.fullmatch(r"[Tt]his Character gains KW_(\w+)( during this turn)?\.?",b)
    if m: return f"{{ fn: 'addKeyword', target: {{ ref: 'self' }}, keyword: '{m.group(1)}', duration: '{'duringThisTurn' if m.group(2) else 'permanent'}' }}"
    m=re.fullmatch(r"[Uu]p to 1 of your Characters gains KW_(\w+)( during this turn)?\.?",b)
    if m: return f"{{ fn: 'addKeyword', target: {{ group: 'characters', player: 'controller' }}, keyword: '{m.group(1)}', duration: '{'duringThisTurn' if m.group(2) else 'permanent'}', optional: true }}"
    m=re.fullmatch(r"[Uu]p to 1 of your Leader gains KW_(\w+)( during this turn)?\.?",b)
    if m: return f"{{ fn: 'addKeyword', target: {{ group: 'leader', player: 'controller' }}, keyword: '{m.group(1)}', duration: '{'duringThisTurn' if m.group(2) else 'permanent'}', optional: true }}"
    return None
def m_scry(b):
    # Pure top-deck reorder — searchTopDeck destination 'deckTopOrBottom' (cf. ST17-003).
    m=re.fullmatch(r"Look at (\d+) cards? from the top of your deck and place them at the top or bottom of the deck in any order\.?",b)
    if m: return f"{{ fn: 'searchTopDeck', look: {m.group(1)}, pick: {m.group(1)}, reveal: false, destination: 'deckTopOrBottom' }}"
    return None

BODIES=[m_searcher,m_ko,m_koall,m_rest,m_preventrefresh,m_draw,m_minuspower,m_buff,m_allbuff,m_selfbuff,
        m_keyword,m_scry,m_koimmself,m_addcost,m_bottomdeck,m_returnhand,m_givedon,m_setdon,m_restopdon,m_adddon,
        m_trashtop,m_life_to_hand,m_playhand,m_playtrash,m_playself]

def match_one(b):
    b=b.strip()
    for fn in BODIES:
        r=fn(b)
        if r: return r
    return None

# chooseOne branches compile to NonSuspendingEffectOp only (factories.ts
# nonSuspendingBranchOps): a branch may NOT contain a fn whose ops choose
# targets / search / peek. Only these self-resolving fns are legal in a branch.
NON_SUSPENDING_FNS={'draw','addDonFromDeck','trashTopDeck','addPowerSelf','addPowerSelfScaling',
    'koImmunitySelf','koImmunityControllerCharactersAll','setActiveSelf','restSelf','triggerPlaySelf',
    'addPowerControllerCharactersAll','addPowerAuraControllerTypes','koAllCharacters','giveDonControllerLeader'}
def m_chooseone(b):
    # "Choose one:• opt1• opt2" — each option a single, NON-SUSPENDING clause.
    m=re.match(r"[Cc]hoose one:\s*(.+)",b,re.S)
    if not m: return None
    rest=m.group(1)
    if '•' not in rest: return None
    parts=[p.strip() for p in rest.split('•') if p.strip()]
    if len(parts)<2: return None
    opts=[]
    for p in parts:
        p=p if p.endswith('.') else p+'.'
        r=match_one(p)
        if not r: return None
        fm=re.match(r"\{ fn: '(\w+)'",r)
        if not fm or fm.group(1) not in NON_SUSPENDING_FNS: return None  # branch would suspend — not expressible yet
        opts.append(f"{{ label: '', functions: [{r}] }}")
    return f"{{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose one:', options: [{', '.join(opts)}] }}"

def match_body(b):
    b=b.strip()
    r=match_one(b)
    if r: return r
    r=m_chooseone(b)
    if r: return r
    if ' Then, ' in b:
        outs=[]
        for part in b.split(' Then, '):
            part=part if part.endswith('.') else part+'.'
            r=match_one(part)
            if not r: return None
            outs.append(r)
        return ', '.join(outs)
    return None

def take_timings(t):
    m=re.match(r'((?:\[[^\]]+\]\s*/?\s*)+)',t)
    if not m: return None,t
    return re.findall(r'\[([^\]]+)\]',m.group(1)), t[m.end():].strip()

# --------------------------------------------------------------------------- #
# Prefix extractors (return (js_literal, remaining_text) or (None, text)).
# --------------------------------------------------------------------------- #
def take_cost(rest):
    for pat,lit in (
        (r"You may rest this (?:Character|card|Stage):\s*", "{ kind: 'restThis' }"),
        (r"You may trash this (?:Character|card|Stage):\s*", "{ kind: 'trashThis' }"),
    ):
        cm=re.match(pat,rest)
        if cm: return lit, rest[cm.end():]
    cm=re.match(r"DON!! [−-](\d+):\s*",rest)
    if cm: return f"{{ kind: 'donMinus', count: {cm.group(1)} }}", rest[cm.end():]
    cm=re.match(r"([➀➁➂➃➄①②③④⑤])\s*:?\s*",rest)
    if cm:
        n={'➀':1,'➁':2,'➂':3,'➃':4,'➄':5,'①':1,'②':2,'③':3,'④':4,'⑤':5}[cm.group(1)]
        return f"{{ kind: 'restDon', count: {n} }}", re.sub(r'^:\s*','',rest[cm.end():]).strip()
    return None, rest

def take_gate(rest):
    # Leader identity / type / colour.
    gm=re.match(r"If your Leader has the \{([^}]+)\} type,\s*",rest)
    if gm: return f"{{ kind: 'leaderType', type: '{gm.group(1)}' }}", rest[gm.end():]
    gm=re.match(r'If your Leader\'s type includes "([^"]+)",\s*',rest)
    if gm: return f"{{ kind: 'leaderType', type: '{gm.group(1)}' }}", rest[gm.end():]
    gm=re.match(r"If your Leader is \[([^\]]+)\],\s*",rest)
    if gm: return f"{{ kind: 'leaderName', name: '{gm.group(1)}' }}", rest[gm.end():]
    gm=re.match(r"If your Leader is multicolou?red,\s*",rest)
    if gm: return "{ kind: 'leaderMulticolor' }", rest[gm.end():]
    # Named control.
    gm=re.match(r"If you have \[([^\]]+)\],\s*",rest)
    if gm: return f"{{ kind: 'selfControlsNamed', name: '{gm.group(1)}' }}", rest[gm.end():]
    gm=re.match(r"If you don't have \[([^\]]+)\],\s*",rest)
    if gm: return f"{{ kind: 'selfDoesNotControlNamed', name: '{gm.group(1)}' }}", rest[gm.end():]
    # Numeric board-count gates (value + more/less → atLeast/atMost). Anchored so
    # filtered variants ("...Characters with 5000 power or more,") do NOT match.
    NUM=[
      (r"If you have (\d+) or (more|less) rested Characters,\s*", 'selfRestedCharacterCount'),
      (r"If you have (\d+) or (more|less) Characters,\s*", 'selfCharacterCount'),
      (r"If your opponent has (\d+) or (more|less) Characters,\s*", 'opponentCharacterCount'),
      (r"If you have (\d+) or (more|less) DON!! cards? on your field,\s*", 'selfDonFieldCount'),
      (r"If you have (\d+) or (more|less) Life cards?,\s*", 'selfLife'),
      (r"If your opponent has (\d+) or (more|less) Life cards?,\s*", 'opponentLife'),
      (r"If you have (\d+) or (more|less) cards in your hand,\s*", 'selfHand'),
      (r"If your opponent has (\d+) or (more|less) cards in their hand,\s*", 'opponentHand'),
    ]
    for pat,kind in NUM:
        gm=re.match(pat,rest)
        if gm:
            bound='atLeast' if gm.group(2)=='more' else 'atMost'
            return f"{{ kind: '{kind}', {bound}: {gm.group(1)} }}", rest[gm.end():]
    return None, rest

def parse(cn,cat,raw):
    t=norm(raw); tags,rest=take_timings(t)
    if not tags: return None
    once='Once Per Turn' in tags; cond=None
    for tg in tags:
        dm=re.fullmatch(r'DON!! x(\d+)',tg)
        if dm: cond=f"donAttachedAtLeast: {dm.group(1)}"
        if tg=='Your Turn': cond=(cond+", " if cond else "")+"turn: 'your'"
        if tg=="Opponent's Turn": cond=(cond+", " if cond else "")+"turn: 'opponent'"
    timing_tags=[TIMING[tg] for tg in tags if tg in TIMING]
    if not timing_tags: return None
    # Extract cost and gate(s) in any order (text mixes "cost: If gate, body" and
    # "If gate, cost: body"). Loop until neither consumes anything.
    cost=None; gates=[]
    progressed=True
    while progressed:
        progressed=False
        if cost is None:
            c,rest2=take_cost(rest)
            if c: cost=c; rest=rest2; progressed=True
        g,rest2=take_gate(rest)
        if g: gates.append(g); rest=rest2; progressed=True
    body=match_body(rest)
    if not body: return None
    def build(timing):
        p=f"timing: '{timing}'"
        if cond: p+=f", condition: {{ {cond} }}"
        if once: p+=", oncePerTurn: true"
        if cost: p+=f", cost: [{cost}]"
        if gates: p+=f", gate: [{', '.join(gates)}]"
        p+=f", functions: [{body}]"
        return p
    if len(timing_tags)==1:
        return f"  {{ cardNumber: '{cn}', templateId: 'ability', params: {{ {build(timing_tags[0])} }} }},"
    inner="\n".join(f"      {{ templateId: 'ability', params: {{ {build(tt)} }} }}," for tt in timing_tags)
    return f"  {{\n    cardNumber: '{cn}',\n    templates: [\n{inner}\n    ],\n  }},"

def main():
    write='--write' in sys.argv
    rows=[r for r in csv.DictReader(open(CSV)) if r['status']=='needsTemplate']
    gen={}
    for r in rows:
        out=parse(r['cardNumber'],r['category'],r['effectText'].replace('\n',' '))
        if out: gen[r['cardNumber']]=out
    print(f"needsTemplate scanned: {len(rows)} | generated: {len(gen)}")
    if not write:
        for cn in list(gen)[:14]: print(gen[cn])
        print("(dry run — pass --write)"); return
    byfile=defaultdict(list)
    for cn,ts in gen.items(): byfile[set_file(cn)].append(ts)
    for f,entries in byfile.items():
        p=ASSIGN+f+'.ts'; s=open(p).read(); idx=s.rstrip().rfind('\n];')
        s=s[:idx]+'\n\n  // --- codegen batch ---\n'+'\n'.join(entries)+'\n'+s[idx:]
        open(p,'w').write(s); print(f"  wrote {f}.ts +{len(entries)}")

if __name__=='__main__': main()
