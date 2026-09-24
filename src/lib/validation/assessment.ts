import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

const optionalPositiveInt = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), `Enter a whole number of ${label}.`)
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (v > 0 && v <= 100000), `Enter a number of ${label} above zero.`);

const blankToNull = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values)]).transform((v) => (v === "" ? null : v));

const positions = ["attack", "midfield", "faceoff_draw", "defense", "lsm", "goalie"] as const;
const ageGroups = ["youth", "middle_school", "high_school"] as const;
const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Choose a ${label}.`);

// ---------------------------------------------------------------------------
// Drills
// ---------------------------------------------------------------------------

export const drillSchema = z.object({
  title: z.string().trim().min(1, "Enter a drill title.").max(200, "Keep it under 200 characters."),
  description: z.string().trim().max(4000, "Keep this under 4000 characters."),
  coachingPoints: optionalText(4000),
  skillCategory: z
    .string()
    .trim()
    .min(1, "Choose a skill category.")
    .max(100, "Keep it under 100 characters."),
  equipment: optionalText(500),
  targetReps: optionalPositiveInt("reps"),
  targetMinutes: optionalPositiveInt("minutes"),
  videoUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use a full link starting with https://")
    .transform((v) => (v === "" ? null : v)),
  positions: z.array(z.enum(positions)),
  ageGroups: z.array(z.enum(ageGroups)),
  isActive: z.boolean(),
});

/** Checkbox groups and the active switch need FormData.getAll / presence checks. */
export function drillInput(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    positions: formData.getAll("positions"),
    ageGroups: formData.getAll("ageGroups"),
    isActive: formData.get("isActive") === "on",
  };
}

export function toDrillColumns(d: z.output<typeof drillSchema>) {
  return {
    title: d.title,
    description: d.description,
    coaching_points: d.coachingPoints,
    skill_category: d.skillCategory,
    equipment: d.equipment,
    target_reps: d.targetReps,
    target_minutes: d.targetMinutes,
    video_url: d.videoUrl,
    positions: d.positions,
    age_groups: d.ageGroups,
    is_active: d.isActive,
  };
}

// ---------------------------------------------------------------------------
// Templates and criteria
// ---------------------------------------------------------------------------

export const templateSchema = z.object({
  name: z.string().trim().min(1, "Enter a template name.").max(200, "Keep it under 200 characters."),
  description: optionalText(2000),
  ageGroup: blankToNull(ageGroups),
  position: blankToNull(positions),
  isActive: z.boolean(),
});

export const criterionSchema = z.object({
  category: z.string().trim().min(1, "Choose a category.").max(100, "Keep it under 100 characters."),
  name: z.string().trim().min(1, "Name what is being rated.").max(200, "Keep it under 200 characters."),
  description: optionalText(2000),
  sortOrder: z.coerce.number({ error: "Enter a number." }).int().min(0).max(999),
});

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export const startAssessmentSchema = z.object({
  templateId: z.uuid({ error: "Choose a template." }),
  assessmentType: z.enum(["baseline", "follow_up"], { error: "Choose baseline or follow-up." }),
  programId: z.union([z.literal(""), z.uuid()]).transform((v) => (v === "" ? null : v)),
  assessedOn: isoDate("date"),
});

export type ScoreEntry = { criterionId: string; rating: number | null; comment: string };

/** Reads `rating:<criterionId>` and `comment:<criterionId>` fields. */
export function parseScores(formData: FormData): { scores: ScoreEntry[]; errors: Record<string, string[]> } {
  const ids = new Set<string>();
  for (const key of formData.keys()) {
    const match = /^(rating|comment):(.+)$/.exec(key);
    if (match && z.uuid().safeParse(match[2]).success) ids.add(match[2]);
  }
  const scores: ScoreEntry[] = [];
  const errors: Record<string, string[]> = {};
  for (const criterionId of ids) {
    const rawRating = String(formData.get(`rating:${criterionId}`) ?? "");
    const comment = String(formData.get(`comment:${criterionId}`) ?? "").trim();
    const rating = rawRating === "" ? null : Number(rawRating);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      errors[`rating:${criterionId}`] = ["Choose a rating from 1 to 5."];
      continue;
    }
    if (comment.length > 2000) {
      errors[`comment:${criterionId}`] = ["Keep comments under 2000 characters."];
      continue;
    }
    scores.push({ criterionId, rating, comment });
  }
  return { scores, errors };
}

export const summarySchema = optionalText(4000);

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

export const blueprintSchema = z
  .object({
    playerGoals: optionalText(2000),
    coachSummary: optionalText(4000),
    startDate: isoDate("start date"),
    reviewDate: z
      .string()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Choose a review date.")
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((b) => b.reviewDate === null || b.reviewDate >= b.startDate, {
    message: "The review date must be on or after the start date.",
    path: ["reviewDate"],
  });

export const prioritySchema = z.object({
  rank: z.coerce.number({ error: "Choose a priority number." }).int().min(1).max(3),
  title: z.string().trim().min(1, "Name the priority.").max(200, "Keep it under 200 characters."),
  description: optionalText(2000),
});

export const blueprintDrillSchema = z.object({
  drillId: z.uuid({ error: "Choose a drill." }),
  weeklyReps: optionalPositiveInt("reps"),
  weeklyMinutes: optionalPositiveInt("minutes"),
  instructions: optionalText(2000),
  isAtHome: z.boolean(),
});
