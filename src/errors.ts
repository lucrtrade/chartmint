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
