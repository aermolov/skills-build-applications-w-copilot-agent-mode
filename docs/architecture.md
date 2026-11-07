# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Build React components for Activities, Teams, Leaderboard, and Workouts pages. Each page will have a form to create records and a list/table to display them. Use the shared API client to fetch and submit data. Display "Implementation pending" placeholders until API endpoints are working.

- Logic tier decision: Implement Express routes with TypeScript services for validation and business logic. All invalid input (missing fields, invalid IDs) responds with deliberate 4xx errors (never 500 from cast failures). Routes handle the full API contract: activities (CRUD + points calculation), teams (CRUD + member management), leaderboard (aggregation by points), and workout suggestions (pattern matching).

- Data tier decision: Define Mongoose schemas with required field validations. User, Team, Activity, and Workout models will validate on construction and sync. Activity.points is computed from type. Seed data includes representative users, teams, activities, and workouts for all four capabilities.

- Activity tracking approach: POST validates that userId and teamId refer to existing documents; compute points based on activity type (e.g., run=10, strength=8). GET returns all activities with populated user and team references.

- Team management approach: POST validates that name is present and rejects with 400 if missing. Teams have a members array of ObjectIds; POST can accept an optional members array or accept empty and populate via separate member-add endpoints. GET returns teams with members populated.

- Leaderboard approach: GET /api/leaderboard aggregates activities by team, sums points, sorts descending, and assigns 1-based ranks. Return an array of {teamName, totalPoints, rank}.

- Workout suggestions approach: GET /api/workouts/suggestions/:userEmail finds the user by email, analyzes their recent activity types and goal, selects a workout that matches, and returns {suggestions: [{title, focus, reason, difficulty, minutes}]}, where reason explains the recommendation based on activity pattern or goal.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Currently: 4 failed (User, Team, Activity, Workout schemas lack validators)
  - Success: All 5 tests pass (models validate required fields and relationships)

- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Currently: 4 failed (routes return 501; leaderboard empty; suggestions missing reason)
  - Failures: POST /activities and POST /teams return 501 instead of 400 on invalid input; GET /leaderboard returns empty array; GET /workouts/suggestions missing reason field
  - Success: All 4 tests pass (routes accept valid input with 201, reject invalid with 400, leaderboard computes ranks, suggestions include reason)

- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Currently: 15 failed (all pages show "Implementation pending" placeholder)
  - Failures: Missing activity list/form, teams list/form, leaderboard table, workout suggestions cards
  - Success: All 15 tests pass (pages render API data with accessible markup, forms submit correctly)

- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Validates TypeScript compilation and schema definitions

- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Validates React/Vite build with all components implemented
