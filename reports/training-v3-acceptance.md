# Training v3 (2.4.0) acceptance report

Spec: `docs/specs/training-v3.md` **Draft v1.0** (Wed Nov 18, 2026), with `docs/compliance.md` (§ Training v3 review V1–V5), `docs/content/program-design.md` v3.0, `exercise-catalog-v3.md` v3.0, `programs/warmups.md` v1.0, and `docs/design/user-flows-training-v3.md` v1.0. Built on branch `v2.4.0` from hand-off `632a16e`, on top of 2.3.1. Part 1 → Part 2 → Part 3, one commit each (`c13dddd`, `525bb49`, `c29897c`) plus a final commit with this report. **Not deployed.**

## Summary for Ryan

| | Result |
|---|---|
| **Part 1** (must ship) | **All criteria pass.** No Part 1 failure, so the stop rule doesn't block the deploy. |
| **Part 2** (`catalogV3`, `rackRotation`) | All criteria pass except **one partial**: the §4b worked example matches 32 of 33 picks. The exception is the beginner's Copenhagen, where the catalog tags the exercise bench-only but the example room has a box. UX F55 is also **partial**: Pause and per-rack controls aren't built because they'd need a new server field. Both flags are **on**; your call whether to hold. |
| **Part 3** (`generatorV3`) | The generator is built, and its own 39 checks pass. With the flag on, though, earlier checks fail (listed under Part 3). Under the rules, **`generatorV3` ships off**, and the 2.3.0 generator stays live and unchanged. |
| Earlier checks (2.1, 2.2, 2.2.1, 2.3.0, 2.3.1) | All re-run and pass, except the rows marked **"superseded (§0.3)"**, each with the row it maps to. One conflict outside §0.3 needs your answer (question 2). |
| Migrations | `011`, `012`, `013` (013 makes no schema change). Each runs twice cleanly, both on a fresh `schema.sql` and as an upgrade from v1 through 002–013. |
| `tsc` · `lint` · `build:web` | Clean · clean · builds (see "Commands"). |

**Before the deploy, please answer:**
1. **`session.source`** is in spec §1.5 but not in compliance V4's table (CLAUDE.md known conflict 7). It's built inside the session JSON. **Did Legal confirm it?** I won't deploy until you answer.
2. **Olympic resolution with `catalogV3` on:** safety-guidelines §2a step 5 says "Olympic lifts resolve to a jump for anyone below advanced." Spec §2.1 and §3, and program-design §8a, give intermediates L2 derivatives instead (Hang High Pull). The spec ranks higher, so I built it that way; beginners still get a level 1 jump, so the §2a criterion holds. The one earlier check that conflicts is v2.2 resolve-check "Hang Power Clean → jump for intermediate too". It passes with `catalogV3` off, and that change isn't in §0.3. **Keep `catalogV3` on, or ship it off?**
3. **Part 2 partials:** ship with `catalogV3` and `rackRotation` on, or hold?
4. **F55a Pause and per-rack controls** need a per-rack clock on the server, which is a new field (G-5). Build them later with Legal's OK, or drop them?

Then: run 011 → 012 → 013, approve the deploy, and I'll merge, deploy 2.4.0 and record it. You push the `v2.4.0` tag from your Mac, as before.

---

## Part 1 · Coach freedom, level toggle, warm-ups, session length

Evidence keys: **L1** = `scripts/checks/v240-p1-check.ts` (75 pass); **B1** = `scripts/checks/browser-v240-p1.js` (demo build, iPhone 13, all pass, including a 44-pt tap audit of the new screens); **SQL** = `supabase/tests/rls-2.4.0-p1.sql` (6 expected errors, fresh and upgrade).

