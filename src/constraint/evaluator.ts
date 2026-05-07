import type { Expr, Predicate } from "../dsl/ast";
import type { Candle } from "../render/plan";
import { GenerationError } from "../errors";

export type RefMap = Record<string, number>;

export type DerivedView = {
  zones: Record<string, { low: number; high: number }>;
  levels: Record<string, number>;
};

export type EvalContext = {
  bars: Candle[];
  refs: RefMap;
  derived: DerivedView;
  seed?: number;
};

export function evaluateExpr(expr: Expr, ctx: EvalContext): number {
  switch (expr.kind) {
    case "number":
      return expr.value;
    case "barField": {
      const idx = ctx.refs[expr.bar];
      if (idx !== undefined && ctx.bars[idx] !== undefined) {
        return ctx.bars[idx]![expr.field];
      }
      const zone = ctx.derived.zones[expr.bar];
      if (zone && (expr.field === "low" || expr.field === "high")) {
        return zone[expr.field];
      }
      throw new GenerationError(
        "hook_unsatisfiable",
        `bar '${expr.bar}' has no resolved index`,
        ctx.seed ?? -1,
      );
    }
    case "call": {
      const b = getBar(expr.bar, ctx);
      switch (expr.func) {
        case "body":
          return Math.abs(b.close - b.open);
        case "range":
          return b.high - b.low;
        case "mid":
          return (b.high + b.low) / 2;
      }
      return 0;
    }
    case "binary": {
      const l = evaluateExpr(expr.lhs, ctx);
      const r = evaluateExpr(expr.rhs, ctx);
      switch (expr.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0) {
            throw new GenerationError(
              "hook_unsatisfiable",
              "division by zero",
              ctx.seed ?? -1,
              undefined,
              { expr },
            );
          }
          return l / r;
      }
      return 0;
    }
  }
}

export type PredicateResult = { passed: boolean; lhs?: number; rhs?: number };

export function evaluatePredicate(p: Predicate, ctx: EvalContext): PredicateResult {
  if (p.kind === "direction") {
    const bar = getBar(p.bar, ctx);
    const isBull = bar.close > bar.open;
    const passed = p.direction === "bullish" ? isBull : !isBull;
    return { passed };
  }
  const l = evaluateExpr(p.lhs, ctx);
  const r = evaluateExpr(p.rhs, ctx);
  let passed = false;
  switch (p.op) {
    case "<":
      passed = l < r;
      break;
    case ">":
      passed = l > r;
      break;
    case "<=":
      passed = l <= r;
      break;
    case ">=":
      passed = l >= r;
      break;
    case "=":
      passed = l === r;
      break;
  }
  return { passed, lhs: l, rhs: r };
}

function getBar(name: string, ctx: EvalContext): Candle {
  const idx = ctx.refs[name];
  if (idx === undefined || ctx.bars[idx] === undefined) {
    throw new GenerationError(
      "hook_unsatisfiable",
      `bar '${name}' has no resolved index`,
      ctx.seed ?? -1,
    );
  }
  return ctx.bars[idx]!;
}
