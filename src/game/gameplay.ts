import type { Rect } from "./types";

/** Zona alta de la meta: se puede tocar el banderín mientras Noa salta. */
export const goalFlagHitbox = (goalX: number, surfaceY: number): Rect => ({
  x: goalX,
  y: surfaceY - 232,
  width: 172,
  height: 232,
});

export const rectanglesOverlap = (first: Rect, second: Rect) =>
  first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;

export const hasReachedGoalFlag = (player: Rect, goalX: number, surfaceY: number) =>
  rectanglesOverlap(player, goalFlagHitbox(goalX, surfaceY));

export const keepInsidePatrol = (x: number, velocity: number, minX: number, maxX: number) => {
  if (x <= minX) return { x: minX, velocity: Math.abs(velocity) };
  if (x >= maxX) return { x: maxX, velocity: -Math.abs(velocity) };
  return { x, velocity };
};

/** Nunca ordena al jabalí cargar contra el borde que acaba de tocar. */
export const boarChargeVelocity = (boarX: number, playerX: number, minX: number, maxX: number, currentVelocity: number) => {
  const speed = Math.max(82, Math.abs(currentVelocity));
  if (boarX <= minX && playerX <= boarX) return speed;
  if (boarX >= maxX && playerX >= boarX) return -speed;
  return playerX < boarX ? -speed : speed;
};
