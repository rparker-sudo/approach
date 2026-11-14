# Approach: Training Safety Guidelines
Owner: Training Content / Sports Science (02) · **v1.3** · Tue Nov 10, 2026
Status: **Draft v1.2 for founder approval.** Items marked **[Pro review]** need a certified professional before the 2027 App Store launch (§9).
Built against: v2.0 code (`src/lib/generator.ts`, `progression.ts`, `exercises.ts`, `team.tsx`, `session.tsx`), decisions D-005, D-007, D-013 to D-026, and specs `v2.1-soft-launch.md` (pass 1), `v2.1-pass-2.md`, and `rack-groups.md` (v2.2).

> **Changes in v1.3 (11/10, later):** home workouts (R6 home/light-day rule; `programs/home-workouts.md`) and auto rest times + supersets with rest floors (§3; `programs/rest-and-supersets.md`).

> **Changes in v1.2:** brought in line with the 11/9 decision session and D-017 to D-026. G1, G2, and G5 now say they're in v2.1 pass 1. Testing days (D-020) are decided, with my disagreement recorded. §4a's copy rule is reworded so it no longer conflicts with the effort board. **New:** §2a team-program level resolution (G8), §4b effort-board rules and point values (signed off), and rack sizes in §6. Extra recovery sessions are now written (`content/programs/extra-recovery-sessions.md`).

> **Not medical advice.** Approach gives general strength and conditioning education to healthy athletes. It doesn't diagnose, treat, or clear anyone to play. Anything involving injury, pain, illness, or a head injury goes to a parent, athletic trainer, or doctor.

---

## 1. Scope
- **Who:** high school volleyball athletes aged 13–18 (most are 14–18), plus adult athletes and coaches (18+). **Every rule here is written for minors.** Adults get the same defaults; v2.x has no separate adult track.
- **Levels:** beginner (`level 1`), intermediate (`level 2`), advanced (`level 3`), mapped to `Experience` in `types.ts`.
- **What Approach programs:** strength, power (jumps, throws, Olympic lifts for advanced athletes only), core, prehab, mobility, extra recovery sessions, and testing days, all to support volleyball across the full year (off, pre, in, post-season).
- **What it doesn't program:** on-court volleyball drills or skill work (founder decision, 11/9). Also out: rehab, return-to-play, nutrition (Product owns the Fuel cards, §8), true 1-rep-max testing for minors, and conditioning (not decided yet, §8).

