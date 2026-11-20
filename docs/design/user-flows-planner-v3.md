# User Flows: Program Planner v3 (release 2.4.2)
Owner: UX/UI Design (03) · v1.3 · Thu Nov 19, 2026
Source of truth: Approach project → `design/user-flows-planner-v3.md`. Screens for 2.4.2, so Claude Code builds these and doesn't design its own (spec Step 0.4).
Built from:
- `content/programs/program-planner-v3.md` v1.0 (§1a, §1d, §2a, §3a–§3d)
- `product/specs/v2.4.2.md` **v1.1** (Parts A–E, D-063 to D-069)
- `design/user-flows-training-v3.md` v1.2 (F45 coach freedom, F47 warm-up card, F51 session length, F52–F55 rack rotation, F56 week setup card)
- `design/user-flows.md` v3.2 (F17 racks, F19 builder, F25b testing date suggestions), `design/design-system.md` v1.1

Conventions still apply: tokens and components from the design system, "muted" = `muted` token, ≥ 44 pt targets, 56 pt in-workout and Build actions, text + color (never color alone), no warning colors for building choices (F45). **Where this doc and the spec differ, the spec wins.** Trainer wording via `terms(teamKind)`, though trainer goal programs don't get these screens in 2.4.2.

> **Changes in v1.3 (11/19): adds F64, Today's racks (spec v1.1 Part E, D-069):** roll call, rebalance preview, Confirm, late arrivals, and the Start prompt, on phone and web. Checked against `racks.tsx`, `TeamHome.tsx`, and `StationControls.tsx`. F63 gets the Part E prompt (E4).
>
> **Changes in v1.2 (11/19): adds F63, rack rotation controls on the coach board** (founder request 11/19: the room clock and Start belong on the projected board). UI only, no new data. **Product to schedule** (not in spec v2.4.2 v1.0).
>
> **Changes in v1.1 (11/19): checked against the live repo** (`~/Projects/approach`, `main` at `1a9a437`, tag `v2.4.1`, 2.4.1 deployed). Six build notes, marked **[Repo]** where they apply:
> 1. **F57:** the builder already has a "What's in your gym?" card (`EquipmentPicker`, `builder.tsx`) above Week setup, and the Build button lives inside `WeekSetupCard`. The equipment picker moves into card 3; Build moves out of the Week setup card.
> 2. **F57:** the builder's "Time of year" chips conflict with planner §1b step 1 (phase comes from the calendar per week). UX proposal in F57b; Product to confirm.
> 3. **F61c, F62b:** athlete views prefix every exercise note with "Coach:" / "Trainer:" (`workout.tsx`, `session.tsx`). Generated cues aren't the coach's words, so no prefix on Approach-generated sessions.
> 4. **F62c:** `RotationAthlete` shows no notes today; the position card adds them.
> 5. **F61e, F62d:** `workout.tsx` turns any shared `group` into a superset/circuit block. `group: 'CD'` must be kept out of that grouping (no CD1/CD2 labels, no bracket, no pairing in Fit to time) and drawn only as the cooldown row/card. Cooldown rows log no sets.
> 6. **F61b, F62a:** session-level notes already render through `NotesLines` (13 pt `muted`, e.g., the moved-work line). Summary lines go in that same spot; the moved-work line isn't shown twice.
> Boards: no note rendering exists in `board/[teamId].tsx`, `RotationRing`, or `EffortBoard` today; keep it that way (F62e).

**Kill switch:** with `plannerV3 = false`, none of F57–F62 render. The builder is the 2.4.1 builder (F56 as built).

Flows continue the numbering: **F57–F62**.
| Flow | What | Spec |
|---|---|---|
| F57 | Builder setup layout (three cards, one Build) | A1, B1 |
| F58 | Program length card | A1 |
| F59 | Plan timeline, plan summary, "program ended" prompt | A3 |
| F60 | "Your weight room" card and style suggestion | B1–B3 |
| F61 | Generated session, coach view (block headers, summary lines, notes, cooldown) | D1–D4 |
| F62 | Athlete view (Today, workout, rotation, cooldown) and boards | D1–D4, G-4 |
| F63 | Rack rotation controls on the coach board (extends F55) | Founder request 11/19, Product to schedule |
| F64 | Today's racks: Who's here, rebalance preview, Confirm, late arrivals, Start prompt | E1–E5 |

---

## F57. Builder setup layout (team programs, volleyball)
**Rule:** the coach sets limits once, at the top; Approach Strength plans and builds. Three numbered cards, then one **Build program** button, then the plan.

**Order (top of the program builder):** the existing controls above Week setup stay where they are (Volleyball week, etc.), except as noted. Then:
1. **Program length** (F58), new, directly above Week setup
2. **Week setup** (F56), as built, minus its Build button **[Repo]** (`WeekSetupCard` renders `Build program` / `Rebuild program` today; move it out)
3. **Your weight room** (F60), new. **[Repo]** The separate "What's in your gym?" card is removed; its `EquipmentPicker` becomes card 3's Equipment row.
4. **Build program** (56 pt, full card width; moved here from F56f)
5. **Plan** (F59): a preview before Build, the built plan after
6. Week grid (F19b), as built

```
┌ 1 Program length ──────────────────────────────────────────────┐
│ …                                                             │
└───────────────────────────────────────────────────────────────┘
┌ 2 Week setup ─────────────────────────────── [Recommend for me] ┐
│ … (F56, unchanged; summary lines stay inside this card)        │
└───────────────────────────────────────────────────────────────┘
┌ 3 Your weight room ────────────────────────────────────────────┐
│ …                                                             │
└───────────────────────────────────────────────────────────────┘
                                             [ Build program ]  (56)
┌ Plan · Preview: not built yet ─────────────────────────────────┐
│ 8 weeks, Nov 30 – Jan 24: Accumulation (3) → Strength (3) → …   │
│ week rows …                                                    │
└───────────────────────────────────────────────────────────────┘
```
- **Web (≥ 900 px):** cards are the full builder width (max 1120), 24 between cards. **Phone:** cards stack, side gutter 16; **Build program** sits in a sticky bottom bar (56 pt) once the coach scrolls past card 3.
- Card titles use H2 with a number: "1 Program length." The number is text, not a step indicator; all three cards are open at once and can be edited in any order.
- **Personal / solo programs:** card 1 only (style is always Standard, so no card 3). Card 2 stays as those programs have it today. **Trainer teams:** unchanged in 2.4.2.

### F57b. "Time of year" chips **[Repo] [UX proposal, Product to confirm]**
With `plannerV3` on, each week's phase comes from the calendar (planner §1b step 1), so a single coach-picked phase no longer decides the plan.
- **Calendar has the season's first practice or first match:** the chips are hidden for team programs. Card 1 shows a muted line instead: "Phases come from your calendar: off-season until Jan 4, preseason until Jan 26."
- **No season dates on the calendar:** the chips stay, relabeled **"Time of year (no season dates on your calendar)"**, with the line "The whole plan uses this phase. Add your first practice or match in Calendar to plan by date."
- Personal/solo programs: unchanged.

### F57a. Build and rebuild (replaces the button part of F56f)
- **New program:** **Build program**.
  - Disabled only for input errors, each with its reason line under the button: "Pick at least one day." (F56) · "Fix the program dates above." (F58 error).
  - **Building:** "Building your program…" with the button disabled.
  - **Success:** the Plan card loses its Preview tag, the week grid appears, toast **"Program built: 8 weeks, 4 sessions a week."** If rack groups were created (F60d), the toast adds a second sentence: "4 rack groups made. Edit them in Team → Racks."
  - **Error:** "Couldn't build the program. Your settings are saved here. Try again."
- **Existing program:** all three cards open "As built" (header tag). A change in any card turns the button into **Rebuild program**, shows "Changes apply from the next week that hasn't started," and puts the Plan card into preview (F59e).
  - **Rebuild** confirm (F56f wording, decided by D-068.5): "Rebuild from these settings? Approach Strength's sessions are rebuilt. Sessions you've edited keep your edits." **Rebuild** / **Cancel**.
  - **Cancel changes** (44 pt link, under the button): restores "As built" in all three cards.
