# Approach Strength: instructions for Claude Code

Approach Strength is a strength-training app for volleyball teams and, from 2.3.0, for personal trainers with adult clients (Expo / React Native, web build first, Supabase). Read `AGENTS.md` for Expo-specific rules. They still apply.

**Live now (per `build-snapshot.md`):** v2.3.1 (custom exercises, deployed 11/16) on top of 2.3.0 trainer mode (deployed 11/16). App on `app.approachstrength.com`; website on `approachstrength.com` (repo `rparker-sudo/approachstrength-site`). Local `main` was 1 commit behind `origin/main` at hand-off.

## Where requirements come from
The planning team works in a separate Claude project. Approved docs are copied into `docs/` as **read-only snapshots** (hand-off of Wed Nov 18, 2026). Don't edit `docs/`. If a doc looks wrong, or conflicts with the code or another doc in a way the rules below don't settle, **stop and say so** instead of guessing.

**Precedence when docs disagree:** `docs/compliance.md` → `docs/specs/training-v3.md` → `docs/legal/` → `docs/content/` (program-design, catalog v3, warm-ups, safety, adult rules, then the rest) → `docs/design/user-flows-training-v3.md` → older specs and flows.

| Doc | Version this session expects | What it is |
|---|---|---|
| `docs/specs/training-v3.md` | **Draft v1.0** (Wed Nov 18) | **The current task: 2.4.0, Parts 1 → 2 → 3.** §0.3 lists the earlier criteria it supersedes |
| `docs/compliance.md` | **updated Wed Nov 18** (§ Training v3 review, V1–V5; risks TR3-1, TR3-2) | **Hard rules. Every MUST applies to all work.** V4 + T4 + earlier approvals = the complete list of new server fields allowed |
| `docs/content/program-design.md` | **v3.0** | §4a session length, §4b rack rotation, §1–§9 generator v3, §10 coach freedom |
| `docs/content/exercise-catalog-v3.md` | **v3.0** | 66 exercises (code-ready §4), 5 equipment items, link updates, acceptance §7 |
| `docs/content/programs/warmups.md` | **v1.0** | `buildWarmup`, `rampSetsFor`, pools, special sessions, acceptance §9 |
| `docs/content/safety-guidelines.md` | **v1.5** | R2/R6 now generated-only; §2a step 7 changed; §4 depth jumps |
| `docs/content/adult-training-rules.md` | **v1.0 + 11/18 coach-freedom banner** | A1, A3, §4, §5 now generated-only; A2, A4, A7, A8 unchanged |
| `docs/content/tagging-taxonomy.md` | **v1.3** | Part D: v3 tags |
| `docs/content/programs/rest-and-supersets.md`, `circuits-and-stations.md`, `home-workouts.md` | **v1.0 + 11/18 coach-freedom banner** | Their rules now drive `'approach'` sessions and suggestions only |
| `docs/content/general-library.md` | **v1.0 + 11/18 notes** (§3 scope, §6 W1–W3 superseded) | |
| `docs/content/drill-library.md` | **v1.0 + 11/18 §5** | |
| `docs/design/user-flows-training-v3.md` | **v1.0** (Wed Nov 18) | Screens F45–F55 and the UX acceptance list |
| `docs/legal/soft-launch-notice.md`, `parent-consent-form.md`; `docs/specs/trainer-mode.md` v0.3, `v2.2.1.md`, `v2.2.md`, `rack-groups.md`, `marketing-site.md`, `v2.1-*.md`; `docs/design/trainer-mode.md` v1.0, `user-flows*.md`, `marketing-site.md`; other `docs/content/` | unchanged | Reference for what's already built |

**Version check (do this first):** if any header above doesn't match the version in this table, **stop and tell Ryan**.

**Older design docs:** `docs/design/user-flows*.md` and `docs/design/trainer-mode.md` still draw the old blocked/red/amber builder states. **F45 supersedes them**, including the `trainer-mode.md` §S1b "Effort clamp" and "Circuit clamp" strings. Delete those strings; don't move them into tooltips.

## Step 0: before any code
1. `git pull` (main was behind by 1). Commit this planning hand-off (`CLAUDE.md` + `docs/`) first if it isn't committed.
2. Spec Step 0.1: 2.3.0 is merged on `main` and `reports/v2.3.0-acceptance.md` had no failed rows at hand-off. Confirm both. If either isn't true, **stop and ask Ryan**.
3. Spec Step 0.3: record in `build-snapshot.md` that 2.3.0 and 2.3.1 are deployed. The C31 G3/G4 blocker is **closed**: Ryan confirmed Legal approved the trainer wording on 11/16 (snapshot §8). Training v3 doesn't change it.