| # | Criterion | Result | Evidence |
|---|---|---|---|
| **Coach freedom (§1.1)** ||||
| 1.1a | On a volleyball team with minors, a coach can save "RPE 10," "to failure," "max," and "AMRAP" in a strength slot, with no block, warning or note (UI and API) | **pass** | B1: each value typed in the editor; the claim/block regex finds no message, the value saves, and the team posts with RPE 10. The server has no effort check (schema search). L1: `resolveSession` passes them to athletes as written. |
| 1.1b | Rest 0:30 on a back squat saves as typed; "Auto 3:00" shows as a suggestion | **pass** | B1: rest goes down to 0:00 ("No timer") and back to 0:30, saved as typed; an "Auto m:ss" chip appears and tapping it restores auto. L1: `restFor(back squat × 5) = 180` (the "Auto 3:00" value). |
| 1.1c | Pair two tier A lifts, put a power lift in a circuit of 5, put a hang clean in a station: all save with no message | **pass** | L1: `groupRows` pairs back squat and bench; a 5-row circuit including the hang clean groups; `stationChecks` with a hang clean in a station returns info only. B1: "Pair as superset" and "Group as circuit" (5 rows) with no message. |
| 1.1d | 6 lift days a week to a beginner minor and 7 sessions to a trainer client; no block at post; the trainer post screen shows the combined count as information | **pass** | L1: a coach-built program keeps 6 days for a beginner in `weekPlan`; the trainer program has 7 sessions and `postChecks` returns only "Alex: 7 sessions a week across all programs." Post is enabled except for the TM-19 / Terms gate (`PostSheet`). |
| 1.1e | A barbell exercise added to a home session via "Show all exercises" | **pass** | The home picker opens on the H6 filter, with a "Show all exercises" toggle (`session.tsx`). In resolution, a coach's home exercise stays when the athlete has the equipment for it. B1 found no home session in its fixture; the trainer browser flow (browser-v230) covers the picker. |
| 1.1f | Testing eligibility, supervision lock, consent, TM-19 posting, board privacy and G3 behave as before (re-run) | **pass** | Re-runs: SQL 2.1 (21), 2.1 pass 2 (29), 2.2 pass 1–3 (7/7/1), 2.2.1 (7), 2.3.0-a (17), 2.3.0-b (3), all expected counts; `testing-check`, `s11-check`, `v221-check`, `v230-check`; browser 2.2 pass 1–3, 2.2.1, 2.3.0 (129 checks). |
| 1.1g | Code search finds no builder-side block for effort, rest, pairing, circuits, stations, order or weekly days; the rules live in `resolveSession`/generator/suggestions keyed to `source = 'approach'` | **pass** | L1: no `effortProblem`, `generalEffortProblem`, `clockProblem`, `CLOCK_REASON`, `PART1_REASON`, `FLOOR_MESSAGE`, `REST_FLOOR`, `cardioProblems`, `EFFORT_BLOCK`, "Effort clamp", "Circuit clamp", `kind: 'block'` or "Blocked:" in any builder or post file. `resolveSession` uses `free: !approach`; caps live in `weekPlan` for generated weeks only. |
| **Generated sessions keep the rules (§0.1)** ||||
| 1.2a | A generated volleyball session meets program-design §9 for minors (RPE caps, rest floors, R6 caps, plyo caps) via `resolveSession`; a trainer goal-default session stays at RPE ≤ 8 | **pass** | L1: generated beginner minor, RPE 9 typed → capped at RPE 7 or below; rest floor kept; generated week capped at 3 lift days; generated home jumps keep "up to 20 contacts"; trainer goal-default session with RPE 10 → ≤ RPE 8. |
| 1.2b | Editing a generated session's exercise or effort flips it to `'coach'`; editing only its warm-up, length or level toggle doesn't | **pass** | L1: `coachEdit` sets `'coach'`; the editor routes exercise, set, rep, effort, rest, group, order and station edits through `edit()`, and warm-up, Fit banner and level toggle through `update()`. B1: an effort edit flips the source; warm-up edits keep it. *Spec inconsistency:* §1.2 says turning the toggle off on a generated session makes it `'coach'`, which contradicts this criterion. Built per the criterion (no flip); "off" is still honored (judgment call, for Product). |
| 1.2c | Approach's suggestions (auto rest, auto-pairing, stations auto-split, Fit to time) follow the old rules | **pass** | L1: the auto rest suggestion keeps the floors; auto-pairing never pairs tier A/P; `defaultStations` keeps power/heavy in Part 1; `fitSession` never shortens rest. |
| **Level toggle (§1.2)** ||||
| 1.3a | Default on: a beginner on an advanced program gets Goblet Squat for Front Squat (§2a criteria still pass) | **pass** | L1; `resolve-check` §2a rows pass. |
| 1.3b | Program off: exact exercises and effort, no "Your version," no G9 adjustment | **pass** | L1: Front Squat kept, no `teamExerciseId`, effort as written, `easing.active` false despite a 7-week break. B1: "Everyone gets exactly what you write." |
| 1.3c | Session override and athlete override work; most specific wins | **pass** | L1: session on beats program off; session off beats program on; athlete off beats session on, and other athletes are unchanged. B1: the session toggle stays enabled with "Program setting: Off" (known conflict 3, for UX). The per-athlete row is in athlete detail; the roster shows "Exact program". |
| 1.3d | Toggling off doesn't change testing eligibility | **pass** | L1: `levelAllowsLoadTest` reads only the confirmed level; the server's `can_load_test` is unchanged (SQL 2.2 pass 1). |
| **Warm-ups (warmups.md §9)** ||||
| 1.4a | Every session (generated or coach-built, volleyball or trainer, gym or home) shows a Warm-up card with Raise, Activate and Potentiate per §2–§3, except light home days, extra recovery and testing days | **pass** | L1: generated, coach-built, trainer (`resolveSession` returns a warm-up) and home sessions; none for light, mobility/recovery or removed. Testing days use the testing screen's own warm-up (unchanged). B1: card on the athlete session and first in the workout view. |
| 1.4b | Squat-first → Lower: squat pool; upper pull → Upper: pull pool; Olympic derivative → empty-bar complex | **pass** | L1. |
| 1.4c | Ramp-up sets before each loaded tier A/P exercise per §4, logged as warm-up, never affecting weight suggestions | **pass** | L1: the §4 tables (≤ 95 lb, 95–185, > 185 with 85% single, Olympic, no weight yet, same-pattern second lift); `setsDone` and `suggestWeight` ignore `warmupSets`. B1: a "Ramp-up" section with its line; Done starts the 60 s timer; logged with `warmup: true`; the work-set count excludes them. |
| 1.4d | Changing the main lift regenerates the warm-up unless edited; edited keeps the coach's version and shows "Regenerate" | **pass** | L1; B1: the "Edited" tag, and Regenerate asks to confirm. |
| 1.4e | Limited space → in-place Raise; home → no-equipment items only | **pass** | L1 (session and team limited space, home). |
| 1.4f | The coach can save a template and set the team default (Approach / template / none) | **pass** | B1: Save as template → "Template saved."; Team settings → Warm-up → My template (picker), Limited space, None. SQL: templates are coach-private; the default must be the team's own template. |
| 1.4g | *(Product)* The 15 movement-prep and warm-up exercises are present with their §3 tags and claim-free copy | **pass** | L1: 15 present with §3 tier and level, scope all; claim-word search clean. |
| **Session length (program-design §4a)** ||||
| 1.5a | Program default, per-weekday and per-date length; the estimate shows against it in the builder and on the athlete's Today | **pass** | L1: date → weekday → program → phase priority; another team's events never carry room time. B1: program 45 saved; the week grid shows "about N / T min"; the footer reads "about N min · target 45"; the athlete sees "About N min" (plus "(planned for 45)" when a set target differs by 5 min or more). Per date: Calendar day sheet → "Weight room time on …". |
| 1.5b | A generated session over target is trimmed in order until it fits; B-block and warm-up never removed; rest never shortened | **pass** | L1: trims in the §4a step order; B kept at 3 or more sets; rest never lower; warm-up compacted, never removed. |
| 1.5c | Target under about 25 min → Express | **pass** | L1 (`fitSession` at 20 → Express: A, B, one C pair). The Express pill shows in the builder and week grid, plus "Short session today: the essentials only." on Today. |
| 1.5d | Each trim a line with undo | **pass** | `FitBanner` (one line each, Undo, Undo all, "Fit again"); L1: an undone trim is skipped (`fitLog` `undo:<step>`). |
| 1.5e | Coach-built: Fit to time only suggests; nothing changes until applied; Save never blocked | **pass** | L1; `FitSheet` (Apply / "Applied · Undo", Apply all, Make it Express). B1: the button only shows when over target; that run's session was under target, so L1 covers the apply and undo path. |
| 1.5f | Stations compute station time from the session length | **pass** | `st-check`: (60 − 10 − 15 − 0) ÷ 4 − 1 = 7; the editor shows "N min each, from your T-min session." |
| 1.5g | *(Product)* Before generatorV3, fitting works on 2.3.0 generated sessions via the slot-role mapping | **pass** | L1. |
| **General** ||||
| 1.6 | Migration 011 safe to re-run; `tsc`, lint, `build:web`; earlier checks pass except §0.3 | **pass** | 011 run twice in the upgrade path; SQL counts above. Earlier checks: see "Earlier checks". |

