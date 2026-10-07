import assert from "node:assert/strict";
import test from "node:test";
import { levels } from "./levels.ts";
import { stickerCatalog } from "./stickers.ts";

const castle = levels.filter((level) => level.world === 6);

test("el castillo tiene tres pantallas, un jefe y una pegatina por pantalla", () => {
  assert.deepEqual(castle.map((level) => level.id), ["6-1", "6-2", "6-3"]);
  assert.equal(castle[2].boss, "vampire-count");
  for (const level of castle) {
    const sticker = level.items.find((item) => item.kind === "sticker");
    assert.equal(sticker?.id, `sticker-${level.id}`);
    assert.ok(stickerCatalog.some((entry) => entry.id === sticker?.id));
    assert.ok(level.enemies.some((enemy) => enemy.kind === "ghost"));
  }
});

test("cada hueco del castillo contiene pinchos y los puntos seguros tienen suelo", () => {
  for (const level of castle) {
    const floors = level.platforms.filter((platform) => platform.kind === "castle-ground").sort((a, b) => a.x - b.x);
    const gaps = floors.slice(0, -1).map((floor, index) => [floor.x + floor.width, floors[index + 1].x] as const);
    assert.equal(level.spikePits?.length, gaps.length);
    gaps.forEach(([start, end], index) => {
      assert.equal(level.spikePits?.[index].x, start);
      assert.equal(level.spikePits?.[index].width, end - start);
      assert.ok(end - start < 190, `Hueco demasiado ancho en ${level.id}`);
    });
    for (const x of [level.start.x, ...level.checkpoints, level.goalX]) {
      assert.ok(floors.some((floor) => x >= floor.x && x < floor.x + floor.width), `Sin suelo en ${level.id}, x=${x}`);
    }
  }
});

test("el reino secreto conserva sus identificadores y está después de la campaña", () => {
  const secret = levels.at(-1);
  assert.equal(secret?.id, "S-1");
  assert.equal(secret.world, 7);
  assert.deepEqual(stickerCatalog.filter((entry) => entry.world === 7).map((entry) => entry.id), ["sticker-s-1", "sticker-s-2", "sticker-s-3"]);
});
