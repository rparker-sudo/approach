# User Flows: Training v3
Owner: UX/UI Design (03) · v1.0 · Wed Nov 18, 2026
Source of truth: Approach project → `design/user-flows-training-v3.md`. Screens for the Training v3 release, so Claude Code builds these rather than designing its own.
Built from:
- `content/program-design.md` v3.0 (§4a session length, §4b rack rotation, §10 coach freedom, §12 warm-ups)
- `content/programs/warmups.md` v1.0
- `design/user-flows.md` v3.2, `design/trainer-mode.md` v1.0, `design/design-system.md` v1.1. Conventions, tokens, and components there still apply: ≥ 44 pt targets, 56 pt in-workout actions, text plus color.
- **`product/specs/training-v3.md` wasn't saved when this was written.** Where Product's spec differs, the spec wins. Items marked **[Product]** need its confirmation.

Flows continue the numbering: **F45–F55**. Part 1 = F45–F51 (tonight). Part 2 = F52–F55 (rack rotation).

**Wording:** in trainer teams, coach → trainer and athlete → client, via `terms(teamKind)` (`design/trainer-mode.md` §S).

---

# PART 1

## F45. Coach freedom: no blocked states in the builder (program-design §10, §11)
**Rule:** the builder **never blocks, warns about, or explains away** a coach's or trainer's choice about rest, effort, grouping, order, stations, or weekly volume. No red lines, no amber lines, no disabled Save for any of these. Approach's rules only shape what Approach **generates** and **suggests**.

### F45a. What changes, screen by screen
| Flow | Was | Now |
|---|---|---|
| **F19b** week grid | Moves and location switches blocked by H3–H5 ("Keep at least one day with no training," "No home sessions on match days," etc.); the card snapped back | Every move and switch is allowed. No message. The week header shows a neutral count: "4 lift days this week" |
| **F19c / F26** rest field | Floors (2:00 tier A, 1:30 tier P); the field reset to the floor with "Heavy lifts need at least 2:00 rest" | Any value, including 0:00. When the coach's value differs from auto, an **"Auto 3:00"** chip sits next to the field. Tapping it sets the field back to auto. No message |
| **F19c / F26** effort field | Effort clamp blocked RPE 9–10, "failure," "to failure," "max" for teams with minors (amber warning for adults) | Any text or RPE saves. No message. *(Optional dismiss-once note, F45c, only if Product turns it on.)* |
| **F19c** supersets | Blocked pairs with reasons ("Power exercises are done on their own, fresh," etc.) | Any two or more exercises can be grouped. No reasons. Auto-paired groups keep the **"Auto"** tag |
| **F27a / F27b** circuits | 3–4 exercises; blocked groupings table (tier P/A, leg-heavy, grip, same pattern, stations, 5+) | **Group** any number of adjacent rows (2 = superset label, 3+ = circuit label). No blocked groupings. Labels A1, A2, … An |
| **F27c** circuit rows | AMRAP / "max reps" / "for time" blocked in tier B rows for minors. Rest override min 45 s | Any work type in any row: reps, Timed, AMRAP, for time. Any rest. No message |
| **F28b** stations | Power/heavy lifts refused into a station for minors | Any exercise in any station. No message. Part 1 is filled automatically as a **suggestion** the coach can empty or change |
| **F28c** station checks | "More racks than stations" was a red, blocking line | Shown as a plain info line, not blocking: "5 racks, 4 stations. One rack has no station each round." The other checks stay as neutral info (no amber) |
| **F29a** Start stations | Blocked when athletes weren't on a rack | Never blocked. Line: "3 athletes aren't on a rack. They'll follow the standard order." Optional button: **Add them to racks** |
| **F36** (trainer) post | Combined weekly cap and no-rest-day blocked posting for that client; leg-heavy warning | No blocks or warnings. A neutral readout per client: "Alex: 5 sessions a week across all programs." Post is always enabled (subject only to F45b) |
| **F39b** (trainer) week view | RPE above 8 blocked; caps and day-off blocked; deload warning | Per-week effort accepts any value. No caps, day-off, or deload messages. Goal waves still **fill defaults** |
| **F39c** (trainer) session editor | Effort block (RPE > 8, AMRAP, for time); youth rules as amber warnings | Removed. Same as F19c |
| **F41** (trainer) cardio | 60-min-per-session block; stepper 5–60; Back after a break locked to Easy, ≤ 15 min | Stepper **5–180**. No block. Back after a break **defaults** to Easy, 10 min, but the trainer can change it. Fields stay minutes + Easy/Moderate only. That's a data rule (adult rules A4), not a builder limit |
| **F19a** home jumps toggle | Disabled in-season/post-season | Always available. The off-season/preseason note becomes the toggle's description |

