# Compliance: Hard Rules (v2.1 soft launch)
Owner: Legal & Compliance (07) · Mon Nov 9, 2026 · Not legal advice; attorney review pending.
Source of truth: Approach project → `legal/data-requirements.md` (full rules for the eventual launch). This file is the subset that applies **now**. Every MUST is tested.

## Age
- MUST: neutral month/year-of-birth gate before anything else; under 13 blocked; nothing stored but a local block flag.
- MUST: coaches 18+.
- MUST: store birth year + is_minor only, never the full date.
- MUST: on actual knowledge of an under-13 user, delete the account (use `delete_my_account` or the admin equivalent) within 72 hours.

## Minors and consent
- MUST: a minor on a team can't send workout logs or check-ins until the coach records parent consent. Enforced by RLS, not only by the UI.
- MUST: "training only" consent → no check-ins sent.
- MUST: athletes can't change their own consent status.

## Data
- MUST NOT collect: free-text injury/pain notes, full birth dates, location, photos/video, contacts, HealthKit/wearable data, advertising IDs.
- MUST keep on the device only: body weight, touch height, fuel targets, solo-mode data.
- MUST: any new server-side field gets a Legal review before it's built.

## Visibility
- MUST: athlete data is visible only to the athlete and their **current** coach. Never teammates.
- MUST: removing an athlete cuts the coach's access to their logs and check-ins immediately.
- MUST NOT: messaging, comments, feeds, public profiles. (Team effort boards are allowed only under the Boards rules below.)

## Permissions (pass 2)
- MUST: six per-athlete permissions (participation, check-ins, share check-ins, boards, attendance, testing). Each feature works for a minor only when the coach has recorded that box from a signed form v2; adults choose for themselves. Enforced by RLS.
- MUST: athletes under 18 can't change their own permissions; adults can, anytime, in Settings → Privacy.

## Boards (pass 2)
- MUST: boards show "First L." or initials only, never a full last name; athletes can hide.
- MUST NOT show on any board: weights/loads, strength-check results, estimated maxes, check-ins or pain, body weight, nutrition.
- MUST: the coach board is visible only to the signed-in coach of that team; no public links.
- MUST: effort metrics count only prescribed sessions; hours capped (3 h/day, 15 h/week); rest days never break streaks.

## Testing days (pass 2)
- MUST NOT: true 1-rep-max tests, or "max out" / "your max" wording.
- MUST: load tests locked until the coach confirms supervision that day; record who and when.
- MUST: load tests only for coached intermediate/advanced athletes with testing permission, not within 48 h before a match, and not when the athlete reports pain or is run down that day.
- MUST: estimated strength is always labeled an estimate and is visible only to the athlete and coach.

## Fuel (pass 2)
- MUST NOT: calorie numbers, gram or g/kg targets, weight goals, supplement advice, or body weight used for nutrition.

## Third parties
- MUST NOT: ad SDKs, analytics that share data for the vendor's own use, tracking pixels (app or web pages), App Tracking Transparency.
- Allowed vendors now: Supabase, GitHub Pages. Adding any vendor needs a Legal review.

## Deletion
- MUST: in-app account deletion for athletes and coaches.

## Copy
- MUST NOT: medical, injury-prevention, treatment, or guaranteed-results claims anywhere users can see.
- MUST: App Store privacy labels (when that happens in 2027) list what's actually collected. Never "Data Not Collected" while sync is on.

## Founder rules (R1)
- No district students, families, or colleagues as users. Work on personal time, devices, and accounts.
