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

  it("uses sequential times starting at 1 by default (legacy behaviour)", () => {
    const bars = generateBaseSeries(7, 4);
    expect(bars.map((b) => b.time)).toEqual([1, 2, 3, 4]);
  });

  it("spaces bars by timeframe seconds when endTime and timeframe are given", () => {
    const endTime = 1_000_000;
    const timeframe = 3600;
    const bars = generateBaseSeries(7, 4, 100, timeframe, endTime);
    const times = bars.map((b) => b.time);
    expect(times[3]).toBe(endTime);
    expect(times[2]).toBe(endTime - timeframe);
    expect(times[1]).toBe(endTime - 2 * timeframe);
    expect(times[0]).toBe(endTime - 3 * timeframe);
  });

  it("works with daily timeframe", () => {
    const endTime = 1_700_000_000;
    const day = 86400;
    const bars = generateBaseSeries(1, 3, 100, day, endTime);
    expect(bars[2]!.time).toBe(endTime);
    expect(bars[1]!.time).toBe(endTime - day);
    expect(bars[0]!.time).toBe(endTime - 2 * day);
  });

  it("ohlc values are unchanged when timeframe/endTime change", () => {
    const base = generateBaseSeries(42, 5);
    const withTime = generateBaseSeries(42, 5, 100, 3600, 1_000_000);
    for (let i = 0; i < 5; i++) {
      expect(withTime[i]!.open).toBe(base[i]!.open);
      expect(withTime[i]!.high).toBe(base[i]!.high);
      expect(withTime[i]!.low).toBe(base[i]!.low);
      expect(withTime[i]!.close).toBe(base[i]!.close);
    }
  });
});
