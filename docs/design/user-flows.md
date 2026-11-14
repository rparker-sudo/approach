# User Flows: v2.1 soft launch + v2.2
Owner: UX/UI Design (03) · Draft v2.0 · Tue Nov 10, 2026
Source of truth: Approach project → `design/user-flows.md`. Covers only what v2.1 and v2.2 change; the v2.0 flows stay as built. Use the existing components in `src/components/ui.tsx` and the tokens in `src/lib/brand-tokens.json` (`design/design-system.md` is still to come). Core actions stay at 3 taps or fewer.

> **Changes in v2.0 (11/10, for `product/specs/v2.2.md` passes 1–2):**
> - **F9** rewritten as the live, in-session board (D-025), with testing-day mode (D-021), arrange by rack (D-026), Season view (P3.8), and board color (D-023).
> - **F10** rewritten: Overall tab and points line (D-024, TM-4), Jump gains in inches (FA-4), accent row, break weeks, two teams (D-027).
> - **New:** F13 "Your version" line (G8), F14 pain and head-injury messages (G3, G4), F15 multiple teams and the combined schedule (TM-2), F16 coach break weeks and easing back in (TM-3, G9), F17 rack setup (coach), F18 rack card on Today (athlete).
> - Items marked **[UX proposal]** fill gaps the specs don't cover. Product confirms or cuts them.
> - **Pass 3:** F19 program builder redesign (home days, supersets, rest floors, effort clamp), F20 home equipment, F21 Today on home days, F22 A1/A2 workout view, F23 board with home days and supersets.

---

## F1. Onboarding with the age gate
```
Lockup / welcome
  → [NEW] "When were you born?"  (month + year pickers, both empty; Next disabled until both set)
      ├─ under 13 → Not-eligible screen (no Back into the flow; reload shows it again)
      └─ 13+ → Role ("I'm an athlete" / "I'm a coach")
               ├─ coach & under 18 → coach card disabled, caption "Coach accounts are for adults 18 and older."
               └─ → Account step (existing) + [NEW] "By creating an account you agree to the Terms and Privacy Notice" (links)
                    → Join team → Name/Position/Level/Week/Weight (existing)
```
- **Not-eligible screen:** Lockup, H1 "Sorry, you're not eligible to use Approach right now.", no other actions. Neutral tone; don't mention age.
- **States:** pickers empty (Next disabled) → filled (Next enabled). No error state.
- **Existing v2.0 users with no birth year:** the same age screen appears once on launch, as a full-screen step before the tabs.

## F2. Minor athlete waiting for consent
Lift tab after joining a team while `pending`:
- **Banner** at the top (warning color, not an error): "Waiting for your parent's consent form. Your coach needs it before you can log. Ask your coach for the form." Secondary link: "See the form" (opens `consent.html`).
- Today's workout shows normally, but **Start workout** is replaced by a disabled button "Logging unlocks after consent."
- The check-in card is hidden.
- Exercise how-to, Plan, calendar, and Fuel work normally.
- Settings → Your data shows "Parent consent: waiting."

`training_only`: workouts unlocked; the check-in card is hidden; Settings shows "Parent consent: training only."

## F3. Coach records consent
Team screen → Roster:
- Each minor row shows a chip: **Consent needed** (warning) · **Training only** · **Full** (muted). Adults show nothing.
- Readiness snapshot counts only athletes with full consent: "4 of 6 checked in · 2 without check-in consent."
- Tap a row with **Consent needed** → bottom sheet:
  - H2 "Record parent consent for Jordan"
  - Option cards: "Training only (no check-ins)" / "Training and check-ins shared with me"
  - Checkbox, unchecked: "I have a signed parent consent form for Jordan."
  - Primary button "Save" (disabled until an option and the checkbox are set)
  - Link: "Print the consent form"
- Tap a recorded chip → same sheet with "Change" and a ghost button "Clear consent" (back to pending; confirm dialog).
- Team screen also gets "Print parent consent form" near the QR invite.

## F4. Check-in changes
- Pain question stays (No / Yes). The "Where?" field is gone. Under it, muted text: "Tell your coach, parent, or athletic trainer in person about any pain."
- **First open:** one-time note above the scales: "Your coach sees your check-ins. Teammates never do." with "Got it." Afterward the same sentence is a 12-pt muted footer.
- v2.2: what happens after pain = Yes is in **F14**.

## F5. Delete my account
Settings → Account → ghost/destructive button **Delete my account** →
- Dialog H2 "Delete your account?"
  - Athlete body: "This deletes your account, your team memberships, logged workouts, and check-ins. Data on this phone is erased too. This can't be undone."
  - Coach body adds: "Your teams and every athlete's logs for those teams are deleted too."
  - **v2.2 (C12):** both bodies add a muted line: "We keep a short record of parent consent and coach supervision for 5 years, with no workout, check-in, or test results, as our Privacy Notice explains."
- Field: "Type DELETE to confirm." Destructive button enabled only on an exact match.
- **Loading:** "Deleting…" with the button disabled. **Error:** "Couldn't delete your account. Check your connection and try again." **Success:** return to onboarding (the age screen).

## F6. Legal links
- Settings → new **Legal** section: Privacy Notice · Terms · Parent consent form (opens in a new tab or the system browser).
- Account step: the agreement line sits under the submit button in muted 13-pt text with underlined links.