- **Offline:** Build/Rebuild disabled with "Connect to build your program." Cards stay editable.

---

## F58. Program length card (planner §1a, spec A1)
### F58a. Layout, web
```
┌ 1 Program length ─────────────────────────────────────── As built ┐
│ Starts            Ends by                                           │
│ [ Mon Nov 30 ▾ ]  [▣ End date | Number of weeks ]                   │
│                   [ Sun Jan 24 ▾ ]                                  │
│                   Suggested: (Sun Jan 24 · before first match Jan 26)│
│ 8 weeks · Mon Nov 30 – Sun Jan 24                                   │
│                                                                     │
│ What happens at the end?                                            │
│ (●) Season starts     Ends fresh for the first match or practice.   │
│ ( ) Testing day       The last week is lighter, with testing at the end.│
│ ( ) Break             Full training through the last week.          │
│ ( ) Nothing special   Blocks run in order to the end.               │
└─────────────────────────────────────────────────────────────────────┘
```
**Phone:** one column in this order: Starts · Ends by (segmented, full width) · End date or weeks · suggestion chips (wrap) · length line · end type cards.

### F58b. Fields
| Field | Control | Default | Notes |
|---|---|---|---|
| **Starts** | Date field (`Field` + picker), 48 pt | Next Monday | Any date. For an existing program it shows `blockStart` and stays editable only while the program hasn't started; after that it's read-only with "Started Nov 30." |
| **Ends by** | Segmented, 2 segments ≥ 44 pt: **End date · Number of weeks** | Number of weeks | Switching keeps the same end: 8 weeks ↔ Sun Jan 24 |
| **End date** | Date field, 48 pt | — | Shown when Ends by = End date |
| **Number of weeks** | `Stepper` 1–52 (44 × 44 buttons) | 8 | Shown when Ends by = Number of weeks. End date = start + weeks × 7 − 1 day |
| **Length line** | Footnote, `ink` | — | Always shows both forms: "8 weeks · Mon Nov 30 – Sun Jan 24." Live |
| **What happens at the end?** | 4 `OptionCard` radios, ≥ 56 pt each | See F58c | Exactly one selected |

