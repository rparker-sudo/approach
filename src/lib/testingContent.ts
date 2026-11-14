/**
 * Static testing-day content from Training (testing-day-checklist.md Parts 1 and 2). No data is stored.
 */

/** Part 1: "Before your first testing day" (coach). */
export const CHECKLIST = {
  title: 'Before your first testing day',
  intro:
    "Strength checks are heavy sets of 3–5 reps (8 with dumbbells). They're only safe with you watching every attempt. Here's what to have ready.",
  sections: [
    {
      title: 'Plan it',
      items: [
        'Pick one of the dates Approach suggests. It never suggests a day within 48 hours before a match or tournament.',
        'Confirm levels on your roster. Athletes under 18 need intermediate or advanced, set by you, to do strength checks. Everyone else does the jump tests only.',
        "Athletes should have done each tested lift with good form in recent weeks. Testing isn't the day to learn a lift.",
      ],
    },
    {
      title: 'Set up the room',
      items: [
        'Safety bars (or a spotter) on every squat and bench station, set just below the bottom position.',
        'Collars on every bar.',
        '2–3 athletes per station, so you can see every attempt.',
        "Know your school's or club's injury and concussion plan, and where the athletic trainer or first-aid kit is.",
      ],
    },
    {
      title: 'Run it',
      items: [
        'Order: warm-up → jump tests → strength checks. Jumps go first, while everyone is fresh.',
        "Anyone who says they're in pain or run down today skips strength checks. Jump tests are their call; nothing is lost by skipping.",
        "Each lift: warm-up sets, then up to 3 working sets, with 3 minutes' rest.",
        'You stop the set when form breaks or the bar clearly slows. The result is the last set done with good form. Never let anyone grind out a rep.',
        'No single-rep attempts. Approach estimates strength from the reps.',
      ],
    },
    {
      title: 'If something goes wrong',
      items: [
        "Stop testing at that station. Follow your school's or club's injury plan.",
        'If anyone hits their head or shows concussion signs, they stop for the day and follow the concussion protocol.',
      ],
    },
  ],
};

/** Part 2: testing-session warm-up (athlete). */
export const TEST_WARMUP = {
  title: 'Warm-up · about 10 min',
  intro: 'Get warm and loose before you jump. Easy effort. Nothing here should feel hard.',
  blocks: [
    { title: 'Get moving · 2 min', text: 'Easy jog, skips, or side shuffles. Breathing a little harder by the end.', links: [] as { id: string; label: string }[] },
    {
      title: 'Open up · 3 min',
      text: '',
      links: [
        { id: 'worlds-greatest', label: "World's Greatest Stretch, 3 each side" },
        { id: 'ankle-rock', label: 'Knee-to-Wall Ankle Rock, 10 each side' },
        { id: 'hip-90-90', label: '90/90 Hip Switch, 5 each side' },
      ],
    },
    {
      title: 'Switch on · 2 min',
      text: '',
      links: [
        { id: 'glute-bridge', label: 'Single-Leg Glute Bridge, 8 each side' },
        { id: 'bodyweight-squat', label: 'Bodyweight Squat, 10' },
        { id: 'scap-pushup', label: 'Scap Push-Up, 8' },
      ],
    },
    {
      title: 'Shoulders · 1 min',
      text: '(or arm circles, 10 each way, with no band)',
      links: [{ id: 'band-pull-apart', label: 'Band Pull-Apart, 15' }],
    },
    {
      title: 'Build up · 2 min',
      text: '2 practice approach jumps at about three-quarter effort · 2 easy med-ball throws',
      links: [
        { id: 'pogo', label: 'Pogo Hops, 2 × 10' },
        { id: 'squat-jump', label: 'Squat Jump, 3 easy then 2 at about three-quarter effort' },
      ],
    },
  ],
  cues: ['Land soft and quiet.', 'Build up gradually. Your best jumps come in the tests, not the warm-up.', 'If something hurts, stop and tell your coach.'],
};
