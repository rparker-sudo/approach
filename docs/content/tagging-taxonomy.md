# Approach: Content Tagging Taxonomy
Owner: Training Content / Sports Science (02) · **v1.2** · Sun Nov 15, 2026
Status: **Draft for founder approval.** v1.2 (11/15): **Part C, trainer mode**: the T-A1 hide list, `scope`, `whyGeneral`, new equipment, patterns, and the `cardio` category. v1.1: 6 new mobility exercises (70 total), session `kind`, coach-set athlete level (G8), and testing tags moved to "in spec." Part A documents the tags **exactly as they exist in the v2.0 code** (`src/lib/types.ts`, `src/lib/exercises.ts`, `src/lib/generator.ts`), plus the 6 mobility exercises ready for v2.2 (`drill-library.md` §4). Part B lists proposed additions. Nothing in Part B gets built without Product (01) and Claude Code agreeing to the schema change.

**Source of truth for exercise data:** `src/lib/exercises.ts` (64 exercises in v2.0; 70 with the v2.2 additions). Readable index: `content/drill-library.md`. The role doc mentions a separate `drills.json`. I recommend Claude Code **generate** any JSON from `EXERCISES` rather than maintaining a second copy, so the two can't drift. (Engineering decision, flagged.)

---

## Part A: Tags as built

### A1. Exercise fields (`Exercise` type)
| Field | Type / values | Meaning |
|---|---|---|
| `id` | kebab-case string, **permanent** | v1.0 IDs are kept so old logs still resolve. Never rename an ID; add a new one. |
| `name` | string | Display name |
| `category` | `lower` · `upper` · `core` · `power` · `prehab` | Library grouping (UI label in `CATEGORY_LABEL`; `prehab` label changes to "Prehab" in v2.1 S8) |
| `pattern` | see A2 | What the generator fills slots with |
| `weighted` | boolean | `true` = a load is logged and gets weight suggestions |
| `level` | `1` · `2` · `3` | Minimum experience (A4) |
| `equipment` | `Equipment[][]` (A5) | Alternative setups; the exercise fits if **any one** inner list is fully available. `[[]]` = bodyweight |
| `cue` | string, one line | Shown in lists |
| `easier` / `harder` | exercise `id` (optional) | Regression / progression links |
| `howTo` | `{ why, steps[], cues[], mistakes[] }` | `why` = one sentence on why it matters for volleyball (no injury claims, see safety-guidelines §7) |

### A2. Movement patterns (`Pattern`, 18)
| Group | Patterns |
|---|---|
| Lower | `squat`, `hinge`, `single-leg` |
| Upper | `h-push`, `v-push`, `h-pull`, `v-pull` |
| Power | `jump`, `olympic`, `throw` |
| Core | `core-ext` (anti-extension), `core-rot` (rotation/anti-rotation), `carry` |
| Care (prehab) | `shoulder-care`, `knee-care`, `ankle-care`, `hand-care` |
| Mobility | `mobility` |

### A3. Session slot roles (`SlotRole`, 7)
`power` · `main` · `secondary` · `accessory` · `core` · `care` · `mobility`. A slot's role sets the prescription (`RX[phase][role]`) and default rest (`REST_BY_ROLE`). Values and limits: `safety-guidelines.md` §2–3.

### A4. Level ↔ experience
| `level` | `Experience` id | UI label | Definition | Library count |
|---|---|---|---|---|
| 1 | `beginner` | New to lifting | < 6 months of regular lifting | 47 (53 with v2.2 mobility) |
| 2 | `intermediate` | Some experience | 6 months to 2 years | 14 |
| 3 | `advanced` | Experienced | 2+ years, comfortable with barbell lifts | 3 (Front Squat, Nordic Curl, Hang Power Clean) |

### A5. Equipment (`Equipment`, 10) and presets
This is the equipment-level selector coaches and athletes already use (`EquipmentPicker`).

| id | Label |
|---|---|
| `barbell` | Barbell & rack |
| `trap-bar` | Trap bar |
| `dumbbells` | Dumbbells |
| `kettlebells` | Kettlebells |
| `bench` | Bench |
| `cable` | Cable / machines |
| `pullup-bar` | Pull-up bar |
| `box` | Plyo boxes |
| `med-ball` | Med balls |
| `bands` | Bands |

**Presets:** `full` Full weight room (all 10) · `db` Dumbbells & bench (`dumbbells, bench, bands, box, med-ball`) · `bw` Bands & bodyweight (`bands`). Bodyweight exercises are always available. Users can also pick individual items.

