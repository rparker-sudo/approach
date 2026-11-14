# Program: Extra Recovery Sessions
Owner: Training Content / Sports Science (02) · v1.0 · Tue Nov 10, 2026
Status: **Draft for founder approval.** Fills the gap in v2.1 pass 2 P4.8 ("the athlete picks one of Training Content's recovery/mobility sessions"). Uses the library in `content/drill-library.md`, including the 6 new mobility exercises in §4 of that doc (marked ★ below).

## Rules (MUST)
- **What it is:** an optional 10–15 minute session from Today → **Extra recovery**. Logged as `kind: 'extra_recovery'` in `workout_logs`.
- **Contents:** prehab and mobility exercises only (`category: 'prehab'`). **No lifts, jumps, throws, or conditioning.** The athlete can't add exercises (P4.8).
- **Equipment:** every session needs **no equipment**, so it works at home, in a hotel, or at a tournament. A band is an optional swap where noted.
- **Effort:** always "Easy." Stretches are held at a mild stretch, never painful. Every session shows: *"Easy and pain-free. If anything hurts, stop."*
- **When:** any day, including rest days. Gentle mobility doesn't break the "1 day with no lifting or conditioning" rule (safety R5). On match and tournament days, only after competition.
- **Points:** 5 each, with a maximum of 2 counted per Mon–Sun week (P4.8). Athletes can do more; they just don't score.
- **No rest timer** (`restSec: 0`) except where noted. Athletes move straight to the next exercise.
- **Not treatment.** These sessions aren't for an injury, and the copy never says they help one. An athlete who answered pain = yes today sees the safety §5 message instead of a recommendation.

