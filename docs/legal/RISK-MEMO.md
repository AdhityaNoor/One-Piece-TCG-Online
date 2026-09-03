# Takedown Risk Memo — INTERNAL

**OPTCG YoHoHo!** · 2 September 2026 (name updated 2 September 2026)

**Do not publish this file.** It is a candid assessment for the operator. Add
`docs/legal/RISK-MEMO.md` to any public-mirror exclusion before open-sourcing
the repo.

Not legal advice. Prepared without a lawyer.

---

## 1. The premise, corrected

The request was "documents so Bandai can never tell me to take the app down."
No such document exists, and it is important to be clear about why:

- **A ToS binds your users, not Bandai.** Bandai never agreed to it. It has
  exactly zero effect on their ability to send a notice.
- **A disclaimer is not a licence.** "I don't own this" is a statement of
  fact, not permission. It does not create a right to copy.
- **The people who decide are not Bandai.** Vercel, Google Cloud, MongoDB
  Atlas, and your domain registrar act on notices in hours, without reading
  your legal pages and without adjudicating anything. A takedown does not
  require a court, a lawyer, or your agreement.

What documents *actually* buy you, in descending order of value:

1. **A cheap alternative to escalation.** If a rights holder can email you and
   get artwork removed in a week, that is easier for them than filing with
   your host. Most enforcement teams take the cheap path.
2. **Good-faith evidence.** If it ever does go further, prominent disclaimers,
   no monetisation, and a functioning takedown process are the difference
   between a nuisance and a defendant who looks like they were trying to get
   away with something. It affects tone, willingness to negotiate, and any
   damages conversation.
3. **Host safe harbour.** A published, working takedown process means your
   host forwards notices to you instead of pulling the plug and asking later.
4. **Privacy compliance.** Entirely separate from Bandai, and the only part
   here that is a hard legal obligation you are currently exposed on. You
   have EU-reachable accounts, emails, passwords, and match data.

The rest of this memo is about the things that actually move risk.

## 2. What your risk actually consists of

Ranked by how likely it is to end the project, worst first.

### 2.1 `public/ui/` — official website assets · **SEVERITY: HIGHEST**

This is the finding that surprised me, and it is worse than the card art.

```
public/ui/bg_mv.webp          public/ui/bg_new-arrival.webp
public/ui/bg_howto.webp       public/ui/bg_products-category.webp
public/ui/bg_pikup-events.jpg public/ui/bg_sailing.webp
public/ui/footer_illust_chara.webp
public/avatars/img_thumbnail_{ace,law,nami,sabo,sani,shanks,zoro}.webp
```

These filenames are not yours. `bg_mv`, `bg_new-arrival`,
`bg_products-category`, and especially the misspelled `bg_pikup-events` are
verbatim asset names from the official One Piece Card Game website. They were
scraped from it, along with the character illustrations.

Why this is worse than card art:

- Card art in a simulator has an obvious functional justification: you cannot
  identify a card without showing it. Nobody needs the official site's
  marketing background images to play a game of cards. There is no functional
  defence at all.
- Reusing another site's own layout artwork is how you move from "fan tool" to
  **passing off / trade dress** — the claim that users could think this *is*
  the official thing. That claim is much easier to make out, and it is the one
  companies take personally, because it is about confusion rather than copying.
- It looks deliberate rather than incidental. A scraped `bg_pikup-events.jpg`
  is hard to explain as anything other than "I copied their website."

**This is the single highest-value change available to you, and it is also the
cheapest.** Replacing marketing backgrounds and character avatars costs you a
weekend of design work and no functionality whatsoever.

### 2.2 `public/card-images/` — 929 MB of card art · **SEVERITY: HIGH**

60 sets, self-hosted from your own origin, shipped in the repository.

This is the classic exposure and it is unambiguous copyright reproduction. It
is also the exposure with the strongest practical counterweight: every serious
simulator in this space does it, the community depends on it, and Bandai has
so far not acted against it (§ 3).

Mitigation options, in order of risk reduction:

