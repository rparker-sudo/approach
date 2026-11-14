# Approach: Parent/Guardian Consent Form (Soft Launch), version 2
Owner: Legal & Compliance (07) · Draft v2.1 text · Updated Tue Nov 10, 2026
**Draft. Not legal advice. A licensed attorney should review this form before the first athlete signs it.** Founder decision TM-6 removed the attorney gate; Legal still recommends one. Source of truth: Approach project → `legal/parent-consent-form.md`.
Used by: v2.1 pass 1 (S2) and pass 2 (P1); v2.2. Published as `public/consent.html` (printable). The coach records the boxes in the app (`consent_version = 2`).

**Changes on 11/10 (C17 and the team meeting):**
- Reverted from the digital form v3 to this coach-recorded form (FA-2). v3 is parked at `legal/future/parent-consent-form-v3.md`.
- Contact email filled in (FA-3).
- Two text additions made **before any family has signed** (no minors yet), so this is still version 2:
  - an **experience level** row (the `team_members.level` review);
  - a **"this form covers one team"** line (the multi-team review, TM-2).

---

## Approach: Volleyball Fitness
### Parent/Guardian Consent for an Athlete Under 18 (Form v2)

**Athlete name:** ______________________ **Athlete's month/year of birth:** ________
**Team:** ______________________ **Coach:** ______________________
**Parent/guardian name:** ______________________ **Email or phone:** ______________________

### What Approach is
Approach is a free, early-version web app for volleyball strength training. The coach posts workouts, and your athlete logs them on a phone. It is in a small test ("soft launch") before a public release. There is nothing to buy.

**This form covers only the team and coach named above.** If your athlete is also on another team that uses Approach (for example, a school team and a club team), that team's coach needs a separate signed form, and that coach sees only what your athlete does with that team.

### What information is collected, and who sees it
| Information | Who sees it | Needs box |
|---|---|---|
| Name, email, volleyball position, birth year, team | Your athlete and their coach | 1 |
| Experience level (beginner, intermediate, or advanced), set by the coach, which decides which exercises and tests your athlete gets | Your athlete and their coach. **Never shown to teammates or on any board.** | 1 |
| Workouts logged (exercises, sets, reps, weights, notes) | Your athlete and their coach | 1 |
| Daily check-in: sleep, soreness, energy (1–5), pain yes/no | Your athlete; the coach only with box 3 | 2, 3 |
| Name ("Jordan M." or initials) and workout progress on the **team boards**: a live screen the coach may show in the weight room, and an **effort leaderboard** ranking sessions completed, consistency, and streaks | Coach and **teammates** | 4 |
| Practices and matches attended and hours trained, shown on the effort leaderboard | Coach and teammates | 5 |
| **Testing days:** jump tests (approach touch, broad jump, med-ball throw) and **strength checks** (lifting the heaviest weight they can do with good form for 3–5 reps, under coach supervision), plus the estimated strength calculated from them | Your athlete and their coach. Jump-test **improvement** may appear on the effort leaderboard if box 4 is also checked. **Lifting results are never shown to teammates or ranked.** | 6 |

**Stays on your athlete's phone only (never sent to us):** body weight and personal notes.
**Never collected:** photos, video, location, contacts, medical or injury details. No advertising or tracking tools. Data is **never sold** and never used for ads. Nobody at Approach monitors check-ins or notes.

**Leaderboards rank effort, not bodies or strength.** They never show weights lifted, strength-check results, body weight, nutrition, or check-in answers. Your athlete can switch to initials or hide from the leaderboard at any time.

### Risks of physical training
Strength, power, and conditioning training, including jump tests and strength checks, carries a risk of injury, from muscle strains and sprains to more serious injury. Strength checks involve heavy lifting. In Approach they are only for intermediate and advanced athletes on a coached team, only after the coach confirms in the app that they are supervising with safety bars or spotters, never as a true one-rep max, and never on a day the athlete reports pain or being run down. Approach gives general training information. **It is not medical advice and doesn't replace supervision by a qualified coach.** Athletes should stop if something hurts and tell a coach, parent, or athletic trainer about any pain or injury in person.

### Your choices
Check each box you agree to. **Box 1 is required.** Boxes 2–6 are optional; the app works without them, and each matching feature stays off for your athlete.

☐ **1. Participation (required).** I am the parent or legal guardian of the athlete named above. I agree that they may use Approach under the Approach Terms and Privacy Notice. I understand the risks of physical training described above and accept them for my athlete.

☐ **2. Daily check-ins.** My athlete may log the daily check-in (sleep, soreness, energy, pain yes/no).

☐ **3. Sharing check-ins with the coach** *(requires box 2)*. The coach named above may see my athlete's check-ins.

☐ **4. Team boards.** My athlete's name ("Jordan M." or initials) and workout progress may appear on the coach's live board and the team effort leaderboard, which teammates can see.

☐ **5. Attendance and hours.** My athlete's practice and match attendance and hours trained may be recorded and shown on the effort leaderboard.

☐ **6. Testing days.** My athlete may take part in jump tests and, if eligible, coach-supervised strength checks, and the results may be saved and used to set their training weights.

### Changing your mind
You can withdraw any choice or ask us to delete your athlete's account and data at any time. Tell the coach, or email **Ryan@thehbcvbc.com**. Your athlete can also delete their account in the app (Settings → Delete my account). Deleted data is removed within 30 days. We keep a short record of what you agreed to, and of coach supervision on testing days, for 5 years after the account closes, as proof. That record contains no workout, check-in, or test results.

**Parent/guardian signature:** ______________________ **Date:** __________

---
*Coach: keep the signed form, and send a copy (photo or scan) to Ryan@thehbcvbc.com. Then record exactly the boxes checked in the app (Team → athlete → Record parent consent, form v2). Approach keeps copies for 5 years after the account closes, as proof of consent. If you're coaching a school team, confirm your school allows you to use Approach with your athletes before collecting forms (Terms §4).*

---

## Notes for the attorney (not part of the printed form)
Priority items (also in `legal/open-questions-for-attorney.md`):
1. **Accepted risks TM-5 and TM-6 (11/10):** the soft-launch team comes from the founder's **own school district**, and there's no attorney or CSCS review before the first minor signs. This makes R1 live: possible district claim to Approach, district policy exposure, and FERPA/SOPIPA questions if a public-school coach uses the app with students (Q17).
2. **Strength checks on minors (box 6)** are live without a CSCS review of the protocol (DS-5, TM-6; Training Content disagrees). Safeguards: eligibility rules, a per-day supervision confirmation recorded in the app, no true 1RM, and (from 11/10) load tests only for a **coach-confirmed** level. Is the parent's assumption of risk plus the coach's supervision attestation adequate? Should coaches accept separate Coach Terms (Q20)?
3. **Ranking minors visible to teammates (boxes 4–5).** Effort-only metrics, opt-out, "Jordan M." default. Any state design-code issues for teen rankings?
4. Check-ins and the pain flag as consumer health data (WA MHMDA, NV SB 370); test results as health-adjacent data.
5. **Contact email on a club domain (C18):** the club's athletes may attend district schools, which links Approach to the club. Branding is recommending an Approach domain.
- Version 1 → 2: families who signed v1 keep boxes 1–3 as signed; boxes 4–6 stay off until they sign v2.
