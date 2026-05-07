import type { Assignment, Color, DrawKind, Expr, Predicate, ShapeHint } from "../dsl/ast";

export type ZoneSpec = { lowExpr: Expr; highExpr: Expr };
export type LevelSpec = { valueExpr: Expr };
export type RangeSpec = { lowExpr: Expr; midExpr: Expr; highExpr: Expr };
export type StateSpec = { initial?: Expr | string };
export type DrawSpec = {
  target: string;
  targetKind: "zone" | "level";
  drawKind: DrawKind;
  color?: Color;
};
export type LabelSpec = { barRef: string; text: string };
export type WhenThenSpec = { predicate: Predicate; assignment: Assignment };

export type SemanticModel = {
  pattern: string;
  bars: string[];
  series: number;
  seed: number | "random";
  zones: Map<string, ZoneSpec>;
  levels: Map<string, LevelSpec>;
  ranges: Map<string, RangeSpec>;
  states: Map<string, StateSpec>;
  draws: DrawSpec[];
  labels: LabelSpec[];
  must: Predicate[];
  shouldHints: ShapeHint[];
  shouldPredicates: Predicate[];
  whenThen: WhenThenSpec[];
};