| Option | Risk reduction | Cost |
| --- | --- | --- |
| Text-only cards, no art | Near-total | Severe UX cost; nobody would use it |
| User supplies images locally into Cache Storage | Very high | Awkward first run, ~1 GB download the user initiates |
| Hot-link from the official CDN | Moderate | You stop hosting copies, but you hammer their servers and may breach their site terms — this can *provoke* attention |
| Keep hosting, strong disclaimers, fast takedown path | Low | None — this is where you are |

You chose the last one. That is a defensible choice given the precedent, but
be clear-eyed: this is the thing a notice will name, and 929 MB removed on
demand is the outcome you are planning for. **Make sure you can actually do
it in an afternoon.** See § 5.

**Good news, verified:** `public/card-images/` is in `.gitignore` (line 79) and
zero files under it are tracked by git. The 929 MB exists only in your working
tree and on the deployed origin. That means removal is genuinely a deploy away
and leaves no residue in repository history — which is exactly the position you
want to be in, and it is not the position most projects like this are in.

### 2.3 Audio · **SEVERITY: HIGH IF MUSIC IS COPIED, LOW OTHERWISE**

`public/audio/main-menu-backsound.mp3` and `public/audio/sfx/music/`.

If any of this is One Piece anime or card-game music, it is a different and
much worse category of problem than card art. Music rights sit with Toei and
music publishers, enforcement is automated and aggressive, and rights holders
who tolerate fan tools do not extend that tolerance to soundtrack use.

Your `.gitignore` refers to a "placeholder-SFX generator" under
`scripts/audio/`, which suggests the `sfx/` tree is synthesised rather than
ripped — good. The files to actually check are
`public/audio/main-menu-backsound.mp3` and anything under
`public/audio/sfx/music/`.

**Action: verify the provenance of those this week.** If any of it is ripped,
replace it with royalty-free or commissioned audio immediately. This is a
small amount of work to remove an entire category of risk.

Same question for `public/Poneglyph.ttf` — confirm its licence permits web
embedding and redistribution.

### 2.4 Cosmetic accessories sourced from `tcgplayer` · **SEVERITY: MODERATE**

`AccessorySource` includes `'tcgplayer'`, and sleeve art is stored in Vercel
Blob by absolute URL. That means you have scraped a commercial retailer's
product images of third-party sleeve products and are redistributing them from
your own storage.

This adds a second, unrelated set of potential complainants (the retailer, and
the sleeve manufacturers) for a feature that is pure decoration. Cheapest fix
in the whole memo: drop the scraped sleeves, keep only bundled/original art.

### 2.5 Naming, domain, and product framing · **SEVERITY: LOW — LARGELY ADDRESSED**

Current framing:

- Project name: **"OPTCG YoHoHo!"**
- Domain: `one-piece-tcg-online.vercel.app` — **still carries the mark**
- `<title>`: "OPTCG YoHoHo! — Unofficial Fan Simulator for the One Piece Card
  Game"
- `og:description`: "A free, unofficial fan-made simulator for the One Piece
  Card Game. Not affiliated with Bandai. Build decks and practise in your
  browser."

Nominative fair use lets you *refer* to a trademark to say what your thing is
compatible with. It does not let the mark be your product name. The former name
"One Piece TCG Online" read like a product line — precisely the name Bandai
would use for an official client — and combined with the copied official site
artwork in § 2.1 the overall impression was a lookalike, which is the whole
test.

The rename to **OPTCG YoHoHo!** is the fix this section asked for, and it is
the right shape: a distinct name of your own, with the game named only
descriptively underneath.

> **OPTCG YoHoHo!** — an unofficial fan simulator for the One Piece Card Game

Two residual points:

- **"OPTCG" is still an abbreviation of the mark.** It is far weaker than
  spelling it out, and abbreviations used descriptively by a community are
  much closer to nominative fair use, but it is not a fully independent name.
  This is a defensible position rather than a clean one.
- **The domain was not renamed.** `one-piece-tcg-online.vercel.app` still
  reads as the old product-line name, and a domain is the single most visible
  piece of framing there is — it appears in every share, every search result
  and every takedown notice. Renaming the site while leaving the mark in the
  hostname captures only part of the benefit. If you attach a custom domain,
  pick one built on the new name; the absolute URLs in `index.html`
  (canonical, `og:url`, `og:image`, `twitter:image`) are the only places that
  need changing.

