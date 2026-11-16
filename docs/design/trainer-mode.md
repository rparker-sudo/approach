# Trainer Mode: Screens and Strings (2.3.0)
Owner: UX/UI Design (03) · v1.0 · Sun Nov 15, 2026
Source of truth: Approach project → `design/trainer-mode.md`. Answers **T-A3** (Phase A screens) and **T-B5** (Phase B screens, compact, **no AI screens**) in `product/specs/trainer-mode.md` v0.3.
Built from:
- spec v0.3 (A1–A6, B1–B9, B11)
- `legal/compliance-v2.1.md` § Trainer mode (T1–T5)
- `content/adult-training-rules.md` and `content/programs/adult-goals.md`
- `content/general-library.md` (incl. §2 equipment)
- `design/user-flows.md` v3.2 and `design/design-system.md` v1.1. Everything there still applies unless a flow here says otherwise.
- Repo read 11/15 at 2.2.1 (`e9a9f86`) for the string list.

**Conventions:**
- Flows continue the numbering in `user-flows.md`: **F31–F44**.
- "General team" = `teams.kind = 'general'`. Wording below is the **general-team** wording; the string list (§S) maps it to the volleyball wording.
- **Block** = red `errorText` line, and the action is disabled. **Warning** = amber `warningText` line, and the action stays enabled. In general teams the adult rules turn several youth **blocks** into **warnings** (adult rules §5); the hard rules A1–A9 still **block**.
- Quoted copy marked **(Legal)** is Legal's wording and is not to be edited. Everything else is UX placeholder wording that Branding may refine; the meaning must stay.

**Not in this doc:** any AI screen (2.3.1, TM-18); booking, payments, chat, weight-loss, or body-composition anything (spec Out of scope).

---

# PHASE A (T-A3)

## F31. Create a team: type picker and trainer confirmations
**Entry:** Team tab → **Create team** (coach accounts; F1 sign-up role card now reads "I'm a coach or trainer," §S).

**Step 1, type** (two OptionCards, nothing preselected):

| Card | Title | Line |
|---|---|---|
| A | **Volleyball team** | "Athletes 13+, parent consent for minors, volleyball programs." |
| B | **Training clients (adults 18+)** | "Your own clients: 1-on-1 programs, small groups, and clients who train alone." |

- **Next** is enabled once a card is chosen.
- Volleyball continues to the existing create flow, unchanged.
- **Under 18 account:** coach accounts are already 18+ (F1), so no extra state.

**Step 2, name:** field "Team name" (placeholder "My clients").
- Helper text: "Only you and your clients see this."
- Max 40 characters.

**Step 3, confirmations (Legal T2):** three **separate, unticked** checkboxes, each a full-width row (48 pt target):
1. "I've read and accept the **Trainer Terms** (Terms §4T)." The **Trainer Terms** link opens the Terms at §4T in the browser.
2. "My clients are adults (18+), and I'm responsible for the programs I give them, including screening clients before they train." **(Legal)**
3. "I won't put the Approach Strength name on anything my gym prints, posts, or shares." **(Legal)**

- **Create team** (56 pt) is enabled only when all three are ticked.
- No "tick all" shortcut.

**States:**
- **Loading:** "Creating…" with the button disabled.
- **Error:** "Couldn't create the team. Check your connection and try again." Ticks are kept.
- **Success:** the new team's **Clients** screen (F37), with the not-open banner (F32a).

**Terms version changes (Legal T2):** if `trainer_terms_version` is behind, the builder's **Post** and the Clients screen show a **blocking banner**:
- "The Trainer Terms changed. Review and accept them to keep posting programs."
- **Review** opens a sheet with the link and checkbox 1 only, then **Accept**.
- Clients keep training meanwhile.

**Can't change type later:** Team settings show "Type: Training clients (adults 18+)" as read-only text, with no edit control (Legal T4).