## Part 2 · Catalog v3 and rack rotation

Evidence keys: **L2** = `scripts/checks/v240-p2-check.ts` (38 pass, 1 PARTIAL line); **F** = `scripts/checks/v240-flags-check.ts` (7 pass); **B2** = `scripts/checks/browser-v240-p2.js` (all pass, including the tap audit).

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 2.1a | All 66 present with the §3 tags; claim-word search clean; no duplicate ids with the existing 113 | **pass** | L2: parses the §3 table (66 rows) against the code (category, pattern, level, tier, scope); 179 unique ids; claim search clean; Legal's `ssb-squat` line used. |
| 2.1b | 5 equipment items; Full weight room adds sliders and hurdles only | **pass** | L2. The trainer gym profile shows them under "More equipment"; migration 012 allows them. |
| 2.1c | Existing links updated per §3 | **pass** | L2 (all 8 link updates, plus `line-hops.harder`). |
| 2.1d | `pickExercise` no longer restricts Olympic to level 3; a level 2 athlete gets Hang High Pull, never Hang Power Clean | **pass** | L2. Resolution too: Hang Power Clean → Hang High Pull (L2) → a level 1 jump (L1). See question 2 for the earlier-check conflict. |
| 2.2a | Staggered: no two athletes at the same position (except the 5-athlete shared one); one clock | **pass** | L2 (4, 5 and 3 athletes; each tick moves everyone one position); B2: board ring with two athletes at different nodes. |
| 2.2b | Generated rotations: one rack position, spotter after barbell squat/bench by default, no same-muscle filler right before the rack lift; rack-lift rest meets the floors | **pass** | L2 (the floor raises the rotation time when needed). |
| 2.2c | Round 1 is a build-up round for tier A or P rack lifts | **pass** | L2 (rounds = sets + build-up). |
| 2.2d | Rotation time, rest per position and block time show in the builder; coaches change anything without being blocked | **pass** | B2: the card readout "N positions · m:ss rotation · R rounds · about N min", "Rest between turns…", "Block time…", group fit, "Suggested", and an Auto chip after a change; L2: odd setups compute and save. |
| 2.2e | Block time feeds the §4a estimate | **pass** | L2: 15 + 20 + 12 + 2 min between blocks = 49 = the estimate (the build-up round replaces ramp-up time). |
| 2.2f | *(Product)* The board ring shows only board-safe data | **pass** | L2: source scan of `RotationRing` (no load, effort, RPE, level, check-in, reps or e1RM); B2: no RPE, lb or level on the board. |
| 2.2g | *(Product)* The §4b worked example is reproduced for advanced, intermediate and beginner | **partial** | L2: positions, order, rotation times (75/75/60), rests (3:45/3:45/3:00), rounds (3/4/3), block times (15/20/12) and **32 of 33 picks** match. **Exception:** the beginner's Copenhagen. Catalog §3 tags Short-Lever Copenhagen bench-only and the room has boxes, so the beginner gets Side Plank. Training to fix the tag or the example. Judgment call: Inverted Row is the vertical-pull entry option after Band Pulldown, as the example shows. |
| 2.3 | Migration 012 safe to re-run; the flags work (off hides the feature cleanly) | **pass** | 012 run twice; F: with both flags off the library is 2.3.1 plus the 15 Part 1 drills, no new equipment, old links and the old Olympic rule; the rack rotation UI, controls, ring and athlete views sit behind `FLAGS.rackRotation`. |

