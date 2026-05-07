import { describe, expect, it } from "vitest";
import { tokenize } from "../dsl/lexer";
import { parse } from "../dsl/parser";
import { compileSemantic } from "./compiler";

function compileText(source: string) {
  const { program } = parse(tokenize(source), source);
  if (!program) throw new Error("parse failed");
  return compileSemantic(program);
}

describe("compileSemantic", () => {
  it("infers a Zone from low+high derives", () => {
    const { model, errors } = compileText(`pattern p
bars a, c
derive gap.low = a.high
derive gap.high = c.low
`);
    expect(errors).toEqual([]);
    expect(model!.zones.has("gap")).toBe(true);
    expect(model!.levels.size).toBe(0);
  });

  it("infers a Level from .level derive", () => {
    const { model, errors } = compileText(`pattern p
bars a, b
derive bos.level = a.high
`);
    expect(errors).toEqual([]);
    expect(model!.levels.has("bos")).toBe(true);
  });

  it("registers a State slot from when assignment", () => {
    const { model } = compileText(`pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
when c.low <= gap.high then state.value = mitigated
`);
    expect(model!.states.has("state")).toBe(true);
  });

  it("rejects an unknown derive shape", () => {
    const { errors } = compileText(`pattern p
bars a
derive gap.middle = a.high
`);
    expect(errors[0]?.message).toMatch(/unknown derive shape 'gap'/);
  });

  it("rejects a Zone with only one half", () => {
    const { errors } = compileText(`pattern p
bars a
derive gap.low = a.high
`);
    expect(errors[0]?.message).toMatch(/zone 'gap' missing/);
  });

  it("collects shouldHints and shouldPredicates separately", () => {
    const { model } = compileText(`pattern p
bars a, b
should body_ratio b >= 0.65
should body(b) >= 0.5 * range(b)
`);
    expect(model!.shouldHints).toHaveLength(1);
    expect(model!.shouldPredicates).toHaveLength(1);
  });

  it("collects must, draws, labels, when-then", () => {
    const { model } = compileText(`pattern p
bars a, b, c
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
label b as displacement
when c.low <= gap.high then state.value = mitigated
`);
    expect(model!.must).toHaveLength(1);
    expect(model!.draws).toHaveLength(1);
    expect(model!.draws[0]).toMatchObject({
      target: "gap",
      targetKind: "zone",
      drawKind: "box",
      color: "amber",
    });
    expect(model!.labels).toHaveLength(1);
    expect(model!.whenThen).toHaveLength(1);
  });
});
