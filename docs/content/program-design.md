# Approach Program Design System (v3)
Owner: Training Content / Sports Science (02) · v3.0 · Wed Nov 18, 2026
Status: **Draft for founder approval. Replaces the v2.0 generator design** (`generator.ts` archetypes, `RX` table) for Approach-built programs. **Unreviewed by a CSCS** (§13).
Founder direction (11/18): (0) **Coaches set how long each session can be** (§4a), and **rack rotation** is a session format (§4b). (1) Approach's own programming and exercise catalog should be built the way a **top college strength program** builds them. (2) Lower-level athletes get **the same plan, with exercise switches**, not a different plan. (3) **Coaches who build their own workouts have full freedom**: rest, circuits, order, effort, anything. Rules apply only to what Approach generates. (4) **Every workout gets a warm-up built for that day's session.**
Companion docs: `content/exercise-catalog-v3.md` (catalog additions), `content/programs/warmups.md` (warm-up system). Coach-freedom changes to older docs: §11.

---

## 1. Design philosophy
1. **One plan, written at the top.** Every Approach program is written the way it would be for a trained college athlete: Olympic derivatives, heavy bilateral strength, unilateral strength, a real plyometric progression, and dedicated durability work. Athletes who aren't ready for a given exercise get the next exercise down the same **movement ladder** (§8). Same slot, same sets and reps, same intent. That's the only "deviation."
2. **Power before strength, strength before volume.** Session order is always warm-up → plyometrics/power → primary strength → secondary strength → accessory → durability.
3. **Block periodization.** Each off-season block has one main job (build capacity → build strength → convert to power), with planned unloading every fourth week. In-season, the job is to keep strength and power while staying fresh for matches.
4. **Measured loading.** Tested lifts are loaded from the athlete's own estimated strength (testing days, D-020) as percentages, checked against an RPE target. Everything else is loaded by RPE / reps in reserve (RIR).
5. **Volleyball-specific where it matters:** jump volume is managed against practice load, shoulders and knees get dedicated durability work, positions change the emphasis, not the plan.

## 2. Annual plan (US high school volleyball; club season noted)
| Phase | Weeks (typical) | Block(s) | Main job | Lift days |
|---|---|---|---|---|
| **Post-season / transition** | 2–4 | Restore | Recover, address gaps, move well. Lower intensity, more unilateral, mobility, tempo | 2–3 |
| **Off-season** | 12+ | **Block 1 Accumulation** (4 wk) → **Block 2 Strength** (4 wk) → **Block 3 Strength-Power** (4 wk), repeat from Block 2 if the off-season is longer | Build work capacity and muscle, then maximal strength, then convert to power | 3–4 (advanced up to 5) |
| **Preseason** | 3–4 | **Power** | Peak power and speed; heavy but low-volume strength; plyos at highest quality | 3 |
| **In-season** | 10–14 | **Maintain** (2-week undulating cycle) | Keep strength and power, stay fresh: low volume, high intent | 2 (3 in bye weeks) |
- **Club season (winter/spring) overlapping school off-season:** if the athlete's combined calendar (TM-2) shows regular matches or tournaments, the generator uses the **in-season Maintain** template, even if the school phase is off-season.
- Coaches still program their own breaks (TM-3); the next block after a break of 14+ days restarts at week 1 of the current block, and G9 eases athletes back in.

