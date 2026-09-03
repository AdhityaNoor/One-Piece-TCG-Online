# Legal Documents

Source of truth for the site's user-facing legal pages. These are Markdown so
they can be reviewed in diffs; render them into React routes rather than
maintaining a second copy in JSX.

| File | Route | Purpose |
| --- | --- | --- |
| `TERMS.md` | `/terms` | Contract between the operator and players |
| `PRIVACY.md` | `/privacy` | What personal data is collected and why |
| `DMCA.md` | `/dmca` | Takedown procedure for rights holders |
| `DISCLAIMER-COPY.md` | — | Short UI strings (footer, splash, meta) |
| `RISK-MEMO.md` | — | **Internal.** Do not publish. Candid exposure analysis. |

## Before publishing

Every `[BRACKETED]` placeholder must be filled in. Search for `[` to find them.

- `Croix Shadow` — the natural person operating the site
- `support@optcgcustom.app` — a real, monitored inbox
- `support@optcgcustom.app` — may be the same inbox; must be monitored daily
- `Jakarta`, `Greater Area Jakarta` — for the governing-law and notice clauses

## Before publishing, part two: the DMCA agent

`DMCA.md` names a designated agent. For the safe harbour of 17 U.S.C. § 512
to actually apply in the United States, that agent must be **registered** with
the U.S. Copyright Office at `dmca.copyright.gov` (currently about USD 6).
Publishing an agent on the page without registering is not sufficient.

Keep operator-facing notes like this one here, in `README.md` or
`RISK-MEMO.md` — never in a published document. `DMCA.md`, `TERMS.md` and
`PRIVACY.md` are rendered verbatim inside the app (see
`src/app/legal/legalDocuments.ts`), so anything written in them is public.

## Not legal advice

These drafts were prepared without a lawyer. They are a reasonable starting
posture for a non-commercial fan project, not a substitute for review by
counsel qualified in Indonesian law and in the jurisdictions where players
actually live.
