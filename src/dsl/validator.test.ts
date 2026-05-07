import { describe, expect, it } from "vitest";
import { tokenize } from "./lexer";
import { parse } from "./parser";
import { validate } from "./validator";

function vp(source: string) {
  const { program, errors: parseErrors } = parse(tokenize(source), source);
  if (!program) throw new Error(`parse failed: ${parseErrors[0]?.message}`);
  return validate(program);
}

describe("validate", () => {
  it("passes a valid FVG-like spec", () => {
    const errors = vp(`pattern fvg
bars a, b, c
must a.high < c.low
should body_ratio b >= 0.65
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
label b as displacement
`);
    expect(errors).toEqual([]);
  });

  it("rejects undeclared bar reference", () => {
    const errors = vp(`pattern p
bars a
must a.high < zzz.low
`);
    expect(errors[0]?.message).toMatch(/unknown bar 'zzz'/);
  });

  it("rejects duplicate derive targets", () => {
    const errors = vp(`pattern p
bars a
derive gap.low = a.high
derive gap.low = a.low
`);
    expect(errors[0]?.message).toMatch(/duplicate derive target/);
  });

  it("rejects draw target with no derive", () => {
    const errors = vp(`pattern p
bars a
draw ghost as box amber
`);
    expect(errors[0]?.message).toMatch(/no derive produces 'ghost'/);
  });

  it("rejects label on undeclared bar", () => {
    const errors = vp(`pattern p
bars a
label zz as foo
`);
    expect(errors[0]?.message).toMatch(/unknown bar 'zz'/);
  });

  it("rejects derive cycles", () => {
    const errors = vp(`pattern p
bars a
derive x.low = x.high
derive x.high = x.low
`);
    expect(errors.some((e) => /cycle/.test(e.message))).toBe(true);
  });

  it("accepts state.value introduced via when", () => {
    const errors = vp(`pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
when c.low <= gap.high then state.value = mitigated
`);
    expect(errors).toEqual([]);
  });
});
