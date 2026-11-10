import type { DayType } from './types';

/**
 * General sports-nutrition education for volleyball athletes (Fuel phase 1, D-019).
 * No personal or numeric targets: no calories, grams, g/kg, ounces, weight goals or supplements,
 * and body weight is never used. Day-type guidance, plate proportions, meal timing and cited cards only.
 */

export type FuelLevel = 'rest' | 'moderate' | 'high' | 'very-high';

export type FuelDay = {
  level: FuelLevel;
  title: string;
  summary: string;
  plate: { carbs: number; protein: number; veg: number }; // fractions of a plate
  timing: { when: string; what: string }[];
};

export function fuelLevel(day: DayType, lifting: boolean): FuelLevel {
  if (day === 'tournament') return 'very-high';
  if (day === 'game') return 'high';
  if (day === 'practice') return lifting ? 'high' : 'moderate';
  return lifting ? 'moderate' : 'rest';
}

/** Day-before-a-match adjustment: top up carbs and fluids. */
export function fuelDay(day: DayType, lifting: boolean, matchTomorrow = false): FuelDay {
  const base = baseFuelDay(day, lifting);
  if (!matchTomorrow || day === 'game' || day === 'tournament') return base;
  return {
    ...base,
    title: `${base.title} · match tomorrow`,
    summary: 'Match tomorrow. Eat a bit more carbs today and drink extra water so you start the match fully fueled.',
    plate: { carbs: 0.45, protein: 0.25, veg: 0.3 },
    timing: [
      ...base.timing,
      { when: 'Dinner tonight', what: 'Carb-focused meal you know sits well: pasta, rice, potatoes with lean protein.' },
    ],
  };
}

function baseFuelDay(day: DayType, lifting: boolean): FuelDay {
  const level = fuelLevel(day, lifting);

  if (day === 'tournament') {
    return {
      level,
      title: 'Tournament day',
      summary: 'Long day, several matches. Keep topping up carbs and fluids all day.',
      plate: { carbs: 0.5, protein: 0.25, veg: 0.25 },
      timing: [
        { when: '3–4 hrs before first match', what: 'Full meal: oatmeal or bagel, eggs or yogurt, fruit. Low fat and fiber.' },
        { when: '30–60 min before', what: 'Easy carb snack: banana, pretzels, applesauce pouch.' },
        { when: 'Between matches', what: 'Small, frequent snacks: PB&J half, crackers, fruit, sports drink. Sip water every break.' },
        { when: 'Long break (2+ hrs)', what: 'Light meal: turkey sandwich, rice bowl, pasta. Avoid greasy food.' },
        { when: 'Within 1 hr after the last match', what: 'Carbs + protein: chocolate milk, rice and chicken, burrito.' },
      ],
    };
  }
  if (day === 'game') {
    return {
      level,
      title: 'Match day',
      summary: 'Top off your energy before the match and refuel after.',
      plate: { carbs: 0.5, protein: 0.25, veg: 0.25 },
      timing: [
        { when: 'Breakfast & lunch', what: 'Normal meals with extra carbs: rice, pasta, bread, potatoes, fruit.' },
        { when: '3–4 hrs before', what: 'Pre-match meal: pasta with lean meat, rice bowl, sandwich. Familiar foods only.' },
        { when: '30–60 min before', what: 'Small carb snack: banana, granola bar, crackers.' },
        { when: 'During', what: 'Water every timeout. Sports drink for long or hot matches.' },
        { when: 'Within 1 hr after', what: 'Carbs + protein: chocolate milk, yogurt and granola, a real meal.' },
      ],
    };
  }
  if (day === 'practice') {
    return {
      level,
      title: lifting ? 'Practice + lift day' : 'Practice day',
      summary: lifting
        ? 'Your biggest training day. Fuel before practice and refuel after you lift.'
        : 'Fuel before practice, refuel after.',
      plate: { carbs: 0.4, protein: 0.3, veg: 0.3 },
      timing: [
        { when: 'Meals', what: '3 meals, each with protein, a carb and a fruit or vegetable.' },
        { when: '1–2 hrs before practice', what: 'Snack: fruit + string cheese, toast with peanut butter, yogurt.' },
        { when: 'During', what: 'Water. Sports drink if practice is longer than 90 min or very hot.' },
        { when: lifting ? 'After practice + lift' : 'After practice', what: 'Within an hour: protein + carbs. Chocolate milk, turkey wrap, rice and chicken.' },
        { when: 'Before bed', what: 'Optional protein snack: Greek yogurt, milk, cottage cheese.' },
      ],
    };
  }
  return {
    level,
    title: lifting ? 'Lift day (no volleyball)' : 'Rest day',
    summary: lifting
      ? 'Normal eating with protein after your lift.'
      : 'Recovery day. Eat normal meals; you still need carbs to refill energy stores.',
    plate: { carbs: 0.3, protein: 0.3, veg: 0.4 },
    timing: [
      { when: 'Meals', what: '3 balanced meals with protein, carbs, fruits and vegetables.' },
      { when: 'Snacks', what: '1–2 snacks with protein: yogurt, nuts, eggs, cheese and crackers.' },
      ...(lifting
        ? [{ when: 'After your lift', what: 'Protein + carbs within an hour: yogurt and fruit, eggs and toast, a sandwich.' }]
        : [{ when: 'Recovery', what: 'Sleep 8–10 hours. Sleep is when muscles rebuild.' }]),
    ],
  };
}

