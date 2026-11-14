# Rules: Auto Rest Times and Supersets
Owner: Training Content / Sports Science (02) · v1.0 · Tue Nov 10, 2026
Status: **Draft for founder approval → v2.2.** Founder request (11/10): the program should set rest times automatically from the exercise and scheme, allow supersets, and give longer rest for heavy compound lifts.
Replaces the flat `REST_BY_ROLE` defaults in `generator.ts`. The coach's own rest setting (`ProgramExercise.restSec`) still wins whenever they set one.

---

## 1. Today vs. proposed
**Today:** rest depends only on the slot's role (main 2:30, power 2:00, secondary 1:30, accessory/core 1:00, care 0:45, mobility 0:30). A 5-rep back squat and a 10-rep goblet squat in a main slot both get 2:30, and every exercise is done as straight sets.
**Proposed:** rest comes from **how demanding the exercise is**, **how heavy the set is** (reps and effort), and **the session type**. Low-fatigue pairs can be **supersetted** to save time without shortening rest on the heavy lifts.

## 2. Exercise demand tiers
Every exercise gets a `tier`. This is a new content tag; I've assigned all 74 exercises (§7).
| Tier | What it is | Examples |
|---|---|---|
| **P** Power | Max-intent jumps, throws, Olympic lift | Box jump, broad jump, med-ball throws, trap bar jump, hang power clean |
| **A** Heavy compound | Big bilateral barbell/trap bar lifts | Back squat, front squat, trap bar deadlift, RDL, bench press, barbell hip thrust setup |
| **B** Compound | Multi-joint dumbbell, single-leg, bodyweight strength, pulling | Goblet squat, split squat, step-up, DB bench, rows, pull-ups, landmine press, push-ups |
| **C** Accessory | Smaller or lower-fatigue strength | Calf raise, band good morning, carries, Pallof press, core |
| **D** Care / mobility | Prehab, mobility, breathing | Band ER, face pull, Y-T-W, ankle work, mobility drills |

## 3. Rest table (straight sets)
Rest in seconds **between sets**. Rep bands use the prescribed reps (the top of a range). For one-sided work ("each"), the rest comes after **both sides**.

| Tier | 1–5 reps | 6–8 reps | 9–12 reps | 13+ reps / holds |
|---|---|---|---|---|
| **P** Power | 120 (Olympic: 150) | 120 | — | — |
| **A** Heavy compound | **180** | 150 | 120 | 90 |
| **B** Compound | 120 | 90 | 75 | 60 |
| **C** Accessory | 75 | 60 | 60 | 45 |
| **D** Care / mobility | 30 | 30 | 30 | 30 (mobility: 0–30) |

**Adjustments** (applied in this order, then rounded to the nearest 15 s):
| Situation | Change |
|---|---|
| Effort "Max effort" (power) or RPE 8+ on tier A | Use the 1–5 rep column, or +30 s, whichever is longer |
| Deload week or coach-lightened day | **Keep the rest the same.** These days drop sets and effort, not rest. |
| In-season | Same rest. Sessions get shorter through fewer sets (existing `RX`), not by rushing heavy sets. |
| Home sessions (bodyweight) | Tier B main → 90 s max; tier C → 45 s (matches `home-workouts.md` §5) |
| Light home day / extra recovery | 0–30 s (already set in those docs) |
| Testing day load attempts | **180 s** (P6.5) |
| Beginner | Same table. Shorter rest isn't a "beginner" thing; good reps are. |

**Floors (MUST):** tier A sets never get less than 120 s, and tier P never less than 90 s, **even if the coach types something shorter** (the app shows "Heavy lifts need at least 2:00 rest" and uses 2:00). Tier C/D have no floor. *Why:* short rest on heavy lifts and power work turns them into fatigue work, which is where form breaks down for teens.

## 4. Supersets
**Labeling:** paired exercises show as **A1 / A2** (or B1 / B2). The athlete does a set of A1, a short transition, then a set of A2, then rests, then repeats. The rest timer runs after A2.

### 4a. Allowed pairs
| Pair | Example | Why it works |
|---|---|---|
| Upper push + upper pull | DB bench + one-arm row | Opposite muscles; each rests while the other works |
| Lower (tier B/C) + upper (tier B/C) | Split squat + half-kneeling press | Non-competing |
| Tier B/C strength + core | Step-up + Pallof press | Core doesn't tax the legs much |
| Tier B/C strength + care | Row + band ER | Care work is low fatigue |
| **Filler during heavy rest** | Back squat + ankle rock (during the rest) | A tier D drill done *during* the rest. The full tier A rest still counts. |
| End-of-session circuit (up to 3) | Care + core + mobility | Low fatigue; 30 s between rounds |

### 4b. Never pair (MUST)
1. **Tier P (power) with anything except a tier D filler.** Power is done fresh, first, with full rest. *(No "contrast" pairs like heavy squat → jump for minors. Those need coached supervision and CSCS review.)*
2. **Tier A with anything except a tier D filler.** Heavy compounds get straight sets.
3. **Two exercises that load the same area hard:** two lower-body tier B lifts, two hinge patterns, two vertical pushes.
4. **Two grip-heavy exercises:** rows/pull-ups + carries, or deadlifts + carries.
5. **Exercises at different stations** in the weight room (e.g., a barbell rack lift + a cable row across the room). A pair has to be doable from one spot: same station or no equipment. This matters for rack groups.
6. More than 2 strength exercises in a superset. **Updated 11/13:** blocks of 3–4 are allowed as **circuits** under the rules in `programs/circuits-and-stations.md` Part 1 (no tier P/A, max one lower-body tier B, max one grip-heavy, beginners max 3).