## Part 3 · Generator v3 (`generatorV3` ships **off**)

Evidence: **L3** = `scripts/checks/v240-p3-check.ts` (39 pass, flag on inside the check). The decisive check is the earlier-check re-run with the flag on (last rows).

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 3.1a | 12-week off-season: Accumulation → Strength → Strength-Power, 3 loading + deload; weeks 2–3 rise; week 4 ≈ week-1 intensity, RPE 6, about −40% sets, plyo −50%, same rest | **pass** | L3 (Strength 75 → 80 → 82.5%; deload 75%, RPE 6, 5 → 3 sets, same rest, contacts halved). |
| 3.1b | Club matches during the school off-season → Maintain | **pass** | L3 (`events` with 4 club games → Maintain template). |
| 3.1c | After a coach break of 14+ days the block restarts at week 1 | **pass** | L3. |
| 3.2a | Every session: warm-up → A → B → C → D → E | **pass** | L3 (all templates; the warm-up is generated per Part 1). |
| 3.2b | 2/3/4/5-day off-season, preseason 3, in-season 2 (+ bye Day 3), post-season Restore match §7 at the top rung; 5-day for advanced only | **pass** | L3 (main lifts per template, 4-day Day 1 slot for slot, the 5-day gate). *Simplifications:* the 4-day Day 1 "Depth Drop → Box Jump" is written as Depth Drop; the bye-week Day 3 is added when no match is in the default week. |
| 3.2c | In-season Day 1 never within 2 days before a match; Day 2 never the day before; no lifting on match days | **pass** | L3 (3 match patterns). |
| 3.3a | B-block per §5b by block and week; tested % ≤ 85% minors, ≤ 90% adults | **pass** | L3. |
| 3.3b | A, C, D, E per §5a, §5c–§5e; rest per table and never below the floors | **pass** | L3. |
| 3.3c | Contrast, clusters, waves and depth jumps only for advanced + coach-confirmed; depth box ≤ 18 in and ≤ 20 contacts; a self-reported advanced minor never gets them | **pass** | L3. *Gap:* wave loading is gated but never assigned (no template uses it yet). |
| 3.3d | Beginners: straight or tempo only, effort one RPE lower | **pass** | L3. |
| 3.4a | Each §8a ladder: expected rung for advanced / intermediate / beginner in a full room; Home rung at home | **pass** | L3 (all 23 ladders; the GHD is opt-in, so Nordic → Slider Curl for intermediates in the default room). |
| 3.4b | A level 2 athlete gets L2 Olympic derivatives, never L3 | **pass** | L3. |
| 3.4c | Position emphasis per §8b (one test per position), incl. setter −20% and libero/DS −30% vertical contacts and the libero's Lateral Squat C-block | **pass** | L3 (setter 0.8 and libero 0.7 of the opposite's vertical contacts, within 8 points). |
| 3.5a | Plyo contacts per session never exceed the §9 caps | **pass** | L3 (off 70, pre 40, in 25, every week). *Gap:* the "after practice load" adjustment isn't built (it would only lower contacts further). |
| 3.5b | Generated minors' programs never exceed R6 lift days or strength RPE 8 (beginners 7); trainer goal defaults never above RPE 8 | **pass** | L3 (the R6 cap was fixed in v3 during this run). |
| 3.5c | Generated sessions pass all safety §2a criteria (G8) and the v2.2 pass 1 resolution checks | **fail** | Through `resolveSession`, §2a passes (L3). But re-running the earlier checks with `generatorV3` on fails: `s11-check` G1 (2.1: "the generated plan never contains an exercise above the athlete's level"; v3 writes the plan at the top rung by design, program-design §1 and §8, which conflicts with the old rule); `resolve-check` "swap keeps sets × reps" (a plyo slot's sets and reps change with the swap); `p3-check` school + home week (no light home day H2, home defaults not bodyweight); `v240-p1-check` "generated home jumps keep the 20-contact note". |
| 3.6 | `generatorV3` off restores the 2.3.0 generator exactly; on uses v3; 013 safe to re-run | **pass** | L3 (off → no `block`, `method` or `pct`); every earlier generator check passes with it off; 013 (no-op) run twice. |

**Decision (CLAUDE.md task 3):** criterion 3.5c fails, so **`generatorV3` defaults off**. The 2.3.0 generator is live and unchanged. TR3-2 content (depth jumps, contrast, clusters, ≤ 85%) therefore doesn't reach athletes in this release.

## UX sign-off (`user-flows-training-v3.md`)

| # | Item | Result | Evidence / notes |
|---|---|---|---|
| UX1 | F45: none of the F45a "Was" behaviors; Save always enabled; no removed builder string renders; F45b unchanged | **pass** | L1 code search; B1 block regex on the editor; trainer week effort takes any RPE (browser-v230 row now "SUPERSEDED (§0.3) → RPE above 8 saves"); F41 stepper 5–180; F19a home jumps toggle always available; F29a "Start stations" never blocked ("…They'll follow the standard order." + "Add them to racks"); F28c info line. F45b: TM-19/Terms gate, testing, consent, pain card, board privacy re-run. |
| UX2 | F45d: Auto chips only when the value differs; tapping restores auto | **pass** | B1 (rest chip); B2 (rotation time chip). |
| UX3 | F46: toggles at three levels; any "off" gives the written exercise and hides "Your version"; testing eligibility unchanged | **pass** | L1, B1. Per known conflict 3 the session toggle stays enabled ("Program setting: Off") instead of F46b's disabled "Off for this program"; and a session set on adjusts even when the program is off (F46's "every level must be on" is replaced by "most specific wins"). For UX. |
| UX4 | F47–F48: card first except excluded types; Done per part; how-to links; "Warming up" board state; ramp-up rows before loaded tier A/P, excluded from work sets, suggestions and PRs | **pass** | B1 (card, Done per part, "Warm-up done ✓", board "Warming up" with no items, ramp-ups, log shape); L1. PRs use work sets only (`entries[].sets`). |
| UX5 | F49–F50: edit, swap, reorder, add, remove, Regenerate (confirm when edited), save/use template; team default; Limited space | **pass** | B1. Reorder uses ↑/↓ buttons and "To Raise/Activate/Potentiate" instead of drag handles (judgment call: same function, no drag library). |
| UX6 | F51: program, weekday and date lengths with the source in the target line; estimate vs target in footer, week card and Today; Fit to time suggestions apply/undo; fit log with Undo; Express label | **pass** | B1, L1. The target line names its source ("Target 30 min (Wed, Dec 3)", "Target 45 min (Tuesdays)"). |
| UX7 | F52–F53: Rack rotation format; rotation card with positions, Rack marker, spotter toggle, Auto rotation time, rounds, build-up, readouts; nothing blocks | **pass** | B2. Positions reorder with ↑/↓ (no drag); "+ Add" offers the block's other exercises; swapping an exercise is done in the session's exercise list. |
| UX8 | F54: start position per block on Today; current position, logger, countdown, position strip, rotate banner; per-position logs; spot logs nothing | **pass** | B2 ("Rack 1 · A · Round 1 of N", "Position n · …", "Rotate in m:ss → Position n (…)", strip "[2 You]"); Today card. A "Go to Position n" button moves the logger to the position's exercise; logs are per exercise (positions), and Spot has no logger. The full-width 0:00 banner with haptic is folded into the countdown line. |
| UX9 | F55: Start / Rotate now / +15 s / Pause / End block, plus per-rack controls; board ring | **partial** | Built: Start rotation, Rotate now (asks once), +15 s, End block → next block; one room clock; board ring per rack with names at positions, RACK, Spot/Open nodes, the text list and the countdown. **Not built:** Pause and per-rack controls (they need a per-rack clock stored on the server: a new field, G-5 → question 4). |
| UX-a11y | Targets ≥ 44 pt; in-workout Done and warm-up checkboxes 56 pt; countdown screen-reader text; text tags | **pass** | Tap audits in B1/B2 (session editor, warm-up editor, program settings, workout, rotation cards, rotation workout, team controls): none under 44 pt. Warm-up and ramp-up Done are 56 pt. The countdown label reads "Rotate in N seconds, next Position n, …". |

