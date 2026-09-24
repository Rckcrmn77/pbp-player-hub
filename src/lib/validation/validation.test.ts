import { describe, expect, it } from "vitest";

import { newPasswordSchema, safeNextPath, signUpSchema } from "./auth";
import { formValues, validationError } from "./form";
import { playerSchema, toPlayerColumns } from "./player";

const validPlayer = {
  firstName: " Casey ",
  lastName: "Example",
  birthYear: "2013",
  graduationYear: "2031",
  ageGroup: "middle_school",
  program: "boys",
  primaryPosition: "attack",
  secondaryPosition: "",
  experienceLevel: "two_years",
  teamOrSchool: "",
  goals: "Improve off-hand",
  strengths: "",
  improvementAreas: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

describe("playerSchema", () => {
  it("accepts a complete profile and turns blanks into null", () => {
    const parsed = playerSchema.parse(validPlayer);
    const columns = toPlayerColumns(parsed);
    expect(columns.first_name).toBe("Casey");
    expect(columns.birth_year).toBe(2013);
    expect(columns.secondary_position).toBeNull();
    expect(columns.team_or_school).toBeNull();
    expect(columns.goals).toBe("Improve off-hand");
  });

  it("rejects graduation years outside the supported range", () => {
    const result = playerSchema.safeParse({ ...validPlayer, graduationYear: "2040" });
    expect(result.success).toBe(false);
  });

  it("rejects a secondary position that repeats the primary", () => {
    const result = playerSchema.safeParse({ ...validPlayer, secondaryPosition: "attack" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["secondaryPosition"]);
  });

  it("rejects values that are not database options", () => {
    expect(playerSchema.safeParse({ ...validPlayer, primaryPosition: "quarterback" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = {
    firstName: "Pat",
    lastName: "Parent",
    email: " Pat@Example.COM ",
    password: "long-enough-password",
    acceptTerms: "on",
  };

  it("normalises the email address", () => {
    expect(signUpSchema.parse(valid).email).toBe("pat@example.com");
  });

  it("requires accepting the terms", () => {
    expect(signUpSchema.safeParse({ ...valid, acceptTerms: undefined }).success).toBe(false);
  });

  it("requires a password of at least 10 characters", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = newPasswordSchema.safeParse({
      password: "long-enough-1",
      confirmPassword: "long-enough-2",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
  });
});

describe("safeNextPath", () => {
  it("allows paths on this site", () => {
    expect(safeNextPath("/parent/players/new")).toBe("/parent/players/new");
  });

  it("blocks redirects to other sites", () => {
    expect(safeNextPath("https://evil.example")).toBe("/parent");
    expect(safeNextPath("//evil.example")).toBe("/parent");
    expect(safeNextPath("/\\evil.example")).toBe("/parent");
    expect(safeNextPath(null, "")).toBe("");
  });
});

describe("form helpers", () => {
  it("keeps submitted values except omitted fields", () => {
    const data = new FormData();
    data.set("email", "a@b.co");
    data.set("password", "secret");
    expect(formValues(data, ["password"])).toEqual({ email: "a@b.co" });
  });

  it("groups validation messages by field", () => {
    const result = signUpSchema.safeParse({});
    if (result.success) throw new Error("expected failure");
    const state = validationError(result.error, {});
    expect(state.status).toBe("error");
    expect(Object.keys(state.fieldErrors ?? {})).toEqual(
      expect.arrayContaining(["firstName", "lastName", "email", "password", "acceptTerms"]),
    );
  });
});
