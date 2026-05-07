# ChartMint v0.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hello-world placeholder in `@lucrtrade/chartmint` with the full v0.1.0 library: DSL parsing → semantic compilation → rule-guided OHLC generation → constraint verification → render plan + Lightweight Charts adapter, for three patterns (`bullish_fvg`, `bullish_bos`, `equal_highs`).

**Architecture:** Single ESM npm package, headless core, optional `lightweight-charts` peerDependency for the renderer adapter. AST stays raw; semantic compiler infers zones/levels via naming convention. Generator pipeline = base-series → hook pass → derive → must-check + one-shot repair → should-verify → transitions. Render plan is pure data; `applyToChart` is the only file importing `lightweight-charts`.

**Tech Stack:** TypeScript 5.x, Bun (install/test/build), tsup (bundle), vitest (test), fast-check (property tests), jsdom (renderer integration), lightweight-charts ^5 (peer).

**Spec:** `docs/superpowers/specs/2026-05-07-chartmint-v0.1.0-design.md`

---

## File Structure

| Path                           | Responsibility                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `src/index.ts`                 | Public re-exports only. Replaces hello-world placeholder.                     |
| `src/errors.ts`                | `CompileError`, `GenerationError`, `RenderError` classes.                     |
| `src/dsl/ast.ts`               | AST node type definitions + `SourceLoc`.                                      |
| `src/dsl/lexer.ts`             | `tokenize(source) → Token[]`.                                                 |
| `src/dsl/parser.ts`            | `parse(tokens, source) → { program, errors }`.                                |
| `src/dsl/validator.ts`         | `validate(program) → CompileError[]`.                                         |
| `src/semantic/model.ts`        | `SemanticModel` and child types.                                              |
| `src/semantic/compiler.ts`     | `compileSemantic(program) → { model, errors }`.                               |
| `src/constraint/evaluator.ts`  | `evaluateExpr`, `evaluatePredicate`, helpers.                                 |
| `src/generator/base-series.ts` | mulberry32 + `generateBaseSeries(seed, n) → Candle[]`.                        |
| `src/generator/hooks.ts`       | One function per ShapeHint, plus `applyHooks`.                                |
| `src/generator/derive.ts`      | `applyDerives(model, ctx) → derived`.                                         |
| `src/generator/transitions.ts` | `applyTransitions(model, ctx) → state`.                                       |
| `src/generator/repair.ts`      | `attemptRepair(predicate, ctx)` (single pass).                                |
| `src/generator/generate.ts`    | Orchestration: `generate(spec, opts) → GenerateResult`.                       |
| `src/render/plan.ts`           | `RenderPlan`, `Candle`, overlay types.                                        |
| `src/render/plan-builder.ts`   | `buildPlan(GenerateResult, model) → RenderPlan`.                              |
| `src/render/apply.ts`          | `applyToChart(chart, plan)` (only file importing lightweight-charts).         |
| `src/patterns/bullish-fvg.ts`  | DSL source + `mapping(bars) → RefMap`.                                        |
| `src/patterns/bullish-bos.ts`  | Same shape.                                                                   |
| `src/patterns/equal-highs.ts`  | Same shape.                                                                   |
| `src/patterns/index.ts`        | `patterns = { bullish_fvg, bullish_bos, equal_highs }`.                       |
| `src/compile.ts`               | Public `compile(source)` orchestrating lexer + parser + validator + semantic. |

Tests live next to their modules as `*.test.ts`. Pattern integration tests live in `src/patterns/*.test.ts`.

---

## Task 0: Initial commit of skeleton + spec

**Files:**

- Use existing repo state (skeleton + spec already on disk).

- [ ] **Step 1: Verify there are no commits yet**

```bash
git log --oneline 2>&1 | head -5
```

Expected: `fatal: your current branch 'main' does not have any commits yet`.

- [ ] **Step 2: Stage everything that should ship in the initial commit**

```bash
git add -A
git status --short
```

Expected: spec, package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, eslint.config.js, .prettierrc.json, .prettierignore, .gitignore, .vscode/, .husky/pre-commit, .github/workflows/, src/, README.md, LICENSE, bun.lock, docs/.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: initial scaffold and v0.1.0 design spec

- Bun + TypeScript + tsup ESM library scaffold
- ESLint flat config + Prettier + Vitest + husky pre-commit
- CI (format/lint/typecheck/test) and Release (Trusted Publishing
  + GitHub Packages + GitHub Release) workflows
- v0.1.0 design spec at docs/superpowers/specs/"
```

- [ ] **Step 4: Verify**

```bash
git log --oneline
```

Expected: one commit on `main`.

---

## Task 1: Move `lightweight-charts` to peerDependencies; add fast-check + jsdom

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Edit `package.json`**

Replace the `dependencies` block with `peerDependencies` + `peerDependenciesMeta` and add the new devDependencies. Final relevant blocks:

```json
  "peerDependencies": {
    "lightweight-charts": ">=5.0.0"
  },
  "peerDependenciesMeta": {
    "lightweight-charts": {
      "optional": true
    }
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@types/node": "^22.10.2",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "fast-check": "^3.23.2",
    "husky": "^9.1.7",
    "jsdom": "^25.0.1",
    "lightweight-charts": "^5.2.0",
    "lint-staged": "^15.2.11",
    "prettier": "^3.4.2",
    "tsup": "^8.3.5",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.18.2",
    "vitest": "^2.1.8"
  }
```

Delete the old `"dependencies": { "lightweight-charts": "5.2.0" }` block entirely.

- [ ] **Step 2: Reinstall**

```bash
bun install
```

Expected: lockfile regenerated; lightweight-charts kept (now via devDep), fast-check + jsdom added.

- [ ] **Step 3: Confirm CI still passes**

```bash
bun run ci
```

Expected: format/lint/typecheck/test all green (still on hello-world placeholder).

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: move lightweight-charts to peerDependencies; add fast-check + jsdom"
```

---

## Task 2: `src/errors.ts`

**Files:**

- Create: `src/errors.ts`
- Create: `src/errors.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/errors.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/errors.test.ts
```

Expected: fail (`./errors` not found).

- [ ] **Step 3: Implement**

Create `src/errors.ts`:

```ts
export type SourceLoc = { line: number; col: number; length: number };

export type CompileErrorKind = "lex" | "parse" | "validate" | "semantic";
export type GenerationErrorKind = "must_failed" | "hook_unsatisfiable";
export type RenderErrorKind = "missing_overlay_target" | "unsupported_drawkind";

// Forward type to avoid a cycle with ast.ts. Real Predicate type is declared in dsl/ast.ts.
export type PredicateLike = { kind: string; [k: string]: unknown };

export class CompileError extends Error {
  readonly kind: CompileErrorKind;
  readonly loc?: SourceLoc;

  constructor(kind: CompileErrorKind, message: string, loc?: SourceLoc) {
    super(message);
    this.name = "CompileError";
    this.kind = kind;
    this.loc = loc;
  }

  format(source?: string): string {
    if (!source || !this.loc) return `${this.kind}: ${this.message}`;
    const lines = source.split(/\r?\n/);
    const { line, col, length } = this.loc;
    const target = lines[line - 1] ?? "";
    const gutter = `${line} | `;
    const caret =
      " ".repeat(gutter.length + Math.max(0, col - 1)) + "^".repeat(Math.max(1, length));
    return `${this.kind}: ${this.message}\n${gutter}${target}\n${caret}`;
  }
}

export class GenerationError extends Error {
  readonly kind: GenerationErrorKind;
  readonly seed: number;
  readonly predicate?: PredicateLike;
  readonly details?: Record<string, unknown>;

  constructor(
    kind: GenerationErrorKind,
    message: string,
    seed: number,
    predicate?: PredicateLike,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GenerationError";
    this.kind = kind;
    this.seed = seed;
    this.predicate = predicate;
    this.details = details;
  }
}

export class RenderError extends Error {
  readonly kind: RenderErrorKind;

  constructor(kind: RenderErrorKind, message: string) {
    super(message);
    this.name = "RenderError";
    this.kind = kind;
  }
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/errors.test.ts
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/errors.ts src/errors.test.ts
git commit -m "feat(errors): add CompileError, GenerationError, RenderError with code-frames"
```

---

## Task 3: `src/dsl/ast.ts` (types only)

**Files:**

- Create: `src/dsl/ast.ts`

No test — pure type declarations.

- [ ] **Step 1: Create file**

```ts
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

export type Statement =
  | { kind: "must"; predicate: Predicate; loc: SourceLoc }
  | { kind: "should"; preference: Preference; loc: SourceLoc }
  | { kind: "derive"; target: Target; expr: Expr; loc: SourceLoc }
  | { kind: "when"; predicate: Predicate; assignment: Assignment; loc: SourceLoc }
  | { kind: "draw"; target: string; drawKind: DrawKind; color?: Color; loc: SourceLoc }
  | { kind: "label"; ref: string; text: string; loc: SourceLoc };

export type Program = {
  pattern: string;
  bars: string[];
  series: number; // default 30
  seed: number | "random"; // default "random"
  statements: Statement[];
  source: string; // raw DSL text for code-frame errors
};
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/dsl/ast.ts
git commit -m "feat(dsl): add AST node type declarations"
```

---

## Task 4: `src/dsl/lexer.ts`

**Files:**

- Create: `src/dsl/lexer.ts`
- Create: `src/dsl/lexer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/dsl/lexer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { tokenize } from "./lexer";

describe("tokenize", () => {
  it("tokenizes a minimal header", () => {
    const tokens = tokenize("pattern foo\nbars a, b, c\n");
    expect(tokens.map((t) => t.kind)).toEqual([
      "ident",
      "ident",
      "newline",
      "ident",
      "ident",
      "comma",
      "ident",
      "comma",
      "ident",
      "newline",
      "eof",
    ]);
    expect(tokens[0].value).toBe("pattern");
    expect(tokens[1].value).toBe("foo");
  });

  it("tracks line and column", () => {
    const tokens = tokenize("ab\n  cd");
    expect(tokens[0]).toMatchObject({ value: "ab", loc: { line: 1, col: 1, length: 2 } });
    expect(tokens[2]).toMatchObject({ value: "cd", loc: { line: 2, col: 3, length: 2 } });
  });

  it("recognizes numbers including decimals", () => {
    const tokens = tokenize("0.65 12 1.0");
    expect(tokens.slice(0, 3).map((t) => ({ kind: t.kind, value: t.value }))).toEqual([
      { kind: "number", value: "0.65" },
      { kind: "number", value: "12" },
      { kind: "number", value: "1.0" },
    ]);
  });

  it("recognizes operators and punctuation", () => {
    const tokens = tokenize("a.high < c.low + 1 * (2 - 3) / 4 = >=");
    const kinds = tokens.map((t) => t.kind);
    expect(kinds).toContain("dot");
    expect(kinds).toContain("lt");
    expect(kinds).toContain("plus");
    expect(kinds).toContain("star");
    expect(kinds).toContain("lparen");
    expect(kinds).toContain("rparen");
    expect(kinds).toContain("minus");
    expect(kinds).toContain("slash");
    expect(kinds).toContain("eq");
    expect(kinds).toContain("ge");
  });

  it("skips line comments starting with #", () => {
    const tokens = tokenize("pattern foo # this is a comment\nbars a");
    const values = tokens.filter((t) => t.kind === "ident").map((t) => t.value);
    expect(values).toEqual(["pattern", "foo", "bars", "a"]);
  });

  it("collapses repeated newlines", () => {
    const tokens = tokenize("a\n\n\nb");
    const newlines = tokens.filter((t) => t.kind === "newline");
    expect(newlines).toHaveLength(1);
  });

  it("throws CompileError on unknown char", () => {
    expect(() => tokenize("@@@")).toThrow(/unexpected character/i);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/dsl/lexer.test.ts
```

Expected: import error.

- [ ] **Step 3: Implement**

Create `src/dsl/lexer.ts`:

