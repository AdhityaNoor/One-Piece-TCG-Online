#!/usr/bin/env python3
"""
Effect-coverage triage.

Reads effect-coverage.csv and, for each `needsTemplate` card in the target sets,
classifies its effect text against the KNOWN curated-primitive vocabulary
(templateDefs.ts / factories.ts) into three buckets:

  expressible   - every clause maps to an existing primitive; ready to curate now
  needsPrimitive - one small, well-scoped addition (a new fn/gate/cost) unlocks it
  defer         - needs real new engine capability (dynamic scaling, negate,
                  attack restrictions, direct damage, custom triggers, ...)

Pure text heuristics - it never executes card logic. Output is a ranked
worklist (markdown + csv) so curation can start with the highest-yield cards.

  python3 scripts/effect-triage/run.py [SET ...]      # default OP06..OP11
"""
import csv
import re
import sys
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSV = ROOT / "effect-coverage.csv"
OUT_MD = ROOT / "effect-triage.md"
OUT_CSV = ROOT / "effect-triage.csv"

DEFAULT_SETS = ("OP06", "OP07", "OP08", "OP09", "OP10", "OP11")

# ---------------------------------------------------------------------------
# Pattern vocabulary
# ---------------------------------------------------------------------------
# Hard blockers: presence => needs real new engine capability (defer).
DEFER = {
    "opp-attack-timing": re.compile(r"\[On Your Opponent's Attack\]", re.I),
    "give-all-opp-aura": re.compile(r"[Gg]ive all of your opponent", re.I),
    "active-don-gate": re.compile(r"active DON!! cards", re.I),
    "trash-count-gate": re.compile(r"or more cards in your trash", re.I),
    "deck-count-gate": re.compile(r"cards in your deck|reduced to 0", re.I),
    "dynamic-scaling": re.compile(r"\bfor every\b|\bfor each\b|additional \+?\d|\bgains an additional\b", re.I),
    "negate-effect": re.compile(r"\bnegate", re.I),
    "attack-restriction": re.compile(r"cannot attack|can also attack|cannot be attacked", re.I),
    "same-power-as": re.compile(r"same power as|equal to (the|your)", re.I),
    "direct-damage": re.compile(r"deal \d damage", re.I),
    "hand-reset": re.compile(r"return(s)? all cards in .*hand|shuffle", re.I),
    "delayed-effect": re.compile(r"at the end of (this|your|your opponent's) turn|until the end of your opponent", re.I),
    "variable-count": re.compile(r"any number of", re.I),
    "attribute-target": re.compile(r"<[A-Za-z]+>\s*(attribute )?Characters?", re.I),
    "custom-trigger": re.compile(r"When your opponent activates|when a DON!! card|when this character deals damage", re.I),
    "cost-eq-life": re.compile(r"cost equal to or less than the number", re.I),
    "opp-deck-manip": re.compile(r"your opponent (places|returns|trashes \d+ cards? from their trash)", re.I),
    "power-based-gate": re.compile(r"opponent has a (Leader or )?Character with (a base power|7000 power|\d+ power)", re.I),
}

# Costs / clauses that currently have no modeled equivalent (=> needsPrimitive).
NEEDS_PRIMITIVE = {
    "named-control-gate": re.compile(r"[Ii]f you have \[|[Ii]f you don't have \[", re.I),
    "trigger-filter-play": re.compile(r"\[Trigger\] from your hand|card with a \[Trigger\]", re.I),
    "top-or-bottom-life": re.compile(r"top or bottom of (your|the owner's|your opponent's) Life", re.I),
    "chooseone-targeting": re.compile(r"Choose one:", re.I),
    "place-self-bottom-cost": re.compile(r"place this (Character|card) at the bottom of the owner's deck:", re.I),
    "place-stage-cost": re.compile(r"place 1 Stage .* at the bottom of the owner's deck:", re.I),
    "rest-named-cost": re.compile(r"rest 1 of your \[[^\]]+\] cards?:", re.I),
    "ko-own-as-cost": re.compile(r"K\.O\. 1 of your .*Characters?:|trash 1 of your Characters with", re.I),
    "rest-all": re.compile(r"Rest all of your opponent's Characters", re.I),
    "top-or-bottom-life": re.compile(r"to the top or bottom of the owner's Life", re.I),
    "play-from-hand-or-trash": re.compile(r"from your hand or trash", re.I),
    "look-and-play": re.compile(r"(Look at \d+ cards? from the top|Reveal 1 card from the top) of your deck and play", re.I),
    "mixed-char-or-don": re.compile(r"Characters? or DON!! cards?", re.I),
}

