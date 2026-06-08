import { describe, it, expect } from "vitest";
import { applyDiscount } from "./pricing";

describe("applyDiscount (Bug A)", () => {
  it("takes 20% off 100 -> 80", () => {
    expect(applyDiscount(100, 20)).toBe(80);
  });

  it("takes 0% off 50 -> 50", () => {
    expect(applyDiscount(50, 0)).toBe(50);
  });

  it("takes 100% off 99 -> 0", () => {
    expect(applyDiscount(99, 100)).toBe(0);
  });
});
