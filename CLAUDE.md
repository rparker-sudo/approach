# Approach Strength: instructions for Claude Code

Approach Strength is a volleyball strength-training app (Expo / React Native, web build first, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

**Live now:** v2.2.0 on `main` (deployed 11/14). The app is currently served on the apex `approachstrength.com`; that's what this session fixes.

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots**. Don't edit `docs/`; if a doc looks wrong or conflicts with the code or another doc, stop and say so instead of guessing.

**Precedence when docs disagree:** `docs/compliance.md` → the current spec (`docs/specs/v2.2.1.md` or `docs/specs/marketing-site.md`) → `docs/legal/` → `docs/copy/` → `docs/design/` → `docs/content/` → older specs.

| Doc | Version this session expects | What it is |
|---|---|---|
| `docs/compliance.md` | updated 11/14 (hand-off session) | **Hard rules. Every MUST applies to all work.** |
| `docs/specs/v2.2.1.md` | **v1.1** | Part A: domain move, apex placeholder, rename, F-2/F-7, level card text, J1/J3, Coach Terms checkbox, new Welcome/Log in flow |
| `docs/specs/marketing-site.md` | **v1.1** | Part C: the marketing site on `approachstrength.com` |
| `docs/design/marketing-site.md` | v1.0 | Marketing site layout, components, admin-preview sample data, screenshot rules (S1–S6) |
| `docs/copy/website-copy.md` | **v1.1** | Every word on the marketing site. Legal signed it off: publish it exactly |
| `docs/copy/brand-guide.md` | v0.3 | Name, wordmark, board presets, voice |
| `docs/legal/parent-consent-form.md`, `docs/legal/soft-launch-notice.md` | updated 11/14 | Source text for `/consent`, `/privacy`, `/terms`. Publish exactly; no script edits |
| `docs/specs/v2.2.md` | v1.3 (history) | What 2.2.0 built. Its §1.12 (domain) is carried in `v2.2.1.md` Appendix A |
| `docs/content/`, `docs/design/user-flows*.md`, `docs/specs/rack-groups.md`, `v2.1-*.md` | unchanged | Reference for existing behavior |

**Version check (do this first):** if any spec header doesn't match the version in this table, **stop and tell Ryan**.

## Current task: one session, three parts, in this order (Ryan, 11/14)

### Part A: build v2.2.1 (`docs/specs/v2.2.1.md` v1.1)
1. Commit this planning hand-off first if it isn't committed.
2. Build §1–§9 in a branch `v2.2.1`. The apex placeholder site (§2) is created **before** the Pages custom domain moves off the apex, so `/privacy`, `/terms`, `/consent` never go dark.
3. Ryan does the GitHub Pages, Supabase Auth, and Supabase email-template steps in their dashboards. Walk him through each one, then record old → new values in `build-snapshot.md`.
4. Check **every** acceptance criterion and save `reports/v2.2.1-acceptance.md` (one row per criterion: pass / fail / partial, with evidence).
5. **Stop rule:** if any 2.2.1 criterion fails, **stop and report before deploying**, and don't start Part B or C.
6. Ask Ryan to approve the deploy. Deploy as **2.2.1**, tag `v2.2.1`, push tags.

### Part B: capture the marketing screenshots (after 2.2.1 is live)
- Capture **S1–S6** exactly as `docs/design/marketing-site.md` §6 describes: demo mode (no Supabase), the "Demo Varsity" team and names listed there, dark theme, the sizes listed, WebP at 2× plus PNG fallback.
- Check every image: **no weights or loads, levels, RPE, check-ins, pain, real names, schools, or logos**, and "Powered by Approach Strength" visible on S1.
- **Show Ryan all six and wait for his OK** before using them.

### Part C: build the marketing site (`docs/specs/marketing-site.md` v1.1)
1. Build it in the `rparker-sudo/approachstrength-site` repo, replacing the placeholder `/`. Words only from `docs/copy/website-copy.md` v1.1; layout and sample data only from `docs/design/marketing-site.md`; prices only from `pricing.json` (spec §6).
2. Plain HTML and CSS. **No JavaScript, no forms or inputs, no cookies, no third-party requests** (fonts self-hosted, lockups outlined).
3. Legal pages keep their URLs and are generated from `docs/legal/` exactly as in Part A.
4. Check every acceptance criterion and save `reports/marketing-site-acceptance.md`. If any fails, **stop and report before publishing**.
5. Ask Ryan to approve, then publish.

## Hard stops (any part)
- `docs/compliance.md` doesn't name `ryan@approachstrength.com`, or `docs/legal/` doesn't say "Approach Strength": **stop and ask** before generating legal pages.
- **Any new table or server field** not listed in the spec: **stop and ask** (Legal rule G-5). The only new fields in this session are `profiles.coach_terms_version` and `profiles.coach_terms_accepted_at` (2.2.1 §8).
- **Any domain, DNS, repo-variable, Pages, or Supabase setting change** not listed in the spec: don't make it. Record every change that is listed.
- **Any text change on the marketing site or legal pages** beyond the docs: don't make it. Ask.
- **No find-and-replace on legal wording** in any script.

## Versions and folders
- **Work in this folder (`~/Projects/approach`, GitHub `rparker-sudo/approach`) and the new `rparker-sudo/approachstrength-site` repo.** Don't create other copies. Commit as you go and tag each release. Keep `CLAUDE.md` and `docs/` in place; they're the planning team's hand-off.
- `~/Downloads/approach-2.0` is an old v2.0 copy. Never work there.

## Always
- Never add analytics, ad, or tracking SDKs, or any new third-party service, without the planning team's approval (`docs/compliance.md`).
- Never add a new server-side data field about users unless the spec lists it (rule G-5). Anything only for the individual athlete (home equipment, etc.) stays on the device (G-3).
- Every session an athlete sees goes through `resolveSession` (G-1). No other code path builds an athlete's session.
- Boards never show weights, loads, RPE, lift test results, estimated maxes, check-ins, pain, bodyweight, nutrition, or experience level (G-4).
- No medical, injury-prevention, treatment, or guaranteed-results claims in user-facing copy (G-6).
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- When you finish a release: bump the version, update `CHANGELOG.md`, and update `build-snapshot.md` (what's built, data stored, services used, known gaps, and every placeholder or judgment call you made). The planning team reads that file.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done. A check that doesn't run counts as a failure.
