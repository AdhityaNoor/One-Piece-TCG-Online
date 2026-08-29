#!/usr/bin/env python3
"""
Generate the PLACEHOLDER sound-effect set into public/audio/sfx/.

    python3 scripts/audio/generate.py            # write .wav stems to /tmp
    (then encode them to .ogg — see scripts/audio/build.sh)

Every cue below is a placeholder. Replace the .ogg file in place, keep the
filename, and nothing in the app needs to change. The `brief` field is the
sound-design instruction for whoever records/licenses the real one.

Design contract (docs/09-audio-and-sound-design.md):
  * one cue = one gesture the player caused or the rules performed
  * cue ids are stable; filenames are derived from them mechanically
  * folder = first id segment, filename = the rest joined with '-'
"""
import json
import os
import sys
import wave
from datetime import datetime, timezone

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from synth import SR, at, fade, layer, normalize, stereo  # noqa: E402
import voices as v  # noqa: E402

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def mix(*parts):
    return fade(normalize(layer(*parts), 0.88), 0.002, 0.02)


# id -> (build fn, one-line brief for the real asset)
CUES = {
    # ------------------------------------------------------------------ UI
    "ui.hover": (lambda: v.tick(0.03, 4200) * 0.35, "Barely-there tick as focus lands on a control."),
    "ui.click": (lambda: v.blip(680, 1020, 0.075, 0.035), "Primary press. Short, wooden, no pitch tail."),
    "ui.confirm": (lambda: mix(v.blip(520, 780, 0.1, 0.05, body=0.3), at(v.chime(1046, 0.4), 0.05, 0.45)), "Affirmative press — commits a choice."),
    "ui.back": (lambda: v.blip(760, 440, 0.09, 0.04), "Reverse of ui.click. Falling, softer."),
    "ui.toggle.on": (lambda: v.blip(700, 1180, 0.07, 0.03), "Switch flicking on."),
    "ui.toggle.off": (lambda: v.blip(1180, 700, 0.07, 0.03), "Switch flicking off."),
    "ui.tab": (lambda: mix(v.tick(0.03, 2600) * 0.6, v.blip(880, 880, 0.05, 0.02) * 0.5), "Segment/tab change. Drier than ui.click."),
    "ui.modal.open": (lambda: mix(v.whoosh(0.26, 320, 1500, 1.2) * 0.6, at(v.blip(600, 900, 0.07, 0.03), 0.12, 0.3)), "Panel rises into view."),
    "ui.modal.close": (lambda: mix(v.whoosh(0.24, 1500, 320, 1.2) * 0.55), "Panel drops away."),
    "ui.error": (lambda: v.buzz(150, 0.22), "Rejected input. Blunt, never harsh."),
    "ui.success": (lambda: v.sparkle(784, (0, 4, 7), 60, 0.5), "Generic positive outcome."),
    "ui.notify": (lambda: v.chime(1046, 0.45, decay=0.2), "Toast / passive notice."),
    "ui.slider.tick": (lambda: v.tick(0.02, 5600) * 0.25, "Volume drag detent. Fires throttled."),
    "ui.screen.transition": (lambda: v.whoosh(0.5, 260, 2200, 1.5) * 0.7, "Screen-to-screen sweep."),
    "ui.brand.stinger": (lambda: v.fanfare(330, 1.5, (0, 7, 12), 150), "Splash/logo sting. The game's signature."),
    "ui.card.hover": (lambda: v.tick(0.028, 5000) * 0.3, "Card tile focus in library/deck builder."),
    "ui.card.detail.open": (lambda: mix(v.flick(0.12, 3000), at(v.slap(0.12, 1100, 1.3, 0.25) * 0.5, 0.04, 0.2)), "Card lifted up for inspection."),
    "ui.card.detail.close": (lambda: v.flick(0.1, 1900) * 0.8, "Card set back down."),
    "ui.deck.add": (lambda: mix(v.blip(560, 900, 0.08, 0.035), at(v.slap(0.1, 1200, 1.2, 0.2) * 0.4, 0.02, 0.2)), "Copy added to the deck list."),
    "ui.deck.remove": (lambda: v.blip(700, 400, 0.09, 0.04), "Copy removed."),
    "ui.deck.save": (lambda: mix(v.sparkle(659, (0, 5, 9), 55, 0.5), at(v.chime(1318, 0.4), 0.12, 0.55)), "Deck saved successfully."),
    "ui.deck.invalid": (lambda: v.buzz(120, 0.3), "Deck fails construction rules."),
    "ui.chat.send": (lambda: v.blip(940, 1400, 0.06, 0.025) * 0.7, "Outgoing chat line."),
    "ui.chat.receive": (lambda: v.chime(1245, 0.35, decay=0.16) * 0.75, "Incoming chat line."),
    "ui.matchmaking.search": (lambda: mix(v.blip(500, 660, 0.12, 0.06), at(v.blip(660, 500, 0.12, 0.06), 0.18, 0.35)), "Queue entered — a searching two-tone."),
    "ui.matchmaking.found": (lambda: v.fanfare(440, 1.0, (0, 7, 12), 110), "Opponent found."),
    "ui.rank.up": (lambda: v.fanfare(440, 1.7, (0, 4, 7, 12, 16), 120), "Rank/tier promotion."),
    "ui.unlock": (lambda: mix(v.sparkle(880, (0, 7, 12), 65, 0.6), at(v.chime(1760, 0.5), 0.16, 0.7)), "Cosmetic/accessory unlocked."),

    # --------------------------------------------------------------- MATCH
    "match.start": (lambda: mix(v.fanfare(294, 1.6, (0, 4, 7, 12), 140), v.boom(0.7, 160, 40, 0.3) * 0.6), "Both decks are set — the match begins."),
    "match.rps.throw": (lambda: v.whoosh(0.3, 500, 1800, 1.1) * 0.7, "Hand thrown in Rock-Paper-Scissors."),
    "match.rps.win": (lambda: v.sparkle(659, (0, 4, 7, 12), 55, 0.6), "You won the roll — you choose."),
    "match.rps.lose": (lambda: v.dirge(196, 0.9) * 0.8, "You lost the roll."),
    "match.mulligan.shuffle": (lambda: v.riffle(0.8, 30), "Deck shuffled after a mulligan."),
    "match.deal": (lambda: v.slap(0.13, 1300, 1.3, 0.3) * 0.75, "One card dealt to the opening hand. Stagger these."),
    "match.leader.reveal": (lambda: mix(v.boom(0.8, 200, 46, 0.35) * 0.8, at(v.shimmer(0.8, 880), 0.06, 0.95)), "Leaders flip face-up. The hero moment."),
    "match.concede": (lambda: v.dirge(174, 1.2), "A player concedes."),

    # ---------------------------------------------------------------- TURN
    "turn.begin.you": (lambda: mix(v.chime(523, 0.6, decay=0.3), at(v.chime(784, 0.7, decay=0.35), 0.11, 0.85), at(v.shimmer(0.6, 1046) * 0.4, 0.14, 0.9)), "Your turn starts. Rising, inviting."),
    "turn.begin.opponent": (lambda: mix(v.chime(392, 0.6, decay=0.3), at(v.chime(294, 0.7, decay=0.35), 0.11, 0.85)), "Opponent's turn starts. Falling, cooler."),

    # --------------------------------------------------------------- PHASE
    "phase.refresh": (lambda: mix(v.blip(392, 588, 0.16, 0.09), at(v.shimmer(0.5, 784) * 0.3, 0.05, 0.55)), "Refresh Phase banner."),
    "phase.draw": (lambda: v.blip(523, 784, 0.14, 0.07), "Draw Phase banner."),
    "phase.don": (lambda: v.chime(523, 0.6, (1.0, 2.0, 3.02, 4.1), 0.28), "DON!! Phase banner — gold, metallic."),
    "phase.main": (lambda: v.blip(392, 523, 0.16, 0.08), "Main Phase banner — the floor is yours."),
    "phase.end": (lambda: v.blip(523, 349, 0.18, 0.09), "End Phase banner."),

    # ---------------------------------------------------------------- CARD
    "card.draw": (lambda: v.flick(0.14, 2800), "One card slides off the deck into hand."),
    "card.play.character": (lambda: v.slap(0.18, 850, 1.5, 0.55), "Character hits the board. The workhorse cue."),
    "card.play.stage": (lambda: v.thud(0.3, 160, 58), "Stage placed — heavier, it stays."),
    "card.play.event": (lambda: mix(v.whoosh(0.3, 600, 2400, 1.2) * 0.6, at(v.blip(660, 990, 0.09, 0.04), 0.08, 0.35)), "Event card announced."),
    "card.move": (lambda: v.flick(0.11, 2200) * 0.8, "Generic zone-to-zone move with no better cue."),
    "card.return.hand": (lambda: v.whoosh(0.28, 1600, 600, 1.1) * 0.65, "Card bounced back to hand."),
    "card.trash": (lambda: v.slap(0.2, 520, 1.6, 0.45) * 0.85, "Card lands in the trash. Dull, final."),
    "card.rest": (lambda: v.thud(0.18, 130, 70) * 0.7, "Card turned sideways to rest."),
    "card.setactive": (lambda: mix(v.flick(0.1, 2400) * 0.7, at(v.blip(700, 1000, 0.06, 0.025) * 0.5, 0.03, 0.16)), "Card set back to active."),
    "card.reveal": (lambda: mix(v.flick(0.12, 3400) * 0.8, at(v.chime(1568, 0.35, decay=0.15) * 0.6, 0.05, 0.45)), "Card revealed to both players."),

    # ---------------------------------------------------------------- DECK
    "deck.shuffle": (lambda: v.riffle(0.9, 34), "Deck shuffled mid-game (after a search)."),

    # ----------------------------------------------------------------- DON
    "don.draw": (lambda: v.chime(784, 0.45, (1.0, 2.01, 3.4), 0.2), "DON!! card added to the cost area."),
    "don.attach": (lambda: mix(v.chime(659, 0.5, (1.0, 2.0, 3.05), 0.22), at(v.slap(0.09, 1600, 1.0, 0.15) * 0.4, 0.0, 0.55)), "DON!! given to a Leader/Character."),
    "don.return": (lambda: mix(v.chime(440, 0.45, (1.0, 2.0), 0.2) * 0.8, v.whoosh(0.24, 1200, 500, 1.0) * 0.4), "DON!! returned to the cost area."),
    "don.rest": (lambda: v.clash(0.18) * 0.4, "DON!! rested to pay a cost. Small coin tap."),
    "don.refresh": (lambda: v.sparkle(659, (0, 7, 12), 45, 0.45), "All DON!! set active again."),

    # -------------------------------------------------------------- BATTLE
    "battle.attack.declare": (lambda: mix(v.riser(0.42, 200, 1200) * 0.7, at(v.whoosh(0.3, 700, 2600, 1.2), 0.16, 0.5)), "Attack declared on a Character."),
    "battle.attack.leader": (lambda: mix(v.riser(0.55, 170, 1500) * 0.75, at(v.boom(0.6, 170, 45, 0.35) * 0.6, 0.3, 0.75)), "Attack declared on a Leader. Bigger stakes."),
    "battle.blocker": (lambda: mix(v.thud(0.3, 190, 70) * 0.8, at(v.clash(0.35) * 0.45, 0.02, 0.4)), "[Blocker] steps in. Shield, not sword."),
    "battle.counter.card": (lambda: mix(v.slap(0.13, 1000, 1.3, 0.35), at(v.blip(500, 900, 0.12, 0.06) * 0.7, 0.04, 0.25)), "Counter card played from hand."),
    "battle.counter.event": (lambda: mix(v.whoosh(0.28, 800, 2600, 1.1) * 0.6, at(v.chime(1046, 0.45, decay=0.2), 0.1, 0.6)), "[Counter] event activated."),
    "battle.clash": (lambda: v.clash(0.55), "Powers compared — steel on steel."),
    "battle.nullified": (lambda: mix(v.buzz(180, 0.18) * 0.7, at(v.whoosh(0.25, 1400, 400, 1.1) * 0.5, 0.06, 0.35)), "Attack fizzles / effect does nothing."),
    "battle.ko": (lambda: v.shatter(0.9), "Character K.O.'d. The big one."),
    "battle.life.take": (lambda: mix(v.boom(0.85, 190, 40, 0.55), at(v.flick(0.14, 2600) * 0.6, 0.22, 1.0)), "A Life card is taken. Impact, then paper."),
    "battle.trigger.reveal": (lambda: mix(v.shimmer(0.95, 1046), at(v.chime(1568, 0.7, decay=0.3), 0.05, 1.0), v.boom(0.5, 140, 50, 0.2) * 0.35), "[Trigger] revealed off a Life card."),

    # -------------------------------------------------------------- EFFECT
    "effect.activate": (lambda: v.shimmer(0.6, 880) * 0.85, "An ability starts resolving."),
    "effect.resolve": (lambda: v.chime(880, 0.4, decay=0.18) * 0.8, "An ability finished resolving."),
    "effect.buff": (lambda: mix(v.blip(440, 880, 0.22, 0.12), at(v.sparkle(1318, (0, 4), 45, 0.35) * 0.5, 0.06, 0.45)), "Power up / positive modifier."),
    "effect.debuff": (lambda: mix(v.blip(700, 330, 0.24, 0.13), at(v.buzz(110, 0.16) * 0.4, 0.05, 0.35)), "Power down / negative modifier."),
    "effect.search": (lambda: mix(v.riffle(0.55, 20) * 0.8, at(v.shimmer(0.5, 1318) * 0.4, 0.1, 0.7)), "Searching the deck."),
    "effect.negate": (lambda: mix(v.buzz(130, 0.2), at(v.thud(0.25, 140, 55) * 0.7, 0.03, 0.35)), "An effect is nullified/negated."),

    # -------------------------------------------------------------- PROMPT
    "prompt.open": (lambda: mix(v.blip(600, 900, 0.1, 0.045), at(v.tick(0.03, 3000) * 0.5, 0.0, 0.15)), "A choice is required of you."),
    "prompt.select": (lambda: mix(v.tick(0.03, 3400) * 0.6, v.blip(880, 880, 0.05, 0.02) * 0.45), "Target toggled in a selection."),
    "prompt.confirm": (lambda: v.blip(660, 990, 0.1, 0.05, body=0.25), "Selection submitted."),
    "prompt.cancel": (lambda: v.blip(660, 440, 0.1, 0.045), "Selection abandoned."),

    # ------------------------------------------------------------- STINGER
    "stinger.life.critical": (lambda: mix(v.dirge(147, 1.3) * 0.75, v.boom(0.8, 150, 36, 0.25) * 0.5), "Down to your last Life. Dread, once."),
    "stinger.game.win": (lambda: v.fanfare(349, 2.2, (0, 4, 7, 12, 16), 150), "Victory. Triumphant, warm, long enough to cover the win screen fade."),
    "stinger.game.lose": (lambda: v.dirge(131, 2.2), "Defeat. Resigned rather than punishing — the player already lost."),

    # --------------------------------------------------------------- MUSIC
    "music.battle": (lambda: v.pad_loop(110, (0, 7, 12, 16), 12.0), "Match loop bed. Must loop seamlessly."),
    "music.battle.tense": (lambda: v.pad_loop(98, (0, 6, 11, 15), 12.0), "Low-life variant. Same tempo/key family."),
    "music.victory": (lambda: v.pad_loop(147, (0, 4, 7, 11), 8.0), "Post-win bed (non-looping is fine)."),
    "music.defeat": (lambda: v.pad_loop(87, (0, 3, 7, 10), 8.0), "Post-loss bed."),
}


