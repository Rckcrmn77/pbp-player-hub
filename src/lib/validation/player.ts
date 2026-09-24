import { z } from "zod";

import {
  BIRTH_YEAR_MAX,
  BIRTH_YEAR_MIN,
  GRADUATION_YEAR_MAX,
  GRADUATION_YEAR_MIN,
} from "@/config/player-options";

const ageGroups = ["youth", "middle_school", "high_school"] as const;
const programs = ["boys", "girls"] as const;
const positions = ["attack", "midfield", "faceoff_draw", "defense", "lsm", "goalie"] as const;
const experience = ["new", "one_year", "two_years", "three_to_four_years", "five_plus_years"] as const;

const requiredName = (label: string) =>
  z.string().trim().min(1, `Enter the player's ${label}.`).max(100, "Keep it under 100 characters.");

/** Optional free text: blank becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

const year = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `Choose a ${label}.` })
    .int()
    .min(min, `Choose a ${label} between ${min} and ${max}.`)
    .max(max, `Choose a ${label} between ${min} and ${max}.`);

const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.enum(values, { error: message });

export const playerSchema = z
  .object({
    firstName: requiredName("first name"),
    lastName: requiredName("last name"),
    birthYear: year("birth year", BIRTH_YEAR_MIN, BIRTH_YEAR_MAX),
    graduationYear: year("graduation year", GRADUATION_YEAR_MIN, GRADUATION_YEAR_MAX),
    ageGroup: choice(ageGroups, "Choose an age group."),
    program: choice(programs, "Choose boys or girls lacrosse."),
    primaryPosition: choice(positions, "Choose a primary position."),
    secondaryPosition: z.union([z.literal(""), z.enum(positions)]).transform((v) => (v === "" ? null : v)),
    experienceLevel: choice(experience, "Choose an experience level."),
    teamOrSchool: optionalText(200),
    goals: optionalText(2000),
    strengths: optionalText(2000),
    improvementAreas: optionalText(2000),
    emergencyContactName: optionalText(200),
    emergencyContactPhone: optionalText(30),
  })
  .refine((p) => p.secondaryPosition === null || p.secondaryPosition !== p.primaryPosition, {
    message: "Choose a different secondary position, or leave it blank.",
    path: ["secondaryPosition"],
  });

export type PlayerInput = z.output<typeof playerSchema>;

/** Maps validated form input to database columns. */
export function toPlayerColumns(p: PlayerInput) {
  return {
    first_name: p.firstName,
    last_name: p.lastName,
    birth_year: p.birthYear,
    graduation_year: p.graduationYear,
    age_group: p.ageGroup,
    program: p.program,
    primary_position: p.primaryPosition,
    secondary_position: p.secondaryPosition,
    experience_level: p.experienceLevel,
    team_or_school: p.teamOrSchool,
    goals: p.goals,
    strengths: p.strengths,
    improvement_areas: p.improvementAreas,
    emergency_contact_name: p.emergencyContactName,
    emergency_contact_phone: p.emergencyContactPhone,
  };
}

export const parentProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(100, "Keep it under 100 characters."),
  lastName: z.string().trim().min(1, "Enter your last name.").max(100, "Keep it under 100 characters."),
  phone: optionalText(30),
});