## Current task: build 2.4.0 Training v3 (`docs/specs/training-v3.md` v1.0)
1. Branch `v2.4.0`. Build **Part 1, then Part 2, then Part 3.** Commit at the end of each part.
2. Migrations `011_training_v3_p1.sql`, `012_training_v3_p2.sql`, `013_training_v3_p3.sql`, each safe to re-run, folded into `schema.sql`. Add "Upgrading from 2.3.1" steps to the README (Ryan runs them in order after 010).
3. Flags `catalogV3`, `rackRotation` (Part 2) and `generatorV3` (Part 3), exactly as spec "Build plan" says. `generatorV3` defaults **on only if every Part 3 criterion passes**; otherwise **off**, and the 2.3.0 generator stays live and unchanged.
4. **Website: no changes in this release.** Don't touch `rparker-sudo/approachstrength-site`.
5. Check **every** acceptance criterion and save **`reports/training-v3-acceptance.md`** (one row per criterion: pass / fail / partial, with evidence) **before** asking Ryan to approve the deploy. Include all of:
   - spec Part 1, Part 2, and Part 3 criteria (they already copy warmups §9, program-design §4a/§4b, and catalog §7);
   - `user-flows-training-v3.md` "Acceptance (UX sign-off)" Parts 1 and 2;
   - compliance § Training v3 review **V2** (every unchanged item: consent and the six permissions, testing eligibility and the supervision lock, no 1RM feature, board privacy including the rotation ring, G3/G4, adults-only trainer teams, TM-19, T1–T11) and **V3** (claim-word search on the built catalog and warm-up text);
   - **a re-run of every earlier volleyball (v2.2, 2.2.1) and trainer-mode (2.3.0) check, and the 2.3.1 custom-exercise checks.** A check listed in spec §0.3, or one that tests a builder block now removed, is marked **"superseded (§0.3)"** with the row it maps to. It's never marked pass or silently dropped. Every other earlier check must still pass.