export const FOOD_IDEAS = {
  carbs: ['Rice', 'Pasta', 'Oatmeal', 'Bread / bagels / tortillas', 'Potatoes', 'Fruit', 'Cereal', 'Granola bars'],
  protein: ['Chicken / turkey', 'Eggs', 'Greek yogurt', 'Milk / chocolate milk', 'Fish', 'Beans & lentils', 'Lean beef', 'Tofu'],
  veg: ['Any vegetables', 'Salad', 'Berries', 'Bananas', 'Oranges', 'Carrots', 'Broccoli', 'Peppers'],
};

export const NUTRITION_DISCLAIMER =
  'General sports-nutrition education, not medical advice. Athletes with health conditions, allergies, or who want a personal plan should talk with a doctor or registered dietitian. Never skip meals to make weight.';

/* ---------- Fuel cards (docs/content/fuel-cards.md) ---------- */

/** When a card shows first, mapped from the day logic (fuelDay): rest, lift, practice, match, tournament, pre-match. */
export type CardDay = 'all' | 'rest' | 'lift' | 'practice' | 'match' | 'tournament' | 'pre-match';
export type FuelCard = { id: number; title: string; days: CardDay[]; body: string; source: string };

/** Shown on every card (fuel-cards.md). */
export const FUEL_CARD_NOTE =
  'General information for healthy athletes, not individual advice. Talk to a doctor or registered dietitian about your own needs, allergies, or health conditions.';

const ACSM = 'ACSM / Academy of Nutrition and Dietetics / Dietitians of Canada, Nutrition and Athletic Performance, joint position statement, 2016.';
const ACSM_SHORT = 'ACSM / AND / DC joint position statement, 2016.';

export const FUEL_CARDS: FuelCard[] = [
  {
    id: 1,
    title: 'Eat enough to train',
    days: ['all'],
    body: "Training hard and growing at the same time takes a lot of fuel. Eat regular meals and snacks through the day instead of skipping meals. If you're often tired, sore for days, or getting sick a lot, talk to a parent, coach, or doctor.",
    source: ACSM,
  },
  {
    id: 2,
    title: 'Before practice or a lift',
    days: ['practice', 'lift'],
    body: 'Have a meal 3–4 hours before, or a lighter snack 1–2 hours before. Choose foods with carbs that sit well in your stomach: a sandwich, rice bowl, fruit and yogurt, or a granola bar. Go easy on very greasy or high-fiber foods right before you play.',
    source: ACSM_SHORT,
  },
  {
    id: 3,
    title: 'After you train',
    days: ['lift', 'practice', 'match'],
    body: 'Within a couple of hours after training, eat a meal or snack with both protein and carbs: chocolate milk, a turkey sandwich, yogurt with fruit, or eggs and toast. It helps your body recover for tomorrow.',
    source: ACSM_SHORT,
  },
  {
    id: 4,
    title: 'The day before a match',
    days: ['pre-match'],
    body: "Eat normal, familiar meals with plenty of carbs (pasta, rice, potatoes, bread) and drink water through the day. It's not the day to try a new food.",
    source: ACSM_SHORT,
  },
  {
    id: 5,
    title: 'Match day',
    days: ['match'],
    body: "Eat a familiar meal 3–4 hours before your match. If it's closer than that, have a small carb snack like a banana, crackers, or a bagel. Bring water.",
    source: ACSM_SHORT,
  },
  {
    id: 6,
    title: 'Tournament days',
    days: ['tournament'],
    body: 'Long days need a plan. Pack easy snacks for between matches (fruit, pretzels, sandwiches, granola bars) and a water bottle. Eat small amounts often instead of one big meal in the middle of the day.',
    source: ACSM_SHORT,
  },
  {
    id: 7,
    title: 'Hydration',
    days: ['all'],
    body: "Drink water through the day, not just at practice. Bring a bottle to every practice and match and drink during breaks. Pale-yellow urine is a simple sign you're drinking enough. In hot gyms, or on long days, you'll need more.",
    source: "National Athletic Trainers' Association, Position Statement: Fluid Replacement for the Physically Active, 2017.",
  },
  {
    id: 8,
    title: 'Sports drinks and energy drinks',
    days: ['all'],
    body: "For most practices, water is enough. Sports drinks can help during long, hot, or very sweaty sessions and tournament days. Energy drinks aren't recommended for teens: their caffeine and other stimulants aren't a safe way to get energy.",
    source: 'American Academy of Pediatrics, Sports Drinks and Energy Drinks for Children and Adolescents, clinical report, 2011.',
  },
  {
    id: 9,
    title: 'Rest days',
    days: ['rest'],
    body: "Rest days are when your body rebuilds, so keep eating regular meals. Rest days aren't a reason to skip food.",
    source: ACSM_SHORT,
  },
];

/** The day's tags, from the same inputs as fuelDay. */
export function cardDaysFor(day: DayType, lifting: boolean, matchTomorrow = false): CardDay[] {
  const tags: CardDay[] = [];
  if (day === 'off' && !lifting) tags.push('rest');
  if (lifting) tags.push('lift');
  if (day === 'practice') tags.push('practice');
  if (day === 'game') tags.push('match');
  if (day === 'tournament') tags.push('tournament');
  if (matchTomorrow && day !== 'game' && day !== 'tournament') tags.push('pre-match');
  return tags;
}

/** Cards matching the day first (then every-day cards), then the rest, in the doc's order. */
export function cardsFor(day: DayType, lifting: boolean, matchTomorrow = false): { today: FuelCard[]; rest: FuelCard[] } {
  const tags = cardDaysFor(day, lifting, matchTomorrow);
  const specific = FUEL_CARDS.filter((c) => c.days.some((d) => tags.includes(d)));
  const always = FUEL_CARDS.filter((c) => c.days.includes('all'));
  const today = [...specific, ...always];
  return { today, rest: FUEL_CARDS.filter((c) => !today.includes(c)) };
}
