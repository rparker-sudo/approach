# Testing Day: Coach Checklist, Warm-Up, and Date Suggestions
Owner: Training Content / Sports Science (02) · v1.0 · Fri Nov 13, 2026
Status: **Ready for v2.2 pass 1.** Closes spec blockers **B2** (warm-up text, coach checklist) and the §4a date table (C14). Also records Training's answer to **Q-7 (B3)**.
Builds on: `safety-guidelines.md` §4a (protocol, eligibility), §5 (pain/readiness), §6 (rack sizes); `product/specs/v2.2.md` 1.9.2–1.9.4.

> **Not medical advice.** This is general strength-and-conditioning guidance for a supervised testing session. It doesn't replace the coach's judgment, the school's or club's safety rules, or an athletic trainer. The protocol has **not** had a CSCS review yet (accepted risk TM-6; Training's disagreement is recorded). Plain-language rule for every screen: **no "max," "max out," or "your max."**

---

## Part 1: "Before your first testing day" (coach, one screen)
Shown before a coach's **first** "Start strength check" on a team (spec 1.9.4). Four short sections. Copy below is final; UX lays it out (F25).

**Title:** Before your first testing day
**Intro (1 line):** Strength checks are heavy sets of 3–5 reps (8 with dumbbells). They're only safe with you watching every attempt. Here's what to have ready.

**1. Plan it**
- Pick one of the dates Approach suggests. It never suggests a day within 48 hours before a match or tournament.
- Confirm levels on your roster. Athletes under 18 need **intermediate or advanced, set by you,** to do strength checks. Everyone else does the jump tests only.
- Athletes should have done each tested lift with good form in recent weeks. Testing isn't the day to learn a lift.

**2. Set up the room**
- Safety bars (or a spotter) on every squat and bench station, set just below the bottom position.
- Collars on every bar.
- **2–3 athletes per station,** so you can see every attempt.
- Know your school's or club's injury and concussion plan, and where the athletic trainer or first-aid kit is.

**3. Run it**
- Order: warm-up → jump tests → strength checks. Jumps go first, while everyone is fresh.
- Anyone who says they're in pain or run down today **skips strength checks.** Jump tests are their call; nothing is lost by skipping.
- Each lift: warm-up sets, then **up to 3** working sets, with 3 minutes' rest.
- **You stop the set** when form breaks or the bar clearly slows. The result is the last set done with good form. Never let anyone grind out a rep.
- No single-rep attempts. Approach estimates strength from the reps.

**4. If something goes wrong**
- Stop testing at that station. Follow your school's or club's injury plan.
- If anyone hits their head or shows concussion signs, they stop for the day and follow the concussion protocol.

**Button:** I've read this
**Footer link (after first view):** "View again" stays on the testing-day screen.

---

## Part 2: Testing-session warm-up (athlete; replaces the placeholder)
Shown as the first step of the Testing session (F11: Warm-up → Approach touch → Broad jump → Med-ball throw → Strength checks). About **10 minutes**, no equipment except where noted. The per-lift warm-up ladder before each strength check is separate and already built (§4a).

**Step title:** Warm-up · about 10 min
**Intro:** Get warm and loose before you jump. Easy effort. Nothing here should feel hard.

| # | Block | What to do | Exercise id (if linked) |
|---|---|---|---|
| 1 | Get moving · 2 min | Easy jog, skips, or side shuffles. Breathing a little harder by the end. | — |
| 2 | Open up · 3 min | World's Greatest Stretch, 3 each side · Knee-to-Wall Ankle Rock, 10 each side · 90/90 Hip Switch, 5 each side | `worlds-greatest`, `ankle-rock`, `hip-90-90` |
| 3 | Switch on · 2 min | Single-Leg Glute Bridge, 8 each side · Bodyweight Squat, 10 · Scap Push-Up, 8 | `glute-bridge`, `bodyweight-squat`, `scap-pushup` |
| 4 | Shoulders · 1 min | Band Pull-Apart, 15 (or arm circles, 10 each way, with no band) | `band-pull-apart` |
| 5 | Build up · 2 min | Pogo Hops, 2 × 10 · Squat Jump, 3 easy then 2 at about three-quarter effort · 2 practice approach jumps at about three-quarter effort · 2 easy med-ball throws | `pogo`, `squat-jump` |

**Cues under the list:**
- "Land soft and quiet."
- "Build up gradually. Your best jumps come in the tests, not the warm-up."
- "If something hurts, stop and tell your coach."

**Data:** a static content block (no new fields). Exercise links open the existing how-to. `ankle-rock` ships in pass 1 (spec 1.8), so it's available.

---

## Part 3: Testing-date suggestions (§4a date table, for spec 1.9.3)
The Testing day picker suggests dates; the coach can still pick any other date that passes the hard rules.

### Hard rules (MUST, already enforced; listed for completeness)
- No testing day within **48 hours before** a match or tournament on **any** of an athlete's teams (union calendar, spec 1.2). The team-level picker checks the team's own calendar; per-athlete eligibility uses `can_load_test`.
- Not on a match/tournament day, and not on a coach-set **break** day.

### Suggestion rules
| Phase | Battery | Suggest | If that day fails a rule |
|---|---|---|---|
| **Off-season start** | Full battery | The **last lift day of week 1** of the first off-season block (week 1 = technique refresher). | Next lift day in week 2. |
| **Preseason start** | Full battery | The **last lift day of the deload week** (week 4) that ends the block before preseason. If there's no prior block in Approach, the **last lift day of preseason week 1**. | The previous lift day in the same week, then the first lift day of the next week. |
| **Mid-season** | Jump tests + **one** trap bar deadlift 5RM | A lift day in the **middle third** of the in-season phase, in a week with **no tournament**, and **at least 48 h before** the next match. Prefer the one closest to the season's midpoint. | Widen to any in-season week with no tournament. If none, suggest **Jump tests** only. |
| **Post-season** | Jump tests only | **First lift day of the post-season block.** | Next lift day. |

**Spacing (suggestion only, not a block):** don't suggest a **full battery** within **4 weeks** of the last full battery on that team. If the coach picks one anyway, show: "Last full battery was 3 weeks ago. Most teams test every 6–12 weeks."

**Picker display:** up to 3 suggested dates as chips, earliest first, each with a short reason, e.g. "Fri Jan 16 · end of week 1" or "Thu Feb 26 · no tournament this week." No suggestion fits → "No good date in this phase. Pick one, or test jumps only."

**Acceptance (for Product):**
- [ ] Off-season with no matches: the picker suggests the last lift day of block week 1.
- [ ] Mid-season with a Saturday tournament every week except one: it suggests a lift day in the free week, at least 48 h before the next match; with no free week, it offers Jump tests only.
- [ ] A suggested date is never within 48 h before a match on the team calendar, never on a break day, never on a match day.
- [ ] Picking a full battery within 4 weeks of the last one shows the spacing note but still saves.

---

## Part 4: Q-7 answer: level for an athlete on two teams (B3)
**Training's call (the spec asked Training to confirm): use the lower level.**

1. **Exercise resolution (G8):** use the **lower** of the athlete's levels across all their teams (`team_members.level`, confirmed or self-reported). If one coach rates the athlete a beginner, they get beginner versions everywhere.
2. **Strength checks (minors):** the **testing team's coach** must have confirmed intermediate or advanced (unchanged), **and** no other team has the athlete set at beginner **by a coach**. A self-reported level on the other team doesn't block.
3. **Adults:** same rule 1; rule 2 uses self-reported levels as today.
4. **Why:** a coach who sees the athlete lift and rates them a beginner is safety information, and the cost of being wrong is small (an easier exercise or jump tests only). The program team's level alone could put a beginner under a heavy bar.
5. **Visibility:** see Legal's condition in `legal/v2.2-copy-review.md` §4. The other team's level is never shown or named. The coach sees only neutral wording.

Founder can override (Product's earlier default was the program team's level).
