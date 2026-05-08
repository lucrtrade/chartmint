import type { SourceLoc } from "../errors";

export type Field = "open" | "high" | "low" | "close";
export type FuncName = "body" | "range" | "mid";
export type CompareOp = "<" | ">" | "<=" | ">=" | "=";
export type Direction = "bullish" | "bearish";
export type DrawKind = "box" | "line";
export type Color = "amber" | "blue" | "green" | "red" | "gray" | "white";

export type Expr =
  | { kind: "number"; value: number; loc: SourceLoc }
  | { kind: "barField"; bar: string; field: Field; loc: SourceLoc }
  | { kind: "call"; func: FuncName; bar: string; loc: SourceLoc }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; lhs: Expr; rhs: Expr; loc: SourceLoc };

export type Predicate =
  | { kind: "compare"; lhs: Expr; op: CompareOp; rhs: Expr; loc: SourceLoc }
  | { kind: "direction"; bar: string; direction: Direction; loc: SourceLoc };

export type ShapeHint =
  | { kind: "force_bullish"; bar: string; loc: SourceLoc }
  | { kind: "force_bearish"; bar: string; loc: SourceLoc }
  | { kind: "impulsive"; bar: string; loc: SourceLoc }
  | { kind: "body_ratio"; bar: string; min: number; loc: SourceLoc }
  | { kind: "equal_highs"; left: string; right: string; loc: SourceLoc }
  | { kind: "equal_lows"; left: string; right: string; loc: SourceLoc };

export type Preference =
  | { kind: "predicate"; predicate: Predicate }
  | { kind: "hint"; hint: ShapeHint };

export type Target = { object: string; property: string; loc: SourceLoc };

export type Assignment = {
  target: Target;
  value: Expr | { kind: "ident"; name: string; loc: SourceLoc };
};

export type LocateAnchor = { kind: "end"; offset: number } | { kind: "mid" } | { kind: "start" };

export type LocateSearch = {
  agg: "highest" | "lowest";
  field: Field;
  within?: { start: number; end: number };
};

export type LocatePosition =
  | { kind: "at"; anchor: LocateAnchor }
  | { kind: "as"; search: LocateSearch };

export type Statement =
  | { kind: "must"; predicate: Predicate; loc: SourceLoc }
  | { kind: "should"; preference: Preference; loc: SourceLoc }
  | { kind: "derive"; target: Target; expr: Expr; loc: SourceLoc }
  | { kind: "when"; predicate: Predicate; assignment: Assignment; loc: SourceLoc }
  | { kind: "draw"; target: string; drawKind: DrawKind; color?: Color; loc: SourceLoc }
  | { kind: "label"; ref: string; text: string; color?: Color; loc: SourceLoc }
  | { kind: "locate"; barRef: string; position: LocatePosition; loc: SourceLoc };

export type Program = {
  pattern: string;
  bars: string[];
  series: number; // default 30
  seed: number | "random"; // default "random"
  statements: Statement[];
  source: string; // raw DSL text for code-frame errors
};