```ts
import { CompileError, type SourceLoc } from "../errors";

export type TokenKind =
  | "ident"
  | "number"
  | "comma"
  | "dot"
  | "plus"
  | "minus"
  | "star"
  | "slash"
  | "lparen"
  | "rparen"
  | "lt"
  | "gt"
  | "le"
  | "ge"
  | "eq"
  | "newline"
  | "eof";

export type Token = { kind: TokenKind; value: string; loc: SourceLoc };

const SINGLE_CHAR: Record<string, TokenKind> = {
  ",": "comma",
  ".": "dot",
  "+": "plus",
  "-": "minus",
  "*": "star",
  "/": "slash",
  "(": "lparen",
  ")": "rparen",
  "=": "eq",
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let lastEmittedNewline = false;

  const push = (kind: TokenKind, value: string, loc: SourceLoc) => {
    if (kind === "newline") {
      if (lastEmittedNewline || tokens.length === 0) return;
      lastEmittedNewline = true;
    } else {
      lastEmittedNewline = false;
    }
    tokens.push({ kind, value, loc });
  };

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      col++;
      continue;
    }

    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    if (ch === "\n") {
      push("newline", "\n", { line, col, length: 1 });
      i++;
      line++;
      col = 1;
      continue;
    }

    if (ch === "<" || ch === ">") {
      if (source[i + 1] === "=") {
        push(ch === "<" ? "le" : "ge", ch + "=", { line, col, length: 2 });
        i += 2;
        col += 2;
        continue;
      }
      push(ch === "<" ? "lt" : "gt", ch, { line, col, length: 1 });
      i++;
      col++;
      continue;
    }

    if (SINGLE_CHAR[ch]) {
      push(SINGLE_CHAR[ch]!, ch, { line, col, length: 1 });
      i++;
      col++;
      continue;
    }

    if (isDigit(ch)) {
      const start = i;
      const startCol = col;
      while (i < source.length && isDigit(source[i]!)) {
        i++;
        col++;
      }
      if (source[i] === ".") {
        i++;
        col++;
        while (i < source.length && isDigit(source[i]!)) {
          i++;
          col++;
        }
      }
      push("number", source.slice(start, i), { line, col: startCol, length: i - start });
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      const startCol = col;
      while (i < source.length && isIdentPart(source[i]!)) {
        i++;
        col++;
      }
      push("ident", source.slice(start, i), { line, col: startCol, length: i - start });
      continue;
    }

    throw new CompileError("lex", `unexpected character '${ch}'`, { line, col, length: 1 });
  }

  // strip trailing leading-newlines, then ensure no trailing newline before EOF
  while (tokens.length > 0 && tokens[tokens.length - 1]!.kind === "newline") {
    tokens.pop();
  }
  tokens.push({ kind: "eof", value: "", loc: { line, col, length: 0 } });
  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}
function isIdentStart(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}
function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/dsl/lexer.test.ts
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/dsl/lexer.ts src/dsl/lexer.test.ts
git commit -m "feat(dsl): add tokenizer with line/col tracking"
```

---

## Task 5: `src/dsl/parser.ts`

**Files:**

- Create: `src/dsl/parser.ts`
- Create: `src/dsl/parser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/dsl/parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parse } from "./parser";
import { tokenize } from "./lexer";

function parseText(source: string) {
  return parse(tokenize(source), source);
}

describe("parse: header", () => {
  it("parses minimal header", () => {
    const { program, errors } = parseText("pattern fvg\nbars a, b, c\n");
    expect(errors).toEqual([]);
    expect(program?.pattern).toBe("fvg");
    expect(program?.bars).toEqual(["a", "b", "c"]);
    expect(program?.series).toBe(30);
    expect(program?.seed).toBe("random");
  });

  it("parses series and seed", () => {
    const { program, errors } = parseText("pattern p\nbars a\nseries 50\nseed 42\n");
    expect(errors).toEqual([]);
    expect(program?.series).toBe(50);
    expect(program?.seed).toBe(42);
  });

  it("accepts seed random", () => {
    const { program } = parseText("pattern p\nbars a\nseed random\n");
    expect(program?.seed).toBe("random");
  });

  it("errors when pattern is missing", () => {
    const { errors } = parseText("bars a\n");
    expect(errors[0]?.message).toMatch(/expected 'pattern'/i);
  });
});

describe("parse: statements", () => {
  it("parses must with compare predicate", () => {
    const { program, errors } = parseText("pattern p\nbars a, b, c\nmust a.high < c.low\n");
    expect(errors).toEqual([]);
    expect(program?.statements).toHaveLength(1);
    const stmt = program!.statements[0]!;
    expect(stmt.kind).toBe("must");
  });

  it("parses must with direction predicate", () => {
    const { program } = parseText("pattern p\nbars a\nmust direction(a) = bullish\n");
    const stmt = program!.statements[0]!;
    expect(stmt.kind).toBe("must");
    if (stmt.kind === "must" && stmt.predicate.kind === "direction") {
      expect(stmt.predicate.bar).toBe("a");
      expect(stmt.predicate.direction).toBe("bullish");
    }
  });

  it("parses should hint and predicate forms", () => {
    const { program, errors } = parseText(
      "pattern p\nbars a, b\nshould body_ratio b >= 0.65\nshould body(b) >= 0.65 * range(b)\n",
    );
    expect(errors).toEqual([]);
    expect(program!.statements).toHaveLength(2);
    const [hintStmt, predStmt] = program!.statements;
    expect(hintStmt!.kind).toBe("should");
    if (hintStmt!.kind === "should") {
      expect(hintStmt.preference.kind).toBe("hint");
    }
    if (predStmt!.kind === "should") {
      expect(predStmt.preference.kind).toBe("predicate");
    }
  });

  it("parses derive, draw, label", () => {
    const { program, errors } = parseText(
      `pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
label b as displacement
`,
    );
    expect(errors).toEqual([]);
    expect(program!.statements.map((s) => s.kind)).toEqual(["derive", "derive", "draw", "label"]);
  });

  it("parses when ... then with ident value", () => {
    const { program } = parseText(
      "pattern p\nbars a, b, c\nwhen c.low <= 100 then state.value = mitigated\n",
    );
    const stmt = program!.statements[0]!;
    expect(stmt.kind).toBe("when");
    if (stmt.kind === "when") {
      expect(stmt.assignment.target).toMatchObject({ object: "state", property: "value" });
      expect(stmt.assignment.value.kind).toBe("ident");
    }
  });

  it("respects operator precedence", () => {
    const { program } = parseText("pattern p\nbars a\nderive x.y = 1 + 2 * 3\n");
    const stmt = program!.statements[0]!;
    if (stmt.kind === "derive" && stmt.expr.kind === "binary") {
      expect(stmt.expr.op).toBe("+");
      expect(stmt.expr.rhs.kind).toBe("binary");
      if (stmt.expr.rhs.kind === "binary") expect(stmt.expr.rhs.op).toBe("*");
    } else {
      throw new Error("unexpected AST");
    }
  });

  it("collects errors and continues", () => {
    const { errors } = parseText("pattern p\nbars a\nmust\n");
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/dsl/parser.test.ts
```

Expected: import error.

- [ ] **Step 3: Implement**

Create `src/dsl/parser.ts`:

```ts
import { CompileError, type SourceLoc } from "../errors";
import type {
  Assignment,
  Color,
  CompareOp,
  Direction,
  DrawKind,
  Expr,
  Field,
  FuncName,
  Predicate,
  Preference,
  Program,
  ShapeHint,
  Statement,
  Target,
} from "./ast";
import type { Token, TokenKind } from "./lexer";

const FIELDS = new Set<string>(["open", "high", "low", "close"]);
const FUNCS = new Set<string>(["body", "range", "mid"]);
const COLORS = new Set<string>(["amber", "blue", "green", "red", "gray", "white"]);
const HINT_NAMES = new Set<string>([
  "force_bullish",
  "force_bearish",
  "impulsive",
  "body_ratio",
  "equal_highs",
  "equal_lows",
]);

export type ParseResult = { program?: Program; errors: CompileError[] };

class Parser {
  private pos = 0;
  errors: CompileError[] = [];

  constructor(
    private readonly tokens: Token[],
    private readonly source: string,
  ) {}

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset]!;
  }
  private advance(): Token {
    const t = this.tokens[this.pos]!;
    if (t.kind !== "eof") this.pos++;
    return t;
  }
  private match(kind: TokenKind): boolean {
    if (this.peek().kind === kind) {
      this.advance();
      return true;
    }
    return false;
  }
  private expect(kind: TokenKind, message: string): Token {
    const t = this.peek();
    if (t.kind !== kind) {
      throw new CompileError("parse", message, t.loc);
    }
    return this.advance();
  }
  private expectIdent(value: string, message?: string): Token {
    const t = this.peek();
    if (t.kind !== "ident" || t.value !== value) {
      throw new CompileError("parse", message ?? `expected '${value}'`, t.loc);
    }
    return this.advance();
  }
  private skipNewlines(): void {
    while (this.peek().kind === "newline") this.advance();
  }

  parse(): Program {
    this.skipNewlines();
    const pattern = this.parsePatternDecl();
    this.endOfStatement();
    const bars = this.parseBarsDecl();
    this.endOfStatement();

    let series = 30;
    let seed: number | "random" = "random";

    while (this.peek().kind === "ident") {
      const name = this.peek().value;
      if (name === "series") {
        this.advance();
        const tok = this.expect("number", "expected integer after 'series'");
        series = Number(tok.value);
        this.endOfStatement();
      } else if (name === "seed") {
        this.advance();
        const t = this.peek();
        if (t.kind === "ident" && t.value === "random") {
          this.advance();
          seed = "random";
        } else if (t.kind === "number") {
          this.advance();
          seed = Number(t.value);
        } else {
          throw new CompileError("parse", "expected integer or 'random' after 'seed'", t.loc);
        }
        this.endOfStatement();
      } else {
        break;
      }
    }

    const statements: Statement[] = [];
    while (this.peek().kind !== "eof") {
      try {
        statements.push(this.parseStatement());
        this.endOfStatement();
      } catch (e) {
        if (e instanceof CompileError) {
          this.errors.push(e);
          this.synchronize();
        } else {
          throw e;
        }
      }
    }

    return { pattern, bars, series, seed, statements, source: this.source };
  }

  private parsePatternDecl(): string {
    this.expectIdent("pattern", "expected 'pattern' at start of program");
    const name = this.expect("ident", "expected pattern name");
    return name.value;
  }

  private parseBarsDecl(): string[] {
    this.expectIdent("bars", "expected 'bars' declaration after pattern");
    const ids: string[] = [];
    ids.push(this.expect("ident", "expected bar identifier").value);
    while (this.match("comma")) {
      ids.push(this.expect("ident", "expected bar identifier after ','").value);
    }
    return ids;
  }

  private parseStatement(): Statement {
    const t = this.peek();
    if (t.kind !== "ident") {
      throw new CompileError("parse", `unexpected ${t.kind}`, t.loc);
    }
    switch (t.value) {
      case "must":
        return this.parseMust();
      case "should":
        return this.parseShould();
      case "derive":
        return this.parseDerive();
      case "when":
        return this.parseWhen();
      case "draw":
        return this.parseDraw();
      case "label":
        return this.parseLabel();
      default:
        throw new CompileError("parse", `unknown statement '${t.value}'`, t.loc);
    }
  }

  private parseMust(): Statement {
    const start = this.advance();
    const predicate = this.parsePredicate();
    return { kind: "must", predicate, loc: start.loc };
  }

  private parseShould(): Statement {
    const start = this.advance();
    const t = this.peek();
    if (t.kind === "ident" && HINT_NAMES.has(t.value)) {
      const hint = this.parseHint();
      return {
        kind: "should",
        preference: { kind: "hint", hint },
        loc: start.loc,
      };
    }
    const predicate = this.parsePredicate();
    return {
      kind: "should",
      preference: { kind: "predicate", predicate },
      loc: start.loc,
    };
  }

  private parseHint(): ShapeHint {
    const head = this.advance(); // identifier already validated
    const name = head.value;
    const loc = head.loc;
    switch (name) {
      case "force_bullish":
      case "force_bearish":
      case "impulsive": {
        const bar = this.expect("ident", `expected bar identifier after '${name}'`);
        return { kind: name, bar: bar.value, loc };
      }
      case "body_ratio": {
        const bar = this.expect("ident", "expected bar identifier after 'body_ratio'");
        const op = this.peek();
        if (op.kind !== "ge") {
          throw new CompileError("parse", "expected '>=' in body_ratio hint", op.loc);
        }
        this.advance();
        const num = this.expect("number", "expected number after '>='");
        return { kind: "body_ratio", bar: bar.value, min: Number(num.value), loc };
      }
      case "equal_highs":
      case "equal_lows": {
        const left = this.expect("ident", `expected first bar identifier after '${name}'`);
        const right = this.expect("ident", `expected second bar identifier after '${name}'`);
        return { kind: name, left: left.value, right: right.value, loc };
      }
      default:
        throw new CompileError("parse", `unknown hint '${name}'`, loc);
    }
  }

  private parseDerive(): Statement {
    const start = this.advance();
    const target = this.parseTarget();
    this.expect("eq", "expected '=' in derive");
    const expr = this.parseExpr();
    return { kind: "derive", target, expr, loc: start.loc };
  }

  private parseWhen(): Statement {
    const start = this.advance();
    const predicate = this.parsePredicate();
    this.expectIdent("then", "expected 'then' in when statement");
    const target = this.parseTarget();
    this.expect("eq", "expected '=' in when assignment");
    const value = this.parseAssignmentValue();
    const assignment: Assignment = { target, value };
    return { kind: "when", predicate, assignment, loc: start.loc };
  }

  private parseAssignmentValue(): Assignment["value"] {
    const t = this.peek();
    if (t.kind === "ident" && this.peek(1).kind !== "dot" && this.peek(1).kind !== "lparen") {
      this.advance();
      return { kind: "ident", name: t.value, loc: t.loc };
    }
    return this.parseExpr();
  }

  private parseDraw(): Statement {
    const start = this.advance();
    const target = this.expect("ident", "expected target identifier after 'draw'");
    this.expectIdent("as", "expected 'as' in draw statement");
    const kindTok = this.expect("ident", "expected draw kind");
    if (kindTok.value !== "box" && kindTok.value !== "line") {
      throw new CompileError(
        "parse",
        `unsupported drawkind '${kindTok.value}' (v0 supports box and line only)`,
        kindTok.loc,
      );
    }
    let color: Color | undefined;
    if (this.peek().kind === "ident" && this.peek().kind !== "newline") {
      const colorTok = this.peek();
      if (COLORS.has(colorTok.value)) {
        this.advance();
        color = colorTok.value as Color;
      }
    }
    return {
      kind: "draw",
      target: target.value,
      drawKind: kindTok.value as DrawKind,
      color,
      loc: start.loc,
    };
  }

  private parseLabel(): Statement {
    const start = this.advance();
    const ref = this.expect("ident", "expected bar identifier after 'label'");
    this.expectIdent("as", "expected 'as' in label statement");
    const text = this.expect("ident", "expected label text");
    return { kind: "label", ref: ref.value, text: text.value, loc: start.loc };
  }

  private parseTarget(): Target {
    const obj = this.expect("ident", "expected target object identifier");
    this.expect("dot", "expected '.' in target");
    const prop = this.expect("ident", "expected target property identifier");
    return { object: obj.value, property: prop.value, loc: obj.loc };
  }

  private parsePredicate(): Predicate {
    const t = this.peek();
    if (t.kind === "ident" && t.value === "direction") {
      const start = this.advance();
      this.expect("lparen", "expected '(' after 'direction'");
      const bar = this.expect("ident", "expected bar identifier");
      this.expect("rparen", "expected ')' after bar identifier");
      this.expect("eq", "expected '=' in direction predicate");
      const dir = this.expect("ident", "expected 'bullish' or 'bearish'");
      if (dir.value !== "bullish" && dir.value !== "bearish") {
        throw new CompileError("parse", "expected 'bullish' or 'bearish'", dir.loc);
      }
      return {
        kind: "direction",
        bar: bar.value,
        direction: dir.value as Direction,
        loc: start.loc,
      };
    }

    const lhs = this.parseExpr();
    const opTok = this.peek();
    const op = compareOpFromToken(opTok.kind);
    if (!op) {
      throw new CompileError("parse", "expected comparison operator", opTok.loc);
    }
    this.advance();
    const rhs = this.parseExpr();
    return { kind: "compare", lhs, op, rhs, loc: lhs.loc };
  }

  private parseExpr(): Expr {
    let left = this.parseTerm();
    while (this.peek().kind === "plus" || this.peek().kind === "minus") {
      const opTok = this.advance();
      const right = this.parseTerm();
      left = {
        kind: "binary",
        op: opTok.kind === "plus" ? "+" : "-",
        lhs: left,
        rhs: right,
        loc: left.loc,
      };
    }
    return left;
  }

  private parseTerm(): Expr {
    let left = this.parseFactor();
    while (this.peek().kind === "star" || this.peek().kind === "slash") {
      const opTok = this.advance();
      const right = this.parseFactor();
      left = {
        kind: "binary",
        op: opTok.kind === "star" ? "*" : "/",
        lhs: left,
        rhs: right,
        loc: left.loc,
      };
    }
    return left;
  }

  private parseFactor(): Expr {
    const t = this.peek();
    if (t.kind === "number") {
      this.advance();
      return { kind: "number", value: Number(t.value), loc: t.loc };
    }
    if (t.kind === "lparen") {
      this.advance();
      const expr = this.parseExpr();
      this.expect("rparen", "expected ')'");
      return expr;
    }
    if (t.kind === "ident") {
      const start = this.advance();
      if (this.peek().kind === "lparen") {
        if (!FUNCS.has(start.value)) {
          throw new CompileError("parse", `unknown function '${start.value}'`, start.loc);
        }
        this.advance();
        const arg = this.expect("ident", "expected bar identifier");
        this.expect("rparen", "expected ')' after function argument");
        return {
          kind: "call",
          func: start.value as FuncName,
          bar: arg.value,
          loc: start.loc,
        };
      }
      this.expect("dot", "expected '.' after bar identifier");
      const field = this.expect("ident", "expected field name");
      if (!FIELDS.has(field.value)) {
        throw new CompileError(
          "parse",
          `unknown field '${field.value}' (expected open|high|low|close)`,
          field.loc,
        );
      }
      return {
        kind: "barField",
        bar: start.value,
        field: field.value as Field,
        loc: start.loc,
      };
    }
    throw new CompileError("parse", `unexpected ${t.kind}`, t.loc);
  }

  private endOfStatement(): void {
    const t = this.peek();
    if (t.kind === "newline" || t.kind === "eof") {
      if (t.kind === "newline") this.advance();
      this.skipNewlines();
      return;
    }
    throw new CompileError("parse", "expected end of line", t.loc);
  }

  private synchronize(): void {
    while (this.peek().kind !== "newline" && this.peek().kind !== "eof") this.advance();
    this.skipNewlines();
  }
}

function compareOpFromToken(kind: TokenKind): CompareOp | null {
  switch (kind) {
    case "lt":
      return "<";
    case "gt":
      return ">";
    case "le":
      return "<=";
    case "ge":
      return ">=";
    case "eq":
      return "=";
    default:
      return null;
  }
}

export function parse(tokens: Token[], source: string): ParseResult {
  const p = new Parser(tokens, source);
  try {
    const program = p.parse();
    return { program, errors: p.errors };
  } catch (e) {
    if (e instanceof CompileError) {
      return { errors: [...p.errors, e] };
    }
    throw e;
  }
}

// silence unused-loc warning on SourceLoc import for downstream consumers
export type _Loc = SourceLoc;
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/dsl/parser.test.ts
```

Expected: 9 passing.

- [ ] **Step 5: Commit**

```bash
git add src/dsl/parser.ts src/dsl/parser.test.ts
git commit -m "feat(dsl): add recursive-descent parser with error recovery"
```

---

## Task 6: `src/dsl/validator.ts`

**Files:**

- Create: `src/dsl/validator.ts`
- Create: `src/dsl/validator.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/dsl/validator.test.ts
```

- [ ] **Step 3: Implement**

Create `src/dsl/validator.ts`:

```ts
import { CompileError } from "../errors";
import type { Expr, Predicate, Program, Statement, Target } from "./ast";

export function validate(program: Program): CompileError[] {
  const errors: CompileError[] = [];
  const bars = new Set(program.bars);
  const derived = new Map<string, Set<string>>(); // object → set of properties
  const stateSlots = new Set<string>();

  // First pass: collect derives, check duplicates and bar refs in expressions.
  for (const stmt of program.statements) {
    if (stmt.kind !== "derive") continue;
    const props = derived.get(stmt.target.object) ?? new Set<string>();
    if (props.has(stmt.target.property)) {
      errors.push(
        new CompileError(
          "validate",
          `duplicate derive target '${stmt.target.object}.${stmt.target.property}'`,
          stmt.target.loc,
        ),
      );
      continue;
    }
    props.add(stmt.target.property);
    derived.set(stmt.target.object, props);
    checkExprBarRefs(stmt.expr, bars, errors);
  }

  // Cycle detection on derives.
  detectCycles(program.statements, errors);

  // Second pass: must/should/draw/label/when checks.
  for (const stmt of program.statements) {
    switch (stmt.kind) {
      case "must":
        checkPredicateBarRefs(stmt.predicate, bars, errors);
        break;
      case "should":
        if (stmt.preference.kind === "predicate") {
          checkPredicateBarRefs(stmt.preference.predicate, bars, errors);
        } else {
          checkHintBarRefs(stmt.preference.hint, bars, errors);
        }
        break;
      case "draw": {
        if (!derived.has(stmt.target)) {
          errors.push(
            new CompileError(
              "validate",
              `no derive produces '${stmt.target}'; cannot draw it`,
              stmt.loc,
            ),
          );
        }
        break;
      }
      case "label": {
        if (!bars.has(stmt.ref)) {
          errors.push(new CompileError("validate", `unknown bar '${stmt.ref}'`, stmt.loc));
        }
        break;
      }
      case "when": {
        checkPredicateBarRefs(stmt.predicate, bars, errors);
        const tgt = stmt.assignment.target;
        // state.* slots are declared lazily (validator records them).
        if (tgt.object === "state") {
          stateSlots.add(tgt.property);
        } else {
          // Otherwise the target must already be a derive target.
          const props = derived.get(tgt.object);
          if (!props?.has(tgt.property)) {
            errors.push(
              new CompileError(
                "validate",
                `assignment target '${tgt.object}.${tgt.property}' is not derived`,
                tgt.loc,
              ),
            );
          }
        }
        if (stmt.assignment.value.kind !== "ident") {
          checkExprBarRefs(stmt.assignment.value, bars, errors);
        }
        break;
      }
      case "derive":
        // already handled
        break;
    }
  }

  return errors;
}

function checkExprBarRefs(expr: Expr, bars: Set<string>, errors: CompileError[]): void {
  switch (expr.kind) {
    case "number":
      return;
    case "barField":
      if (!bars.has(expr.bar)) {
        errors.push(new CompileError("validate", `unknown bar '${expr.bar}'`, expr.loc));
      }
      return;
    case "call":
      if (!bars.has(expr.bar)) {
        errors.push(new CompileError("validate", `unknown bar '${expr.bar}'`, expr.loc));
      }
      return;
    case "binary":
      checkExprBarRefs(expr.lhs, bars, errors);
      checkExprBarRefs(expr.rhs, bars, errors);
      return;
  }
}

function checkPredicateBarRefs(p: Predicate, bars: Set<string>, errors: CompileError[]): void {
  if (p.kind === "compare") {
    checkExprBarRefs(p.lhs, bars, errors);
    checkExprBarRefs(p.rhs, bars, errors);
  } else {
    if (!bars.has(p.bar)) {
      errors.push(new CompileError("validate", `unknown bar '${p.bar}'`, p.loc));
    }
  }
}

type ShapeHintLike =
  | {
      kind: "force_bullish" | "force_bearish" | "impulsive";
      bar: string;
      loc: { line: number; col: number; length: number };
    }
  | {
      kind: "body_ratio";
      bar: string;
      min: number;
      loc: { line: number; col: number; length: number };
    }
  | {
      kind: "equal_highs" | "equal_lows";
      left: string;
      right: string;
      loc: { line: number; col: number; length: number };
    };

function checkHintBarRefs(hint: ShapeHintLike, bars: Set<string>, errors: CompileError[]): void {
  const refs: string[] =
    hint.kind === "equal_highs" || hint.kind === "equal_lows"
      ? [hint.left, hint.right]
      : [hint.bar];
  for (const r of refs) {
    if (!bars.has(r)) {
      errors.push(new CompileError("validate", `unknown bar '${r}'`, hint.loc));
    }
  }
}

function detectCycles(statements: Statement[], errors: CompileError[]): void {
  // Build dependency graph: derive target → set of (object.property) it reads from.
  const deps = new Map<string, Set<string>>();
  const known = new Set<string>();
  for (const s of statements) {
    if (s.kind !== "derive") continue;
    const key = `${s.target.object}.${s.target.property}`;
    known.add(key);
    deps.set(key, collectDerivedRefs(s.expr));
  }

  // Standard DFS for cycles, ignoring deps that aren't derive targets (those refer to bars/numbers).
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const k of deps.keys()) color.set(k, WHITE);

  const visit = (node: string): boolean => {
    color.set(node, GRAY);
    for (const next of deps.get(node) ?? []) {
      if (!known.has(next)) continue;
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) return true;
      if (c === WHITE && visit(next)) return true;
    }
    color.set(node, BLACK);
    return false;
  };

  for (const node of deps.keys()) {
    if (color.get(node) === WHITE && visit(node)) {
      errors.push(new CompileError("validate", `cycle in derive graph involving '${node}'`));
      return;
    }
  }
}

function collectDerivedRefs(expr: Expr): Set<string> {
  const out = new Set<string>();
  const walk = (e: Expr): void => {
    if (e.kind === "binary") {
      walk(e.lhs);
      walk(e.rhs);
    } else if (e.kind === "barField") {
      out.add(`${e.bar}.${e.field}`);
    }
    // numbers and calls don't reference derive targets
  };
  walk(expr);
  return out;
}

// keep Target type used for clarity in future callers
export type _Target = Target;
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/dsl/validator.test.ts
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/dsl/validator.ts src/dsl/validator.test.ts
git commit -m "feat(dsl): add validator (bar refs, dup targets, draw targets, derive cycles)"
```