## 2. Hard rules (MUST)
| # | Rule | Why | Status |
|---|---|---|---|
| R1 | **No true 1-rep-max attempts for minors.** Strength testing uses 3–5 rep-max tests on coach-supervised testing days only (§4a). Athletes are never prompted to attempt a single. Working loads may use the *estimated* max, always capped by the RPE ceilings in R2. | AAP 2020 supports youth strength testing *with qualified supervision, technique, and progression*. Rep-max tests give nearly the same information with less risk. | **Decided (D-020, DS-5).** In v2.1 pass 2 (P6). See the recorded disagreement in §4a. |
| R2 | **Never train to failure.** RPE ceilings: beginner ≤ 7; intermediate/advanced ≤ 8; in-season ≤ 7 for everyone. Cue athletes to stop with about 2 reps left. | Technique breaks down near failure, and that's where youth injuries cluster. | ✅ Built (`RX` + `BEGINNER_EFFORT`). **Coach edits must not exceed these** (see G8/§2a). |
| R3 | **Experience gates are hard limits.** Never prescribe an exercise above the athlete's level. If nothing at their level fits the equipment, use an easier or bodyweight option, or drop the slot. | Advanced lifts need coached technique. | Personal programs: **G1, v2.1 pass 1 (S11).** Team programs: **G8, proposed for v2.2** (§2a). |
| R4 | **Olympic lifts (Hang Power Clean) are for advanced athletes only, with the note "Only with coaching."** | High technical demand. | ✅ Built. G8 extends this to team programs. |
| R5 | **At least 1 full day per week with no lifting and no conditioning.** Default target is 2 days with no lifting. Gentle mobility (extra recovery sessions) doesn't break this rule. | AAP 2016: 1–2 days off per week from organized sport. | **G2, v2.1 pass 1 (S11).** |
| R6 | **Weekly lift-day caps for minors:** beginner ≤ 3, intermediate ≤ 4, advanced ≤ 5 (in-season ≤ 3 for everyone). Days beyond the cap can only be mobility/recovery sessions. **Home workouts (founder 11/10):** full home sessions count toward the cap; **one light home day** a week (bodyweight, RPE ≤ 6, no jumps, 15–20 min) is allowed beyond it, and it doesn't count as the rest day. | These athletes also practice volleyball 4–6 days a week. | **G2, v2.1 pass 1 (S11).** |
| R7 | **Match-day rules:** no lifting on match/tournament days; no heavy-leg session the day before a match; lift after practice, not before. No testing within 48 h before a match. | Freshness and fatigue management. | ✅ Built (lifting); testing rule in P6.1. |
| R8 | **Built-in recovery:** 4-week blocks with a deload in week 4 (about 40% fewer sets, easy effort). The coach can lighten any day. | Periodization basics. | ✅ Built. |
| R9 | **Readiness only suggests changes.** It never changes a program on its own. The coach chooses "Lighten today." | Auto-adjusting stays OUT until a CSCS reviews the rules. | ✅ Built. |
| R10 | **Pain means don't train through it.** The app never tells an athlete to train around pain or which exercise to substitute. It points them to an adult. | Pain triage is clinical. | Helper text in v2.1 S3. **G3** (Today-screen message) proposed for v2.2. |
| R11 | **No injury, medical, or results claims in copy.** | Liability (Legal 07). | v2.1 S8 fixes the explicit claims. **14 more lines** in `content/drill-library.md` §3, proposed for v2.2. |
| R12 | **Head injury:** the app never offers concussion assessment or return-to-play steps. Copy points to the school's concussion protocol and medical clearance. **[Pro review]** | State laws and school medical staff govern return to play. | **G4**, proposed for v2.2 (one Settings line, §5). |
| R13 | **Effort board ranks effort, never strength or the body** (§4b). | Comparison and body-image risk for teens. | In v2.1 pass 2 (P4). |

## 2a. Team programs: per-athlete level resolution (G8, proposed for v2.2, **High**)
**The problem:** a coach builds one program per team or position group at one experience level, and every athlete in that group gets the same exercises. The coach can also add any exercise from the picker (`session.tsx`), and that picker doesn't check level. G1 only fixes personal programs. **Result today:** a beginner in an "advanced" group gets front squats and hang cleans.

**Rule:** when an athlete opens a session from a coach-posted program, each exercise is resolved to that athlete's level:
1. **Athlete level** = the coach-set level for that athlete if there is one (§ new field below), otherwise the athlete's own profile `experience`.
2. If the exercise's `level` ≤ athlete level, keep it.
3. Otherwise, follow its `easier` chain to the first exercise with `level` ≤ athlete level that **fits the program's equipment**. (Every level 2–3 exercise has an `easier` link; see the drill library §2.)
4. If that fails, use the lowest-level exercise of the **same pattern** that fits. If nothing fits, **drop the exercise** for that athlete.
5. Keep the coach's sets, reps, rest, role, and notes. Apply the beginner effort shift (`BEGINNER_EFFORT`) and the R2 ceilings. Olympic lifts resolve to a jump for anyone below advanced.
6. Show the athlete a small line: *"Your version: Goblet Squat (team: Back Squat)."* The log stores the exercise actually done, and the coach board shows that name.
7. The coach sees the swaps per athlete in athlete detail (e.g., "3 exercises adjusted to level"). The coach can't force a harder exercise on one athlete. To change that, the coach changes the athlete's level.

**Coach-set level (new field, needs Legal):** `team_members.level` (1–3, nullable), set by the coach on the roster. It defaults to the athlete's self-reported level when they join. The same field is needed by **testing eligibility** (P6.4 checks level on the server) and **rack-group auto-assign** (`rack-groups.md` R3), and neither has a server-side level today. One field covers all three. It's training data, not health data, but it's a new field about minors, so Legal confirms.

