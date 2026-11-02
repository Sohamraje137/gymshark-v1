/**
 * Demo data for development:  npm run seed
 * Only touches users with an @demo.local email (and their data), so it is safe to re-run.
 */
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { addDays, mondayOf, todayIn } from "../src/lib/dates";
import {
  ActivityLog,
  CheckIn,
  ClientProfile,
  CoachingSession,
  CoachNote,
  MealLog,
  Message,
  User,
  WorkoutLog,
} from "../src/models";

const TZ = "America/New_York";

async function main() {
  await connectDB();

  // Wipe previous demo data.
  const old = await User.find({ email: /@demo\.local$/ }, "_id").lean();
  const oldIds = old.map((u) => u._id);
  await Promise.all([
    ClientProfile.deleteMany({ user: { $in: oldIds } }),
    MealLog.deleteMany({ client: { $in: oldIds } }),
    WorkoutLog.deleteMany({ client: { $in: oldIds } }),
    ActivityLog.deleteMany({ client: { $in: oldIds } }),
    CheckIn.deleteMany({ client: { $in: oldIds } }),
    CoachingSession.deleteMany({ client: { $in: oldIds } }),
    CoachNote.deleteMany({ client: { $in: oldIds } }),
    Message.deleteMany({ conversation: { $in: oldIds } }),
    CoachingSession.deleteMany({ coach: { $in: oldIds } }),
  ]);
  await User.deleteMany({ _id: { $in: oldIds } });

  const coach = await User.create({ email: "coach@demo.local", name: "Sam Coach", role: "coach" });
  const alex = await User.create({ email: "alex@demo.local", name: "Alex Rivera", role: "client" });
  const priya = await User.create({ email: "priya@demo.local", name: "Priya Shah", role: "client" });

  const today = todayIn(TZ);

  await ClientProfile.create({
    user: alex._id,
    status: "active",
    timeZone: TZ,
    onboarding: {
      goals: "Lose 6 kg of fat while keeping strength. Run a 10k in spring.",
      dateOfBirth: "1991-04-12",
      sex: "male",
      heightCm: 180,
      startWeightKg: 88,
      targetWeightKg: 82,
      activityLevel: "moderate",
      trainingExperience: "intermediate",
      injuries: "Old left knee sprain, fine with squats.",
      dietaryPreferences: "No pork.",
      availability: "Gym Mon/Wed/Fri 7am, runs on weekends.",
      completedAt: new Date(Date.now() - 30 * 864e5),
    },
    targets: { calories: 2300, proteinG: 170, carbsG: 230, fatG: 75, steps: 9000, workoutsPerWeek: 4 },
  });
  await ClientProfile.create({ user: priya._id, status: "onboarding", timeZone: TZ });

  // Last 7 days of logs for Alex.
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    await MealLog.insertMany([
      { client: alex._id, date, mealType: "breakfast", description: "Greek yogurt, berries, granola", calories: 420, proteinG: 32, carbsG: 50, fatG: 10 },
      { client: alex._id, date, mealType: "lunch", description: "Chicken rice bowl", calories: 680, proteinG: 52, carbsG: 75, fatG: 18 },
      { client: alex._id, date, mealType: "dinner", description: "Salmon, potatoes, greens", calories: 720, proteinG: 45, carbsG: 60, fatG: 30 },
    ]);
    await ActivityLog.create({ client: alex._id, date, type: "steps", value: 7000 + i * 600, unit: "steps" });
    if (i % 2 === 0) {
      await WorkoutLog.create({
        client: alex._id,
        date,
        title: i % 4 === 0 ? "Upper body" : "Lower body",
        durationMin: 60,
        exercises:
          i % 4 === 0
            ? [
                { name: "Bench press", sets: [{ reps: 8, weightKg: 80 }, { reps: 8, weightKg: 80 }, { reps: 6, weightKg: 82.5 }] },
                { name: "Pull-up", sets: [{ reps: 10 }, { reps: 8 }, { reps: 8 }] },
              ]
            : [
                { name: "Back squat", sets: [{ reps: 5, weightKg: 110 }, { reps: 5, weightKg: 110 }, { reps: 5, weightKg: 110 }] },
                { name: "Romanian deadlift", sets: [{ reps: 8, weightKg: 90 }, { reps: 8, weightKg: 90 }] },
              ],
      });
    }
  }

  // Weekly check-ins: two reviewed, the latest waiting for the coach.
  const thisMonday = mondayOf(today);
  await CheckIn.insertMany([
    { client: alex._id, weekOf: addDays(thisMonday, -21), weightKg: 87.1, waistCm: 92, energy: 3, sleepQuality: 3, stress: 3, hunger: 4, adherence: 3, wins: "Hit protein most days.", struggles: "Late-night snacking.", coachFeedback: "Good start. Move dinner earlier and add a protein snack at 9pm.", reviewedAt: new Date(Date.now() - 20 * 864e5) },
    { client: alex._id, weekOf: addDays(thisMonday, -14), weightKg: 86.4, waistCm: 91, energy: 4, sleepQuality: 4, stress: 2, hunger: 3, adherence: 4, wins: "No snacking after 9pm.", struggles: "Missed Friday session.", coachFeedback: "Great week. Keep it up.", reviewedAt: new Date(Date.now() - 13 * 864e5) },
    { client: alex._id, weekOf: addDays(thisMonday, -7), weightKg: 85.9, waistCm: 90.5, energy: 4, sleepQuality: 3, stress: 3, hunger: 3, adherence: 4, wins: "Squat PR at 110 kg x5.", struggles: "Sleep was short mid-week.", questions: "Should I add a deload week?" },
  ]);

  // Calls: a completed monthly review and an upcoming weekly check-in.
  const at = (daysFromNow: number, hour: number, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  await CoachingSession.insertMany([
    { client: alex._id, coach: coach._id, type: "monthly_review", title: "Monthly review: Alex", startsAt: at(-10, 18), endsAt: at(-10, 19), status: "completed", agenda: "Review first month, set new targets.", outcome: "Dropped calories to 2300. Added 4th workout." },
    { client: alex._id, coach: coach._id, type: "weekly_checkin", title: "Weekly check-in: Alex", startsAt: at(1, 18), endsAt: at(1, 18, 30), agenda: "Deload question, sleep." },
    { client: priya._id, coach: coach._id, type: "onboarding", title: "Onboarding call: Priya", startsAt: at(2, 12), endsAt: at(2, 13) },
  ]);

  await CoachNote.insertMany([
    { client: alex._id, author: coach._id, body: "Responds well to clear numbers. Prefers short check-ins.", pinned: true, tags: ["communication"] },
    { client: alex._id, author: coach._id, body: "Knee is fine on squats; avoid deep lunges for now.", tags: ["injury"] },
  ]);

  await Message.insertMany([
    { conversation: alex._id, sender: alex._id, fromCoach: false, body: "Hit a squat PR today!" },
    { conversation: alex._id, sender: coach._id, fromCoach: true, body: "Huge! Let's talk deload on Thursday." },
  ]);

  console.log("Seeded demo users: coach@demo.local, alex@demo.local, priya@demo.local");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