## Compliance (`docs/compliance.md` § Training v3 review)

| # | Item (V2: still applies to every program) | Result | Evidence |
|---|---|---|---|
| V2.1 | Consent and the six permissions; adults' "Your choices" | **pass** | SQL 2.1, 2.1 pass 2 and 2.2.1 counts unchanged; browser 2.1 pass 2 (p2b) and 2.2.1 suites pass. Logging still needs consent (`canLog`). |
| V2.2 | Testing eligibility and the supervision lock | **pass** | SQL 2.2 pass 1 (7) / 2.2.1 (7); `testing-check`; L1 1.3d. |
| V2.3 | No true 1RM feature for minors; no "max out" / "your max" wording | **pass** | No new testing code; claim search on new strings finds neither. (Free effort text "1RM" is allowed by coach freedom, TR3-1.) |
| V2.4 | Board privacy, including the rotation ring | **pass** | L2 ring scan; B1 "Warming up" shows no items; B2 ring shows no RPE/lb/level. `position_index` is never joined with load/RPE/level/check-ins. |
| V2.5 | G3 pain message, G4 head-injury line | **pass** | Unchanged (`recovery.tsx`, `general.ts`); browser 2.2 pass 1 and 2.3.0 suites pass. |
| V2.6 | Adults-only trainer teams; TM-19; T1–T11 | **pass** | SQL 2.3.0-a (17) / 2.3.0-b (3); browser-v230 (TM-19 gate; a minor can't join). T10 schema search: no new condition, weight-loss or body-composition columns (new columns are `default_warmup*`, `limited_space`, `position_index`, `warmup_templates`). |
| V2.7 | Level switching off doesn't change load-test eligibility or Q-7 | **pass** | L1 1.3d; the per-athlete flag is stored as opaque per-team keys (never user ids), so teammates can't read it from the posted program (V4 condition). |
| V3 | Claim-word search on the built catalog and warm-up text, plus Legal's fixes | **pass** | L2 (66 exercises); L1 (15); repo search of changed source strings. Legal fixes: `ssb-squat` line exact; no "Durability" in UI (the v3 Day 5 name reads "Power + care"; the Fit lines say "Care work"); rotation spotter label "Spot" (no "Spot and coach" in `src`). |
| V4 | New fields as approved; `roomMinutes` never shown to another team's coach | **pass, except one question** | Fields map to V4 rows (`build-snapshot.md` §4). Another team's events reach an athlete without `roomMinutes`. **`session.source` isn't in V4** → question 1. |
| V5 | Accepted risks TR3-1, TR3-2 | **noted** | TR3-1: Legal's dismiss-once note and the confirm when turning level adjust off for a minor are **not built** (founder's call, known conflict 5). TR3-2: built as the spec says; Legal's stricter interim recommendation not adopted (known conflict 6). With `generatorV3` off, TR3-2 content doesn't reach athletes in 2.4.0. |
| V1 | Terms §4.1/§4T.3 edited in the legal notice | **not in this release** | The website and legal pages are unchanged in 2.4.0 (CLAUDE.md). The regenerated `/terms` with the corrected §4.1/§4T.3 needs a website release. **Flag for the coordinator.** |

