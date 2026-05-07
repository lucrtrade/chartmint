import type { CompareOp, Expr, Predicate } from "../dsl/ast";
import { evaluateExpr, type EvalContext } from "../constraint/evaluator";

const EPS_FRACTION = 0.001;

export function attemptRepair(predicate: Predicate, ctx: EvalContext): boolean {
  if (predicate.kind !== "compare") return false;
  const l = evaluateExpr(predicate.lhs, ctx);
  const r = evaluateExpr(predicate.rhs, ctx);

  const lTarget = singleBarFieldTarget(predicate.lhs);
  const rTarget = singleBarFieldTarget(predicate.rhs);
  if (!lTarget && !rTarget) return false;

  const reference = (Math.abs(l) + Math.abs(r)) / 2 || 100;
  const eps = reference * EPS_FRACTION;

  const desiredDelta = solveDelta(predicate.op, l, r, eps);
  if (desiredDelta === null || desiredDelta === 0) return false;

  if (rTarget) {
    nudge(ctx, rTarget, +desiredDelta);
    return true;
  }
  if (lTarget) {
    nudge(ctx, lTarget, -desiredDelta);
    return true;
  }
  return false;
}

type FieldTarget = { bar: string; field: "open" | "high" | "low" | "close" };

function singleBarFieldTarget(expr: Expr): FieldTarget | null {
  if (expr.kind === "barField") return { bar: expr.bar, field: expr.field };
  return null;
}

function solveDelta(op: CompareOp, l: number, r: number, eps: number): number | null {
  switch (op) {
    case "<":
      return r - l > 0 ? 0 : l - r + eps;
    case "<=":
      return r - l >= 0 ? 0 : l - r + eps;
    case ">":
      return l - r > 0 ? 0 : r - l + eps;
    case ">=":
      return l - r >= 0 ? 0 : r - l + eps;
    case "=":
      return l === r ? 0 : l - r;
    default:
      return null;
  }
}

function nudge(ctx: EvalContext, target: FieldTarget, delta: number): void {
  if (delta === 0) return;
  const idx = ctx.refs[target.bar];
  if (idx === undefined) return;
  const bar = ctx.bars[idx];
  if (!bar) return;
  const onlyField = (target.field === "high" && delta > 0) || (target.field === "low" && delta < 0);
  if (onlyField) {
    bar[target.field] += delta;
  } else {
    bar.open += delta;
    bar.high += delta;
    bar.low += delta;
    bar.close += delta;
  }
}