def cue_file(cue_id: str) -> str:
    head, *rest = cue_id.split(".")
    return f"{head}/{'-'.join(rest) or head}.ogg"


def write_wav(path: str, mono: np.ndarray) -> float:
    data = stereo(np.clip(mono, -1.0, 1.0), width=0.6)
    pcm = (data * 32767.0).astype("<i2")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    return mono.size / SR


def main() -> None:
    wav_root = sys.argv[1] if len(sys.argv) > 1 else "/tmp/optcg-sfx-wav"
    entries = []
    for cue_id, (build, brief) in CUES.items():
        rel = cue_file(cue_id)
        dur = write_wav(os.path.join(wav_root, rel[:-4] + ".wav"), build())
        entries.append({
            "id": cue_id,
            "file": f"/audio/sfx/{rel}",
            "durationMs": round(dur * 1000),
            "placeholder": True,
            "brief": brief,
        })
    manifest = {
        "$comment": "GENERATED by scripts/audio/generate.py. Every file is a placeholder; replace the .ogg in place, keep the filename.",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "sampleRate": SR,
        "cues": sorted(entries, key=lambda e: e["id"]),
    }
    out = os.path.join(REPO, "public", "audio", "sfx", "manifest.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    print(f"wrote {len(entries)} wav stems -> {wav_root}")
    print(f"wrote manifest -> {out}")


if __name__ == "__main__":
    main()
