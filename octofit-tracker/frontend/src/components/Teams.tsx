import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot?: string; members: string[] };
type TeamState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; teams: Team[] };

export default function Teams() {
  const [state, setState] = useState<TeamState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams }) => {
        if (active) setState({ status: 'success', teams });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {state.status === 'loading' && <p role="status">Loading teams...</p>}
        {state.status === 'error' && <p role="alert">Unable to load teams.</p>}
        {state.status === 'success' && (
          state.teams.length === 0
            ? <p>No teams yet.</p>
            : <ul>{state.teams.map((team, index) => (
              <li key={team._id ?? index}>
                {team.name}{team.mascot && ` (${team.mascot})`} - {team.members.length} members
              </li>
            ))}</ul>
        )}
      </div>
    </section>
  );
}
