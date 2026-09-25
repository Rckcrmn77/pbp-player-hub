import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

const optionalCount = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), `Enter a whole number of ${label}, or leave it blank.`)
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || v <= 100000, `Enter a smaller number of ${label}.`);

// ---------------------------------------------------------------------------
// Weekly check-ins (charter section 4.7)
// ---------------------------------------------------------------------------

export const checkinSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the week."),
  assignmentCompleted: z.enum(["yes", "no"], { error: "Choose yes or no." }).transform((v) => v === "yes"),
  repsCompleted: optionalCount("reps"),
  minutesCompleted: optionalCount("minutes"),
  confidence: z.enum(["1", "2", "3", "4", "5"], { error: "Choose a confidence rating." }).transform(Number),
  reflection: optionalText(2000),
  questionForCoach: optionalText(1000),
});

export type CheckinInput = z.infer<typeof checkinSchema>;

// ---------------------------------------------------------------------------
// Progress reports (charter section 4.9)
// ---------------------------------------------------------------------------

export const reportSchema = z.object({
  coachObservations: optionalText(4000),
  strengths: optionalText(2000),
  nextPriorities: optionalText(2000),
  actionPlan: optionalText(4000),
  recommendedProgramId: z
    .union([z.literal(""), z.uuid({ error: "Choose a program." })])
    .transform((v) => (v === "" ? null : v)),
});