**Acceptance criteria (for Product):**
- [ ] A beginner on a team whose group program is built at "advanced" never sees a level 2–3 exercise: Front Squat → Goblet Squat; Hang Power Clean → a level 1 jump.
- [ ] A coach-added level 3 exercise resolves down for a beginner the same way.
- [ ] With a "Bands & bodyweight" program, a beginner gets a fitting level 1 option or the slot is dropped, never a harder one.
- [ ] Logs and the coach board show the resolved exercise; the coach's sets, reps, and rest are kept.

## 3. Loading and progression
- **Prescription source:** `RX[phase][role]` in `generator.ts`. Any change to `RX`, `REST_BY_ROLE`, `splitFor`, `MAX_LEVEL`, the e1RM percentages, or the effort-board point values is a **training-content change** that needs Training Content sign-off.
- **Progression (G5, v2.1 pass 1):** double progression. Each increase is capped at about 10% of the last weight, rounded to 2.5 lb, with a maximum of +10 lb (barbell) or +5 lb (dumbbell/kettlebell). No weight suggestions for band-only setups or holds. Drop about 5% after two sessions below the rep range.
- **Tested lifts (P6.7):** suggestion = `min(e1RM × phase upper %, progression suggestion)`. Phase ranges: off 70–80%, pre 75–85%, in 70–80%, post 60–70%.
- **New athletes (proposed, low):** the first 2 weeks of any new program use RPE ≤ 6 on main lifts.
- **Coming back from a break (proposed G9, v2.2+):** if an athlete has no logged sessions for 14+ days, their next week uses RPE ≤ 6 and weight suggestions start about 10% below their last logged weights. This matters most for the individual side (hand-off doc).
- **Rest (v2.2):** rest is set automatically by exercise tier, reps, and effort, with supersets for low-fatigue pairs (`programs/rest-and-supersets.md`). **Floors (MUST):** heavy compound lifts (tier A) never get less than 2:00 rest and power work (tier P) never less than 1:30, even if the coach types less. Power and heavy compound lifts are never supersetted except with a light care/mobility filler. No contrast pairs (heavy lift → jump) for minors.

## 4. Power and plyometrics
- Every jump is cued "land soft and quiet." Box jumps: **step down, never jump down.** No depth or drop jumps for minors without **[Pro review]**.
- Beginners: only level 1 jumps. Lateral bounds and trap bar jumps are level 2.
- **Jump volume caps per lift session:** ≤ 30 ground contacts in-season, ≤ 50 off/pre-season. Current `RX` stays under these. Keep it there.
- Med-ball throws: a weight that keeps the throw fast (about 4–10 lb for most high schoolers).

## 4a. Testing days (D-020, decided 11/9, in v2.1 pass 2 P6)
**Recorded disagreement (DS-5):** Training Content recommends a CSCS review **before** minors do loaded tests. The founder chose to put everything live with coach supervision as the safeguard, and CSCS review before 2027. Legal logs it as an accepted risk. The full protocol below is mandatory either way.

**Eligibility (MUST)**
- Load tests: coached athletes at **intermediate or advanced** level (the coach-set level from §2a once it exists), with testing consent (box 6). Beginners and **all solo athletes** do jump tests only.
- The coach confirms that day: *"I'll be supervising this test, with safeties or spotters set."* It's recorded each time (who, when, team).
- No testing within 48 hours before a match or tournament. An athlete with pain = yes or a "run down" check-in that day skips load tests (§5).

**When**
| Phase | Test | Placement |
|---|---|---|
| Start of off-season | Full battery | End of the first week back, after a technique refresher week |
| Start of preseason | Full battery | End of the preceding deload week |
| Mid-season | Jump tests + **one** 5RM re-check (trap bar deadlift) | A week with no weekend tournament |
| Post-season | Jump tests only | Any time |

