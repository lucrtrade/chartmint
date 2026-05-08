import { describe, expect, it } from "vitest";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { buildPlan } from "./plan-builder";

describe("buildPlan", () => {
  it("emits a zone overlay for derive low+high + draw box", () => {
    const c = compile(`pattern p
bars a, b, c
seed 42
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
label b as displacement red
`);
    const r = generate(c, {});
    const plan = buildPlan(r, c.semantic!);
    expect(plan.candles).toHaveLength(30);
    expect(plan.zones).toHaveLength(1);
    expect(plan.zones[0]?.name).toBe("gap");
    expect(plan.zones[0]?.color).toBe("#f59e0b66");
    expect(plan.markers).toHaveLength(1);
    expect(plan.markers[0]?.text).toBe("displacement");
    expect(plan.markers[0]?.color).toBe("#ef4444");
  });

  it("emits a level overlay for derive .level + draw line", () => {
    const c = compile(`pattern p
bars a, b
seed 42
derive bos.level = a.high
draw bos as line green
`);
    const r = generate(c, {});
    const plan = buildPlan(r, c.semantic!);
    expect(plan.levels).toHaveLength(1);
    expect(plan.levels[0]?.name).toBe("bos");
    expect(plan.levels[0]?.color).toBe("#22c55e");
  });

  it("allows palette overrides without changing DSL colors", () => {
    const c = compile(`pattern p
bars a, b, c
seed 42
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
derive bos.level = b.high
draw gap as box amber
draw bos as line green
label b as displacement
`);
    const r = generate(c, {});
    const plan = buildPlan(r, c.semantic!, {
      palette: {
        fill: { amber: "#11111122" },
        line: { green: "#222222" },
        defaults: {
          marker: "#333333",
        },
      },
    });

    expect(plan.zones[0]?.color).toBe("#11111122");
    expect(plan.levels[0]?.color).toBe("#222222");
    expect(plan.markers[0]?.color).toBe("#333333");
  });
});