## F32. Team not open yet (TM-19 gate)
States are driven by `teams.trainer_verified_at` (set only by Ryan).

### F32a. Trainer, before verification
- **Clients screen:** a full-width banner (info style, `Note`) above everything:
  - H3 "Your team isn't open yet"
  - Body: "Your team opens once Ryan confirms your details by email." **(Legal)**
  - A secondary line: "Email ryan@approachstrength.com with your certification (name and issuing body), your professional liability insurance (insurer and expiry date), and that you train clients through your own business."
  - Link **Email Ryan** (`mailto:`, 44 pt).
- **Invite screen:** the code and QR are shown **dimmed**, with the line "Clients can't join until your team is open." The **Share** button is disabled.
- **Building programs is allowed** (she can prepare). **Post** is disabled, with the line "You can post once your team is open."
- **No in-app upload or form** for her details. Nothing about certification or insurance is stored (Legal T3.5).

### F32b. Trainer, the first time after verification
- One-time toast and banner: "Your team is open. Share your code with clients."
- The banner has a **Share code** button. It's dismissible.

### F32c. Trainer, lapsed (verification cleared, Legal T3.6)
Blocking banner (warning style) on the Clients screen and in the builder:
- H3 "Your team is paused"
- Body: "New clients can't join, and you can't post new programs. Email Ryan to renew your details."
- **Email Ryan** link.
- Existing clients keep training and keep their history. They see no change.

### F32d. Client entering the code
| Situation | What the client sees (on the join screen, under the code field, `errorText`) |
|---|---|
| Team not open, or paused | "This trainer's team isn't open yet." **(Legal)** |
| Client is under 18 | "This team is for adults 18 and older." **(Legal)** |
| Wrong code | "That code didn't match a team. Check it with your trainer." |

The code stays in the field.

## F33. Client joins a general team
**Entry:** Create account (F1, age question first) → role card "I'm an athlete or client" → account → **Join with a code**.

**Steps after a successful join (general team):**
1. **Name:** "What should your trainer call you?" (first name + last initial suggested).
2. **Level:** self-report, with the three level cards and Training's text. Muted line: "Your trainer confirms this."
3. **"Your choices" (adult, trainer version, Legal T5).** This differs from F8:

| Row | Default | Line |
|---|---|---|
| Check-ins | **Off** | "Log sleep, soreness, energy, and pain (yes/no)." |
| Share my check-ins with my trainer | **Off**, disabled until Check-ins is on | "Your trainer will see your sleep, soreness, energy, and whether you reported pain. Other clients never will." **(Legal)** |
| Class board | On | "Your name and progress can appear on your class board when your trainer uses one." |

There are no Attendance & hours or Testing days rows in general teams.

**Skipped in general teams:** position, volleyball week, lift days (the trainer posts the plan), body weight, Fuel.

**States:**
- **Join loading:** "Joining…"
- **Success:** Today shows "Your trainer hasn't posted a program yet. It shows up here as soon as they do."

## F34. What general teams hide (A3)
Hidden for the trainer and every client of a general team. "Hidden" means not rendered: no disabled stubs, no "not available" labels.

| Area | Hidden in general teams | Shown instead |
|---|---|---|
| Onboarding (client) | Position, volleyball week, lift days, body weight | F33 steps |
| Tabs | **Fuel** tab | Tabs: Today · Plan · Progress (client); Clients · Program · Calendar (trainer) |
| Today | Practice/match/tournament events, "I was there," Fuel card, testing session | Program label (F42) |
| Calendar → Add | Practice, Match, Tournament, Testing day | **Session** · **Break** (F16) |
| Progress | Approach touch, "Above the net," jump tests, Jump gains, estimated strength | Sessions, streak, PRs (private), history |
| Team settings | Parent consent, consent tracker, Print form, testing, attendance/practice length, position groups | Groups (F35), gym equipment (F40), board color, effort board toggle |
| Builder | Volleyball generator, "Recommend for me" (volleyball), match-week logic | F39 |
| Exercise picker | `scope: 'volleyball'` exercises (T-A1) | Library + general library. "Why" text uses `whyGeneral` |
| Effort board | **Off by default.** Attendance and Jump gains tabs never appear | If turned on: Overall, Sessions, Extra recovery, Consistency, Streak, Hours |
| Coach board | Testing-day mode, jump chips | Same live board, titled **"Class board"** |

