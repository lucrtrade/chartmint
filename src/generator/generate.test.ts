import { describe, expect, it } from "vitest";
import { compile } from "../compile";
import { generate } from "./generate";

describe("generate", () => {
  it("returns deterministic result for fixed seed", () => {
    const compiled = compile(`pattern p
bars a, b, c
seed 42
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
`);
    const r1 = generate(compiled, {});
    const r2 = generate(compiled, {});
    expect(r1.bars).toEqual(r2.bars);
    expect(r1.derived).toEqual(r2.derived);
    expect(r1.verification).toEqual(r2.verification);
  });

  it("resolves seed:random and exposes resolved seed", () => {
    const compiled = compile(`pattern p
bars a
seed random
`);
    const r = generate(compiled, { seed: 7 });
    expect(r.seed).toBe(7);
  });

  it("verifies must constraints", () => {
    const compiled = compile(`pattern p
bars a, b, c
seed 42
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
`);
    const r = generate(compiled, {});
    expect(r.verification.must[0]?.passed).toBe(true);
  });

  it("locate at end places bar at last index", () => {
    const compiled = compile(`pattern p
bars a
seed 1
series 10
locate a at end
`);
    const r = generate(compiled, {});
    expect(r.refs.a).toBe(9); // last index of 10-bar series
  });

  it("locate at end - N places bar at offset from end", () => {
    const compiled = compile(`pattern p
bars a
seed 1
series 10
locate a at end - 3
`);
    const r = generate(compiled, {});
    expect(r.refs.a).toBe(6); // 10 - 1 - 3
  });

  it("locate at mid places bar at midpoint", () => {
    const compiled = compile(`pattern p
bars a
seed 1
series 10
locate a at mid
`);
    const r = generate(compiled, {});
    expect(r.refs.a).toBe(5); // floor(10/2)
  });

  it("locate as highest places bar at max-field index within range", () => {
    const compiled = compile(`pattern p
bars prev, brk
seed 42
series 30
locate prev as highest high within 0 0.8
locate brk at end
`);
    const r = generate(compiled, {});
    // prev must be in [0, 24) (80% of 30)
    expect(r.refs.prev).toBeGreaterThanOrEqual(0);
    expect(r.refs.prev).toBeLessThan(24);
    expect(r.refs.brk).toBe(29);
  });

  it("bars without locate use tail positioning", () => {
    const compiled = compile(`pattern p
bars a, b, c
seed 1
series 10
`);
    const r = generate(compiled, {});
    expect(r.refs.a).toBe(7);
    expect(r.refs.b).toBe(8);
    expect(r.refs.c).toBe(9);
  });

  it("PatternTemplate no longer requires mapping field", () => {
    const template = { name: "t", source: "pattern t\nbars a\nseed 1\n" };
    const r = generate(template, {});
    expect(r.refs.a).toBe(r.bars.length - 1);
  });

  it("last bar time equals endTime when endTime is provided", () => {
    const compiled = compile("pattern p\nbars a\nseed 1\nseries 10\n");
    const endTime = 1_700_000_000;
    const r = generate(compiled, { endTime, timeframe: 3600 });
    expect(r.bars[r.bars.length - 1]!.time).toBe(endTime);
  });

  it("bars are spaced by timeframe seconds", () => {
    const compiled = compile("pattern p\nbars a\nseed 1\nseries 5\n");
    const endTime = 1_000_000;
    const timeframe = 900;
    const r = generate(compiled, { endTime, timeframe });
    const times = r.bars.map((b) => b.time);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]! - times[i - 1]!).toBe(timeframe);
    }
  });

  it("defaults to sequential integers when no timeframe given", () => {
    const compiled = compile("pattern p\nbars a\nseed 1\nseries 4\n");
    const r = generate(compiled, {});
    expect(r.bars.map((b) => b.time)).toEqual([1, 2, 3, 4]);
  });
});