**Removed copy:** every block/warning string listed in F19c, F26, F27b, F27c, F28b, F36, F39b–c, F41, and `design/trainer-mode.md` §S1b ("Effort clamp," "Circuit clamp" rows). Claude Code deletes them; they don't move into a tooltip.

**Design system:** `InlineReason` (§7.2) keeps only the neutral info tone in the builder. The error and warning tones aren't used for building choices.

### F45b. What still stops an action (not building rules; owned by Legal/Product)
These stay exactly as built:
- **Trainer team:** Post disabled while the team isn't open, is paused (TM-19, F32), or the Trainer Terms need re-accepting (F31).
- **Testing days:** supervision lock and eligibility (F11, F24), consent gating of logging (F2, F7), adults-only trainer teams (F33).
- **Athlete side:** the pain card (F14) and board privacy (design system §9).

### F45c. Optional note for minors **[Product, default off]**
If Product turns it on (program-design §10, Training's recommendation), here's the design:
- **Trigger:** on a team with any minor, typing RPE 9–10 or "to failure" in a strength slot.
- **What shows:** a one-line **Note** (info style, not a warning): "Training's guidance for athletes under 18: stop with about 2 reps left (RPE 8)."
- **Got it** dismisses it for that coach, forever.
- It never blocks, never changes the value, and shows once per coach.

### F45d. What auto values look like now
| Value | Display | Coach action |
|---|---|---|
| Rest | `Rest 2:00` with **Auto 3:00** chip when different | Tap the chip to use auto. The chip disappears when they match |
| Auto-pairing | "Auto" tag on the bracket | Unpair or regroup freely. The tag goes away on any edit |
| Stations Part 1 | "Suggested" tag on Part 1 | Drag items out, or change anything |
| Fit to time | Suggestions list (F51) | Apply or ignore |

## F46. "Adjust exercises to each athlete's level" (program-design §10)
One setting at three levels, **default on**.

**Rule:** an athlete gets the level version (ladder rung) only if it's on at **every** level that applies to them (program **and** session **and** athlete). Any "off" means that athlete gets exactly what the coach wrote.

### F46a. Program level
**Where:** builder → program settings (Week setup row on web; ⋯ → Program settings on phone).
- Toggle: **Adjust exercises to each athlete's level**
- On: "Athletes get the version of each exercise that fits their level. Sets, reps, and rest stay the same."
- Off: "Everyone gets exactly what you write."

### F46b. Session level
**Where:** session editor header, a compact toggle "Adjust to level."
- If the program toggle is off, it shows **"Off for this program"** (disabled, with a link "Change in program settings").
- When the session is turned off while the program is on, a muted tag **"Level adjust off"** appears on the session card in the week grid.

### F46c. Athlete level
**Where:** athlete detail (coach) → Program section.
- Toggle: **Adjust exercises to Jordan's level**
- Off line: "Jordan gets exactly what you write, in every session of this program."
- The roster row shows a muted tag **"Exact program"** when it's off.

### F46d. What changes downstream when off
- **Athlete:** no **"Your version"** line (F13). The written exercise shows.
- **Coach athlete detail:** no "adjusted to level" chip for that program.
- **Unchanged:** level still gates **testing-day strength checks** (F11, F24); a coach's adjust toggle never unlocks a strength check. Boards show the exercise actually done, never level.
- **Trainer teams:** same toggles, wording via `terms()` ("Adjust exercises to each client's level").

**States:**
- **Save error:** "Couldn't save the setting. Try again." The toggle returns to its previous position.

## F47. Warm-up card (athlete, every session) (warmups §1–§3, §7)
**Where:** the **first card** of every session on Today and in the workout view. This includes coach-built, Approach-built, gym, home, and trainer sessions.
**Excluded:** light home days, extra recovery, and testing days. Those keep their own warm-up (F25c).

**Card anatomy:**
- **Header:** "Warm-up · about 10 min" and the session type line in `muted` ("Lower: squat").
  - When fitted: "Warm-up · about 6 min · Compact."
- **Three part sections**, each collapsible, all open by default:

| Part | Title | Rows |
|---|---|---|
| R | **Raise** | e.g. "A-skip · 2 × 10 yd" (or "In place · 15 s" with limited space) |
| A | **Activate** | e.g. "Ankle rock · 8 each" |
| P | **Potentiate** | e.g. "Pogo hops · 2 × 10" · "Countermovement jump · 3 at about 75%" |

- **Each row:** exercise name, then the prescription, then a **How-to** link. The whole row is a 48 pt target and opens the exercise screen.
- **Each part ends** with a **Done** checkbox (56 pt, full width): "Raise done." It's checked once per part and can be unchecked.
  - When all three are done, the card collapses to "Warm-up done ✓" (tap to reopen).
- **Coach note:** if the coach edited the warm-up, a muted "Set by your coach" line appears in the header. Nothing appears if it's Approach's.

**Behavior:**
- **Not required.** **Start workout** isn't gated on the warm-up. An athlete can scroll past it.
- **Board:** while the warm-up is open and not done, the athlete's tile shows **"Warming up"** (a neutral pill, same style as "Lifting"). No items are shown.
- **Logging:** Done states are stored with the session log as warm-up. They never count toward sets, Sessions, or points.
- **No warm-up** (the coach removed it): the card is absent. No empty card.

**States:**
- **Loading:** skeleton card.
- **Offline:** works fully from local data.

## F48. Ramp-up sets (athlete) (warmups §4)
**Where:** inside the exercise card of each **loaded tier A or P exercise**, above the first work set.

**Section:** label **"Ramp-up"** (Label type) and the line "Warm-up sets. They don't count toward your work sets." (13 pt `muted`).

**Rows:** "Bar × 8" · "95 lb × 5" · "135 lb × 3". Each has the set **Done** button (56 pt, as F-7) and the **same** 60–90 s rest timer on Done ("Rest 1:00").
- They're visually lighter: `card` fill and a `muted` set label. Work set rows use `raised` and `ink`.
- Weights are computed from today's first working weight. If that changes, ramp-ups recompute.

**Logging:**
- Stored with `warmup: true`. They never count as work sets, never drive weight suggestions, never trigger a PR.
- On the board, a tile's set line counts work sets only. During ramp-ups it reads "Ramp-up 2 of 3."

**No working weight yet** (first session, no suggestion): one row, "Bar or light weight × 8."

**Testing days:** not shown. The testing warm-up replaces it (unchanged).

## F49. Warm-up editor (coach) (warmups §6)
**Where:** session editor (F19c) → a **Warm-up** row pinned at the top of the exercise list.

**Collapsed row:**
- "Warm-up · Lower: squat · about 10 min," with a source tag: **Approach** · **Template: Our lower warm-up** · **Edited** · **None**.
- Buttons: **Edit** · ⋯ (Regenerate, Save as template, Use a template, Remove).

**Editor (drawer on web, full-screen sheet on phone):**
- Three sections, **Raise / Activate / Potentiate**, each a list of rows:
  - Drag handle (reorder within a part, or drag to another part).
  - Exercise name.
  - Prescription field (free text, e.g. "8 each," "2 × 10 yd," "15 s").
  - **Swap**: an exercise picker opened on that part's pool first, then the full library.
  - **Remove** (×, 44 pt).
- **+ Add** at the bottom of each part: picker (pool first, then all), or a **custom item** with name + prescription (no how-to link).
- **Limited space** toggle: "In-place Raise drills." It's on by default when the team setting is on.
- **Footer:** "about 9 min" (live), **Save**, **Cancel**.

**After any edit:**
- The row's tag becomes **Edited**, and the warm-up stops regenerating when the session changes.
- ⋯ → **Regenerate** asks to confirm: "Replace your warm-up with a new one built from this session?" with **Regenerate** / **Keep mine**.

**⋯ menu actions:**
- **Save as template:** name field (placeholder "Our lower warm-up"), then Save. Templates are team-wide for that coach; a trainer's templates are private.
  - Toast: "Template saved."
- **Use a template:** list of templates, each with a preview of its three parts and item count. **Use** replaces the warm-up (confirm if Edited). The tag becomes **Template: name**.
- **Remove:** confirm "Remove the warm-up from this session?" The row then reads "No warm-up," with **Add warm-up** (Approach) and **Use a template**.
- **Approach-generated sessions:** same editor. Editing makes it **Edited** the same way.

**States:**
- **Save error:** "Couldn't save the warm-up. Your changes are still here."
- **Empty part after removals:** "No Raise items." The part header stays so items can be added.

## F50. Team default warm-up (Team settings)
**Where:** Team settings → **Warm-up**.
- **Segmented control:**
  - **Approach**: "A warm-up built from each session."
  - **My template**: plus a picker.
  - **None**: "Sessions start with the first exercise."
- **Toggle:** **Limited space**: "Use in-place drills for Raise (no running room)."
- **Applies to:** new sessions and sessions whose warm-up hasn't been edited. Line: "Sessions you've already edited keep their warm-up."
- Choosing **My template** with no templates shows "Save a warm-up as a template first," with a link that opens any session's warm-up editor.
- **Trainer teams:** same. Raise starts with easy cardio from the gym profile (warmups §5). No UI difference.

## F51. Session length (program-design §4a)

### F51a. Program default
**Where:** builder Week setup row (F19a), new control **Session length**.
- **Quick picks** (chips, 44 pt): 30 · 45 · 60 · 75 · 90 · **Custom** (stepper 20–120, 5-min steps).
- Plus **"Phase default,"** which shows the phase range, e.g. "Phase default (off-season 60–75)."
- Line: "Approach fits its sessions to this. Your own sessions show the estimate."

### F51b. Per weekday
**Where:** the week grid day header (F19b) shows the length: "Tue · 45 min."
- An override is marked with a dot and the text **"Set for Tuesdays."** (Never dot only.)
- **Tap** → sheet:
  - "Session length on Tuesdays": the same chips, plus **Use program default**.
  - Save → regenerated sessions refit. Coach-built sessions just show the new target.

### F51c. Per date (calendar)
**Where:** Calendar → tap a date → **Add** → **Weight room time** (new event type).
- Sheet: "Weight room time on Wed Dec 3," the same chips, then **Save**.
- **Calendar chip:** "Room 30 min."
- **Builder:** the day column header shows "Wed Dec 3 · 30 min (this date)."
- That date's session refits (generated) or shows the new target (coach-built). The rest of the week doesn't change.
- **Edit/delete:** tap the chip → **Change** / **Remove** (Remove goes back to the weekday or program length).

**Priority (shown in the session's target line):** date → weekday → program → phase. The line names the source: "Target 30 min (Wed Dec 3)."

### F51d. Estimate vs target
- **Builder footer (F19c):** "about 52 min · target 45 · 7 over." Text only, no warning color (it isn't an error).
  - Under target by 8+: "about 36 min · target 45 · 9 under."
  - **Fit to time** button appears when over.
- **Week grid session card:** "about 52 / 45 min."
- **Athlete Today:** session header "About 52 min."
  - If a target exists and differs by 5+ min, add "(planned for 45)" in `muted`.
- **Stations sessions:** station time shows "8 min each, from your 60-min session."
  - If the coach overrides station time, the target line reads "Station time set by you."

### F51e. Fit to time (coach-built sessions: suggestions only)
**Fit to time** (footer) opens a sheet, "Fit to 45 min":
- **Suggestions in Training's trim order** (program-design §4a), each a row:
  - The change, e.g. "Pair Split Squat + Copenhagen as a superset."
  - Minutes saved: "−4 min."
  - An **Apply** button (44 pt).
- **Example rows:**
  - "Move durability into the squat rests"
  - "Accessories: 3 → 2 sets"
  - "Drop Rear Delt Fly"
  - "Compact warm-up (6 min)"
  - "Split Squat: −1 set"
  - "Drop Box Jump pair, keep Hang Power Clean"
  - "Back Squat: −1 set (stays at 3+)"
- **Running total** at the top: "about 52 min → about 45 after applied."
- **Applied rows** turn into "Applied · Undo." **Apply all** applies every row in order until the target is met.
- **Done** closes. Nothing changes unless a row is applied. The coach can close with nothing applied, and Save is never affected.
- **If it can't fit:** the last row reads "Still about 33 min after all trims. Approach's shortest version is an Express session." with **Make it Express** (a suggestion). See F51g.

### F51f. What changed (Approach-generated sessions)
- **Builder:** a banner on the session, "Fit to 45 min," with one line per trim (`fitLog`), each with **Undo**, plus **Undo all**.
  - Undoing a line restores that item. The estimate updates, and the banner keeps the remaining lines.
- **Athlete:** sees no fit details. Only the length on Today.

### F51g. Express session
- **When:** an Approach-generated session (or a coach who chose **Make it Express**) with a target under about 25 min.
- **Label:** an **Express** pill (Pill component, neutral, text) on:
  - the week grid card
  - the builder session header
  - the athlete's Today header: "Express · about 25 min"
- **Builder line:** "Short session: warm-up, power, main lift, and one superset."
- **Athlete line** (muted, once on Today): "Short session today: the essentials only."

---

# PART 2

## F52. Rack rotation: choosing the format (program-design §4b)
**Where:** session editor header, **Format** segmented control: **Standard · Stations · Rack rotation** (extends F28a).
- **Not offered** for home sessions, light home days, extra recovery, and testing sessions. Tooltip: "Rack rotation is for weight-room sessions with racks." (Not a block on building: those session types have no racks.)
- **No racks yet:** choosing Rack rotation shows "Rack rotation uses your rack groups," with **Set up racks** (F17). The format stays Standard until racks exist.
- **Switching to Rack rotation:**
  - Each block (A, B, C, …) becomes a **rotation card** (F53), filled with Approach's **suggested** positions (rack lift first, spotter, fillers). Every card carries the **Suggested** tag until edited.
  - **The warm-up stays** at the top, done together. Any cooldown or finish stays at the end.
- **Switching back to Standard:** confirm "Switch to Standard? Positions become a normal exercise list." Exercises are kept in position order.

## F53. Rotation card (builder)
One card per block. **Header:** "B · Strength · Rack rotation," then the readout line: "4 positions · 1:15 rotation · 4 rounds · about 20 min."

**Positions list:** numbered rows **1 … N**. Each row has:
- Drag handle (reorder renumbers).
- Position number.
- Exercise name (tap → exercise picker), or **Spot and coach**.
- Prescription field ("× 4," "× 8/arm," "20 s/side").
- **Rack marker:** a **Rack** chip, shown on the position that uses the rack. The chip is a toggle; any position can be marked. Text plus an icon, never color alone.
- ⋯ menu: Swap · Remove · Mark as rack / Unmark.
- **Level column:** with level adjust on (F46), a muted line under the exercise reads "Beginners: Goblet Squat." This is read-only. It comes from the ladder.

**Below the list:**
- **+ Add position**.
- **Spotter toggle:** "Add a spotter after the rack lift" (on by default for barbell squat and bench). On inserts a **Spot and coach** row right after the rack position; off removes it.
- **Rotation time:** stepper in 15 s steps (15 s – 5:00). An **Auto 1:15** chip shows when the value differs from auto. Line: "Longest position plus about 20 s to move."
- **Rounds:** stepper (1–10).
- **Build-up round:** toggle, "Round 1 is a build-up round." Line: "Work sets start in round 2. Round 1 is ramp-up weight on the rack lift." On by default when the rack lift is tier A or P.

**Readouts (live, text only, no warning colors):**
- **Rest per position:** "Rest between turns at each position: 3:45 (rotation × 3 other positions)." For the rack position: "Back Squat rest: 3:45."
- **Block time:** "about 20 min (1:15 × 4 positions × 4 rounds)."
- **Group fit,** per rack group size:
  - "Rack 2 has 3 athletes: one position is open each turn."
  - "Rack 4 has 5 athletes: Position 3 (DB row) takes 2 at once."
  - "Rack 1 has 2 athletes: two positions are open each turn."
- **No blocks** (F45). A rotation with no rack position, two rack positions, or short rest saves as written.

**Session footer:** the F51d estimate includes rotation block times plus 1 min between blocks. Fit to time (F51e) offers "B: 4 → 3 rounds," "C: rotation 1:00 → 0:45" as suggestions.

**States:**
- **Empty block:** "Add a position. Position 1 is usually the lift that needs the rack."
- **Save error:** "Couldn't save. Your changes are still here."

## F54. Athlete view: rack rotation
**Today (before the session):**
- **Card:** "Rack 2 · Rack rotation," then one line per block:
  - "A · You start at Position 2 (Box Jump)"
  - "B · You start at Position 3 (One-Arm DB Row)"
- The warm-up card (F47) stays above it.
- **Not on a rack:** "You're not on a rack today. Follow the standard order." The athlete sees the Standard list.

**Workout view, during a block:**
- **Header:** "Rack 2 · B · Round 2 of 4." On a build-up round: "Round 1 of 4 · Build-up."
- **Current position card** (fills the upper half):
  - "Position 3 · One-Arm DB Row," with the prescription, "× 8/arm."
  - The set logger (reps and weight fields 48 pt, **Done** 56 pt). It logs **this position's set for this round**.
  - **Rack position, build-up round:** shows its ramp-up rows (F48) instead of a work set.
  - **Spot and coach position:** "Spot and coach: spot Ava R. on Back Squat." Nothing to log, no Done.
    - The partner name follows the board-name rules (F18). If the partner is hidden or hasn't allowed boards: "Spot the next lifter."
- **Shared countdown** (48 pt tabular): "Rotate in 0:42 → Position 4 (Dead Bug)."
- **Position strip:** below the countdown, a row of position chips "1 2 3 4" with **You** under the current one and a check on positions done this round. Text labels, not color.
- **At 0:00:**
  - A full-width banner: "Move to Position 4 · Dead Bug," with a haptic and sound (or a local notification if backgrounded).
  - The next position's card loads.
  - A set not marked done stays as **"Not done"** for that round (never "missed"). A muted line shows it: "1 set not done at Position 3."
- **Between blocks:** "Next: Block C · You start at Position 1 (Pull-Up)," with the 1 min transition countdown.

**Per-position logging:**
- Each position's exercise collects its own sets across rounds, in the normal log shape.
- History shows them as ordinary exercises: "One-Arm DB Row 4 × 8."
- Spot positions log nothing.

**Offline:** the countdown runs locally from the last `rotate_at`. On reconnect, it jumps to the server's position and round.

**Level:** each position shows the athlete's version and the F13 line when level adjust is on (F46).

## F55. Coach controls and the board ring view

### F55a. Coach controls (Team screen, during the session)
**Before the first rotation block:** a primary button **Start rotation** (all racks start together).

**After start, a sticky control bar:**
- Text: "Rack rotation · B · Round 2 of 4 · Rotate in 0:42."
- Buttons: **Rotate now** · **+15 s** · **Pause** · **End block**.
- **Rotate now** asks to confirm once per session.
- **End block** goes to the next block's start, or to the finish.

**Per-rack controls:** expand **Racks** in the bar to see one row per rack: "Rack 2 · Round 2 · Pos 3 → 4," with **Pause** and **+15 s** for that rack only. A rack paused on its own shows "Paused" in its row and on the board.

**Never blocked** by group size. 2–6 athletes per rack all run (F53 readout explains open or shared positions). **[Product]:** one clock for the room by default, with per-rack override. Confirm, or make per-rack the only mode.

### F55b. Board ring view (extends F9 / F30)
**When it shows:** only during a rack-rotation block. The warm-up and other formats use the normal live view.

**Header:**
- Session line: "Rack rotation · B · Round 2 of 4."
- Big shared countdown: **"Rotate in 0:42"** (48 px tabular), or "Move to your next position · 0:48" between blocks.
- Stat blocks stay.

**Grid:** one panel per rack (2–3 per row at 1080p, wrapping like F9b).

**Panel anatomy:**
- **Title:** rack name (32 px bold) + "4 athletes."
- **Ring:** N nodes evenly spaced on a circle (clockwise from the top), connected by a thin `line` arc with small arrowheads showing the move direction.
  - **Each node** is a rounded tile, min 140 × 72 px at 1080p:
    - Position number and the exercise's short name (20 px), e.g. "1 · Back Squat."
    - The athlete's board name at that node (24 px bold).
    - The rack position adds a **RACK** label (Label type).
    - A spot node reads "Spot."
    - An empty node reads "Open."
    - A shared node lists 2 names.
  - The node whose athlete is mid-set gets an accent border (team accent, with the text "Lifting" in the node). Text always carries the state.
- **Ring center:** the rack's own countdown if it's paused or offset ("Paused" / "0:42"), and "Round 2 of 4" (20 px).
- **Below the ring:** a one-line text list for readability from far away: "Jordan M. → Squat · Ava R. → Spot · Maya T. → Row · Riley K. → Dead Bug."

**Rotation moment:** names move one node clockwise.
- With motion: 400 ms slide.
- With `prefers-reduced-motion`: names swap in place.

**Never on the board** (design system §9): weights, reps done, RPE, levels, check-ins, or "your version." Hidden athletes and those without board consent don't appear; their node reads "Open."

**States:**
- **Offline:** "Reconnecting…" banner; rings keep their last state and the countdown keeps running locally.
- **No athletes visible on a rack:** the ring shows positions only.

---

## Accessibility
- **Targets:** all new controls are ≥ 44 pt. In-workout Done buttons and warm-up part checkboxes are 56 pt.
- **Countdowns:** screen-reader text "Rotate in 42 seconds, next Position 4, Dead Bug." Announcements are throttled to every 15 s and the last 5 s.
- **Ring view:** the text list under each ring is the accessible version. The ring itself is `aria-hidden`.
- **Never color alone:** Rack, Spot, Open, Express, Compact, Edited, Auto, and Suggested are all text tags.

## Acceptance (UX sign-off, for `reports/training-v3-acceptance.md`)
**Part 1**
- [ ] F45: none of the "Was" behaviors in F45a exist. Save is always enabled for building choices. No builder string from the removed list renders (repo search). F45b items still behave as before.
- [ ] F45d: Auto chips appear only when the coach's value differs from auto, and tapping one restores auto.
- [ ] F46: toggles at program, session, and athlete level; any "off" gives the written exercise and hides the "Your version" line; testing eligibility unchanged.
- [ ] F47–F48: warm-up card first on every session except the excluded types; Done per part; how-to links; "Warming up" board state; ramp-up rows before loaded tier A/P lifts, excluded from work sets, suggestions, and PRs.
- [ ] F49–F50: edit, swap, reorder, add, remove, Regenerate (with confirm on edited), save/use template; team default Approach / template / None; Limited space.
- [ ] F51: program, weekday, and date lengths, with priority shown in the target line; estimate vs target in the footer, week card, and Today; Fit to time suggestions apply and undo one by one and never change Save; generated sessions show the fit log with Undo; Express label.

**Part 2**
- [ ] F52–F53: Format includes Rack rotation; rotation card with positions, Rack marker, spotter toggle, rotation time with an Auto chip, rounds, build-up round, and the rest/block-time/group-fit readouts; nothing blocks.
- [ ] F54: start position per block on Today; current position, logger, shared countdown, position strip, rotate banner; per-position logs; spot position logs nothing.
- [ ] F55: Start / Rotate now / +15 s / Pause / End block, plus per-rack controls; board ring per rack with names at positions, the RACK label, and the text list; no board-unsafe data.

## Flags
| To | Item |
|---|---|
| **Product (01)** | (1) `training-v3.md` wasn't saved; reconcile this doc with it. (2) F45c dismiss-once note: on or off (default off here). (3) F55a: one room clock with per-rack override, or per-rack only. (4) F41: stepper widened to 5–180 min with Easy/Moderate only. Confirm that's the right read of adult rules A4 (a data rule) vs. §6 limits (now generated-only). (5) F46: athlete-level toggle lives per program. Confirm that, or make it per athlete across all programs. |
| **Training (02)** | Confirm the Fit to time row wording in F51e matches your trim steps, and the warm-up prescription text style ("8 each," "2 × 10 yd"). |
| **Legal (07)** | F45 removes every builder limit, including for teams with minors (accepted risk per your Training v3 review). F46 lets a coach turn off level adjust for a minor. Level still gates strength checks. Confirm nothing in compliance depends on either. F54 shows the spot partner's board name in the app (B5 approved names under box 4). Confirm that covers spotting. |
| **Coordinator** | Hand off this doc with `user-flows.md` and `trainer-mode.md`. Both now carry a note that F45 supersedes their builder blocks. |