### A6. Program-level tags
| Tag | Values |
|---|---|
| `phase` | `off` Off-season · `pre` Preseason · `in` In-season · `post` Post-season |
| `position` | `Outside Hitter` · `Opposite` · `Middle Blocker` · `Setter` · `Libero / DS` · `All positions` (team programs) |
| `volleyballWeek` day types | `off` · `practice` · `game` (Match) · `tournament` |
| `experience` | A4 |
| `blockWeeks` | default 4; the last week is a deload |

**Position → care emphasis** (`CARE_BY_POSITION`, rotated across sessions): OH and OPP get shoulder, knee · MB gets knee, ankle, shoulder · Setter gets hand, shoulder · Libero/DS gets ankle, knee · All positions gets shoulder, knee, ankle. This is the "shared base + position add-ons" model you chose. Every position gets the same split, and only the care slots differ.

### A7. Prescription conventions
- **Effort vocabulary:** `RPE 6`–`RPE 8` ranges, `Max effort` (power only, meaning max *speed/intent*, not max load), `Easy, fast`, `Controlled`, `Light`, `Easy`, `Bodyweight`.
- **Reps:** a number or range (`"3–4"`); one-sided work adds ` each`; holds use seconds (`"30s"`, `"20s each"`); carries use yards (`"30 yd each"`).
- **Units:** pounds (`weightLb`), inches (touch height, net height), seconds (rest).

### A8. Data issues found in the library (for Claude Code, low priority)
| Exercise | Issue | Fix |
|---|---|---|
| `ab-rollout` | `equipment: NONE`, but it needs an ab wheel (or a barbell with plates) | `[['barbell']]` or add an `ab-wheel` item, or treat it as level-2 bodyweight with a "use a barbell" note |
| `ytw` | Cue says "Light plates," but the setups are dumbbells or nothing | Change the cue to "Light dumbbells or no weight" |
| `band-row`, `band-pulldown`, `band-good-morning` (band-only); `pallof`, `face-pull` (band or cable) | `weighted: true`, so band setups get +5 lb suggestions | Exclude band-only setups from `suggestWeight` (safety-guidelines G5) |
| `calf-raise` | `category: lower` but `pattern: ankle-care` | Fine as is; noted so nobody "fixes" it by accident (it fills ankle-care slots) |

---

## Part B: Additions
### B1. Proposed (not built; need Product + Engineering)
| Proposed tag | Values | Why | Depends on |
|---|---|---|---|
| `supervision` | `none` · `recommended` · `required` | Show "Learn this with a coach" on level 2–3 barbell lifts and the Olympic lift; lets the app cap solo minors (safety G6) | Product + Legal (D-009) |
| `impact` (jumps only) | `low` · `moderate` · `high` | Count ground contacts per session against the caps in safety §4 | Engineering |
| `estMinutes` (generated sessions) | number | Coaches want "fits in 45 min." Already used on the constant extra recovery sessions (B2) | UX + Engineering |
| `conditioning` category + patterns `speed`, `agility`, `energy-system` | — | Needed if the app adds conditioning (safety §8) | **Product decision first** (new feature) |

### B2. In spec or ready for v2.2
| Tag | Values | Where |
|---|---|---|
| Session `kind` | `'extra_recovery'` (constant sessions ER1–ER5) and in `workout_logs` | v2.1 pass 2 P4.8; content in `programs/extra-recovery-sessions.md` |
| `CalendarEvent.test` | `'full'` · `'jump'` · `'mid'` | v2.1 pass 2 P6.1 |
| Test ids (`test_results.test_id`) | `touch`, `broad-jump`, `mb-overhead-throw`, `trap-bar-deadlift-5rm`, `back-squat-5rm`, `back-squat-3rm`, `bench-5rm`, `bench-3rm`, `goblet-squat-8rm`, `db-bench-8rm` | Proposed ids for P6.5/P6.8 (units: inches, inches, feet, lb × reps). These replace the earlier `testable`/`testReps` exercise-tag idea: the test list is fixed, so a constant table is simpler than tagging exercises |
| `team_members.level` | `1` · `2` · `3`, nullable; coach-set, defaults from the athlete's self-report | **Proposed for v2.2 (G8)**. Also used by testing eligibility and rack groups. Needs Legal |
| `Exercise.tier` | `'P'` · `'A'` · `'B'` · `'C'` · `'D'` (power, heavy compound, compound, accessory, care/mobility) | v2.2, sets auto rest and superset rules; all 74 assigned in `programs/rest-and-supersets.md` §7 |
| `ProgramExercise.group` / `filler` | Same letter = superset (A1, A2); `filler: true` = tier D drill done during a rest | v2.2 (`rest-and-supersets.md` §6) |
| Session `format` / `stations` | `'standard'` · `'stations'`; `stations: { id, name, groups[], minutes }[]`; `live_progress.station_id`, `rotate_at` | Proposed v2.2 pass 3 (`programs/circuits-and-stations.md`). Circuits reuse `group` (3–4 exercises = circuit) |
| Session `location` | `'school'` · `'home'`, plus a light home day flag | v2.2 (`programs/home-workouts.md`); logs record `location` |
| Home equipment (athlete) | Subset of `Equipment`: dumbbells, kettlebells, bands, pullup-bar, bench, box ("sturdy step or stairs"), med-ball. Default none. **Device only** | v2.2 (`home-workouts.md` §6) |
| Resolved exercise | Log stores the exercise actually done after G8 resolution | Proposed for v2.2 (safety §2a) |

