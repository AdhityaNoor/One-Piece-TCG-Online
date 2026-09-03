# Legal Documents

**The three PUBLISHED documents no longer live here.** They are application
content — the app imports and renders them verbatim — so they live in the
source tree, next to the code that renders them:

| File | Route | Purpose |
| --- | --- | --- |
| `src/app/legal/content/TERMS.md` | Settings > Legal > Terms | Contract between the operator and players |
| `src/app/legal/content/PRIVACY.md` | Settings > Legal > Privacy | What personal data is collected and why |
| `src/app/legal/content/DMCA.md` | Settings > Legal > IP & Takedowns | Takedown procedure for rights holders |

They moved because `.vercelignore`, `.dockerignore` and `.gcloudignore` all
exclude `docs/`, so importing them from here built fine locally and failed on
Vercel with *"Could not resolve ../../../docs/legal/TERMS.md?raw"*. Do not move
them back, and do not keep a second copy here — `src/app/legal/legalDocuments.ts`
is the only place they are read from, and a test fails if a duplicate appears.

## What stays here

| File | Purpose |
| --- | --- |
| `README.md` | This checklist |
| `DISCLAIMER-COPY.md` | UI strings (footer, first-run notice, meta tags) |
| `RISK-MEMO.md` | **Internal.** Do not publish. Candid exposure analysis. |

That `docs/` is excluded from every deploy is now a feature: it is what keeps
the risk memo out of the bundle. Keep operator-facing notes in this folder,
never in a published document — the three files above are rendered verbatim to
players, so anything written in them is public.

## Before publishing

Every `[BRACKETED]` placeholder must be filled in. Search
`src/app/legal/content/` for `[` to find them. Until they are, the Legal screen
shows a development-only warning listing what is outstanding.

- `[OPERATOR NAME]` — the natural person operating the site
- `[CONTACT EMAIL]` — a real, monitored inbox
- `[LEGAL EMAIL]` — may be the same inbox; must be monitored daily
- `[CITY]`, `[PROVINCE]` — for the governing-law and notice clauses

## Before publishing, part two: the DMCA agent

`DMCA.md` names a designated agent. For the safe harbour of 17 U.S.C. § 512
to actually apply in the United States, that agent must be **registered** with
the U.S. Copyright Office at `dmca.copyright.gov` (currently about USD 6).
Publishing an agent on the page without registering is not sufficient.

## Not legal advice

These drafts were prepared without a lawyer. They are a reasonable starting
posture for a non-commercial fan project, not a substitute for review by
counsel qualified in Indonesian law and in the jurisdictions where players
actually live.