## 3. Block structure and weekly progression
Every block is **4 weeks: 3 loading weeks + 1 deload** (the current `blockWeeks` default).
| Week | Intensity | Volume |
|---|---|---|
| 1 | Block's starting % / RPE | Full |
| 2 | +2.5–5% / +0.5 RPE | Full |
| 3 | +2.5–5% / +0.5 RPE (block's top) | Full or −1 set |
| 4 Deload | About week-1 intensity, RPE 6 | About −40% sets; plyo contacts −50%; same rest |

## 4. Session architecture
Every Approach session is built in this order. Each **block letter** is a group of one or more exercises (supersets and circuits inside a block are allowed in Approach programs under §10).
| Block | Content | Typical time |
|---|---|---|
| **Warm-up** | Session-specific RAMP warm-up (`programs/warmups.md`) | 8–12 min |
| **A. Plyometrics / power** | Jump or Olympic derivative, often paired with a throw | 8–12 min |
| **B. Primary strength** | One heavy bilateral lift (squat, hinge, or press pattern), often with a low-fatigue filler or contrast jump (advanced) | 12–18 min |
| **C. Secondary strength** | Unilateral lower + upper pull or push, as a superset | 10–15 min |
| **D. Accessory** | Posterior chain, upper back, trunk; superset or tri-set | 8–12 min |
| **E. Durability** | Shoulder, knee/tendon, ankle, adductor work by position; circuit | 6–8 min |
Default session targets (used when the coach hasn't set a length, §4a): off-season 60–75 min, preseason 55–65, in-season 40–50, post-season 45–55.

## 4a. Session length (coach sets the time available)
Founder request (11/18): coaches set roughly how long each session can be, to fit weight-room availability. The program fits the time.

### Where the coach sets it
- **Program default:** "Session length: about __ min" (20–120, in 5-min steps; quick picks 30 · 45 · 60 · 75 · 90). If not set, the phase targets in §4 are used.
- **Per weekday:** override any lift day (e.g., Tue 45 min, Thu 75 min) for weeks when the room is shared.
- **Per date:** from the team calendar, "Weight room time on Wed Dec 3: 30 min." That one session refits; the rest of the week doesn't change.
- **Stations:** station time is worked out from what's left: (session length − warm-up − Part 1 − finish) ÷ number of stations − 1 min transition.

### How Approach fits a session (Approach-generated programs)
Estimate = warm-up + ramp-up sets (about 1 min each) + every set's work and rest (`rest-and-supersets.md` §5) + transitions. If the estimate is **over** the target, the generator trims **in this order** and stops as soon as it fits:
| Step | Trim | Why this order |
|---|---|---|
| 1 | Pair C and D blocks into supersets/circuits (if not already) | Saves time without losing any work |
| 2 | Move durability (E) into the rest periods of the A/B lifts as fillers, or cut it to 1 round | Low-fatigue work fits inside heavy-lift rests |
| 3 | Accessories (D): 3 → 2 sets, then drop the second accessory, then drop the D-block | Least important for the block's goal |
| 4 | Warm-up to its compact version (minimum 6 min; 5 min in-season) | The warm-up is never removed |
| 5 | Secondary strength (C): −1 set | |
| 6 | Power (A): drop the throw or plyo pair, keep the Olympic or main jump; −1 set | Keep the highest-intent work |
| 7 | Primary lift (B): −1 set, never below 3 work sets | The last thing to go; the B-block is never removed |
- **Rest is never shortened** to fit in Approach-generated sessions; the generator cuts volume instead (rest floors stay).
- If the target is shorter than the minimum (about 25 min: compact warm-up + A at 3 sets + B at 3 sets + one C superset at 2 rounds), Approach builds an **Express session** with exactly that and says so.
- If the estimate is **under** the target by 8+ min, it adds back in reverse order (second durability round, accessory sets, one extra accessory from the position emphasis). It never adds A or B volume beyond the block's prescription.
- The coach sees what changed: *"Fit to 45 min: accessories cut to 2 sets, durability moved into squat rests, warm-up 8 min."* One tap to undo any line.

### Coach-built sessions
- The builder shows "about 52 min · your target 45."
- A **Fit to time** button offers the same trims as suggestions (the coach picks which to apply, or ignores them). It **never changes a coach's session on its own** and never blocks saving (§10).

### Example: Day 1 Lower (squat) fit to 45 min
| Block | Full (about 70 min) | Fit to 45 min |
|---|---|---|
| Warm-up | 11 min | 8 min (one Raise round, 4 Activate items) |
| A | Hang Power Clean 5 × 2 + Depth Drop/Box Jump 3 × 3 | Hang Power Clean 4 × 2 + Box Jump 3 × 3 |
| B | Back Squat 5 × 4 at 80% | Back Squat 5 × 4 at 80% (unchanged), with Spanish squat holds and calf raises done in the rests |
| C | RFE Split Squat + Copenhagen, 4 rounds | Same pair, 3 rounds |
| D | GHR + Pallof, 3 rounds | Dropped |
| E | Durability circuit, 2 rounds | Moved into B rests (90/90 ER hold after the last squat set) |

### Data (for Claude Code)
- `program.sessionMinutes?: number`, `program.minutesByWeekday?: (number | null)[7]`, `CalendarEvent.roomMinutes?: number` (per date).
- `session.targetMinutes`, `session.fitLog: string[]` (the trims applied, for the "what changed" lines).
- `fitSession(session, targetMinutes, ctx)`: pure function implementing the order above; used by the generator automatically and by **Fit to time** as suggestions.

### Acceptance criteria (for Product)
- [ ] The coach can set a program default, per-weekday, and per-date session length; the session estimate shows against it in the builder and on the athlete's Today.
- [ ] An Approach-generated session over its target is trimmed in the order above until it fits; the B-block and warm-up are never removed; rest is never shortened.
- [ ] A target below about 25 min produces an Express session.
- [ ] The coach sees each trim as a line with undo.
- [ ] For a coach-built session, **Fit to time** only suggests; nothing changes until the coach applies a suggestion, and saving is never blocked.
- [ ] Stations sessions compute station time from the session length.

## 4b. Rack rotation format (founder request 11/18)
**What it is:** a group of 3–5 athletes shares one rack. Each block is a **rotation**: a short list of **positions** (usually one per athlete). Every athlete starts at a different position, everyone moves to the next position on a **shared clock**, and each round everyone has done every position once. Rest is built in: while you're at the other positions, you're recovering from the rack lift.
It's the third session format, alongside **Standard** (each athlete works through their own sets) and **Stations** (whole rack groups move between stations, `circuits-and-stations.md` Part 2). It needs rack groups.

### How Approach builds a rotation (generated programs; suggestions for coaches)
1. **One rack position per rotation.** Position 1 is the exercise that needs the rack (or its pull-up bar). The other positions use no rack: dumbbells, kettlebells, a box, the floor.
2. **Optional spotter position** (default on for barbell squat and bench at RPE 7+): **"Spot and coach"** sits right after the rack position, so the athlete who just lifted spots the next lifter. Logs nothing.
3. **The position before the rack lift** is upper body, core, shoulder, or mobility, never something that tires the same muscles (no wall sits or lunges right before squats).
4. **Fillers** for the other positions come from the block's slots: power blocks use jumps and shoulder work; strength blocks use the secondary pull or press, core, and isometrics; pull/single-leg blocks use single-leg work and adductor/core.
5. **Rotation time** = the longest position's work time + about 20 s to move and set up, rounded to 15 s (typically 60–90 s). Then rest on the rack lift = rotation time × (positions − 1). For Approach programs this must meet the rest floors (tier A ≥ 2:00, tier P ≥ 1:30); if it doesn't, the rotation time goes up.
6. **Rounds** = the block's prescribed sets for the rack lift. When the first round's rack lift needs build-up sets, **round 1 is the build-up round** (about 50–65% of the work weight), so work sets start in round 2.
7. **Group size:** positions ≥ athletes. 3 athletes with 4 positions: one position is empty each turn (extra rest). 5 athletes: a non-rack position takes 2 athletes at once.
8. **Level switches** apply per athlete at every position (§8): a beginner in the clean position does their ladder rung in the same 75 s.
9. **Session length (§4a):** block time = rotation time × positions × rounds, plus 1 min between blocks. Fitting drops rounds first (never below 3 for the main lift, counting the build-up round as one), then shortens fillers.

### Coach control (§10)
The coach can put anything in any position, any order, any rotation time, any number of rounds. The app suggests the stagger and rotation time and shows the rest each position gets. It never blocks.

### What athletes and the board see (for UX)
- **Athlete:** "Rack 2 · Block B · You start at Position 3 (DB row)." In the workout view: the current position, its reps, and a shared countdown, "Rotate in 0:42 → Position 4 (Dead bug)." Logging is per position.
- **Coach board:** per rack, the positions in a ring with each athlete's name at their position, and the group's countdown. No loads, levels, or check-ins (G-4).

### Data (for Claude Code)
- `Session.format: 'standard' | 'stations' | 'rack_rotation'`.
- `Block.rotation?: { positions: { kind: 'exercise' | 'spot'; exerciseId?: string; reps: string; usesRack: boolean }[]; rotationSec: number; rounds: number; buildUpRound: boolean }`.
- Start position per athlete = their order in the rack group (staggered). `live_progress` adds `position_index` and the group's `rotate_at`.

### Acceptance criteria (for Product)
- [ ] A rack-rotation block staggers athletes so no two are at the same position (except the 5-athlete shared position), and everyone rotates on one clock.
- [ ] Generated rotations have one rack position, a spotter after barbell squat/bench by default, and no same-muscle filler right before the rack lift; rack-lift rest meets the floors.
- [ ] Round 1 is a build-up round when the rack lift is tier A or P.
- [ ] Rotation time, rest per position, and block time show in the builder; coaches can change anything without being blocked.
- [ ] Block time feeds the session-length estimate (§4a).

### Worked example: off-season Tuesday, boys' volleyball, 2 days a week, groups of 4
Equipment: one rack per group (pull-up bar on the rack), barbell and bumpers, dumbbells, kettlebells, plyo boxes. No bench, bands, or med balls, so every pick fits that list. Strength block, week 2. **About 60 min** (45-min version below).
| Part | Time | Content |
|---|---|---|
| Warm-up | 8 min | Together. **Raise:** A-skip, lateral shuffle, carioca (2 × 10 yd). **Activate:** ankle rock 8/side, 90/90 hip switch 5/side, World's Greatest Stretch 3/side, bodyweight squat × 8 (2 s pause). **Potentiate:** pogo hops × 20, countermovement jump × 3 at about 75%. |
| **A. Power** | 15 min | 75 s rotation × 4 positions × 3 rounds |
| **B. Strength** | 20 min | 75 s rotation × 4 positions × 4 rounds |
| **C. Pull + single-leg** | 12 min | 60 s rotation × 4 positions × 3 rounds |
| Cooldown | 3 min | Hip flexor stretch 30 s/side, child's pose lat reach 20 s/side, crocodile breathing × 5 |
Plus 1 min between blocks. Total about 60 min.

**A. Power** (clean rest: 3:45)
| Pos | Advanced (plan) | Intermediate | Beginner |
|---|---|---|---|
| 1 · rack | Hang Power Clean × 2. Round 1 build-up (~60%), rounds 2–3 RPE 7 | Hang High Pull × 3 | Squat Jump × 3 (no med ball for the scoop toss) |
| 2 | Box Jump × 3, step down | Same | Same |
| 3 | Lateral Bound to stick × 3/side | Same | Skater Hop × 3/side |
| 4 | Prone Y-T-W × 6 each (light DBs) | Same | Same (no weight) |
Jumps: 27 contacts per athlete.

**B. Strength** (squat rest: 3:45)
| Pos | Advanced | Intermediate | Beginner |
|---|---|---|---|
| 1 · rack | Back Squat × 4. Round 1 build-up (bar × 5 → ~60% × 4), rounds 2–4 at 80% (e.g., 195 lb from a 245 lb estimate) | Same | Goblet Squat × 6, RPE 6–7 |
| 2 | **Spot and coach** the next squatter | Same | Same |
| 3 | One-Arm DB Row × 8/arm (hand on the box), RPE 8 | Same | Same, RPE 7 |
| 4 | Dead Bug × 6/side | Same | Same |

**C. Pull + single-leg** (pull-up rest: 3:00)
| Pos | Advanced | Intermediate | Beginner |
|---|---|---|---|
| 1 · rack bar | Weighted Pull-Up × 4 (DB between the feet) | Pull-Up × 5 | Inverted Row × 8 (bar set in the rack) |
| 2 | Rear-Foot Elevated Split Squat × 6/leg, DBs, back foot on the box | Same, bodyweight or light DBs | Front-Foot Elevated Split Squat × 6/leg (front foot on the box) |
| 3 | KB Single-Leg RDL × 6/side | Same | Single-Leg Glute Bridge × 8/side |
| 4 | Copenhagen Plank 20 s/side (box) | Same | Short-Lever Copenhagen 20 s/side |

**45-minute version:** warm-up 6 min (compact) · A: 2 rounds (10 min) · B: 60 s rotations × 4 rounds (16 min; squat rest still 3:00) · C: 2 rounds (8 min) · cooldown 2 min · 2 min of transitions.
**Group of 3:** drop position 4 in each block; the lifter still spots next. Rest on the rack lift becomes 2:30 (B) and 2:00 (C), still above the floors.
**Thursday** (hinge day, same format; equipment-fit picks): **A:** Jump Shrug (rack) · Single-Leg Box Jump · DB Push Press · Wall Slide. **B:** Romanian Deadlift (rack; no trap bar in this room) · KB Lateral Squat · Push-Up (advanced: feet on the box) · Side Plank. No spotter position (not needed for RDLs). **C:** Chin-Up (rack bar) · Slider Hamstring Curl with a towel (no Nordics here: the partner who'd hold the feet is at another position) · KB Overhead Carry (beginners: Suitcase Carry) · Bent-Knee Calf Raise.

## 5. Prescriptions by block
**%** = of the athlete's estimated strength (e1RM) from a testing day, for **tested lifts only** (trap bar deadlift, back squat, bench press; goblet squat and DB bench for dumbbell gyms). Untested lifts use the **RPE** column. Generated-program limits for minors (§9) cap every row.

### 5a. A-block: power
| Block | Olympic derivatives / loaded jumps | Plyometrics (per session) | Throws |
|---|---|---|---|
| Restore | Technique only: 3 × 3, RPE 5–6 | Extensive: 40–60 contacts (pogos, line hops, skips) | 2 × 5 |
| Accumulation | 4 × 3, RPE 6–7 | 50–70 contacts, low–moderate intensity | 3 × 5 |
| Strength | 5 × 2, RPE 7 | 40–60 contacts, moderate | 3 × 4 |
| Strength-Power | 5 × 2, RPE 7–8 (pulls 4 × 3 heavier) | 40–50 contacts, moderate–high (hurdle hops, single-leg) | 3 × 3 |
| Power (preseason) | 4–5 × 2, RPE 7–8, every rep fast | 30–40 contacts, high quality, full rest | 3 × 3 |
| Maintain (in-season) | 3 × 2, RPE 7 | 15–25 contacts, low volume, high intent | 2 × 3 |
- **Rest:** 2:00–3:00 on Olympic derivatives; 60–90 s per plyo set (work-to-rest at least 1:5 on high-intensity jumps).
- Contacts count every foot strike in a jump set; the generator stays under the cap even after the athlete's practice load (§9).

### 5b. B-block: primary strength
| Block | Sets × reps | Load (tested) | Effort (untested) | Method |
|---|---|---|---|---|
| Restore | 3 × 8 (tempo 3-1-1) | 60–65% | RPE 6 | Tempo or paused reps |
| Accumulation | 4 × 6–8 | 65 → 70 → 72.5% | RPE 7 | Straight sets |
| Strength | 5 × 5 → 5 × 4 → 4 × 3 | 75 → 80 → 82.5% | RPE 7–8 | Straight sets, or top set + 2 back-offs at −10% |
| Strength-Power | 4 × 3 | 80 → 82.5 → 85% | RPE 8 | Advanced: contrast pair with a jump (§6) |
| Power (preseason) | 3 × 3 → 3 × 2 | 80–85% | RPE 7–8 | Every rep fast; advanced: cluster triples (§6) |
| Maintain (in-season) | Day 1: 3 × 3 · Day 2: 2 × 5 | 80% · 70% | RPE 7 · RPE 6 | Undulating: one heavier day, one faster day |
| Deload (any) | 3 × 3–5 | 60–65% | RPE 6 | |
- **Rest:** 2:30–3:30 (3:00 default).

### 5c. C-block: secondary strength (unilateral lower + upper)
| Block | Sets × reps | Effort |
|---|---|---|
| Restore / Accumulation | 3–4 × 8–10 (each side) | RPE 7 |
| Strength | 4 × 5–6 | RPE 7–8 |
| Strength-Power / Power | 3 × 4–5 | RPE 7–8 |
| Maintain | 2–3 × 5–6 | RPE 7 |
Rest: 90 s–2:00 after each superset round.

### 5d. D-block: accessory
| Block | Sets × reps | Effort |
|---|---|---|
| Restore / Accumulation | 3 × 10–12 | RPE 7–8 |
| Strength / Strength-Power | 3 × 8–10 | RPE 7 |
| Power / Maintain | 2 × 8–10 | RPE 7 |
Rest: 60–75 s per round.

### 5e. E-block: durability
| Type | Prescription |
|---|---|
| Rotator cuff / scapular | 2–3 × 12–15, light, controlled |
| Isometrics (tendon: Spanish squat, split squat hold, calf hold, 90/90 ER) | 3–5 × 30–45 s at about 70% effort |
| Eccentric hamstring / adductor (Nordic, Copenhagen) | 2–3 × 4–6 / 2 × 15–20 s each side |
| Ankle / calf (soleus raise, tib raise, single-leg calf raise) | 2–3 × 12–15 |
Done as a circuit, 30–45 s between exercises.

## 6. Loading methods used in Approach programs
| Method | What it is | Used in | Who |
|---|---|---|---|
| Straight sets | Same load every set | Accumulation, secondary, accessory | Everyone |
| Top set + back-offs | One heavier set at the target, then 2–3 sets at −10% | Strength block | Intermediate+ |
| Wave loading | Rep scheme drops while load rises across sets (e.g., 5-3-2) | Strength-Power week 2–3 | Advanced |
| Cluster triples | 3 reps as 1+1+1 with 15–20 s between reps, full rest between clusters | Power block | Advanced |
| Contrast pair | Heavy set (≥ 80%, 2–3 reps) then 3–5 jumps after 30–60 s, then full rest (3:00+) | Strength-Power | **Advanced, coach-confirmed level only [CSCS]** |
| Tempo / pauses | Slow lowering (3 s) or pause at the bottom (2 s) | Restore, beginners' main lifts, in-season Day 2 option | Everyone |
| Isometrics | Holds at a joint angle | Durability, in-season | Everyone |
Beginners always get straight sets or tempo sets. The method is part of the slot, so when an athlete is switched down a ladder, their method switches too (e.g., contrast pair → straight sets).

## 7. Weekly templates (Approach-generated)
Each line is a **slot**, written as the slot's top (L3) exercise; athletes get their ladder version (§8). Position emphasis (§8b) changes durability and plyo selection.

### 7a. Off-season, 4 days (default for intermediate/advanced)
| Day | A. Power | B. Primary | C. Secondary (superset) | D. Accessory | E. Durability |
|---|---|---|---|---|---|
| **1 Lower: squat** | Hang Power Clean + Depth Drop → Box Jump | Back Squat | Rear-Foot Elevated Split Squat + Copenhagen | Glute-Ham Raise + Pallof Press | Knee/ankle circuit |
| **2 Upper: horizontal** | Med Ball Chest Pass + Med Ball Rotational Throw | Bench Press | One-Arm DB Row + Half-Kneeling Landmine Press | Face Pull + Chin-Up | Shoulder circuit (ER, Y-T-W, wall slide) |
| **3 Lower: hinge** | Hang High Pull + Hurdle Hops | Trap Bar Deadlift | Lateral Squat + Single-Leg RDL | Nordic + Ab Wheel Rollout | Hamstring/adductor circuit |
| **4 Upper: vertical** | Push Press + Med Ball Overhead Throw | Weighted Pull-Up | Incline DB Press + Chest-Supported Row | Rear Delt Fly + Suitcase Carry | Shoulder + hand/wrist circuit |

### 7b. Off-season, 3 days
| Day | A | B | C | D | E |
|---|---|---|---|---|---|
| **1 Lower + power** | Hang Power Clean + Box Jump | Back Squat | Rear-Foot Elevated Split Squat + Nordic | Pallof Press | Knee/ankle |
| **2 Upper** | Med Ball Overhead Throw | Bench Press | Weighted Pull-Up + One-Arm DB Row | Face Pull + Landmine Press | Shoulder |
| **3 Total: hinge** | Hang High Pull + Hurdle Hops | Trap Bar Deadlift | Lateral Squat + Incline DB Press | Chin-Up + Suitcase Carry | Hamstring/adductor |

### 7c. Off-season, 2 days
| Day | A | B | C | D | E |
|---|---|---|---|---|---|
| **1 Total: squat** | Hang Power Clean + Box Jump | Back Squat | Bench Press + One-Arm DB Row | Single-Leg RDL + Pallof | Shoulder + knee |
| **2 Total: hinge** | Push Press + Med Ball Rotational Throw | Trap Bar Deadlift | Rear-Foot Elevated Split Squat + Weighted Pull-Up | Copenhagen + Face Pull | Ankle + hamstring |

### 7d. Off-season, 5 days (advanced only)
4-day template plus **Day 5: Power + durability** (40 min): Clean Pull + Lateral Hurdle Hops · Med Ball circuit (3 throws) · Trap Bar Jump · full durability circuit. No heavy primary.

### 7e. Preseason, 3 days
| Day | A | B | C | D | E |
|---|---|---|---|---|---|
| **1 Lower** | Hang Power Clean (cluster) + Depth Jump | Back Squat 3 × 3 | Lateral Squat + Copenhagen | — | Knee/ankle |
| **2 Upper** | Push Press + Med Ball Overhead Throw | Bench Press 3 × 3 | Weighted Pull-Up + Face Pull | Rear Delt Fly | Shoulder |
| **3 Total** | Jump Shrug + Single-Leg Hop-and-Stick | Trap Bar Deadlift 3 × 2 | Rear-Foot Elevated Split Squat + One-Arm DB Row | Pallof | Hamstring/hand |

### 7f. In-season Maintain, 2 days (2-week cycle)
| Day | Placement | A | B | C | E |
|---|---|---|---|---|---|
| **1 Heavy** | Earliest day after a match day +1 (not within 2 days before a match) | Hang Power Clean 3 × 2 + Box Jump 2 × 3 | Back Squat (wk 1) / Trap Bar Deadlift (wk 2) 3 × 3 @ 80% | Bench Press + Chin-Up 2 × 5 | Shoulder + knee isometrics |
| **2 Fast** | Not the day before a match | Med Ball Overhead Throw 2 × 3 + Pogo 2 × 10 | Trap Bar Jump 3 × 3 (or Rear-Foot Elevated Split Squat 2 × 5 @ RPE 6) | One-Arm DB Row + Landmine Press 2 × 6 | Ankle + hamstring (Nordic 2 × 3) |
Bye week (no match): add **Day 3** = off-season Day 3 at Maintain volume.

### 7g. Post-season Restore, 2–3 days
Full body, tempo main lifts at 60–65%, unilateral emphasis, extensive plyos only, longer durability circuits, one extra recovery session suggested.

## 8. Movement ladders (the exercise-switch model)
Each slot has a ladder. **The plan is written at the top rung.** An athlete gets the highest rung at or below their level that fits the equipment (G8 resolution, unchanged). Home workouts use the "Home / bodyweight" rung. Sets, reps, rest, and intent stay the same; effort shifts down one RPE for beginners.

### 8a. Ladders
Levels shown are the exercises' actual `level` tags (catalog v3). "Top" is what the plan is written with; athletes below that level get the next rung that fits their equipment.
| Slot | Top (plan) | Next rung | Entry rung (L1) | Home / bodyweight |
|---|---|---|---|---|
| Olympic: clean | Hang Power Clean (L3) | Hang High Pull · Jump Shrug · KB Swing (L2) | Med Ball Scoop Toss | Squat Jump |
| Olympic: pull | Clean Pull (L2) | — | Med Ball Scoop Toss | Broad Jump |
| Olympic: overhead | Push Jerk (L3) | Push Press · DB Push Press (L2) | Med Ball Step-In Overhead Throw | Squat Jump |
| Olympic: snatch | Hang Power Snatch (L3) | DB Hang Snatch (L2) | Med Ball Backward Toss | Squat Jump |
| Reactive plyo | Depth Jump (L3) | Depth Drop · Hurdle Hops (L2) | Box Jump | Pogo Hops |
| Lateral plyo | Lateral Hurdle Hops (L3) | Lateral Bound (L2) | Skater Hop | Skater Hop |
| Single-leg plyo | Single-Leg Hop-and-Stick (L3) | Single-Leg Box Jump (L2) | Line Hops | Line Hops |
| Squat | Front Squat · Back Squat | Back Squat · SSB Squat · Box Squat · Pause Squat (L2) | Goblet Squat → Heels-Elevated Goblet Squat | Bodyweight Squat (tempo) |
| Hinge | Trap Bar Deadlift · RDL (L2) | — | DB RDL · KB Deadlift | Single-Leg Glute Bridge |
| Unilateral squat | Rear-Foot Elevated Split Squat (L2) | — | Front-Foot Elevated Split Squat → Reverse Lunge | Reverse Lunge |
| Lateral | Lateral Squat (L2) | — | Lateral Lunge | Lateral Lunge |
| Unilateral hinge | Single-Leg RDL (L2) | — | Single-Leg Hip Thrust · Single-Leg Glute Bridge | Single-Leg Glute Bridge |
| Hamstring eccentric | Nordic (L3) | Glute-Ham Raise (L2) | Slider Hamstring Curl | Slider (towel) Curl |
| Horizontal press | Bench Press (L2) | — | DB Bench · DB Floor Press → Push-Up | Push-Up → Incline Push-Up |
| Incline press | Incline Bench (L2) | — | Incline DB Press | Pike Push-Up (L2) / Push-Up |
| Vertical press | Push Press · Landmine Press (L2) | — | Half-Kneeling DB Press | Pike Push-Up / Push-Up |
| Vertical pull | Weighted Pull-Up (L3) | Pull-Up · Chin-Up (L2) | Lat Pulldown · Half-Kneeling Pulldown · Band Pulldown | Prone Floor Pulldown |
| Horizontal pull | Barbell Row (L2) | — | One-Arm DB Row · Chest-Supported Row · Ring Row · Cable Row | Doorframe Row |
| Anti-extension | Ab Wheel Rollout · Body Saw (L2) | — | Dead Bug · Plank | Dead Bug |
| Rotation / anti-rotation | Landmine Rotation (L2) | — | Pallof Press · Side Plank | Side Plank |
| Carry | Overhead Carry (L2) | — | Suitcase Carry · Farmer Carry | Backpack Carry |
| Adductor | Copenhagen (L2) | — | Short-Lever Copenhagen | Short-Lever Copenhagen |
| Knee / tendon | Reverse Nordic · Spanish Squat Hold | — | Peterson Step-Up · Isometric Split Squat · Wall Sit | Wall Sit |
| Shoulder | 90/90 ER Isometric · Side-Lying ER · Face Pull · Band ER · Y-T-W · Wall Slide (all L1) | — | — | Y-T-W (no weight) · Wall Slide |

**Generator change:** drop the "Olympic pattern only for level 3" hard rule. Level now lives on each exercise, so L2 derivatives (high pull, jump shrug, push press, DB snatch) are available to intermediate athletes, as in college programs.

### 8b. Position emphasis (same template, different picks)
| Position | Plyo emphasis | Durability emphasis | Other |
|---|---|---|---|
| Middle Blocker | Vertical, reactive (depth/hurdle), lateral (block footwork) | Knee/tendon, ankle | Extra lateral plyo set |
| Outside / Opposite | Vertical + single-leg (approach take-off) | Shoulder (2 exercises), knee | Extra throw set |
| Setter | Lateral, quick ground contacts | Hand/wrist, shoulder | Lower vertical volume (−20% contacts) |
| Libero / DS | Lateral, low positions | Adductor, ankle | Lateral Squat as primary C-block lift; −30% vertical contacts |

## 9. Limits for Approach-generated programs
These apply **only to programs Approach generates** (and to suggestions such as auto-pairing). They don't limit what a coach builds (§10).
| Limit | Minors | Adults (volleyball and trainer mode) |
|---|---|---|
| Strength effort | RPE ≤ 8 (beginner ≤ 7) | RPE ≤ 8 (adults in trainer mode per `adult-training-rules.md`) |
| % of e1RM | ≤ 85% (≤ 90% for clean pulls/jump shrugs as % of hang clean e1RM, if ever tested) | ≤ 90% |
| Testing | Rep-max tests only, coach-supervised (D-020, unchanged) | None in trainer mode |
| Lift days | Beginner 3 · intermediate 4 · advanced 5 · in-season 3 (R6) | Trainer mode: 4 / 5 / 6 |
| Plyo contacts per lift session | Off-season ≤ 70 · preseason ≤ 40 · in-season ≤ 25 | Same |
| Depth jumps | Advanced, coach-confirmed level, box ≤ 18 in (45 cm), ≤ 20 contacts per session **[CSCS]** | Same |
| Contrast pairs, clusters, waves | Advanced, coach-confirmed level **[CSCS]** | Same |
| Rest floors | Tier A ≥ 2:00, tier P ≥ 1:30 (auto rest table) | Same |
| Match-day rules | R7 (no lifting on match days, no heavy legs the day before) | n/a |

## 10. Coach freedom (MUST, supersedes earlier builder rules)
**A coach (or trainer) building or editing a workout has full control. The builder never blocks a coach's choice.** Approach's rules shape what Approach generates and what it suggests; once a coach edits, it's their program.
| Area | Coach can | What the app does |
|---|---|---|
| Rest | Set any rest, including 0 | Shows the auto value as a suggestion ("Auto 3:00"). No floors, no messages. |
| Supersets / circuits | Group any exercises, any number, any tiers, in any order; reps, timed, AMRAP, or for time | Groups them. No blocked pairs, no reasons. Auto-pairing (if on) follows §5 and the old pairing rules as **Approach's suggestion only**. |
| Stations | Put any exercise in any station, any order, any time | Auto-builds Part 1 / Part 2 as a suggestion; the coach can move anything. |
| Effort | Any text or RPE | Saves it. |
| Exercise order | Anything | Saves it. |
| Lift days / weekly volume | Any number of days and sessions | Shows the week's count. No caps on coach-built programs. |
| Level switches (G8) | Leave **"Adjust exercises to each athlete's level"** on (default) or turn it off for a program, a session, or one athlete | When on, athletes get their ladder rung (§8). When off, everyone gets exactly what the coach wrote. |
| Warm-up | Keep, edit, or replace the generated warm-up, or remove it | Generates one by default (§12). |
| Session length | Set minutes per program, weekday, or date | Approach-generated sessions fit the time (§4a); coach-built sessions show the estimate and offer **Fit to time** as suggestions only. |

**What still applies to coach-built programs** (these aren't building rules; they're consent, privacy, and Legal items owned by other agents): consent and permissions, testing-day eligibility and the supervision lock (D-020), no true 1-rep-max feature for minors (D-020), board privacy (G-4), claim-free app copy, adults-only trainer teams, and the athlete-facing pain message (G3).

**Training's recommendation (not a block, founder's call):** for teams with minors, keep a one-line, dismiss-once note when a coach enters RPE 9–10 or "to failure" in a strength slot. I'm recording it, not requiring it.

## 11. Changes to earlier docs
This doc supersedes the **builder-blocking** parts of these docs. Their rules now describe **Approach-generated programs and suggestions only**:
| Doc | What changes |
|---|---|
| `programs/rest-and-supersets.md` | §3 floors and §4b "never pair" → generated/auto only. Coach rest and pairing are free. |
| `programs/circuits-and-stations.md` | C1–C5 and Part 2a (power/heavy in Part 1) → generated/auto only. |
| `safety-guidelines.md` | R2 "coach edits must not exceed," R6 caps on coach team programs, §2a "coach can't force a harder exercise" → replaced by §10 here. §4 depth jumps → §9 here. |
| `adult-training-rules.md` | A1 (RPE 8 block), A3 (AMRAP block), §4 caps, §5 warnings → generated only; coaches/trainers are free. A2 (no testing in trainer mode), A4 (cardio duration only), A7, A8 unchanged (they're features, not limits on building). |
| `programs/home-workouts.md` | H1–H5 and per-athlete caps → generated/recommended home weeks only. H6 (no barbell at home) becomes a suggestion filter, not a block. |
| `product/specs/v2.2.md`, `v2.2.1.md`, `trainer-mode.md` | Effort clamp (D-028), rest floors (1.5), blocked pairs, stations Part 1 block → remove from the **builder**; keep inside `resolveSession` only for Approach-generated sessions. **Product (01)** owns the spec change and decision log. |
| `design/user-flows*.md`, `design/trainer-mode.md` | F19c, F26, F27b, F28b blocked states and red lines → remove; show auto values as suggestions. **UX (03).** |

## 12. Warm-ups
Every session, Approach-generated or coach-built, gets a **warm-up generated from that session's content** (RAMP: raise, activate/mobilize, potentiate), plus ramp-up sets before each heavy lift. Full system: `content/programs/warmups.md`.

## 13. Items for CSCS review [CSCS]
1. The block percentages and RPE targets in §5b, especially Strength-Power at 85% for minors.
2. Depth jumps, contrast pairs, and cluster sets in Approach-generated programs for advanced high schoolers (§6, §9). **This reverses `safety-guidelines.md` §4's "no depth jumps without review" for generated programs; I'm flagging it as the top review item.**
3. Plyo contact caps against volleyball practice load (§9).
4. L2 Olympic derivatives for intermediate athletes (§8a).
5. The in-season 2-day undulating template and its placement rules (§7f).
6. The coach-freedom change (§10): no builder limits on rest, effort, or volume for teams with minors.

## Flags for other agents
| To | Item |
|---|---|
| **Product (01)** | Log the founder's 11/18 direction (college-level programming, switch model, coach freedom, warm-ups on every workout). Remove builder blocks from specs (§11) and add the "Adjust to level" toggle (§10). Generator rewrite (§2–§8) replaces `splitFor`/`RX`. Decide on the RPE 9–10 note (§10). |
| **UX (03)** | Session-length controls (program, weekday, date) and the "Fit to time" suggestion list with undo (§4a). Remove blocked states; auto values become suggestions; "Adjust exercises to each athlete's level" toggle at program, session, and athlete level; warm-up block at the top of every session. |
| **Legal (07)** | Confirm nothing in compliance relies on the builder clamps (D-028, rest floors) as a safeguard. The testing supervision lock and consent stay. |
| **Engineering (via Coordinator)** | New equipment, exercises, ladders, and slot data: `exercise-catalog-v3.md`. |
