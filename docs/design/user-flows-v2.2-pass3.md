# User Flows: v2.2 Circuits and Stations (F27–F30)
Owner: UX/UI Design (03) · v1.0 · Fri Nov 13, 2026
Closes spec blocker **B6** (circuit blocks, Stations format and rotation controls, the board station grid). Extends F19 (builder), F22 (workout view), and F9/F23 (coach board) in `design/user-flows.md`. Rules: `content/programs/circuits-and-stations.md` (Training), `legal/v2.2-copy-review.md` §5 (station names). Same conventions as before: existing components, text plus color, ≥ 44 pt targets, 3 taps or fewer for core actions.

---

## F27. Circuits in the session editor (extends F19c)

### F27a. Making a circuit
- Select **3–4 adjacent rows** (checkbox on hover / long press) → **Group as circuit**. With 2 rows selected, the button reads **Pair as superset** (as before).
- **Grouped rows:**
  - Labeled **A1–A4**, with the bracket line used for supersets.
  - Block header: **"Circuit · 3 rounds"**. Rounds = the block's sets.
- **Add to an existing superset:** drag a row onto the bracket. It becomes A3 if the result is still valid.
- **Ungroup:** bracket menu → **Ungroup**. **Remove one exercise:** drag it out of the bracket. The rest re-letter.

### F27b. Blocked groupings (one-line reasons under the rows; nothing groups)
| Rule | Reason shown |
|---|---|
| Tier P or A in the block (C2) | "Power and heavy lifts aren't done in circuits. They need full rest." |
| Two lower-body tier B (C3) | "Only one leg-heavy exercise per circuit. Swap one for upper body or core." |
| Two grip-heavy (C3) | "Only one grip-heavy exercise per circuit." |
| Same pattern twice (C3) | "These two work the same movement. Pick a different one." |
| Different stations (C4) | "Circuits need to be done from one spot." |
| 5 or more exercises (C1) | "Circuits are 3–4 exercises." |
| Conditioning (C7) | Not offered (no conditioning exercises exist). |

The F19c reason "Supersets are for 2 strength exercises. Use a circuit for care, core, and mobility." is **retired**.