**States:** none of its own. A general team never shows an empty volleyball section.

## F35. Groups (free-named)
Clients screen → **Groups** section (collapsible, below the client list).

**Create group:**
- Sheet with a "Group name" field.
- Placeholder "Mon/Wed 6am class."
- Helper text: "Use a class time or first name. Don't include health details." **(Legal)**
- Max 30 characters. Then **Create**.

**Add clients:**
- A checklist of clients, then **Save**.
- A client can be in **one group per team**. If a ticked client is already in another group, their row reads "In Tue/Thu noon class. Saving moves them here." **(warning)**

**Group row:**
- Name · client count · "Program: Strength · week 3 of 8" or "No program."
- Overflow menu: Rename · Edit clients · Delete.
- **Delete** asks to confirm: "Delete Mon/Wed 6am class? Clients stay on your team. A program posted to this group stops for them."

**Who sees group names:** members of that group only (Legal T4). Clients never see other groups.

**States:**
- **Empty:** "No groups yet. Groups help you post one program to a class."
- **Error:** "Couldn't save the group. Try again."

## F36. Post a program: whole team, group, or one client (A4)
In the builder (F39) → **Post** (56 pt) → bottom sheet **"Who gets this program?"**

**Step 1, target** (radio cards):
- **All my clients**
- **A group:** a picker of groups
- **One client:** a searchable picker of clients

**Step 2, start date:** a date picker, defaulting to next Monday.

**Step 3, checks.** Shown live, per affected client, from adult rules §4:

| Check | Line | Type |
|---|---|---|
| Fits the weekly cap | "Fits everyone's weekly limit." | ✓ (muted) |
| Combined over the cap | "Alex already has 3 sessions a week from Mon/Wed 6am class. This program adds 2 (total 5, max 4 for Alex's level)." with **Change days** | **Block** for that client. Post is disabled until it's fixed or that client is removed |
| No rest day in the combined week | "Alex would train 7 days in a row. Keep at least one day off." | **Block** |
| Two leg-heavy days back to back (combined) | "Alex has leg-heavy sessions Tue and Wed. Try an upper-body or full-body session here." | Warning |
| Replaces an active program for the same target | "This replaces Strength · week 3 of 8 for Alex." | Warning |

- When there are several affected clients, the list groups lines by client, and blocks come first.
- **Post** confirms: "Posted. Alex has the new program." (for a group: "Mon/Wed 6am class has the new program.")

**Who sees what (Legal T4):** a client sees only programs targeted to **them**, their group, or all clients. Never another client's program or its title.

**States:**
- **Team not open / paused:** Post is disabled with the F32 line.
- **Terms out of date:** blocked by the F31 banner.
- **Error:** "Couldn't post. Your program is saved as a draft."

---

# PHASE B (T-B5, compact, no AI)

## F37. Clients dashboard (trainer home, B6)
The Clients tab replaces Team/Roster in general teams.

**Header:**
- Team name.
- Not-open / paused banner when relevant (F32).
- **Invite** button.
- **Sort** segmented control: Name · Last session · Flags (default **Flags**).

**One row per client** (min 64 pt, the whole row taps to F38):
- **Line 1:** client name, plus the level chip (F24 style; "Level not confirmed" when self-reported).
- **Line 2 (muted):** "Strength · week 3 of 8 · 2 of 3 this week · last session Tue." With no program: "No program."
- **Check-in cell:**
  - "Checked in today" or "No check-in today," when the client shares check-ins.
  - "No check-in shared" otherwise, including clients with check-ins off. Legal T5: the trainer can't tell which.
