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

export function generateBaseSeries(
  seed: number,
  count: number,
  basePrice = 100,
  timeframe?: number,
  endTime?: number,
): Candle[] {
  const rnd = mulberry32(seed);
  const bars: Candle[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const drift = (rnd() - 0.5) * 2;
    const open = price;
    const close = open + drift;
    const wick = Math.max(0.1, rnd() * 1.5);
    const high = Math.max(open, close) + wick * rnd();
    const low = Math.min(open, close) - wick * rnd();
    const time =
      timeframe !== undefined && endTime !== undefined
        ? endTime - (count - 1 - i) * timeframe
        : i + 1;
    bars.push({
      time,
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