## Accessibility
Chips and banners use text plus color (never color alone). Tap targets ≥ 44 pt. Destructive actions use the existing error color and require typed confirmation.

---

# Pass 2 flows (v2.1 pass 2)
Draft v1.0 · Mon Nov 9, 2026 · Spec: `docs/specs/v2.1-pass-2.md`. F7 replaces F3's two-option sheet once pass 2 ships.

## F7. Coach records consent (6 boxes)
Team → Roster → tap a minor → sheet **"Record parent consent for Jordan (form v2)"**:
- Checklist, all unchecked, each with a one-line description:
  - 1 Participation (required)
  - 2 Check-ins
  - 3 Share check-ins with me
  - 4 Team boards
  - 5 Attendance & hours
  - 6 Testing days
- Box 3 is disabled until box 2 is checked; boxes 2–6 are disabled until box 1 is checked.
- Confirm checkbox: "I have a signed parent consent form (version 2) for Jordan." **Save** is enabled only when box 1 and the confirm checkbox are checked.
- Roster chip summarizes: **Consent needed** · **Consent: 4 of 6** · **Consent: all**. If an athlete was recorded on form v1, show **"Form v2 needed for boards & testing"** (muted, not a warning).
- Consent tracker at the top of the roster: "Consent forms: 8 of 14 in · Print form."

## F8. Adult athlete: "Your choices"
Shown once after joining a team (and once for existing adult members). H1 "Your choices", one toggle per row (all **on** by default), each with one plain line:
- Check-ins: "Log sleep, soreness, energy, and pain (yes/no)."
- Share check-ins with my coach: "Your coach sees them. Teammates never do."
- Team boards: "Your name and effort can appear on team boards."
- Attendance & hours: "Count practices and matches toward your effort."
- Testing days: "Jump tests and coach-supervised strength checks."

Button "Save" (they can change these later in Settings → Privacy).

## F9. Coach board (`/board/[teamId]`): live view (v2.2 pass 2, D-025)
Replaces the v1.0 tile board. Spec: `v2.1-pass-2.md` v1.3 P3.2–P3.8 plus `v2.2.md` §2.1 and §2.3. Mockup: Design canvas "Coach Board Mockup" (artboards *Live board*, *Season view*).

**Entry:** Team → secondary button **Open coach board**. Directly under it, a muted 13-pt line: **"Use a personal device and network, not school-owned screens or Wi-Fi."** It opens in a new tab with a hint: "Press F11 for full screen."

**Canvas:** landscape 16:9, reference 1920 × 1080, background `#0B0B0C`. Type sizes below are at 1080p and scale with the viewport. Nothing important goes below 20 px, so the board can be read at about 6 m.

### F9a. Live view layout (top to bottom)
1. **Accent band:** 6 px across the top, in the team accent (F9c).
2. **Header (about 12% of height):**
   - Left: team name (48 px bold) · date and time (24 px) · today's session per group, e.g. "Hitters: Lower A · Setters: Upper B" (24 px muted).
   - Right: four stat blocks, each with a label (18 px muted) and a value (40 px tabular): **Sets today 163 / 244** · **Team done 6 / 16** · **Working now 7** · **PRs today 3**. They count only athletes on the board.
3. **Tile grid:** 6 columns. Order: resting and lifting first, then not started, then done. Minimum tile height is 150 px. **[UX proposal]** If the roster doesn't fit, the grid pages every 15 s, shown as a "1 / 2" dot indicator. Tiles never scroll.
4. **Live ticker (footer strip, about 9% of height):** the 5 newest moments, newest on the left, each with "now / 1m / 2m" in muted text. It fades in and doesn't scroll. Allowed: "[name] finished [session]," "[name] hit a PR on [exercise]" (no number), "[group]: 3 of 6 done," and group milestones at 50 / 75 / 100%. **Never** misses, skips, slow progress, or anyone not on the board.
5. A small "Powered by Approach" mark sits bottom-right (12 px muted).

**Tile anatomy** (top to bottom):
- Board name (32 px bold), group (18 px muted), and a **"PR"** badge when a best was hit today. The badge never shows a number.
- Exercise name (24 px). This is always the **resolved** exercise (G8) and never says "your version," because that would hint at level.
- "Set 3 of 4 · last set 5 reps" (20 px tabular).
- Progress bar in the accent color, with "Sets 9 / 16" (20 px tabular).
- Status pill, bottom-left (text always present):

| State | Border | Line 2 | Pill |
|---|---|---|---|
| Lifting | solid, neutral | current exercise + set line | "Lifting" (neutral fill) |
| Resting | solid, neutral | same | **"Rest 1:24"**, accent fill, counts down locally to `rest_ends_at`. At 0:00 it switches to "Lifting." |
| Not started | **dashed** | "Up first: Goblet Squat" | "Not started" (outline) |
| Done | **accent** | "Finished 3:31" | "Done" (accent fill) |

**Never on a tile:** weights, loads, RPE, lift test values, estimates, check-ins, pain, bodyweight, nutrition, or level.

