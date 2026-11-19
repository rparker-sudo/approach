# Approach Strength: instructions for Claude Code

Approach Strength is a strength-training app for volleyball teams and, from 2.3.0, for personal trainers with adult clients (Expo / React Native, web build first, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

**Live now:** v2.4.0 Training v3 (deployed 11/19, `main` at `a2aede1`), with `/terms` v2.6 on the website. Flags as deployed: `generatorV3` **off**; `catalogV3` and `rackRotation` on. App on `app.approachstrength.com`; website on `approachstrength.com` (repo `rparker-sudo/approachstrength-site`).

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots** (this hand-off: Thu Nov 19, 2026, "2.4.1"). Don't edit `docs/`. If a doc looks wrong, or conflicts with the code or another doc in a way the rules below don't settle, **stop and say so** instead of guessing.

**Precedence when docs disagree:** `docs/compliance.md` → `docs/specs/v2.4.1.md` → `docs/content/` (with `generator-v3-rulings.md` and `programs/home-and-mobility-v3.md` ahead of the older content docs for v3 programs) → `docs/design/user-flows-training-v3.md` → `docs/specs/training-v3.md` → older specs and flows. The "Known conflicts" section below overrides all of them.

| Doc | Version this session expects | What it is |
|---|---|---|
| `docs/specs/v2.4.1.md` | **Draft v1.1** (Thu Nov 19) | **The task.** Parts A, D, B, C |
| `docs/content/generator-v3-rulings.md` | **v1.1** | R-1 to R-6 (Part A) |
| `docs/content/programs/home-and-mobility-v3.md` | **v1.0** | Week table, v3 home and mobility sessions, rulings, examples 1–3 (Part D) |
| `docs/content/training-v3-build-answers.md` | Thu Nov 19 (no version) | Build answers 1–9 (Part B uses 1, 3, 5, 6) |
| `docs/content/exercise-catalog-v3.md` | **v3.1** | Copenhagen box setup, §4c `whyGeneral` |
| `docs/content/programs/warmups.md` | **v1.1** | §1a minutes, §3 counts, §4 ramp-up scope |
| `docs/content/program-design.md` | v3.0 (§8a Vertical pull row updated 11/19: Inverted Row) | Templates, ladders, §9 limits |
| `docs/content/safety-guidelines.md` | v1.5 (§2a step 5 updated 11/19) | Olympic lifts resolve down their ladder |
| `docs/design/user-flows-training-v3.md` | **v1.2** | Adds **F56 Week setup card** (Part D) |
| `docs/compliance.md` | **updated Thu Nov 19 (2.4.0 build rulings; 2.4.1 check)** | § 2.4.1 check (no new fields, two copy fixes); TR3-2 records D-059 |
| Everything else in `docs/` | unchanged since the finish-2.4.0 hand-off (`4c8003e`) | As built |

**Version check (do this first):** if a header above doesn't match, **stop and tell Ryan**.

## Step 0
1. `git pull` on `main`. Confirm `main` has the 2.4.0 deploy (`a2aede1` or later) and `reports/training-v3-acceptance.md` shows no Part 1 failure. If not, stop and ask Ryan.
2. Create branch **`v2.4.1`** from `main`. This hand-off (`CLAUDE.md` and the `docs/` changes) is uncommitted on `main`; it carries over. **Commit it on `v2.4.1` first:** "Planning hand-off: 2.4.1 (generator v3 on, week setup)". Don't commit `.claude/settings.local.json`.
3. Confirm `/terms` on `approachstrength.com` is the v2.6 text (Legal ruling #7). If not, stop and ask Ryan. 2.4.1 doesn't touch the website.
4. Run the version check above. (The spec's own Step 0.3 says "v1.0"; see known conflict 1.)

## Current task: build 2.4.1 (`docs/specs/v2.4.1.md` v1.1)
**Order: Part A → Part D → Part B → Part C.** Version 2.4.1. Branch `v2.4.1`. **No migration.**
- **Part A:** `generatorV3: true` by default with the off switch; R-1 to R-6 exactly as `generator-v3-rulings.md`.
- **Part D:** the Week setup card (UX **F56**) and the generator building each day as its kind, using `home-and-mobility-v3.md` (week table §2, home templates §3, mobility §4, rulings §5, `§6` constants). Remove the `generateV3` relabeling (D2.8). Examples 1–3 are acceptance tests.
- **Part B:** build answers 1, 3, 5, 6; the D-054 guard; D-056.
- **Part C:** waves, bye-week Day 3, 4-day Day 1 pair. Anything not built is listed as "not built" with its fallback confirmed.

## Stop rule and deploy
- If **any Part A or Part D criterion fails** (spec, R-6, home-and-mobility §8, UX F56i), **stop and report. Don't deploy with `generatorV3` on.** Ryan chooses: fix first, or ship the rest of 2.4.1 with `generatorV3 = false`.
- A Part B failure is reported and Ryan chooses.
- Save **`reports/v2.4.1-acceptance.md`** (one row per criterion: pass / fail / partial, with evidence) **before** asking Ryan to approve the deploy. Include the F56f Rebuild behavior as built (known conflict 5) as a Product item.
- Re-run every earlier volleyball and trainer-mode check, **except** the superseded ones in spec §0. Re-run `tsc`, `lint`, `build:web`, `run-all.sh`, the SQL suites (fresh and upgrade), the 2.4.0 browser checks, and the claim-word search **including "durability"** on built strings.
- **Schema diff must be empty and program JSON must gain no new keys.** Say so in `build-snapshot.md`.
- **Deploy steps:**
  1. Ask Ryan to approve the deploy.
  2. Merge `v2.4.1` into `main` and deploy the app. **No migration and no website change.**
  3. Record in `build-snapshot.md` §8 "2.4.1": what was deployed, when, and flag values (`generatorV3` old → new).
  4. Update `CHANGELOG.md` and the app version.
  5. Ryan pushes tag `v2.4.1` from his Mac.

## Known conflicts, already settled
1. **Spec version:** the spec's Step 0.3 says `CLAUDE.md` names "v2.4.1.md v1.0." The doc is **v1.1** (it added Part D). Expect v1.1.
2. **Home templates are in, not out:** spec §5 lists "v3 home templates (home days follow `home-workouts.md`)" as not in 2.4.1. **Part D supersedes that line:** for v3 programs, home and mobility days follow `home-and-mobility-v3.md`. `home-workouts.md` H1–H8 still apply. The A4 fallback ("if those templates aren't saved…") doesn't apply: they're saved.
3. **Where the templates live:** spec A4 and D4 point to `generator-v3-rulings.md` v1.1 for the templates. That doc (v1.1) only points onward; the content is in **`content/programs/home-and-mobility-v3.md` v1.0**. The rulings doc's Part A content is unchanged from v1.0 (spec header says v1.0; either is fine).
4. **Legal copy fixes (compliance § 2.4.1 check), these win over the content docs:**
   - The H-Durability home session is named **"Home Care"** in the app, never "Home Durability." The internal type id `H-Durability` may stay in code.
   - Weight-room coach notes say **"Care work is on Thursday's home workout."** (not "Durability is on…").
   - The R-5 message is **"Your next block uses Approach Strength's new programming."**
   - Any user-facing "durability" becomes "Care" (as in 2.4.0's E-block). The `ssb-squat` line stays Legal's 2.4.0 wording.
5. **F56f Rebuild with coach-edited sessions** (UX left it as a [Product] question): build it as UX drew it. Rebuild regenerates Approach Strength's (`'approach'`) sessions from the next week that hasn't started; sessions a coach edited (`'coach'`) keep their edits. List it in the report for Product to confirm.
6. **UX F56 is saved** (spec dependency D6). Build the card from F56, not the fallback in D6.
7. **Spec dependency statuses are stale:** D2 (Legal recorded D-059 in TR3-2), D5 (Training's templates), D6 (UX F56) and D7 (Legal's check) are all done.
8. **Superseded checks:** spec §0 (G1 → R-1 and G8 → R-2 for v3 programs; Olympic beginner pick; ramp-up scope; warm-up estimates). The 2.3.0 generator (flag off) keeps G1 and G8.
9. **Not in 2.4.1:** the rack-rotation haptic and 10-s "Move to…" line (UX §R5, not scheduled by Product), Pause and per-rack controls, a coach-chosen bar per exercise, the RPE 9–10 note and level-off confirm (D-049), Legal's interim TR3-2 limits. Don't build them.
10. From earlier hand-offs (unchanged): 2.3.1 custom exercises are coach-built content (D-058); level toggle precedence is most specific wins; spotter label "Spot."

## Hard stops (any part)
- **Any new table, column, server field, or program JSON key:** stop and ask (G-5, spec D5, compliance § 2.4.1 check).
- **Any domain, DNS, repo-variable, Pages, or Supabase setting change:** don't make it.
- **Website:** no change in 2.4.1.
- **No find-and-replace on legal wording** in any script.
- **No AI provider, SDK, or call** (TM-18).
- **A general team must never accept a minor** (compliance T1).
- **Another team's events never show to a coach** (Week setup context, R-4, summaries use neutral reasons only).

## Versions and folders
- **Work in this folder (`~/Projects/approach`, GitHub `rparker-sudo/approach`).** Don't create other copies. Keep `CLAUDE.md` and `docs/` in place.
- `~/Downloads/approach-2.0` is an old v2.0 copy. Never work there.

## Always
- No analytics, ad, or tracking SDKs, or new third-party services, without the planning team's approval.
- No new server-side data field about users unless the spec and compliance list it (G-5). Individual-only data stays on the device (G-3); the R-5 "seen" state is on the device.
- Every session an athlete or client sees goes through `resolveSession` (G-1).
- Boards never show weights, loads, RPE, lift test results, estimated maxes, check-ins, pain, bodyweight, nutrition, experience level, or "your version" (G-4).
- No medical, injury-prevention, treatment, or guaranteed-results claims (G-6).
- Earlier checks still pass, except those superseded in spec §0.
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done. A check that doesn't run counts as a failure.
