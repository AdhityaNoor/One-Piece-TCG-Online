# Privacy Policy

**OPTCG YoHoHo!**

Effective date: 2 September 2026
Last updated: 3 September 2026

---

## Summary

- We collect the minimum needed to run accounts, decks, matches, and ranked
  play.
- **No advertising. No analytics. No trackers. No cookies of our own. Your
  data is never sold or shared for marketing.**
- The home screen embeds Discord's server widget and shows Ko-fi's own button
  image. Loading it shows those two companies your IP address, and Discord's
  widget may set its own cookies. See § 5.
- Full match recordings used to improve the computer opponent are **opt-out,
  and every player in a match must agree** before one is stored.
- You can export or delete your data by emailing us.

This is a free hobby project run by one person, not a company with a security
team. Please read § 8 (Security) with that in mind.

---

## 1. Who is responsible

**Croix Shadow**, an individual in Jakarta, Greater Area Jakarta, Indonesia, is the
controller of the personal data described here.

Contact: **support@optcgcustom.app**

We are below the thresholds that would require a formal Data Protection
Officer, and we have not appointed one. Write to the address above for any
privacy matter.

## 2. What we collect

### 2.1 Account data — required to have an account

| Data | Why |
| --- | --- |
| Email address | Account identity, login, password reset, essential service notices |
| Username | Public identity, unique handle, profile URL |
| Password (bcrypt hash only) | Authentication. The plaintext is never stored or logged |
| Account creation date | Account administration, abuse investigation |

We never store your password. We store a bcrypt hash, which is not reversible.

### 2.2 Profile data — optional, you provide it

Display name, biography, region, preferred language, time zone, equipped
cosmetics, featured decks and achievements, your per-section privacy settings,
and a history of your previous usernames (so a rename cannot be used to escape
a reputation).

You choose what to fill in, and your privacy settings control who sees each
section. Leave any of it blank.

### 2.3 Gameplay data

| Data | Contents |
| --- | --- |
| Saved decks | Your deck lists, stored per deck so two devices cannot overwrite each other |
| Match history | Room code, the accounts seated, winner, how the match ended, action count, start and end times |
| Ranked data | Rating, rank, division, placement status, season, and a snapshot of the deck each participant used |
| Match trajectories | The full action stream of a match, for AI research. **Consent-gated — see § 3** |

### 2.4 Support data

If you submit a bug report from a match, we receive: your description, your
account id, the match mode and id, the turn number and phase, the card you had
selected, **the full battle log at that moment**, and your client version.

A battle log describes gameplay. Do not type personal information into the
description field.

### 2.5 Technical data

Our hosting providers process connection metadata — including your **IP
address**, user agent, and request timestamps — in ordinary server and network
logs, as any web service does. We use this only to run and secure the Service
(diagnosing errors, blocking abuse), not to profile you.

### 2.6 Stored on your own device

The Service stores the following in your browser. It stays on your device and
is not transmitted to us except where noted:

| Key | Purpose | Necessary? |
| --- | --- | --- |
| `optcg.auth.token` | Keeps you logged in | Yes — you asked to log in |
| `optcg.settings` | Your audio, display, and gameplay preferences | Yes — functional |
| `optcg.deck.*`, `optcg.deckIndex`, `optcg.lastUsedDeck` | Local copies of your decks, so the deck builder works offline and before you sign in | Yes — functional |
| `optcg.tutorial` | Remembers you have seen the tutorial | Yes — functional |
| Cache Storage (card images) | Avoids re-downloading card art on every visit | Yes — performance of the service you requested |

**We set no cookies of our own, and we run no analytics, advertising,
fingerprinting, or tracking scripts of any kind.** Everything in the table
above is first-party and strictly necessary for features you have asked for.

Two third parties are loaded by the home screen — the Discord widget and the
Ko-fi button described in § 5. We do not use them to track you and we learn
nothing from them, but Discord's widget is that company's own page and may set
cookies or storage **in its own context** when it loads. We cannot read that
storage and it is not ours.

