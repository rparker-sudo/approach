# Program Goals for Adult Clients (trainer mode)
Owner: Training Content / Sports Science (02) · v1.0 · Sun Nov 15, 2026
Status: **Ready for the 2.3.0 build (T-B2). Unreviewed by a CSCS** (recorded risk TM-17). **[CSCS]** marks the items I most want reviewed (§7).
For: `product/specs/trainer-mode.md` §B2–B3. Every value here sits under `content/adult-training-rules.md` (T-B3): **RPE ceiling 8, no testing, cardio by duration only.** If a default here and a rule there ever disagree, the rule wins.

---

## 1. The four goals
| Goal | Who it's for (shown in the builder) | What it emphasizes |
|---|---|---|
| **Strength** | "Clients who want to get stronger on the main lifts." | Lower reps, heavier main lifts, longer rest |
| **Muscle** | "Clients who want to build muscle." | Moderate reps, more sets, more accessory work |
| **General fitness** | "Clients who want to feel fit and capable: strength, movement, and some cardio." | Balanced strength, circuits allowed, a cardio block |
| **Back after a break** | "For clients coming back after time off. Clients returning from an injury or medical condition should be cleared by a qualified professional first." | Easier effort and fewer sets that build back up over 4 weeks, then switch to another goal |

**Not offered:** weight-loss, fat-loss, toning, body-composition, or bodyweight-target goals (product principle, D-007). No goal is described as improving health, treating anything, or delivering a result.

## 2. Defaults by goal and slot role
The goal fills in sets, reps, and effort for each slot role when the trainer adds an exercise. The trainer can edit anything, **within the adult rules** (RPE ≤ 8, rest floors). **Rest isn't set by the goal.** It comes from the exercise tier and reps (`rest-and-supersets.md` §3), so the same floors apply everywhere.

### Strength
| Role | Sets × reps | Effort |
|---|---|---|
| power (optional; intermediate+) | 3 × 3 | "Fast, full rest" |
| main | 4 × 4–6 | RPE 7–8 |
| secondary | 3 × 6–8 | RPE 7 |
| accessory | 2–3 × 8–12 | RPE 7 |
| core | 3 × 8–10 / 30 s | Controlled |
| care | 2 × 12–15 | Light |
| mobility | 1–2 × 5 each | Easy |
| cardio (optional) | 5–10 min | Easy |

### Muscle
| Role | Sets × reps | Effort |
|---|---|---|
| power | — (not used by default) | — |
| main | 3–4 × 6–10 | RPE 7–8 |
| secondary | 3 × 8–12 | RPE 7–8 |
| accessory | 3 × 10–15 | RPE 7–8 |
| core | 3 × 10–12 / 30–40 s | Controlled |
| care | 2 × 12–15 | Light |
| mobility | 1–2 × 5 each | Easy |
| cardio (optional) | 5–10 min | Easy |
Supersets default **on** (accessory and arm work pair well; pairing rules still apply).

### General fitness
| Role | Sets × reps | Effort |
|---|---|---|
| power (optional; level 1 jumps or med-ball throws) | 2 × 5 | "Fast, land soft" |
| main | 3 × 8–10 | RPE 6–7 |
| secondary | 3 × 10–12 | RPE 6–7 |
| accessory | 2 × 12–15 | RPE 6–7 |
| core | 2–3 × 10 / 30 s | Controlled |
| care | 2 × 12–15 | Light |
| mobility | 1–2 × 5 each | Easy |
| cardio | **10–20 min** | Easy or Moderate |
Supersets and circuits default **on** (timed work only on core/care/mobility, per the circuit rules).