### F9b. Arrange by rack (D-026, rack-groups R4)
- Control **"Arrange by rack"** (default on when racks exist). The grid becomes rack sections. Each section has a header **"Rack 2 · 3 athletes"** (24 px) above its tiles. Sections flow left to right and wrap.
- Empty racks are hidden. A rack whose athletes are all hidden or lack board consent shows only its header ("Rack 4"), with no tiles and no count.
- **[UX proposal]** Athletes on the board who aren't on a rack go in a final section, "Other athletes."
- The group filter gains rack choices ("Rack 2").
- Rack headers show the coach's rack name only. **Never** a level, a position label, or the method used.

### F9c. Board color (Team → Settings → **Board color**, D-023)
- **8 preset swatches** (each one passes 3:1 on `#0B0B0C`; "Done" pill text is `#0B0B0C` on all of them):

| Swatch | Hex | Contrast on board |
|---|---|---|
| Approach silver (default) | `#C9CDD2` | 12.3:1 |
| Blue | `#4DA3FF` | 7.5:1 |
| Green | `#3DDC84` | 11.0:1 |
| Gold | `#FFC53D` | 12.5:1 |
| Red | `#FF6B6B` | 7.1:1 |
| Purple | `#B78CFF` | 7.7:1 |
| Orange | `#FF9F43` | 9.6:1 |
| Teal | `#2EC4B6` | 9.1:1 |

- **Hex field:** "Custom: #______." Invalid entry shows the inline error "Enter a color like #1E5AA8."
- **Live preview** on a `#0B0B0C` panel: one Resting tile, one Done tile, and the goal bar.
- **Contrast fix:** when the color is lightened, the line **"Adjusted so it shows up on a projector"** appears next to the preview, with both swatches shown (yours → shown). The coach's original color is saved.
- **Reset to default** link. **Save** → toast "Board color saved."
- **Rule:** the accent is never used for body text and never carries status alone.
- **No logo upload** in v2.2.

### F9d. Testing-day mode (D-021, P3.6)
- The header's session line becomes "Testing day: Full battery." Stats become **Team done 6 / 16** · **Working now 7**. "Sets today" and "PRs today" are hidden.
- Each tile replaces the set lines with battery progress: "Jump tests 2 / 3," then "Strength check ✓." An athlete who skipped load tests shows only "Jump tests ✓." The board never says why.
- **Change chips** (20 px, accent outline) appear as each jump test is entered: "Touch +1.5 in" · "Broad +3 in" · "Throw +1 ft." A zero or negative change shows "Tested ✓." The board **never** shows raw values or a lift value. Chips appear only for athletes with `c_testing` **and** `c_boards`.

### F9e. Season view (P3.8)
Switch from the live view with the **Season view** control (and back with **Live view**).
- **Left half:** team goal, "Team total: 412 / 500 sessions," with a large accent progress bar, "88 to go," and "On pace to finish week of Feb 9." Under it, the **"How Overall points work"** legend: "Session 10 · Extra recovery 5 (up to 2 a week) · Full week 5."
- **Right half:** effort leaderboard, top 10, with tab chips (Overall by default). The top 3 rows are outlined in the accent color. Values use the same units as F10.
- If the coach turned the leaderboard off, the right half shows "Leaderboard off" plus the goal only.
- **Break weeks:** a muted line under the goal says "Break weeks don't count toward the goal."

### F9f. Who appears
- Only athletes with `c_boards` (minors) or boards on (adults), and not set to Hidden.
- **Two teams (D-027):** athletes following another team's lift program never appear on this team's live view.

### F9g. Controls
Top-right, fading after 3 s without mouse movement: **Group** filter (All / groups / racks) · **Arrange by rack** · **Season view** · **Exit**.

### F9h. States
| State | What shows |
|---|---|
| Loading | Header placeholders plus skeleton tiles |
| No session today | "Rest day. See you tomorrow." with a **Season view** button |
| Break day (F16) | "Break week. No team lifting today." with a **Season view** button |
| No one to show | "No athletes to show yet. Athletes appear once their board permission is on." |
| Offline | Banner "Reconnecting…" Tiles keep their last values and rest countdowns keep running locally. After 60 s the banner adds "Last update 1m ago." |
| Not this team's coach | "This board is only for this team's coach." with **Sign in** |

### F9i. Accessibility
- Text contrast ≥ 7:1. Accent ≥ 3:1 (non-text).
- Status always has pill text plus a border style, never color alone.
- With `prefers-reduced-motion`, tiles swap in place (no slide) and the ticker cuts instead of fading.

## F10. Effort board (v2.2 pass 2)
- **Coach:** Team → tab **Effort**.
- **Athlete:** Progress → card **Team effort** → full list. If the athlete is on two teams, a team switcher sits at the top.

**Tab chips** (horizontal scroll on phone, in this order). The athlete sees only the chips their permissions allow.

| Tab | Row value | Notes |
|---|---|---|
| **Overall** (default) | "245 pts" | Points line under the chips: "Session 10 · Extra recovery 5 (up to 2 a week) · Full week 5" |
| Sessions | "38" | Prescribed sessions only |
| Extra recovery | "6" | |
| Consistency | "92%" | |
| Streak | "5 wk" | |
| Attendance | "18" | Needs attendance permission |
| Hours | "24 h" | Capped at 3 h/day and 15 h/week |
| **Jump gains** (was Improvement) | "+2.5 in" | Total inches gained in touch + broad jump since the athlete's first test this block. **Never %.** Needs testing permission |