- **Flags:** text chips, each with an icon. The text carries the meaning:

| Flag | Shown when | Style |
|---|---|---|
| "Pain reported today" | Shared check-in has pain = yes | Warning chip. Row line: "Check in with Alex in person." (G3) |
| "No session in 7 days" | No log for 7+ days while a program is active | Warning chip |
| "Program ends in 2 weeks" | 14 days before the last week | Muted chip |
| "Back after a break done" | "Back after a break" week 4 finished | Muted chip, with "Pick their next goal" |

**Never:** ranks, scores, percent bars comparing clients, or a "top clients" list. Sort orders are by name, date, or flags only.

**States:**
- **Loading:** 5 skeleton rows.
- **Empty (open team):** "No clients yet. Share your code to invite them." with **Invite**.
- **Error:** "Couldn't load your clients. Pull to refresh."

## F38. Client detail (trainer)
Sections, top to bottom:
1. **Name and level** (Set level sheet, F24b).
2. **Program:** goal, week, dates; **Open in builder**; **Duplicate to another client** (F39d).
3. **This week:** sessions done, moved, or missed.
4. **Recent sessions:** list; tap → a log with sets, reps, weights, notes, and cardio minutes.
5. **PRs:** private to trainer and client.
6. **Adjustments:** "3 exercises adjusted to level," expandable (F13).
7. **Check-ins:** only if shared. Last 14 days as text rows: sleep, soreness, energy, and "Pain: yes/no." No chart, no score.

**States:**
- **Empty logs:** "No sessions logged yet."
- **Sharing turned off:** past check-ins disappear (Legal T5). The section reads "No check-in shared."

## F39. Program builder for general teams (B2–B5)
This extends F19. Where it's silent, F19 and F26 behavior holds.

### F39a. New program (sheet)
1. **Start from:** Blank · A template (list) · Copy a client's program.
2. **Goal:** four OptionCards, each with Training's "who it's for" line (`adult-goals.md` §1).
   - **Back after a break** shows its full line, including "Clients returning from an injury or medical condition should be cleared by a qualified professional first."
   - No other goals exist.
3. **Length:** stepper, 1–16 weeks.
4. **Sessions per week:** stepper, 1–6, with the goal's suggestion shown ("Suggested: 3").
5. **Name:** prefilled ("Strength · 8 weeks"), editable.

**Create** opens the builder. The target is chosen at Post (F36).

### F39b. Week view
- **Week strip** across the top: "W1 W2 W3 W4 …" chips (44 pt).
  - A deload week carries a "Deload" label. A "Back after a break" ramp week carries "Ramp."
  - The selected week is outlined.
- **Day columns** (as F19b), without the volleyball event row. A **Break** band shows if the trainer added one.
- **Per-week effort row** under the strip:
  - "Week 3 effort: RPE 8 (main and secondary)," with a stepper capped at 8.
  - Defaults come from the 4-week wave (`adult-goals.md` §4).
  - Typing 9 or 10 → **block**: "Strength work stays at RPE 8 or below. Stop with about 2 reps left." (adult rules A1)
- **Copy controls** (session overflow menu): **Copy to other days…** (day checklist) · **Copy this week forward…** (week checklist).
- **Deload:**
  - A toggle on any week: "Make week 4 a deload (fewer sets, same rest)."
  - Programs of 7+ weeks with none → **warning** under the strip: "No deload in 7+ weeks. Most programs take one every 4–6 weeks."
- **Back after a break:**
  - Weeks 1–4 follow the ramp. Their effort row is fixed (RPE 6, 6, 6–7, 7) with the line "Set by the Back after a break ramp."
  - After week 4, the client's row gets the F37 flag. There's no automatic switch.
- **Weekly checks** (single program; F36 checks the combined total at Post):
  - Over the sessions-per-week cap for the lowest level among targets → **block**.
  - No day off → **block**.
  - Back-to-back leg-heavy days → **warning**.

