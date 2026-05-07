import { describe, expect, it } from "vitest";
import { CompileError, GenerationError, RenderError } from "./errors";

describe("CompileError", () => {
  it("carries kind and loc", () => {
    const err = new CompileError("parse", "unexpected token", {
      line: 3,
      col: 5,
      length: 4,
    });
    expect(err.kind).toBe("parse");
    expect(err.loc).toEqual({ line: 3, col: 5, length: 4 });
    expect(err.message).toContain("unexpected token");
  });

  it("formats a code-frame when source is provided", () => {
    const err = new CompileError("parse", "expected number", {
      line: 2,
      col: 8,
      length: 3,
    });
    const source = "pattern x\nbars a, !!\n";
    const frame = err.format(source);
    expect(frame).toContain("expected number");
    expect(frame).toContain("2 |");
    expect(frame).toContain("^^^");
  });

  it("formats without source", () => {
    const err = new CompileError("validate", "duplicate target");
    expect(err.format()).toContain("duplicate target");
  });
});

describe("GenerationError", () => {
  it("carries seed and predicate", () => {
    const err = new GenerationError("must_failed", "must check failed", 42, {
      kind: "compare",
      lhs: { kind: "number", value: 1 },
      op: "<",
      rhs: { kind: "number", value: 0 },
    });
    expect(err.kind).toBe("must_failed");
    expect(err.seed).toBe(42);
    expect(err.predicate).toBeDefined();
  });
});

describe("RenderError", () => {
  it("carries kind", () => {
    const err = new RenderError("missing_overlay_target", "no such target: foo");
    expect(err.kind).toBe("missing_overlay_target");
  });
});
