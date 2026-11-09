import { shareText } from './dialog';
import { encodeProgram } from './store';
import type { Program } from './types';

/** Send a program as a pasteable code (for solo athletes without an account). */
export async function shareProgramCode(p: Program, coachName?: string) {
  const intro =
    `${coachName ? coachName + ' sent you' : 'Here is'} a training program: "${p.name}".\n\n` +
    'To open it in Load & Launch: go to Plan, tap Import a program, then paste this whole message.\n\n';
  await shareText(intro + encodeProgram(p), `Load & Launch: ${p.name}`);
}

/** Invite athletes to a team by its join code. */
export async function shareTeamInvite(teamName: string, joinCode: string, coachName?: string) {
  const msg =
    `Join ${teamName} on Load & Launch${coachName ? ` (Coach ${coachName})` : ''}.\n\n` +
    `1. Open Load & Launch and make an athlete account.\n2. Enter team code: ${joinCode}\n\n` +
    'Your team workouts will show up in the app.';
  await shareText(msg, `Join ${teamName}`);
}
