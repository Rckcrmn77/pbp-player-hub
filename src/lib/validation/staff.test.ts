import { describe, expect, it } from "vitest";

import { parseAttendance, programSchema, sessionSchema, toProgramColumns } from "./staff";

const program = {
  name: "Fall Skills Clinic",
  location: "Wilmington",
  ageGroup: "",
  program: "girls",
  startDate: "2026-10-01",
  endDate: "2026-11-30",
  scheduleDescription: "",
  registrationUrl: "",
  status: "open",
};

describe("programSchema", () => {
  it("maps blanks to null", () => {
    const columns = toProgramColumns(programSchema.parse(program));
    expect(columns.age_group).toBeNull();
    expect(columns.program).toBe("girls");
    expect(columns.registration_url).toBeNull();
  });

  it("rejects an end date before the start date", () => {
    const result = programSchema.safeParse({ ...program, endDate: "2026-09-01" });
    expect(result.success).toBe(false);
  });

  it("requires registration links to use https", () => {
    expect(programSchema.safeParse({ ...program, registrationUrl: "http://example.com" }).success).toBe(
      false,
    );
    expect(
      programSchema.safeParse({ ...program, registrationUrl: "https://example.com/register" }).success,
    ).toBe(true);
  });
});

describe("sessionSchema", () => {
  const session = {
    date: "2026-10-05",
    startTime: "17:00",
    endTime: "18:30",
    location: "",
    repeatWeeks: "4",
  };

  it("accepts a weekly series", () => {
    expect(sessionSchema.parse(session).repeatWeeks).toBe(4);
  });

  it("rejects an end time before the start time", () => {
    expect(sessionSchema.safeParse({ ...session, endTime: "16:00" }).success).toBe(false);
  });

  it("limits a series to 20 weeks", () => {
    expect(sessionSchema.safeParse({ ...session, repeatWeeks: "21" }).success).toBe(false);
  });
});

describe("parseAttendance", () => {
  it("reads recorded statuses and ignores blanks and bad values", () => {
    const data = new FormData();
    data.set("status:6f1c0d0e-8a5b-4c7e-9d2a-1b3c4d5e6f70", "present");
    data.set("status:7a2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d", "");
    data.set("status:not-a-uuid", "present");
    data.set("status:8b3c2d1e-0f9a-4b8c-9d7e-6f5a4b3c2d1e", "sleeping");
    expect(parseAttendance(data)).toEqual([
      { playerId: "6f1c0d0e-8a5b-4c7e-9d2a-1b3c4d5e6f70", status: "present" },
    ]);
  });
});
