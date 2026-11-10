/**
 * Age question (2.1, S1). Asks month + year; keeps only the birth year and whether
 * the person is under 18. The month is used once, here, and never saved.
 *
 * When the birth month is the current month we can't tell if the birthday has
 * passed, so we count them as the younger age (safer for both the 13 and 18 lines).
 */
export type AgeAnswer = { birthYear: number; isMinor: boolean; under13: boolean };

export function ageFrom(month: number, year: number, now = new Date()): AgeAnswer {
  const thisMonth = now.getMonth() + 1;
  const age = now.getFullYear() - year - (thisMonth <= month ? 1 : 0);
  return { birthYear: year, isMinor: age < 18, under13: age < 13 };
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Every year from this one back 100 years (no hint of any cutoff). */
export function yearOptions(now = new Date()) {
  const y = now.getFullYear();
  return Array.from({ length: 101 }, (_, i) => ({ value: y - i, label: String(y - i) }));
}
