import { isGeneral } from './general';
import { useStore } from './store';
import { useTeams } from './team';

/**
 * 2.3.0: is the person's view a general (trainer) team's?
 *  - Clients: the team whose program they follow is general (works offline through the mirrored program's `general` flag).
 *  - Trainers: every team they run is general (a coach with any volleyball team keeps the volleyball tabs).
 */
export function useGeneralView(): boolean {
  const { data, activeProgram } = useStore();
  const { teams } = useTeams();
  if (data.profile?.role === 'coach') return teams.length > 0 && teams.every(isGeneral);
  const lift = teams.find((t) => t.isLiftProgram) ?? teams.find((t) => t.id === data.liftTeamId) ?? teams[0];
  return lift ? isGeneral(lift) : !!activeProgram?.general;
}
