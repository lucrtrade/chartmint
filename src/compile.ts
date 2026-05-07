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