The remaining exposure in this memo is § 2.1 (the scraped `public/ui` and
`public/avatars` site artwork), which the rename does not touch and which
carries no functional-use defence.

### 2.6 Donations · **SEVERITY: MODERATE, AND IT COMPOUNDS**

You chose donations. That is the most common fan-project model and it is
generally survivable, but it does two things:

- It weakens "non-commercial", which is the load-bearing argument in every
  favourable comparison you can draw to tolerated fan projects.
- It puts a number on the harm. "He raised $X while distributing our art" is a
  much more actionable sentence than "he hosted our art."

If you take donations, do it in the least commercial way available:
- Frame it strictly as hosting costs, and **publish what hosting costs**.
- No donor perks, badges, cosmetics, or priority anything. The moment a
  donation buys a benefit, it stops being a gift and starts being a sale of
  something built on their IP.
- Keep the donation link off the landing page and out of the gameplay flow.

The cosmetics system (§ 2.4) plus donations is the combination to avoid. Never
let those two touch.

### 2.7 Privacy compliance · **SEVERITY: MODERATE — AND THIS ONE IS CERTAIN**

Every risk above is contingent on someone deciding to act. This one is not:
the obligation exists the moment an EU resident signs up, which has probably
already happened.

You currently hold emails, bcrypt password hashes, usernames, profile bios,
deck lists, ranked ratings, full match action streams, and bug reports
containing complete battle logs, on MongoDB Atlas, behind a Cloud Run service,
served from Vercel — and until now you published no privacy policy at all.

The `PRIVACY.md` shipped with the app fixes the disclosure gap. What it does not fix
is that you must actually be able to **honour a deletion or export request**.
Today there is no self-service path and, as far as I can see, no admin tooling
for it either. If a request arrives, you will be doing it by hand in Atlas.
That is acceptable at your scale, but only if you know how, before you need to.

Credit where it is due: the consent design for match trajectories is genuinely
better than most commercial products. Requiring *every* seat to agree, and
recognising that a trajectory covers both players so it cannot be half
recorded, is the correct analysis and it will read well to any regulator.

### 2.8 The rules text itself · **SEVERITY: LOW**

Worth knowing, because it is your strongest ground: **game mechanics are not
copyrightable.** Rules, systems, and methods of play are excluded (in the US,
17 U.S.C. § 102(b) and long-standing case law; comparable principles apply
elsewhere). Your engine — the state model, the phase system, the effect
resolution stack — is your own original work and it is defensible.

The *expression* of the rules is a different matter. Verbatim card text and
verbatim passages from the Comprehensive Rules PDF are copyrighted expression.
Card text is hard to avoid and is roughly as defensible as card art. Copied
rulebook prose in your docs or UI is avoidable — paraphrase it.

## 3. What the precedent actually looks like

Some genuinely encouraging context, current as of this memo:

- **OPTCGSim** and similar unofficial simulators have operated publicly for
  years, with full card art, and are described in TCG press as where "the vast
  majority of competitive players" practise. No public record of Bandai
  cease-and-desist action against them.
- **Bandai's own response has been to build, not to sue.** They released a
  limited *Teaching App* (browser and mobile) rather than moving against the
  simulators that fill the gap.
- **Bandai's July 2026 IP statement** on the One Piece Card Game was
  specifically about **physical goods** — unauthorised cards, accessories, and
  merchandise being *bought and sold*. It said nothing about simulators,
  third-party apps, or digital card images, and it explicitly clarified that
  the restrictions target commerce rather than personal play.

Read carefully, that statement is close to the best signal you could ask for:
the axis they chose to police is **commercial exploitation**, not fan tooling.
Which tells you exactly where to stand — as far from commerce as you can get.

The counterweights, which are real:

- Tolerance is not permission. It can end on any Tuesday, usually because
  something changed on their side — most often the announcement of an official
  digital product, which instantly converts every simulator from harmless to
  competitive.
