# Spec: Training v3 (Approach Strength 2.4.0)
Owner: Product Strategy (01), with Training Content (02), UX/UI (03), Legal (07) · Draft v1.0 · Wed Nov 18, 2026
Source of truth: Approach project → `product/specs/training-v3.md`. Repo copy is a snapshot; don't edit it there.
Decisions: **D-043 to D-050** (`product/decision-log.md`, founder direction 11/18). Content: `content/program-design.md` v3.0, `content/exercise-catalog-v3.md` v3.0, `content/programs/warmups.md` v1.0, `content/safety-guidelines.md` v1.5, `content/adult-training-rules.md` v1.0 (with its 11/18 coach-freedom banner). Screens: `design/user-flows-training-v3.md` (UX, same day). Compliance: `legal/compliance-v2.1.md` (Legal's same-day Training v3 review).
**Unreviewed by a CSCS** (accepted risk, D-050).

## Summary
Four founder decisions change how Approach trains athletes:
1. **Coach freedom:** the builder never blocks a coach or trainer. Approach's training rules shape only what **Approach generates or suggests**.
2. **One plan, exercise switches:** lower-level athletes get the same plan with easier exercises; a toggle lets the coach turn switching off.
3. **A session-specific warm-up on every workout**, and **coach-set session length** with **Fit to time**.
4. **College-level Approach programming** (blocks, session architecture A–E, movement ladders, a 66-exercise catalog) and a third session format, **rack rotation**.

## Baseline and Step 0
**Baseline:** 2.3.0 (trainer mode Phase A + B, no AI) as built from `trainer-mode.md` v0.3 on `origin/main` (hand-off `e034bdb`), on top of 2.2.1 (live).
**Step 0 (MUST, before any code):**
1. `git pull`. If 2.3.0 isn't merged on `main`, or `reports/v2.3.0-acceptance.md` shows any Phase A failure, **stop and ask Ryan**. Training v3 builds on 2.3.0.
2. `CLAUDE.md` names this spec as **training-v3.md v1.0**; stop if `docs/specs/` has another version.
3. Record in `build-snapshot.md` whether 2.3.0 is deployed, and its deploy blockers (C31 G3/G4 wording). Training v3 doesn't change them.

## Build plan
- **Version 2.4.0.** Branch `v2.4.0`. Migrations `011_training_v3_p1.sql`, `012_training_v3_p2.sql`, `013_training_v3_p3.sql`, each safe to re-run. (The trainer AI assistant, formerly "2.3.1," takes the next free version and migration number when it's specced.)
- **Build order: Part 1 → Part 2 → Part 3.**
- Save **`reports/training-v3-acceptance.md`** (one row per criterion: pass / fail / partial) **before** asking Ryan to approve the deploy.
- **Stop rule:** **no deploy if any Part 1 criterion fails.**
- **Part 2 and Part 3:**
  - Part 3 ships behind a flag, `generatorV3` (default **on** only if every Part 3 criterion passes; otherwise **off**, and the 2.3.0 generator stays live).
  - If a Part 2 criterion fails, report it. Ryan chooses to hold the deploy or ship with that Part 2 feature flagged off (`catalogV3`, `rackRotation`).
- **Re-run** every earlier volleyball and trainer-mode check **except the superseded criteria listed in §0.3** (they now test the opposite behavior).
- Version, CHANGELOG (a section per part), `build-snapshot.md`, tag `v2.4.0`.

---

# §0. Definitions and what this supersedes

## 0.1 Generated vs. coach-built (D-045)
- Every session has `source: 'approach' | 'coach'`.
  - `'approach'`: produced by the Approach generator (volleyball generator, home-week "Recommend," trainer goal defaults applied by Approach).
  - `'coach'`: built or edited by a coach or trainer.
- **Editing a generated session changes it to `'coach'`** (program-design §10: "once a coach edits, it's their program"). Editing means changing any exercise, set, rep, effort, rest, grouping, order, or station, but **not** the warm-up, session length, or level toggle. Existing sessions migrate as `'coach'` if a coach posted them, `'approach'` if they came straight from the generator.
- **Generated-program limits** (program-design §9; `safety-guidelines.md` R2, R6, §4; `rest-and-supersets.md` §3 floors and §4b; `circuits-and-stations.md` C1–C5 and Part 2a; `home-workouts.md` H1–H5; `adult-training-rules.md` A1, A3, A5, §4, §5) are applied **inside `resolveSession` and the generator for `source = 'approach'` sessions only**, and to Approach's **suggestions** (auto rest, auto-pairing, Fit to time, stations auto-split, rotation suggestions).

## 0.2 What still applies to every session (MUST, unchanged)
These aren't building rules (program-design §10; Legal owns them):
- consent and permissions
- testing-day eligibility and the supervision lock (D-020)
- no true 1-rep-max feature for minors
- board privacy (G-4)
- claim-free app copy
- adults-only trainer teams, and the TM-19 trainer verification (an unverified trainer can build but not post)
- the athlete-facing pain message (G3)
- level gating of **testing** (load tests need a coach-confirmed level ≥ 2 for minors; D-031)
- trainer-mode features that aren't limits: no testing in general teams (A2), cardio by duration only (A4), no condition-specific fields (A7), no weight-loss fields (A8)

## 0.3 Superseded acceptance criteria (don't re-run as written)
| Earlier criterion | Now |
|---|---|
| v2.2 §1.6 / D-028: builder blocks RPE 9, "to failure," "max" for minors; warns on adult teams | No block or warning in the builder (D-045, D-049). `resolveSession` caps effort for `'approach'` sessions only. |
| v2.2 §1.5: coach rest below tier floors reset to the floor with a message | Coach rest saves as typed; auto rest shown as a suggestion ("Auto 3:00"). Floors apply to `'approach'` sessions and suggestions. |
| v2.2 §1.9.1 / C14: no path can create a week over the lift-day cap (per writer) | Applies to **generated** weeks and **Recommend** only. Coach-built weeks accept any number of days. |
| v2.2 §3.2 / §3.3 / §3.4 and `rest-and-supersets.md` / `circuits-and-stations.md` builder blocks (blocked pairs, circuit C1–C5, power/heavy in Part 2, AMRAP on tier B for minors) | No blocks or reasons in the builder; Approach's auto-pairing, auto-circuits, and stations auto-split still follow those rules. |
| v2.2 §3.1 / `home-workouts.md` H1–H5 per-athlete caps; H6 exclusions as blocks | Generated/recommended home weeks only; H6 is a suggestion filter. |
| `trainer-mode.md` v0.3 §B5 and B11 rows: builder blocks RPE > 8, "failure," "max," AMRAP/for time in general teams | No blocks; `resolveSession` caps `'approach'` sessions at RPE 8 (adults). |
| `adult-training-rules.md` §10 rows 1, 4, 6 (RPE/AMRAP blocks; combined caps blocked at post; "minors" rules as warnings) and `CLAUDE.md` 2.3.0 settlement "combined weekly caps across programs blocked at post" | Removed for trainer-built programs. Combined caps apply only when Approach builds or suggests. The post screen may **show** the combined weekly count (information, not a block). |
| `safety-guidelines.md` §2a step 7 ("coach can't force a harder exercise on one athlete") | The coach can turn **Adjust to level** off for an athlete (§1.2). |
**Gate 3 before the first minor** ("G2 calendar cap") now means: generated weeks respect R6, tested by the criteria in §3.5. Legal confirms in its same-day review.

---

# PART 1 · Coach freedom, level toggle, warm-ups, session length (must ship)

## 1.1 Remove every builder block (D-045)
For **volleyball and general teams**, in every builder, editor, and post flow (team program builder, session editor, superset/circuit grouping, stations builder, home-week editor, calendar lift-day pickers, trainer program builder, post screen):
1. **Effort:** any text or RPE saves. No block, no warning, no dismiss-once note (D-049: the RPE 9–10 note isn't included). Remove D-028's clamp and the adult A1 block.
2. **Rest:** any value, including 0. Show the auto value beside the field as a suggestion ("Auto 3:00"). No floors, no messages, no reset.
3. **Supersets and circuits:** group any exercises, any number, any tiers, any order; reps, timed, AMRAP, or for time. No blocked pairs or reasons. Remove the "Supersets are for 2 strength exercises" and similar blocked-pair messages.
4. **Stations:** any exercise in any station, any order, any time. Auto Part 1 / Part 2 is a suggestion; dragging power or heavy lifts into a station is allowed with no message. "More racks than stations" stays a **setup** check (it's about whether the format can run), shown as information, not a block on saving.
5. **Days per week and volume:** any number of days and sessions in coach-built programs (volleyball and trainer), including the calendar day pickers and the trainer post screen. Show the week's count. **Combined caps across programs aren't enforced at post** (supersedes the 2.3.0 setting).
6. **Order:** anything; no warnings about power or tier A placement.
7. **Home sessions:** the coach can put any exercise in a home session (H6 becomes a filter in the picker's default view, with "Show all exercises").
8. **Keep:** testing-day rules, consent, verification, and the other §0.2 items.
**Where the rules move:** `resolveSession` and the generator apply program-design §9 (and the adult rules for general teams) to `source = 'approach'` sessions only. Approach's **suggestions** (auto rest, auto-pairing, auto-circuits, stations split, Fit to time) follow the same rules.

## 1.2 "Adjust exercises to each athlete's level" toggle (D-044)
- **Three levels, most specific wins:** program setting → session override → athlete override (per program). Default **on**.
- **When on:** athletes get their ladder rung (G8 resolution, D-031 lower level across teams), **and** the G9 easing-back-in adjustment applies (both are athlete-layer changes to what the coach wrote).
- **When off:** every athlete gets exactly what the coach wrote: same exercises, same effort, no easing-back-in changes. The athlete sees no "Your version" line.
- **Approach-generated sessions** always resolve to the athlete's rung (the plan is written at the top rung, program-design §8). If a coach turns the toggle off on a generated session, the session becomes `'coach'` (§0.1).
- **Doesn't change:** testing eligibility (D-031), board privacy, or anything in §0.2.
- **Data:** `program.levelAdjust: boolean` (default true), `session.levelAdjust?: boolean`, `program.levelAdjustOffFor?: string[]` (user ids). No new table.
- **Coach UI (UX):** program settings toggle, a per-session override in the session editor, and a per-athlete row in athlete detail ("Adjust to Jordan's level: On / Off for this program"). When off for someone, coach detail shows "Exercises not adjusted for Jordan."

## 1.3 Session-specific warm-ups (D-046)
Build `content/programs/warmups.md` **exactly** (§1–§7):
- `buildWarmup(session, ctx)`: RAMP (Raise / Activate & mobilize / Potentiate) from the session's primary patterns and A-block type; pool rotation across the week; equipment and limited-space rules; position add-on; compact version for fit-to-time.
- `rampSetsFor(exercise, workingWeight, ctx)`: ramp-up sets before each loaded tier A/P exercise, logged as `warmup: true`, never counted as work sets or used for weight suggestions.
- **Special sessions** per §5 (home, light home and extra recovery have none, testing day unchanged, stations, deload, trainer mode with easy cardio from the gym profile).
- **Coach control** per §6: generated by default for **every** session (Approach and coach-built, volleyball and trainer, gym and home); edit, swap, reorder, add, save as template, remove; once edited it stops auto-regenerating, with a **Regenerate** button; team setting **"Default warm-up: Approach / My template / None."**
- **Replaces** the fixed W1–W3 warm-ups (`general-library.md` §6) in trainer mode.
- **Data:** `Session.warmup?: { raise; activate; potentiate; edited?: boolean }`; new table `warmup_templates (id, team_id, created_by, name, items jsonb, created_at)` (coach-private, no athlete data); `teams.default_warmup: 'approach' | 'template' | 'none'` plus `default_warmup_template_id`.
- **Athlete view:** Warm-up card at the top of the session (three parts, items linked to how-to, one **Done** per part). **Board:** tile state "Warming up" only.
- Uses only exercises that exist in the library at build time. The movement-prep drills referenced in the pools (`a-skip`, `lateral-shuffle`, `carioca`, `high-knees`, `walking-knee-hug`, `walking-quad-stretch`, `push-up-plus`, `wall-slide`, `er-90-90-iso`, `band-lateral-walk`, `short-lever-copenhagen`, `soleus-calf-raise`, `cmj`, `line-hops`, `skater-hop`) come from catalog v3. **Add these 15 entries in Part 1** (code-ready in `exercise-catalog-v3.md` §4), so warm-ups work tonight; the rest of the catalog is Part 2.

## 1.4 Session length and Fit to time (D-047)
Build `content/program-design.md` **§4a exactly**:
- **Where set:** program default (20–120 min, 5-min steps, quick picks 30 · 45 · 60 · 75 · 90); per weekday; per date from the team calendar ("Weight room time on Wed Dec 3: 30 min"). Unset uses the phase targets in §4 (trainer mode: 45–60 gym, 30 home).
- **Estimate** = warm-up + ramp-up sets (about 1 min each) + every set's work and rest (`rest-and-supersets.md` §5) + transitions. Shown against the target in the builder and on the athlete's Today ("about 52 min · your target 45").
- **`fitSession(session, targetMinutes, ctx)`**: pure function with the 7-step trim order. Rest is never shortened in generated sessions; the B-block and warm-up are never removed; the warm-up compacts to ≥ 6 min (5 in-season); targets under about 25 min build an **Express session**; under-target by 8+ min adds back in reverse order without exceeding A/B prescriptions.
- **Generated sessions:** fitted automatically; the coach sees each trim as a line ("Fit to 45 min: accessories cut to 2 sets, …") with **undo** per line.
- **Coach-built sessions:** **Fit to time** offers the same trims as suggestions; nothing changes until the coach applies one; saving is never blocked.
- **Stations:** station time = (session length − warm-up − Part 1 − finish) ÷ stations − 1 min transition.
- **Before Part 3:** the 2.3.0 generator's sessions don't have A–E blocks. Until `generatorV3` is on, `fitSession` maps the old slot roles to blocks (power → A, main → B, secondary → C, accessory/core → D, care/mobility → E) so automatic fitting works on today's generated sessions.
- **Data:** `program.sessionMinutes?`, `program.minutesByWeekday?: (number|null)[7]`, `CalendarEvent.roomMinutes?`, `session.targetMinutes`, `session.fitLog: string[]`.

## 1.5 Legal and data (Part 1)
New fields (Legal's same-day review confirms none is health data): `session.source`, `program.levelAdjust`, `session.levelAdjust`, `program.levelAdjustOffFor`, `Session.warmup`, `warmup_templates`, `teams.default_warmup(_template_id)`, `program.sessionMinutes`, `program.minutesByWeekday`, `CalendarEvent.roomMinutes`, `session.targetMinutes`, `session.fitLog`, log rows with `warmup: true`. No new data about athletes beyond what's logged today. If Legal's review flags any field, follow its note.

## Part 1 acceptance criteria
**Coach freedom (§1.1)**
- [ ] On a volleyball team with minors, a coach can save "RPE 10," "to failure," "max," and "AMRAP" in a strength slot, with no block, warning, or note (UI and API).
- [ ] A coach can set rest 0:30 on a back squat; it saves as typed; "Auto 3:00" shows as a suggestion.
- [ ] A coach can pair two tier A lifts, put a power lift in a circuit of 5, and put a hang clean in a station; all save with no message.
- [ ] A coach can post 6 lift days a week to a beginner minor and 7 sessions to a trainer client; no block at post; the trainer post screen shows the combined weekly count as information.
- [ ] A coach can add a barbell exercise to a home session via "Show all exercises."
- [ ] Testing eligibility, the supervision lock, consent, TM-19 posting, board privacy, and the G3 message still behave as before (re-run their checks).
- [ ] Code search finds no builder-side block for effort, rest, pairing, circuits, stations, order, or weekly days; the rules live in `resolveSession`/generator/suggestion code paths keyed to `source = 'approach'`.

**Generated sessions keep the rules (§0.1)**
- [ ] A volleyball generated session still meets program-design §9 for minors (RPE caps, rest floors, R6 caps, plyo caps) via `resolveSession`, and a trainer goal-default session stays at RPE ≤ 8.
- [ ] Editing a generated session's exercise or effort flips it to `source = 'coach'`; editing only its warm-up, length, or level toggle doesn't.
- [ ] Approach's suggestions (auto rest, auto-pairing, stations auto-split, Fit to time) follow the old rules.

**Level toggle (§1.2)**
- [ ] Default on: a beginner on an advanced program gets Goblet Squat for Front Squat (§2a criteria still pass).
- [ ] Program off: every athlete gets exactly the coach's exercises and effort; no "Your version" line; no G9 adjustment.
- [ ] Session override and athlete override work, and the most specific setting wins.
- [ ] Toggling off doesn't change testing eligibility (a minor beginner still can't load-test).

**Warm-ups (copied from `warmups.md` §9)**
- [ ] Every session (generated or coach-built, volleyball or trainer mode, gym or home) shows a Warm-up card with Raise, Activate, and Potentiate built per §2–§3, except light home days, extra recovery, and testing days (which use their own).
- [ ] A squat-first session's Activate items come from the Lower: squat pool; an upper pull session's from the Upper: pull pool; a session with an Olympic derivative gets the empty-bar complex.
- [ ] Ramp-up sets appear before each loaded tier A/P exercise per §4, are logged as warm-up, and never affect weight suggestions.
- [ ] Changing a session's main lift regenerates its warm-up unless the coach edited it; edited warm-ups keep the coach's version and show "Regenerate."
- [ ] Limited space uses in-place Raise drills; home sessions use no-equipment items only.
- [ ] The coach can save a warm-up template and set the team default to Approach / template / none.
- [ ] *(Product)* The 15 movement-prep and warm-up exercises from catalog v3 are present with their §3 tags and claim-free copy.

**Session length (copied from program-design §4a)**
- [ ] The coach can set a program default, per-weekday, and per-date session length; the session estimate shows against it in the builder and on the athlete's Today.
- [ ] An Approach-generated session over its target is trimmed in the order above until it fits; the B-block and warm-up are never removed; rest is never shortened.
- [ ] A target below about 25 min produces an Express session.
- [ ] The coach sees each trim as a line with undo.
- [ ] For a coach-built session, **Fit to time** only suggests; nothing changes until the coach applies a suggestion, and saving is never blocked.
- [ ] Stations sessions compute station time from the session length.
- [ ] *(Product)* Before `generatorV3`, fitting works on 2.3.0 generated sessions using the slot-role mapping in §1.4.

**General**
- [ ] Migration 011 safe to re-run; `tsc`, `lint`, `build:web`; previous volleyball and trainer checks pass except §0.3.

---

# PART 2 · Catalog v3 and rack rotation

## 2.1 Catalog v3 (D-043)
Build `content/exercise-catalog-v3.md` **exactly**:
- The remaining **51 exercises** (66 minus the 15 added in Part 1), code-ready in §4, with the §3 tags and the §5 tiers.
- **5 equipment items:** `ssb`, `ghd`, `suspension` (opt-in), `sliders`, `hurdles` (in the "Full weight room" preset).
- **Link updates** per §3 (hang-clean, box-jump, lateral-bound, nordic, pullup, inverted-row, copenhagen, goblet-squat).
- Reps notation for new holds and distance items per §3.
- **Scope:** all 66 are `'all'`; the general library's `leg-swings`, `arm-circles`, `inchworm`, `db-incline-press`, `chest-supported-row`, `barbell-row`, `rear-delt-fly` become `'all'`; the 7 cardio items stay `'general'`.
- **Remove the "olympic pattern only at level 3" rule** in `pickExercise`; gate by each exercise's `level`.
- Behind flag `catalogV3` (default on when Part 2 passes).

## 2.2 Rack rotation format (D-048)
Build `content/program-design.md` **§4b exactly**:
- `Session.format: 'standard' | 'stations' | 'rack_rotation'`. Needs rack groups (D-026); available in volleyball and general teams; not for home sessions, light home days, extra recovery, or testing days.
- `Block.rotation`: positions (exercise or **Spot and coach**), `usesRack`, `rotationSec`, `rounds`, `buildUpRound`.
- **Approach suggestions** (and generated sessions in Part 3) follow §4b rules 1–9: one rack position; spotter after barbell squat/bench at RPE 7+; no same-muscle position right before the rack lift; filler picks by block; rotation time = longest position + about 20 s, rounded to 15 s; rack-lift rest = rotation time × (positions − 1) meeting tier floors (generated only); rounds = rack-lift sets with a build-up round for tier A/P; group size rules (3 → one empty position, 5 → a shared non-rack position); level switches per athlete; block time feeds §4a.
- **Coach control:** any exercise in any position, any order, any rotation time, any rounds. The builder shows rotation time, rest per position, and block time. It never blocks.
- **Athlete view:** "Rack 2 · Block B · You start at Position 3 (DB row)"; current position, reps, shared countdown ("Rotate in 0:42 → Position 4 (Dead bug)"); logging per position.
- **Coach board:** per rack, a ring of positions with each athlete's board name and the group's countdown. **No loads, levels, or check-ins** (G-4).
- **Data:** `live_progress.position_index` and the group's `rotate_at`. Start position = the athlete's order in the rack group.
- Behind flag `rackRotation` (default on when Part 2 passes).

## Part 2 acceptance criteria
**Catalog (copied from `exercise-catalog-v3.md` §7)**
- [ ] All 66 exercises present with the tags in §3; claim-word search clean; no duplicate ids with the existing 113.
- [ ] 5 equipment items added; "Full weight room" preset includes sliders and hurdles only.
- [ ] Existing exercises' `easier`/`harder` links updated per §3.
- [ ] `pickExercise` no longer restricts the `olympic` pattern to level 3; a level 2 athlete can get Hang High Pull, never Hang Power Clean.

**Rack rotation (copied from program-design §4b)**
- [ ] A rack-rotation block staggers athletes so no two are at the same position (except the 5-athlete shared position), and everyone rotates on one clock.
- [ ] Generated rotations have one rack position, a spotter after barbell squat/bench by default, and no same-muscle filler right before the rack lift; rack-lift rest meets the floors.
- [ ] Round 1 is a build-up round when the rack lift is tier A or P.
- [ ] Rotation time, rest per position, and block time show in the builder; coaches can change anything without being blocked.
- [ ] Block time feeds the session-length estimate (§4a).
- [ ] *(Product)* The board's rotation ring shows only board-safe data (select-list check: no loads, RPE, level, check-ins).
- [ ] *(Product)* The worked example in §4b (off-season Tuesday, groups of 4, rack + barbell + DBs + KBs + boxes) is reproduced by the rotation suggester for an advanced, an intermediate, and a beginner athlete, matching the table's picks.

**General**
- [ ] Migration 012 safe to re-run; the flags work (off hides the feature cleanly).

---

# PART 3 · Generator v3 (D-043)
Replace the 2.3.0 volleyball generator (`splitFor`, `RX`, archetypes) for **Approach-generated volleyball programs** with `content/program-design.md` **§1–§9**. Behind flag **`generatorV3`**. Trainer mode keeps its goal defaults (`adult-goals.md`) and gains only warm-ups and Fit to time (Part 1).

## 3.1 What to build
1. **Annual plan (§2):** phase → block sequence (Restore; Accumulation → Strength → Strength-Power, repeating from Strength; Power; Maintain). **Club-in-season switch:** if the athlete's combined calendar shows regular matches or tournaments, use Maintain even when the school phase is off-season. After a break of 14+ days, restart at week 1 of the current block (G9 still applies when the level toggle is on).
2. **Blocks (§3):** 4 weeks, 3 loading + deload; week-to-week intensity and volume changes per the table.
3. **Session architecture (§4):** warm-up → A power → B primary → C secondary (superset) → D accessory → E durability.
4. **Prescriptions (§5a–§5e):** by block and week. % of e1RM **for tested lifts only** (trap bar deadlift, back squat, bench press; goblet squat and DB bench for dumbbell gyms); RPE for everything else. Rest per block table.
5. **Loading methods (§6):** straight sets, top set + back-offs (intermediate+), wave loading, cluster triples, contrast pairs (advanced, **coach-confirmed level only**), tempo/pauses, isometrics. Beginners always get straight or tempo sets; the method switches with the ladder rung.
6. **Weekly templates (§7a–§7g):** 2, 3, 4, and 5 (advanced only) off-season days; preseason 3; in-season Maintain 2 (+ Day 3 in bye weeks) with the placement rules; post-season Restore.
7. **Movement ladders (§8a):** the plan is written at the top rung; each athlete gets the highest rung at or below their level that fits the equipment (G8, D-031). Home uses the Home/bodyweight rung. Same sets, reps, rest, and intent; effort one RPE lower for beginners.
8. **Position emphasis (§8b):** plyo and durability picks and the "Other" adjustments by position (MB, OH/OPP, S, L/DS).
9. **Limits (§9)** for generated programs, in `resolveSession` and the generator: strength RPE (minors ≤ 8, beginners ≤ 7), % caps (≤ 85% minors, ≤ 90% adults), testing unchanged (D-020), lift days (R6), plyo contacts per session (off ≤ 70 · pre ≤ 40 · in ≤ 25, after practice load), **depth jumps** (advanced, coach-confirmed level, box ≤ 18 in, ≤ 20 contacts per session), **contrast pairs, clusters, waves** (advanced, coach-confirmed level), rest floors, match-day rules (R7).
10. **Session length:** every generated session runs through `fitSession` (Part 1) with the coach's target.
11. **Format:** generated sessions can be Standard, Stations, or Rack rotation (the team's chosen default), using the Part 2 suggesters.

## Part 3 acceptance criteria (Product; program-design has no consolidated list for §1–§9)
**Plan and blocks**
- [ ] An off-season program of 12 weeks runs Accumulation → Strength → Strength-Power, each 3 loading weeks + a deload; week 2 and 3 intensities rise per §3; week 4 is at about week-1 intensity, RPE 6, about −40% sets, plyo contacts −50%, same rest.
- [ ] An athlete whose combined calendar has regular club matches during the school off-season gets the Maintain template.
- [ ] After a coach break of 14+ days, the next block restarts at week 1.

**Sessions and templates**
- [ ] Every generated session follows warm-up → A → B → C → D → E (blocks may be trimmed by `fitSession`, never B or the warm-up).
- [ ] The 2-, 3-, 4-, and 5-day off-season templates, the preseason 3-day, the in-season 2-day (with Day 1 heavy / Day 2 fast placement and the bye-week Day 3), and post-season Restore match §7 slot for slot at the top rung; the 5-day template is offered only to advanced athletes.
- [ ] In-season Day 1 is never within 2 days before a match; Day 2 is never the day before a match; no lifting on match days.

**Prescriptions and methods**
- [ ] B-block sets, reps, % (tested lifts), and RPE (untested) match §5b by block and week; tested % never exceeds 85% for minors or 90% for adults.
- [ ] A, C, D, and E blocks match §5a, §5c, §5d, §5e; rest matches each block's table and is never below the tier floors.
- [ ] Contrast pairs, clusters, waves, and depth jumps appear **only** for advanced athletes with a **coach-confirmed** level; depth-jump box ≤ 18 in and ≤ 20 contacts per session; a self-reported advanced minor never gets them.
- [ ] Beginners get straight or tempo sets only, and effort one RPE lower.

**Ladders and position**
- [ ] For each §8a ladder, an advanced, an intermediate, and a beginner athlete each get the expected rung for a full weight room, and the Home rung at home (one test per ladder).
- [ ] A level 2 athlete gets L2 Olympic derivatives (e.g., Hang High Pull, Push Press), never L3.
- [ ] Position emphasis changes plyo and durability picks per §8b (one test per position), including the setter −20% and libero/DS −30% vertical contacts and the libero's Lateral Squat C-block.

**Limits**
- [ ] Plyo contacts per session never exceed the §9 caps for the phase.
- [ ] Generated minors' programs never exceed R6 lift days or strength RPE 8 (beginners 7); trainer goal defaults never exceed RPE 8.
- [ ] Generated sessions pass all safety-guidelines §2a criteria (G8) and v2.2 pass 1 resolution checks.

**General**
- [ ] `generatorV3` off restores the 2.3.0 generator exactly; on uses v3. Migration 013 safe to re-run.

---

## Not in Training v3
CSCS review (recommended before the 2027 launch; accepted risk D-050) · the trainer AI assistant (next trainer release) · conditioning programs · testing for adults · the dismiss-once RPE 9–10 note (D-049) · changes to consent, testing eligibility, or board privacy · team logos · billing.

## Dependencies (owner → needed by tonight's hand-off)
| # | Item | Owner | Status |
|---|---|---|---|
| V1 | Same-day review: nothing in compliance relies on the removed builder limits; unchanged items confirmed; claim check of catalog v3 how-to and warm-up cues; new fields (§1.5, §2.2) not health data; accepted risks logged | Legal (07) | In progress (launch script 2) |
| V2 | `design/user-flows-training-v3.md`: Part 1 screens (blocks removed, level toggle at 3 levels, warm-up card and editor, team default, ramp-up sets, session length controls, Fit to time list with undo, Express label); Part 2 (rack rotation builder, athlete view, board ring) | UX (03) | In progress (launch script 3). If it isn't saved, Claude Code uses existing components and the content docs, and lists each screen it designed in the report |
| V3 | Hand-off into the live repo; `CLAUDE.md` names this spec v1.0; docs copied per the launch script | Coordinator | After V1, V2 |
| V4 | Training content docs final (program-design v3.0, catalog v3.0, warmups v1.0, safety v1.5) | Training (02) | Saved 11/18 |

## Gates
- **Before the first minor (volleyball):** unchanged list in `claude/status.md`; gate 3 now refers to generated weeks (§0.3). Gate 5 (AD/principal letter) still open.
- **Before the trainer's first client:** unchanged (2.3.0 gates, including TM-19 and C31).
- **Recommended, not gates:** CSCS review of all v3 content (program-design §13, catalog §6, adult rules §11); attorney consult; general liability.