### F39c. Session editor (general teams)
Same as F19c, plus:
- **Effort field:**
  - "RPE 9," "RPE 10," "failure," "to failure," "max," "AMRAP," "for time" in tier A/B rows → **block** (adult rules A1, A3). One line: "Strength work stays at RPE 8 or below. Stop with about 2 reps left."
  - Power slots keep "Max effort."
- **Youth rules become warnings** (adult rules §5), same lines as F19c/F27/F28, in amber:
  - Power or heavy lift in a circuit or station
  - Contrast pair
  - Power or tier A later in the session
- **Cardio rows:** F41.
- **Exercise picker:** only exercises that fit the **gym equipment profile** (F40). Below the list: "Missing something? Add equipment in Gym equipment." (link).
- **Warm-up:** a "General warm-up" row at the top, default on, W1–W3 picker.
- **Session estimate target:** 45–60 min for gym sessions, 30 for home (editable).

### F39d. Templates and duplicates
- **Save as template:** builder overflow menu → "Save as template." Name field, then Save. Templates are private to the trainer.
  - Line: "Templates keep the plan only, never a client's logs." **(Legal T4)**
- **Templates list:** Program tab → Templates. Each row: name · goal · weeks · "Use."
- **Duplicate to another client** (F38): pick a client → the builder opens a **copy** with the banner "Copy for Sam. Changes here don't affect Alex's program."
- **Per-client edits** never change the template. When a program came from a template, the builder shows "From template: Strength 8-week" (muted).

### F39e. Program end
- 14 days before the last week: the F37 flag, plus the builder banner "Alex's program ends Dec 12."
- The banner has **Extend** (adds weeks, copying the last wave) and **New program** (F39a, prefilled).

## F40. Gym equipment profile (B4)
Team settings → **Gym equipment**.
- Checklist grouped: **Free weights** · **Racks and benches** · **Cables and bands** · **Machines** · **Cardio**.
  - Uses the existing 10 items plus the 13 in `general-library.md` §2.
  - `cable` is labeled "Cable station."
  - Rows are 48 pt.
- Top line: "Programs only use what you tick. Clients' home equipment stays on their phones."
- **Save.** Then the toast "Gym equipment saved. New and edited sessions use it."
- **Removing an item** that existing sessions use → **warning** before save: "6 sessions use the leg press. They'll switch to the closest exercise for each client."

**States:**
- **Empty (first open):** nothing ticked, and a **Save** that's disabled until at least one item is ticked.
- **Error:** "Couldn't save. Try again."

## F41. Cardio blocks (duration only, adult rules §6)
**Builder row:**
- Exercise name · **Minutes** (stepper 5–60) · **Effort** segmented control **Easy · Moderate**, with the talk-test line under the selection:
  - Easy: "You can hold a full conversation."
  - Moderate: "You can talk in short sentences, but not sing."
- No sets, reps, weight, heart rate, pace, distance, or calories fields exist.
- Over 60 min of cardio in a session → **block**: "Keep cardio to 60 minutes or less per session."
- In a "Back after a break" program, Moderate is disabled and minutes cap at 15. Line: "Easy only, up to 15 min, while easing back."

**Client workout view:**
- Card "Bike · 10 min · Easy" with the talk-test line.
- A **minutes done** field (prefilled, numeric, 56 pt) and a **Done** button (56 pt).
- An optional **Start timer** counts up (local, nothing stored but minutes).

**Log** stores minutes only.

## F42. Client Today and workout (B7)
- **Session card header:** "Strength · week 3" (goal · week), the session name, "about 50 min."
  - A deload week adds the muted line "Lighter week: fewer sets."
