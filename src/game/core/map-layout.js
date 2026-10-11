import islandPlacement from '@/game/config/json/islandPlacement.json';

export const WIDE_MAP_QUERY = '(min-aspect-ratio: 1/1)';
export const TABLET_MAP_QUERY = '(min-width: 600px)';

export function getMapProfile(layout = 'mobile') {
  const profileName = layout === 'wide' ? 'tv' : layout;
  return islandPlacement.profiles[profileName] ?? islandPlacement.profiles.mobile;
}

// As medidas são compartilhadas pelo gerador e pelas rotas desenhadas no SVG.
export function getNodeRadii(node, isDense, layout = 'mobile', clearance = false) {
  let radii;
  if (clearance) {
    radii = node.type === 'finish' ? { x: 180, y: 82 }
      : node.type === 'start' ? { x: 120, y: 52 }
        : isDense ? { x: 85, y: 30 } : { x: 112, y: 42 };
  } else {
    radii = node.type === 'finish' ? { x: 55, y: 12 }
      : node.type === 'start' ? { x: 105, y: 46 }
        : isDense ? { x: 78, y: 25 } : { x: 88, y: 28 };
  }

  if (layout === 'wide') return { x: radii.x * 0.45, y: radii.y * 1.3 };
  if (layout === 'tablet') return { x: radii.x * 0.7, y: radii.y };
  return radii;
}

export function getRouteBoundary(node, otherNode, isDense, layout = 'mobile') {
  const deltaX = otherNode.x - node.x;
  const deltaY = otherNode.y - node.y;
  const radii = getNodeRadii(node, isDense, layout);
  const boundaryShrink = node.type === 'start' ? 0.92 : node.type === 'finish' ? 0.9 : 0.88;
  const safeRadii = {
    x: radii.x * boundaryShrink,
    y: radii.y * boundaryShrink
  };
  const scale = 1 / Math.sqrt((deltaX / safeRadii.x) ** 2 + (deltaY / safeRadii.y) ** 2);
  return { x: node.x + deltaX * scale, y: node.y + deltaY * scale };
}

export function getWaterBounds(profile, y) {
  const rows = profile.waterBounds;
  const nextIndex = rows.findIndex((row) => row.y >= y);
  if (nextIndex === 0) return rows[0];
  if (nextIndex === -1) return rows.at(-1);
  const before = rows[nextIndex - 1];
  const after = rows[nextIndex];
  const progress = (y - before.y) / (after.y - before.y);
  return {
    left: before.left + (after.left - before.left) * progress,
    right: before.right + (after.right - before.right) * progress
  };
}
