import type { AgeGroup, ExperienceLevel, LacrosseProgram, PlayerPosition } from "@/lib/supabase/types";

/** Display labels for the player profile choices (values match the database enums). */

export const ageGroupOptions: { value: AgeGroup; label: string }[] = [
  { value: "youth", label: "Youth (grades 3–5)" },
  { value: "middle_school", label: "Middle school (grades 6–8)" },
  { value: "high_school", label: "High school" },
];

export const programOptions: { value: LacrosseProgram; label: string }[] = [
  { value: "boys", label: "Boys lacrosse" },
  { value: "girls", label: "Girls lacrosse" },
];

export const positionOptions: { value: PlayerPosition; label: string }[] = [
  { value: "attack", label: "Attack" },
  { value: "midfield", label: "Midfield" },
  { value: "faceoff_draw", label: "Faceoff / Draw" },
  { value: "defense", label: "Defense" },
  { value: "lsm", label: "LSM" },
  { value: "goalie", label: "Goalie" },
];

export const experienceOptions: { value: ExperienceLevel; label: string }[] = [
  { value: "new", label: "New to lacrosse" },
  { value: "one_year", label: "1 year" },
  { value: "two_years", label: "2 years" },
  { value: "three_to_four_years", label: "3–4 years" },
  { value: "five_plus_years", label: "5+ years" },
];

/** Limits match the database checks in supabase/migrations. */
export const GRADUATION_YEAR_MIN = 2027;
export const GRADUATION_YEAR_MAX = 2038;
export const BIRTH_YEAR_MIN = 2005;
export const BIRTH_YEAR_MAX = 2025;

export function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export function labelFor<T extends string>(options: { value: T; label: string }[], value: T | null): string {
  return options.find((o) => o.value === value)?.label ?? "—";
}