## Earlier checks (re-run on the 2.4.0 build)

**Suites:**

| Suite | Result |
|---|---|
| SQL, fresh `schema.sql` and upgrade v1 → 002–013 (011–013 run twice) | 2.1: 21 · 2.1 pass 2: 29 · 2.2 pass 1: 7 · pass 2: 7 · pass 3: 1 · 2.2.1: 7 · 2.3.0-a: 17 · 2.3.0-b: 3 · 2.4.0: 6. Every count is the expected one, on both paths. |
| Logic (`run-all.sh`, 20 scripts incl. the 2 website checks) | All pass. Rows that tested removed builder blocks print "SUPERSEDED (§0.3) →" and test the new behavior (below). |
| Tap targets | The 2.4.0 tap audits found two older 16-pt text links on screens they cover: the session editor's "Unpair" and the roster's "Review". Both are now 44 pt. "Unpair" now also counts as a coach edit (§0.1). |
| Browser: 2.3.0 trainer (129), 2.3.1 custom exercises (21), 2.2.1 (53), 2.2 pass 1 (20), pass 2 (15), pass 3 (14), 2.1 pass 2 (52), 2.1 regression (7), 2.4.0 Part 1, 2.4.0 Part 2 | All pass on the final build. Test edits: the superseded rows below; v2.2 pass 3 now matches "About N min" case-insensitively (F51d copy); the custom-exercise test picks the picker's second "Edit" (the warm-up row now has the first). |

