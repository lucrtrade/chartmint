import type { GenerateResult } from "../generator/generate";
import type { SemanticModel } from "../semantic/model";
import type { Color } from "../dsl/ast";
import { RenderError } from "../errors";
import type { LevelOverlay, MarkerSpec, RenderPlan, ZoneOverlay } from "./plan";

type ColorMap = Record<Color, string>;

export type BuildPlanPalette = {
  fill?: Partial<ColorMap>;
  line?: Partial<ColorMap>;
  defaults?: {
    zoneFill?: string;
    levelLine?: string;
    marker?: string;
  };
};

export type BuildPlanOptions = {
  palette?: BuildPlanPalette;
};

const COLOR_FILL: ColorMap = {
  amber: "#f59e0b66",
  blue: "#3b82f666",
  green: "#22c55e66",
  red: "#ef444466",
  gray: "#9ca3af66",
  white: "#ffffff44",
};

const COLOR_LINE: ColorMap = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  gray: "#9ca3af",
  white: "#ffffff",
};

export const DEFAULT_RENDER_PALETTE: Readonly<{
  fill: ColorMap;
  line: ColorMap;
  defaults: {
    zoneFill: string;
    levelLine: string;
    marker: string;
  };
}> = {
  fill: COLOR_FILL,
  line: COLOR_LINE,
  defaults: {
    zoneFill: COLOR_FILL.amber,
    levelLine: COLOR_LINE.white,
    marker: COLOR_LINE.blue,
  },
};

function resolveColorMap(base: ColorMap, override?: Partial<ColorMap>): ColorMap {
  return { ...base, ...override };
}

function resolvePalette(palette?: BuildPlanPalette) {
  const fill = resolveColorMap(DEFAULT_RENDER_PALETTE.fill, palette?.fill);
  const line = resolveColorMap(DEFAULT_RENDER_PALETTE.line, palette?.line);
  return {
    fill,
    line,
    defaults: {
      zoneFill: palette?.defaults?.zoneFill ?? DEFAULT_RENDER_PALETTE.defaults.zoneFill,
      levelLine: palette?.defaults?.levelLine ?? DEFAULT_RENDER_PALETTE.defaults.levelLine,
      marker: palette?.defaults?.marker ?? DEFAULT_RENDER_PALETTE.defaults.marker,
    },
  };
}

export function buildPlan(
  result: GenerateResult,
  model: SemanticModel,
  options?: BuildPlanOptions,
): RenderPlan {
  const palette = resolvePalette(options?.palette);
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
        color: draw.color ? palette.fill[draw.color] : palette.defaults.zoneFill,
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
        color: draw.color ? palette.line[draw.color] : palette.defaults.levelLine,
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
      color: label.color ? palette.line[label.color] : palette.defaults.marker,
      text: label.text,
    });
  }

  return { candles: result.bars, zones, levels, markers };
}
