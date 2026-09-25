import { describe, expect, it } from "vitest";

import {
  checkinWeeks,
  compareCategories,
  formatChange,
  summarizeAttendance,
  summarizeWork,
  weeksInRange,
} from "./progress";

describe("compareCategories", () => {
  it("pairs baseline and current averages and computes the change", () => {
    const rows = compareCategories(
      [
        { category: "Stick skills", average: 3, rated: 1 },
        { category: "Footwork", average: 2.5, rated: 2 },
        { category: "IQ", average: null, rated: 0 },
      ],
      [
        { category: "Footwork", average: 3.5, rated: 2 },
        { category: "Stick skills", average: 2.7, rated: 1 },
        { category: "Effort", average: 5, rated: 1 },
      ],
    );
    expect(rows).toEqual([
      { category: "Stick skills", baseline: 3, current: 2.7, change: -0.3 },
      { category: "Footwork", baseline: 2.5, current: 3.5, change: 1 },
      { category: "IQ", baseline: null, current: null, change: null },
      { category: "Effort", baseline: null, current: 5, change: null },
    ]);
  });

  it("has no current values before a follow-up assessment", () => {
    expect(compareCategories([{ category: "Stick skills", average: 3, rated: 1 }], null)).toEqual([
      { category: "Stick skills", baseline: 3, current: null, change: null },
    ]);
  });
});

describe("summaries", () => {
  it("counts attendance by status", () => {
    expect(summarizeAttendance(["present", "present", "absent", "makeup"])).toEqual({
      present: 2,
      absent: 1,
      excused: 0,
      makeup: 1,
      total: 4,
    });
  });

  it("counts weeks touched by a date range", () => {
    expect(weeksInRange("2026-10-05", "2026-10-11")).toBe(1);
    expect(weeksInRange("2026-10-08", "2026-10-12")).toBe(2);
    expect(weeksInRange("2026-10-05", "2026-11-01")).toBe(4);
    expect(weeksInRange("2026-10-12", "2026-10-05")).toBe(1);
  });

  it("totals check-in work", () => {
    expect(
      summarizeWork(
        [
          { assignment_completed: true, reps_completed: 200, minutes_completed: null, confidence: 3 },
          { assignment_completed: false, reps_completed: 50, minutes_completed: 20, confidence: 4 },
        ],
        "2026-10-05",
        "2026-10-25",
      ),
    ).toEqual({
      weeksInPlan: 3,
      checkIns: 2,
      weeksCompleted: 1,
      totalReps: 250,
      totalMinutes: 20,
      averageConfidence: 3.5,
    });
    expect(summarizeWork([], "2026-10-05", "2026-10-05").averageConfidence).toBeNull();
  });

  it("formats changes with a sign", () => {
    expect(formatChange(0.5)).toBe("+0.5");
    expect(formatChange(-1)).toBe("−1.0");
    expect(formatChange(0)).toBe("0.0");
    expect(formatChange(null)).toBe("—");
  });
});

describe("checkinWeeks", () => {
  it("offers this week and last week", () => {
    expect(checkinWeeks("2026-09-01", "2026-10-08")).toEqual(["2026-10-05", "2026-09-28"]);
  });

  it("never offers a week before the Blueprint started", () => {
    expect(checkinWeeks("2026-10-06", "2026-10-08")).toEqual(["2026-10-05"]);
  });
});

describe("validation", async () => {
  const { checkinSchema, reportSchema } = await import("@/lib/validation/progress");

  it("parses a check-in", () => {
    const parsed = checkinSchema.parse({
      weekStart: "2026-10-05",
      assignmentCompleted: "yes",
      repsCompleted: "0",
      minutesCompleted: "",
      confidence: "4",
      reflection: "  Better left hand. ",
      questionForCoach: "",
    });
    expect(parsed).toEqual({
      weekStart: "2026-10-05",
      assignmentCompleted: true,
      repsCompleted: 0,
      minutesCompleted: null,
      confidence: 4,
      reflection: "Better left hand.",
      questionForCoach: null,
    });
  });

  it("requires yes/no and a confidence rating", () => {
    const result = checkinSchema.safeParse({
      weekStart: "2026-10-05",
      repsCompleted: "x",
      minutesCompleted: "",
    });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["assignmentCompleted", "confidence", "repsCompleted"]));
  });

  it("parses report text and an optional program", () => {
    expect(
      reportSchema.parse({
        coachObservations: "Great month.",
        strengths: "",
        nextPriorities: "",
        actionPlan: "",
        recommendedProgramId: "",
      }),
    ).toEqual({
      coachObservations: "Great month.",
      strengths: null,
      nextPriorities: null,
      actionPlan: null,
      recommendedProgramId: null,
    });
  });
});