**Rows:** rank, board name, value (tabular). Ties share a rank.
- **Own row:** a 4 px left bar in the team accent, a 12% accent tint background, and body text in the normal text token. The accent never colors the text.
- If the athlete is outside the top 10, their row is pinned at the bottom.

**Filter:** Season / This block.

**Footer note:** "Effort board ranks work, not weight. Change how you appear in Settings → Privacy." When the range includes a break, add: "Break weeks don't count against anyone."

**Two teams (D-027), athlete view of the team whose program they don't follow:**
- On Overall, Sessions, Extra recovery, Consistency, and Streak, there's no own row. Instead, a muted line: "You're following Varsity's lift program, so you're not ranked here. Attendance, Hours, and Jump gains still count."
- The athlete can see the team name because both teams are their own. The coach side never sees it.

**Athlete Settings → Privacy:** "Show me on boards as" (segmented): **Jordan M.** · **J.M.** · **Hidden**.

**Coach Team settings:**
- Toggles "Effort board" and "Show leaderboard on Season view."
- A "Team goal" number field with the suggested default and the line "Break weeks are left out of the suggestion."
- **Board color** (F9c).

**States:**
- **Loading:** 6 skeleton rows.
- **Empty (season start):** "No sessions logged yet. The board fills in after the first workout."
- **Hidden athlete:** pinned row "You're hidden on boards" with the link "Change in Settings → Privacy."
- **Board off:** the athlete's card reads "Your coach turned off the effort board."
- **Error:** "Couldn't load the board. Pull to refresh."

## F11. Testing day
**Coach scheduling:** Calendar → tap a date → **Add testing day** → choose Full battery / Jump tests / Mid-season check → Save.
- A date within 2 days before a match shows an inline error: "Testing can't be within 2 days before a match."
- The calendar shows a "Test" chip on the date.

**Coach on the day:** Team screen banner "Testing day: Full battery". Button **Start strength check** opens a sheet with a checkbox "I'll be supervising this test, with safeties or spotters set." and a **Confirm** button. Afterward the banner reads "Strength checks open · confirmed 3:42 pm."

**Athlete:**
- Today shows **Testing session** instead of the lift.
- Steps in order: Warm-up → Approach touch → Broad jump → Med-ball throw → Strength checks.
- **Jump test:** 3 attempt fields, with the best one highlighted automatically. Big numeric keypad, inches (throw in feet).
- **Strength check:**
  - Locked state: "Strength checks open when your coach confirms they're supervising."
  - Ineligible states use neutral copy (see spec P6.4).
  - If the athlete has no check-in permission, ask on the spot: "Any pain today?" with Yes / No (not saved).
  - Each lift: the warm-up ladder as a checklist, then the attempt logger (weight × reps, rest timer 3:00), then "Enter your last good-form set."
  - Cue under the logger: "Your coach stops the set when form breaks. Never grind."
- **Result screen:** "Estimated strength: ~233 lb (estimate)" for each lift, and "Updated your starting weights" with before → after for each tested lift.

**Coach athlete detail:** a Tests section with dates, jump results, strength checks (weight × reps, estimate), and Edit / Void.

