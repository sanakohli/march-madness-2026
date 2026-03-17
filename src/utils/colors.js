// Shared 4-color palette — matches the #1 seeds radar chart
// Region index 0 = orange, 1 = blue, 2 = green, 3 = purple
export const PALETTE = ['#f97316', '#3b82f6', '#22c55e', '#a855f7'];

export function paletteColor(index) {
  return PALETTE[index % PALETTE.length];
}

export function regionColor(regions, regionName) {
  const idx = regions.indexOf(regionName);
  return PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
}
