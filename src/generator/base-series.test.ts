import { describe, expect, it } from "vitest";
import { generateBaseSeries, mulberry32 } from "./base-series";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("generateBaseSeries", () => {
  it("produces N candles with valid OHLC ordering", () => {
    const bars = generateBaseSeries(42, 30);
    expect(bars).toHaveLength(30);
    for (const b of bars) {
      expect(b.high).toBeGreaterThanOrEqual(Math.max(b.open, b.close));
      expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
      expect(b.high).toBeGreaterThan(b.low);
    }
  });

  it("is deterministic per seed", () => {
    expect(generateBaseSeries(42, 5)).toEqual(generateBaseSeries(42, 5));
  });

  it("uses sequential times", () => {
    const bars = generateBaseSeries(7, 4);
    expect(bars.map((b) => b.time)).toEqual([1, 2, 3, 4]);
  });
});
