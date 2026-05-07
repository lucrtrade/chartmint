import type { ShapeHint } from "../dsl/ast";
import type { Candle } from "../render/plan";

export type HookContext = {
  bars: Candle[];
  refs: Record<string, number>;
  tolerance: number;
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
      impulsive(b, ctx);
      return;
    }
    case "equal_highs": {
      const a = getBar(hint.left, ctx);
      const b = getBar(hint.right, ctx);
      const eps = mid(a) * ctx.tolerance;
      const targetHigh = a.high - eps;
      shiftBarTo(b, "high", targetHigh);
      return;
    }
    case "equal_lows": {
      const a = getBar(hint.left, ctx);
      const b = getBar(hint.right, ctx);
      const eps = mid(a) * ctx.tolerance;
      const targetLow = a.low + eps;
      shiftBarTo(b, "low", targetLow);
      return;
    }
  }
}

function forceDirection(b: Candle, dir: "bullish" | "bearish"): void {
  if (b.close === b.open) {
    const eps = Math.max(0.01, (b.high - b.low) * 0.1);
    b.close = dir === "bullish" ? b.open + eps : b.open - eps;
  } else {
    const bullish = b.close > b.open;
    const want = dir === "bullish";
    if (bullish !== want) {
      const tmp = b.open;
      b.open = b.close;
      b.close = tmp;
    }
  }
  reorderHighLow(b);
}

function ensureBodyRatio(b: Candle, ratio: number): void {
  let body = Math.abs(b.close - b.open);
  if (body === 0) {
    const eps = Math.max(0.01, (b.high - b.low) * 0.1);
    b.close = b.open + eps;
    body = eps;
  }
  const targetRange = body / ratio;
  const top = Math.max(b.open, b.close);
  const bot = Math.min(b.open, b.close);
  const wick = Math.max(0, (targetRange - body) / 2);
  b.high = top + wick;
  b.low = bot - wick;
}

function impulsive(b: Candle, ctx: HookContext): void {
  const idx = ctx.bars.indexOf(b);
  const window = ctx.bars.slice(Math.max(0, idx - 5), idx);
  const avgRange =
    window.length > 0 ? window.reduce((acc, x) => acc + (x.high - x.low), 0) / window.length : 1;
  const targetRange = Math.max(0.01, avgRange * 1.5);
  const targetBody = targetRange * 0.7;
  const wick = (targetRange - targetBody) / 2;
  const center = (b.high + b.low) / 2 || b.open || 100;
  b.open = center - targetBody / 2;
  b.close = center + targetBody / 2;
  b.high = b.close + wick;
  b.low = b.open - wick;
}

function shiftBarTo(b: Candle, field: "high" | "low", target: number): void {
  const shift = target - b[field];
  b.open += shift;
  b.high += shift;
  b.low += shift;
  b.close += shift;
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