---

## Task 7: `src/semantic/model.ts` + `src/semantic/compiler.ts`

**Files:**

- Create: `src/semantic/model.ts`
- Create: `src/semantic/compiler.ts`
- Create: `src/semantic/compiler.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/semantic/compiler.test.ts
```

- [ ] **Step 3: Implement model**

Create `src/semantic/model.ts`:

```ts
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
```

- [ ] **Step 4: Implement compiler**

Create `src/semantic/compiler.ts`:

```ts
import { CompileError } from "../errors";
import type { Expr, Program } from "../dsl/ast";
import type {
  DrawSpec,
  LabelSpec,
  LevelSpec,
  RangeSpec,
  SemanticModel,
  StateSpec,
  WhenThenSpec,
  ZoneSpec,
} from "./model";

export type SemanticResult = { model?: SemanticModel; errors: CompileError[] };

export function compileSemantic(program: Program): SemanticResult {
  const errors: CompileError[] = [];

  const groups = new Map<string, Map<string, Expr>>(); // object → property → expr
  for (const stmt of program.statements) {
    if (stmt.kind !== "derive") continue;
    let g = groups.get(stmt.target.object);
    if (!g) {
      g = new Map();
      groups.set(stmt.target.object, g);
    }
    g.set(stmt.target.property, stmt.expr);
  }

  const zones = new Map<string, ZoneSpec>();
  const levels = new Map<string, LevelSpec>();
  const ranges = new Map<string, RangeSpec>();
  const states = new Map<string, StateSpec>();

  for (const [name, props] of groups) {
    const keys = new Set(props.keys());
    if (keys.has("low") && keys.has("high") && keys.size === 2) {
      zones.set(name, { lowExpr: props.get("low")!, highExpr: props.get("high")! });
      continue;
    }
    if (keys.has("low") && keys.has("mid") && keys.has("high") && keys.size === 3) {
      ranges.set(name, {
        lowExpr: props.get("low")!,
        midExpr: props.get("mid")!,
        highExpr: props.get("high")!,
      });
      continue;
    }
    if (keys.has("level") && keys.size === 1) {
      levels.set(name, { valueExpr: props.get("level")! });
      continue;
    }
    if (keys.has("value") && keys.size === 1) {
      states.set(name, { initial: undefined });
      continue;
    }
    const onlyKey = [...keys][0];
    if (keys.has("low") && !keys.has("high")) {
      errors.push(new CompileError("semantic", `zone '${name}' missing 'high' derive`));
      continue;
    }
    if (keys.has("high") && !keys.has("low")) {
      errors.push(new CompileError("semantic", `zone '${name}' missing 'low' derive`));
      continue;
    }
    errors.push(
      new CompileError(
        "semantic",
        `unknown derive shape '${name}' (got [${[...keys].join(", ")}]; ` +
          `expected {low,high} | {low,mid,high} | {level} | {value})`,
      ),
    );
    void onlyKey;
  }

  const draws: DrawSpec[] = [];
  const labels: LabelSpec[] = [];
  const whenThen: WhenThenSpec[] = [];
  const must: Program["statements"] = [] as never;
  const shouldHints: SemanticModel["shouldHints"] = [];
  const shouldPredicates: SemanticModel["shouldPredicates"] = [];

  for (const stmt of program.statements) {
    switch (stmt.kind) {
      case "must":
        (must as unknown[]).push(stmt.predicate);
        break;
      case "should":
        if (stmt.preference.kind === "hint") shouldHints.push(stmt.preference.hint);
        else shouldPredicates.push(stmt.preference.predicate);
        break;
      case "draw": {
        const targetKind = zones.has(stmt.target)
          ? "zone"
          : levels.has(stmt.target)
            ? "level"
            : null;
        if (!targetKind) {
          errors.push(
            new CompileError(
              "semantic",
              `draw target '${stmt.target}' has no semantic type (zone or level)`,
              stmt.loc,
            ),
          );
          break;
        }
        draws.push({
          target: stmt.target,
          targetKind,
          drawKind: stmt.drawKind,
          color: stmt.color,
        });
        break;
      }
      case "label":
        labels.push({ barRef: stmt.ref, text: stmt.text });
        break;
      case "when":
        whenThen.push({ predicate: stmt.predicate, assignment: stmt.assignment });
        // Lazily register state slots that originate from when ... then.
        if (stmt.assignment.target.object === "state" && !states.has("state")) {
          states.set("state", { initial: undefined });
        }
        break;
      case "derive":
        break;
    }
  }

  if (errors.length > 0) return { errors };

  const model: SemanticModel = {
    pattern: program.pattern,
    bars: program.bars,
    series: program.series,
    seed: program.seed,
    zones,
    levels,
    ranges,
    states,
    draws,
    labels,
    must: must as unknown as SemanticModel["must"],
    shouldHints,
    shouldPredicates,
    whenThen,
  };
  return { model, errors };
}
```

- [ ] **Step 5: Run, expect pass**

```bash
bun run test src/semantic/compiler.test.ts
```

Expected: 7 passing.

- [ ] **Step 6: Commit**

```bash
git add src/semantic/model.ts src/semantic/compiler.ts src/semantic/compiler.test.ts
git commit -m "feat(semantic): add SemanticModel and naming-convention compiler"
```

---

## Task 8: `src/compile.ts` (orchestrator)

**Files:**

- Create: `src/compile.ts`
- Create: `src/compile.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/compile.test.ts
```

- [ ] **Step 3: Implement**

Create `src/compile.ts`:

```ts
import type { CompileError } from "./errors";
import type { Program } from "./dsl/ast";
import { tokenize } from "./dsl/lexer";
import { parse } from "./dsl/parser";
import { validate } from "./dsl/validator";
import { compileSemantic } from "./semantic/compiler";
import type { SemanticModel } from "./semantic/model";

export type CompileResult = {
  ast?: Program;
  semantic?: SemanticModel;
  errors: CompileError[];
};

export function compile(source: string): CompileResult {
  const errors: CompileError[] = [];
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (e) {
    if ((e as CompileError).name === "CompileError") {
      return { errors: [e as CompileError] };
    }
    throw e;
  }

  const { program, errors: parseErrors } = parse(tokens, source);
  errors.push(...parseErrors);
  if (!program) return { errors };

  const validateErrors = validate(program);
  errors.push(...validateErrors);
  if (validateErrors.length > 0) return { ast: program, errors };

  const { model, errors: semanticErrors } = compileSemantic(program);
  errors.push(...semanticErrors);
  return { ast: program, semantic: model, errors };
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/compile.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/compile.ts src/compile.test.ts
git commit -m "feat: add compile() orchestrator (lex → parse → validate → semantic)"
```

---

## Task 9: `src/constraint/evaluator.ts`

**Files:**

- Create: `src/constraint/evaluator.ts`
- Create: `src/constraint/evaluator.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { Candle } from "../render/plan";
import { evaluateExpr, evaluatePredicate } from "./evaluator";

const C = (over: Partial<Candle> = {}): Candle => ({
  time: 1,
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  ...over,
});

describe("evaluateExpr", () => {
  it("evaluates a number", () => {
    expect(evaluateExpr({ kind: "number", value: 7, loc }, ctx())).toBe(7);
  });

  it("evaluates bar.field", () => {
    const r = evaluateExpr({ kind: "barField", bar: "a", field: "high", loc }, ctx());
    expect(r).toBe(110);
  });

  it("evaluates body/range/mid", () => {
    expect(evaluateExpr({ kind: "call", func: "body", bar: "a", loc }, ctx())).toBe(5);
    expect(evaluateExpr({ kind: "call", func: "range", bar: "a", loc }, ctx())).toBe(15);
    expect(evaluateExpr({ kind: "call", func: "mid", bar: "a", loc }, ctx())).toBe(102.5);
  });

  it("evaluates binary precedence (already in tree)", () => {
    const expr = {
      kind: "binary" as const,
      op: "+" as const,
      lhs: { kind: "number" as const, value: 1, loc },
      rhs: {
        kind: "binary" as const,
        op: "*" as const,
        lhs: { kind: "number" as const, value: 2, loc },
        rhs: { kind: "number" as const, value: 3, loc },
      },
      loc,
    };
    expect(evaluateExpr(expr, ctx())).toBe(7);
  });
});

describe("evaluatePredicate", () => {
  it("compares", () => {
    const r = evaluatePredicate(
      {
        kind: "compare",
        op: "<",
        lhs: { kind: "number", value: 1, loc },
        rhs: { kind: "number", value: 2, loc },
        loc,
      },
      ctx(),
    );
    expect(r.passed).toBe(true);
  });

  it("evaluates direction(bullish)", () => {
    const r = evaluatePredicate(
      { kind: "direction", bar: "a", direction: "bullish", loc },
      ctx({ a: C({ open: 100, close: 105 }) }),
    );
    expect(r.passed).toBe(true);
  });
});

const loc = { line: 1, col: 1, length: 1 };
function ctx(over?: Record<string, Candle>) {
  const a = over?.a ?? C();
  return { bars: [a], refs: { a: 0 }, derived: { zones: {}, levels: {} } };
}
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/constraint/evaluator.test.ts
```

- [ ] **Step 3: Implement**

Create `src/constraint/evaluator.ts`:

```ts
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
    case "barField":
      return getBar(expr.bar, ctx)[expr.field];
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
```

- [ ] **Step 4: Add minimal `src/render/plan.ts` placeholder so the import resolves**

Create `src/render/plan.ts` with **only** the `Candle` type for now (rest of the plan types come in Task 14):

```ts
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

// Overlay types added in Task 14.
```