- **Your tripwire to watch is an official online client.** The day one is
  announced, the risk profile of this project changes completely and you
  should be ready to move fast.
- Tolerance is easiest to extend to a project that stays unremarkable.
  Ranked seasons, cosmetics, banners, an admin CMS, and a donation link add up
  to something that looks like a business, and businesses get looked at.

## 4. Priority actions

Ordered by risk reduced per unit of effort.

**This week**

1. **Delete `public/ui/bg_*.webp`, `bg_pikup-events.jpg`,
   `footer_illust_*.webp`, and `public/avatars/img_thumbnail_*.webp`.**
   Replace with original or licensed art. Highest value, lowest cost, no
   functional loss. (§ 2.1)
2. **Audit `public/audio/` and `Poneglyph.ttf` for provenance.** Replace
   anything ripped. (§ 2.3)
3. **Publish `/terms`, `/privacy`, `/dmca`** and wire the footer disclaimer on
   every page. (§ 1)
4. **Set up `support@optcgcustom.app` as a real, monitored inbox.** An unread takedown
   inbox is worse than none — it forces the sender to escalate to your host.
5. **Nothing needed** — card images are already untracked and gitignored.
   Keep it that way; do not let a future `git add -f` undo it. (§ 2.2)

**This month**

6. Remove the `tcgplayer`-sourced sleeve art. (§ 2.4)
7. Write a **kill-switch**: one environment variable or feature flag that
   swaps every card image for a text-only card face, deployable in minutes.
   This is what converts "we have to shut down" into "we complied in an hour."
8. Document a manual **data export and deletion runbook** for a single
   user id across every collection: `users`, `profiles`, `usernameHistory`,
   `decks`, `matchHistory`, `matchTrajectories`, `ranked`, `bugReports`,
   cosmetics. (§ 2.7)
9. If registering a US DMCA agent matters to you (it is the difference between
   having § 512 safe harbour and only claiming it), register at
   `dmca.copyright.gov`. It currently costs about USD 6.
10. Keep donations minimal, unadvertised, perk-free, and separate from
    cosmetics. (§ 2.6)

**Consider seriously**

11. **Rename the project and the domain.** (§ 2.5) Real cost, real benefit.
12. **Move card images to user-supplied local storage.** The strongest
    available mitigation short of removing art entirely, and the model that
    has kept comparable projects alive in other card games for over a decade.

**Keep a personal exit plan.** Not a legal document — a decision made in
advance, while calm: if a notice arrives, you comply immediately and
completely, and you do not argue. Nobody has ever improved their position by
negotiating with a rights holder's enforcement team over fan use of their
artwork. Have a database backup and an export you can hand to players so the
project ends with people keeping their decks rather than losing everything.

## 5. If a notice arrives

1. **Do not ignore it.** The clock is short and silence escalates to your host.
2. **Do not argue, and do not post it publicly for community outrage.** That
   converts a routine enforcement action into a matter of institutional pride,
   which is the one thing that reliably makes it worse.
3. **Acknowledge within 24 hours.** Say you are a non-commercial fan project,
   that you are complying, and ask what specifically they want removed.
4. **Comply fully, immediately, and visibly.** Flip the kill-switch from action
   7 before you have even finished reading it, if the notice concerns art.
5. **Ask, once and politely, whether a narrower change would satisfy them** —
   text-only cards, a rename, attribution. Sometimes the answer is yes. Accept
   the first "no" and stop.
6. **Only then consider a lawyer**, and only if they are asking for money or
   for something beyond taking the material down.
7. **Tell your players honestly** what happened and give them their decks.

## 6. The short version

You cannot make yourself immune. You can make yourself uninteresting to
enforce against and easy to resolve with — and the evidence in § 3 says that
this specific rights holder is currently policing *commerce*, not fan tools.

So: strip the copied official website assets, verify the audio, take the
disclaimers seriously, keep the money out of it, build the kill-switch, and be
the easiest possible person to deal with if the email ever arrives.

The engine is yours. Whatever happens to the artwork, nobody can take that.
