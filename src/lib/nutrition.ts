import type { DayType } from './types';

/**
 * General sports-nutrition guidance for volleyball athletes, based on
 * common sports-dietitian ranges (grams per kg of body weight).
 * This is education, not a meal plan. It deliberately shows fuel targets
 * and plate guidance rather than calorie counts, since many users are teens.
 */

export type FuelLevel = 'rest' | 'moderate' | 'high' | 'very-high';

export type FuelDay = {
  level: FuelLevel;
  title: string;
  summary: string;
  carbsPerKg: [number, number];
  proteinPerKg: [number, number];
  plate: { carbs: number; protein: number; veg: number }; // fractions of a plate
  timing: { when: string; what: string }[];
  fluidsExtraOz: number; // on top of baseline, for training/match time
};

const LB_PER_KG = 2.2046;

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
    carbsPerKg: [Math.max(base.carbsPerKg[0], 5), Math.max(base.carbsPerKg[1], 7)],
    plate: { carbs: 0.45, protein: 0.25, veg: 0.3 },
    fluidsExtraOz: base.fluidsExtraOz + 16,
    timing: [
      ...base.timing,
      { when: 'Dinner tonight', what: 'Carb-focused meal you know sits well: pasta, rice, potatoes with lean protein.' },
    ],
  };
}

function baseFuelDay(day: DayType, lifting: boolean): FuelDay {
  const level = fuelLevel(day, lifting);
  const protein: [number, number] = [1.4, 1.8];

  if (day === 'tournament') {
    return {
      level,
      title: 'Tournament day',
      summary: 'Long day, several matches. Keep topping up carbs and fluids all day.',
      carbsPerKg: [7, 8],
      proteinPerKg: protein,
      plate: { carbs: 0.5, protein: 0.25, veg: 0.25 },
      fluidsExtraOz: 48,
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
      carbsPerKg: [6, 7],
      proteinPerKg: protein,
      plate: { carbs: 0.5, protein: 0.25, veg: 0.25 },
      fluidsExtraOz: 32,
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
      carbsPerKg: lifting ? [5, 7] : [5, 6],
      proteinPerKg: protein,
      plate: { carbs: 0.4, protein: 0.3, veg: 0.3 },
      fluidsExtraOz: lifting ? 32 : 24,
      timing: [
        { when: 'Meals', what: '3 meals, each with protein, a carb and a fruit or vegetable.' },
        { when: '1–2 hrs before practice', what: 'Snack: fruit + string cheese, toast with peanut butter, yogurt.' },
        { when: 'During', what: 'Water. Sports drink if practice is longer than 90 min or very hot.' },
        { when: lifting ? 'After practice + lift' : 'After practice', what: 'Within 1 hr: 20–30 g protein + carbs. Chocolate milk, turkey wrap, rice and chicken.' },
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
    carbsPerKg: lifting ? [4, 5] : [3, 4],
    proteinPerKg: protein,
    plate: { carbs: 0.3, protein: 0.3, veg: 0.4 },
    fluidsExtraOz: lifting ? 16 : 0,
    timing: [
      { when: 'Meals', what: '3 balanced meals with protein, carbs, fruits and vegetables.' },
      { when: 'Snacks', what: '1–2 snacks with protein: yogurt, nuts, eggs, cheese and crackers.' },
      ...(lifting
        ? [{ when: 'After your lift', what: '20–30 g protein + carbs within an hour.' }]
        : [{ when: 'Recovery', what: 'Sleep 8–10 hours. Sleep is when muscles rebuild.' }]),
    ],
  };
}

export type FuelTargets = {
  carbsG: [number, number];
  proteinG: [number, number];
  proteinPerMealG: [number, number];
  fluidsOz: [number, number];
};

/** Grams per day, rounded to 5 g. Returns null when body weight is unknown. */
export function fuelTargets(day: FuelDay, bodyWeightLb: number | null): FuelTargets | null {
  if (!bodyWeightLb || bodyWeightLb <= 0) return null;
  const kg = bodyWeightLb / LB_PER_KG;
  const r5 = (n: number) => Math.round(n / 5) * 5;
  const baseFluid = bodyWeightLb * 0.5; // oz
  return {
    carbsG: [r5(day.carbsPerKg[0] * kg), r5(day.carbsPerKg[1] * kg)],
    proteinG: [r5(day.proteinPerKg[0] * kg), r5(day.proteinPerKg[1] * kg)],
    proteinPerMealG: [Math.max(15, r5(0.25 * kg)), Math.max(20, r5(0.4 * kg))],
    fluidsOz: [Math.round(baseFluid + day.fluidsExtraOz), Math.round(baseFluid * 1.3 + day.fluidsExtraOz)],
  };
}

export const FOOD_IDEAS = {
  carbs: ['Rice', 'Pasta', 'Oatmeal', 'Bread / bagels / tortillas', 'Potatoes', 'Fruit', 'Cereal', 'Granola bars'],
  protein: ['Chicken / turkey', 'Eggs', 'Greek yogurt', 'Milk / chocolate milk', 'Fish', 'Beans & lentils', 'Lean beef', 'Tofu'],
  veg: ['Any vegetables', 'Salad', 'Berries', 'Bananas', 'Oranges', 'Carrots', 'Broccoli', 'Peppers'],
};

export const NUTRITION_DISCLAIMER =
  'General sports-nutrition education, not medical advice. Athletes with health conditions, allergies, or who want a personal plan should talk with a doctor or registered dietitian. Never skip meals to make weight.';
