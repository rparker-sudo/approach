# Home and Mobility Days in Generator v3 (week setup)
Owner: Training Content / Sports Science (02) · v1.0 · Thu Nov 19, 2026
Status: **Ready for 2.4.1 Part D (D-062, spec D4). Unreviewed by a CSCS** (accepted risk D-059).
For: `product/specs/v2.4.1.md` Part D. The coach picks each day (**Off · Weight room · Home workout · Mobility**); this doc says what generator v3 puts on each day.
Replaces, **for v3 programs only:** the home archetypes and `HOME_RX` in `programs/home-workouts.md` §4–§5, and the home-session content in `generator-v3-rulings.md` R-3. **Still apply:** H1–H8 in `home-workouts.md` (caps, light day, rest day, match-day rules, no back-to-back lower-heavy days, home exclusions, jumps off by default), plus everything in `program-design.md` §9.
Builds on: `program-design.md` (§2 blocks, §5 prescriptions, §7 templates, §8 ladders, §8b positions), `programs/warmups.md` §5, `programs/extra-recovery-sessions.md`.

---

## 1. Principles
1. **The weight room does what only the weight room can:** Olympic derivatives, heavy bilateral lifts (B-block), the main plyometrics, barbell work, and GHD/partner hamstring work. Those never move home.
2. **Home days complement, they don't repeat.** A home workout covers what that week's weight-room days cover least: unilateral volume, upper-body volume, durability, and core.
3. **When home days exist, some weight-room work moves home**, so weight-room sessions get shorter and denser (that's usually why a coach has fewer weight-room days).
4. **Mobility days are recovery-focused care**, never strength work. They don't count toward the lift-day cap and aren't rest days.
5. **No days are moved.** Rules are met by choosing content (spec D2.1, D2.5).

## 2. The week table
### 2a. Weight-room template by count and phase
Templates are `program-design.md` §7. "Alt" = alternate the two days week by week.
| Weight-room days | Off-season (Accumulation / Strength / Strength-Power) | Preseason (Power) | In-season (Maintain) | Post-season (Restore) |
|---|---|---|---|---|
| **1** | **WR-T1:** Total squat (§7c Day 1) and Total hinge (§7c Day 2), alt | §7e Day 1 and Day 3, alt | §7f Day 1 Heavy (squat / trap bar deadlift alt, as written) | Restore full body (§7g) |
| **2** | §7c Day 1 + Day 2 | §7e Day 1 + Day 3; Day 2's Push Press joins Day 3's A-block | §7f Day 1 Heavy + Day 2 Fast | Restore A + B |
| **3** | §7b Day 1–3 | §7e Day 1–3 | Day 1 + Day 2 + **Day 3 only in a bye week**; otherwise the third weight-room day is a second **Day 2 Fast** at 2 sets | Restore A + B + C |
| **4** | §7a Day 1–4 | §7e Day 1–3 + §7d Day 5 (power + durability) | Over the in-season cap for everyone (3): the 4th becomes that athlete's light day (§5) | Restore A + B + C + §7d Day 5 at Restore volume |
**Order across the week:** the coach's weight-room days are filled in the template's order (Day 1 first). In-season, Day 1 Heavy goes on the earliest weight-room day that isn't within 2 days before a match (R7 placement, §7f); if none qualifies, Day 2 Fast goes there instead and Day 1 moves to the next qualifying weight-room day.

### 2b. Home workout types (what each home day covers)
| Type | Covers | Used when |
|---|---|---|
| **H-Upper** | Push, pull, vertical press, vertical pull, shoulder durability, anti-extension core | Weight-room days are total-body or lower-heavy, so upper volume is short |
| **H-Lower** | Unilateral squat, unilateral hinge, lateral, hamstring eccentric, adductor, knee/ankle durability | Weight-room days have one or fewer unilateral exposures per pattern |
| **H-Total** | One unilateral squat, push, pull, unilateral hinge, core, mixed durability | 1 weight-room day, or a third home day |
| **H-Durability** | Shoulder, knee/tendon, ankle, adductor, hamstring isometric/eccentric, core; strength-endurance only | 3–4 weight-room days already cover strength; also the second in-season home day |

### 2c. Which home types a week gets (off-season, preseason, post-season)
Home days are assigned in this order to the coach's home days (earliest first), then **H5/H4 swaps** (§2e) adjust them.
| Weight room \ Home days | 1 | 2 | 3 |
|---|---|---|---|
| **1** | H-Total | H-Lower, H-Upper | H-Lower, H-Upper, H-Total |
| **2** | H-Upper | H-Upper, H-Lower | H-Upper, H-Lower, H-Durability |
| **3** | H-Upper | H-Upper, H-Durability | H-Upper, H-Durability, H-Lower |
| **4** | H-Durability | H-Durability, H-Upper | H-Durability, H-Upper, H-Lower |
**In-season override:** home types are **H-Upper** (first home day) and **H-Durability** (any others). No H-Lower or H-Total in-season (keep legs fresh for matches). Jumps at home are off in-season regardless of the toggle (H7).
**Post-season:** same table; every home session uses Restore prescriptions (§3c).

### 2d. What moves from the weight room to home
| Condition | Moves home | Stays in the weight room |
|---|---|---|
| **≥ 1 home day** | **E-block durability:** each weight-room session keeps **one** durability item (the position's top item, §8b) as a filler in the B-block rests; the rest goes to the week's first H-Upper, H-Durability, or H-Lower | A, B, C, and D blocks |
| **≥ 2 home days** | **Upper accessories** from D-blocks (Face Pull, Rear Delt Fly, upper-back isolation) go to H-Upper | Posterior-chain D work: Glute-Ham Raise, Nordic (they need a GHD or a partner), Copenhagen, Pallof, carries |
| **≥ 2 home days and ≤ 2 weight-room days** | The **second unilateral lower pattern** of each C-block (Lateral Squat or Single-Leg RDL) goes to H-Lower; each weight-room C-block keeps one unilateral lower + one upper pair | Rear-Foot Elevated Split Squat (the main unilateral) |
| **≥ 1 mobility day and no home days** | E-block shoulder and ankle items shrink to **1 round** in the weight room; the mobility day's position-care section covers them | Tendon isometrics (Spanish squat, split-squat hold) |
| **Never moves** | — | A-block (Olympic derivatives, plyos, throws), B-block, anything with a barbell, trap bar, cable, GHD, box jumps, depth/hurdle work (H6) |
Moved work is listed in the weight-room session's coach note: *"Shoulder circuit is on Saturday's home workout."*

### 2e. Placement checks (content swaps, never day moves)
Run per athlete after §2c:
1. **H5:** an H-Lower or H-Total next to a lower-heavy day (any weight-room day with a squat or hinge B-block, which is every weight-room template except §7a/§7e Upper days) swaps type with another home day that isn't; if none, it becomes **H-Upper** (or **H-Durability** if H-Upper is already in the week).
2. **H4:** a home day the day before a match or tournament is **H-Upper or H-Durability** only. A home workout **on** a match or tournament day becomes **Off** for that athlete (H4), with the summary line saying so.
3. **H3:** if the coach's days leave no fully Off day, the athlete's lowest-priority non-weight-room session (§5 order; mobility last) becomes Off.

## 3. v3 home session templates
### 3a. Architecture
Every home workout: **home warm-up** (`warmups.md` §5) → **A** (only if jumps at home are on) → **B** → **C** superset → **D** superset → **E** circuit. Slot defaults are the **Home / bodyweight rung** of each ladder (`program-design.md` §8a); each athlete's app resolves the slot to the best exercise that fits **their home equipment and level** (existing home behavior), never above their level, never with H6 equipment.

### 3b. Templates (slot → home default; what resolution can pick with home equipment)
**H-Upper**
| Block | Slot (ladder) | Home default | With home equipment (examples) |
|---|---|---|---|
| B | Horizontal press | Push-Up (Incline Push-Up for beginners) | DB Floor Press (dumbbells), DB Bench (dumbbells + bench) |
| C1 | Horizontal pull | Doorframe Row | One-Arm DB Row (dumbbells), Ring Row (suspension) |
| C2 | Vertical press | Pike Push-Up (L2; beginners: Push-Up) | Half-Kneeling DB Press (dumbbells) |
| D1 | Vertical pull | Prone Floor Pulldown | Band Pulldown (bands), Pull-Up / Chin-Up (pull-up bar, L2) |
| D2 | Anti-extension | Dead Bug | Plank, Ab Rollout only if the athlete has a wheel (not in the home list, so no) |
| E | Shoulder durability (position) | Y-T-W (no weight) · Wall Slide · Push-Up Plus | Side-Lying ER (dumbbells), Band ER / Face Pull (bands) |

**H-Lower**
| Block | Slot | Home default | With home equipment |
|---|---|---|---|
| A* | Single-leg / lateral plyo | Line Hops or Skater Hop (level 1) | — (level 1 only at home) |
| B | Unilateral squat | Reverse Lunge | Front-Foot Elevated Split Squat (step), Rear-Foot Elevated Split Squat (bench or couch-height step, L2), DB-loaded versions |
| C1 | Unilateral hinge | Single-Leg Glute Bridge | Single-Leg RDL (L2; DB), Single-Leg Hip Thrust (bench) |
| C2 | Lateral | Lateral Lunge | Lateral Squat (L2; DB or KB) |
| D1 | Hamstring eccentric | Slider Hamstring Curl (towel) | — |
| D2 | Adductor | Short-Lever Copenhagen on a sturdy step (`box`); without a step: Side Plank | Copenhagen (L2; step) |
| E | Knee/ankle durability (position) | Isometric Split Squat · Bent-Knee Calf Raise · Tibialis Raise | DB-loaded calf raise, Wall Sit |

**H-Total**
| Block | Slot | Home default |
|---|---|---|
| A* | Vertical plyo | Squat Jump (level 1) |
| B | Unilateral squat | Reverse Lunge |
| C1 / C2 | Horizontal press / Horizontal pull | Push-Up / Doorframe Row |
| D1 / D2 | Unilateral hinge / Rotation | Single-Leg Glute Bridge / Side Plank |
| E | Mixed durability (position) | 3 items: one shoulder, one knee/ankle, one core |

**H-Durability** (no B-block; strength-endurance)
| Block | Content (home defaults) |
|---|---|
| C1 / C2 | Isometric Split Squat / Push-Up Plus |
| D1 / D2 | Slider Hamstring Curl (towel) / Short-Lever Copenhagen (step) or Side Plank |
| E | Shoulder circuit (Y-T-W, Wall Slide, Side-Lying ER if dumbbells) + ankle (Bent-Knee Calf Raise, Tibialis Raise) + Dead Bug |
\* **A-block at home (H7):** only when **Jumps at home** is on **and** the phase is off-season or preseason. **Level 1 jumps only** for every athlete (unsupervised): Pogo Hops, Squat Jump, Line Hops, Skater Hop, Countermovement Jump. **≤ 20 contacts**, cue *"Clear space, no low ceilings, sneakers on."* Practice-load cuts (R-4) apply. H-Upper and H-Durability never have an A-block.
**Position emphasis** (§8b) picks the E-block items and one extra E item for the position, as in weight-room sessions.

### 3c. Home prescriptions by block (replaces `HOME_RX` for v3)
RPE cap **7** at home (R-3); beginners one step lower. Rest: from the tier table with home limits (tier B ≤ 90 s, tier C ≤ 45 s, tier D 30 s; `rest-and-supersets.md` §3).
| Role | Restore | Accumulation | Strength | Strength-Power / Power | Maintain (in-season) |
|---|---|---|---|---|---|
| A (jumps, H7) | — | 2 × 5 | 2 × 4 | 2 × 3 | — |
| B | 3 × 10–12, tempo 3-1-1 | 3 × 10–12, RPE 6–7 | 3 × 8–10, RPE 7 (tempo 3-0-1 if bodyweight is easy) | 3 × 6–8, RPE 7, fast up | 2 × 8–10, RPE 6 |
| C | 2–3 × 10–12 | 3 × 10–12 | 3 × 8–10 | 3 × 8 | 2 × 8–10 |
| D | 2 × 12–15 | 3 × 12–15 | 3 × 10–12 | 2 × 10–12 | 2 × 10 |
| E | 2 rounds, 12–15 / 30 s | 2 rounds | 2 rounds | 2 rounds | 1–2 rounds |
| H-Durability (all blocks) | 2 × 12–15 / 30–45 s, RPE 6 | same | same | same | same |
**Across the 4-week block:**
| Week | Change |
|---|---|
| 1 | As above |
| 2 | +2 reps on B and C (top of the range) |
| 3 | Same reps; the slot moves **one rung up** if the athlete hit the top of the range on every set in week 2 and the next rung fits their level and equipment (the existing "Ready for a harder version?" suggestion, shown as the default); otherwise tempo 3-1-1 on B |
| 4 Deload | About −40% sets, RPE 6, same rest (R8) |
**Target length:** 30 min (phase default for home, spec D2.7), fit by `fitSession`.

## 4. v3 mobility session
### 4a. Structure (bodyweight only; a towel and a sturdy step are fine; no load, no jumps; RPE ≤ 5)
| Part | Time | Content |
|---|---|---|
| **M1 Breathe** | 2 min | Crocodile Breathing × 5 breaths |
| **M2 Mobility flow** | 8 min | 4 items, rotating week to week: World's Greatest Stretch 3/side · 90/90 Hip Switch 5/side · Knee-to-Wall Ankle Rock 8/side · Open Book 5/side · Cat-Camel 8 · Half-Kneeling Hip Flexor Stretch 30 s/side · Child's Pose Lat Reach 20 s/side · Lying Hamstring Stretch (towel) 30 s/side |
| **M3 Position care** | 6 min | 3 items by position (below), 2 rounds |
| **M4 Core** | 3 min | Dead Bug 6/side · Side Plank 20 s/side, slow and controlled |
| **Close** | 1 min | Crocodile Breathing × 3 breaths |
**Position care (M3):**
| Position | Items |
|---|---|
| Outside / Opposite | Wall Slide 8 · Y-T-W (no weight) 6 each · Push-Up Plus 8 |
| Middle Blocker | Bent-Knee Calf Raise 12 · Isometric Split Squat 30 s/side · Tibialis Raise 15 |
| Setter | Wall Slide 8 · Y-T-W (no weight) 6 each · Wrist & Finger Strength (no weight) 15 |
| Libero / DS | Short-Lever Copenhagen 15 s/side (step; or Side Plank) · Lateral Lunge (no weight) 5/side · Single-Leg Balance Reach 4/side |
| All positions / mixed group | Wall Slide 8 · Isometric Split Squat 30 s/side · Side Plank 15 s/side |
### 4b. By phase
| Phase | Length | Changes |
|---|---|---|
| Off-season, preseason | **20 min** | As above |
| In-season | **15 min** | M2: 3 items; M3: 1 round; skip Close |
| Post-season (Restore) | **25 min** | M2: 6 items with longer holds (45 s); M3: 2 rounds |
| **On a match or tournament day** (ruling §5) | **12 min** | Labeled *"After your match."* M1, M2 (3 items), M4 only; no position care |
Effort line on the session: *"Easy. Move slowly and breathe. Nothing here should feel hard."* No warm-up card (spec D2.4). No weight suggestions. Logging: one Done per part.

### 4c. How it differs from the light home day and extra recovery
| | **Mobility day (v3)** | **Light home day (H2)** | **Extra recovery (ER1–ER5)** |
|---|---|---|---|
| Who decides | The coach puts it in the week | The generator, only when a home workout is over an athlete's cap | The athlete, optional |
| Content | Breathing, mobility flow, **position care**, core | Mobility + care + core + **one easy single-leg strength move** | Prehab and mobility only; no core, no position logic |
| Effort | RPE ≤ 5, no load | RPE ≤ 6, bodyweight | Easy |
| Length | 20 min (15 in-season, 25 post) | 15–20 min | 10–13 min |
| Counts toward the lift-day cap | No | No (it's the one allowed beyond the cap) | No |
| Rest day? | No | No | Doesn't break a rest day |
| Effort board | Prescribed session (like the light day, TM-4) | Prescribed session | 5 points, max 2 a week |
| Warm-up card | No | No | No |

## 5. Rulings
1. **Mobility on a match or tournament day: allowed.** It's the coach's choice. The generator uses the **12-min "After your match"** version (§4b). **Recommend never places mobility on a match day.**
2. **Recommend placement** (fills Off days only; keeps the coach's weight-room days):
   1. **Totals:** `home-workouts.md` §3 recommended totals for the phase, at **intermediate** level; per-level caps then trim per athlete (§5.3). Mobility: **1** day by default (in-season and post-season **2** if the week has room).
   2. **Mobility first:** the day after a match or tournament; if none, the day after the week's hardest weight-room day (the first lower-heavy weight-room day); never on a match day.
   3. **Home workouts next:** not on a match or tournament day; not the day before one unless it will be H-Upper/H-Durability; not next to a lower-heavy weight-room day if it will be H-Lower or H-Total (§2e); prefer days with no volleyball; spread out (no two home days in a row when another day is free).
   4. **Keep ≥ 1 fully Off day.** If filling would remove the last Off day, drop the last mobility day, then the last home day.
   5. Then assign home types with §2c and run §2e.
3. **Which per-athlete cap replacement comes first** (spec D2.5). An athlete over their R6 cap (weight room + home workouts count; mobility doesn't):
   1. Replace **one** home workout with the **light home day**, choosing in this order: **H-Durability → H-Lower → H-Total → H-Upper** (H-Durability adds least; H-Lower is the biggest fatigue risk on top of leg-heavy weight-room days; H-Upper interferes least with volleyball).
   2. Any further home workouts over the cap: **Off**, same order.
   3. If **weight-room days alone** are over the cap (e.g., in-season with 4): the **last weight-room day in template order** becomes that athlete's light day (done where scheduled, labeled "Light day"), then Off.
   4. **Mobility days are never replaced or dropped** for cap reasons (they only go for H3, last).
   5. The per-level summary line names the result: *"Beginners: 2 weight room + 1 home workout + 1 light day + 1 mobility day (max 3 full lift days for their level)."*

## 6. Code-ready constants
```ts
type Phase = 'off' | 'pre' | 'in' | 'post';
type HomeType = 'H-Upper' | 'H-Lower' | 'H-Total' | 'H-Durability';

/** §2c: home types by weight-room days (1–4) and home days (1–3), off/pre/post. */
export const HOME_ASSIGN: Record<2 | 3 | 4, HomeType[]> = {
  2: ['H-Upper', 'H-Lower', 'H-Durability'],
  3: ['H-Upper', 'H-Durability', 'H-Lower'],
  4: ['H-Durability', 'H-Upper', 'H-Lower'],
};
// 1 weight-room day is special-cased in homeTypes() (1 home: H-Total; 2: H-Lower, H-Upper; 3: all three).
export function homeTypes(wr: 1 | 2 | 3 | 4, homes: 0 | 1 | 2 | 3, phase: Phase): HomeType[] {
  if (homes === 0) return [];
  if (phase === 'in') return Array.from({ length: homes }, (_, i) => (i === 0 ? 'H-Upper' : 'H-Durability'));
  if (wr === 1) return homes === 1 ? ['H-Total'] : homes === 2 ? ['H-Lower', 'H-Upper'] : ['H-Lower', 'H-Upper', 'H-Total'];
  return HOME_ASSIGN[wr].slice(0, homes);
}

/** §5.3: which home workout becomes the light day first, then Off. */
export const CAP_REPLACE_ORDER: HomeType[] = ['H-Durability', 'H-Lower', 'H-Total', 'H-Upper'];

/** §3b: slot lists (ladder slot ids from program-design §8a). Defaults = the ladder's home rung. */
export const HOME_TEMPLATES: Record<HomeType, { block: 'A' | 'B' | 'C' | 'D' | 'E'; slot: string; group?: string }[]> = {
  'H-Upper': [
    { block: 'B', slot: 'horizontal-press' },
    { block: 'C', slot: 'horizontal-pull', group: 'C' }, { block: 'C', slot: 'vertical-press', group: 'C' },
    { block: 'D', slot: 'vertical-pull', group: 'D' }, { block: 'D', slot: 'anti-extension', group: 'D' },
    { block: 'E', slot: 'shoulder', group: 'E' }, { block: 'E', slot: 'shoulder', group: 'E' }, { block: 'E', slot: 'shoulder', group: 'E' },
  ],
  'H-Lower': [
    { block: 'A', slot: 'single-leg-plyo' },           // only if homeJumps && phase in ['off','pre']; level 1 only
    { block: 'B', slot: 'unilateral-squat' },
    { block: 'C', slot: 'unilateral-hinge', group: 'C' }, { block: 'C', slot: 'lateral', group: 'C' },
    { block: 'D', slot: 'hamstring-eccentric', group: 'D' }, { block: 'D', slot: 'adductor', group: 'D' },
    { block: 'E', slot: 'knee-tendon', group: 'E' }, { block: 'E', slot: 'ankle', group: 'E' }, { block: 'E', slot: 'ankle', group: 'E' },
  ],
  'H-Total': [
    { block: 'A', slot: 'reactive-plyo' },             // home rung: Squat Jump / Pogo; same A-block rule
    { block: 'B', slot: 'unilateral-squat' },
    { block: 'C', slot: 'horizontal-press', group: 'C' }, { block: 'C', slot: 'horizontal-pull', group: 'C' },
    { block: 'D', slot: 'unilateral-hinge', group: 'D' }, { block: 'D', slot: 'rotation', group: 'D' },
    { block: 'E', slot: 'shoulder', group: 'E' }, { block: 'E', slot: 'knee-tendon', group: 'E' }, { block: 'E', slot: 'anti-extension', group: 'E' },
  ],
  'H-Durability': [
    { block: 'C', slot: 'knee-tendon', group: 'C' }, { block: 'C', slot: 'shoulder', group: 'C' },
    { block: 'D', slot: 'hamstring-eccentric', group: 'D' }, { block: 'D', slot: 'adductor', group: 'D' },
    { block: 'E', slot: 'shoulder', group: 'E' }, { block: 'E', slot: 'ankle', group: 'E' }, { block: 'E', slot: 'anti-extension', group: 'E' },
  ],
};
// Slot ids = program-design §8a rows, kebab-case: 'horizontal-press', 'horizontal-pull', 'vertical-press', 'vertical-pull', 'anti-extension',
// 'rotation' (Rotation / anti-rotation), 'unilateral-squat', 'unilateral-hinge', 'lateral', 'hamstring-eccentric', 'adductor', 'knee-tendon',
// 'shoulder', 'reactive-plyo', 'single-leg-plyo'.
// 'ankle' isn't a §8a ladder: use pool ['soleus-calf-raise', 'tib-raise', 'calf-raise', 'ankle-balance'] (all bodyweight-capable).
// E slots draw distinct exercises; position emphasis (§8b) picks the first E item.

/** §3c: home prescriptions by block and role (reps as strings, RPE capped at 7 at home). */
export const HOME_RX_V3 = {
  restore:       { A: null, B: ['3', '10–12', 'RPE 6, tempo 3-1-1'], C: ['3', '10–12', 'RPE 6'], D: ['2', '12–15', 'RPE 6'], E: ['2', '12–15', 'Light'] },
  accumulation:  { A: ['2', '5', 'Fast, land soft'], B: ['3', '10–12', 'RPE 6–7'], C: ['3', '10–12', 'RPE 6–7'], D: ['3', '12–15', 'RPE 6–7'], E: ['2', '12–15', 'Light'] },
  strength:      { A: ['2', '4', 'Fast, land soft'], B: ['3', '8–10', 'RPE 7'], C: ['3', '8–10', 'RPE 7'], D: ['3', '10–12', 'RPE 7'], E: ['2', '12–15', 'Light'] },
  strength_power:{ A: ['2', '3', 'Fast, land soft'], B: ['3', '6–8', 'RPE 7, fast up'], C: ['3', '8', 'RPE 7'], D: ['2', '10–12', 'RPE 7'], E: ['2', '12–15', 'Light'] },
  power:         { A: ['2', '3', 'Fast, land soft'], B: ['3', '6–8', 'RPE 7, fast up'], C: ['3', '8', 'RPE 7'], D: ['2', '10–12', 'RPE 7'], E: ['2', '12–15', 'Light'] },
  maintain:      { A: null, B: ['2', '8–10', 'RPE 6'], C: ['2', '8–10', 'RPE 6'], D: ['2', '10', 'RPE 6'], E: ['1–2', '12–15', 'Light'] },
  durability:    { all: ['2', '12–15 / 30–45 s', 'RPE 6'] },
} as const;
// Week 2: +2 reps on B and C. Week 3: one rung up if earned (else tempo 3-1-1 on B). Week 4: −40% sets, RPE 6, same rest.

/** §4: mobility session. Stored as a home session with mobility: true; no warm-up; RPE ≤ 5. */
export const MOBILITY_V3 = {
  minutes: { off: 20, pre: 20, in: 15, post: 25, matchDay: 12 },
  parts: ['M1 Breathe', 'M2 Mobility flow', 'M3 Position care', 'M4 Core', 'Close'],
  flowPool: ['worlds-greatest', 'hip-90-90', 'ankle-rock', 'thoracic-rotation', 'cat-camel', 'hip-flexor-stretch', 'lat-reach', 'band-hamstring'],
  careByPosition: {
    'Outside Hitter': ['wall-slide', 'ytw', 'push-up-plus'], Opposite: ['wall-slide', 'ytw', 'push-up-plus'],
    'Middle Blocker': ['soleus-calf-raise', 'iso-split-squat', 'tib-raise'],
    Setter: ['wall-slide', 'ytw', 'wrist-roller'],
    'Libero / DS': ['short-lever-copenhagen', 'lateral-lunge', 'ankle-balance'],
    'All positions': ['wall-slide', 'iso-split-squat', 'side-plank'],
  },
  core: ['dead-bug', 'side-plank'],
} as const;
```
Session naming uses existing fields only: `name` = "Home Upper," "Home Lower," "Home Total," "Home Durability," "Mobility"; `location: 'home'`; `mobility: true` or `light: true` as today. **No new keys** (spec D5).

## 7. Acceptance examples
### Example 1: the founder's week (off-season, Strength block week 2, intermediate outside hitter, full weight room)
**Setup:** Mon **Mobility** · Tue **Weight room** · Wed Off · Thu **Weight room** · Fri Off · Sat **Home workout** · Sun Off. No volleyball events.
**Table lookups:** 2 weight-room days → §7c Day 1 (Tue) + Day 2 (Thu). 2 WR + 1 home → **H-Upper** (Sat). ≥ 1 home day → E-blocks move home except one filler each. Caps: intermediate off-season 4; full lift days 3 ✓. H3: Wed, Fri, Sun Off ✓. H5: Sat isn't next to Thu ✓ (and H-Upper isn't lower).
| Day | Session (as built for this athlete) |
|---|---|
| **Mon · Mobility (20 min)** | M1 Crocodile Breathing × 5 · M2 World's Greatest Stretch 3/side, 90/90 Hip Switch 5/side, Ankle Rock 8/side, Open Book 5/side · M3 (outside hitter) Wall Slide 8, Y-T-W no weight 6 each, Push-Up Plus 8 × 2 rounds · M4 Dead Bug 6/side, Side Plank 20 s/side · Close × 3 breaths |
| **Tue · Weight room, Total: squat (§7c Day 1)** | Warm-up (lower: squat, Olympic) · **A** Hang High Pull 5 × 2, RPE 7 (intermediate rung of Hang Power Clean) + Box Jump 3 × 3 · **B** Back Squat 5 × 4 at 80%, with **Spanish Squat Hold 30 s** as the filler in the rests (the one E item that stays) · **C** Bench Press 4 × 5 + One-Arm DB Row 4 × 6 each · **D** Single-Leg RDL 3 × 8 each + Pallof Press 3 × 10 each · Note: *"Shoulder circuit is on Saturday's home workout."* |
| **Thu · Weight room, Total: hinge (§7c Day 2)** | Warm-up (lower: hinge) · **A** Push Press 5 × 2, RPE 7 + Med Ball Rotational Throw 3 × 4 each · **B** Trap Bar Deadlift 5 × 4 at 80%, with **90/90 ER Hold 20 s each** as the filler · **C** Rear-Foot Elevated Split Squat 4 × 6 each + Pull-Up 4 × 5 (intermediate rung of Weighted Pull-Up) · **D** Copenhagen 3 × 20 s each + Face Pull 3 × 12 (Face Pull stays: upper accessories move home only with ≥ 2 home days) |
| **Sat · Home workout, H-Upper (30 min)** | Home warm-up (6 min) · **B** Push-Up 3 × 10 (week 2: top of 8–10), RPE 7 · **C** Doorframe Row 3 × 10 + Pike Push-Up 3 × 8 · **D** Prone Floor Pulldown 3 × 12 + Dead Bug 3 × 6 each · **E** (moved from Tue/Thu) Y-T-W 12, Wall Slide 12, Push-Up Plus 12, 2 rounds. With dumbbells at home the app picks DB Floor Press, One-Arm DB Row, Half-Kneeling DB Press, and adds Side-Lying ER. |
**Pass if:** exactly these 4 sessions on these days; Tue/Thu keep A and B; Sat is H-Upper with no H6 equipment and no A-block; Mon has no load and no warm-up card; nothing is relabeled from a gym session; moving the home workout to **Wed** turns it into **H-Upper still** (2c), and with a **second home day on Wed**, Wed (between two leg-heavy days) is **H-Upper** and Sat becomes **H-Lower** (§2c + §2e swap), and Face Pull then moves from Thu to Wed (≥ 2 home days).

### Example 2: in-season with a Saturday tournament (intermediate middle blocker)
**Setup:** practices Mon–Fri. Mon **Weight room** · Tue Off · Wed **Weight room** · Thu **Home workout** · Fri Off · Sat Tournament (Off) · Sun **Mobility**.
**Lookups:** in-season, 2 weight-room days → §7f Day 1 Heavy (Mon: not within 2 days of a match ✓) + Day 2 Fast (Wed: not the day before a match ✓). In-season home → **H-Upper** (Thu). Caps: in-season 3; full lift days 3 ✓. H3: Tue, Fri Off ✓. Sun mobility = the day after the tournament ✓.
| Day | Session |
|---|---|
| **Mon · Day 1 Heavy** | **A** Hang High Pull 3 × 2 + Box Jump **1 × 3** (practice day: contacts −30% → 6 to 4 → one set dropped, never below 1) · **B** Back Squat 3 × 3 at 80% + Spanish Squat Hold filler · **C** Bench Press + Chin-Up 2 × 5 · Note: *"Durability is on Thursday's home workout."* |
| **Wed · Day 2 Fast** | **A** Med Ball Overhead Throw 2 × 3 + Pogo Hops **1 × 10** (practice day −30%) · **B** Trap Bar Jump 3 × 3 · **C** One-Arm DB Row + Landmine Press 2 × 6 · Bent-Knee Calf Raise filler |
| **Thu · Home, H-Upper (in-season Maintain)** | **B** Push-Up 2 × 10, RPE 6 · **C** Doorframe Row 2 × 10 + Pike Push-Up 2 × 8 · **D** Prone Floor Pulldown 2 × 10 + Dead Bug 2 × 6 each · **E** (middle blocker emphasis) Bent-Knee Calf Raise 12, Tibialis Raise 15, Wall Slide 12, 1 round. No A-block (in-season). |
| **Sun · Mobility (15 min, in-season)** | M1 · M2 (3 items: Ankle Rock, 90/90, Hip Flexor Stretch) · M3 middle blocker 1 round (Bent-Knee Calf Raise 12, Isometric Split Squat 30 s/side, Tibialis Raise 15) · M4 |
**Pass if:** no session on Sat; Thu is H-Upper; Mon/Wed plyo sets show the practice-day cut; if the coach had put the home workout on **Fri** (day before the tournament), it's **H-Upper** (allowed); if the coach had put **Mobility on Sat**, it's the **12-min "After your match"** version.

### Example 3: beginner over the cap (off-season, beginner outside hitter, same team)
**Setup:** Mon **Mobility** · Tue **Weight room** · Wed **Home workout** · Thu **Weight room** · Fri Off · Sat **Home workout** · Sun Off.
**Lookups:** 2 WR + 2 home → H-Upper, H-Lower in day order (Wed, Sat). §2e: Wed is between two leg-heavy days, so it **can't** be H-Lower; Wed = **H-Upper**, Sat = **H-Lower**. ≥ 2 home days → Thu's Face Pull moves to Wed. The §2d C-block rule moves nothing here: §7c's C-blocks have only one unilateral lower each (Thu's RFE Split Squat stays).
- **Intermediate:** all 5 sessions (cap 4: 2 WR + 2 home = 4 ✓).
- **Beginner (cap 3):** 2 WR + 2 home = 4 > 3 → replace one home workout with the light day, in order H-Durability (none) → **H-Lower** → Sat becomes the **light home day** (H2). Week: Mon Mobility · Tue Weight room · Wed H-Upper · Thu Weight room · **Sat Light day** · Fri, Sun Off.
- Beginner's weight-room sessions resolve down: Med Ball Scoop Toss (or Squat Jump without a med ball) for Hang Power Clean, Goblet Squat for Back Squat, DB Bench for Bench Press, Front-Foot Elevated Split Squat for RFE Split Squat, effort one RPE lower.
- **Summary line:** *"2 weight room + 2 home workouts + 1 mobility day. Beginners: 2 weight room + 1 home workout + 1 light day + 1 mobility day (max 3 full lift days for their level)."*
**Pass if:** the beginner's Sat is the light day (not H-Upper, not Off); the intermediate's Sat is H-Lower; Mon mobility stays for both; Fri and Sun stay Off for both.

## 8. Acceptance criteria (for Product, Part D)
- [ ] Weight-room days use the §2a template for their count and phase; Olympic, B-block, main plyos, and H6 equipment never appear at home.
- [ ] Home days get the §2c types (in-season override), adjusted only by §2e; each uses the §3b slot list with home-rung defaults resolved per athlete.
- [ ] §2d moves happen exactly at their conditions, with the coach note on the weight-room session.
- [ ] Home prescriptions follow §3c by block and week (RPE ≤ 7; beginners −1); the A-block appears only with Jumps at home on in off-season/preseason, level 1 only, ≤ 20 contacts.
- [ ] Mobility sessions follow §4 by phase and position (12-min version on match days); no load, no jumps, no warm-up card; they don't count toward the cap.
- [ ] Recommend follows §5.2; cap replacement follows §5.3 (order H-Durability → H-Lower → H-Total → H-Upper; one light day; mobility never dropped for caps).
- [ ] Examples 1–3 pass as written, including the variations listed under each.
- [ ] No new fields or program JSON keys.