**Superseded rows (§0.3; never counted as pass):**

| Earlier check | Superseded by | Now tests |
|---|---|---|
| v2.2 pass 1 browser: "adult-only team: effort warning, not a block" (D-028) | §0.3 row 1 (D-045/D-049) | "to failure" saves with no warning |
| `st-check`: power/heavy as a station blocked (minors) / warning (adults) | §0.3 row 4 (circuits-and-stations Part 2a) | no message; checks are info only |
| `st-check`: "more racks than stations blocks"; "too-short station time warns" | §1.1 item 4 (setup check as info) | info lines |
| v2.2 pass 3 browser: "Start stations blocked until everyone is on a rack" | §0.3 row 4 (stations rules) and UX F29a | never blocked: "1 athlete isn't on a rack. They'll follow the standard order." with Add them to racks |
| `p3-check`: beginner circuit split (C1), coach-built fixture | §0.3 row 4 (C1) | C1 kept for generated sessions; a coach circuit of 4 stays 4 |
| `v230-check` + browser-v230: builder blocks RPE 9/10, failure, max, AMRAP, for time (trainer B5/B11) | §0.3 row 6 | the block function is gone; goal-default sessions still capped at RPE 8 in `resolveSession` |
| `v230-check`: "over 60 min cardio per session blocked" | §0.3 row 7 (adult §10) and F41 | no block; 5–180 min, Easy/Moderate only |
| `v230-check` + browser-v230: combined weekly cap block at post; "Post blocked over the combined cap" | §0.3 row 7 (and the 2.3.0 settlement removed by known conflict 8) | neutral readout "Alex: 6 sessions a week across all programs."; Post enabled |
| `v230-check`: no-rest-day block; 7+ weeks without deload warning (F39b) | §0.3 row 7 | information only |
| browser-v230: "RPE above 8 blocked with the A1 line" (week view) | §0.3 row 6 / F39b | RPE 9 saves |
| `v230-check`: rest floor on a trainer's 0:30 tier A row | §0.3 row 2 | saves and resolves as typed; generated sessions keep the floor |
| `v230-check`: contrast pair warning (general) / block (volleyball) | §0.3 row 4 | grouped with no message |
| `v230-check` + browser-v230 + general-library §8: warm-ups W1–W3 | known conflict 9 | the generated warm-up row (trainer Raise starts with easy cardio) |
| `v231-check`: heavy custom rest floor; effort ceiling on custom strength work; RPE 9 block for minors; AMRAP block (trainer); pairing block | known conflict 2 | coach-built: as written; generated: the type still drives floor and ceiling |
| 2.3.0 report rows "Builder blocks RPE > 8…", "Caps 4/5/6 … over-cap posting blocked", "Cardio 5–60 min … 60-min session block", "4-week wave … 7+ weeks without a deload warns", "Warm-ups W1–W3", F39–F41 "RPE above 8 blocked", "Choosing a goal … editing above RPE 8 blocked" | §0.3 rows 6–7, known conflicts 8–9 | as above |
| 2.3.1 report rows "rest floors / effort caps / pairing through the type" | known conflict 2 | as above |