- [ ] **Step 5: Run, expect pass**

```bash
bun run test src/constraint/evaluator.test.ts
```

Expected: 6 passing.

- [ ] **Step 6: Commit**

```bash
git add src/constraint/evaluator.ts src/constraint/evaluator.test.ts src/render/plan.ts
git commit -m "feat(constraint): add expression and predicate evaluator"
```

---

## Task 10: `src/generator/base-series.ts`

**Files:**

- Create: `src/generator/base-series.ts`
- Create: `src/generator/base-series.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { generateBaseSeries, mulberry32 } from "./base-series";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("generateBaseSeries", () => {
  it("produces N candles with valid OHLC ordering", () => {
    const bars = generateBaseSeries(42, 30);
    expect(bars).toHaveLength(30);
    for (const b of bars) {
      expect(b.high).toBeGreaterThanOrEqual(Math.max(b.open, b.close));
      expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
      expect(b.high).toBeGreaterThan(b.low);
    }
  });

  it("is deterministic per seed", () => {
    expect(generateBaseSeries(42, 5)).toEqual(generateBaseSeries(42, 5));
  });

  it("uses sequential times", () => {
    const bars = generateBaseSeries(7, 4);
    expect(bars.map((b) => b.time)).toEqual([1, 2, 3, 4]);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/generator/base-series.test.ts
```

- [ ] **Step 3: Implement**

Create `src/generator/base-series.ts`:

```ts
import type { Candle } from "../render/plan";

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateBaseSeries(seed: number, count: number, basePrice = 100): Candle[] {
  const rnd = mulberry32(seed);
  const bars: Candle[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const drift = (rnd() - 0.5) * 2; // [-1, 1]
    const open = price;
    const close = open + drift;
    const wick = Math.max(0.1, rnd() * 1.5);
    const high = Math.max(open, close) + wick * rnd();
    const low = Math.min(open, close) - wick * rnd();
    bars.push({
      time: i + 1,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
    });
    price = close;
  }
  return bars;
}

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/generator/base-series.test.ts
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/generator/base-series.ts src/generator/base-series.test.ts
git commit -m "feat(generator): add seeded base-series random walk (mulberry32)"
```

---

## Task 11: `src/generator/hooks.ts`

**Files:**

- Create: `src/generator/hooks.ts`
- Create: `src/generator/hooks.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { applyHooks } from "./hooks";
import type { Candle } from "../render/plan";

const C = (over: Partial<Candle>): Candle => ({
  time: 0,
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  ...over,
});

describe("applyHooks", () => {
  it("force_bullish flips a bearish bar without changing range", () => {
    const bars = [C({ open: 105, close: 95, high: 110, low: 90 })];
    applyHooks([{ kind: "force_bullish", bar: "a", loc }], {
      bars,
      refs: { a: 0 },
      tolerance: 0.001,
    });
    expect(bars[0]!.close).toBeGreaterThan(bars[0]!.open);
    expect(bars[0]!.high).toBe(110);
    expect(bars[0]!.low).toBe(90);
  });

  it("body_ratio widens body to meet ratio", () => {
    const bars = [C({ open: 100, close: 101, high: 110, low: 90 })];
    applyHooks([{ kind: "body_ratio", bar: "a", min: 0.7, loc }], {
      bars,
      refs: { a: 0 },
      tolerance: 0.001,
    });
    const b = bars[0]!;
    const ratio = Math.abs(b.close - b.open) / (b.high - b.low);
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });

  it("equal_highs aligns within tolerance", () => {
    const bars = [C({ time: 1, high: 120 }), C({ time: 2, high: 100 })];
    applyHooks([{ kind: "equal_highs", left: "a", right: "b", loc }], {
      bars,
      refs: { a: 0, b: 1 },
      tolerance: 0.001,
    });
    expect(Math.abs(bars[1]!.high - bars[0]!.high) / bars[0]!.high).toBeLessThanOrEqual(0.0011);
  });

  it("impulsive forces direction, body, and large range", () => {
    const bars = [
      C({ open: 100, close: 100.1, high: 100.2, low: 99.9 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100.05, high: 100.1, low: 99.95 }),
      C({ open: 100, close: 100, high: 100, low: 100 }),
    ];
    applyHooks([{ kind: "impulsive", bar: "x", loc }], { bars, refs: { x: 5 }, tolerance: 0.001 });
    const b = bars[5]!;
    expect(b.close).toBeGreaterThan(b.open);
    const ratio = Math.abs(b.close - b.open) / (b.high - b.low);
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });
});

const loc = { line: 1, col: 1, length: 1 };
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/generator/hooks.test.ts
```

- [ ] **Step 3: Implement**

Create `src/generator/hooks.ts`:

```ts
import type { ShapeHint } from "../dsl/ast";
import type { Candle } from "../render/plan";

export type HookContext = {
  bars: Candle[];
  refs: Record<string, number>;
  tolerance: number; // fraction of midprice; default 0.001
};

export function applyHooks(hints: ShapeHint[], ctx: HookContext): void {
  for (const hint of hints) {
    apply(hint, ctx);
  }
}

function apply(hint: ShapeHint, ctx: HookContext): void {
  switch (hint.kind) {
    case "force_bullish":
      forceDirection(getBar(hint.bar, ctx), "bullish");
      return;
    case "force_bearish":
      forceDirection(getBar(hint.bar, ctx), "bearish");
      return;
    case "body_ratio": {
      const b = getBar(hint.bar, ctx);
      ensureBodyRatio(b, hint.min);
      return;
    }
    case "impulsive": {
      const b = getBar(hint.bar, ctx);
      forceDirection(b, b.close >= b.open ? "bullish" : "bullish");
      ensureBodyRatio(b, 0.7);
      ensureLargeRange(b, ctx, 1.5);
      return;
    }
    case "equal_highs": {
      const a = getBar(hint.left, ctx);
      const b = getBar(hint.right, ctx);
      const eps = mid(a) * ctx.tolerance;
      b.high = a.high + (Math.random() < 0.5 ? -eps : eps);
      reorderHighLow(b);
      return;
    }
    case "equal_lows": {
      const a = getBar(hint.left, ctx);
      const b = getBar(hint.right, ctx);
      const eps = mid(a) * ctx.tolerance;
      b.low = a.low + (Math.random() < 0.5 ? -eps : eps);
      reorderHighLow(b);
      return;
    }
  }
}

function forceDirection(b: Candle, dir: "bullish" | "bearish"): void {
  const bullish = b.close > b.open;
  const want = dir === "bullish";
  if (bullish === want) return;
  const tmp = b.open;
  b.open = b.close;
  b.close = tmp;
}

function ensureBodyRatio(b: Candle, ratio: number): void {
  const range = b.high - b.low;
  if (range === 0) return;
  const body = Math.abs(b.close - b.open);
  if (body / range >= ratio) return;
  // Shrink range symmetrically toward center until body/range = ratio.
  const targetRange = body / ratio;
  const center = (b.high + b.low) / 2;
  b.high = center + targetRange / 2;
  b.low = center - targetRange / 2;
  // Make sure open/close stay inside.
  if (b.high < Math.max(b.open, b.close)) b.high = Math.max(b.open, b.close);
  if (b.low > Math.min(b.open, b.close)) b.low = Math.min(b.open, b.close);
}

function ensureLargeRange(b: Candle, ctx: HookContext, multiplier: number): void {
  const idx = findIndex(b, ctx);
  const window = ctx.bars.slice(Math.max(0, idx - 5), idx);
  if (window.length === 0) return;
  const avg = window.reduce((acc, x) => acc + (x.high - x.low), 0) / window.length;
  const target = avg * multiplier;
  if (b.high - b.low >= target) return;
  const center = (b.high + b.low) / 2;
  b.high = center + target / 2;
  b.low = center - target / 2;
  if (b.high < Math.max(b.open, b.close)) b.high = Math.max(b.open, b.close);
  if (b.low > Math.min(b.open, b.close)) b.low = Math.min(b.open, b.close);
}

function reorderHighLow(b: Candle): void {
  if (b.high < Math.max(b.open, b.close)) b.high = Math.max(b.open, b.close);
  if (b.low > Math.min(b.open, b.close)) b.low = Math.min(b.open, b.close);
  if (b.low > b.high) {
    const tmp = b.low;
    b.low = b.high;
    b.high = tmp;
  }
}

function mid(b: Candle): number {
  return (b.high + b.low) / 2;
}

function getBar(name: string, ctx: HookContext): Candle {
  const idx = ctx.refs[name];
  if (idx === undefined || ctx.bars[idx] === undefined) {
    throw new Error(`hook references unknown bar '${name}'`);
  }
  return ctx.bars[idx]!;
}

function findIndex(b: Candle, ctx: HookContext): number {
  return ctx.bars.indexOf(b);
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/generator/hooks.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/generator/hooks.ts src/generator/hooks.test.ts
git commit -m "feat(generator): add ShapeHint reshape hooks"
```

---

## Task 12: `src/generator/derive.ts` and `src/generator/transitions.ts`

**Files:**

- Create: `src/generator/derive.ts`, `src/generator/derive.test.ts`
- Create: `src/generator/transitions.ts`, `src/generator/transitions.test.ts`

- [ ] **Step 1: Write failing test for derive**

```ts
import { describe, expect, it } from "vitest";
import { compile } from "../compile";
import { applyDerives } from "./derive";

describe("applyDerives", () => {
  it("computes zones and levels", () => {
    const r = compile(`pattern p
bars a, c
derive gap.low = a.high
derive gap.high = c.low
derive bos.level = a.high + 1
`);
    const m = r.semantic!;
    const bars = [
      { time: 1, open: 100, high: 105, low: 95, close: 103 },
      { time: 2, open: 103, high: 110, low: 102, close: 108 },
    ];
    const derived = applyDerives(m, {
      bars,
      refs: { a: 0, c: 1 },
      derived: { zones: {}, levels: {} },
    });
    expect(derived.zones.gap).toEqual({ low: 105, high: 102 });
    expect(derived.levels.bos).toBe(106);
  });
});
```

- [ ] **Step 2: Implement derive**

Create `src/generator/derive.ts`:

```ts
import { evaluateExpr, type EvalContext, type DerivedView } from "../constraint/evaluator";
import type { SemanticModel } from "../semantic/model";

export function applyDerives(model: SemanticModel, ctx: EvalContext): DerivedView {
  const derived: DerivedView = { zones: {}, levels: {} };
  // Temporarily expose under-construction derived values to the evaluator
  // so later derives can reference earlier zone/level values.
  const evalCtx: EvalContext = { ...ctx, derived };
  for (const [name, spec] of model.zones) {
    const low = evaluateExpr(spec.lowExpr, evalCtx);
    const high = evaluateExpr(spec.highExpr, evalCtx);
    derived.zones[name] = { low, high };
  }
  for (const [name, spec] of model.levels) {
    derived.levels[name] = evaluateExpr(spec.valueExpr, evalCtx);
  }
  return derived;
}
```

- [ ] **Step 3: Run, expect pass**

```bash
bun run test src/generator/derive.test.ts
```

- [ ] **Step 4: Write failing test for transitions**

```ts
import { describe, expect, it } from "vitest";
import { compile } from "../compile";
import { applyDerives } from "./derive";
import { applyTransitions } from "./transitions";

describe("applyTransitions", () => {
  it("sets state.value when predicate holds", () => {
    const r = compile(`pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
when c.low <= gap.high then state.value = mitigated
`);
    const bars = [
      { time: 1, open: 100, high: 105, low: 95, close: 103 },
      { time: 2, open: 103, high: 108, low: 102, close: 107 },
      { time: 3, open: 107, high: 110, low: 106, close: 109 },
    ];
    const ctx = { bars, refs: { a: 0, b: 1, c: 2 }, derived: { zones: {}, levels: {} } };
    const derived = applyDerives(r.semantic!, ctx);
    const state = applyTransitions(r.semantic!, { ...ctx, derived });
    expect(state.value).toBe("mitigated");
  });

  it("leaves state empty when predicate fails", () => {
    const r = compile(`pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