**Length line variants:**
- End date not a whole number of weeks: "7 weeks and 3 days · Mon Nov 30 – Wed Jan 20. The last 3 days are a short week." **[Product/Training]** confirm how the planner treats a short last week (spec doesn't say). Until confirmed, Claude Code plans whole weeks and treats the short week as part of the last block.
- 1 week: "1 week · Mon Nov 30 – Sun Dec 6."

### F58c. End type options (one line each, `muted`)
| Option | Line under the title | Stored `endType` |
|---|---|---|
| **Season starts** | "Ends fresh for the first match or practice." | `'season'` |
| **Testing day** | "The last week is lighter, with testing at the end." | `'testing'` |
| **Break** | "Full training through the last week." | `'break'` |
| **Nothing special** | "Blocks run in order to the end." | `'none'` |

- **Default for a new program [UX proposal]:** **Season starts** when the coach's own calendar has a first match after the start date; otherwise **Nothing special.**
- No option is ever disabled. Testing day doesn't create a testing day; it shapes the plan, and the suggestion appears in the timeline (F59c).

### F58d. Suggested end date (from the coach's own calendar)
- **When:** the team calendar has the season's **first practice** and/or **first match** after the start date. Only this team's events; another team's events never appear (compliance § Multiple teams).
- **What:** up to 2 `DateSuggestionChip`s under the end field, earliest first:
  - "Sun Jan 3 · before first practice Jan 4"
  - "Sun Jan 24 · before first match Jan 26"
- **Tap:** sets Ends by = End date and fills the date. If no end type was picked yet on this program, it also selects **Season starts**. The chip shows a check while its date is the end date.
- **Which date:** the chip ends the program on the **Sunday before the event's week**, so the plan is whole weeks and the athletes arrive fresh (planner §1d example: ends Jan 24, first match Jan 26). **[Product]** confirm, or use the event date itself.
- **No first match on the calendar:** no chips, and a muted line "Add your first match in Calendar and Approach Strength can suggest an end date." (44 pt link "Open Calendar").

### F58e. Validation (inline, `errorText` under the field; input errors, not training rules)
| Case | Line |
|---|---|
| End date on or before start | "End date must be after the start date." |
| More than 52 weeks | "Programs can be up to 52 weeks. Pick an earlier end date." |
| New program starting in the past | "Pick today or a later start date." |
| Empty date | Field shows its placeholder; Build reason line "Fix the program dates above." |

Nothing else blocks. Long or short programs, any end type with any week setup: allowed, no messages (F45).

### F58f. States
| State | What shows |
|---|---|
| Loading the calendar | Fields work. Suggestion area reads "Checking your calendar…" (`muted`) |
| Calendar couldn't load | No chips. "Couldn't load your calendar. You can still pick an end date." |
| Program saved before 2.4.2 (no `endDate`) | Card shows Starts = `blockStart`, Ends by = **No end date (rolling blocks)** as a third, preselected read-only line: "This program runs in 4-week blocks with no end. Pick an end to plan it." Picking an end date or weeks turns on Rebuild. Nothing changes until the coach rebuilds (spec scope: existing programs). |

---

## F59. Plan timeline (planner §1d, spec A3)
**Where:** the **Plan** card under Build (F57). Coach only. Collapsible: header "Plan · 8 weeks" with a chevron (44 pt); open by default until the program's first week starts, then collapsed with the current week shown in the header ("Plan · Strength · week 2 of 3").

### F59a. Plan summary line (top of the card, body 16, `ink`)
Format: **"{N} weeks, {start} – {end}: {Block} ({weeks}) → … {ending}"**
| End type | Example |
|---|---|
| Season starts | "8 weeks, Nov 30 – Jan 24: Accumulation (3) → Strength (3) → Power (2). Ends fresh for the first match on Jan 26." (planner §1d, exact) |
| Season starts, no match on the calendar | "… → Power (2). Ends fresh for the season." |
| Testing day | "8 weeks, Nov 30 – Jan 24: Accumulation (4) → Strength (4). Ends with a lighter week and testing on Thu Jan 21." |
| Break | "… Full training through the last week." |
| Nothing special | "8 weeks, Nov 30 – Jan 24: Accumulation (4) → Strength (4)." |
| Spans phases | "12 weeks, Nov 2 – Jan 24: Strength (4) → Strength-Power (2) → Power (preseason, 3) → Maintain (in-season, 3)." |
| Rolling program (no end) | "Rolling 4-week blocks, no end date. Now: Strength · week 2 of 4." |

Block names: Accumulation, Strength, Strength-Power, Power, Maintain, Restore (as the generator names them). Under the line, when a break is inside the window (F59d): "Includes Winter break, Dec 21 – Jan 3."

### F59b. Week rows, web (≥ 900 px)
```
Week  Dates            Block                        Markers                         Days
1     Nov 30 – Dec 6   Accumulation · week 1 of 3   [Test suggested · Thu Dec 3]    Weight room Tue Thu · Home Sat · Mobility Mon
2     Dec 7 – 13       Accumulation · week 2 of 3                                   Weight room Tue Thu · Home Sat · Mobility Mon
3     Dec 14 – 20      Accumulation · week 3 of 3   [Deload]                        …
4     Dec 21 – 27      Strength · week 1 of 3                                       …
5     Dec 28 – Jan 3   Strength · week 2 of 3                                       …
6     Jan 4 – 10       Strength · week 3 of 3       [Deload]                        …
7     Jan 11 – 17      Power · week 1 of 2                                          …
8     Jan 18 – 24      Power · week 2 of 2          [Taper · −30% volume] [Test suggested · Thu Jan 21]   …
```
- **Columns:** Week (48, tabular) · Dates (140, tabular) · Block (220, `ink`, block name bold) · Markers (flex) · Days (flex, `muted`).
- **Rows:** 56 px min, 1 px `line` dividers. Each row is one button (whole row ≥ 44): tap → the week grid below jumps to that week.
- **Block boundaries:** a 1 px `inputBorder` divider (stronger than `line`) between the last week of one block and the first of the next, so blocks read as groups without color.
- **Current week:** `raised` fill, and a **This week** tag (Label type) after the week number. Past weeks: text in `muted`, no other change.
- **Phase headers** (only when the plan spans phases): a full-width row above the first week of each phase, Label type: "OFF-SEASON" · "PRESEASON · FROM JAN 4 (FIRST PRACTICE)" · "IN-SEASON · FROM JAN 26 (FIRST MATCH)".

### F59c. Markers (text chips, `StatusChip` muted tone, never color alone)
| Marker | Text | Tap |
|---|---|---|
| Deload | "Deload" | None (not a button; no chevron) |
| Taper | "Taper · −30% volume" | None |
| Testing suggested | "Test suggested · Thu Dec 3" (dotted outline) | Opens **Add testing day** (F11/F25b) with that date filled. All existing testing rules apply there unchanged (48 h before a match, supervision lock, eligibility). The chip is a 44 pt target |
| Testing day scheduled | "Testing day · Thu Dec 3" (solid outline) | Opens the calendar event |
| Break | "Break" + label, on a `BreakBand` across the row | Opens the break (F16a Edit) |
| Restore week (17+ weeks) | "Restore week" | None |
| Easing back in | Not shown (that's per athlete, F16c) | — |

- A suggestion is replaced by the scheduled chip once the coach saves a testing day that week. If the coach schedules one on another date, the suggestion stays until that week passes. No message either way.
- Suggested dates already respect the 48 h rule against **every** team on the athletes' combined calendar. Another team's matches are never shown, named, or hinted at (spec A criteria). If no date in that week fits, the chip doesn't appear.

### F59d. Days column and breaks
- **Days** = the kinds of day the generated week actually has, grouped by kind, in the order Weight room · Home · Mobility, each with its weekdays: "Weight room Tue Thu · Home Sat · Mobility Mon." Off days are left out.
  - A week where match-day rules change a day (F56c info lines) shows the built result: "Weight room Tue Thu · Mobility Mon Sat." The difference is visible in the text; no warning.
  - Express weeks (F60c): append "· Express" to the weight-room part.
- **Phone Days text:** counts only: "2 weight room · 1 home · 1 mobility."
- **Break weeks inside the window:** the row shows the hatched `BreakBand` with the label ("Winter break"), Block column "Paused," no markers. Rows after a break of 14+ days restart the block at week 1 (shown as "Strength · week 1 of 3" again), and the re-flowed plan still ends on the end date (shorter Accumulation shows in the rows and the summary line). No message explains it beyond the rows; the summary line's "Includes Winter break" covers it.

### F59e. Preview and rebuild
- **Before the first Build:** the card header reads **"Plan · Preview: not built yet"** (Label tag). Rows update live (debounced 300 ms) as cards 1–3 change.
- **Existing program, after a change in any card:** header "Plan · Preview of changes." Rows that would change get a **Changed** tag at the row end (text). Past and current weeks never change and are never tagged. Rebuild (F57a) applies it; Cancel changes restores it.
- **Planning error** (planner can't compute, e.g., calendar fetch failed mid-preview): "Couldn't preview the plan. You can still build; we'll try again." Rows from the last good preview stay, in `muted`.

### F59f. Phone (< 900 px)
```
Plan · 8 weeks                                   ▾
8 weeks, Nov 30 – Jan 24: Accumulation (3) →
Strength (3) → Power (2). Ends fresh for the
first match on Jan 26.

1 · Nov 30 – Dec 6                    This week
Accumulation · week 1 of 3
[Test suggested · Thu Dec 3]
2 weight room · 1 home · 1 mobility
────────────────────────────────────────────
2 · Dec 7 – 13
Accumulation · week 2 of 3
…
```
Each week is a 3–4 line block, whole block one 44 pt+ target.

### F59g. "Program ended" prompt
- **When:** from the day after `endDate`. Never for programs with no end date.
- **Where:** an `InfoBanner` (Note style, info icon) at the top of the coach's Team screen and the top of the builder.
  - Text: **"Varsity's program ended Jan 24. Build the next one?"** (planner §1d, exact; team name from the team).
  - Buttons: **Build the next one** (primary, 44 pt) · **Not now** (ghost, 44 pt).
- **Build the next one** opens the builder for a new program, pre-filled:
  - Starts: the Monday after the end date.
  - A muted line in card 1: "Next phase: In-season (from your calendar)." The phase comes from the calendar (planner §1b step 1).
  - End type: the F58c default rule. Week setup and Your weight room: copied from the ended program, tagged "From your last program" in each card header until changed.
  - Nothing is built until the coach taps Build.
- **Not now:** hides the banner for 7 days. Stored **on the coach's device**, per team (like F25a's "viewed" record), so there's no new server field.
- **Athletes after the end [UX proposal, Product to confirm]:** Today shows "Your program finished Jan 24. Your coach is setting up the next one." with no session, until a new program starts. If Product prefers that the program keeps rolling, drop this line and show nothing new.

### F59h. Accessibility
- Web rows are a table with header cells; each row's accessible name reads "Week 2, December 7 to 13, Accumulation, week 2 of 3, Deload, Weight room Tuesday Thursday, Home Saturday, Mobility Monday."
- Markers and tags are text. The current week is announced "This week."
- The summary line is a polite live region in preview mode (announced once after changes stop for 1 s).

---

## F60. "Your weight room" card (planner §2a, spec Part B)
**Rule:** Approach Strength suggests a style from the room and says why; the coach can pick any style. No choice is blocked or warned about (D-045, F45).

### F60a. Layout, web
```
┌ 3 Your weight room ───────────────────────────────────────── As built ┐
│ Racks or platforms        [ − ]  4  [ + ]    From your rack groups     │
│ Equipment                 Rack with pull-up bar, barbell, dumbbells,   │
│                           kettlebells, boxes                    [Edit] │
│ Athletes per session      [ − ] 16  [ + ]    From your roster. Lower it│
│                                              if fewer usually come.    │
│ Session length            about 60 min (program default)      [Change] │
│ ─────────────────────────────────────────────────────────────────────  │
│ Style                                                                   │
│ 16 athletes ÷ 4 racks = 4 per rack.                                     │
│ ┌──────────────────────────┐┌──────────────────────────┐┌──────────────┐│
│ │( ) Standard              ││( ) Stations              ││(●) Rack rotation  [Suggested]│
│ │Everyone works through    ││Groups rotate through     ││Each group rotates│
│ │their own sets.           ││stations.                 ││at its rack.  ││
│ └──────────────────────────┘└──────────────────────────┘└──────────────┘│
│ Suggested: Rack rotation. 3–5 per rack, so each group rotates at its   │
│ rack and nobody waits.                                                  │
│ Home workout and mobility days are always Standard.                    │
│ Rack groups: you have none yet. Building makes 4 racks of 4            │
│ (balanced mix). You can edit them after in Team → Racks.               │
└─────────────────────────────────────────────────────────────────────────┘
```
**Phone:** one column; the three style cards stack full width (each ≥ 64 pt); the suggestion line sits directly under the cards.

### F60b. Inputs
| Input | Control | Pre-fill | Line beside/under (`muted`) |
|---|---|---|---|
| **Racks or platforms** | `Stepper` 0–12 | Number of the team's rack groups; 0 if none | "From your rack groups" when it matches them. When it differs from existing groups: "You have 3 rack groups. Rack rotation uses them as they are. **Edit racks**" (44 pt link → F17). Info only |
| **Equipment** | Summary text + **Edit** (44 pt), which expands the existing `EquipmentPicker` inline in this card **[Repo]** | Team equipment | List in plain text; "Nothing selected: bodyweight and bands only" if empty |
| **Athletes per session** | `Stepper` 1–60 | Roster count | "From your roster. Lower it if fewer usually come." Plus, always: "Used for the suggestion only. Not saved." (spec B2: not stored) |
| **Session length** | Read-only value + **Change** (44 pt) | Program default (F51a) | Change scrolls to and opens the Session length control on the Week setup card (F56); it's the same value, not a second one |

- **Athletes per session** isn't stored on the server. On an existing program, it re-fills from the roster every time the card opens.

### F60c. Style suggestion (spec B2, exact reason strings)
- **Math line** (footnote, `ink`, tabular): "16 athletes ÷ 4 racks = 4 per rack." Rounded **up** (D-065): 14 ÷ 4 → "= 4 per rack (3.5, rounded up)." With 0 racks: "No racks or platforms."
- **Style cards:** three `OptionCard` radios, in this order, each with one line:
  - **Standard**: "Everyone works through their own sets."
  - **Stations**: "Groups rotate through stations."
  - **Rack rotation**: "Each group rotates at its rack."
- The suggested card carries a **Suggested** tag (Label type, text). Selection is the radio fill **and** the bold title.
- **Suggestion line** under the cards: "Suggested: {Style}. {Reason}" with the reason exactly as spec B2:

| Room | Suggested | Reason (exact) |
|---|---|---|
| Racks = 0 | Stations | "No racks, so groups rotate through equipment stations." |
| ≤ 2 per rack | Standard | "Two or fewer per rack, so everyone works through their own sets." |
| 3–5 per rack | Rack rotation | "3–5 per rack, so each group rotates at its rack and nobody waits." |
| 6+ per rack | Stations | "More than 5 per rack, so groups move between racks and other stations." |
| Session length < 30 min (adds to the row above) | + Express | "Short sessions: the essentials only." |

- **Under 30 min:** a second line follows: "Plus Express sessions. Short sessions: the essentials only." and an **Express** pill (Pill, neutral, text) on the suggested card.
- **Always:** "Home workout and mobility days are always Standard." (`muted`).
- **Live:** the suggestion recomputes as racks, athletes, or length change. **A style the coach picked is never changed by the suggestion;** only the Suggested tag and line move. Before the coach picks, the suggested card is preselected.

### F60d. What each choice shows (info lines only, `muted`, never blocking)
| Choice | Line(s) under the cards |
|---|---|
| **Rack rotation**, no rack groups | "Rack groups: you have none yet. Building makes {n} racks of {3–5} (balanced mix). You can edit them after in Team → Racks." Groups are created on **Build**, not when the card is tapped, so trying styles has no side effects. **[Product]** confirm "on Build" satisfies B3. |
| **Rack rotation**, groups exist | "Uses your {n} rack groups as they are." + **Edit racks** link |
| **Rack rotation**, ≤ 2 per rack (D-068.3) | "2 per rack: sessions use the groups-of-3 layout, so one position is open each turn." |
| **Rack rotation**, 6+ per rack (D-068.3) | "6 per rack: sessions use the groups-of-5 layout, and extra athletes share a non-rack position." |
| **Rack rotation**, racks = 0 | Card is disabled (opacity 0.4) with the line "Needs at least 1 rack. Add racks above." This is an input dependency (no racks to rotate at), not a training rule. |
| **Stations**, racks = 0 | "On the day, use Start stations to make groups." (existing F29a flow) |
| **Stations**, racks ≥ 1 | "Uses your rack groups as station groups." (or the "none yet" line if none) |
| **Standard** | No line |

- **Auto-created groups (B3):** the existing balanced-mix auto-assign, D-026 rules (roster, level, position only), neutral names ("Rack 1"…). No preview step is added here; F17 stays the place to review and edit. The build toast says they were made (F57a).

### F60e. Existing programs and other cases
- **Opens "As built":** the stored `generatedFormat` is selected (spec B3: restores on edit). A program without it shows **Standard** selected and the suggestion beside it.
- **Changing the style** turns on Rebuild (F57a). Coach-edited sessions keep their format (D-068.5).
- **One session's format changed later** in the session editor (F52): that session becomes the coach's, as today. This card doesn't change.
- **Not shown:** personal/solo programs, trainer teams.

### F60f. States
| State | What shows |
|---|---|
| Loading rack groups / roster | Steppers show skeletons; the style area reads "Working out a suggestion…" |
| Couldn't load rack groups | Racks stepper starts at 0, editable; line "Couldn't load your racks. Set the number here." |
| Offline | Card editable; suggestion works (local math); Build disabled per F57a |

### F60g. Accessibility
- Style cards are a radio group "Style." The suggested option's label ends ", suggested." The suggestion line is linked as the group's description.
- Steppers announce "Racks or platforms, 4." The math line updates in a polite live region.

---

## F61. Generated session, coach view (planner §3a–§3d, spec Part D)
Applies to **Approach-generated** sessions (`source = 'approach'`). Coach-built sessions look as today, except that any notes they have show the same way (F61c).

### F61a. Week grid
- **Week header** (above the 7 columns): "Week of Dec 21 · Strength · week 1 of 3." Add " · Deload" / " · Taper" / " · Test suggested Thu" when that week has the marker. Text only.
- **Session card:** as built, plus a format tag after the location tag when not Standard: "Rack rotation" or "Stations" (text). Estimate includes the cooldown.

### F61b. Session summary lines (§3b, spec D2)
**Where:** session editor, directly under the header and target line, above the warm-up row. Footnote 13 pt; first line `ink`, the rest `muted`. One line each, in this order, each left out when empty:
1. **Block and week:** "Strength block · week 2 of 4." (deload week: "Strength block · week 4 of 4 · Deload.")
2. **Jump count:** "Jumps today: about 27 contacts." Left out when the session has no plyo contacts. Counted after practice-load (R-4) and contact-cap cuts.
3. **What changed from last week:** "Since last week: Back Squat 80% (up from 75%). Hang Power Clean 2 more reps per set at the same effort." Wraps to at most 2 lines on phone, then **More** (44 pt) opens a sheet with the full text. Left out in week 1 and after a block restart.
4. **Moved work** (existing): "Shoulder circuit is on Saturday's home workout."

- **[Repo]** Rendered where session-level `NotesLines` render today; the moved-work line comes from the existing session notes and isn't repeated.
- Not editable as a block; they're generated from the session. If the coach edits the session, lines 1, 2, and 4 still compute from the session as it now is; line 3 is left out (there's no generated comparison for a coach's session).

### F61c. Per-exercise cue and week note (§3c, spec D3)
**Row anatomy (Standard rows and rotation positions), below the existing row content:**
```
Back Squat                         4 × 4 · rest 3:00
Same depth every rep. Stop with about 2 reps left.        ← cue (13 pt, muted)
Week 2: 80% (up from 75%).                                 ← week note (13 pt, muted)
```
- `ProgramExercise.notes` is shown **one line per line of text**. The generator writes the cue first and the week note second. Existing notes (depth-jump box, home jumps, moved care) display the same way.
- **Edit:** the row's existing edit opens a **Notes** field (multi-line, 3 rows visible, `inputBorder`). Save / Cancel. Clearing it removes the lines. Editing or deleting a note makes the session the coach's (spec D3), with the same "Edited" treatment as any other session edit today.
- **Spot positions:** no cue, no note.
- **Level column** (F53, with level adjust on): stays below the notes, "Beginners: Goblet Squat."
- No icons or labels before the lines; the text is short and stands on its own.
- **[Repo] No "Coach:" prefix on generated sessions.** Today the athlete views print `Coach: {notes}` (`Trainer:` in trainer teams). On Approach-generated sessions (`source = 'approach'`), notes render with no prefix, because Approach Strength wrote them. On coach sessions (including a generated session the coach edited), the prefix stays as today.

### F61d. Block headers (§3a, spec D1)
- **Standard blocks:** a header row above each block's first row, Label type: **"B · Strength · 5 sets · rest 3:00 · about 18 min."**
- **Rotation blocks (F53 card):** the card title becomes the §3a string, **"B · Strength · 75 s rotations · 4 rounds · about 20 min."** The F53 readout line under it shortens to "4 positions · Rack rotation" (rotation time and rounds are already in the title). All other F53 readouts (rest per position, group fit) stay.
  - Rotation letters follow the session's blocks: R1 Power = **A**, R2 Strength = **B**, R3 Secondary = **C** (so F54's "Rack 2 · B · Round 2 of 4" still reads right). The words "R1/R2/R3" are never shown.
- **Values are live:** a coach changing sets, rest, rotation time, or rounds updates the header.
- **Stations sessions:** Part 1 blocks use the Standard header; station cards keep F28's "Auto · 8 min" line.
- Format strings: rest as m:ss; rotation time in seconds under 2 minutes ("75 s rotations"), m:ss from 2:00 ("2:15 rotations"); "about N min" rounded to the minute.

### F61e. Cooldown row (§3d, spec D4)
**Where:** pinned at the **bottom** of the exercise list (mirror of the F49 warm-up row at the top). Only on generated weight-room sessions; never on home or mobility sessions.

**Collapsed:** "Cooldown · Lower-heavy · about 3 min" with a source tag **Approach Strength** (or **Edited**). Buttons: **Show** (44 pt) · ⋯ (Remove cooldown).

- **[Repo]** CD rows are never treated as a superset/circuit group: no bracket, no CD1/CD2 labels, never paired by Fit to time or auto-pairing.

**Expanded:** the `group: 'CD'` rows as normal rows (↑/↓ reorder, Swap, Remove, prescription field), e.g.:
- Half-Kneeling Hip Flexor Stretch · 30 s/side
- Lying Hamstring Stretch (towel) · 30 s/side
- Crocodile Breathing · × 3

Session type label in the collapsed row: **Lower-heavy · Upper · Total** (in-season uses Total). Any edit → tag **Edited** and the session becomes the coach's.
- **Remove cooldown:** confirm "Remove the cooldown from this session?" **Remove** / **Cancel**. Toast with **Undo** (3 s). There's no "Add cooldown" for coach sessions (not in scope).
- **Rack rotation sessions:** the row sits after the last rotation card with the label "Together." F52 already keeps "any cooldown or finish at the end."
- **Estimate:** included in the footer estimate (F51d) and the session card.

### F61f. Fit log (rotation sessions)
F51f banner as built, with rotation lines from §2b step 8, each with **Undo**: "B: 4 → 3 rounds (build-up round kept)." · "C: dropped Tibialis Raise." Rest is never a line (never shortened).

### F61g. States
| State | What shows |
|---|---|
| Session generated before 2.4.2 | No summary lines, no notes beyond existing ones, no cooldown. Nothing regenerates mid-block (R-5) |
| Notes save error | "Couldn't save the note. Your text is still here." |
| Loading | Skeleton rows; summary lines reserved as 2 skeleton lines |

---

## F62. Athlete view (spec D1–D4) and boards (G-4)
**Rule:** the athlete sees the coaching detail on **their own phone**, for **their own version** of the session. Nothing new goes on any shared surface.

### F62a. Today
Session card, top to bottom (rack card F18 and pain card F14 stay above it, as built):
```
Total Body A                              Weight room · Rack rotation
About 52 min
Strength block · week 2 of 4.
Jumps today: about 27 contacts.
Since last week: Back Squat 80% (up from 75%). Hang
Power Clean 2 more reps per set at the same…   More
Shoulder circuit is on Saturday's home workout.
─────────────────────────────────────────────
Rack 2 · Rack rotation
A · You start at Position 2 (Box Jump)
…
                 [ Start workout ]  (56)
```
- Summary lines: footnote 13 pt; block/week in `ink`, the rest `muted`. Same order and leave-out rules as F61b. **More** (44 pt) opens a sheet with the full line.
- **Built from the athlete's resolved session:** the jump count is their own count after R-4 for their position; "what changed" compares their own resolved exercises week to week. A line with no comparable change is left out (e.g., they moved from a % lift to an RPE version). **[Training/Product]** confirm.
- Express: "Express · about 25 min" as F51g.
- Program ended: F59g athlete line.
- **Plan tab, day detail:** the same summary lines and per-exercise notes.

### F62b. Workout view, Standard sessions
- **Block header** above each block's first card (Label type, `muted`): "B · Strength · 5 sets · rest 3:00 · about 18 min."
- **Exercise card**, top to bottom:
  1. Exercise name (title1)
  2. Your version line (F13), when it applies
  3. **Cue**: body 16 pt, `ink` (readable at arm's length mid-set)
  4. **Week note**: footnote 13 pt, `muted`
  5. Ramp-up section (F48), then work sets
- **[Repo]** No "Coach:" prefix on generated sessions (F61c).
- Cue and week note follow the athlete's resolved row. Downgraded methods show the R-2 week note "Straight sets today (your version)." exactly.
- Supersets and circuits (F22, F27d): cue and note under each A-label row, footnote size for both (space is tight); the A-label stays 28 pt.

### F62c. Workout view, rack rotation (extends F54)
- **Between blocks** screen (F54): "Next: Block C · You start at Position 1 (Pull-Up)" adds the block header under it: "C · Secondary · 75 s rotations · 3 rounds · about 12 min."
- **Current position card** (**[Repo]** `RotationAthlete` shows no notes today; add them): "Position 3 · One-Arm DB Row," prescription, then the **cue** (16 pt `ink`), then the **week note** (13 pt `muted`, usually only on the rack lift), then the logger.
  - **Build-up round on the rack position:** the week note "Round 1 is your build-up set (about 60%)." shows above the ramp-up rows.
  - **Spot position:** unchanged, "Spot the next lifter. Nothing to log." No cue.
- Countdown, position strip, Go to Position n: unchanged.
- **After the last rotation:** "Next: Cooldown · together," with the 1 min transition, then the cooldown card (F62d).

### F62d. Cooldown card (athlete)
**Where:** the **last card** of every generated weight-room session (Today list and workout view). Not on home, mobility, light home, extra recovery, or testing sessions.
- **Header:** "Cooldown · about 3 min" + `muted` "Together" (rotation and stations sessions) or nothing (Standard).
- **Rows:** name · prescription · **How-to** link; whole row a 48 pt target opening the exercise screen. e.g. "Half-Kneeling Hip Flexor Stretch · 30 s/side."
- **Done** checkbox, 56 pt, full width: "Cooldown done." When checked, the card collapses to "Cooldown done ✓" (tap to reopen).
- **Not required.** **Finish workout** is never gated on it and stays in the bottom bar (56 pt).
- **Logging [Repo, Product to confirm]:** cooldown rows log **no sets** (the workout view would otherwise give each a set logger). The Done state is kept **on the device** with that day's session, like other device-only states, so there's no new field. It never counts toward work sets, weight suggestions, PRs, or points, and the session counts as done when the athlete finishes, cooldown or not.
- **[Repo]** In `workout.tsx`, `group: 'CD'` rows are excluded from the superset/circuit block logic and rendered only as this card.
- **Coach-edited cooldown:** muted "Set by your coach" in the header (as F47).
- **Offline:** works fully from local data.

### F62e. Boards and shared surfaces (G-4, design system §9)
**Never on the coach board (live, ring, stations, Season), ticker, effort board, rack names, or rack card:**
- cues, week notes, block headers' sets/rest text, summary lines (block/week, jump count, "what changed," moved work), percentages, loads, levels, the plan timeline, or the end type.

**What the board does during the new parts (no new board states or data):**
- **Cooldown:** tiles show the resolved exercise name as for any row ("Hip Flexor Stretch"). The ring view (F55b) ends after the last rotation block and the board returns to the normal live view.
- **Build-up round:** the ring center reads "Round 1 of 4" as built; never "Build-up" with a percentage.
- Components that render notes or summary lines are **not board-safe** (add to design system §7.2 as `CoachingNote` and `SessionSummary`, "Board-safe: No"); they must not be imported into `src/app/board/` or the effort board.

### F62f. Accessibility
- Cue and week note are read after the exercise name: "Back Squat. Same depth every rep. Stop with about 2 reps left. Week 2: 80%, up from 75%."
- The cooldown Done checkbox is the whole 56 pt row, label "Cooldown done."
- Summary "More" sheet is a standard sheet with a Close button (44 pt).

---

## F63. Rack rotation controls on the coach board (extends F55a, F55b)
**Founder request (11/19):** the room clock and the Start button live on the projected coach board, where the coach and the room both look. **[Repo]** The board already shows the shared countdown during a block (`board/[teamId].tsx`, F55b). What's missing: Start, the between-block state, and the run controls, which today exist only on the Team screen (`StationControls`).

**Rule:** the board and the Team screen drive **the same room clock** (the existing station-run row). Either can start, rotate, add time, or end; the last change wins and both show it within the existing poll. **No new field, no new data on the board.**

### F63a. Board states on a rack-rotation day
| State | Header session line | Main area | Coach control (bottom strip) |
|---|---|---|---|
| **Before the first block** (warm-up time) | "Rack rotation · Block A next" | Normal live view (warm-up tiles, "Warming up" pills). A full-width band above the grid: **"Next: A · Power · 75 s rotations · 3 rounds"** (32 px) | **Start rotation** (primary) |
| **Ready check** [UX proposal] | same | Rings (F55b) with each athlete's **starting position** and no countdown; ring center "Starts at Position…" text replaced by "Ready" | **Start rotation** |
| **Running** | "Rack rotation · B · Round 2 of 4" (as built) | Rings + "Rotate in 0:42" (as built) | **Rotate now** · **+15 s** · **End block** |
| **Between blocks** | "Rack rotation · Block A done" | Rings showing **Block B starting positions**; big line "Next: B · Strength · 75 s rotations · 4 rounds" (48 px) where the countdown sits | **Start block B** (primary) |
| **Finished** | "Rotation finished" | Band "Cooldown together · about 3 min" for 2 min, then the normal live view | none |

- The Ready check is the "before" state with rings shown: the coach presses **Show positions** (secondary) to put the rings up so athletes find their spot before the clock starts. Without it, Start goes straight to Running. [UX proposal]
- Starting positions and names at nodes are the same board-safe data the ring already shows during a block. Nothing else is added (F62e list still applies).

### F63b. The control strip
- **Where:** bottom-right, above the ticker, left of the board signature; never over the rings or tiles. 1920 × 1080 reference: strip height 72 px, buttons **56 px** tall (≥ 44 board minimum, larger because the coach may tap a touchscreen or reach for a trackpad mid-session), 18 px labels (board control size, F-6), 16 px gaps.
- **Visibility:**
  - **Start rotation / Start block B stay visible** (no fade) while a start is pending. It's the one thing to do, and the room seeing "waiting for the coach" is fine.
  - **Rotate now / +15 s / End block** follow the existing 3 s fade (F9g): they appear on pointer move or any key press, so the running board stays clean for the room.
- **Style:** board palette (§2.5). Primary = chalk fill, carbon text. Secondary = 1 px `#C9CDD2` outline, ink text. No accent fill (accent never carries a control meaning).
- **Confirm, inline (no browser dialogs on the board):**
  - **Rotate now** (first time per session) and **End block** (every time): the strip turns into "Rotate everyone now? **Rotate now** · **Cancel**" / "End block B? Athletes move to the next block. **End block** · **Cancel**". Auto-cancels after 8 s.
  - Start, Start block B, and +15 s don't confirm.
- **Keyboard (web, laptop at the front of the room):** **Space** = Start rotation / Start next block (only while one is pending; does nothing while running) · **R** = Rotate now (same confirm) · **+** or **=** = +15 s · **E** = End block (same confirm) · **Esc** = cancel a confirm. A hint line in the strip while controls show: "Space start · R rotate · + 15 s · E end" (18 px muted). Presentation-clicker keys (arrows, PageDown) do nothing, so a clicker can't rotate the room by accident.
- **While a change is saving:** buttons disabled, label "Saving…". **Save error:** strip line "Couldn't reach the server. The clock didn't change. Try again." (18 px, `errorText` dark value `#F06A6E`, 6.6:1 on the board bg).
- **Offline:** controls disabled with "Reconnecting… Controls come back when you're online." The countdown keeps running locally (as built).

### F63c. Team screen controls (F55a) stay
The coach's phone keeps the same controls (they may be across the room from the laptop). Copy and behavior match F63b, including the confirms. Both surfaces show the change from the other within the poll interval; no "changed elsewhere" message.

### F63c-2. Unconfirmed racks (spec E4)
If today's racks aren't confirmed (F64), the first **Start rotation** on the board shows the inline strip prompt: "Today's racks aren't confirmed. Confirm them on your phone, or use current racks." **Use current racks** · **Cancel**. The board **never opens roll call or the rack preview**, because they show coach-only level and position chips and who's missing, and the board is projected to the room. Asked once per day across board and phone.

### F63d. Who sees the controls
Only the signed-in coach of that team can open the board (as built), so the controls never appear to anyone else. The board is meant for a personal device and network (F9 entry line, unchanged).

### F63e. Accessibility
- Every control is a labeled button; keyboard shortcuts duplicate, never replace, them. Visible focus ring (F-4, chalk 2 px).
- The header line and countdown keep their polite live region (as built); state changes ("Block A done. Next: Block B") are announced once.

### F63f. Acceptance (UX)
- [ ] On a rack-rotation day the board shows Start rotation before the first block, Rotate now / +15 s / End block while running, Start block B between blocks, and "Rotation finished" after the last block.
- [ ] A start or change from the board shows on athletes' phones and the Team screen within the poll interval, and vice versa (one clock, existing row; schema diff empty).
- [ ] Start buttons don't fade; run controls fade after 3 s; inline confirms for Rotate now (first time) and End block; Space/R/+/E work, arrows and PageDown do nothing.
- [ ] Between blocks, rings show the next block's starting positions; no data beyond F55b's board-safe set.
- [ ] Offline: controls disabled with the reconnect line; the countdown keeps running.

---

## F64. Today's racks (spec Part E, D-069)
**Rule:** on the day, the coach takes roll call, Approach Strength rebalances the racks around who's here with as few moves as possible, and the coach confirms. Nothing about presence is stored on the server, and absence is never shown outside the coach's own screen.
**Words:** "Today's racks," "Who's here," "Not here today" (coach only). **Never "check-in"** (that's the readiness check-in, D-016) and never "absent" or "missing" anywhere an athlete could see.

### F64a. Entry: the "Today's racks" card
**[Repo]** The coach's home tab is `TeamHome` (team list); session-day controls live on the Team screen (`team/[id].tsx`, `StationControls`). "The coach's Today" (spec E2.1) is both:
- **Team screen, Team tab:** a **Today's racks** card directly **above** the rotation/stations card (F55a/F63c). This is where the coach works on the day.
- **TeamHome, that team's card:** one extra line, "Today's racks: not confirmed" or "Today's racks: confirmed 3:12 PM · 14 here," as a 44 pt link that opens the Team screen card.

**Card content:**
| State | Title line | Second line | Button |
|---|---|---|---|
| Not confirmed | "Today's racks" + muted "Not confirmed yet" | "Lift Day 1 · Rack rotation · 4 racks" | **Take roll call** (primary, 56 pt) |
| Confirmed | "Today's racks" + muted "Confirmed 3:12 PM · 14 here" | "4 racks · 3 moves from last time" | **Edit** (secondary, 44 pt) |
| Rotation/stations running | "Today's racks · confirmed 3:12 PM" | "Late? Add them here." | **Add late arrival** (secondary) |

**Shown when (E1):** today has a weight-room session (generated or coach-built, any format) and the team has rack groups. **Not shown:** home, mobility, break, or testing days; teams with no rack groups; trainer teams; with `plannerV3 = false`.

### F64b. Layout
**Phone (< 900 px):** a full-screen page, two steps, so roll call isn't crowded by rack columns.
```
‹ Today's racks                         Tue Dec 29
Lift Day 1 · Rack rotation

Who's here                    [ All | None ]
16 on the roster · 14 here
┌────────────────────────────────────────┐
│ [✓] Ava R.        Setter        Rack 2 │  56 pt rows
│ [✓] Chloe P.      Outside       Rack 1 │
│ [ ] Emma W.       Middle        Rack 3 │  ← unticked: "Not here today"
│ [✓] Riley K.      Libero     No rack yet│
│ …                                       │
└────────────────────────────────────────┘
2 athletes follow another team's lift program
and aren't included. Add them by hand.
          [ See today's racks ]  (56, sticky)
```
Step 2 (after **See today's racks**): the preview (F64d) with **‹ Who's here** to go back and **Confirm racks** (56, sticky).

**Web (≥ 900 px):** one page, two columns: **Who's here** (360 px, left) and the **preview** (right, live). Unticking a name updates the preview after 300 ms. **Confirm racks** sits at the bottom of the preview column.

### F64c. Who's here (E2.2)
- **List:** the session's program roster, **all ticked by default**, sorted **A–Z by board name**. Each row: checkbox, board name, position chip, and the athlete's current rack on the right in `muted` ("Rack 2," or "No rack yet").
  - Position chips and the rack column are coach-only, like F17. No level chips here (levels appear only in the preview, as F17).
- **Whole row = target, 56 pt** (one-handed roll call in the gym). Unticked rows show "Not here today" under the name in `muted`; the check box is empty. Text carries the state, not just the box.
- **All / None:** segmented, 44 pt. **Count line:** "16 on the roster · 14 here" (polite live region).
- **Two-team athletes:** left out, with the existing note (E2.2): "2 athletes follow another team's lift program and aren't included. Add them by hand." **Add them by hand** (44 pt link) shows them in the list, unticked, tagged "Other program."
- **Device memory:** the list is kept on this device for today only (E5) and clears tomorrow. Opening on a different device starts with everyone ticked.

### F64d. Rebalance preview (E2.3, E2.4)
```
14 here · 4 racks · 3 moves                         [ Shuffle ] [ Use current racks ]
┌ Rack 1 · 4 ─────────┐ ┌ Rack 2 · 4 ─────────┐ ┌ Rack 3 · 3 ─────────┐ ┌ Rack 4 ─────────────┐
│ Chloe P.  Int · OH   │ │ Ava R.   Adv · S     │ │ Maya T.  Int · MB    │ │ Not used today       │
│ Grace H.  Beg · L    │ │ Jordan M. Beg · OH   │ │ Nora B.  Beg · OH    │ │ 2 here: moved to     │
│ Lily S.   Int · MB   │ │ Sofia L. Int · OPP   │ │ Zoe C.  Int · S      │ │ Racks 1 and 2        │
│ Riley K.  Int · L    │ │ Hannah D. Beg · MB   │ │                      │ └──────────────────────┘
│  Back on Rack 1      │ │  From Rack 4         │ │ 3 positions ·        │
│ 4 positions          │ │ 4 positions          │ │ Back Squat rest 2:30 │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```
- **Summary line** (body, `ink`): "14 here · 4 racks · 3 moves." With no moves: "14 here · 4 racks · no moves."
- **Rack columns:** header "Rack 1 · 4" (count is text). Athletes show board name + coach-only **level and position chips** (F17 chips, dotted outline for unconfirmed levels).
- **Moves are marked in text** under the name: "**From Rack 4**" (moved today), "**Back on Rack 1**" (returning athlete placed in their last rack), "**Added**" (present and had no rack). Unmarked = no change.
- **Closed rack** (Rack rotation, under 3, E2.3.3): a collapsed column "Rack 4 · Not used today" with "2 here: moved to Racks 1 and 2." Hidden racks in other formats (empty) aren't shown.
- **Per-rack layout readout** (Rack rotation only, `muted`, E3): "4 positions" · "3 positions · Back Squat rest 2:30" (2 × rotation, groups of 3) · "5 positions · Position 3 takes 2 at once" (groups of 5). Uses B-block's rotation time for the rest example.
- **Stations:** a line above the columns: "4 racks open: 4 stations, about 9 min each." (station formula). No per-rack readout.
- **Standard:** no readout; racks only say where athletes lift.

### F64e. Changing the preview (E2.4)
- **Move one athlete:** web drag between columns; phone (and keyboard) tap → sheet "Move Jordan M. to…" with each rack ("Rack 3 · 3 athletes") and **No rack today**. Moved-by-coach athletes get the tag "Moved by you."
- **Shuffle** (secondary, 44 pt): re-runs the balanced mix from scratch for today's present athletes (ignores the fewest-moves rule). The summary line counts the new moves.
- **Use current racks** (ghost, 44 pt): today's racks = current racks minus who's not here. No moves; closed racks aren't applied; returning athletes stay where they are or "No rack yet."
- **Reset** link appears after any manual change: back to the automatic rebalance.
- **Info lines** (plain `muted`, never warnings or blocks, F45), only when true:
  - "Rack 2 has 6: Position 3 takes 2 at once until the block ends." / "Rack 3 has 2: one position is open each turn." (Rack rotation, after manual moves)
  - "1 athlete here isn't on a rack. They'll follow the standard order." (any format)
  - **Stations:** "Stations start once everyone here is on a rack." with **Add them to racks** (one-tap balanced fill, existing F29a). That's the existing stations rule, kept (E4).
  - "No intermediate or advanced athlete is here for Rack 3." Shown only when the roster can't allow one (E2.3.4 already places one where possible). Neutral; no level names visible beyond this coach-only screen.

### F64f. Confirm (E2.5)
- **Confirm racks** (primary, 56 pt). **Saving:** "Saving…" disabled. **Success:** toast **"Racks confirmed. Athletes see their rack on Today."** The page closes to the Team screen; the card shows the Confirmed state.
- **Error:** "Couldn't save today's racks. Your roll call and changes are still here. Try again."
- **Offline:** roll call and the preview work (local); Confirm disabled with "Connect to confirm today's racks." (Racks are saved on the server.)
- **Re-confirm** any time before Start: **Edit** reopens with today's roll call and the confirmed racks as the starting point.

### F64g. Late arrivals and leavers (E2.6)
- **Before Start:** ticking someone after confirming shows an inline row under the list: "**Add Riley K. to Rack 3?**" (smallest rack under 5). **Add** (primary, 44 pt) · **Choose rack** (44 pt, opens the move sheet). Saves at once; nobody else moves. Toast: "Riley K. added to Rack 3."
- **While a rotation is running:** the card's **Add late arrival** opens Who's here (unticked names first). The add row reads "**Add Riley K. to Rack 3? Riley joins at the next rotation.**" If every open rack has 5: "Rack 3 will have 6. Riley shares Position 3 until this block ends."
- **Someone leaves mid-block:** unticking them shows "No change until this block ends." Nothing moves.
- **Rebalance and Shuffle are hidden** while a block runs; they come back between blocks (before **Start block B**) only if the coach taps **Edit**.

### F64h. The Start prompt (E4)
On the Team screen (and on the board if F63 ships, see F63c-2), **Start rotation** or **Start stations** with no confirm today opens a sheet, **once per day**:
- H2 "Confirm today's racks first?"
- Body: "Racks are as last set on Tue Dec 22. Take roll call so racks match who's here."
- **Confirm racks** (primary, 56 pt) → opens F64 (Who's here). After Confirm, the coach comes back to the Team screen with Start ready.
- **Use current racks** (secondary, 56 pt) → starts now with the current racks.
- Close (✕) = cancel; nothing starts.
- Never blocks (D-045). The existing stations rule still applies after this: if anyone here isn't on a rack, F29a's line and **Add them to racks** show.

### F64i. What athletes and the board see (E5)
- **Athlete Today:** the existing rack card (F18). An athlete moved today sees the existing one-time pill "**Moved to Rack 3**." An athlete in a closed rack sees their new rack the same way.
- **Athlete not ticked:** no rack card (the existing unassigned state). **No "absent," "not here," or roll-call wording anywhere** on their phone. If they open a rotation session anyway: "You're not on a rack today. Follow the standard order." (existing F54 line, neutral).
- **Board:** Arrange by rack and the rings follow today's racks; a rack of 3 shows a 3-node ring, a rack of 5 shows the shared node with 2 names (F55b). A closed rack doesn't appear. An athlete who wasn't ticked but opens the app shows under "Other athletes" (F9b). The board never shows roll call, counts of who's missing, or move tags.
- **Partner line** on the rack card keeps following B5 (count only while `rack_partner_names` is off).

### F64j. States
| State | What shows |
|---|---|
| Loading roster | Skeleton rows (56 pt) and skeleton columns |
| No rack groups | Card hidden (E1). The Racks tab (F17) is where groups are made |
| Everyone unticked | Preview: "No one marked here." Confirm disabled with that line (input state, not a rule) |
| Fewer here than one rack can use (Rack rotation, under 3 total) | Preview puts everyone on one rack; readout "2 athletes: one position open each turn." No block |
| Another device confirmed today | Card shows the confirmed state from the server; Who's here on this device starts all ticked, with the line "Roll call was taken on another device. Racks below are what's confirmed." |

### F64k. Accessibility
- Who's here is a list of checkboxes: "Ava R., setter, Rack 2, here" / "Emma W., middle, Rack 3, not here today."
- Preview columns are lists with headings ("Rack 1, 4 athletes, 4 positions"); move tags are part of each name's label ("Hannah D., from Rack 4").
- Every drag has the tap-to-move sheet (design system §10). Targets: rows 56, buttons 44/56.
- The count and summary lines are polite live regions, announced once after changes stop for 1 s.

### F64l. Acceptance (UX, for `reports/v2.4.2-acceptance.md` Part E)
- [ ] The Today's racks card shows on the Team screen (above rotation/stations controls) and as a line on the TeamHome team card, only on weight-room days with rack groups; states Not confirmed / Confirmed / Running as F64a.
- [ ] Phone: two steps (Who's here → preview) with sticky 56 pt buttons; web: two columns with a live preview.
- [ ] Who's here is A–Z, all ticked, whole-row 56 pt targets, "Not here today" text when unticked, two-team note and add-by-hand.
- [ ] The preview marks From / Back on / Added / Moved by you in text, shows closed racks as "Not used today," and shows the per-rack layout readout for Rack rotation and station time for Stations.
- [ ] Move, Shuffle, Use current racks, and Reset work; info lines are neutral and nothing blocks except "No one marked here."
- [ ] Late arrival add is one tap and moves nobody else; during a block it says they join at the next rotation.
- [ ] The Start prompt appears once per day with Confirm racks / Use current racks; on the board it never opens roll call or the preview.
- [ ] No athlete screen or board shows roll call, absence, or move tags; no screen says "check-in" for this.

---

## New components (add to `design/design-system.md` §7.2 at the next update)
| Component | Anatomy | States | Used in | Board-safe |
|---|---|---|---|---|
| **SetupCard** | `Card` with numbered H2 title, optional header tag ("As built," "From your last program"), content | default · as built · changed | F57–F60 | — |
| **PlanTimeline** | Summary line + table rows (week, dates, block, markers, days); phone stacked blocks | preview · built · preview of changes · error | F59 | No |
| **PlanMarker** | `StatusChip` muted: Deload, Taper, Test suggested (dotted), Testing day (solid), Restore week | static · tappable (test chips) | F59c | No |
| **StyleSuggestion** | Math line + 3 `OptionCard`s + Suggested tag + reason line + info lines | suggested · picked other · disabled (0 racks, rack rotation) | F60c–d | — |
| **SessionSummary** | 1–4 footnote lines, first `ink`, "More" sheet | full · truncated · empty (absent) | F61b, F62a | No |
| **CoachingNote** | Notes lines under a row: cue, week note | coach (13 pt both) · athlete (cue 16 pt `ink`, note 13 pt `muted`) | F61c, F62b–c | No |
| **BoardControlStrip** | Board-palette strip: up to 3 buttons (56 px), inline confirm, key hint line | pending start (no fade) · running (fades) · confirming · saving · error · offline | F63 | Yes (controls only; coach-only page) |
| **TodaysRacksCard** | Title + status line + one button; TeamHome status line | not confirmed · confirmed · running | F64a | No (coach only) |
| **RollCallList** | 56 pt checkbox rows: name, position chip, current rack; All/None; count line | ticked · not here today · other program | F64c | No |
| **RackRebalancePreview** | Summary line, rack columns with chips and move tags, closed-rack column, layout readout, Shuffle / Use current / Reset | auto · edited · saving · error · offline | F64d–F64f | No |
| **CooldownCard / CooldownRow** | Athlete card (F47 pattern, one Done) · coach pinned row (F49 pattern) | open · done · edited · removed | F61e, F62d | No |

---

## Acceptance (UX, for `reports/v2.4.2-acceptance.md`)
**Part A**
- [ ] F57: builder shows Program length → Week setup → Your weight room → Build program → Plan, web and phone; one Build button; Rebuild with the D-068.5 confirm; Cancel changes restores all three cards.
- [ ] F58: start + end date or start + weeks (1–52) with the length line showing both; four end types with their lines; suggestion chips from this team's first practice/match only; validation lines as F58e and nothing else blocks.
- [ ] F59: summary line in the F59a format (planner example exact); one row per week with dates, block and week in block, Deload/Taper/Test markers, and day kinds; current week tagged; preview before Build and "Changed" tags on rebuild preview; test chips open Add testing day with existing rules; another team's events never appear.
- [ ] F59g: the "ended" banner shows from the day after the end date, never for rolling programs; Build the next one pre-fills; Not now is device-only.

**Part B**
- [ ] F60: racks, equipment, athletes per session, session length (same value as Week setup); math line rounds up; suggestion and reason strings exactly as spec B2, Express line under 30 min; coach can pick any style and the suggestion never overrides it; D-068.3 lines for out-of-range rack rotation; "none yet" line and build toast when groups are created; athletes per session not saved.

**Part D**
- [ ] F61–F62: block headers in the §3a formats (coach and athlete); summary lines in order with leave-out rules; cue and week note under every generated row (coach 13 pt; athlete cue 16 pt `ink`); notes edit makes the session the coach's; cooldown row (coach) and card (athlete) at the end of every generated weight-room session, not on home/mobility; Finish never gated.
- [ ] F62e: repo search shows no `SessionSummary` or `CoachingNote` import under `src/app/board/` or the effort board; board screenshots during a rotation and a cooldown show no cue, note, %, load, or level.

**All**
- [ ] Targets ≥ 44 pt (Build, Done 56 pt); every marker, tag, and state is text; no warning or error color on any building choice (F45).
- [ ] With `plannerV3 = false`, none of F57–F62 render.

---

## Flags
| To | Item |
|---|---|
| **Product (01)** | (1) F58d: the suggested end date is the **Sunday before** the first match's week (matches the planner example: ends Jan 24 for a Jan 26 match). Confirm, or use the match date. (2) F58b: how a short last week (end date not on a week boundary) is planned. (3) F58c default end type [UX proposal]. (4) F60d: rack groups are created **on Build**, not when Rack rotation is tapped, so trying styles has no side effects. Confirm this meets B3. (5) F59g: what athletes see after the end date [UX proposal]; and Not now stored on the device (no server field). (6) F62d: cooldown rows log no sets; Done is device-only (no new field), never counted toward sets, PRs, or points. (7) F57b: "Time of year" chips hidden when the calendar has season dates, kept as a fallback phase when it doesn't. (8) **F64 (Part E):** "the coach's Today" is built as the Team screen card plus a status line on TeamHome (the coach has no Today tab); confirm. Also confirm **Shuffle** = balanced mix from scratch for today (ignoring fewest moves), and the F64j "another device" behavior. (9) **F63 (founder request): schedule rack rotation controls on the coach board.** UI only, same clock row, no new field. Fits 2.4.2 Part C as a small add, or 2.4.3. Confirm the Ready check ("Show positions") [UX proposal]. |
| **Training (02)** | (1) F62a/F62b: cues, week notes, and "what changed" follow the athlete's **resolved** exercise (cue from `INTENT_CUES` by resolved id, else `ROLE_CUES`); confirm. (2) F59a: the tail sentences for Testing day, Break, and spans-phases summary lines (only the Season starts one is in the planner). (3) F58c end-type lines. |
| **Legal (07)** | **F64:** no presence data leaves the coach's device; "Not here today" appears only on the coach's own roll call screen; the board's Start prompt never opens roll call or level chips (F63c-2). Confirm. Claim check on the new UX strings: F58c end-type lines, F59a summary tails, F60c card lines and F60d info lines, the F59g athlete line. The planner's own strings (cues, week notes, reasons, cooldown items) are in your D2 review already. No new data: athletes per session and the plan timeline aren't stored; "Not now" is device-only. |
| **Coordinator** | Hand this doc to `docs/design/user-flows-planner-v3.md` (spec Step 0.4). Repo checked 11/19: `~/Projects/approach`, `main` at `1a9a437`, 2.4.1 deployed and tagged, `docs/design/` doesn't have this doc yet. I didn't write into `docs/` (that's the hand-off step). |