- **Group label** when posted to a group: "Mon/Wed 6am class" (muted).
- **Pain = yes:** F14 card, client wording (§S).
- **Workout note field:** placeholder "Note for your trainer (optional)." Helper text under it, always visible: "Your trainer sees your notes. Don't include health or injury details." **(Legal T5)**
- **Home sessions:** as F21.
- **No program:** "Your trainer hasn't posted a program yet. It shows up here as soon as they do."

## F43. Client Settings (Legal T5)
- **Privacy → Your choices:** the F33 rows. Turning **Check-ins** off also turns sharing off.
  - Turning **sharing** off asks to confirm: "Stop sharing? Your trainer won't see any of your check-ins, including past ones."
- **Your data → Delete my check-ins** (destructive button):
  - Dialog: "Delete all your check-ins? This can't be undone."
  - Type DELETE to confirm (F5 pattern).
  - **Success:** "Check-ins deleted."
  - **Error:** "Couldn't delete your check-ins. Try again."
- **Program:** "Your level with My clients: Intermediate (set by your trainer)."

## F44. Small-group classes (B8)
- Racks, stations, circuits, supersets, and the live board work as built.
- The board is titled **"Class board"** and shows board-safe data only (design system §9).
- Each client still gets their own level's version (G8). The board shows only the resolved name.
- The effort board stays off unless the trainer turns it on in Team settings.

---

# §S. Trainer/Client string list (B1)

### S0. How it works (for Claude Code)
1. Add a `terms(teamKind)` helper returning a word set. **Every** user-facing string listed in S1 reads from it.
   - `teamKind` comes from the **team currently in view**.
   - On screens with no team in view, use the neutral wording (S2).
2. **Volleyball teams keep today's strings exactly.** The volleyball column is the 2.2.1 text, so the volleyball acceptance checks re-run unchanged.
3. Strings tied to features that general teams hide (S3) aren't translated. They never render there.
4. **Check:** render every general-team screen in a test and search the output for `coach|athlete|roster|teammate|volleyball|parent|consent` (case-insensitive). Allowed hits: "Approach Strength" legal links and S2 neutral strings. Product adds this to B11.

### S1. Word set
| Key | Volleyball (as built) | General team |
|---|---|---|
| `leader` | coach / Coach | trainer / Trainer |
| `leaders` | coaches | trainers |
| `member` | athlete / Athlete | client / Client |
| `members` | athletes / Athletes | clients / Clients |
| `peers` | teammates / Teammates | other clients / Other clients |
| `group` (the team itself) | team | clients (e.g., "your clients") |
| `roster` | Roster | Clients |
| `teamTab` | Team | Clients |
| `board` | coach board | class board |
| `subgroup` | group (position group) | group |
| `codeOwner` | "your coach" | "your trainer" |