# Positive vocabulary: clauses we CAN express. Used to confirm expressibility
# and to detect "leftover" unmatched clauses.
EXPRESSIBLE = {
    "draw": re.compile(r"\bdraw \d", re.I),
    "ko": re.compile(r"\bK\.O\. up to|\bK\.O\. all of your opponent", re.I),
    "rest": re.compile(r"\bRest up to", re.I),
    "power-buff": re.compile(r"gains \+?\-?\d+ power|gains [+\-]\d+ power|−\d+ power|-\d+ power", re.I),
    "keyword": re.compile(r"gains \[(Rush|Blocker|Double Attack|Banish|Unblockable)\]", re.I),
    "search": re.compile(r"Look at \d+ cards? from the top|reveal up to \d", re.I),
    "play-from": re.compile(r"play up to \d", re.I),
    "add-life-to-hand": re.compile(r"add \d card.* from the top of your Life cards to your hand|add 1 card from the top of your Life", re.I),
    "move-bottom-deck": re.compile(r"at the bottom of (the owner's|your) deck", re.I),
    "trash-hand": re.compile(r"trash \d+ cards? from your hand|trash 1 card from your opponent's hand", re.I),
    "trash-top": re.compile(r"trash \d+ cards? from the top of your deck", re.I),
    "don-minus": re.compile(r"DON!! −1|DON!! -1", re.I),
    "give-don": re.compile(r"give up to \d+ (rested )?DON!!", re.I),
    "set-active": re.compile(r"[Ss]et (this Character|up to \d).*as active", re.I),
    "ko-immunity": re.compile(r"cannot be K\.O\.'d", re.I),
    "choose-one": re.compile(r"Choose one:", re.I),
    "peek-life": re.compile(r"Look at up to 1 card from the top of your or your opponent's Life", re.I),
    "return-hand": re.compile(r"return(s)? .* to the owner's hand|return 1 of their Characters", re.I),
}

TIMING = re.compile(r"\[(On Play|When Attacking|On Block|Activate: Main|On K\.O\.|Counter|Trigger|On Your Opponent's Attack|End of Your Turn|DON!! x\d|Your Turn|Opponent's Turn|Double Attack|Blocker|Rush)\]", re.I)


def classify(text):
    reasons = []
    for name, rx in DEFER.items():
        if rx.search(text):
            reasons.append(name)
    if reasons:
        return "defer", reasons
    prim = [name for name, rx in NEEDS_PRIMITIVE.items() if rx.search(text)]
    if prim:
        return "needsPrimitive", prim
    hits = [name for name, rx in EXPRESSIBLE.items() if rx.search(text)]
    has_timing = bool(TIMING.search(text))
    # Static (no timing bracket) conditional buffs need a static-ability template.
    if not has_timing and re.search(r"this Character (gains|cannot)", text, re.I):
        return "needsPrimitive", ["static-conditional-no-timing"]
    if hits:
        return "expressible", hits
    return "needsPrimitive", ["unmatched-clause"]


def main():
    sets = tuple(a.upper() for a in sys.argv[1:]) or DEFAULT_SETS
    rows = [r for r in csv.DictReader(open(CSV)) if r["set"] in sets and r["status"] == "needsTemplate"]
    rows.sort(key=lambda r: r["cardNumber"])

    buckets = defaultdict(list)
    reason_counts = Counter()
    for r in rows:
        text = r["effectText"].replace("\n", " ")
        bucket, reasons = classify(text)
        r["_bucket"], r["_reasons"] = bucket, ",".join(reasons)
        buckets[bucket].append(r)
        if bucket != "expressible":
            reason_counts.update(reasons)

    # ---- write CSV
    with open(OUT_CSV, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["set", "cardNumber", "name", "category", "bucket", "reasons", "effectText"])
        for b in ("expressible", "needsPrimitive", "defer"):
            for r in buckets[b]:
                w.writerow([r["set"], r["cardNumber"], r["name"], r["category"], b, r["_reasons"], r["effectText"].replace("\n", " ")])

    # ---- write MD
    lines = ["# Effect triage worklist", ""]
    lines.append(f"Sets: {', '.join(sets)} · needsTemplate cards analyzed: {len(rows)}")
    lines.append("")
    lines.append("| Bucket | Cards | Meaning |")
    lines.append("| --- | ---: | --- |")
    lines.append(f"| expressible | {len(buckets['expressible'])} | maps to existing primitives - curate now |")
    lines.append(f"| needsPrimitive | {len(buckets['needsPrimitive'])} | one small addition unlocks it |")
    lines.append(f"| defer | {len(buckets['defer'])} | needs real new engine capability |")
    lines.append("")
    # per-set breakdown
    lines.append("## By set")
    lines.append("")
    lines.append("| Set | expressible | needsPrimitive | defer |")
    lines.append("| --- | ---: | ---: | ---: |")
    for s in sets:
        e = sum(1 for r in buckets['expressible'] if r['set'] == s)
        n = sum(1 for r in buckets['needsPrimitive'] if r['set'] == s)
        d = sum(1 for r in buckets['defer'] if r['set'] == s)
        lines.append(f"| {s} | {e} | {n} | {d} |")
    lines.append("")
    lines.append("## Top blocking reasons")
    lines.append("")
    for reason, n in reason_counts.most_common():
        lines.append(f"- `{reason}` — {n}")
    lines.append("")
    for b, title in (("expressible", "Expressible now (curate these)"),
                     ("needsPrimitive", "Needs one small primitive"),
                     ("defer", "Defer (needs new capability)")):
        lines.append(f"## {title} ({len(buckets[b])})")
        lines.append("")
        lines.append("| Card | Name | Cat | Reasons | Text |")
        lines.append("| --- | --- | --- | --- | --- |")
        for r in buckets[b]:
            t = r["effectText"].replace("\n", " ").replace("|", "\\|")[:160]
            lines.append(f"| {r['cardNumber']} | {r['name']} | {r['category']} | {r['_reasons']} | {t} |")
        lines.append("")
    OUT_MD.write_text("\n".join(lines))
    print(f"expressible={len(buckets['expressible'])} needsPrimitive={len(buckets['needsPrimitive'])} defer={len(buckets['defer'])}")
    print(f"wrote {OUT_MD}")
    print(f"wrote {OUT_CSV}")


if __name__ == "__main__":
    main()