## F12. Fuel phase 1
- The Fuel tab header keeps the day-type title and summary.
- **Remove** the grams/ounces target tiles.
- Below that: the plate visual, then meal timing, then **Fuel cards** (today's matching cards first, then the rest in a list). Each card has a title, 2–4 short lines, a source line (12 px muted), and the disclaimer at the bottom of the tab.
- Today screen: replace the fuel-targets row with today's top card title, which links to Fuel.
- Onboarding: the **Body weight** step is removed.

---

# v2.2 flows (passes 1–2)
Draft v1.0 · Tue Nov 10, 2026 · Spec: `docs/specs/v2.2.md`, `docs/specs/rack-groups.md`. Pass noted on each flow.

## F13. "Your version" line (pass 1, G8 / T1)
Shown when `resolveSession` swaps an exercise to fit the athlete's level.

**Athlete, where it appears:**
- **Today session list:** the row title is the resolved exercise ("Goblet Squat"). The second line (13 pt muted, with a small "adjusted" icon) reads **"Your version (team: Back Squat)"**.
- **Workout view:** the same line under the exercise header.
- **Plan day detail:** the same line.
- **VoiceOver and screen-reader label:** the full Training Content sentence, "Your version: Goblet Squat (team: Back Squat)."
- *The visible line is shortened because the title already names the exercise.* → **Training Content (02)** to confirm.

**Tap the line** → bottom sheet:
- H2 "Why is this different?"
- Body: "Your coach's plan is for the whole team. Approach gives you the version that fits your level on Varsity. Your sets, reps, and rest stay the same."
- Line: "Your level on Varsity: Beginner (set by your coach)" or "(not confirmed yet)."
- Button **Got it**.
- There's no way to choose the harder exercise. Levels change only through the coach.

**Dropped slot [UX proposal]:** when a slot resolves to nothing, the session list ends with a muted line: "1 exercise left out for your level." No exercise name is shown.

**Coach, athlete detail:**
- A chip **"3 exercises adjusted to level."** Tap it to expand the list: "Back Squat → Goblet Squat," "Hang Power Clean → Box Jump."
- Link: "Change level on the roster."

**Never shown:** on the coach board, ticker, effort board, or racks. Those show the resolved name with no marker, so level can't be inferred.

**States:**
- No swaps: the line is absent.
- Offline: the resolution is local, so the line still shows.

## F14. Pain and head-injury messages (pass 1, G3 / G4)
> Copy is Training Content's text from the spec. **Legal (07) final wording is pending (B1).** Swap it in if it changes; the layout doesn't change.

**Athlete, after a check-in with pain = Yes:**
- A card at the **top of Today**, above the rack card and the session.
  - Style: warning color with an icon and a 16 pt body. It's a warning, not an error.
  - Text: **"Don't train through pain. Talk to your coach, parent, or athletic trainer before you lift today."**
  - No buttons, no swaps, no "where does it hurt," and no recovery suggestion card.
  - The card can't be dismissed. It stays for the rest of that day.
- **Start workout** stays available. The app doesn't block or ask anything more.
- The card shows immediately, offline too, because it's evaluated on the device.
- If the athlete edits the check-in to pain = No, the card disappears.
- **Testing day:** the existing ineligible note for strength checks applies (F11).
- **Extra recovery (pass 2):** the entry stays in its normal place, but it isn't promoted or suggested on a pain day. → **Training Content (02)** to confirm the entry should stay visible.

**Coach roster:**
- The existing pain flag chip gets a second line: **"Check in with Jordan in person."**
- It shows only where box 3 (share check-ins) allows. It never appears on any board.

**G4, Settings → Safety** (the same section as the existing disclaimer): a new paragraph, "If you hit your head or have any concussion symptoms, stop and follow your school's concussion protocol. Only a medical provider can clear you to return."

## F15. Multiple teams: lift program and combined schedule (pass 1, TM-2)

### F15a. Joining a second team
After the join succeeds, a bottom sheet appears:
- H2 "You're on 2 teams"
- Body: "Which team's lifting program do you want to follow? The other team's practices and matches still show on your schedule."
- Two option cards. The current program is preselected and tagged "Current":
  - "Varsity lift program" · "Current"
  - "Club 16s lift program"
- **Minor whose consent for that team is pending:** the card adds the helper line "You can log on this program once your coach records your parent's consent form."
- Primary button **Continue**. Closing the sheet keeps the current program.

### F15b. Switching later (Settings → Teams)
- Each team row shows a **"Lift program"** tag on the active team. Other rows have a **Follow this team's lift program** button.
- Tap → dialog:
  - "Switch to Club 16s' lift program?"
  - Body: "Starts with your next session. Your weight suggestions carry over."
  - Buttons **Switch** / **Cancel**.
- **Success:** toast "Following Club 16s' lift program from your next session."
- **Error:** "Couldn't switch. Check your connection and try again."

### F15c. Leaving the program team
A one-time notice on Today:
- "You left Varsity. You're now following Club 16s' lift program."
- Or, with no team left: "You left Varsity. You're on your personal program now."

### F15d. Combined schedule (athlete only)
- **Plan, week view:** each day lists events from **all** teams as chips with text labels.
  - Examples: "Practice · Varsity 3:30" and "Match · Club 16s 9:00."
  - Each team gets a small dot in its accent color, but the team name is always in the text.
  - The lift session card sits below the events.
- **Today:** a compact events line above the session, e.g. "Practice 3:30 · Varsity."
- **Moved sessions:** the athlete sees the reason with the team name, e.g. "Moved: Club 16s tournament Sat." It's the athlete's own schedule.
- **Testing conflicts:** the athlete sees the existing neutral copy, "Skip strength checks today. Talk to your coach."
- **States:**
  - Empty week: "No practices or matches this week."
  - A team's calendar fails to sync: muted line "Couldn't update Club 16s' schedule. Showing the last saved version."

### F15e. Coach side (compliance § Multiple teams)
- **Roster, the team whose program the athlete doesn't follow:** muted line **"Following another team's lift program."** No team name, no coach name.
- **Calendar and compliance views:** neutral reasons only, "Moved: schedule conflict" and "Not eligible for testing today."
- A coach never sees the other team's events.

## F16. Coach break weeks and easing back in (pass 1, TM-3 / G9)

### F16a. Coach adds a break
Calendar → **Add** → **Break** opens a sheet:
- **Fields:** Start date and End date (date pickers). Optional label, max 30 characters, with the placeholder "Thanksgiving break."
- **Live summary line:** "No lift sessions Nov 23–29 for athletes on Varsity's program. Streaks and Consistency pause."
- **Save.**
- **Validation:**
  - End date before the start date: "End date must be on or after the start date."
  - **[UX proposal]** A break that covers a testing day: "This break covers your testing day on Nov 25. Move or delete the testing day first." → **Product (01)** to confirm.
  - Practices and matches inside a break are allowed and still show.
- **Calendar display:** a band across the days with the label "Break" (or the custom label) and a **hatched pattern**, so it isn't color-only. Tap the band → **Edit** / **Delete break** (Delete asks to confirm).
- **Success:** toast "Break added."

### F16b. Athlete during a break
**On the program team's break:** the Today card reads:
- H2 "Break week"
- Body: "Extra recovery is optional."
- Pass 2 adds an **Extra recovery** button.
- The session list is hidden. Practices and matches still show.

**Plan:** the same hatched band.

**On the other team's break:**
- Plan shows a band, "Club 16s break."
- Muted line: "Your lifting continues on Varsity's program."
- Lifting continues as normal.

### F16c. Easing back in (after 14+ days with no logs)
- **Today:** an info banner (not a warning) reads **"Easing back in this week."**
- Tap → sheet: "Lighter week: effort tops out at RPE 6 and weights start a little lower. Back to normal on Dec 7."
- **Coach athlete detail:** chip "Returning from a break: lighter week."
- Neither appears on boards.

## F17. Racks: coach setup (pass 2, D-026)
Team → tab **Racks**. Web-first: the setup panel is on the left and the racks are on the right. On a phone it's one column, with the steps stacked above the racks.

**Empty state:**
- "Split your team into racks so everyone knows where to go."
- Primary button **Set up racks**.

### Step 1, Size
- Segmented control: **Number of racks** (1–12) / **Athletes per rack** (2–6), with a stepper.
- Result line: "16 athletes → 5 racks of 3–4."
- **Station hint (T8, under the stepper, muted):** "3 per barbell rack: one lifts, one spots, one loads."
- A **"Suggested per station"** link opens the table from `safety-guidelines.md` §6:
  - Barbell rack 3 (4 max)
  - Trap bar or platform 2–3
  - Dumbbell station 2–3
  - Plyo box up to 4
  - Med-ball 2 per ball
  - Testing day 2–3
- **On a testing day, the hint becomes:** "Testing day: 2–3 per station so you can watch every attempt."
- Hints are advice only. They never block a choice.

### Step 2, Who's here today (optional)
- A checklist of the roster, all checked by default, with an **All / None** toggle.
- Muted line: "Only used to balance today's racks. Not saved as attendance."

### Step 3, Method
Four radio cards, each with one line:
- **Random:** "Shuffle and deal evenly."
- **Balanced mix:** "Mix experience levels and positions in every rack."
- **By experience:** "Group similar levels. Rack numbers are shuffled."
- **By position:** "Keep position groups together."

When athletes follow another team's program, a note appears: "2 athletes follow another team's lift program and aren't included. Add them by hand."

### Preview
- Rack columns with athletes' board names.
- **Coach-only chips** on each athlete: level ("Beg," "Int," "Adv") and position.
  - A self-reported level shows a dotted chip outline, with the tooltip "Level not confirmed."
- A banner at the top: "Preview: not saved yet."
- Buttons: **Apply** · **Shuffle again** (Random only) · **Cancel**.
- If racks already exist, **Apply** asks first: "Replace current racks?"

### Editing
- **Rename:** tap a rack header to edit it inline (max 20 characters). Helper text: "Use neutral names. Groups show on the team board."
- **Move athletes:**
  - Web: drag between racks.
  - Phone: tap an athlete → sheet "Move Jordan M. to…" listing the racks plus **Unassigned**.
  - Keyboard: select an athlete, then choose **Move to…** from a menu.
- **Unassigned tray:** pinned at the bottom.
- **Re-run:** a **Re-run auto-assign** button.
- **New athlete (R6):** banner "Add Riley to a rack? Suggested: Rack 3," with **Add** / **Choose rack**.

### States
- **Loading:** skeleton columns.
- **Too few athletes:** inline error "You have 3 athletes here today. Use 3 racks or fewer."
- **Save error:** "Couldn't save racks. Try again." The preview is kept.
- **Success:** toast "Racks saved. Athletes see their rack on Today."

### Rules
- Levels and positions appear **only** in this coach preview and setup, never in rack names, on the board, or in the athlete app.

## F18. Rack card on Today (athlete, pass 2, rack-groups R5)
**Placement:** below the events line and above the session card. If a pain card (F14) is showing, it stays on top.

**Card content:**
- **"You're on Rack 2"**: rack name in 28 pt bold, so it's readable at arm's length.
- Partners line (16 pt):
  - **Ships first (until Legal confirms box 4, B5):** "with 2 teammates."
  - **Names version, behind a flag:** "with Jordan M. and Ava R." Partners who are hidden or lack board consent count as "1 more teammate," e.g. "with Jordan M. and 1 more teammate."
- **Moved:** a one-time pill, "Moved to Rack 3." It updates live.

**Hidden when:**
- the athlete is unassigned
- they're a solo athlete
- it's a break day
- it's a home day (pass 3)
- they're following another team's program and haven't been added by hand

**States:**
- Loading: the card is reserved at its height as a skeleton.
- Offline: shows the last known rack with a muted "May have changed."

---

# v2.2 flows (pass 3: home workouts and supersets)
Draft v1.0 · Tue Nov 10, 2026 · Spec: `docs/specs/v2.2.md` §3. Content: `programs/home-workouts.md`, `programs/rest-and-supersets.md`. Pass 3 can't start until these screens are approved (spec §3).

## F19. Coach program builder (redesign, web)
Team → **Program**. Desktop-first, with three areas: **Week setup** (top), the **Week grid** (middle), and the **Session editor** (right drawer). On a phone it stacks into one column, and the drawer becomes a full-screen sheet.

### F19a. Week setup
A single row of controls above the grid:
1. **Weight room days:** weekday toggle chips, Mon–Sun, e.g. **Tue** and **Thu** selected.
2. **Training days per week:** a stepper (1–6) **or** a **Recommend for me** button. Choosing Recommend fills the stepper and shows "Recommended for preseason: 4."
3. **Jumps at home:**
   - A toggle, default **off**. It's disabled in-season and post-season, with the tooltip "Home jumps are for off-season and preseason only."
   - Turning it on shows: "Level 1 jumps only, up to 20 contacts. Athletes see: Clear space, no low ceilings, sneakers on."
4. **Save time with supersets:** a toggle. It defaults to on for in-season and for home sessions, and off for off/pre-season school sessions.
   - The helper text changes with the setting: "Pairs exercises only until the session fits about 40 min."
5. **Result line** (16 pt), with a secondary line when caps apply:
   - "2 weight-room days + 2 home days."
   - "Beginners: 2 weight-room + 1 home + 1 light home day (max 3 full lift days for their level)."
   - The secondary line has a **"Who gets fewer days?"** link to a list of affected athletes by board name, with the reason "Lift-day limit for their level."
   - The list shows level only here, in the coach's view.

### F19b. Week grid
- **Layout:** 7 day columns. Each column has the day's events at the top ("Practice," "Match," "Tournament," and a hatched "Break" band) and the session card below.
- **Session card:**
  - **Location tag** with an icon and text, always both: **"Weight room"** (dumbbell icon) or **"Home"** (house icon). A light home day reads **"Light home"**.
  - **Session name:** e.g. "Total Body A" or "Home Upper."
  - **Estimate:** "about 45 min."
  - **Exercise summary:** the first 3 exercises, then "+3 more."
- **Move a session:** drag the card to another day (web), or tap → **Move to…** (phone and keyboard).
- **Switch location:** the card's overflow menu → **Switch to home** / **Switch to weight room**.
- **Rule violations (H3–H5):** the move or switch is blocked with a one-line reason, and the card snaps back.
  - "Keep at least one day with no training."
  - "No home sessions on match days."
  - "Day before a match: upper body or light day only."
  - "Two leg-heavy days in a row. Try Home Upper here."
- **Day with no session:** a dashed "Rest day" card with an **Add session** button. Adding one is checked against the same rules.

### F19c. Session editor (drawer)
Opens from a session card. Exercises appear in order as rows.

**Row contents:**
- Drag handle.
- Exercise name and tier, coach-only: a small muted tier chip (e.g. "Heavy," "Compound," "Accessory," "Care") rather than the letter.
- Sets × reps and effort.
- Rest.
- **Group label** ("A1," "A2") when paired.

**Home sessions:**
- Exercises show the **bodyweight default**.
- A muted line under the session title: "Each athlete gets the best version for their home equipment and level. Your sets, reps, and effort stay the same."

**Rest field (pass 1 floors):**
- Shows "Auto · 3:00," with a pencil to override.
- **Typing below the floor:** inline note "Heavy lifts need at least 2:00 rest." The field resets to the floor. Power lifts use "Power work needs at least 1:30 rest."
- **Reset to auto** link.

**Effort field, clamp (pass 1, D-028):**
- **Team with any minor:** strength slots block "RPE 9," "RPE 10," "failure," "to failure," and "max" (above RPE 7 for in-season).
  - The field shows an error state and the line: "For athletes under 18, strength work stays at RPE 8 or below. Stop with about 2 reps left."
  - **Save** is disabled while a blocked value is in a field.
- **Power slots:** "Max effort" is allowed.
- **Adult-only teams:** the same line appears as a warning (amber), and Save stays enabled.

**Supersets:**
- **Pair:** select two adjacent rows (checkbox on hover/long press) → **Pair as superset**. They become A1 / A2, with a bracket line joining them on the left.
- **Unpair:** the bracket menu → **Unpair**.
- **Blocked pairs** show a toast-style inline reason under the rows, and nothing pairs:
  - "Power exercises are done on their own, fresh."
  - "Heavy lifts get straight sets. You can add a light mobility drill during the rest."
  - "Both of these work the legs hard. Pair one with an upper-body exercise."
  - "Both of these are hard on grip."
  - "These are at different stations. Pairs need to be done from one spot."
  - "Supersets are for 2 strength exercises. Use a circuit for care, core, and mobility."
- **Filler:** tier D rows can be dragged onto a heavy lift's rest. The row then shows "During rest," indented under the lift.
- **Auto-paired rows** carry a small "Auto" tag. Any manual change removes the tag for that pair.
- **Mismatched sets:** muted note "Extra sets of Split Squat are done on their own at the end."
- **Rest in a pair:** A1 shows "15 s to A2." A2 shows "Rest 1:15 after the pair."

**Footer:**
- The session estimate, "about 42 min · target 40," with an amber dot when over the target.
- Buttons **Save** / **Cancel**.

### F19d. States
- **Loading:** skeleton grid.
- **Empty program:** the Week setup has no weight-room days selected. Message: "Pick your weight-room days and how many days a week to get started."
- **Recommend fails** (e.g., the volleyball week is missing): "Add your practice days in Team → Schedule first, then try again."
- **Save error:** "Couldn't save the program. Your changes are still here. Try again."
- **Success:** toast "Program saved. Athletes see it from their next session."

## F20. Home equipment (athlete, device only)
**Where:** Settings → **Home equipment**. It also opens once the first time an upcoming home day appears (sheet from Today).

**Sheet:**
- H2 "What do you have at home?"
- Muted line: "This stays on your phone. Your coach doesn't see it."
- Checkboxes, all **off** by default:
  - Dumbbells
  - Kettlebells
  - Bands
  - Pull-up bar
  - Bench
  - Sturdy step or stairs
  - Med ball
- Line under the list: "Nothing checked? You'll get bodyweight versions."
- Primary button **Save**.
- Skipping counts as bodyweight only. Settings can change it any time.

**After saving:** toast "Home workouts updated." Upcoming home sessions re-resolve on the device.

**States:** there is no loading or error state, because it's local only.

## F21. Today on a home day (athlete)
**Session card header:**
- Location tag **"Home"** (house icon).
- Title, e.g. **"Home workout · about 30 min."**
- A light home day reads **"Light home day · about 15 min,"** with the line "Easy movement. No weights today."

**First home day only:** a muted line under the card, "Clear some space, wear sneakers, and stop if anything hurts."

**Jumps (coach-enabled, H7):** the jump block shows the cue "Clear space, no low ceilings, sneakers on."

**Not shown on a home day:**
- the rack card (F18)
- a live board presence (F9)
- any testing (testing never happens at home)

**Your version line (F13):** applies as usual. On home days it can also reflect equipment, e.g. "Your version (team: Push-Up)."

**Harder version suggestion (bodyweight progression):** after two sessions at the top of the rep range, the exercise row in the next session shows a card:
- "Ready for a harder version? Pike Push-Up"
- Buttons **Try it** / **Not yet**.
- It's only offered at or below the athlete's level. It shows once per exercise until the athlete answers.

**Backpack carry:** the logger adds a field, **"Bag weight (lb)."**

**Logging:** works the same as school sessions.

**States:**
- Before home equipment is set, the card shows "Set up home equipment" as a secondary link above **Start workout**.

## F22. Supersets in the workout view (athlete)
**Exercise list:**
- Pairs show as one grouped card, labeled **A1 · DB Bench Press** and **A2 · One-Arm Row**, with a left bracket.
- The card header reads **"Superset · 3 rounds."**

**In-workout flow for a pair:**
1. The **A1** set logger is active (reps, weight, done).
2. Tapping **Done** starts a **15 s transition** timer, "Next: A2 One-Arm Row · 0:15." The A2 logger becomes active immediately, and the athlete can start before the timer ends.
3. Tapping **Done** on A2 starts the **rest timer** for the pair (e.g. "Rest 1:15"), with "Round 2 of 3" shown.
4. This repeats until all rounds are done.

**Mismatched sets:** any extra sets are presented as straight sets after the pair.

**Filler drills:** during a heavy lift's rest, a compact row appears in the timer screen, "During rest: Ankle Rock 2 × 5 each," with a checkbox. The full rest keeps counting.

**One-handed use:**
- The **Done** button stays in the bottom thumb zone, at least 56 pt tall.
- The current exercise label ("A2") is 28 pt bold, so the athlete can tell where they are at a glance.

**States:**
- **Offline:** logging and timers work locally (existing queue).
- **Backgrounded app:** timers continue, and a local notification fires at 0:00 (existing rest timer behavior).

## F23. Coach board with home days and supersets (extends F9)
**Superset tile:**
- Line 2: "A1 DB Bench · A2 One-Arm Row."
- Line 3: **"Round 2 of 3."**
- The rest countdown pill starts after A2, uses the same states as F9a, and follows `live_progress.group_label`.

**Home days:**
- Athletes on a home session don't appear on the live view.
- **[UX proposal]** The header adds a muted stat, **"At home 4,"** which is a count only, with no names.
  - The ticker can still show "Jordan M. finished Home Upper" (content doc §7). → **Product (01)** to confirm, since spec §3.1 says home athletes aren't on the live board.
- They appear normally on the Season view and the effort board.

**Light home days:** they appear like any session in the ticker and on the effort board, earning 10 points.

---

## Flags for other agents
| To | Item |
|---|---|
| Legal (07) | B1: final G3/G4 wording (F14 uses the spec text). B5: rack partner names (F18 ships count-only). |
| Training Content (02) | Confirm the shortened "Your version (team: …)" line (F13). Confirm Extra recovery stays visible but unpromoted on pain days (F14). Q-7: level for two teams. |
| Product (01) | Confirm the [UX proposal] items: board paging (F9a), "Other athletes" rack section (F9b), dropped-slot line (F13), no breaks over testing days (F16a), "At home" count on the board, and the home-day ticker line, which conflicts with spec §3.1 (F23). |
| Training Content (02), pass 3 | Confirm the coach-facing tier chip names (F19c), the blocked-pair reasons (F19c), and the "Try it / Not yet" harder-version card (F21). |
| Branding (04) | The 8 board presets (F9c) are neutral placeholders. Replace them once the brand guide exists, keeping ≥ 3:1 on `#0B0B0C`. |
| UX (03, me), still open | B4: level on the roster and the testing-day checklist (the effort clamp is now in F19c). `design/design-system.md`. |
