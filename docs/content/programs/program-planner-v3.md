# Program Planner v3: Program Length, Rack-Aware Sessions, Coaching Detail
Owner: Training Content / Sports Science (02) · v1.0 · Fri Nov 20, 2026
Status: **Draft for founder approval → next release after 2.4.1. Unreviewed by a CSCS** (accepted risk D-059).
Founder requests (11/20): (0) **the workout style is asked during setup or suggested from the equipment and number of racks** (§2a); (1) generated workouts should match the planning, detail, and efficiency of the example workout Ryan shared on 11/18 (`program-design.md` §4b); (2) the builder should take the coach's limits and **build the best program for a set period: start and end dates, or a number of weeks.**
Builds on: `program-design.md` (§2–§9, §4a session length, §4b rack rotation), `programs/home-and-mobility-v3.md`, `generator-v3-rulings.md` v1.1, `programs/warmups.md` v1.1, `programs/testing-day-checklist.md` Part 3.

---

## 0. Why 2.4.1's generated workouts still don't look like the example
Checked against the deployed code (`src/lib/generatorV3.ts`, `weekV3.ts`, `rotation.ts` on `main`, 2.4.1):
| Gap | In the example | In 2.4.1 | Fix |
|---|---|---|---|
| **Session format** | Built for groups of 4 sharing one rack: 3 rotations on a shared clock, a spotter turn, one rack lift per rotation | Generated sessions are always **Standard** (one athlete at a time through A–E). Rack rotation exists only when a coach switches a session by hand. Spec `training-v3.md` 3.1 item 11 ("the team's chosen default format") wasn't built | **§2: rack-aware generation**, with the style chosen or suggested at setup (§2a) |
| **Organization for the room** | Exercises picked so the rack and bar are never needed by two people at once | Templates assume unlimited racks/bars (e.g., squat and bench in the same day's B and C blocks with a pull-up on the same rack) | **§2b** one-rack, one-bar rule per rotation |
| **Coaching detail** | Intent cues ("bar speed is the priority," "step down," "stick 2 s"), week-to-week notes ("72–73%, up from 70%"), jump count, block time and rotation length | Rows carry sets/reps/effort only; notes exist on 3 slots (depth-jump box, home jumps, moved care) | **§3: coaching layer** (cues, week notes, session summary lines) |
| **Cooldown** | 2 min at the end | None | **§3d** |
| **Fit to the room** | Volume chosen to fit 45 min with 4 per rack | `fitSession` trims Standard sessions by time; it doesn't know athletes wait for the rack | **§2** rotation timing replaces waiting; **§2e** fitting by rounds |
| **Plan length** | n/a | Programs run as rolling 4-week blocks with no end; the coach can't say "8 weeks until preseason" | **§1: program length planner** |
The training content (exercises, blocks, prescriptions) is the same as or more advanced than the example. What's missing is that **the generator never organizes it for a real weight room** and **doesn't explain it to the athlete**. That's what this doc adds.

---

## 1. Program length planner
### 1a. What the coach enters (builder, before Build)
- **Program length:** **Start date + End date**, or **Start date + number of weeks** (1–52). Default: start = next Monday, 8 weeks.
- **What happens at the end** (one choice): **Season starts** (end date = first match or first practice) · **Testing day** · **Break** · **Nothing special.** If the team calendar already has the season's first match, Approach suggests it as the end date.
- Everything already in the builder still applies: week setup (Off / Weight room / Home workout / Mobility), session length (per day or date), equipment, racks and group size, level mix, combined calendar.

### 1b. How Approach plans it: backward from the end date
1. **Phase by date.** Each week's phase comes from the calendar: weeks before the first practice = off-season; first practice to first match = preseason; first match to last match = in-season; after = post-season. (Club matches on the combined calendar still switch to Maintain, as now.)
2. **Anchor the end.** The last block is chosen for what happens at the end:
   - **Season starts:** the last 1–2 weeks are **Power** (preseason) with volume about −30% in the final week (arrive fresh). If the weeks before that are off-season, the block before Power is **Strength-Power**.
   - **Testing day:** the last week is a **deload**, with the test on the week's last lift day (testing rules unchanged: ≥ 48 h before a match, supervision lock).
   - **Break:** the last week is a normal loading week; no taper.
   - **Nothing special:** blocks run in order with no taper.
3. **Fill backward** with the block sequence for the phase (§1c table), so the program **ends on the right block** rather than wherever a rolling cycle happens to be.
4. **Deloads:** every block ends with one, except a block that's immediately followed by the taper week (the taper replaces it). No more than 4 loading weeks in a row.
5. **Testing suggestions:** a testing day at the end of **week 1** (baseline; if no result in the last 12 weeks) and in the **last week** when the end is "Testing day" or "Season starts." Coach picks; the existing date rules apply.
6. **Breaks inside the window** (coach-set): the block pauses; after 14+ days the block restarts at week 1 (existing rule) and the plan re-flows to still end on the end date, **shortening Accumulation first**.

### 1c. Block allocation by length (off-season; weeks include deloads)
| Weeks | Off-season plan (end = season starts) | Off-season plan (end = nothing special / testing) |
|---|---|---|
| 1–2 | Power (2nd week −30% volume) | Strength (no deload) |
| 3 | Strength-Power 2 + Power 1 (taper) | Strength 2 + deload |
| 4 | Strength 2 · Power 2 (taper last) | Strength 3 + deload |
| 5 | Accumulation 2 · Strength-Power 2 · Power 1 | Accumulation 2 · Strength 2 + deload |
| 6 | Strength 3 (2 + deload) · Strength-Power 2 · Power 1 | Accumulation 3 (2 + deload) · Strength 3 (2 + deload) |
| 8 | Accumulation 3 · Strength 3 · Power 2 | Accumulation 4 · Strength 4 |
| 10 | Accumulation 3 · Strength 4 · Strength-Power 2 · Power 1 | Accumulation 3 · Strength 4 · Strength-Power 3 |
| 12 | Accumulation 4 · Strength 4 · Strength-Power 3 · Power 1 | Accumulation 4 · Strength 4 · Strength-Power 4 |
| 13–16 | 12-week plan + one more Strength block before Strength-Power | 12-week plan + Strength 4 (repeat) |
| 17+ | Cycle Strength → Strength-Power from week 13, with a **Restore week** every 12–16 weeks, anchored to the end | Same |
Weeks between table rows: add the extra week to the **earliest** block (most room to absorb it); remove weeks from Accumulation first, then Strength-Power. A block is never shorter than 2 weeks.

**Other phases**
| Phase | Plan |
|---|---|
| Preseason | All Power. 1–2 weeks: no deload, last week −30% volume. 3–4 weeks: Power 3 + taper week |
| In-season | Maintain 2-week cycles to the end date; bye weeks get Day 3; every 4th week −30% volume if there's no bye week in that stretch |
| Post-season | Restore 2–4 weeks; anything longer continues into off-season Accumulation |
| Spans phases | Each phase gets its own section of the plan at the calendar dates; the off-season part is planned backward from the first practice |

### 1d. What the coach sees (plan view)
- A **timeline** of the whole program: one row per week with the date, block name, week in block ("Strength · week 2 of 4"), deload/taper/testing markers, and the week's day kinds.
- One line under it: *"8 weeks, Nov 30 – Jan 24: Accumulation (3) → Strength (3) → Power (2). Ends fresh for the first match on Jan 26."*
- Changing the dates, weeks, end type, or week setup **rebuilds the plan** (generated sessions only; coach-edited sessions stay the coach's).
- When the program ends: *"Varsity's program ended Jan 24. Build the next one?"* (pre-filled with the next phase).

### 1e. Data (for Product and Legal)
Needs **two program JSON keys** (no table or column): `program.startDate` (exists as `blockStart`; reuse) and **`program.endDate`** plus **`program.endType: 'season' | 'testing' | 'break' | 'none'`**. Not data about athletes. **Product/Legal to approve** under G-5 before the build.

---

## 2. Rack-aware generation (the example's efficiency)
### 2a. Session style: asked on the way in, suggested from the room
Founder request (11/20): the workout style is chosen **during program setup**, before Build, and Approach **suggests** one from the coach's room.
**Setup step "Your weight room"** (after week setup, before Build):
1. **Racks or platforms:** a number (0–12). If the team already has rack groups, it's pre-filled from them.
2. **Equipment:** the existing equipment picker (pre-filled).
3. **Athletes per session:** pre-filled from the roster (the coach can lower it, e.g., "about 14 show up").
4. **Session length:** pre-filled from §4a.
5. **Style:** Approach shows its **suggestion** with a one-line reason, and the coach can pick another:
| Room | Suggested style | Reason shown |
|---|---|---|
| Racks = 0 (dumbbells, kettlebells, bands only) | **Stations** (equipment-based) | "No racks, so groups rotate through equipment stations." |
| Athletes per rack ≤ 2 | **Standard** | "Two or fewer per rack, so everyone works through their own sets." |
| Athletes per rack 3–5 | **Rack rotation** | "3–5 per rack, so each group rotates at its rack and nobody waits." |
| Athletes per rack 6+ | **Stations** (racks are some of the stations) | "More than 5 per rack, so groups move between racks and other stations." |
| Session length < 30 min (any room) | the row above, plus **Express** sessions | "Short sessions: the essentials only." |
- Choosing **Rack rotation** creates the rack groups if none exist (balanced mix, the existing auto-assign) so the coach doesn't have to set racks up separately. Groups are then sized per §2d.
- The style can differ **by day kind**: home workouts and mobility are always Standard; weight-room days use the chosen style. A coach can change the style for one session later (it then becomes that coach's session, as today).
- **Data:** the chosen style is stored per program as **`program.generatedFormat: 'standard' | 'stations' | 'rack_rotation'`** (one program JSON key; replaces the team-level key proposed earlier). The rack count uses the existing rack groups. **Product/Legal approve under G-5.**

### 2b. Compiling a template day into rotations
From each `program-design.md` §7 day (after week setup, §2d moves, position emphasis, and practice-load contacts):
1. **Three rotations plus a finish:**
   - **R1 Power** = A-block (Olympic derivative or main jump + the second power item) + fillers.
   - **R2 Strength** = B-block lift + spotter + fillers.
   - **R3 Secondary** = C-block and D-block + fillers.
   - Core and E-block items **become the fillers** in R1–R3 (that's where they fit in the example).
   - **Cooldown** together at the end (§3d).
2. **Positions per rotation = the rack group's size** (3–5; 4 by default). Fewer exercises than positions: add a filler from the day's E/core pool. More: the lowest-priority item moves to R3 or drops (D, then E).
3. **One rack, one bar per rotation (MUST for generated):** at most one position uses the rack (squat, bench, or a pull-up bar attached to the rack; **assume the pull-up bar is on the rack**, since that's the common case and costs nothing if it isn't), and at most one uses the group's barbell (cleans, RDLs, push press). The trap bar, dumbbells, kettlebells, boxes, bands, and med balls don't count. **If a template puts two rack or bar items in one rotation, the lower-priority one moves to another rotation where the rack/bar is free; if none, it switches to its nearest non-rack rung** (e.g., Weighted Pull-Up → One-Arm DB Row is **not** allowed, since that's a different pattern; the move-to-another-rotation step comes first, and the switch stays within the ladder: Bench Press → DB Bench → DB Floor Press).
4. **Spotter position** right after barbell squat or bench (on by default); the lifter spots next.
5. **The position before the rack lift** is upper body, core, shoulder, or mobility (never the same muscles).
6. **Rotation time** = longest position's work + 20 s, rounded to 15 s; raised until rest on the rack lift meets the floors (tier A ≥ 2:00, tier P ≥ 1:30).
7. **Rounds** = the block's prescribed sets for the rack lift. **Round 1 is the build-up round** for tier A and Olympic lifts (about 50–65%).
8. **Session length (§4a):** fit by dropping rounds (never below 3 for the main lift, counting the build-up round), then the lowest-priority filler. Rest is never shortened.

### 2c. Compiled templates (2-day off-season = the example's setup)
**Day 1 · Total: squat** (§7c Day 1), groups of 4, 50–60 min
| Rotation | Rack/bar | Pos 2 | Pos 3 | Pos 4 |
|---|---|---|---|---|
| **R1 Power** · 75 s × 3 | Hang Power Clean × 2 (bar) | Box Jump × 3 | Prone Y-T-W × 6 each | Copenhagen 20 s/side |
| **R2 Strength** · 75 s × 4 | Back Squat × 4 (rack) | **Spot** | One-Arm DB Row × 8/arm | Pallof Press × 10/side (or Dead Bug × 6/side without bands) |
| **R3 Secondary** · 75 s × 3 | Bench Press × 5 (rack) | **Spot** | Single-Leg RDL × 6/side | Spanish Squat Hold 30 s (or Isometric Split Squat) |
Equals the §4b worked example in structure; the picks follow §7c Day 1 (Bench moves to R3 because R2's rack is the squat).

**Day 2 · Total: hinge** (§7c Day 2)
| Rotation | Rack/bar | Pos 2 | Pos 3 | Pos 4 |
|---|---|---|---|---|
| **R1 Power** · 75 s × 3 | Push Press × 2 (bar + rack) | Med Ball Rotational Throw × 4/side | Bent-Knee Calf Raise × 12 | Wall Slide × 8 |
| **R2 Strength** · 90 s × 4 | Trap Bar Deadlift × 4 (trap bar) · *no RDL alternative uses the bar here* | Weighted Pull-Up × 4 (rack bar) | Face Pull × 12 | Slider Hamstring Curl × 8 |
| **R3 Secondary** · 75 s × 3 | Rear-Foot Elevated Split Squat × 6/side (DBs, bench/box) | Copenhagen 20 s/side | Tibialis Raise × 15 | Dead Bug × 6/side |
No spotter in Day 2 (no barbell squat/bench). If the gym has no trap bar, R2's lift is the RDL (bar) and the pull-up stays (rack).

**In-season Day 1 Heavy** (§7f), groups of 4, about 45 min: **R1** Hang Power Clean × 2 (bar) · Box Jump × 3 · Chin-Up × 5 (rack bar; the clean doesn't use the rack) · Wall Slide × 8 (75 s × 2) → **R2** Back Squat × 3 at 80% (rack) · Spot · Spanish Squat Hold 30 s · Dead Bug × 6/side (75 s × 3, round 1 build-up) → **R3** Bench Press × 5 (rack) · Spot · 90/90 ER Hold 20 s/side · Bent-Knee Calf Raise × 12 (75 s × 2) → cooldown. Warm-up 7 + 10 + 15 + 10 + 2 transitions + 2 cooldown = 46 min.
**Other templates (3-, 4-, 5-day, preseason, post-season):** compiled by the §2b rules; the acceptance check is that every rotation has ≤ 1 rack and ≤ 1 bar position, a spotter after squat/bench, and no same-muscle filler before the rack lift.

### 2d. Group size and equipment variations
- **Groups of 3:** drop position 4 of each rotation (keep the spotter); rest on the rack lift becomes 2 × rotation time (still ≥ floors).
- **Groups of 5:** position 3 holds 2 athletes.
- **No med balls / bands / hurdles:** fillers switch within the same ladder or pool (e.g., Pallof → Dead Bug; MB throw → jump), as the §4b example already does.

---

## 3. Coaching layer (the example's detail)
### 3a. Block header (shown to coach and athlete)
`"B · Strength · 75 s rotations · 4 rounds · about 20 min"` (rotation) or `"B · Strength · 5 sets · rest 3:00 · about 18 min"` (standard).

### 3b. Session summary lines (top of the session)
- **Block and week:** *"Strength block · week 2 of 4."*
- **Jump count:** *"Jumps today: about 27 contacts."* (from the plyo slots, after practice-load cuts)
- **What changed from last week** (one line, generated): *"Back Squat 80% (up from 75%). Hang Power Clean 2 more reps per set at the same effort."*
- **Moved work** (existing): *"Shoulder circuit is on Saturday's home workout."*

### 3c. Per-exercise coaching notes (`ProgramExercise.notes`, existing key)
Each generated row gets **one intent cue** (from the library below, by exercise, else by role/method) and, for loaded main lifts, **a week note**.
**Week notes:**
| Case | Note |
|---|---|
| Tested lift, % changes | "Week 2: 80% (up from 75%)." |
| Tested lift, deload | "Deload: 60–65%. Easy and fast." |
| RPE lift | "Week 2: a little heavier than week 1 if every rep moved well." |
| Top set + back-offs | "Top set at RPE 8, then 2 sets at −10%." |
| Method downgrade (R-2) | "Straight sets today (your version)." |
| Build-up round (rotation) | "Round 1 is your build-up set (about 60%)." |
**Intent cue library (generated rows):**
```ts
export const INTENT_CUES: Record<string, string> = {
  'hang-clean': 'Bar speed is the priority. End the set if the bar slows.',
  'power-clean': 'Bar speed is the priority. End the set if the bar slows.',
  'hang-high-pull': 'Jump first, then pull. Fast every rep.',
  'jump-shrug': 'Jump and shrug, arms long. Land soft.',
  'clean-pull': 'Drive the floor away fast. Finish tall.',
  'push-press': 'Short dip, fast drive. Lock out over your head.',
  'push-jerk': 'Drive, then punch under. Stand to finish.',
  'db-push-press': 'Short dip, fast drive.',
  'db-hang-snatch': 'Jump and punch it straight up.',
  'box-jump': 'Full arm swing, land soft, step down.',
  'depth-drop': 'Step off, land quiet, hold 2 seconds.',
  'depth-jump': 'Off the ground fast. Full rest between reps.',
  'hurdle-hop': 'Quick off the ground, knees up.',
  'lateral-bound': 'Stick each landing for 2 seconds.',
  'lateral-hurdle-hop': 'Quick contacts, knees over toes.',
  'single-leg-hop-stick': 'Stick every landing for 2 seconds.',
  'mb-overhead': 'Throw hard every rep.',
  'mb-rotational': 'Load the back hip, throw through.',
  'mb-chest-pass': 'Fast hands, throw hard.',
  'mb-scoop-toss': 'Hips drive the throw.',
  'back-squat': 'Same depth every rep. Stop with about 2 reps left.',
  'front-squat': 'Elbows up, same depth every rep.',
  'trap-bar-deadlift': 'Push the floor away. Stand tall, no rounding.',
  'rdl': 'Hips back, bar close. Feel the hamstrings.',
  'bench': 'Spotter on every set. Control down, press up.',
  'incline-bench': 'Spotter on every set.',
  'split-squat': 'Back knee straight down. Control the lowering.',
  'lateral-squat': 'Sit deep into the hip, whole foot down.',
  'db-rdl': 'Square hips, reach back long.',
  'db-row': 'Heavy, no twist. Elbow to hip.',
  'chest-supported-row': 'Chest stays on the pad.',
  'weighted-pullup': 'Strict reps, full hang.',
  'pullup': 'Full hang every rep. Add a dumbbell if 8+ is easy.',
  'chin-up': 'Full hang every rep.',
  'landmine-press': 'Squeeze the down-knee glute, press up and forward.',
  'nordic': 'Lower as slowly as you can.',
  'ghr': 'Hips straight, slow down.',
  'copenhagen': 'Hips high, straight line.',
  'pallof': 'Resist the twist. Press straight out.',
  'face-pull': 'Pull to your eyes, thumbs back.',
  'spanish-squat': 'Steady hold, about 70% effort.',
  'er-90-90-iso': 'Elbow at shoulder height. Steady hold.',
};
export const ROLE_CUES = {
  power: 'Every rep fast. Full rest.', main: 'Stop with about 2 reps left.', secondary: 'Smooth, controlled reps.',
  accessory: 'Controlled reps.', core: 'Slow and controlled.', care: 'Light and controlled.', mobility: 'Easy breathing.',
};
```
Cues are claim-free (G-6). Coaches can edit or delete any note; an edited note makes that session the coach's (as today).

### 3d. Cooldown (every generated weight-room session)
2–3 min, together: **two items matched to the session plus breathing.**
| Session type | Items |
|---|---|
| Lower-heavy | Half-Kneeling Hip Flexor Stretch 30 s/side · Lying Hamstring Stretch (towel) 30 s/side · Crocodile Breathing × 3 |
| Upper | Child's Pose Lat Reach 20 s/side · Open Book 5/side · Crocodile Breathing × 3 |
| Total / in-season | Hip Flexor Stretch 30 s/side · Lat Reach 20 s/side · Crocodile Breathing × 3 |
Stored as rows at the end of the session with **`role: 'mobility'`** and **`group: 'CD'`** (existing keys; "CD" = cooldown). Counted in the session estimate. Home and mobility sessions don't get one (home warm-up/mobility cover it).

---

## 4. Acceptance criteria (for Product)
**Program length**
- [ ] The coach can set start + end date or start + weeks, and an end type; the plan view shows every week's block, deloads, taper, and suggested testing days.
- [ ] An 8-week off-season plan ending at "Season starts" is Accumulation 3 → Strength 3 → Power 2 with the last week at −30% volume; an 8-week plan ending at "Nothing special" is Accumulation 4 → Strength 4.
- [ ] A plan that crosses the first practice switches to preseason Power at that date; one that crosses the first match switches to Maintain.
- [ ] A coach break inside the window re-flows the plan to still end on the end date, shortening Accumulation first; no block under 2 weeks.
- [ ] Rebuilding after a date change only changes generated sessions.

**Rack-aware generation**
- [ ] Setup asks racks, equipment, athletes per session, and length, and suggests the style per the §2a table with its reason; the coach can pick another.
- [ ] With Rack rotation chosen, every generated weight-room session is Rack rotation: R1 Power, R2 Strength, R3 Secondary, cooldown.
- [ ] Every rotation has ≤ 1 rack position and ≤ 1 barbell position; spotter after barbell squat/bench; no same-muscle filler before the rack lift; rack-lift rest ≥ floors; round 1 is the build-up for tier A/Olympic.
- [ ] The founder's 2-day off-season setup (groups of 4, the 11/18 equipment) generates the §2c Day 1 and Day 2 tables, within 45–60 min at the coach's session length.
- [ ] Groups of 3 and 5 follow §2d.
- [ ] Standard and Stations choices generate those formats; home and mobility days are always Standard.

**Coaching layer**
- [ ] Every generated row has an intent cue; main lifts have a week note; sessions show the block/week, jump count, and "changed from last week" lines; block headers show timing.
- [ ] Every generated weight-room session ends with the §3d cooldown (2–3 min) stored as `group: 'CD'` rows.
- [ ] Claim-word search clean on cues and notes.

**Data:** only `program.endDate`, `program.endType`, and `program.generatedFormat` are new, and only after Product/Legal approve (G-5). Everything else uses existing keys.

## 5. Flags
| To | Item |
|---|---|
| **Product (01)** | Spec this as the next release (suggest 2.4.2). Approve the three program keys (§1e, §2a). Confirm the style suggestion table (§2a) and that setup creates rack groups when Rack rotation is chosen. |
| **Legal (07)** | Review the three keys (none is about athletes) and the cue library for claims. |
| **UX (03)** | Program length inputs and the plan timeline (§1a, §1d); block headers and session summary lines (§3a–§3b); cooldown card; the **"Your weight room" setup step** with the style suggestion and reason (§2a). |
| **CSCS review** | Add the §1c block allocation and taper rules to the review list after the items in build answer 9. |
