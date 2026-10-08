import assert from "node:assert/strict";
import test from "node:test";
import { boarChargeVelocity, goalFlagHitbox, hasReachedGoalFlag, keepInsidePatrol, landsOnSpring } from "./gameplay.ts";

test("el banderín tiene una zona elevada y alcanzable al saltar", () => {
  const flag = goalFlagHitbox(900, 456);
  assert.deepEqual(flag, { x: 900, y: 224, width: 172, height: 232 });
  assert.equal(hasReachedGoalFlag({ x: 944, y: 260, width: 42, height: 58 }, 900, 456), true);
});

test("Noa no termina la pantalla antes de llegar al banderín", () => {
  assert.equal(hasReachedGoalFlag({ x: 820, y: 398, width: 42, height: 58 }, 900, 456), false);
});

test("el jabalí rebota y no carga contra el mismo borde en un bucle", () => {
  const atLeftEdge = keepInsidePatrol(90, -120, 90, 310);
  assert.deepEqual(atLeftEdge, { x: 90, velocity: 120 });
  assert.equal(boarChargeVelocity(atLeftEdge.x, 90, 90, 310, atLeftEdge.velocity), 120);
  assert.equal(boarChargeVelocity(310, 310, 90, 310, 120), -120);
});

test("el muelle solo impulsa al aterrizar sobre él, no al caminar de largo", () => {
  assert.equal(landsOnSpring(true, 456, 457, 398, 20), false);
  assert.equal(landsOnSpring(false, 394, 401, 398, 250), true);
  assert.equal(landsOnSpring(false, 394, 401, 398, -250), false);
});
