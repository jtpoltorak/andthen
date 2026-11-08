import type { GardenStage } from '@andthen/core';

// The routine garden's plant drawings, shared by the <app-plant> component and the
// share card's canvas. No Angular here, so the canvas code can use it too.

/** One shape of the plant, drawn in a 120×120 box with the pot at the bottom. */
export interface PlantPart {
  d: string;
  kind: 'stem' | 'leaf' | 'sepal' | 'bud' | 'petal' | 'heart' | 'seed';
}

const LEAF = 'leaf' as const;
const STEM = 'stem' as const;

// Leaves shared by the bigger stages.
const LOW_LEAVES: PlantPart[] = [
  { kind: LEAF, d: 'M60 72C46 72 40 62 42 56C52 56 59 64 60 72Z' },
  { kind: LEAF, d: 'M60 72C74 72 80 62 78 56C68 56 61 64 60 72Z' },
];
const HIGH_LEAVES: PlantPart[] = [
  { kind: LEAF, d: 'M60 52C51 51 47 44 49 40C55 40 59 46 60 52Z' },
  { kind: LEAF, d: 'M60 52C69 51 73 44 71 40C65 40 61 46 60 52Z' },
];
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** The plant at each stage of the routine garden: drawn for AndThen, in one style. */
export const PLANTS: Record<GardenStage, readonly PlantPart[]> = {
  seed: [{ kind: 'seed', d: 'M55 79.5a5 3.5 0 1 0 10 0a5 3.5 0 1 0 -10 0Z' }],
  sprout: [
    { kind: STEM, d: 'M60 82V70' },
    { kind: LEAF, d: 'M60 72C52 71 49 65 51 62C57 62 60 67 60 72Z' },
    { kind: LEAF, d: 'M60 72C68 71 71 65 69 62C63 62 60 67 60 72Z' },
  ],
  seedling: [
    { kind: STEM, d: 'M60 82V50' },
    { kind: LEAF, d: 'M60 64C48 63 44 53 47 48C56 48 60 56 60 64Z' },
    { kind: LEAF, d: 'M60 64C72 63 76 53 73 48C64 48 60 56 60 64Z' },
    { kind: LEAF, d: 'M60 52C57 48 58 44 60 42C62 44 63 48 60 52Z' },
  ],
  young: [
    { kind: STEM, d: 'M60 82C60 70 61 56 60 40' },
    ...LOW_LEAVES,
    ...HIGH_LEAVES,
    { kind: LEAF, d: 'M60 42C57 38 58 34 60 32C62 34 63 38 60 42Z' },
  ],
  budding: [
    { kind: STEM, d: 'M60 82C60 70 61 56 60 36' },
    ...LOW_LEAVES,
    ...HIGH_LEAVES,
    { kind: 'bud', d: 'M54.5 28a5.5 8 0 1 0 11 0a5.5 8 0 1 0 -11 0Z' },
    { kind: 'sepal', d: 'M60 38C55 36 54 32 55 30C58 31 60 34 60 38Z' },
    { kind: 'sepal', d: 'M60 38C65 36 66 32 65 30C62 31 60 34 60 38Z' },
  ],
  bloom: [
    { kind: STEM, d: 'M60 82C60 70 61 56 60 36' },
    ...LOW_LEAVES,
    ...HIGH_LEAVES,
    { kind: 'petal', d: circle(60, 19, 7.5) },
    { kind: 'petal', d: circle(68.6, 25.2, 7.5) },
    { kind: 'petal', d: circle(65.3, 35.3, 7.5) },
    { kind: 'petal', d: circle(54.7, 35.3, 7.5) },
    { kind: 'petal', d: circle(51.4, 25.2, 7.5) },
    { kind: 'heart', d: circle(60, 28, 6) },
  ],
};

/** The pot, drawn over the bottom of the stem. */
export const POT = {
  rim: 'M37 82h46a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H37a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3Z',
  pot: 'M38 92L82 92L77 112L43 112Z',
  soil: 'M37 82.5a23 2.5 0 1 0 46 0a23 2.5 0 1 0 -46 0Z',
};
export const MOON = 'M92 18A11 11 0 1 0 104 34A9 9 0 1 1 92 18Z';

/** The plant's own colors. They read well on light and dark backgrounds alike. */
export const PLANT_COLORS = {
  stem: '#2f7a64',
  leaf: '#4c9f84',
  sepal: '#2f7a64',
  bud: '#f2b544',
  petal: '#f2b544',
  heart: '#c98a1f',
  seed: '#8a6a45',
  rim: '#cbb999',
  pot: '#d9cbb4',
  soil: '#6b5a45',
  moon: '#9aa197',
} as const;

/** Draws a plant on a canvas, `size` pixels square, with its top-left corner at x, y. */
export function drawPlant(
  ctx: CanvasRenderingContext2D,
  stage: GardenStage,
  x: number,
  y: number,
  size: number,
  resting = false,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 120, size / 120);
  ctx.globalAlpha = resting ? 0.5 : 1;
  for (const part of PLANTS[stage]) {
    const path = new Path2D(part.d);
    if (part.kind === 'stem') {
      ctx.strokeStyle = PLANT_COLORS.stem;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke(path);
    } else {
      ctx.fillStyle = PLANT_COLORS[part.kind];
      ctx.fill(path);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = PLANT_COLORS.rim;
  ctx.fill(new Path2D(POT.rim));
  ctx.fillStyle = PLANT_COLORS.pot;
  ctx.fill(new Path2D(POT.pot));
  ctx.fillStyle = PLANT_COLORS.soil;
  ctx.fill(new Path2D(POT.soil));
  if (resting) {
    ctx.fillStyle = PLANT_COLORS.moon;
    ctx.fill(new Path2D(MOON));
  }
  ctx.restore();
}