### 4c. Rest inside a superset
- **Transition A1 → A2:** 15 s (0 s for a filler done during the rest).
- **Rest after A2** = the **longer** of the two exercises' straight-set rests from §3, minus 15 s. (The transition already gave some recovery.)
- Example: DB bench 3 × 8 (tier B, 90 s) + one-arm row 3 × 8 (tier B, 90 s) → 15 s transition, **75 s** after the row.
- Sets must match. If they don't, the extra sets of the longer exercise are done as straight sets at the end.

### 4d. When the app supersets automatically
The generator first builds straight sets, estimates the session length (§5), and pairs only if:
- the coach turned on **"Save time with supersets"** (default **on** for in-season and home sessions, **off** for off/pre-season school sessions), **or**
- the estimated length goes over the target for that phase (§5).

**Pairing order:** pair accessories and core first, then secondary upper + lower, then upper push + pull. Never touch tier P or A (except fillers). Stop as soon as the session fits the target.

**Coach controls:** the coach can pair or unpair any two exercises in the builder. The app blocks pairs that break §4b, with a one-line reason (e.g., "Power exercises are done on their own, fresh"). The coach can still set a custom rest within the floors.

## 5. Session length targets
Estimated minutes = warm-up (8 min school, 5 min home) + for each exercise: sets × (work time + rest), using about 3 s per rep (40 s for holds and carries, 20 s for one jump set).
| Session | Target |
|---|---|
| School, off-season | 60 min |
| School, preseason | 50 min |
| School, in-season | 40 min |
| School, post-season | 45 min |
| Home session | 30 min |
| Light home / extra recovery | 15–20 min |

Show the estimate to the coach in the builder and to the athlete on Today ("about 45 min"). This fills the `estMinutes` tag the taxonomy already proposed.

## 6. Data (for Claude Code)
- `Exercise.tier: 'P' | 'A' | 'B' | 'C' | 'D'`, assigned in §7.
- `ProgramExercise.group?: string`: same letter = superset (`'A'`), in list order (A1 then A2). Absent = straight sets.
- `ProgramExercise.restSec`: for A1, the transition (15); for A2 (the last in a group), the rest after the pair. If the coach set `restSec` themselves, keep it, but apply the §3 floors.
- `ProgramExercise.filler?: true`: a tier D drill done during the previous exercise's rest (no extra rest added).
- New pure function `restFor(exercise, prescription, context)` replaces `REST_BY_ROLE` as the default. `restSecFor()` keeps the "coach setting wins" behavior, plus the floors.
- **Workout view:** shows A1/A2 labels, alternates sets, starts the rest timer after the last exercise in a group, and shows the transition timer (15 s) between them.
- **Coach board (live_progress):** for a superset, show "A1/A2 · Round 2 of 3" in place of "Set 2 of 3"; the rest countdown works the same.

## 7. Tier assignments (all 74 exercises: 64 + 6 mobility + 4 home)
| Tier | Exercises |
|---|---|
| **P** | `pogo`, `squat-jump`, `broad-jump`, `box-jump`, `lateral-bound`, `trap-bar-jump`, `hang-clean`, `mb-slam`, `mb-overhead`, `mb-rotational`, `mb-chest-pass`, `kb-swing` |
| **A** | `back-squat`, `front-squat`, `trap-bar-deadlift`, `rdl`, `bench`, `hip-thrust` (tier A when done with a barbell setup, otherwise B) |
| **B** | `goblet-squat`, `db-rdl2`, `nordic`, `reverse-lunge`, `split-squat`, `step-up`, `db-rdl`, `lateral-lunge`, `db-floor-press`, `db-bench`, `db-shoulder-press`, `landmine-press`, `pike-pushup`, `pushup`, `incline-pushup`, `db-row`, `cable-row`, `inverted-row`, `lat-pulldown`, `pullup`, `doorframe-row`, `bodyweight-squat`, `glute-bridge` |
| **C** | `band-good-morning`, `calf-raise`, `band-row`, `band-pulldown`, `prone-pulldown`, `suitcase-carry`, `farmer-carry`, `backpack-carry`, `dead-bug`, `plank`, `ab-rollout`, `side-plank`, `pallof`, `wall-sit`, `copenhagen`, `spanish-squat`, `wrist-roller` |
| **D** | `tib-raise`, `ankle-balance`, `band-er`, `band-pull-apart`, `face-pull`, `ytw`, `scap-pushup`, `worlds-greatest`, `hip-90-90`, `thoracic-rotation`, `crocodile-breathing`, `cat-camel`, `hip-flexor-stretch`, `ankle-rock`, `lat-reach`, `band-hamstring` |

*Notes:* `kb-swing` is tier P because it's done for speed (category `power`). `nordic` is tier B but done as straight sets with 120 s rest (high eccentric demand), and it's never supersetted except with a filler.

## 8. Acceptance criteria (for Product)
- [ ] A back squat at 4 × 5 gets 3:00 rest; a goblet squat at 3 × 10 gets 1:15; a band ER at 2 × 15 gets 0:30.
- [ ] The coach can't set rest below 2:00 on tier A or 1:30 on tier P; the app explains and uses the floor.
- [ ] Deload and lightened days keep the same rest as the normal session.
- [ ] Auto-superset never pairs tier P or A (except a tier D filler), never pairs two lower-body tier B lifts, two grip-heavy lifts, or exercises at different stations.
- [ ] Superset rest: a 15 s transition, then the longer straight-set rest minus 15 s after the last exercise of the pair.
- [ ] In-season and home sessions auto-pair only until the estimate fits the target; off-season school sessions stay straight sets unless the coach turns supersets on or the session runs over 60 min.
- [ ] Coach-set rest (within the floors) always wins over the auto value.
- [ ] Workout view and coach board show A1/A2 and rounds correctly.
