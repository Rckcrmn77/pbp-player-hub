import { describe, expect, it } from "vitest";

import { categoryAverages, missingForSubmission } from "./assessment-summary";

const criteria = [
  { id: "a", category: "Stick skills", sort_order: 1, is_active: true },
  { id: "b", category: "Stick skills", sort_order: 2, is_active: true },
  { id: "c", category: "Footwork", sort_order: 3, is_active: true },
  { id: "d", category: "Retired", sort_order: 4, is_active: false },
];

describe("categoryAverages", () => {
  it("averages ratings per category in template order", () => {
    const result = categoryAverages(criteria, [
      { criterion_id: "a", rating: 3 },
      { criterion_id: "b", rating: 4 },
      { criterion_id: "d", rating: 5 },
    ]);
    expect(result).toEqual([
      { category: "Stick skills", average: 3.5, rated: 2 },
      { category: "Footwork", average: null, rated: 0 },
    ]);
  });
});

describe("missingForSubmission", () => {
  it("lists active criteria without a comment", () => {
    expect(
      missingForSubmission(criteria, [
        { criterion_id: "a", comment: "Good hands" },
        { criterion_id: "b", comment: "  " },
      ]),
    ).toEqual(["b", "c"]);
  });
});
