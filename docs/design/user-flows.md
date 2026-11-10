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