### S1b. Full strings that change (general-team versions)
| Where | Volleyball (2.2.1) | General team |
|---|---|---|
| Team tab | Team | Clients |
| Roster empty | "No athletes yet. Share the team code to invite them." | "No clients yet. Share your code to invite them." |
| Invite button | "Invite athletes" | "Invite clients" |
| Join (client) | "Your coach has a 6-character code for your team." | "Your trainer has a 6-character code." |
| Join, after | "Once you join, the team workout becomes your plan." | "Once you join, your trainer's program becomes your plan." |
| Account step | "Make an account to join your team. Your coach posts the workouts and sees what you log." | "Make an account to join your trainer. Your trainer posts your program and sees what you log." |
| Today, no program | "Your coach hasn't posted a workout yet. It shows up here as soon as they do." | "Your trainer hasn't posted a program yet. It shows up here as soon as they do." |
| Today, lightened | "Coach lightened today's lift. Same exercises, fewer sets, easy effort." | "Your trainer lightened today's session. Same exercises, fewer sets, easy effort." |
| Exercise note label | "Coach: {note}" | "Trainer: {note}" |
| Workout saved | "Sent to your coach." / "Sending to your coach…" | "Sent to your trainer." / "Sending to your trainer…" |
| Workout note helper | "Your coach can see this workout." | "Your trainer sees your notes. Don't include health or injury details." **(Legal)** |
| Check-in footer | "Your coach sees your check-ins. Teammates never do." | "Your trainer sees your check-ins if you share them. Other clients never do." |
| Your choices row | "Share check-ins with my coach" | "Share my check-ins with my trainer" **(Legal row text, F33)** |
| Pain card (G3) | "…Talk to your coach, parent, or athletic trainer before you lift today." | "Don't train through pain. Talk to your trainer or a health professional before you train today." → **Legal confirm** (G3 was approved for athletes) |
| Pain, trainer roster | "Check in with {first} in person." | Same |
| Head-injury line (G4) | "…tell your coach (and a parent or guardian if you're under 18). Follow your school's or club's concussion protocol…" | "If you hit your head or have any signs of a concussion, stop training and tell your trainer. Only a licensed health care provider can clear you to return." → **Legal confirm** |
| Level line | "Your level on {team}: {level} (set by your coach)" | "Your level with {team}: {level} (set by your trainer)" |
| Level lock | "Only your coach can change your level." | "Only your trainer can change your level." |
| Your version sheet | "Your coach's plan is for the whole team. Approach Strength gives you the version that fits your level on {team}…" | "Your trainer's plan may be for a group. Approach Strength gives you the version that fits your level…" |
| Level sheet line | "Athletes under 18 need intermediate or advanced, set by you, for strength checks." | *(removed: no testing)* "Sets which version of each exercise {name} gets." |
| Racks setup | "Athletes per rack" · "Athletes see their rack on the Lift screen." · "Tap an athlete, then a rack, to move them." | "Clients per rack" · "Clients see their rack on Today." · "Tap a client, then a rack, to move them." |
| Racks, leftover | "Other athletes" | "Other clients" |
| Post toast | "Posted. Your athletes have the latest plan." | "Posted. {target} has the new program." (F36) |
| Builder helper | "Post to send it to your athletes." · "Athletes get new workouts, days and calendar dates after you post." | "Post to send it to your clients." · "Clients get the new program after you post." |
| Readiness | "Several athletes are run down. Consider a lighter workout today. It's your call." | "Several clients in this class are run down. Consider a lighter session today. It's your call." |
| Board entry | "Open coach board" | "Open class board" |
| Board empty | "No athletes to show yet. Athletes appear once their board permission is on." | "No clients to show yet. Clients appear once they allow the class board." |
| Board signature | "Powered by Approach Strength" | Same (in-app only; the no-co-branding rule covers the gym's own materials) |
| Effort board off | "The effort board is off for athletes. Turn it on under Team → Boards and testing." | "The effort board is off. Turn it on under Clients → Settings → Boards." |
| Board privacy | "You're not shown to teammates on boards." | "You're not shown to other clients on boards." |
| Mode switch | "Switch to coach mode" / "Switch to athlete mode" | "Switch to trainer mode" / "Switch to client mode" |
| Not-the-owner errors | "Only the team coach can do that." · "Only the team coach can set levels." | "Only the trainer can do that." · "Only the trainer can set levels." |
| Effort clamp | "For athletes under 18, strength work stays at RPE 8 or below. Stop with about 2 reps left." | "Strength work stays at RPE 8 or below. Stop with about 2 reps left." (adult rules A1) |
| Circuit clamp | "For athletes under 18, strength work in a circuit keeps its reps. No racing the clock." | "Strength work in a circuit keeps its reps. No racing the clock." (adult rules A3) |
| Library "why" text | volleyball `why` | `whyGeneral` where it exists (`general-library.md` §5) |

### S2. Neutral strings (no team in view: sign-up, account, Settings → Account)
| Where | Today | New (all users) |
|---|---|---|
| F1 role card | "I'm a coach" | "I'm a coach or trainer" |
| F1 role card | "I'm an athlete" | "I'm an athlete or client" |
| Coach-age caption | "Coach accounts are for adults 18 and older." | "Coach and trainer accounts are for adults 18 and older." |
| Account title | "Coach account" / "Athlete account" | Keep, until a team is created or joined. Then the team's wording |
| Create team (no teams yet) | "Teams need a coach account so athletes can join and get your workouts on their phones." | "Create a team for your athletes or clients. They join with your code." |
| Delete account, coach body | "Your teams and every athlete's logs for those teams are deleted too." | "Your teams and every member's logs for those teams are deleted too." |
| Share message | "Join {team} on Approach Strength (Coach {name})." | Uses the team's word: "(Trainer {name})" for general teams |

### S3. Not translated (hidden in general teams, F34)
These never render in general teams, so they keep volleyball wording only:
- **Parent consent:** every string (F2, F3, F7), "Print parent consent form," consent tracker
- **Testing days:** banner, checklist, strength checks, "Strength checks are for…" lines, "Not eligible for testing today"
- **Volleyball schedule:** practice, match, and tournament text; "I was there"; attendance
- **Progress:** "Above the net," touch, Jump gains
- **Fuel:** tab and cards
- **Positions:** position groups, "Made Hitters, Middles, Setters…"
- **Volleyball builder:** generator, "Recommend for me," match-week lines
- **Coach Terms:** "I agree to the Coach Terms (Terms §4)" (general teams use §4T, F31)

### S4. New strings (general teams only)
F31–F44 contain all of them. The Legal-owned ones are marked **(Legal)** there and must match `legal/soft-launch-notice.md` §4T and Privacy A2 word for word.

---

## Accessibility and sizes
- Everything follows design system §13.2: 44 pt targets, 56 pt in-workout actions.
- Blocks and warnings are text plus color, never color alone.
- Client rows (F37) are one target each. Flag chips inside them aren't separate targets.

## Acceptance (UX sign-off, for `reports/v2.3.0-acceptance.md`)
- [ ] F31: type picker; three separate unticked confirmations; Create disabled until all are ticked; type read-only afterward.
- [ ] F32: the not-open, open, and paused states for the trainer; dimmed code; Post disabled while not open or paused; the client join error lines per F32d.
- [ ] F33: general-team "Your choices" has check-ins and sharing **off** by default, with sharing disabled until check-ins are on.
- [ ] F34: nothing in the "Hidden" column renders in a general team (screen pass of every tab).
- [ ] F35–F36: groups with Legal's helper text; post to all, group, or one client; the combined-cap message blocks over-cap posts.
- [ ] F37: no ranking anywhere; "No check-in shared" for both off states; flags are text.
- [ ] F39–F41: four goals only, with the clearance line on Back after a break; RPE above 8 blocked; cardio has minutes + Easy/Moderate only.
- [ ] §S: the string search in S0.4 passes on every general-team screen; volleyball strings unchanged (diff against 2.2.1).

## Flags
| To | Item |
|---|---|
| **Legal (07)** | Confirm the general-team **G3 pain** and **G4 head-injury** variants in §S1b. The approved versions mention parents, school protocol, and athletic trainers. Confirm the F32a secondary line asking for insurer and expiry date in the email. |
| **Product (01)** | (1) Add the §S0.4 string search and the F36 combined-cap block to B11. (2) F32a lets an unverified trainer **build** but not **post**; confirm. (3) F33 shows "Class board" as **on** by default for adult clients, as F8 does; confirm, given the effort board is off by default. (4) F40's "switch to the closest exercise" when equipment is removed: confirm, or make it a block. |
| **Training (02)** | Confirm F39b's "lowest level among targets" for the weekly cap on group programs, and F41's Back after a break cardio limits (Easy, ≤ 15 min, from adult rules §6). |
| **Branding (04)** | Review the §S wording for voice. "Class board" and "Clients" are UX choices. |
| **Market Research (06)** | Ask in the intake whether "Clients," "Groups," and "Class board" match her words. |
