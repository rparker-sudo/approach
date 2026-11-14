# Rules: Block Circuits and Rack-Group Station Rotation
Owner: Training Content / Sports Science (02) · v1.0 · Fri Nov 13, 2026
Status: **Draft for founder approval → proposed for v2.2 pass 3** (with supersets). Founder request (11/13): circuits inside a block, and rack groups rotating through stations.
Builds on: `programs/rest-and-supersets.md` (tiers, rest table, floors, superset rules), `product/specs/rack-groups.md` (D-026), `safety-guidelines.md`. Every rule in those docs still applies. **This doc extends `rest-and-supersets.md` §4b rule 6**, which limited circuits to care/core/mobility.

---

## Part 1: Circuits within a block
A **block** is a lettered group (`ProgramExercise.group`). Two exercises = a superset (A1/A2). **Three or four = a circuit** (A1–A4): one set of each in order, rest, then repeat for the prescribed rounds.

### 1a. Rules (MUST)
| # | Rule |
|---|---|
| C1 | **Size:** 3–4 exercises. **Beginners see at most 3** (a 4th exercise for a beginner is done as straight sets after the circuit). |
| C2 | **No tier P (power) or tier A (heavy compound) in a circuit.** They stay as straight sets, done fresh, with full rest. A tier D filler during their rest is still allowed. |
| C3 | **At most one lower-body tier B exercise** per circuit, **at most one grip-heavy exercise** (rows, pull-ups, carries), and no two exercises of the same pattern. |
| C4 | **One station:** every exercise has to be doable from the same spot (same equipment or no equipment). |
| C5 | **Reps, not the clock, for strength work.** Tier B exercises in a circuit keep their prescribed reps and RPE. No "as many reps as possible" or "for time" for minors on tier B. *(Racing reps is where form breaks down.)* Timed work (e.g., 30 s on, 15 s off) is allowed only for tier C/D (core, care, mobility). |
| C6 | **Effort ceilings and level resolution still apply** to each exercise (R2, G8). Athletes in the same circuit can be doing different versions. |
| C7 | No conditioning circuits (conditioning is still undecided, safety §8). |

### 1b. Rest inside a circuit
- **Transition** between exercises: 15 s.
- **Rest after each round** = the longest straight-set rest among the circuit's exercises (from `rest-and-supersets.md` §3), **minus 15 s for each exercise after the first**, with a minimum of **45 s**.
  - Example: DB bench 3 × 8 (90 s) + one-arm row 3 × 8 (90 s) + Pallof press 3 × 8 (60 s) → 90 − 30 = **60 s** after each round.
  - Example (tier C/D, end of session): side plank 30 s + band ER 15 + dead bug 8 → 45 s (floor).
- Rounds = the prescribed sets. If sets don't match, extra sets of any exercise are done as straight sets after the circuit.
- Deload and lightened days: fewer rounds (sets drop about 40% as usual), **same rest**.

### 1c. When the app builds circuits automatically
Extends `rest-and-supersets.md` §4d. After pairing, if the session **still** goes over its length target, the app adds a third exercise (core or care first) to an existing superset to make a trio, then a fourth (intermediate/advanced only). It stops as soon as the session fits. A beginner circuit stops at 3.

Coaches can build, split, or reorder circuits by hand. The builder blocks anything that breaks C1–C5, with a one-line reason (e.g., "Heavy lifts aren't done in circuits. They need full rest.").

---

## Part 2: Rack-group station rotation
**What it is:** the coach switches a session to **Stations**. The session's blocks become stations, each rack group starts at a different station, and the groups rotate on a timer, so the whole team moves through the workout at once.

### 2a. How a session is split (MUST)
| Part | What's in it | Why |
|---|---|---|
| **Part 1: Together** | Warm-up, **all tier P (power) work, and the main tier A lift** | Done first and fresh, in the same order for everyone. Each rack group works at its own rack, as rack groups already do. |
| **Part 2: Stations** | Everything else (secondary, accessory, core, care), as 2–6 stations. Each station is one block: straight sets, a superset, or a circuit. | Order matters much less for these, so rotating is safe. |
| **Finish** (optional) | Mobility or a care/core circuit, together | Common cool-down |

- **Minors (MUST):** tier P and tier A exercises can't be stations. If a coach tries, the builder explains: *"Power and heavy lifts are done in Part 1, fresh, so no group does them tired at the end."*
- **Adult-only teams:** the same message shows as a warning only.

