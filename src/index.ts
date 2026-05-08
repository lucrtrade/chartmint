export { version } from "../package.json";
export { compile, type CompileResult } from "./compile";
export {
  generate,
  type GenerateOptions,
  type GenerateResult,
  type PatternTemplate,
  type RefMap,
} from "./generator/generate";
export {
  buildPlan,
  DEFAULT_RENDER_PALETTE,
  type BuildPlanOptions,
  type BuildPlanPalette,
} from "./render/plan-builder";
export { applyToChart, type RenderHandles } from "./render/apply";
export { patterns, type PatternName } from "./patterns";

export type { Program as AST } from "./dsl/ast";
export type { SemanticModel } from "./semantic/model";
export type { Candle, RenderPlan, ZoneOverlay, LevelOverlay, MarkerSpec } from "./render/plan";

export { CompileError, GenerationError, RenderError, type SourceLoc } from "./errors";