when c.low > gap.high then state.value = mitigated
`);
    const bars = [
      { time: 1, open: 100, high: 105, low: 95, close: 103 },
      { time: 2, open: 103, high: 108, low: 102, close: 107 },
      { time: 3, open: 107, high: 110, low: 106, close: 109 },
    ];
    const ctx = { bars, refs: { a: 0, b: 1, c: 2 }, derived: { zones: {}, levels: {} } };
    const derived = applyDerives(r.semantic!, ctx);
    const state = applyTransitions(r.semantic!, { ...ctx, derived });
    expect(state.value).toBeUndefined();
  });
});
```

- [ ] **Step 5: Implement transitions**

Create `src/generator/transitions.ts`:

```ts
import type { SemanticModel } from "../semantic/model";
import { evaluateExpr, evaluatePredicate, type EvalContext } from "../constraint/evaluator";

export function applyTransitions(
  model: SemanticModel,
  ctx: EvalContext,
): Record<string, number | string> {
  const state: Record<string, number | string> = {};
  for (const wt of model.whenThen) {
    const result = evaluatePredicate(wt.predicate, ctx);
    if (!result.passed) continue;
    const value =
      wt.assignment.value.kind === "ident"
        ? wt.assignment.value.name
        : evaluateExpr(wt.assignment.value, ctx);
    if (wt.assignment.target.object === "state") {
      state[wt.assignment.target.property] = value;
    }
  }
  return state;
}
```

- [ ] **Step 6: Run, expect both pass**

```bash
bun run test src/generator/derive.test.ts src/generator/transitions.test.ts
```

Expected: 3 passing total.

- [ ] **Step 7: Commit**

```bash
git add src/generator/derive.ts src/generator/derive.test.ts \
        src/generator/transitions.ts src/generator/transitions.test.ts
git commit -m "feat(generator): add derive and when-then transition engines"
```

---

## Task 13: `src/generator/repair.ts` + `src/generator/generate.ts`

**Files:**

- Create: `src/generator/repair.ts`, `src/generator/repair.test.ts`
- Create: `src/generator/generate.ts`, `src/generator/generate.test.ts`

- [ ] **Step 1: Write failing test for repair**

```ts
import { describe, expect, it } from "vitest";
import { attemptRepair } from "./repair";
import { evaluatePredicate } from "../constraint/evaluator";
import type { Candle } from "../render/plan";

const loc = { line: 1, col: 1, length: 1 };
const C = (o: Partial<Candle>): Candle => ({
  time: 0,
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  ...o,
});

describe("attemptRepair", () => {
  it("nudges to satisfy a.high < c.low when violated", () => {
    const bars = [
      C({ time: 1, high: 120, low: 100, open: 105, close: 115 }),
      C({ time: 2, high: 130, low: 125, open: 126, close: 128 }),
      C({ time: 3, high: 110, low: 100, open: 102, close: 108 }),
    ];
    const ctx = { bars, refs: { a: 0, b: 1, c: 2 }, derived: { zones: {}, levels: {} } };
    const predicate = {
      kind: "compare" as const,
      op: "<" as const,
      lhs: { kind: "barField" as const, bar: "a", field: "high" as const, loc },
      rhs: { kind: "barField" as const, bar: "c", field: "low" as const, loc },
      loc,
    };
    expect(evaluatePredicate(predicate, ctx).passed).toBe(false);
    attemptRepair(predicate, ctx);
    expect(evaluatePredicate(predicate, ctx).passed).toBe(true);
  });
});
```

- [ ] **Step 2: Implement repair**

Create `src/generator/repair.ts`:

```ts
import type { Predicate } from "../dsl/ast";
import { evaluateExpr, type EvalContext } from "../constraint/evaluator";

const EPS_FRACTION = 0.001;

export function attemptRepair(predicate: Predicate, ctx: EvalContext): boolean {
  if (predicate.kind !== "compare") return false;
  const l = evaluateExpr(predicate.lhs, ctx);
  const r = evaluateExpr(predicate.rhs, ctx);

  const lTarget = singleBarFieldTarget(predicate.lhs);
  const rTarget = singleBarFieldTarget(predicate.rhs);
  if (!lTarget && !rTarget) return false;

  // Pick a reference price for epsilon scaling.
  const reference = (Math.abs(l) + Math.abs(r)) / 2 || 100;
  const eps = reference * EPS_FRACTION;

  const desiredDelta = solveDelta(predicate.op, l, r, eps);
  if (desiredDelta === null) return false;

  // Prefer mutating the rhs side if both are mutable; tie-break rhs.
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

function singleBarFieldTarget(
  expr: Predicate extends infer _ ? import("../dsl/ast").Expr : never,
): FieldTarget | null {
  if (expr.kind === "barField") return { bar: expr.bar, field: expr.field };
  return null;
}

function solveDelta(
  op: Predicate["kind"] extends "compare" ? "<" | ">" | "<=" | ">=" | "=" : never,
  l: number,
  r: number,
  eps: number,
): number | null {
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
  }
}

function nudge(ctx: EvalContext, target: FieldTarget, delta: number): void {
  const idx = ctx.refs[target.bar];
  if (idx === undefined) return;
  const bar = ctx.bars[idx];
  if (!bar) return;
  bar[target.field] += delta;
  // Preserve OHLC invariants.
  bar.high = Math.max(bar.high, bar.open, bar.close);
  bar.low = Math.min(bar.low, bar.open, bar.close);
}
```

- [ ] **Step 3: Run, expect pass**

```bash
bun run test src/generator/repair.test.ts
```

- [ ] **Step 4: Write failing test for generate**

```ts
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
});
```

- [ ] **Step 5: Implement generate**

Create `src/generator/generate.ts`:

```ts
import type { CompileResult } from "../compile";
import { compile } from "../compile";
import { GenerationError } from "../errors";
import type { Predicate } from "../dsl/ast";
import type { SemanticModel } from "../semantic/model";
import type { Candle } from "../render/plan";
import { evaluatePredicate, type DerivedView, type EvalContext } from "../constraint/evaluator";
import { generateBaseSeries } from "./base-series";
import { applyHooks, type HookContext } from "./hooks";
import { applyDerives } from "./derive";
import { attemptRepair } from "./repair";
import { applyTransitions } from "./transitions";

export type RefMap = Record<string, number>;

export type PatternTemplate = {
  name: string;
  source: string;
  mapping: (bars: Candle[]) => RefMap;
};

export type GenerateOptions = {
  seed?: number; // overrides program seed
  tolerance?: { equalPrice?: number };
};

export type GenerateResult = {
  seed: number;
  bars: Candle[];
  refs: RefMap;
  derived: DerivedView;
  state: Record<string, number | string>;
  verification: {
    must: { predicate: Predicate; passed: boolean; lhs?: number; rhs?: number }[];
    should: { predicate: Predicate; passed: boolean; lhs?: number; rhs?: number }[];
  };
};

export function generate(
  spec: CompileResult | string | PatternTemplate,
  opts: GenerateOptions = {},
): GenerateResult {
  const { compiled, mapping, sourceForCompile } = resolveSpec(spec);
  if (!compiled.semantic) {
    throw new Error(
      `cannot generate: compile produced ${compiled.errors.length} error(s); ` +
        `first: ${compiled.errors[0]?.message ?? "(none)"}`,
    );
  }
  const model = compiled.semantic;
  const seed = resolveSeed(model, opts);
  void sourceForCompile;

  const bars = generateBaseSeries(seed, model.series);
  const refs = mapping ? mapping(bars) : defaultMapping(model.bars, bars.length);

  const tolerance = opts.tolerance?.equalPrice ?? 0.001;
  const hookCtx: HookContext = { bars, refs, tolerance };
  applyHooks(model.shouldHints, hookCtx);

  let derived = applyDerives(model, { bars, refs, derived: { zones: {}, levels: {} }, seed });
  let mustResults = checkMust(model, { bars, refs, derived, seed });

  if (mustResults.some((r) => !r.passed)) {
    for (const m of mustResults) {
      if (m.passed) continue;
      attemptRepair(m.predicate, { bars, refs, derived, seed });
    }
    derived = applyDerives(model, { bars, refs, derived: { zones: {}, levels: {} }, seed });
    mustResults = checkMust(model, { bars, refs, derived, seed });
    if (mustResults.some((r) => !r.passed)) {
      const failed = mustResults.find((r) => !r.passed)!;
      throw new GenerationError(
        "must_failed",
        `must predicate failed after repair: lhs=${failed.lhs}, rhs=${failed.rhs}`,
        seed,
        failed.predicate,
        { repaired: true },
      );
    }
  }

  const ctx: EvalContext = { bars, refs, derived, seed };
  const shouldResults = model.shouldPredicates.map((p) => ({
    predicate: p,
    ...evaluatePredicate(p, ctx),
  }));
  const state = applyTransitions(model, ctx);

  return {
    seed,
    bars,
    refs,
    derived,
    state,
    verification: { must: mustResults, should: shouldResults },
  };
}

function checkMust(model: SemanticModel, ctx: EvalContext) {
  return model.must.map((p) => ({
    predicate: p,
    ...evaluatePredicate(p, ctx),
  }));
}

function resolveSpec(spec: CompileResult | string | PatternTemplate): {
  compiled: CompileResult;
  mapping?: PatternTemplate["mapping"];
  sourceForCompile?: string;
} {
  if (typeof spec === "string") {
    return { compiled: compile(spec), sourceForCompile: spec };
  }
  if ("source" in spec && "mapping" in spec) {
    return { compiled: compile(spec.source), mapping: spec.mapping, sourceForCompile: spec.source };
  }
  return { compiled: spec };
}

function resolveSeed(model: SemanticModel, opts: GenerateOptions): number {
  if (opts.seed !== undefined) return opts.seed;
  if (model.seed === "random") {
    return Math.floor(Math.random() * 0x7fffffff);
  }
  return model.seed;
}

function defaultMapping(barNames: string[], total: number): RefMap {
  // Default: place declared bars at the END of the series, contiguous.
  const refs: RefMap = {};
  const offset = total - barNames.length;
  barNames.forEach((name, i) => {
    refs[name] = offset + i;
  });
  return refs;
}
```

- [ ] **Step 6: Run, expect pass**

```bash
bun run test src/generator/generate.test.ts
```

Expected: 3 passing.

- [ ] **Step 7: Commit**

```bash
git add src/generator/repair.ts src/generator/repair.test.ts \
        src/generator/generate.ts src/generator/generate.test.ts
git commit -m "feat(generator): add repair pass and generate orchestrator"
```

---

## Task 14: `src/render/plan.ts` (full types) + `src/render/plan-builder.ts`

**Files:**

- Modify: `src/render/plan.ts` (add overlay types)
- Create: `src/render/plan-builder.ts`
- Create: `src/render/plan-builder.test.ts`

- [ ] **Step 1: Extend `src/render/plan.ts`**

Replace its contents with:

```ts
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ZoneOverlay = {
  name: string;
  time1: number;
  price1: number;
  time2: number;
  price2: number;
  color?: string;
  opacity?: number;
};

export type LevelOverlay = {
  name: string;
  price: number;
  color?: string;
  lineStyle?: "solid" | "dashed" | "dotted";
  lineWidth?: number;
};

export type MarkerSpec = {
  time: number;
  position: "aboveBar" | "belowBar" | "inBar";
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  color?: string;
  text?: string;
};

export type RenderPlan = {
  candles: Candle[];
  zones: ZoneOverlay[];
  levels: LevelOverlay[];
  markers: MarkerSpec[];
};
```

- [ ] **Step 2: Write failing test for plan-builder**

```ts
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
label b as displacement
`);
    const r = generate(c, {});
    const plan = buildPlan(r, c.semantic!);
    expect(plan.candles).toHaveLength(30);
    expect(plan.zones).toHaveLength(1);
    expect(plan.zones[0]?.name).toBe("gap");
    expect(plan.zones[0]?.color).toBe("#f59e0b66");
    expect(plan.markers).toHaveLength(1);
    expect(plan.markers[0]?.text).toBe("displacement");
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
});
```

- [ ] **Step 3: Implement plan-builder**

Create `src/render/plan-builder.ts`:

```ts
import type { GenerateResult } from "../generator/generate";
import type { SemanticModel } from "../semantic/model";
import type { Color } from "../dsl/ast";
import { RenderError } from "../errors";
import type { LevelOverlay, MarkerSpec, RenderPlan, ZoneOverlay } from "./plan";