**Battery (power first):** approach touch, broad jump, med-ball overhead throw (best of 3 each), then trap bar deadlift 5RM, back squat 5RM (advanced may use 3RM), bench press 5RM (advanced may use 3RM). Dumbbell gyms use goblet squat or DB bench 8RM. No Olympic lifts or Nordic curls are tested.

**Rep-max protocol:** warm-up ladder (light × 10, about 50% × 5, about 70% × 3, about 85% × 1–2); up to 3 working attempts (+5–10 lb lower, +5 lb upper), with 3:00 rest. **The coach stops the set** when form breaks or bar speed clearly slows. The result is the last set completed with good form. Safeties or a spotter for squat and bench. **Testing-day rack size: 2–3 athletes per rack** so the coach can watch every attempt (§6).

**Results:** e1RM = weight × (1 + reps/30), always labeled an estimate, never "your max." A lower re-test lowers loads.

**Copy and display rule (reworded in v1.2):** "Testing day" / "Strength check," never "max out." **Lift results, lift changes, and estimated maxes are private** (athlete + coach) and never ranked or shown on any board. Jump-test *changes* may appear on boards per D-021 (change only, never raw values; zero or negative shows "Tested ✓").

## 4b. Effort board rules (D-018, D-024; Training Content sign-off)
- **Counts effort, never strength or the body:** never loads, lift test results, e1RM, bodyweight, check-ins, pain, or nutrition (R13).
- **Only prescribed sessions count** toward Sessions, Consistency, and Streak. Extra sessions never count there, so the board can't reward doing more than the plan.
- **Rest days never break streaks.** Coach-lightened weeks count normally.
- **Hours cap:** 3 h per day and 15 h per week (lift + practice + matches), so the board never rewards overtraining.
- **Overall points (signed off 11/10):** prescribed session = 10 · extra recovery session = 5 (max 2 counted per Mon–Sun week) · full week = 5. These are sound: the biggest reward is following the plan, recovery is encouraged but capped, and nothing rewards extra lifting. Attendance, jump gains, hours, and lift numbers earn 0 Overall points.
- **Extra recovery sessions:** `content/programs/extra-recovery-sessions.md` (ER1–ER5, prehab/mobility only, no equipment, 10–13 min).
- **Watch-out for the soft launch:** if any athlete logs extra recovery every day for weeks, or the team's "full week" rate drops after a board launches, review the incentives (Market Research interview question).

## 5. Pain, readiness, and medical routing
**Check-in thresholds (as built in `team.tsx`, approved):** "run down" = average of sleep, energy, and inverted soreness ≤ 2, or soreness 4–5. The team suggestion appears when ≥ 3 athletes or ≥ 30% of check-ins are run down. Pain = yes is listed separately.

**Pain = yes (G3, proposed for v2.2; Product + UX + Legal):**
1. The athlete sees: *"Don't train through pain. Talk to your coach, parent, or athletic trainer before you lift today."* No exercise swaps, no body-part logic, and no extra recovery session suggested.
2. The coach's roster shows the flag with: *"Check in with [name] in person."*
3. The app never asks *where* it hurts (D-016).

**Head injury copy (G4, v2.2):** add to Settings: *"If you hit your head or have any concussion symptoms, stop and follow your school's concussion protocol. Only a medical provider can clear you to return."* **[Pro review]**

**Existing Settings disclaimer:** approved, keep.

## 6. Supervision, solo athletes, and rack sizes
- Level 2–3 barbell lifts assume an adult who knows the lift is present, plus a rack with safeties or a spotter.
- **Solo minors (G6, Product + Legal):** cap at level 2, no Olympic lifts, jump tests only. Still open; relevant to the individual-athlete focus after v2.2.
- **Recommended athletes per station** (for `rack-groups.md`, shown as a hint in Racks setup, not enforced):

| Station | Athletes | Why |
|---|---|---|
| Barbell rack (squat, bench) | **3** (4 max) | Lifter, spotter, next up/loader |
| Trap bar or platform (deadlifts, RDLs) | 2–3 | No spotter needed; enough room to load |
| Dumbbell/bench station | 2–3 | Shared weights, quick turnover |
| Plyo box | Up to 4 | One jumper at a time, full rest between jumps |
| Med-ball throws | 2 per ball | Partner throws or retrieves |
| **Testing day (any station)** | **2–3** | The coach must watch every load-test attempt |

