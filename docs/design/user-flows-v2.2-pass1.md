# User Flows: v2.2 Pass 1 Addendum (F24–F26)
Owner: UX/UI Design (03) · v1.0 · Fri Nov 13, 2026
Closes spec blocker **B4** (the screens still missing from `design/user-flows.md` for pass 1). Read together with `user-flows.md` v2.0. Same rules apply: existing components in `src/components/ui.tsx`, tokens in `src/lib/brand-tokens.json`, 3 taps or fewer, text plus color (never color alone), tap targets ≥ 44 pt.
Content: `content/programs/testing-day-checklist.md` (Training), `legal/v2.2-copy-review.md` (Legal).

**Also in this addendum:**
- **F14 G4 line:** use Legal's revised wording (copy review §3).
- **F19c:** the blocked-pair reason "Supersets are for 2 strength exercises. Use a circuit for care, core, and mobility." is **retired** (circuits now allowed, D-030). Pass 3 circuit and station screens are still to come (B6).

---

## F24. Level on the roster (coach) and in Settings (athlete) · pass 1, G8 / § Level

### F24a. Roster row
- Every athlete row gets a **level chip** next to the consent chip: **Beginner** · **Intermediate** · **Advanced**.
  - **Coach-set:** solid outline.
  - **Self-reported (`level_set_by` null):** dotted outline plus the text **"Level not confirmed"** (13 pt muted) under the name. The text is always there, so the state isn't shown by outline style alone.
- **Header summary** (only when any level is unconfirmed): "3 levels not confirmed · **Review**." Review filters the roster to those athletes.
- **Testing-day banner addition** (F11, when relevant): "2 athletes under 18 need a confirmed level for strength checks. **Review**."

### F24b. Set level sheet
Tap the chip → bottom sheet:
- H2 **"Set Jordan's level"**
- Three radio cards (current one preselected):
  - **Beginner:** "Learning the basic lifts."
  - **Intermediate:** "Solid form on the main lifts."
  - **Advanced:** "Years of coached lifting, including barbell lifts."
  - *(Plain descriptions only. Training's level-progression criteria (I4) aren't written yet; swap them in when they are.)*
- Muted line: "Sets which version of each exercise Jordan gets. Athletes under 18 need intermediate or advanced, set by you, for strength checks."
- Self-reported note, when relevant: "Jordan said: Intermediate (not confirmed)."
- **Save**, enabled once a choice is made. Saving the same level as the self-reported one still confirms it (writes `level_set_by` and `level_set_at`).
- **Success:** toast "Level saved." The chip turns solid. The row shows "Set by you · Nov 13" in muted text.
- **Error:** "Couldn't save the level. Try again." The sheet stays open.

### F24c. Rules
- A coach sees and sets the level for **their own team only**. No other team's level or name ever appears (Legal copy review §4).
- Level never appears on the coach board, effort board, ticker, rack names, or anywhere teammates can see.
- Athlete detail, swap chip (from F13):
  - Swaps from this team's level: **"3 exercises adjusted to level."**
  - Swaps caused by another team's lower level: **"Adjusted for this athlete,"** with the swap list and no reason.

### F24d. Athlete, Settings → Program
- "Your level on Varsity: **Intermediate** (set by your coach)" or "(not confirmed yet)."
- On two teams, one line per team, then: "Your exercises follow the lower of your teams' levels."
- Read-only. Muted line: "Only your coach can change your level."

---

## F25. Testing day: checklist and date suggestions · pass 1, C14 (1.9.3, 1.9.4)

### F25a. "Before your first testing day" (coach)
- **Trigger:** the coach taps **Start strength check** on a team for the first time.
- **Layout:**
  - Full-screen sheet (desktop: centered modal, max width 640).
  - Title and intro from Training (Part 1).
  - Four sections with H3 headings (**Plan it · Set up the room · Run it · If something goes wrong**). Each section is a short bulleted list, read-only with no checkboxes.
- **Button:** **I've read this**, pinned at the bottom.
  - Enabled after the coach scrolls to the end. If the content fits without scrolling, it's enabled at once.
  - Tapping it opens the existing supervision confirm sheet (F11).
- **Close (✕):** returns to the testing-day screen. Strength checks stay locked.
- **"Viewed" record:**
  - Saved **on the coach's device**, per team.
  - A new device shows the checklist again, which is fine.
  - This avoids a new server field. If Product wants it on the server, it needs a Legal review (G-5).
- **View again:** a link on the testing-day banner, "Testing checklist," opens the same sheet with the button reading **Close**.
- **States:** none beyond open and closed. It's static content, and it works offline.

### F25b. Date suggestions in the picker (extends F11)
Calendar → tap a date → **Add testing day**:
- Above the battery choice: **"Suggested dates"**, with up to 3 chips, earliest first.
  - Each chip has a date and a reason, e.g. "Fri Jan 16 · end of week 1." Tapping a chip sets the date.
- A full battery within 4 weeks of the last one shows an amber note, "Last full battery was 3 weeks ago. Most teams test every 6–12 weeks." Save stays enabled.
- **Nothing fits:** "No good date in this phase. Pick one, or test jumps only."
- The hard-rule error stays as is: "Testing can't be within 2 days before a match."
- A break covering the date: "This date is in a break."

### F25c. Athlete warm-up step (extends F11)
- The first step of the Testing session is **"Warm-up · about 10 min,"** with Training's intro, a 5-block list (rows link to how-to), and three cues.
- **Done with warm-up** moves to Approach touch.
- There's no timer, and nothing is logged.

---

## F26. Effort clamp outside the redesigned builder · pass 1, D-028
The clamp copy and states are in F19c. Pass 1 ships **before** the pass 3 builder redesign, so the clamp goes into the **current** builder's effort field with the same rules:
- **Team with any minor:**
  - Error state plus "For athletes under 18, strength work stays at RPE 8 or below. Stop with about 2 reps left."
  - In-season, the line says RPE 7.
  - Save is disabled.
- **Adult-only team:** an amber warning, with Save enabled.
- **Power slots:** "Max effort" is allowed.
- **Rest field floors (1.5):** the inline note from F19c, "Heavy lifts need at least 2:00 rest," resets to the floor in the current builder too.

---

## Flags
| To | Item |
|---|---|
| Product (01) | Confirm the device-only "viewed" record for the checklist (F25a). The alternative is a server field plus a Legal review. |
| Training (02) | Swap I4 level criteria into F24b's card descriptions when they're written. |
| Branding (04) | Still needed: real board color presets (F9c placeholders). |
| UX (03, me) | Still open: B6 pass 3 (circuits, Stations, the board station grid) and `design/design-system.md`. |
