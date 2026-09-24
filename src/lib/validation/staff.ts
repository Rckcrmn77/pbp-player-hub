import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Choose a ${label}.`);

const time = (label: string) => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, `Choose a ${label}.`);

const blankToNull = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values)]).transform((v) => (v === "" ? null : v));

export const programSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a program name.").max(200, "Keep it under 200 characters."),
    location: optionalText(200),
    ageGroup: blankToNull(["youth", "middle_school", "high_school"] as const),
    program: blankToNull(["boys", "girls"] as const),
    startDate: isoDate("start date"),
    endDate: isoDate("end date"),
    scheduleDescription: optionalText(1000),
    registrationUrl: z
      .string()
      .trim()
      .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use a full link starting with https://")
      .transform((v) => (v === "" ? null : v)),
    status: z.enum(["draft", "open", "active", "completed", "archived"], { error: "Choose a status." }),
  })
  .refine((p) => p.endDate >= p.startDate, {
    message: "The end date must be on or after the start date.",
    path: ["endDate"],
  });

export type ProgramInput = z.output<typeof programSchema>;

export function toProgramColumns(p: ProgramInput) {
  return {
    name: p.name,
    location: p.location,
    age_group: p.ageGroup,
    program: p.program,
    start_date: p.startDate,
    end_date: p.endDate,
    schedule_description: p.scheduleDescription,
    registration_url: p.registrationUrl,
    status: p.status,
  };
}

export const sessionSchema = z
  .object({
    date: isoDate("date"),
    startTime: time("start time"),
    endTime: time("end time"),
    location: optionalText(200),
    repeatWeeks: z.coerce
      .number({ error: "Choose how many weeks." })
      .int()
      .min(1, "Choose between 1 and 20 weeks.")
      .max(20, "Choose between 1 and 20 weeks."),
  })
  .refine((s) => s.endTime > s.startTime, {
    message: "The end time must be after the start time.",
    path: ["endTime"],
  });

export const enrollmentSchema = z.object({
  playerId: z.uuid({ error: "Choose a player." }),
  status: z.enum(["pending", "active", "waitlisted", "withdrawn", "completed"], {
    error: "Choose a status.",
  }),
});

export const assignmentSchema = z.object({
  coachId: z.uuid({ error: "Choose a coach." }),
  assignmentRole: z.enum(["lead", "assistant"], { error: "Choose a role." }),
});

export const roleChangeSchema = z.object({
  profileId: z.uuid(),
  role: z.enum(["parent", "coach", "admin"]),
});

const attendanceStatus = z.enum(["present", "absent", "excused", "makeup"]);

/** Reads `status:<playerId>` fields from the attendance form. Blank means "not recorded". */
export function parseAttendance(
  formData: FormData,
): { playerId: string; status: z.infer<typeof attendanceStatus> }[] {
  const rows: { playerId: string; status: z.infer<typeof attendanceStatus> }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("status:") || value === "") continue;
    const playerId = z.uuid().safeParse(key.slice("status:".length));
    const status = attendanceStatus.safeParse(value);
    if (playerId.success && status.success) rows.push({ playerId: playerId.data, status: status.data });
  }
  return rows;
}
