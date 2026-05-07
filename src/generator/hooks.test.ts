import { describe, expect, it } from "vitest";
import { applyHooks } from "./hooks";
import type { Candle } from "../render/plan";

const C = (over: Partial<Candle>): Candle => ({
  time: 0,
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  ...over,
});

const loc = { line: 1, col: 1, length: 1 };

describe("applyHooks", () => {
  it("force_bullish flips a bearish bar without changing range", () => {
    const bars = [C({ open: 105, close: 95, high: 110, low: 90 })];
    applyHooks([{ kind: "force_bullish", bar: "a", loc }], {
      bars,
      refs: { a: 0 },
      tolerance: 0.001,
    });
    expect(bars[0]!.close).toBeGreaterThan(bars[0]!.open);
    expect(bars[0]!.high).toBe(110);
    expect(bars[0]!.low).toBe(90);
  });

  it("body_ratio widens body to meet ratio", () => {
    const bars = [C({ open: 100, close: 101, high: 110, low: 90 })];
    applyHooks([{ kind: "body_ratio", bar: "a", min: 0.7, loc }], {
      bars,
      refs: { a: 0 },
      tolerance: 0.001,
    });
    const b = bars[0]!;
    const ratio = Math.abs(b.close - b.open) / (b.high - b.low);
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });

  it("equal_highs aligns within tolerance", () => {
    const bars = [C({ time: 1, high: 120 }), C({ time: 2, high: 100 })];
    applyHooks([{ kind: "equal_highs", left: "a", right: "b", loc }], {
      bars,
      refs: { a: 0, b: 1 },
      tolerance: 0.001,
    });
    expect(Math.abs(bars[1]!.high - bars[0]!.high) / bars[0]!.high).toBeLessThanOrEqual(0.0011);
  });

  it("impulsive forces direction, body, and large range", () => {
    const bars = [
      C({ open: 100, close: 100.1, high: 100.2, low: 99.9 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100, high: 100, low: 100 }),
    ];
    applyHooks([{ kind: "impulsive", bar: "x", loc }], { bars, refs: { x: 5 }, tolerance: 0.001 });
    const b = bars[5]!;
    expect(b.close).toBeGreaterThan(b.open);
    const ratio = Math.abs(b.close - b.open) / (b.high - b.low);
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });
});
