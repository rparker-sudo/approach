# User Flows: v2.1 soft launch
Owner: UX/UI Design (03) · Draft v1.0 · Mon Nov 9, 2026
Source of truth: Approach project → `design/user-flows.md`. Covers only what v2.1 changes; the v2.0 flows stay as built. Use the existing components in `src/components/ui.tsx` and the tokens in `src/lib/brand-tokens.json`. Core actions stay at 3 taps or fewer.

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

## F5. Delete my account
Settings → Account → ghost/destructive button **Delete my account** →
- Dialog H2 "Delete your account?"
  - Athlete body: "This deletes your account, your team memberships, logged workouts, and check-ins. Data on this phone is erased too. This can't be undone."
  - Coach body adds: "Your teams and every athlete's logs for those teams are deleted too."
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

## F9. Coach board (`/board/[teamId]`)
- **Entry:** Team → secondary button **Open coach board** → opens full screen (web: new tab; suggest "Press F11 for full screen").
- **Layout (landscape, 16:9, dark):**
  - Header row: team name · date · today's session per group, around 48 px type.
  - Tile grid, 4–6 columns depending on roster size. Each tile: board name in 36 px bold, status pill (Not started / In progress / **Done** in the achievement color), "Sets 9 / 16" in 28 px tabular numbers, a small "PR" badge when a best was hit today.
  - Done tiles move to the end of the grid. Tiles never show weights.
  - Footer band (about 18% of height): team goal bar ("412 / 500 sessions"), then an effort panel that rotates every 20 s (top 5 per metric).
- **Controls** (top-right, fade after 3 s of no mouse movement): hide effort panel, change group filter, exit.
- **States:**
  - Empty (no session today): "Rest day. See you tomorrow."
  - Loading: skeleton tiles.
  - Offline: banner "Reconnecting…", tiles keep their last values.
- **Accessibility:** contrast ≥ 7:1 on the projector theme; never color-only status (pill text is always present).

## F10. Effort board
- **Coach:** Team → tab **Effort**.
- **Athlete:** Progress → card **Team effort** → full list.
- Metric chips across the top: Consistency (default) · Sessions · Streak · Attendance · Hours · Improvement. The athlete sees only chips their permissions allow.
- Rows: rank, board name, value ("92%", "5 wk", "+1.5 in"). The athlete's own row is highlighted. If they're outside the top 10, their row is pinned at the bottom.
- Filter: Season / This block.
- Footer note: "Effort board ranks work, not weight. Change how you appear in Settings → Privacy."
- **Athlete Settings → Privacy:** "Show me on boards as" (segmented): **Jordan M.** · **J.M.** · **Hidden**.
- **Coach Team settings:** toggles "Effort board" and "Show effort on coach board", plus a "Team goal" number field with the suggested default.

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
