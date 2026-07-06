#!/usr/bin/env python3
"""Compositional shape-cluster codegen. Parses prefixes (timing, oncePerTurn,
condition, gate, cost) then matches the remaining effect body (whole, or split
on ' Then, ') against single-clause matchers. Emits only on FULL consumption.
  python3 scripts/effect-codegen/run.py [--write]"""
import csv, re, sys
from collections import defaultdict

ROOT = __file__.rsplit('/scripts/', 1)[0]
CSV = ROOT + '/effect-coverage.csv'
ASSIGN = ROOT + '/src/cards/effectTemplates/assignments/'
STATIC_KW = re.compile(r'\[(Blocker|Rush|Double Attack|Banish)\]', re.I)
TIMING = {'On Play':'onPlay','When Attacking':'whenAttacking','On K.O.':'onKO','On Block':'onBlock',
          'Activate: Main':'activateMain','Main':'activateMain','Counter':'counter','Trigger':'lifeTrigger','End of Your Turn':'endOfTurn'}

def norm(t):
    t = re.sub(r'\([^)]*\)', '', t); t = STATIC_KW.sub('', t)
    return re.sub(r'\s+', ' ', t).strip()
def set_file(cn):
    s = cn.split('-')[0]
    return 'EB' if s.startswith('EB') else 'PRB' if s.startswith('PRB') else s

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
def m_rest(b):
    m=re.fullmatch(r"Rest up to 1 of your opponent's Characters with a cost of (\d+) or less\.?",b)
    if m: return f"{{ fn: 'rest', target: {{ group: 'characters', player: 'opponent', filter: {{ maxCost: {m.group(1)} }} }}, optional: true }}"
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
    return None
def m_selfbuff(b):
    m=re.fullmatch(r"[Tt]his Character gains \+(\d+) power during this (turn|battle)\.?",b)
    if m:
        dur='duringThisTurn' if m.group(2)=='turn' else 'duringThisBattle'
        return f"{{ fn: 'addPowerSelf', amount: {m.group(1)}, duration: '{dur}' }}"
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

BODIES=[m_searcher,m_ko,m_rest,m_draw,m_minuspower,m_buff,m_selfbuff,m_addcost,m_bottomdeck,m_setdon,m_restopdon,m_adddon,m_trashtop,m_life_to_hand,m_playhand]

def match_one(b):
    b=b.strip()
    for fn in BODIES:
        r=fn(b)
        if r: return r
    return None
def match_body(b):
    b=b.strip()
    r=match_one(b)
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
    gate=None
    gm=re.match(r"If your Leader has the \{([^}]+)\} type,\s*",rest)
    if gm: gate=f"{{ kind: 'leaderType', type: '{gm.group(1)}' }}"; rest=rest[gm.end():]
    else:
        gm=re.match(r"If your Leader is \[([^\]]+)\],\s*",rest)
        if gm: gate=f"{{ kind: 'leaderName', name: '{gm.group(1)}' }}"; rest=rest[gm.end():]
    cost=None
    cm=re.match(r"You may rest this Character:\s*",rest)
    if cm: cost="{ kind: 'restThis' }"; rest=rest[cm.end():]
    if cost is None:
        cm=re.match(r"DON!! [−-](\d+):\s*",rest)
        if cm: cost=f"{{ kind: 'donMinus', count: {cm.group(1)} }}"; rest=rest[cm.end():]
    if cost is None:
        cm=re.match(r"You may trash this Character:\s*",rest)
        if cm: cost="{ kind: 'trashThis' }"; rest=rest[cm.end():]
    if cost is None:
        cm=re.match(r"([➀➁➂➃①②③④⑤])\s*:?\s*",rest)
        if cm:
            n={'➀':1,'➁':2,'➂':3,'➃':4,'①':1,'②':2,'③':3,'④':4,'⑤':5}[cm.group(1)]
            cost=f"{{ kind: 'restDon', count: {n} }}"; rest=re.sub(r'^:\s*','',rest[cm.end():]).strip()
    body=match_body(rest)
    if not body: return None
    def build(timing):
        p=f"timing: '{timing}'"
        if cond: p+=f", condition: {{ {cond} }}"
        if once: p+=", oncePerTurn: true"
        if cost: p+=f", cost: [{cost}]"
        if gate: p+=f", gate: [{gate}]"
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
