import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Suggestion = { _id?: string; title: string; reason: string; focus?: string; minutes?: number; difficulty?: string };
type WorkoutState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; suggestions: Suggestion[] };

export default function Workouts() {
  const [state, setState] = useState<WorkoutState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const userEmail = 'mona@example.com';
    getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions }) => {
        if (active) setState({ status: 'success', suggestions });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns for mona@example.com.</p>
        {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
        {state.status === 'error' && <p role="alert">Unable to load workout suggestions.</p>}
        {state.status === 'success' && (
          state.suggestions.length === 0
            ? <p>No workout suggestions yet.</p>
            : <ul>{state.suggestions.map((suggestion, index) => (
              <li key={suggestion._id ?? index}>
                <strong>{suggestion.title}</strong>: {suggestion.reason}
                {suggestion.focus && ` - ${suggestion.focus}`}
                {suggestion.minutes !== undefined && `, ${suggestion.minutes} minutes`}
                {suggestion.difficulty && `, ${suggestion.difficulty}`}
              </li>
            ))}</ul>
        )}
      </div>
    </section>
  );
}