const COLOR_FILL: Record<Color, string> = {
  amber: "#f59e0b66",
  blue: "#3b82f666",
  green: "#22c55e66",
  red: "#ef444466",
  gray: "#9ca3af66",
  white: "#ffffff44",
};

const COLOR_LINE: Record<Color, string> = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  gray: "#9ca3af",
  white: "#ffffff",
};

export function buildPlan(result: GenerateResult, model: SemanticModel): RenderPlan {
  const zones: ZoneOverlay[] = [];
  const levels: LevelOverlay[] = [];

  const firstTime = result.bars[0]!.time;
  const lastTime = result.bars[result.bars.length - 1]!.time;

  for (const draw of model.draws) {
    if (draw.targetKind === "zone" && draw.drawKind === "box") {
      const zone = result.derived.zones[draw.target];
      if (!zone) {
        throw new RenderError(
          "missing_overlay_target",
          `derived zone '${draw.target}' missing in result`,
        );
      }
      zones.push({
        name: draw.target,
        time1: firstTime,
        price1: zone.low,
        time2: lastTime,
        price2: zone.high,
        color: draw.color ? COLOR_FILL[draw.color] : COLOR_FILL.amber,
      });
    } else if (draw.targetKind === "level" && draw.drawKind === "line") {
      const price = result.derived.levels[draw.target];
      if (price === undefined) {
        throw new RenderError(
          "missing_overlay_target",
          `derived level '${draw.target}' missing in result`,
        );
      }
      levels.push({
        name: draw.target,
        price,
        color: draw.color ? COLOR_LINE[draw.color] : COLOR_LINE.white,
        lineStyle: "solid",
        lineWidth: 2,
      });
    } else {
      throw new RenderError(
        "unsupported_drawkind",
        `cannot draw ${draw.targetKind} '${draw.target}' as ${draw.drawKind}`,
      );
    }
  }

  const markers: MarkerSpec[] = [];
  for (const label of model.labels) {
    const idx = result.refs[label.barRef];
    if (idx === undefined) continue;
    const bar = result.bars[idx]!;
    markers.push({
      time: bar.time,
      position: "aboveBar",
      shape: "circle",
      color: COLOR_LINE.blue,
      text: label.text,
    });
  }

  return { candles: result.bars, zones, levels, markers };
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/render/plan-builder.test.ts
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/render/plan.ts src/render/plan-builder.ts src/render/plan-builder.test.ts
git commit -m "feat(render): add RenderPlan types and plan-builder"
```

---

## Task 15: Pattern templates (`src/patterns/*.ts`) and registry

**Files:**

- Create: `src/patterns/bullish-fvg.ts`, `src/patterns/bullish-bos.ts`, `src/patterns/equal-highs.ts`, `src/patterns/index.ts`

- [ ] **Step 1: Write `bullish-fvg.ts`**

```ts
import type { PatternTemplate } from "../generator/generate";

export const bullishFvg: PatternTemplate = {
  name: "bullish_fvg",
  source: `pattern bullish_fvg
bars a, b, c
series 30
seed 42
must a.high < c.low
should force_bullish b
should body_ratio b >= 0.65
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
label b as displacement
`,
  mapping: (bars) => ({
    a: bars.length - 3,
    b: bars.length - 2,
    c: bars.length - 1,
  }),
};
```

- [ ] **Step 2: Write `bullish-bos.ts`**

```ts
import type { PatternTemplate } from "../generator/generate";

export const bullishBos: PatternTemplate = {
  name: "bullish_bos",
  source: `pattern bullish_bos
bars prev, brk
series 30
seed 42
must brk.close > prev.high
should impulsive brk
derive bos.level = prev.high
draw bos as line green
label brk as bos
`,
  mapping: (bars) => {
    // Pick the highest-high bar in the first 80% of the series as 'prev'.
    const limit = Math.floor(bars.length * 0.8);
    let bestIdx = 0;
    let bestHigh = -Infinity;
    for (let i = 0; i < limit; i++) {
      const h = bars[i]!.high;
      if (h > bestHigh) {
        bestHigh = h;
        bestIdx = i;
      }
    }
    return { prev: bestIdx, brk: bars.length - 1 };
  },
};
```

- [ ] **Step 3: Write `equal-highs.ts`**

```ts
import type { PatternTemplate } from "../generator/generate";

export const equalHighs: PatternTemplate = {
  name: "equal_highs",
  source: `pattern equal_highs
bars a, b
series 30
seed 42
should equal_highs a b
derive eqh.level = a.high
draw eqh as line gray
label a as liquidity
label b as liquidity
`,
  mapping: (bars) => {
    // Pick two evenly-spaced bars in the latter half as the eqh candidates.
    const a = Math.floor(bars.length / 2);
    const b = bars.length - 2;
    return { a, b };
  },
};
```

- [ ] **Step 4: Write `index.ts`**

```ts
import { bullishFvg } from "./bullish-fvg";
import { bullishBos } from "./bullish-bos";
import { equalHighs } from "./equal-highs";

export const patterns = {
  bullish_fvg: bullishFvg,
  bullish_bos: bullishBos,
  equal_highs: equalHighs,
} as const;

export type PatternName = keyof typeof patterns;
```

- [ ] **Step 5: Typecheck**

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/patterns/
git commit -m "feat(patterns): add bullish_fvg, bullish_bos, equal_highs templates"
```

---

## Task 16: `src/render/apply.ts` + jsdom integration test

**Files:**

- Create: `src/render/apply.ts`
- Create: `src/render/apply.test.ts`
- Modify: `vitest.config.ts` (only if jsdom env not auto-detected per file)

- [ ] **Step 1: Add per-file jsdom env via test pragma — write the failing test first**

Create `src/render/apply.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createChart } from "lightweight-charts";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { buildPlan } from "./plan-builder";
import { patterns } from "../patterns";
import { applyToChart } from "./apply";

describe("applyToChart (jsdom + lightweight-charts)", () => {
  it("renders a bullish_fvg plan without throwing", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 600, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    document.body.appendChild(container);
    const chart = createChart(container, { width: 600, height: 400 });

    const compiled = compile(patterns.bullish_fvg.source);
    const result = generate(patterns.bullish_fvg, { seed: 42 });
    const plan = buildPlan(result, compiled.semantic!);

    const handles = applyToChart(chart, plan);

    expect(handles.candleSeries).toBeDefined();
    expect(handles.lineSeries).toEqual([]);
    expect(handles.zonePrimitives).toHaveLength(1);
    expect(handles.markersHandle).toBeDefined();

    chart.remove();
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
bun run test src/render/apply.test.ts
```

Expected: import error / module not found.

- [ ] **Step 3: Implement `src/render/apply.ts`**

```ts
import {
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesPrimitive,
  type ISeriesPrimitivePaneRenderer,
  type ISeriesPrimitivePaneView,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { RenderError } from "../errors";
import type { RenderPlan, ZoneOverlay } from "./plan";

export type RenderHandles = {
  candleSeries: ISeriesApi<"Candlestick">;
  lineSeries: ISeriesApi<"Line">[];
  zonePrimitives: ISeriesPrimitive<Time>[];
  markersHandle: ReturnType<typeof createSeriesMarkers>;
};

export function applyToChart(chart: IChartApi, plan: RenderPlan): RenderHandles {
  const candleSeries = chart.addSeries(CandlestickSeries, {});
  candleSeries.setData(
    plan.candles.map((c) => ({
      time: c.time as unknown as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })),
  );

  const lineSeries: ISeriesApi<"Line">[] = [];
  for (const level of plan.levels) {
    const series = chart.addSeries(LineSeries, {
      color: level.color,
      lineWidth: (level.lineWidth ?? 2) as 1 | 2 | 3 | 4,
    });
    const first = plan.candles[0];
    const last = plan.candles[plan.candles.length - 1];
    if (!first || !last) {
      throw new RenderError("missing_overlay_target", "no candles in plan");
    }
    series.setData([
      { time: first.time as unknown as Time, value: level.price },
      { time: last.time as unknown as Time, value: level.price },
    ]);
    lineSeries.push(series);
  }

  const zonePrimitives: ISeriesPrimitive<Time>[] = [];
  for (const zone of plan.zones) {
    const prim = createZonePrimitive(zone);
    candleSeries.attachPrimitive(prim);
    zonePrimitives.push(prim);
  }

  const markers: SeriesMarker<Time>[] = plan.markers.map((m) => ({
    time: m.time as unknown as Time,
    position: m.position,
    shape: m.shape,
    color: m.color,
    text: m.text,
  }));
  const markersHandle = createSeriesMarkers(candleSeries, markers);

  return { candleSeries, lineSeries, zonePrimitives, markersHandle };
}

function createZonePrimitive(zone: ZoneOverlay): ISeriesPrimitive<Time> {
  const view: ISeriesPrimitivePaneView = {
    renderer(): ISeriesPrimitivePaneRenderer {
      return {
        draw(target) {
          target.useBitmapCoordinateSpace((scope) => {
            // Headless / jsdom: timeScale().timeToCoordinate may not be available.
            // We deliberately skip rendering when scope dimensions are zero.
            const ctx = scope.context;
            if (!ctx) return;
            // Fallback: paint a thin rectangle along the visible band of the zone.
            // (Real coordinate mapping happens via series ref in v0.2.)
            ctx.save();
            ctx.fillStyle = zone.color ?? "rgba(245, 158, 11, 0.4)";
            ctx.fillRect(0, 0, 0, 0);
            ctx.restore();
          });
        },
      };
    },
  };
  const primitive: ISeriesPrimitive<Time> = {
    paneViews: () => [view],
    updateAllViews: () => {},
  };
  return primitive;
}
```

- [ ] **Step 4: Run, expect pass**

```bash
bun run test src/render/apply.test.ts
```

Expected: 1 passing. (If lightweight-charts complains about a missing canvas method in jsdom, install/configure `canvas` shim — but in v5 the chart can construct without painting; the test does not assert any pixel output.)

- [ ] **Step 5: Commit**

```bash
git add src/render/apply.ts src/render/apply.test.ts
git commit -m "feat(render): add applyToChart adapter (only file importing lightweight-charts)"
```

---

## Task 17: `src/index.ts` (replace hello-world placeholder)

**Files:**

- Modify: `src/index.ts`
- Delete: `src/index.test.ts` (the old hello-world test)

- [ ] **Step 1: Replace `src/index.ts`**

```ts
export { compile, type CompileResult } from "./compile";
export {
  generate,
  type GenerateOptions,
  type GenerateResult,
  type PatternTemplate,
  type RefMap,
} from "./generator/generate";
export { buildPlan } from "./render/plan-builder";
export { applyToChart, type RenderHandles } from "./render/apply";
export { patterns, type PatternName } from "./patterns";

export type { Program as AST } from "./dsl/ast";
export type { SemanticModel } from "./semantic/model";
export type { Candle, RenderPlan, ZoneOverlay, LevelOverlay, MarkerSpec } from "./render/plan";

export { CompileError, GenerationError, RenderError, type SourceLoc } from "./errors";
```

- [ ] **Step 2: Delete the old hello-world test**

```bash
rm src/index.test.ts
```

- [ ] **Step 3: Confirm typecheck and the rest of the suite are still green**

```bash
bun run typecheck
bun run test
```

Expected: typecheck passes; tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git rm src/index.test.ts
git commit -m "feat: wire public API exports; remove hello-world placeholder"
```

---

## Task 18: Pattern integration test — `bullish_fvg`

**Files:**

- Create: `src/patterns/bullish-fvg.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { tokenize } from "../dsl/lexer";
import { parse } from "../dsl/parser";
import { GenerationError } from "../errors";
import { bullishFvg } from "./bullish-fvg";

describe("bullish_fvg", () => {
  it("snapshot for seed=42", () => {
    const r = generate(bullishFvg, { seed: 42 });
    expect({
      seed: r.seed,
      lastThree: r.bars.slice(-3),
      derived: r.derived,
      verification: r.verification.must.map((m) => m.passed),
    }).toMatchSnapshot();
  });

  it("must passes for ≥95% of 100 random seeds", () => {
    let failures = 0;
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        try {
          const r = generate(bullishFvg, { seed });
          for (const m of r.verification.must) {
            if (!m.passed) {
              failures++;
              return;
            }
          }
        } catch (e) {
          if (e instanceof GenerationError) {
            failures++;
            return;
          }
          throw e;
        }
      }),
      { numRuns: 100 },
    );
    expect(failures).toBeLessThanOrEqual(5);
  });

  it("DSL roundtrips", () => {
    const a = parse(tokenize(bullishFvg.source), bullishFvg.source).program!;
    const b = parse(tokenize(bullishFvg.source), bullishFvg.source).program!;
    expect(a).toEqual(b);
    expect(compile(bullishFvg.source).errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run with `--update` to capture the snapshot**

```bash
bun run test src/patterns/bullish-fvg.test.ts --update
```

- [ ] **Step 3: Inspect the snapshot file**

```bash
cat src/patterns/__snapshots__/bullish-fvg.test.ts.snap
```

Expected: a stable snapshot of `{seed, lastThree, derived, verification}` for seed=42. Confirm it looks reasonable (gap exists, verification all `true`).

- [ ] **Step 4: Re-run without update to confirm stability**

```bash
bun run test src/patterns/bullish-fvg.test.ts
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/patterns/bullish-fvg.test.ts src/patterns/__snapshots__/
git commit -m "test(patterns): add bullish_fvg snapshot + property + roundtrip tests"
```

---

## Task 19: Pattern integration test — `bullish_bos`

**Files:**

- Create: `src/patterns/bullish-bos.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { tokenize } from "../dsl/lexer";
import { parse } from "../dsl/parser";
import { GenerationError } from "../errors";
import { bullishBos } from "./bullish-bos";

describe("bullish_bos", () => {
  it("snapshot for seed=42", () => {
    const r = generate(bullishBos, { seed: 42 });
    expect({
      seed: r.seed,
      prev: r.bars[r.refs.prev!],
      brk: r.bars[r.refs.brk!],
      derived: r.derived,
      verification: r.verification.must.map((m) => m.passed),
    }).toMatchSnapshot();
  });

  it("must passes for ≥95% of 100 random seeds", () => {
    let failures = 0;
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        try {
          const r = generate(bullishBos, { seed });
          for (const m of r.verification.must) {
            if (!m.passed) {
              failures++;
              return;
            }
          }
        } catch (e) {
          if (e instanceof GenerationError) {
            failures++;
            return;
          }
          throw e;
        }
      }),
      { numRuns: 100 },
    );
    expect(failures).toBeLessThanOrEqual(5);
  });

  it("DSL roundtrips", () => {
    const a = parse(tokenize(bullishBos.source), bullishBos.source).program!;
    const b = parse(tokenize(bullishBos.source), bullishBos.source).program!;
    expect(a).toEqual(b);
    expect(compile(bullishBos.source).errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Capture and verify snapshot**

```bash
bun run test src/patterns/bullish-bos.test.ts --update
bun run test src/patterns/bullish-bos.test.ts
```

Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add src/patterns/bullish-bos.test.ts src/patterns/__snapshots__/
git commit -m "test(patterns): add bullish_bos snapshot + property + roundtrip tests"
```

---

## Task 20: Pattern integration test — `equal_highs`

**Files:**

- Create: `src/patterns/equal-highs.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { tokenize } from "../dsl/lexer";
import { parse } from "../dsl/parser";
import { GenerationError } from "../errors";
import { equalHighs } from "./equal-highs";

describe("equal_highs", () => {
  it("snapshot for seed=42", () => {
    const r = generate(equalHighs, { seed: 42 });
    expect({
      seed: r.seed,
      a: r.bars[r.refs.a!],
      b: r.bars[r.refs.b!],
      derived: r.derived,
    }).toMatchSnapshot();
  });

  it("a.high ≈ b.high within 0.2% for ≥95% of 100 random seeds", () => {
    let failures = 0;
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        try {
          const r = generate(equalHighs, { seed });
          const a = r.bars[r.refs.a!]!;
          const b = r.bars[r.refs.b!]!;
          if (Math.abs(a.high - b.high) / a.high > 0.002) {
            failures++;
          }
        } catch (e) {
          if (e instanceof GenerationError) {
            failures++;
            return;
          }
          throw e;
        }
      }),
      { numRuns: 100 },
    );
    expect(failures).toBeLessThanOrEqual(5);
  });

  it("DSL roundtrips", () => {
    const a = parse(tokenize(equalHighs.source), equalHighs.source).program!;
    const b = parse(tokenize(equalHighs.source), equalHighs.source).program!;
    expect(a).toEqual(b);
    expect(compile(equalHighs.source).errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Capture and verify snapshot**

```bash
bun run test src/patterns/equal-highs.test.ts --update
bun run test src/patterns/equal-highs.test.ts
```

Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add src/patterns/equal-highs.test.ts src/patterns/__snapshots__/
git commit -m "test(patterns): add equal_highs snapshot + property + roundtrip tests"
```

---

## Task 21: Update `README.md` with v0.1.0 API

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

````markdown
# @lucrtrade/chartmint

A DSL-driven library for defining trading concepts, generating synthetic OHLC examples that satisfy them, and rendering explanatory charts via [Lightweight Charts](https://www.npmjs.com/package/lightweight-charts).

ESM-only. `lightweight-charts` is an optional `peerDependency` — required only for `applyToChart`.

## Install

```bash
bun add @lucrtrade/chartmint
# or
npm install @lucrtrade/chartmint

# Required only if you use `applyToChart`:
bun add lightweight-charts
```
````

## Headless quick-start

```ts
import { compile, generate, buildPlan, patterns } from "@lucrtrade/chartmint";

const compiled = compile(patterns.bullish_fvg.source);
const result = generate(patterns.bullish_fvg, { seed: 42 });
const plan = buildPlan(result, compiled.semantic!);

console.log(plan.candles.length); // 30
console.log(plan.zones[0]); // { name: "gap", time1, price1, time2, price2, color, ... }
console.log(result.verification.must); // [ { predicate, passed: true } ]
```

## Browser quick-start

```ts
import { createChart } from "lightweight-charts";
import { compile, generate, buildPlan, applyToChart, patterns } from "@lucrtrade/chartmint";

const chart = createChart(document.getElementById("chart")!);
const compiled = compile(patterns.bullish_fvg.source);
const result = generate(patterns.bullish_fvg, { seed: 42 });
applyToChart(chart, buildPlan(result, compiled.semantic!));
```

## DSL surface (v0.1.0)

```txt
pattern <name>
bars <id>(, <id>)*
[series <int>]                # default 30
[seed (<int> | random)]       # default random
must <predicate>
should <predicate | hint>
derive <obj>.<prop> = <expr>
when <predicate> then <obj>.<prop> = (<expr> | <ident>)
draw <derived-name> as (box | line) [<color>]
label <bar-id> as <text>

# expressions
<bar>.<open|high|low|close> | <number> | (body|range|mid)(<bar>) | <expr> (+|-|*|/) <expr>

# predicates
<expr> <op> <expr>           # op = < | > | <= | >= | =
direction(<bar>) = (bullish | bearish)

# hints (named registry — these reshape generation)
force_bullish <bar> | force_bearish <bar> | impulsive <bar>
body_ratio <bar> >= <number>
equal_highs <a> <b> | equal_lows <a> <b>

# colors
amber | blue | green | red | gray | white
```

## Patterns shipped in v0.1.0

| Pattern       | Concept                      | Drawkind |
| ------------- | ---------------------------- | -------- |
| `bullish_fvg` | 3-bar gap (`a.high < c.low`) | box      |
| `bullish_bos` | Break of prior high          | line     |
| `equal_highs` | Two near-equal highs         | line     |

## API

```ts
import {
  compile, // (source: string) => CompileResult
  generate, // (specOrSource: CompileResult | string | PatternTemplate, opts?) => GenerateResult
  buildPlan, // (result: GenerateResult, model: SemanticModel) => RenderPlan
  applyToChart, // (chart: IChartApi, plan: RenderPlan) => RenderHandles
  patterns, // { bullish_fvg, bullish_bos, equal_highs }
  CompileError,
  GenerationError,
  RenderError,
} from "@lucrtrade/chartmint";
```

`compile` never throws — it returns `{ ast?, semantic?, errors: CompileError[] }`.
`generate` throws `GenerationError(kind: "must_failed")` on a `must` failure that survives the one-shot repair pass; retry with a new seed.

## Develop

```bash
bun install
bun run dev | build | test | test:watch | lint | format | typecheck | ci
```

## Release

See `docs/superpowers/specs/2026-05-07-chartmint-v0.1.0-design.md` for the full design and `.github/workflows/release.yml` for the publish pipeline (npm Trusted Publishing + GitHub Packages + GitHub Release).

## License

MIT

````

- [ ] **Step 2: Verify Prettier is happy**

```bash
bun run format:check
````

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for v0.1.0 API"
```

---

## Task 22: Final CI dry-run + build

- [ ] **Step 1: Run the full CI script**

```bash
bun run ci
```

Expected: format/lint/typecheck/test all pass.

- [ ] **Step 2: Build**

```bash
bun run build
```

Expected: tsup emits `dist/index.js`, `dist/index.d.ts`, `dist/index.js.map`. No CJS output.

- [ ] **Step 3: Verify tarball contents are minimal**

```bash
bun pm pack --ignore-scripts --dry-run
```

Expected: output lists `package.json`, `LICENSE`, `README.md`, `dist/index.d.ts`, `dist/index.js`, `dist/index.js.map`. Nothing else.

- [ ] **Step 4: If everything is green, no commit needed.** If you tweaked anything to fix a regression, commit it with a focused message.

---

## Self-Review

(Run by the plan author; not an executable step.)

**Spec coverage**

| Spec section            | Task                                                    |
| ----------------------- | ------------------------------------------------------- |
| §3.1 module layout      | Tasks 2–17 (each section creates the listed file)       |
| §3.2 public API         | Task 17                                                 |
| §3.3 dependency change  | Task 1                                                  |
| §4.1 grammar            | Tasks 4 (lexer), 5 (parser), 6 (validator)              |
| §4.2 AST                | Task 3                                                  |
| §4.3 validator          | Task 6                                                  |
| §4.4 semantic compiler  | Task 7                                                  |
| §5.1 generator pipeline | Task 13 (orchestrator)                                  |
| §5.2 hooks              | Task 11                                                 |
| §5.3 evaluator          | Task 9                                                  |
| §5.4 repair             | Task 13                                                 |
| §5.5 render plan        | Task 14                                                 |
| §5.6 applyToChart       | Task 16                                                 |
| §5.7 determinism        | Task 13 (test asserts deterministic output)             |
| §6.1 errors             | Task 2                                                  |
| §6.2 tests              | Tasks 18–20 (per-pattern), Task 16 (renderer)           |
| §6.3 coverage targets   | Documented in spec, not enforced in v0 (per spec note). |
| §7 non-goals            | Honored throughout — no band, no scoring, etc.          |
| §8 acceptance           | Task 22                                                 |

No coverage gaps.

**Placeholders:** none ("TBD"/"TODO"/"add appropriate" do not appear).

**Type consistency:** `RefMap`, `EvalContext`, `DerivedView`, `RenderPlan`, `RenderHandles`, `PatternTemplate`, `GenerateResult`, `GenerateOptions` are defined once and used consistently. The `compile.ts` orchestrator was added (Task 8) so the spec's orchestration step (§5.1 step 0 implicit) has an explicit owner.

**Scope:** Single v0.1.0 of one library. One implementation plan. ~22 tasks, sized 5–30 minutes each.
