import type { AssessmentType, BlueprintStatus, ReviewStatus } from "@/lib/supabase/types";

/** The charter's five initial assessment categories (section 4.4). */
export const charterCategories = [
  "Stick skills",
  "Footwork and athletic movement",
  "Position fundamentals",
  "Lacrosse IQ and decision-making",
  "Communication, confidence, and effort",
] as const;

export const ratingScale: { value: number; label: string }[] = [
  { value: 1, label: "1 · Beginning" },
  { value: 2, label: "2 · Developing" },
  { value: 3, label: "3 · Competent" },
  { value: 4, label: "4 · Strong" },
  { value: 5, label: "5 · Advanced" },
];

export const assessmentTypeLabels: Record<AssessmentType, string> = {
  baseline: "Baseline",
  follow_up: "Follow-up",
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  draft: "Draft",
  submitted: "Submitted for approval",
  approved: "Approved, awaiting publication",
  published: "Published to family",
};

export const blueprintStatusLabels: Record<BlueprintStatus, string> = {
  draft: "Draft (not visible to family)",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};
