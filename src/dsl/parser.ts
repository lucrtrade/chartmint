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
  LocateAnchor,
  LocateSearch,
  Predicate,
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
      case "locate":
        return this.parseLocate();
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
    let color: Color | undefined;
    if (this.peek().kind === "ident" && this.peek().kind !== "newline") {
      const colorTok = this.peek();
      if (COLORS.has(colorTok.value)) {
        this.advance();
        color = colorTok.value as Color;
      }
    }
    return { kind: "label", ref: ref.value, text: text.value, color, loc: start.loc };
  }

  private parseLocate(): Statement {
    const start = this.advance();
    const barRef = this.expect("ident", "expected bar identifier after 'locate'");
    const kw = this.peek();
    if (kw.kind !== "ident" || (kw.value !== "at" && kw.value !== "as")) {
      throw new CompileError("parse", "expected 'at' or 'as' in locate statement", kw.loc);
    }
    this.advance();
    if (kw.value === "at") {
      const anchor = this.parseLocateAnchor();
      return {
        kind: "locate",
        barRef: barRef.value,
        position: { kind: "at", anchor },
        loc: start.loc,
      };
    }
    const search = this.parseLocateSearch();
    return {
      kind: "locate",
      barRef: barRef.value,
      position: { kind: "as", search },
      loc: start.loc,
    };
  }

  private parseLocateAnchor(): LocateAnchor {
    const t = this.peek();
    if (t.kind !== "ident") {
      throw new CompileError("parse", "expected 'end', 'mid', or 'start' in locate", t.loc);
    }
    if (t.value === "mid") {
      this.advance();
      return { kind: "mid" };
    }
    if (t.value === "start") {
      this.advance();
      return { kind: "start" };
    }
    if (t.value === "end") {
      this.advance();
      if (this.peek().kind === "minus") {
        this.advance();
        const num = this.expect("number", "expected integer offset after '-'");
        return { kind: "end", offset: Number(num.value) };
      }
      return { kind: "end", offset: 0 };
    }
    throw new CompileError("parse", `expected 'end', 'mid', or 'start', got '${t.value}'`, t.loc);
  }

  private parseLocateSearch(): LocateSearch {
    const agg = this.peek();
    if (agg.kind !== "ident" || (agg.value !== "highest" && agg.value !== "lowest")) {
      throw new CompileError("parse", "expected 'highest' or 'lowest' in locate search", agg.loc);
    }
    this.advance();
    const field = this.peek();
    if (field.kind !== "ident" || !FIELDS.has(field.value)) {
      throw new CompileError(
        "parse",
        "expected field name (open|high|low|close) in locate search",
        field.loc,
      );
    }
    this.advance();
    let within: LocateSearch["within"];
    if (this.peek().kind === "ident" && this.peek().value === "within") {
      this.advance();
      const s = this.expect("number", "expected start value after 'within'");
      const e = this.expect("number", "expected end value after start");
      within = { start: Number(s.value), end: Number(e.value) };
    }
    return { agg: agg.value as "highest" | "lowest", field: field.value as Field, within };
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
