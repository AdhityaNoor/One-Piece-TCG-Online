# Fan-Content Disclaimer — UI Copy

Ready-to-paste strings. Keep the wording consistent everywhere: an
inconsistent disclaimer reads as decoration, a consistent one reads as a
position.

Rule of thumb: the disclaimer must be visible **without scrolling and without
clicking** on the landing view. A disclaimer buried in a footer three pages
deep is worth very little when someone is deciding whether you were acting in
good faith.

---

## 1. Footer — every page (required)

**Short form (single line, small text, always visible):**

```
OPTCG YoHoHo! is an unofficial fan project. Not affiliated with or
endorsed by Bandai, Shueisha, Toei Animation, or Eiichiro Oda. All card
images, card text, and trademarks are the property of their respective
owners. · Terms · Privacy · IP & Takedowns
```

**Long form (footer block, if you have the room):**

```
UNOFFICIAL FAN PROJECT

OPTCG YoHoHo! is a free, non-commercial fan-made simulator. It is not
made by, endorsed by, sponsored by, or affiliated with Bandai Co., Ltd.,
Bandai Namco, Shueisha, Toei Animation, or Eiichiro Oda.

"ONE PIECE" and "ONE PIECE CARD GAME" and all associated card images, card
text, character names, and logos are the property of their respective owners
and are used here only to identify the cards being simulated.

Nothing is sold here. This project does not replace the official product —
please support it by buying real cards.

Rights holders: see our IP & Takedown Policy or email support@optcgcustom.app.
```

## 2. First-visit notice (modal or dismissible bar)

Shown once per device, dismissed with a single acknowledgement. Store the
dismissal in `optcg.disclaimerAck`.

**Heading**

```
This is a fan-made simulator
```

**Body**

```
OPTCG YoHoHo! is an unofficial, non-commercial fan project. It is not
affiliated with or endorsed by Bandai, Shueisha, Toei Animation, or Eiichiro
Oda, and all card art and text belongs to them.

Nothing is sold here, and the rules engine is a fan reimplementation — it can
be wrong. For anything that matters, the official rules and an official judge
are always right.

Please support the official release.
```

**Primary button**

```
Got it
```

**Secondary link**

```
Read the full terms
```

## 3. Sign-up screen (above the submit button)

```
By creating an account you agree to the Terms of Service and Privacy Policy.
This is an unofficial fan project, free to use, with nothing for sale.
```

## 4. Settings — match recording toggle

**Label**

```
Share match data to improve the AI
```

**Help text**

```
When on, the full action stream of your online matches may be stored as
training material for the computer opponent. A match is only recorded if every
player in it has this on. Turning it off costs you nothing, and you can ask us
to delete past recordings at any time.
```

## 5. Rules-accuracy notice (deck builder and match screen)

```
Fan-made rules engine — errors are possible. Official rules and judges are
authoritative.
```

## 6. Meta tags — `index.html`

```html
<meta name="description" content="A free, unofficial fan-made One Piece Card Game simulator. Not affiliated with Bandai. Build decks and practise in your browser." />
<meta name="author" content="Croix Shadow" />
```

Add "unofficial" and "fan-made" to the `og:description` too. It costs nothing
and it is the text that shows up when someone shares the link — including,
potentially, the person deciding what to do about you.

## 7. Repository `README.md`

Put this immediately under the title, above everything else:

```
> **Unofficial fan project.** Not affiliated with or endorsed by Bandai Co.,
> Ltd., Bandai Namco, Shueisha, Toei Animation, or Eiichiro Oda. All card
> images, card text, and trademarks are the property of their respective
> owners. Non-commercial; nothing is sold. Rights holders: see
> [src/app/legal/content/DMCA.md](src/app/legal/content/DMCA.md).
```

## 8. Wording to avoid

Never describe the Service as any of these:

- "official", "licensed", "partnered", "powered by Bandai"
- "the online version of the One Piece Card Game"
- "play the One Piece Card Game online" *as the product claim* — say
  "unofficial simulator" instead
- anything implying you sell, distribute, or grant rights in cards

Also avoid naming the site in a way that reads like an official product line.
`one-piece-tcg-online` is descriptive but close to the mark; a distinct project
name with the game named only in the subtitle is meaningfully safer. See
`RISK-MEMO.md`.