6. **Stop rule:** if **any Part 1 criterion fails**, **stop and report. Don't deploy.** A Part 2 failure: report it and let Ryan choose to hold the deploy or ship with that feature's flag off. A Part 3 failure: `generatorV3` ships off. No failure is ever listed as pass.
7. **Deploy precondition:** see "Known conflicts" item 7 (`session.source`). Ask Ryan before deploying.
8. Ask Ryan to approve the deploy. Ryan runs migrations 011–013 on the live project. Deploy the app as **2.4.0**, tag `v2.4.0`, and update `CHANGELOG.md` (a section per part) and `build-snapshot.md` (every new table and column with its compliance V4/T4 row, every flag's state, every judgment call).

## Known conflicts, already settled
1. **Baseline:** the spec says 2.2.1 is live. It's actually **2.3.1** (custom exercises, an owner request outside the specs). Build on 2.3.1. Don't change 2.3.1's behavior except as item 2 says.
2. **2.3.1 custom exercises are coach-built content.** Their type, movement, and level still drive `resolveSession`, the level toggle, warm-up session types, and auto rest **suggestions**. But the builder limits 2.3.1 applied through the type (rest floors, pairing rules, effort caps, the trainer RPE 8 cap) are **builder blocks and come out** for coach-built sessions, like everything else in §1.1. The 2.3.1 checks that test those blocks are "superseded (§0.3)."
3. **Level toggle precedence:** the spec wins over UX F46. **Most specific wins:** athlete override (off-only, `levelAdjustOffFor`) → session override (`session.levelAdjust`, on or off) → program setting. So the session toggle stays **enabled** when the program is off (show "Program setting: Off" instead of UX's disabled "Off for this program"), and a session set **on** adjusts even if the program is off. An athlete in `levelAdjustOffFor` always gets the written program. List it in the report for UX.
4. **Legal's copy fixes (compliance V3) win over the content docs:**
   - `ssb-squat` why text: **"Heavy squatting with your hands on the handles in front."** (not the catalog's "…easier on the shoulders").
   - The E-block's user-facing label is **"Care"** (e.g., "Care circuit," "Shoulder care"), never "Durability," anywhere users can see it. "Durability" may stay in code identifiers and internal comments only.
   - The rotation spotter position's user-facing label is **"Spot"**, not "Spot and coach." Athlete line: "Spot: Ava R. on Back Squat" (or "Spot the next lifter"). Builder row and board node: "Spot."
   - Re-run the claim-word search on all new catalog, warm-up, and builder strings.
5. **Dismiss-once RPE 9–10 note:** **not built** (D-049, spec §1.1). Legal's TR3-1 recommendation (the note, and a confirm when turning level adjust off for a minor) is the founder's call and wasn't adopted. Don't build either. List them in the report.
6. **Generated-program content (TR3-2):** build exactly as the spec says (depth jumps, contrast pairs, clusters, waves for advanced athletes with a **coach-confirmed** level; ≤ 85% minors). Legal's stricter interim recommendation wasn't adopted by the founder. List it in the report.
7. **New fields and G-5:**
   - Allowed new tables/columns: `warmup_templates`; `teams.default_warmup`, `teams.default_warmup_template_id`; the limited-space setting; `live_progress.position_index` (+ existing `rotate_at`); and the fields in spec §1.5 and §2.2 that compliance V4 lists.
   - Program-content keys stored **inside the existing program/session JSON** (no new column) are allowed: `levelAdjust`, `levelAdjustOffFor`, `warmup`, `sessionMinutes`, `minutesByWeekday`, `targetMinutes`, `fitLog`, `format`, `rotation`, and Part 3's `block`, `method`, `pct`, slot ladders. `CalendarEvent.roomMinutes` follows calendar visibility: never shown to another team's coach (V4).
   - **`session.source`** is in spec §1.5 but **not in compliance V4's table.** Build it inside the session JSON. **Before the deploy, ask Ryan whether Legal confirmed `session.source`.** Don't deploy until he answers.
   - Anything else (a new table, or a new column not listed here): **stop and ask** (G-5).
8. **Superseded 2.3.0 settlements:** the combined weekly cap block at post (old item 2) and the "minors rules as warnings" item (old item 8) are **removed**. The trainer post screen shows the combined weekly count as information only. Unchanged from 2.3.0: the class board defaults off for clients, an unverified trainer can build but not post, the F40 equipment-removed warning, `teams.kind` locked once a team has members, no "Return to training" string, adult volleyball "Your choices" defaults unchanged.
9. **Trainer warm-ups:** generated warm-ups (warmups §5) **replace** W1–W3 in trainer mode. General-library §8's "Warm-ups W1–W3 available" row is "superseded (§0.3)."
10. **UX items Product hasn't confirmed; build as drawn and list in the report:**
    - F41 cardio stepper 5–180 min (duration and Easy/Moderate only stay; adult rule A4).
    - F55a one room clock with a per-rack override.
    - F46c per-athlete toggle stored per program.
11. **Spec cross-reference:** "§3.5" in spec §0.3 (Gate 3) means the Part 3 **Limits** criteria.

## Hard stops (any part)
- **Any new table or server field** not covered by "Known conflicts" item 7, compliance V4/T4, or earlier approvals: **stop and ask.**
- **Any domain, DNS, repo-variable, Pages, or Supabase setting change** not listed in the spec: don't make it. Record every change you do make (old → new) in `build-snapshot.md`.
- **Any text change on the website or legal pages:** don't make it in this release.
- **No find-and-replace on legal wording** in any script.
- **Any AI provider, SDK, or call:** don't add it (TM-18).
- **A general team must never accept a minor** (compliance T1). If any path allows it, stop.
- **No path may weaken the things that still apply to every session** (spec §0.2): consent, testing eligibility and the supervision lock, no 1RM feature for minors, board privacy, TM-19 posting, the G3 message. If removing a builder block would touch one of these, stop and ask.

## Versions and folders
- **Work in this folder (`~/Projects/approach`, GitHub `rparker-sudo/approach`).** Don't create other copies. Commit as you go and tag the release. Keep `CLAUDE.md` and `docs/` in place; they're the planning team's hand-off.
- `~/Downloads/approach-2.0` is an old v2.0 copy. Never work there.

## Always
- Never add analytics, ad, or tracking SDKs, or any new third-party service, without the planning team's approval (`docs/compliance.md`).
- Never add a new server-side data field about users unless the spec and compliance list it (rule G-5). Anything only for the individual (home equipment, etc.) stays on the device (G-3).
- Every session an athlete or client sees goes through `resolveSession` (G-1). No other code path builds a session. Generated-program limits live there (and in the generator and suggesters), keyed to `source = 'approach'`, never in the builder.
- Boards never show weights, loads, RPE, lift test results, estimated maxes, check-ins, pain, bodyweight, nutrition, experience level, or "your version" (G-4). That includes the "Warming up" tile state and the rotation ring.
- No medical, injury-prevention, treatment, or guaranteed-results claims in user-facing copy (G-6). Run the claim-word search on every new string.
- **Earlier checks still pass.** Every v2.2.x volleyball check and every 2.3.x trainer-mode check passes, except the ones spec §0.3 supersedes (marked "superseded," never "pass").
- Keep `local.ts` (demo mode) in step with `supabase.ts`.
- When you finish a release: bump the version, update `CHANGELOG.md`, and update `build-snapshot.md` (what's built, data stored, services used, flags, known gaps, and every placeholder or judgment call you made). The planning team reads that file.
- Run `npx tsc --noEmit`, `npx expo lint`, and `npm run build:web` before calling anything done. A check that doesn't run counts as a failure.
