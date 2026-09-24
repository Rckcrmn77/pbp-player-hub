import { describe, expect, it } from "vitest";

import { blueprintSchema, drillInput, drillSchema, parseScores, toDrillColumns } from "./assessment";

const A = "6f1c0d0e-8a5b-4c7e-9d2a-1b3c4d5e6f70";
const B = "7a2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d";

describe("drill form", () => {
  it("reads checkbox groups and the active switch", () => {
    const data = new FormData();
    data.set("title", "Wall ball");
    data.set("description", "");
    data.set("coachingPoints", "");
    data.set("skillCategory", "Stick skills");
    data.set("equipment", "");
    data.set("targetReps", "100");
    data.set("targetMinutes", "");
    data.set("videoUrl", "");
    data.append("positions", "attack");
    data.append("positions", "midfield");
    data.set("isActive", "on");
    const columns = toDrillColumns(drillSchema.parse(drillInput(data)));
    expect(columns.positions).toEqual(["attack", "midfield"]);
    expect(columns.age_groups).toEqual([]);
    expect(columns.target_reps).toBe(100);
    expect(columns.target_minutes).toBeNull();
    expect(columns.is_active).toBe(true);
  });

  it("rejects a non-https video link", () => {
    const data = new FormData();
    data.set("title", "x");
    data.set("description", "");
    data.set("skillCategory", "x");
    data.set("videoUrl", "http://example.com");
    expect(
      drillSchema.safeParse({
        ...drillInput(data),
        coachingPoints: "",
        equipment: "",
        targetReps: "",
        targetMinutes: "",
      }).success,
    ).toBe(false);
  });
});

describe("parseScores", () => {
  it("reads ratings and comments per criterion", () => {
    const data = new FormData();
    data.set(`rating:${A}`, "4");
    data.set(`comment:${A}`, " Soft hands ");
    data.set(`rating:${B}`, "");
    data.set(`comment:${B}`, "");
    const { scores, errors } = parseScores(data);
    expect(errors).toEqual({});
    expect(scores).toEqual(
      expect.arrayContaining([
        { criterionId: A, rating: 4, comment: "Soft hands" },
        { criterionId: B, rating: null, comment: "" },
      ]),
    );
  });

  it("rejects ratings outside 1 to 5", () => {
    const data = new FormData();
    data.set(`rating:${A}`, "6");
    expect(parseScores(data).errors[`rating:${A}`]).toBeDefined();
  });
});

describe("blueprintSchema", () => {
  it("rejects a review date before the start date", () => {
    const result = blueprintSchema.safeParse({
      playerGoals: "",
      coachSummary: "",
      startDate: "2026-10-01",
      reviewDate: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });
});