No age-band tag is needed: every user is 13+ (D-005), and minor defaults apply to everyone.

---

## Part C: Trainer mode (general teams, 2.3.0)
Spec: `product/specs/trainer-mode.md` §A3, §B4. Content: `content/general-library.md`, `content/programs/adult-goals.md`, `content/adult-training-rules.md`.

### C1. T-A1: what to hide in general teams
**Exercises hidden for being volleyball-only: none.** I went through all 74 exercises in the volleyball library (64 + 6 mobility + 4 home). Every one is a standard strength, power, core, prehab, or mobility exercise that a trainer could use with adults. Hiding any of them would only shrink the trainer's library. What's volleyball-specific is the **wording and the automation around them**, so that's what general teams hide or replace:

| Hide or replace in general teams | How |
|---|---|
| **"Why" text that talks about volleyball** (27 exercises: approach, blocking, hitting, serving, setting, defense, arm swing) | Show `whyGeneral` instead (`general-library.md` §5). Cues, steps, and mistakes have no volleyball terms (checked; "big arm swing" in the broad jump cue means the jump's arm swing, so it stays). |
| **Position care slots** (`CARE_BY_POSITION`) | Not used. General teams have no positions; care exercises are picked by the trainer. |
| **Volleyball generator and its archetypes, `RX` by phase, `dayAdvice`, `captainLine`** | Not offered (spec A3). Goals (`adult-goals.md`) fill defaults instead. |
| **Testing battery, approach touch, jump tests, "Above the net," Jump gains** | Hidden (spec A3, adult rules A2). The exercises themselves (e.g., `broad-jump`, `mb-overhead`) stay available as training exercises. |
| **Fuel cards and the plate visual** | Hidden (spec A3). |
| **Volleyball week day types** (practice, match, tournament) | Calendar offers only Session and Break (spec A3). |

**Scope tag for the future:** add `scope: 'all' | 'general' | 'volleyball'` (default `'all'`) so any later volleyball-only exercise can be hidden from general teams with one tag. Today: **0 exercises are `'volleyball'`**; the **7 cardio exercises are `'general'`** (hidden in volleyball teams, since conditioning is undecided there).

**Acceptance (for Product):**
- [ ] A general team's exercise picker shows all 74 existing exercises (plus the 39 general ones), with `whyGeneral` text where it exists.
- [ ] A volleyball team's picker never shows `scope: 'general'` exercises (the 7 cardio items).
- [ ] No volleyball words (approach, block, hit, serve, attack, setting, defense, volleyball) appear in exercise text shown in a general team (string search on rendered how-to; "arm swing" is left out of the search because the broad jump cue uses it for the jump itself).

### C2. New fields and values
| Tag | Values | Where |
|---|---|---|
| `Exercise.scope` | `'all'` (default) · `'general'` · `'volleyball'` | C1 |
| `Exercise.whyGeneral` | optional string | 27 exercises (`general-library.md` §5) |
| `ExerciseCategory` | adds `'cardio'` | `general-library.md` §3 |
| `Pattern` | adds `knee-ext`, `knee-flex`, `shoulder-iso`, `arm-flex`, `arm-ext`, `cardio` | `general-library.md` §3 |
| `Equipment` | adds `leg-press`, `leg-curl-machine`, `leg-extension-machine`, `chest-press-machine`, `shoulder-press-machine`, `assisted-pullup-machine`, `sled`, `bike`, `rower`, `treadmill`, `elliptical`, `stair-climber`, `jump-rope` (general teams' gym profile only) | `general-library.md` §2 |
| Gym equipment profile | per general team: subset of all 23 equipment items | spec B4 |
| Cardio slot | `{ exerciseId, durationMin (5–60), intensity: 'easy' \| 'moderate' }`; log stores `minutesDone` only | `adult-training-rules.md` §6 |
| `programs.goal` | `'strength'` · `'muscle'` · `'general'` · `'back_after_break'` | `adult-goals.md` §5 |
| Warm-up | `'W1'` · `'W2'` · `'W3'` (static content) | `general-library.md` §6 |
| Tier | the 39 general exercises are assigned in `general-library.md` §4a (cardio = `D`) | rest table unchanged |
