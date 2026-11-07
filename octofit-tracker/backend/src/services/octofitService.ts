import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Activity must be an object'), { status: 400 });
  }
  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' || !mongoose.isValidObjectId(userId) ||
    typeof teamId !== 'string' || !mongoose.isValidObjectId(teamId) ||
    typeof type !== 'string' || !type.trim() ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw Object.assign(new Error('Valid userId, teamId, type, and positive minutes are required'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw Object.assign(new Error('User or team not found'), { status: 404 });
  }

  return Activity.create({ user: userId, team: teamId, type, minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team must be an object'), { status: 400 });
  }
  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof mascot !== 'string' || !mascot.trim() ||
    !Array.isArray(members) ||
    !members.every((member) => typeof member === 'string' && mongoose.isValidObjectId(member))
  ) {
    throw Object.assign(new Error('Valid name, mascot, and member IDs are required'), { status: 400 });
  }

  const uniqueMembers = [...new Set(members.map((member: string) => member.toLowerCase()))];
  if (await User.countDocuments({ _id: { $in: uniqueMembers } }) !== uniqueMembers.length) {
    throw Object.assign(new Error('One or more members not found'), { status: 404 });
  }
  return Team.create({ name, mascot, members: uniqueMembers });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    { $lookup: { from: Activity.collection.name, localField: '_id', foreignField: 'team', as: 'activities' } },
    { $project: { teamName: '$name', totalPoints: { $sum: '$activities.points' } } },
    { $sort: { totalPoints: -1, teamName: 1, _id: 1 } },
  ]);
  return teams.map(({ teamName, totalPoints }, index) => ({ teamName, totalPoints, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).lean(),
    Workout.find().sort({ title: 1, _id: 1 }).lean(),
  ]);
  const activityMinutes = new Map<string, number>();
  const enduranceActivities = new Set(['run', 'walk', 'cycle', 'swim']);
  for (const activity of activities) {
    const type = activity.type.trim().toLowerCase();
    const focus = enduranceActivities.has(type) ? 'endurance' : type;
    activityMinutes.set(focus, (activityMinutes.get(focus) ?? 0) + activity.minutes);
  }
  const goal = user.fitnessGoal.trim().toLowerCase();

  return workouts
    .map((workout) => {
      const focus = workout.focus.trim().toLowerCase();
      const minutes = activityMinutes.get(focus) ?? 0;
      const matchesGoal = focus === goal;
      return { workout, minutes, matchesGoal };
    })
    .filter(({ minutes, matchesGoal }) => minutes > 0 || matchesGoal)
    .sort((a, b) => b.minutes - a.minutes || Number(b.matchesGoal) - Number(a.matchesGoal))
    .map(({ workout, minutes }) => ({
      ...workout,
      reason: minutes > 0
        ? `Matches your ${workout.focus} activity`
        : `Matches your ${workout.focus} fitness goal`,
    }));
}

export { User };
