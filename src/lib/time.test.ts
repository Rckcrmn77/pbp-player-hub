import { describe, expect, it } from "vitest";

import { addDays, dateKey, formatSessionTime, formatWeek, timeKey, weekStart, zonedToUtc } from "./time";

describe("zonedToUtc", () => {
  it("converts Eastern Daylight Time", () => {
    expect(zonedToUtc("2026-10-05", "17:00").toISOString()).toBe("2026-10-05T21:00:00.000Z");
  });

  it("converts Eastern Standard Time", () => {
    expect(zonedToUtc("2026-12-07", "17:00").toISOString()).toBe("2026-12-07T22:00:00.000Z");
  });

  it("handles the day daylight saving time ends", () => {
    // 1 Nov 2026: clocks go back at 2:00. 18:00 that evening is EST.
    expect(zonedToUtc("2026-11-01", "18:00").toISOString()).toBe("2026-11-01T23:00:00.000Z");
  });
});

describe("dateKey and timeKey", () => {
  it("uses Wilmington's calendar date, not UTC's", () => {
    // 01:30 UTC on 6 Oct is still 5 Oct in the evening in Wilmington.
    expect(dateKey("2026-10-06T01:30:00Z")).toBe("2026-10-05");
    expect(timeKey("2026-10-06T01:30:00Z")).toBe("21:30");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-29", 7)).toBe("2027-01-05");
  });
});

describe("formatSessionTime", () => {
  it("shows the day and the start and end times", () => {
    expect(formatSessionTime("2026-10-05T21:00:00Z", "2026-10-05T22:30:00Z")).toBe(
      "Mon, Oct 5 · 5:00 PM – 6:30 PM",
    );
  });
});

describe("weekStart and formatWeek", () => {
  it("returns the Monday of the week", () => {
    expect(weekStart("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(weekStart("2026-10-08")).toBe("2026-10-05"); // Thursday
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday
    expect(weekStart("2027-01-01")).toBe("2026-12-28"); // across a year
  });

  it("labels a week by its Monday", () => {
    expect(formatWeek("2026-10-05")).toBe("Week of Oct 5, 2026");
  });
});
