import { bullishFvg } from "./bullish-fvg";
import { bullishBos } from "./bullish-bos";
import { equalHighs } from "./equal-highs";

export const patterns = {
  bullish_fvg: bullishFvg,
  bullish_bos: bullishBos,
  equal_highs: equalHighs,
} as const;

export type PatternName = keyof typeof patterns;