### 2b. Stations and groups
- **Number of stations = number of rack groups** (recommended). If there are more stations than groups, some stations sit empty each rotation. If there are more groups than stations, the coach has to add stations or merge groups (the app won't put two groups on one station's equipment).
- **Start order:** Rack 1 starts at Station 1, Rack 2 at Station 2, and so on. Everyone rotates in the same direction (1 → 2 → … → last → 1).
- **Station order (MUST check):** because every group goes around the same loop, **two lower-body-heavy stations can't be next to each other, including last → first.** The builder suggests an order that alternates lower / upper / core and warns if the coach's order breaks it.
- **Equipment:** each station's exercises have to fit that station's equipment. The coach names the station after the equipment (e.g., "DB bench," "Box + bands"). This replaces the "one station" rule (C4) for the whole station.
- **Level resolution (G8)** happens per athlete inside each station, as usual.

### 2c. Station time
- **Default station time** = the longest station's estimated time (`rest-and-supersets.md` §5: sets × (work + rest)), rounded up to the next whole minute. Every station gets the same time so groups rotate together.
- **Transition:** 1 min between stations (move, reset equipment).
- **The coach can set the time** (e.g., 8 min). If a station's prescribed sets plus **rest floors** can't fit, the builder warns: *"Station 3 needs about 9 min. Add time or cut a set."* The app never shortens rest below the floors to make a station fit.
- **On the floor:** the rotation timer is a guide. If time runs out, athletes **stop and move**; unfinished sets are logged as not done (never "rushed"). The coach can also tap **Rotate now** or **+1 min**.
- **Session estimate:** Part 1 + (station time + 1 min) × number of stations + finish. It has to fit the §5 length target, or the builder suggests fewer stations or sets.

### 2d. Where it does and doesn't apply
| Situation | Stations? |
|---|---|
| School sessions with rack groups | Yes |
| Home sessions, light home day, extra recovery | No (solo) |
| Testing day: **jump tests** | Yes. Touch, broad jump, and med-ball throw make good stations (best of 3 each). |
| Testing day: **load tests** | **No.** Load tests stay at racks with 2–3 athletes per rack and the coach watching every attempt (§4a). |
| Deload week / lightened day | Yes, with fewer sets; station time recalculates (usually shorter) |
| Athletes not in a rack group (unassigned) | They follow the standard order on their own |

### 2e. What the athlete and coach see (for UX/Product)
- **Athlete Today:** "Part 1: together" and then *"Stations: you start at Station 2 (DB bench)."* During Part 2 the workout view shows the current station's exercises and a rotation countdown ("Rotate in 3:12 → Station 3").
- **Coach board:** in Part 2, a station grid: each station shows which rack group is there and the shared countdown. Tiles still never show loads, RPE, levels, or check-ins.
- **Logs:** the athlete's log stores exercises in the order done, plus `station_id` per exercise; progression doesn't care about order.

---

## Data (for Claude Code)
- **Circuits:** no new fields. `ProgramExercise.group` already groups exercises; 3–4 in one group = circuit. `restSec` on the last exercise of a group = rest after the round (1b); the others = 15 s transition.
- **Stations:** on `Session`:
  - `format: 'standard' | 'stations'` (default `standard`)
  - `stations?: { id: string; name: string; groups: string[]; minutes: number }[]` (`groups` = block letters at that station, in order)
  - `stationTransitionSec: 60`
  - Part 1 = all exercises not in any station (they must include every tier P and the main tier A exercise for teams with a minor).
- **Live board:** `live_progress` gains `station_id` and `rotate_at timestamptz` (shared per team session, set when the coach starts Part 2 or taps Rotate). Never loads or RPE (unchanged).

## Acceptance criteria (for Product)
**Circuits**
- [ ] A block of 3–4 exercises runs as rounds (A1 → A2 → A3, rest, repeat); a beginner sees at most 3, with a 4th done as straight sets after.
- [ ] The builder blocks tier P or A in a circuit, two lower-body tier B exercises, two grip-heavy exercises, two of the same pattern, or mixed stations, each with a reason.
- [ ] Rest after a round = longest straight-set rest − 15 s per extra exercise, minimum 45 s; 15 s transitions. Example: DB bench + row + Pallof → 60 s.
- [ ] No "AMRAP"/"for time" on tier B for minors; timed intervals allowed only on tier C/D.
- [ ] Auto-circuits only form when supersets alone don't bring the session under its target.

**Stations**
- [ ] For a team with a minor, tier P and the main tier A lift can only be in Part 1; trying to make them a station is blocked with the reason.
- [ ] Rack groups start at different stations and rotate in the same direction; the builder warns when two lower-body-heavy stations are adjacent (including last → first).
- [ ] Default station time fits the longest station with rest floors; a coach-set time that's too short shows a warning and never shortens rest below the floors.
- [ ] Coach can Rotate now / +1 min; the athlete's view and the coach board update together; unfinished sets are logged as not done.
- [ ] Jump tests can run as stations; load tests can't.
- [ ] Home sessions, light home days, and extra recovery have no Stations option.