**Conflict outside §0.3 (question 2):** `resolve-check` "Hang Power Clean → jump for intermediate too" (safety §2a step 5) is replaced with "→ Hang High Pull" while `catalogV3` is on. With `catalogV3` off it passes as written (F).

**Count updates (not supersessions):** `v230-check` library counts include the 15 + 51 catalog v3 exercises; `whyGeneral` now has 2 more lines; the volleyball pool adds catalog v3 §5's 7 'all' exercises with `catalogV3`.

**Earlier report rows:** v2.2.1 rows 1–31 re-run: pass (rows 2, 3, 29 are live checks done at the 2.2.1 deploy; nothing in 2.4.0 touches domains, auth emails or Pages). v2.3.0 rows: pass except those listed above as superseded. v2.3.1 rows: pass except the known-conflict-2 rows above. Website checks pass (site repo untouched).

## Judgment calls and items for the planning team

Full list in `build-snapshot.md` §8 "2.4.0". The main ones:
- **For Product:**
  - §1.2 vs the criterion on the level toggle and `source` (built per the criterion).
  - R7 match-day moves still apply to coach-built weeks; the Back-after-a-break ramp still applies to trainer-built sessions (neither is in §0.3).
  - Known conflict 10 items: F41 5–180; F55a room clock (per-rack not built); F46c per program.
- **For UX:**
  - The product name in new copy is "Approach Strength" (D-035), not "Approach".
  - Level toggle precedence (known conflict 3).
  - ↑/↓ instead of drag handles.
  - The rotate banner is folded into the countdown.
- **For Training:**
  - The Copenhagen tag vs the §4b example.
  - The new sport-neutral "why" lines (`er-90-90-iso`, `lateral-hurdle-hop`).
  - Warm-up minute estimates.
  - Inverted Row in the vertical-pull entry rung.
  - The effort explainer sentence was removed from the editor.
- **For Legal:**
  - `session.source` (question 1).
  - Per-athlete level-off stored as opaque keys.
  - TR3-1 note not built; TR3-2 interim not adopted (and inactive while `generatorV3` is off).
  - Terms §4.1/§4T.3 waits for a website release.

## Commands

- `npx tsc --noEmit`: clean.
- `EXPO_OFFLINE=1 npx expo lint`: clean.
- `npm run build:web` (with the app/site URLs): exported `dist`, `dist-single`.
- `sh scripts/checks/run-all.sh`: all pass.
- SQL and browser suites: as above.
