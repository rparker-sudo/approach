# Approach Strength: instructions for Claude Code

Approach Strength is a strength-training app for volleyball teams and, from 2.3.0, for personal trainers with adult clients (Expo / React Native, web build first, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

**Live now:** v2.3.1 (custom exercises). App on `app.approachstrength.com`; website on `approachstrength.com` (repo `rparker-sudo/approachstrength-site`).
**Built, not deployed:** 2.4.0 Training v3 on branch **`v2.4.0`** (last commit `69cb4ed`; report `reports/training-v3-acceptance.md`). Part 1 passed; `generatorV3` off; `catalogV3` and `rackRotation` on.

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots** (this hand-off: Thu Nov 19, 2026, "finish 2.4.0"). Don't edit `docs/`. If a doc looks wrong, or conflicts with the code or another doc in a way the rules below don't settle, **stop and say so** instead of guessing.

**Precedence when docs disagree:** `docs/compliance.md` → `docs/specs/training-v3.md` → `docs/legal/` → `docs/content/` → `docs/design/user-flows-training-v3.md` → older specs and flows.

| Doc | Version this session expects | What it is |
|---|---|---|
| `docs/compliance.md` | **updated Thu Nov 19** (§ 2.4.0 build rulings #1–#7) | **The rulings this task builds. Every MUST applies** |
| `docs/legal/soft-launch-notice.md` | **Draft v2.6** (Wed Nov 18) | Source for `/privacy` and `/terms` (new §4.1 and §4T.3). Publish exactly; no script edits |
| `docs/specs/training-v3.md` | Draft v1.0 | The 2.4.0 spec (already built) |
| Everything else in `docs/` | unchanged since the 2.4.0 hand-off (`632a16e`) | As built |

**Version check (do this first):** if a header above doesn't match, **stop and tell Ryan**.

## Step 0
1. `git fetch`, then `git checkout v2.4.0` (track `origin/v2.4.0`). This hand-off (`CLAUDE.md`, `docs/compliance.md`, `docs/legal/soft-launch-notice.md`) is uncommitted on `main`; the branch hasn't changed those files, so the changes carry over. **Commit them on `v2.4.0` first** ("Planning hand-off: finish 2.4.0 (Legal rulings 11/19)"). If the checkout refuses, stop and tell Ryan.
2. Read compliance § 2.4.0 build rulings. Legal ruled from a description of the build and asked for the report to be checked against the rulings. Items F1–F4 below are where the build differs.

## Current task: finish 2.4.0 and deploy it with the website
Work on branch `v2.4.0`. Migrations 011–013 **haven't been run on the live project yet**, so fold any SQL change into them (still safe to re-run, still folded into `schema.sql`). **No migration 014.**

**F1. `session.source` legacy rule (ruling #1b).**
- The build migrates sessions saved before 2.4.0 as `'coach'` when the program was posted to a team (or is a trainer program). Legal's rule: coach-built → `'coach'`; generated or personal → `'approach'`; **if you can't tell, `'approach'`** (generated limits apply, the safer direction).
- A posted team program that came from the generator and wasn't edited is **generated**. Use whatever the stored program JSON shows (e.g., generator markers, unedited generator output). Document the rule you used in `build-snapshot.md`.
- Keep #1a (any coach or trainer edit → `'coach'`) and #1c (never on boards).

**F2. Per-athlete "Adjust to level" flag (ruling #2).**
- A plain hash of team id + user id isn't opaque. Use a **keyed hash (HMAC) with a server-side secret** members can't read, and give each athlete **only their own** flag or key through an RPC. Or strip per-athlete flags from the member-readable program copy and serve each athlete's own flag by RPC.
- The secret may live in Supabase Vault or a database setting, created by migration 011 with a random value. Record where in `build-snapshot.md`.
- **If either approach needs a new table or column, stop and ask** (G-5).
- **Acceptance:** a teammate can't tell from the program JSON which members have adjustment off (API check as a teammate). The coach and the athlete still see the right state.

**F3. `my_index` (ruling #3).** Confirm `my_rack` returns the caller's own index only, never partners'. Add an API check.

**F4. Terms v2.6 and re-acceptance (ruling #7). This goes live with the app, not after.**
1. **App:** bump the **Coach Terms** and **Trainer Terms** versions to **`2026-11-19`**:
   - the constants (`COACH_TERMS_VERSION`, `TRAINER_TERMS_VERSION`);
   - the server side (`current_coach_terms` and whatever the trainer check reads), in migration 011.
   Existing coaches re-accept through the existing Coach Terms sheet before recording consent or confirming supervision. Trainers re-accept before posting new programs (compliance T2). No new fields.
2. **Website (`rparker-sudo/approachstrength-site`):** regenerate `/privacy` and `/terms` from `docs/legal/soft-launch-notice.md` **v2.6** with the existing generator. Anchors `#health-data` and `#trainer-terms` stay. `legal-pages-match.py` must pass. **No other website change.**

**F5. UX sign-off.** In `reports/training-v3-acceptance.md` § UX sign-off, add UX's verdicts (UX `user-flows-training-v3.md` v1.1 §R, 11/19):

| # | Deviation from v1.0 | UX verdict |
|---|---|---|
| R1 | "Approach Strength" instead of "Approach" in new copy | Accepted (D-035) |
| R2 | Level toggle: most specific wins; session toggle enabled with "Program setting: Off" | Accepted (the spec wins) |
| R3 | Spotter label "Spot"; athlete line "Spot the next lifter." | Accepted (Legal V3) |
| R4 | Reorder with ↑/↓ and "To Raise/Activate/Potentiate," no drag | Accepted |
| R5 | No full-width 0:00 banner; cue in the countdown; Go to Position n | Accepted for 2.4.0; rotation haptic and a 10-s "Move to…" line in 2.4.1 |
| R6 | One room clock; Pause and per-rack controls not built | Accepted as deferred; UX9 stays partial |
| R7 | F45a items (Start stations never blocked, info line, home-jumps toggle, any RPE, F41 5–180) | Confirmed |
| R8 | "Unpair" and "Review" raised to 44 pt | Confirmed |

UX sign-off: UX1–UX8 pass, UX9 partial, UX-a11y pass. No UX item blocks the deploy.

**F6. Report.**
- Add a section "Legal rulings 11/19" to `reports/training-v3-acceptance.md`, one row per ruling #1–#7 with pass/fail and evidence. #2 and #7 must show the fix (compliance "Still open": confirm the keyed hash and the Terms bump in the report).
- Update `build-snapshot.md` §8 "2.4.0" and `CHANGELOG.md`.
- Re-run `tsc`, `lint`, `build:web`, `run-all.sh`, the SQL suites (fresh and upgrade, 011–013 twice), and the 2.4.0 browser checks.

## Stop rule and deploy
- If **any of F1–F4 fails**, or any Part 1 criterion now fails, **stop and report. Don't deploy.**
- **The app and the website deploy together.** If the website can't ship in the same session, **don't deploy the app** (Legal ruling #7).
- **Flags stay as built:** `generatorV3` **off**, `catalogV3` and `rackRotation` on. Turning the generator on is 2.4.1's job, not this one.
- **Deploy steps:**
  1. Ask Ryan to approve the deploy.
  2. Ryan runs migrations 011 → 012 → 013 on the live project (service role).
  3. Merge `v2.4.0` into `main` (app) and deploy.
  4. Regenerate and deploy the website from its `main`.
  5. Record both in `build-snapshot.md`: what was deployed, when, and any setting changed (old → new).
  6. Ryan pushes tag `v2.4.0` from his Mac.

## Known conflicts, already settled (from the 2.4.0 hand-off; unchanged)
1. 2.3.1 custom exercises are coach-built content; their builder limits are gone, and their tags still drive resolution, warm-ups and auto-rest suggestions (D-058).
2. Level toggle precedence: most specific wins (athlete off → session → program).
3. Legal copy: `ssb-squat` line; E-block shows "Care," never "Durability"; spotter shows "Spot."
4. No dismiss-once RPE 9–10 note and no level-off confirm for minors (D-049).
5. Product rulings D-051–D-058 are in the planning project. Nothing in them changes this task.

## Hard stops (any part)
- **Any new table or server field** not covered by compliance V4/T4 or earlier approvals: **stop and ask.**
- **Any domain, DNS, repo-variable, Pages, or Supabase setting change** beyond F2's secret: don't make it.
- **Website:** only the `/privacy` and `/terms` regeneration in F4. No other text change.
- **No find-and-replace on legal wording** in any script.
- **No AI provider, SDK, or call** (TM-18).
- **A general team must never accept a minor** (compliance T1).

## Versions and folders
- **Work in this folder (`~/Projects/approach`, GitHub `rparker-sudo/approach`) and `rparker-sudo/approachstrength-site`.** Don't create other copies. Keep `CLAUDE.md` and `docs/` in place.
- `~/Downloads/approach-2.0` is an old v2.0 copy. Never work there.
- **2.4.1** (generator v3 on) is specced (`product/specs/v2.4.1.md`), but it isn't this task. It's handed off after 2.4.0 is live.

## Always
- No analytics, ad, or tracking SDKs, or new third-party services, without the planning team's approval.
- No new server-side data field about users unless the spec and compliance list it (G-5). Individual-only data stays on the device (G-3).
- Every session an athlete or client sees goes through `resolveSession` (G-1).
- Boards never show weights, loads, RPE, lift test results, estimated maxes, check-ins, pain, bodyweight, nutrition, experience level, or "your version" (G-4).
- No medical, injury-prevention, treatment, or guaranteed-results claims (G-6).
- Earlier checks still pass, except those marked "superseded (§0.3)."
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done. A check that doesn't run counts as a failure.