- With "Balanced mix" auto-assign, a beginner shouldn't be alone at a barbell rack without an intermediate or advanced partner. The spec's balanced-mix aim already does this when the roster allows.

## 7. Copy vocabulary (Training Content + Legal)
| Don't say | Say |
|---|---|
| injury prevention, prevents/reduces injury, protects your [joint], keeps you healthy/safe | prehab, prep work, builds strength/control for landing |
| fixes / manages / treats / heals [condition] | builds [muscle] strength, loads [area] with control |
| rehab | (don't use) |
| guaranteed, will add X inches | can help you jump higher with consistent training |
| "push through it," "max out" | "stop with 2 reps left," "strength check" |
| "your max" | "estimated strength (estimate)" |

## 8. Out of my scope (flagged)
- **Nutrition:** the Fuel cards (D-019) are written by Product from published sources and checked by Legal. I don't author or approve nutrition content. RD review before 2027.
- **Conditioning:** still undecided. The library has no conditioning, speed, or agility exercises. If the founder wants them, it's a Product decision plus a new pattern/category, and I'll write the content.

## 9. Needs certified-professional review
| Item | Reviewer | When |
|---|---|---|
| Testing-day protocol and %-of-estimate loading (§4a) | CSCS | **Recommended before the soft launch**; founder set it for before 2027 (DS-5) |
| The 70-exercise library, `RX` table, level gates, G8 resolution | CSCS (youth experience preferred) | Before the 2027 App Store launch |
| Pain-flag messaging and head-injury copy | ATC or sports medicine physician | Before soft launch if possible |
| Fuel cards | Registered dietitian | Before 2027 (DS-4) |
| Depth jumps, adult 1RM testing, readiness auto-adjust | CSCS | Before building |

## 10. Code gaps: status
| ID | Gap | Status |
|---|---|---|
| G1 | Level gate falls back to harder exercises (personal programs) | **v2.1 pass 1 (S11)**, not built yet |
| G2 | Lift-day caps and rest day | **v2.1 pass 1 (S11)**, not built yet |
| G5 | Flat +5 lb progression | **v2.1 pass 1 (S11)**, not built yet |
| G7 | Testing days | **v2.1 pass 2 (P6)** |
| **G8** | Team programs ignore each athlete's level | **Proposed for v2.2, High** (§2a) |
| G3 | Pain = yes doesn't change the Today screen | Proposed for v2.2 |
| G4 | No head-injury copy | Proposed for v2.2 |
| G6 | Solo minors can get level 3 / Olympic lifts | Open (Product + Legal); fits the individual-athlete phase |
| G9 | No return-from-break rule | Proposed for v2.2+ (§3) |
| Copy | 14 more claim lines + 2 data fixes | Proposed for v2.2 (`drill-library.md` §3) |
| Content | 6 new mobility exercises + 5 extra recovery sessions | Ready (`drill-library.md` §4, `programs/extra-recovery-sessions.md`) |
| Feature | Home workouts (school + home weeks) | Ready for v2.2 spec (`programs/home-workouts.md`) |
| Feature | Auto rest times + supersets | In v2.2 spec (pass 1 rest, pass 3 supersets) |
| Feature | Block circuits + station rotation | Proposed for v2.2 pass 3 (`programs/circuits-and-stations.md`). **MUST for minors:** no power or heavy compound lifts in circuits or stations; no timed/for-time tier B work |

## Sources (orientation, not legal or medical authority)
- AAP Council on Sports Medicine and Fitness, *Resistance Training for Children and Adolescents*, Pediatrics 2020;145(6):e20201011.
- AAP, *Sports Specialization and Intensive Training in Young Athletes*, Pediatrics 2016;138(3):e20162148.
- NATA, *Youth Sports Specialization Recommendations* (official statement).