You can clear all of it through your browser's "clear site data" — you will be
signed out and local decks not synced to an account will be lost.

## 3. Match recording and AI research — your consent

Full match recordings ("trajectories") are used as training material to improve
the computer opponent.

A recording covers **both** players. Recording a match because one player
agreed would mean writing the other player's decisions to disk on a decision
that was not theirs. So the rule is: **every seat in a room must agree, or no
trajectory is stored.** A player who has not answered is treated as agreeing,
which matches the default setting shown in the client; a player who has turned
the setting off blocks the recording for that match entirely.

- You can change the setting at any time in your settings. It applies to
  matches started after the change.
- Turning it off costs you nothing — no feature, no ranked eligibility.
- You can ask us to delete trajectories involving your account at any time
  (§ 7). Because a trajectory involves another player too, we delete the whole
  record rather than trying to redact half of it.

Your match **history** (the result) is not covered by this setting. It is a
record of a competitive match against another person and is necessary to run
ranked play.

## 4. Why we may lawfully process your data

For players in the EU/EEA and UK, our legal bases under GDPR Article 6 are:

| Purpose | Legal basis |
| --- | --- |
| Creating and running your account; saving decks; playing matches; ranked standings | **Contract** (Art. 6(1)(b)) — you cannot have the service without them |
| Server logs, abuse prevention, rate limiting, moderation | **Legitimate interests** (Art. 6(1)(f)) — keeping the service running and fair |
| Bug reports you choose to send | **Legitimate interests**, and your own submission |
| Match trajectories for AI research | **Consent** (Art. 6(1)(a)) — withdrawable at any time |
| Responding to a legal obligation | **Legal obligation** (Art. 6(1)(c)) |

We do not process special-category data, we do not carry out profiling with
legal effects, and we make no automated decisions about you other than routine
anti-abuse measures, which a human reviews on request.

## 5. Who we share it with

**We do not sell your personal data. We do not share it for advertising or
marketing. We have no advertising partners.**

Data is shared only with the infrastructure providers needed to run the
Service, each acting as our processor:

| Provider | Role | Data involved |
| --- | --- | --- |
| Vercel | Frontend hosting; blob storage for cosmetic art | Connection metadata; no account data in blob storage |
| Google Cloud Run | Game and API server hosting | All server-side data in transit; connection logs |
| MongoDB Atlas | Database | All stored account, profile, deck, match, and ranked data |

The card database used by the client is fetched from a third-party card data
source (`optcgapi.com`). Requesting card data exposes your IP address to that
host, as visiting any website does. We send them nothing about your account.

### Community widgets (Discord and Ko-fi)

The home screen embeds two panels served by other companies:

| Widget | Host | What it is |
| --- | --- | --- |
| Discord server widget | Discord (`discord.com`) | An embedded page: the live member list and join button for our server |
| Ko-fi button | Ko-fi (`storage.ko-fi.com`) | Just an image — Ko-fi's own button, linking out to our Ko-fi page |