## Which session shows first (suggestion only; the athlete can pick any)
| Situation (from the app's day logic) | Suggested session |
|---|---|
| The day after a match or tournament | ER2 Legs After Matches |
| An upper-body lift day, or a setter or hitter | ER3 Shoulders & Upper Back |
| Middle blockers and liberos (jump- and landing-heavy) | ER4 Ankles & Knees |
| Match week (any match in the next 2 days) | ER5 Quick 10 |
| Anything else | ER1 Full-Body Reset |

---

## ER1. Full-Body Reset (about 13 min)
*Focus: whole-body mobility and breathing.*
| # | Exercise | id | Sets × Reps |
|---|---|---|---|
| 1 | Crocodile Breathing ★ | `crocodile-breathing` | 1 × 5 breaths |
| 2 | Cat-Camel ★ | `cat-camel` | 1 × 8 |
| 3 | World's Greatest Stretch | `worlds-greatest` | 2 × 3 each |
| 4 | 90/90 Hip Switch | `hip-90-90` | 2 × 5 each |
| 5 | Open Book | `thoracic-rotation` | 2 × 5 each |
| 6 | Knee-to-Wall Ankle Rock ★ | `ankle-rock` | 2 × 10 each |
| 7 | Child's Pose Lat Reach ★ | `lat-reach` | 1 × 20s each |

## ER2. Legs After Matches (about 13 min)
*Focus: hips, hamstrings, ankles after a lot of jumping.*
| # | Exercise | id | Sets × Reps |
|---|---|---|---|
| 1 | Crocodile Breathing ★ | `crocodile-breathing` | 1 × 5 breaths |
| 2 | Half-Kneeling Hip Flexor Stretch ★ | `hip-flexor-stretch` | 2 × 30s each |
| 3 | Lying Hamstring Stretch ★ (band, towel, or strap) | `band-hamstring` | 2 × 30s each |
| 4 | 90/90 Hip Switch | `hip-90-90` | 2 × 5 each |
| 5 | Knee-to-Wall Ankle Rock ★ | `ankle-rock` | 2 × 10 each |
| 6 | Tibialis Raise | `tib-raise` | 1 × 15 |

## ER3. Shoulders & Upper Back (about 12 min)
*Focus: upper back and shoulder blades after hitting, serving, and pressing.*
| # | Exercise | id | Sets × Reps | Note |
|---|---|---|---|---|
| 1 | Cat-Camel ★ | `cat-camel` | 1 × 8 | |
| 2 | Open Book | `thoracic-rotation` | 2 × 5 each | |
| 3 | Child's Pose Lat Reach ★ | `lat-reach` | 2 × 20s each | |
| 4 | Scap Push-Up | `scap-pushup` | 2 × 10 | Rest 30s |
| 5 | Prone Y-T-W Raises (no weight) | `ytw` | 2 × 6 each letter | "No weight today." Optional swap: Band Pull-Apart 2 × 15 |
| 6 | Crocodile Breathing ★ | `crocodile-breathing` | 1 × 5 breaths | |

## ER4. Ankles & Knees (about 12 min)
*Focus: ankle range, balance, and easy knee and shin work for jump-heavy positions.*
| # | Exercise | id | Sets × Reps | Note |
|---|---|---|---|---|
| 1 | Knee-to-Wall Ankle Rock ★ | `ankle-rock` | 2 × 10 each | |
| 2 | Single-Leg Balance Reach | `ankle-balance` | 2 × 6 each | |
| 3 | Tibialis Raise | `tib-raise` | 2 × 15 | |
| 4 | Wall Sit | `wall-sit` | 2 × 20s | "Easy depth, not parallel." Rest 30s |
| 5 | Half-Kneeling Hip Flexor Stretch ★ | `hip-flexor-stretch` | 1 × 30s each | |
| 6 | Lying Hamstring Stretch ★ | `band-hamstring` | 1 × 30s each | |

## ER5. Quick 10 (about 10 min, match week)
*Focus: stay loose without adding fatigue.*
| # | Exercise | id | Sets × Reps |
|---|---|---|---|
| 1 | Crocodile Breathing ★ | `crocodile-breathing` | 1 × 5 breaths |
| 2 | World's Greatest Stretch | `worlds-greatest` | 1 × 3 each |
| 3 | Half-Kneeling Hip Flexor Stretch ★ | `hip-flexor-stretch` | 1 × 30s each |
| 4 | Open Book | `thoracic-rotation` | 1 × 5 each |
| 5 | Knee-to-Wall Ankle Rock ★ | `ankle-rock` | 1 × 10 each |
| 6 | Cat-Camel ★ | `cat-camel` | 1 × 8 |

---

## Structured data (for Claude Code)
Matches the existing `Session` / `ProgramExercise` types. Add `kind` and `estMinutes` to these constant sessions only (no schema change to stored programs). Suggested location: `src/lib/recovery.ts`, exported as `EXTRA_RECOVERY_SESSIONS`.

```json
[
  { "id": "er1-full-body-reset", "name": "Full-Body Reset", "focus": "Whole-body mobility and breathing", "kind": "extra_recovery", "estMinutes": 13,
    "exercises": [
      { "exerciseId": "crocodile-breathing", "sets": 1, "reps": "5 breaths", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "cat-camel", "sets": 1, "reps": "8", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "worlds-greatest", "sets": 2, "reps": "3 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "hip-90-90", "sets": 2, "reps": "5 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "thoracic-rotation", "sets": 2, "reps": "5 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "ankle-rock", "sets": 2, "reps": "10 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "lat-reach", "sets": 1, "reps": "20s each", "effort": "Easy", "role": "mobility", "restSec": 0 } ] },
  { "id": "er2-legs-after-matches", "name": "Legs After Matches", "focus": "Hips, hamstrings and ankles after a lot of jumping", "kind": "extra_recovery", "estMinutes": 13,
    "exercises": [
      { "exerciseId": "crocodile-breathing", "sets": 1, "reps": "5 breaths", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "hip-flexor-stretch", "sets": 2, "reps": "30s each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "band-hamstring", "sets": 2, "reps": "30s each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "hip-90-90", "sets": 2, "reps": "5 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "ankle-rock", "sets": 2, "reps": "10 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "tib-raise", "sets": 1, "reps": "15", "effort": "Easy", "role": "care", "restSec": 0 } ] },
  { "id": "er3-shoulders-upper-back", "name": "Shoulders & Upper Back", "focus": "Upper back and shoulder blades after hitting and pressing", "kind": "extra_recovery", "estMinutes": 12,
    "exercises": [
      { "exerciseId": "cat-camel", "sets": 1, "reps": "8", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "thoracic-rotation", "sets": 2, "reps": "5 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "lat-reach", "sets": 2, "reps": "20s each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "scap-pushup", "sets": 2, "reps": "10", "effort": "Easy", "role": "care", "restSec": 30 },
      { "exerciseId": "ytw", "sets": 2, "reps": "6 each letter", "effort": "Easy", "role": "care", "restSec": 0, "notes": "No weight today. Have a band? Swap in Band Pull-Apart, 2 × 15." },
      { "exerciseId": "crocodile-breathing", "sets": 1, "reps": "5 breaths", "effort": "Easy", "role": "mobility", "restSec": 0 } ] },
  { "id": "er4-ankles-knees", "name": "Ankles & Knees", "focus": "Ankle range, balance and easy knee work", "kind": "extra_recovery", "estMinutes": 12,
    "exercises": [
      { "exerciseId": "ankle-rock", "sets": 2, "reps": "10 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "ankle-balance", "sets": 2, "reps": "6 each", "effort": "Easy", "role": "care", "restSec": 0 },
      { "exerciseId": "tib-raise", "sets": 2, "reps": "15", "effort": "Easy", "role": "care", "restSec": 0 },
      { "exerciseId": "wall-sit", "sets": 2, "reps": "20s", "effort": "Easy", "role": "care", "restSec": 30, "notes": "Easy depth, not parallel." },
      { "exerciseId": "hip-flexor-stretch", "sets": 1, "reps": "30s each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "band-hamstring", "sets": 1, "reps": "30s each", "effort": "Easy", "role": "mobility", "restSec": 0 } ] },
  { "id": "er5-quick-10", "name": "Quick 10", "focus": "Stay loose in a match week", "kind": "extra_recovery", "estMinutes": 10,
    "exercises": [
      { "exerciseId": "crocodile-breathing", "sets": 1, "reps": "5 breaths", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "worlds-greatest", "sets": 1, "reps": "3 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "hip-flexor-stretch", "sets": 1, "reps": "30s each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "thoracic-rotation", "sets": 1, "reps": "5 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "ankle-rock", "sets": 1, "reps": "10 each", "effort": "Easy", "role": "mobility", "restSec": 0 },
      { "exerciseId": "cat-camel", "sets": 1, "reps": "8", "effort": "Easy", "role": "mobility", "restSec": 0 } ] }
]
```

**Acceptance criteria (for Product to copy into the spec)**
- [ ] Today → Extra recovery lists ER1–ER5, with the suggested session first per the table above.
- [ ] No session includes an exercise outside `category: 'prehab'`, and none needs equipment.
- [ ] Logged as `kind: 'extra_recovery'`; doesn't count toward Sessions, Consistency, or Streak; the 3rd+ in a week earns 0 points.
- [ ] Every session screen shows "Easy and pain-free. If anything hurts, stop."
- [ ] Logging an extra recovery session never creates weight suggestions.
