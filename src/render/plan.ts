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
