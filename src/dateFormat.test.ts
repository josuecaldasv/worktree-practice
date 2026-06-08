import { describe, it, expect } from "vitest";
import { formatDate } from "./dateFormat";

describe("formatDate (Bug B)", () => {
  it("formats June 8th 2026 as 2026-06-08", () => {
    // month index 5 = June (getMonth is zero-indexed)
    expect(formatDate(new Date(2026, 5, 8))).toBe("2026-06-08");
  });

  it("formats January 1st 2025 as 2025-01-01", () => {
    expect(formatDate(new Date(2025, 0, 1))).toBe("2025-01-01");
  });

  it("formats December 31st 2024 as 2024-12-31", () => {
    expect(formatDate(new Date(2024, 11, 31))).toBe("2024-12-31");
  });
});