### F27c. What each row shows
- **Tier B rows:** sets × reps and effort, as usual. On a team with any minor, typing "AMRAP," "max reps," or "for time" in a tier B row is blocked with: "For athletes under 18, strength work in a circuit keeps its reps. No racing the clock." Adult-only teams see the same line as an amber warning.
- **Tier C/D rows:** a **Work** field toggles between reps and **Timed** (e.g. "30 s on · 15 s off").
- **Rest display:** A1–A3 show "15 s to next." The last row shows "Rest 1:00 after the round." Coach overrides follow F19c (they can't go below 45 s).
- **Beginner note (coach-only, muted, under a 4-exercise block):** "Beginners do A1–A3 as the circuit, then A4 as straight sets after."
- **Auto-built circuits** carry the **"Auto"** tag. Any manual change removes it.
- **Footer estimate:** as in F19c.

### F27d. Workout view (extends F22)
- **Card:** one grouped card, header **"Circuit · Round 2 of 3"**, rows A1–A4.
- **Flow:**
  - **Done** on A1 starts the 15 s transition: "Next: A2 One-Arm Row · 0:15."
  - After the last exercise, the round rest runs ("Rest 1:00"), then **Round 3 of 3**.
- **Timed rows:** a work timer ("Work 0:30"), then the short rest ("Rest 0:15"), with a local sound/vibration at each switch.
- **Beginner with a 4th exercise:** the circuit card shows A1–A3. A4 appears after it as a normal straight-set row, with the muted line "Done on its own after the circuit."
- **One-handed:** **Done** stays in the thumb zone (≥ 56 pt), and the A-label is 28 pt bold (as F22).

---

## F28. Stations format in the builder (extends F19c)

### F28a. Switching a session to Stations
- **Session editor header:** a segmented control, **Format: Standard · Stations**.
- **Disabled** (with a tooltip) for home sessions, light home days, extra recovery, and testing sessions with load tests: "Stations are for weight-room sessions with rack groups."
- **No racks yet:** choosing Stations shows "Stations need rack groups." with **Set up racks** (opens F17). The format stays Standard.

### F28b. Layout once Stations is on
The exercise list splits into three sections:
1. **Part 1 · Together:** auto-filled with the warm-up, every tier P exercise, and the main tier A lift. Muted line: "Everyone does this first, fresh, at their own rack."
2. **Part 2 · Stations:** station cards, one per rack by default.
3. **Finish · Together (optional):** empty, with **Add finish** (care/core/mobility block).

**Station card:**
- **Name field:**
  - Required, max 20 characters, placeholder **"DB bench."**
  - Helper text: "Name stations after equipment, like 'DB bench.'"
  - Never suggest athlete names, levels, or positions (Legal §5).
- **Contents:** one block (straight sets, superset, or circuit). Drag a block from the list onto a card. Each card holds exactly one block.
- **Time line:** "Auto · 8 min" with a pencil to override.
- **Order handle:** drag cards to reorder.

**Moving power or heavy lifts into a station:**
- **Team with any minor:** the drop is refused and the item snaps back, with "Power and heavy lifts are done in Part 1, fresh, so no group does them tired at the end."
- **Adult-only team:** allowed, with the same line as an amber warning.

### F28c. Checks shown under the stations (live)
| Check | Line |
|---|---|
| Stations = racks | "4 stations · 4 racks ✓" |
| More stations than racks | Amber: "5 stations, 4 racks. One station sits empty each round." |
| More racks than stations | **Blocking**, red: "5 racks, 4 stations. Add a station or merge two racks." with **Add station** and **Edit racks** |
| Adjacent leg-heavy stations (incl. last → first) | Amber: "Stations 2 and 3 are both leg-heavy, so groups do them back to back." with **Suggest order** (alternates lower / upper / core) |
| Station too short (coach time) | Amber on that card: "Station 3 needs about 9 min. Add time or cut a set." Rest is never shortened. |

### F28d. Footer estimate
"Part 1 · 15 min + 4 stations × (8 + 1) min + Finish 5 min = about 56 min · target 60." An amber dot shows when it's over the target, and the builder suggests "Try 3 stations or cut a set."

### F28e. Testing day (jump tests only)
- On a testing day, the Testing session offers **Run jump tests as stations**.
- It creates up to 3 stations (Approach touch · Broad jump · Med-ball throw).
- Load tests stay at racks. The option is hidden for the load-test part.

---

## F29. Running stations live

### F29a. Coach (Team screen during today's session)
- **Before Part 2:** a primary button, **Start stations**.
  - **Blocked when anyone in today's session isn't on a rack:** "3 athletes aren't on a rack." with one tap, **Add the rest to racks (balanced)**. It uses balanced auto-assign and the same preview as F17, and skips athletes following another team's program.
- **After start:** a sticky control bar.
  - Text: **"Stations · Round 2 of 4 · Rotate in 6:12."**
  - Buttons: **Rotate now** · **+1 min** · **End stations**.
  - **Rotate now** asks once per session: "Move every group to its next station?"
  - **End stations** → Finish (if any) → normal session end.
- **At 0:00:** the bar shows "Rotating…" and the next round starts after the **1 min transition** ("Move to your next station · 0:48").

### F29b. Athlete
- **Today before the session:**
  - "Part 1: together" (its exercises).
  - Card: **"Stations: you start at Station 2 (DB bench)."**
- **Workout view, Part 2:**
  - Header: **"Station 2 · DB bench."**
  - Countdown line: **"Rotate in 3:12 → Station 3 (Box + bands)."**
- **At rotation:**
  - Full-width banner "Time to rotate → Station 3 (Box + bands)," with a local sound/vibration.
  - The next station's block loads.
  - **Unfinished sets** at the old station are saved as **"Not done"** (never "rushed"). A muted line shows them: "1 set not done at DB bench."
- **Not on a rack:** "You're not on a rack today. Follow the standard order." The athlete sees the Standard list.
- **Offline:** the countdown runs locally from the last `rotate_at`. On reconnect, it jumps to the server's station.
- **Level (G8):** each station shows the athlete's own version, with the F13 line when it differs.

---

## F30. Coach board station grid (extends F9 / F23)
**Shown only during Part 2 of a Stations session.** Part 1 and Finish use the normal live view.

- **Header:**
  - Session line: **"Stations · Round 2 of 4"**.
  - Large shared countdown: **"Rotate in 3:12"** (48 px tabular).
  - The stat blocks stay.
- **Grid:** one panel per station, in station order, wrapping like F9b.
- **Panel:**
  - Station name (32 px bold).
  - Rack line: **"Rack 2 · DB bench → Box + bands"** (24 px), meaning current → next.
  - That rack's athlete tiles: the same anatomy as F9a, compact (min 120 px), with the resolved exercise and set line. No level, load, RPE, or check-ins.
- **Empty station:** the panel shows **"Open this round."**
- **Rotation moment:** rack lines move to their next panels (slide). With `prefers-reduced-motion`, it's a cut. For the 1-minute transition, the header reads "Move to your next station · 0:48."
- **Ticker:** unchanged (finishes, PRs without numbers, group milestones). Optional milestone: "Round 3 of 4 started."
- **Hidden athletes / no board consent:** not shown. A rack with no visible athletes shows only its rack line.
- **Testing day jump stations:** panels show the F9d change chips.

---

## Flags
| To | Item |
|---|---|
| Product (01) | "Rotate now" asks once per session, not every time (F29a). Confirm, or cut the confirmation. |
| Training (02) | Confirm the timed-row default "30 s on · 15 s off" for tier C/D (F27c), and the coach-only beginner note wording. |
| UX (03, me) | Still open: `design/design-system.md` (not a build blocker; the code has tokens). |
