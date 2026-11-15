import type { Role } from './types';

/** `?role=coach|athlete` from the website's sign-in links; anything else is ignored (2.2.1 §9). */
export function roleParam(v: unknown): Role | null {
  return v === 'coach' || v === 'athlete' ? v : null;
}
