import { describe, expect, it } from "vitest";
import { compile } from "./compile";

describe("compile", () => {
  it("returns ast and semantic on a valid spec", () => {
    const result = compile(`pattern fvg
bars a, b, c
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
`);
    expect(result.errors).toEqual([]);
    expect(result.ast?.pattern).toBe("fvg");
    expect(result.semantic?.zones.has("gap")).toBe(true);
  });

  it("aggregates errors across phases without throwing", () => {
    const result = compile(`pattern p
bars a
derive gap.low = a.high
draw gap as box amber
`);
    // Missing high → semantic error; no throw, errors collected.
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.ast).toBeDefined();
    expect(result.semantic).toBeUndefined();
  });

  it("skips semantic phase when validate fails", () => {
    const result = compile(`pattern p
bars a
must a.high < zzz.low
`);
    expect(result.errors[0]?.message).toMatch(/unknown bar 'zzz'/);
    expect(result.semantic).toBeUndefined();
  });
});