### Back after a break
A fixed **4-week ramp**. Week numbers are relative to the program start.
| Week | Sets (main / other) | Reps | Effort | Exercise levels |
|---|---|---|---|---|
| 1 | 2 / 1–2 | 10–12 | **RPE 6** | Level 1 only |
| 2 | 2–3 / 2 | 8–12 | RPE 6 | Up to the client's level, max 2 |
| 3 | 3 / 2 | 8–10 | RPE 6–7 | Up to the client's level |
| 4 | 3 / 2–3 | 8–10 | RPE 7 | Up to the client's level |
- **No power slot** (no jumps or throws) in weeks 1–2; optional level 1 jumps from week 3.
- Cardio block: **10 min, Easy** each session.
- **Starting weights:** if the client has logged history in Approach, the first suggestion is about **20% below** their last logged weight for that exercise (more cautious than the 10% in G9, since this goal is chosen for longer breaks). With no history, the trainer enters a starting weight, and the effort target guides it.
- **After week 4:** the builder prompts the trainer: *"Alex finished Back after a break. Pick their next goal."* No automatic switch.
- G9 (easing back in after 14+ days without logs) still applies on top of any goal.

## 3. Weekly structure defaults
The builder suggests these when the trainer picks a goal; caps and the rest-day rule come from the adult rules (§4 there).
| Goal | Sessions per week (suggested) | Suggested split |
|---|---|---|
| Strength | 3 (2–4) | 2: Full body A/B · 3: Full body A/B/C · 4: Upper/Lower × 2 |
| Muscle | 3–4 (2–5) | 3: Full body or Push/Pull/Legs · 4: Upper/Lower × 2 · 5: Upper/Lower/Push/Pull/Legs |
| General fitness | 2–3 (2–4) | Full body each session, with a cardio block |
| Back after a break | 2–3 (2–3 max during the ramp) | Full body |

## 4. Progression across weeks (B2 per-week RPE)
Default **4-week waves** for Strength, Muscle, and General fitness (the trainer can change any week, capped at RPE 8):
| Week in wave | Effort on main/secondary | Sets |
|---|---|---|
| 1 | Goal's lower RPE (e.g., Strength 7) | Goal default |
| 2 | Goal's lower RPE | Goal default |
| 3 | Goal's upper RPE (never above 8) | Goal default |
| 4 | **Deload:** RPE 6 | About −40% (same rest, per R8) |
- Programs of **6+ weeks** get a deload at least every 4–6 weeks; the builder suggests it and warns if a program of 7+ weeks has none.
- Weight suggestions follow the existing double progression (G5) per client.
- **Rep ranges set the progression.** When a client hits the top of the range on every working set, the next suggestion goes up (G5 caps). There are no percentage-based or estimated-max loads in general teams (no testing; adult rules §3).

## 5. Data (for Claude Code)
- `programs.goal: 'strength' | 'muscle' | 'general' | 'back_after_break'` (general teams only).
- A constant `ADULT_GOAL_RX[goal][role] = { sets, reps, effort }` from §2; `BACK_AFTER_BREAK_RAMP[week]` from §2; `ADULT_WAVE[weekInWave]` from §4.
- The goal only fills defaults. `resolveSession` still applies level, the RPE 8 cap, rest floors, and G9 per client.
- The string **"Return to training"** must not appear anywhere (spec B11).

## 6. Acceptance criteria (for Product)
- [ ] Exactly four goals with the labels and descriptions in §1; no weight-loss/body-composition goal; "Back after a break" shows the clearance line.
- [ ] Choosing a goal fills each slot's defaults per §2; editing above RPE 8 is blocked.
- [ ] "Back after a break": week 1 uses level 1 exercises only at RPE 6; no jumps or throws in weeks 1–2; starting suggestions about 20% below the last logged weight; after week 4 the trainer is prompted to choose a new goal.
- [ ] A 4-week wave defaults to week 4 as a deload (RPE 6, about −40% sets, same rest); a 7+ week program without a deload shows a warning.

## 7. Items for CSCS review [CSCS]
1. The sets/reps/effort table per goal (§2), especially **Muscle at RPE 7–8 for accessories** and **Strength main lifts at 4–6 reps** for clients a trainer rates beginner.
2. The **Back after a break** ramp: 4 weeks, level 1 only in week 1, and the −20% starting weights.
3. The **4-week wave with a week-4 deload** as the default for all three main goals.
4. Whether General fitness cardio of 10–20 min (Easy/Moderate) is the right default block size.
