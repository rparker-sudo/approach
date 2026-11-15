/**
 * Training's level checklist (docs/specs/v2.2.1.md Appendix B, from content/safety-guidelines.md §2b). Shown read-only
 * behind "See the full checklist" on the coach's Set level sheet (2.2.1 §4). Static content: no data is stored.
 */

/** F24b level cards (Training I4). */
export const LEVEL_DESCRIPTIONS: Record<1 | 2 | 3, string> = {
  1: 'New to lifting (under about 6 months), or still building form on goblet squats, push-ups, and landings.',
  2: '12+ weeks of steady training, with clean goblet squats, DB RDLs, lunges, push-ups, rows, and landings.',
  3: '2+ years of lifting, with clean barbell squats, deadlifts, and bench using safeties. Ready for coached Olympic lifts.',
};

export type ChecklistBlock =
  | { kind: 'p'; text: string; lead?: string }
  | { kind: 'ol'; items: string[] }
  | { kind: 'table'; rows: [string, string][] };

export type ChecklistSection = { title: string; blocks: ChecklistBlock[] };

export const LEVEL_PRINCIPLES =
  'Technique and training history, not strength numbers. Coaches decide; minors never raise their own level. Never based on pain, check-ins, or readiness. The app can suggest later, never decide.';

export const LEVEL_CHECKLIST: ChecklistSection[] = [
  {
    title: 'Beginner (level 1)',
    blocks: [
      {
        kind: 'p',
        text: 'Start here if any of these are true: less than about 6 months of regular lifting (2+ sessions a week); not yet meeting the intermediate checks; new to the coach. When in doubt, start at beginner.',
      },
    ],
  },
  {
    title: 'Intermediate (level 2)',
    blocks: [
      { kind: 'p', text: 'Move up when all are true:' },
      {
        kind: 'ol',
        items: [
          'About 12+ weeks of regular training (in Approach Strength: ≥ 80% of prescribed sessions over the last 12 weeks, or coach-known history).',
          'Technique checks, seen by the coach on a normal training day at about RPE 7 (every rep clean, every set):',
        ],
      },
      {
        kind: 'table',
        rows: [
          ['Squat', 'Goblet squat 3 × 8: hips to knee height or lower, heels down, knees tracking over toes, chest up'],
          ['Hinge', 'DB Romanian deadlift 3 × 8: flat back, hips push back, weights stay close to the legs'],
          ['Single-leg', "Reverse lunge or step-up 3 × 8 each: knee doesn't cave in, balance under control"],
          ['Push', 'Push-up 3 × 8: straight body, chest to the floor, full lockout'],
          ['Pull', 'One-arm DB row 3 × 10 each: no torso twist, elbow to hip'],
          ['Core', 'Plank 45 s with ribs down and no sagging; dead bug 3 × 8 each with the low back down'],
          ['Landing', 'Squat jump and broad jump, 5 of 5 landings soft and quiet, knees not caving, landing stuck'],
        ],
      },
      { kind: 'p', lead: '3.', text: "Coach judgment: follows coaching cues and doesn't chase weight at the expense of form." },
    ],
  },
  {
    title: 'Advanced (level 3)',
    blocks: [
      { kind: 'p', text: 'Move up when all are true:' },
      {
        kind: 'ol',
        items: ['About 2+ years of regular lifting, including 6+ months at intermediate.', 'Barbell technique checks at about RPE 7–8, with safeties set:'],
      },
      {
        kind: 'table',
        rows: [
          ['Squat', 'Back squat 3 × 5: depth at or below parallel, brace held, bar path over mid-foot, no hips shooting up'],
          ['Hinge', 'Trap bar deadlift or RDL 3 × 5: neutral spine from floor to lockout'],
          ['Press', 'Bench press 3 × 5: controlled descent, feet planted, safeties or spotter used without reminders'],
          ['Pull', '3+ strict pull-ups, or inverted row 3 × 10 with a straight body'],
          ['Single-leg', 'Rear-foot elevated split squat 3 × 8 each, controlled'],
          ['Landing', 'Lateral bound 5 of 5 each side, landing stuck'],
        ],
      },
      { kind: 'p', lead: '3.', text: 'Self-management: sets up and uses safeties without reminders and picks weights that match the prescribed RPE.' },
    ],
  },
  {
    title: 'Moving down',
    blocks: [
      {
        kind: 'p',
        text: 'The coach can lower a level at any time, for any reason seen in training. Recommended: lower one level after 3+ months without regular lifting. Never lowered automatically, and never because of pain or check-in data.',
      },
    ],
  },
];