**Both load with the home screen**, and both therefore show that company your
**IP address**, your browser's **User-Agent**, and the fact that the page
loaded — the same as visiting any website. What they do with that is governed
by **their** privacy policy, not ours: see
[Discord](https://discord.com/privacy) and [Ko-fi](https://ko-fi.com/privacy).

The two differ in how much they can do. Discord's widget is a full embedded
page and may set cookies or storage **in its own context**, which we cannot
read. Ko-fi's is only an image file, so it can do nothing but be fetched; you
reach Ko-fi's actual donation page only if you click the button.

We receive nothing back from either, and we send them nothing about your
account: neither is told who you are, and neither knows you are signed in. We
do not use them for analytics.

Donations through Ko-fi are handled entirely by Ko-fi and its payment
processors, on their site. We never see your card details. See § 9 of the
Terms — a donation is a gift and buys nothing in the game.

If you would rather not load them, a content blocker will stop both; nothing
else on the home screen depends on them.

Other than the above, we disclose data only:

- to another player, where the Service is designed to show it (your username
  and deck to your opponent during a match; your profile according to your own
  privacy settings);
- where legally required, after checking that the request is valid and, where
  we are permitted, telling you first;
- to protect the rights or safety of players or the operator.

## 6. Where your data goes and how long we keep it

Our providers operate globally, so your data is processed outside your country
and outside the EU/EEA, including in the United States. Where transfers from
the EU/EEA or UK are involved, we rely on our providers' Standard Contractual
Clauses.

| Data | Retention |
| --- | --- |
| Account, profile, decks | Until you delete your account |
| Match history | Until you delete your account, then anonymised where another player's record depends on it |
| Ranked data | Kept for the season, then archived in aggregate |
| Match trajectories | Until deletion is requested or the record is pruned; not tied to your account lifetime, but deletable on request |
| Bug reports | Up to 24 months after resolution |
| Server logs | Short-term, per our hosting providers' defaults |
| Backups | Deleted data may persist in backups for a limited period before rotation |

## 7. Your rights

Wherever you live, you may ask us to:

- **Access** — get a copy of the data we hold about you;
- **Correct** — fix anything wrong;
- **Delete** — remove your account and associated data;
- **Export** — receive your data in a portable format (JSON);
- **Withdraw consent** — turn off match recording, and have existing
  recordings deleted;
- **Object or restrict** — where we rely on legitimate interests;
- **Complain** — to your local data protection authority.

Email **support@optcgcustom.app** from the address on your account. We aim to respond
within 30 days.

**Deleting your account** removes your account record, profile, saved decks,
and cosmetic inventory. Match history entries that another player also
participated in are anonymised rather than erased, because they are also that
player's record; your username is replaced with a non-identifying placeholder.
Match trajectories are deleted on request.

**If you are in California**, you additionally have the rights described in
the CCPA/CPRA, including the right to know, the right to delete, the right to
correct, and the right not to be discriminated against for exercising them.
We have not sold or shared personal information in the preceding 12 months, we
do not do so now, and we do not knowingly collect data from anyone under 16 for
that purpose. Use the same email address to make a request.

## 8. Security — and what we honestly cannot promise

What we do:

- Passwords are hashed with bcrypt and are never stored or logged in plain
  text.
- All traffic is served over TLS.
- Authentication uses short-lived signed tokens.
- The administrative credential store is entirely separate from player
  accounts. No admin account can be created through any public signup route.
- The game server is authoritative: the client sends intents only, so a
  modified client cannot change the game state directly.
- Secrets come from environment variables and are never committed.

What we cannot promise: this is a hobby project maintained by one person. It
has no security team, no independent audit, and no bug bounty. No method of
transmission or storage is completely secure. **Use a password you do not use
anywhere else**, and do not put anything sensitive in your bio, your username,
or a bug report.

If we discover a breach affecting your personal data, we will notify affected
users and, where required, the relevant supervisory authority within 72 hours
of becoming aware of it.

If you find a vulnerability, please report it privately to
**support@optcgcustom.app** before disclosing it. We will not pursue anyone who
reports in good faith and does not access other players' data.

## 9. Children

The Service is not directed at children under 13, and we do not knowingly
collect personal data from them. If you believe a child under 13 has created
an account, contact us and we will delete it.

Players between 13 and the age of digital consent in their country should use
the Service only with a parent's or guardian's consent.

## 10. Changes

We may update this policy. The "Last updated" date will change, and material
changes will be announced in the application. If a change requires your
consent, we will ask for it rather than assume it.

## 11. Contact

Croix Shadow
Email: **support@optcgcustom.app**
Postal address available on request for formal notices.
