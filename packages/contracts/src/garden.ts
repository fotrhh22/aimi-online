import { z } from "zod";
import { EXPANSION_GEOMETRY } from "./content/asset-expansion.js";
export const MAX_GARDEN_ITEMS = 12;
export const GardenPlacement = z
  .object({
    instanceId: z.string().min(1).max(100).optional(),
    itemId: z.string().min(1).max(40),
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  })
  .strict();
export type GardenPlacement = z.infer<typeof GardenPlacement>;
/** Artwork bounds, not the padded source canvas, define selection and placement limits. */
export const GARDEN_ASPECT = 327 / 300;
export const GARDEN_ITEM_GEOMETRY = {
  ...EXPANSION_GEOMETRY,
  fence: { width: 0.34, viewBox: [6, 18, 114, 58] },
  bench: { width: 0.26, viewBox: [8, 36, 104, 51] },
  plant: { width: 0.13, viewBox: [29, 10, 63, 84] },
  flower: { width: 0.085, viewBox: [41, 16, 38, 74] },
} as const;
export function gardenItemSize(itemId: string) {
  const spec =
    GARDEN_ITEM_GEOMETRY[itemId as keyof typeof GARDEN_ITEM_GEOMETRY];
  if (!spec) return { width: 0.16, height: 0.16 * GARDEN_ASPECT };
  return {
    width: spec.width,
    height: ((spec.width * spec.viewBox[3]) / spec.viewBox[2]) * GARDEN_ASPECT,
  };
}
export function gardenAssetId(assetId: string) {
  return assetId in GARDEN_ITEM_GEOMETRY ? `garden/${assetId}` : assetId;
}
export function clampGardenPlacement(p: GardenPlacement): GardenPlacement {
  const { width, height } = gardenItemSize(p.itemId);
  return {
    ...p,
    x: Math.max(
      Math.ceil((width / 2) * 10000) / 10000,
      Math.min(
        Math.floor((1 - width / 2) * 10000) / 10000,
        Math.round(p.x * 10000) / 10000,
      ),
    ),
    y: Math.max(
      Math.ceil(height * 10000) / 10000,
      Math.min(1, Math.round(p.y * 10000) / 10000),
    ),
  };
}
export function gardenPlacementInBounds(p: GardenPlacement) {
  const { width, height } = gardenItemSize(p.itemId);
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= width / 2 - 1e-8 &&
    p.x <= 1 - width / 2 + 1e-8 &&
    p.y >= height - 1e-8 &&
    p.y <= 1 + 1e-8
  );
}
/** Legacy slots are read once as initial positions, never used to restrict placement. */
export function gardenPlacements(garden: {
  placements?: GardenPlacement[];
  slots?: Record<string, string | null>;
}): GardenPlacement[] {
  if (Array.isArray(garden.placements))
    return garden.placements.map((p, index) =>
      clampGardenPlacement({
        ...p,
        instanceId: p.instanceId ?? `legacy-${p.itemId}-${index}`,
      }),
    );
  const positions: Record<string, { x: number; y: number }> = {
    back: { x: 0.5, y: 0.52 },
    "front-left": { x: 0.185, y: 0.92 },
    "front-right": { x: 0.825, y: 0.91 },
    "back-right": { x: 0.81, y: 0.72 },
  };
  const seen = new Set<string>();
  return Object.entries(garden.slots ?? {})
    .flatMap(([slot, itemId]) => {
      if (!itemId || seen.has(itemId)) return [];
      seen.add(itemId);
      return [
        clampGardenPlacement({
          itemId,
          ...(positions[slot] ?? { x: 0.5, y: 0.72 }),
        }),
      ];
    })
    .slice(0, MAX_GARDEN_ITEMS);
}
export function newGardenPlacement(
  itemId: string,
  index: number,
): GardenPlacement {
  return clampGardenPlacement({
    itemId,
    x: 0.25 + (index % 3) * 0.25,
    y: 0.45 + Math.floor(index / 3) * 0.17,
  });
}

/** Inventory keeps one entry per purchased copy; legacy unique entries count as one. */
export function ownedItemCount(inventory: string[], itemId: string) {
  return inventory.filter((id) => id === itemId).length;
}
export function remainingItemCount(
  inventory: string[],
  placements: GardenPlacement[],
  itemId: string,
) {
  return Math.max(
    0,
    ownedItemCount(inventory, itemId) -
      placements.filter((p) => p.itemId === itemId).length,
  );
}
export function gardenPlacementId(p: GardenPlacement) {
  return p.instanceId ?? `legacy-${p.itemId}`;
}
