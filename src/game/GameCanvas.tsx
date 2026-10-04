import { useEffect, useRef } from "react";
import { PixelIcon } from "./PixelIcon";
import type { Level, GameSnapshot, LevelItem, Power, Rect } from "./types";

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const GRAVITY = 1650;
const MOVE_SPEED = 250;
const JUMP_SPEED = 625;

type SoundKind = "apple" | "block" | "cat" | "jump" | "hurt" | "stomp" | "yarn" | "checkpoint" | "goal" | "sticker" | "howl" | "snort" | "cannon" | "countdown";

type GameCanvasProps = {
  level: Level;
  running: boolean;
  onLoseLife: () => void;
  onComplete: () => void;
  onBossEncounter: () => void;
  onSecretExit: () => void;
  onSnapshot: (snapshot: GameSnapshot) => void;
  playSound: (kind: SoundKind) => void;
};

type InputState = {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
  jumpQueued: boolean;
  shootQueued: boolean;
};

type TouchKey = "left" | "right" | "jump" | "shoot";

type Player = Rect & {
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 1 | -1;
  power: Power;
  invincible: number;
  coyote: number;
  jumpBuffer: number;
  jumpsUsed: number;
  doubleJumpFx: number;
};

type LiveEnemy = Level["enemies"][number] & { vx: number; active: boolean; phase: number };
type LiveItem = LevelItem & { age: number; rise: number; fromBlock: boolean };
type Projectile = { x: number; y: number; vx: number; vy: number; life: number };
type LiveCannon = NonNullable<Level["cannons"]>[number] & { cooldown: number };
type Cannonball = { x: number; y: number; vx: number; active: boolean };
type PixelBurst = { x: number; y: number; life: number; color: string; kind: "stars" | "puff" };
type RasterAssets = { enemies: HTMLImageElement; collectibles: HTMLImageElement; cave: HTMLImageElement; secret: HTMLImageElement; tiles: Record<Level["world"], HTMLImageElement> };

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

const enemyY = (enemy: LiveEnemy) =>
  enemy.y + (enemy.kind === "bird" || enemy.kind === "parrot" || enemy.kind === "bat" ? Math.sin(enemy.phase) * 20 : enemy.kind === "cloud" ? Math.sin(enemy.phase) * 7 : 0);

const enemyAtlasCell = {
  slime: [0, 0], beetle: [1, 0], cloud: [2, 0], wolf: [3, 0],
  boar: [0, 1], bird: [1, 1], pirate: [2, 1], parrot: [3, 1],
} as const;

const enemyRasterSize = {
  slime: [48, 50], beetle: [50, 48], cloud: [56, 43], wolf: [64, 58],
  boar: [70, 58], bird: [52, 46], pirate: [52, 59], parrot: [58, 60],
} as const;

const createRasterImage = (src: string) => {
  const image = new Image();
  image.src = src;
  return image;
};

const drawAtlasCell = (context: CanvasRenderingContext2D, image: HTMLImageElement, columns: number, rows: number, column: number, row: number, x: number, y: number, width: number, height: number, alpha = 1) => {
  if (!image.complete || !image.naturalWidth) return false;
  const cellWidth = image.naturalWidth / columns;
  const cellHeight = image.naturalHeight / rows;
  const inset = Math.max(4, Math.round(Math.min(cellWidth, cellHeight) * 0.025));
  context.save();
  context.globalAlpha = alpha;
  context.drawImage(image, column * cellWidth + inset, row * cellHeight + inset, cellWidth - inset * 2, cellHeight - inset * 2, x, y, width, height);
  context.restore();
  return true;
};

const drawCollectibleSprite = (context: CanvasRenderingContext2D, image: HTMLImageElement, column: number, row: number, x: number, y: number, width: number, height: number) =>
  drawAtlasCell(context, image, 4, 2, column, row, x, y, width, height);

const stampTileTexture = (context: CanvasRenderingContext2D, image: HTMLImageElement | undefined, tile: number, x: number, y: number, width: number, height: number, alpha = 0.28) => {
  if (!image?.complete || !image.naturalWidth || width < 20 || height < 8) return;
  const size = 54;
  for (let stampX = x; stampX < x + width; stampX += size) {
    drawAtlasCell(context, image, 2, 2, tile % 2, Math.floor(tile / 2), stampX, y, Math.min(size, x + width - stampX), height, alpha);
  }
};

const drawEnemyAtlasSprite = (context: CanvasRenderingContext2D, image: HTMLImageElement, column: number, row: number, x: number, y: number, width: number, height: number) => {
  const cellWidth = image.naturalWidth / 4;
  const cellHeight = image.naturalHeight / 2;
  const sourceTop = row === 0 ? cellHeight * 0.31 : cellHeight * 0.08;
  const sourceHeight = row === 0 ? cellHeight * 0.67 : cellHeight * 0.84;
  const inset = Math.round(cellWidth * 0.04);
  context.drawImage(image, column * cellWidth + inset, row * cellHeight + sourceTop, cellWidth - inset * 2, sourceHeight, x, y, width, height);
};

const drawPixelCloud = (context: CanvasRenderingContext2D, x: number, y: number, color: string, shadow = "#bdd4dc") => {
  const px = Math.round(x);
  const py = Math.round(y);
  context.fillStyle = shadow;
  context.fillRect(px + 7, py + 18, 88, 20);
  context.fillRect(px + 23, py + 6, 34, 30);
  context.fillRect(px + 57, py + 12, 24, 24);
  context.fillStyle = color;
  context.fillRect(px, py + 12, 88, 20);
  context.fillRect(px + 16, py, 34, 30);
  context.fillRect(px + 50, py + 6, 24, 24);
  context.fillStyle = "rgba(255,255,255,.42)";
  context.fillRect(px + 20, py + 4, 21, 5);
};

const drawTinySparkle = (context: CanvasRenderingContext2D, x: number, y: number, color: string, scale = 1) => {
  context.fillStyle = color;
  context.fillRect(Math.round(x + 4 * scale), Math.round(y), 3 * scale, 11 * scale);
  context.fillRect(Math.round(x), Math.round(y + 4 * scale), 11 * scale, 3 * scale);
};

function drawHappySun(context: CanvasRenderingContext2D, x: number, y: number, sunset: boolean, pirate: boolean, frame: number, collectibles?: HTMLImageElement) {
  if (collectibles && drawCollectibleSprite(context, collectibles, 0, 1, x - 2, y - 2, 84, 84)) return;
  context.fillStyle = sunset ? "#ffd084" : "#ffe36f";
  context.fillRect(x + 27, y, 14, 12);
  context.fillRect(x + 27, y + 68, 14, 12);
  context.fillRect(x, y + 27, 12, 14);
  context.fillRect(x + 68, y + 27, 12, 14);
  context.fillRect(x + 8, y + 8, 12, 12);
  context.fillRect(x + 60, y + 8, 12, 12);
  context.fillRect(x + 8, y + 60, 12, 12);
  context.fillRect(x + 60, y + 60, 12, 12);
  context.fillStyle = sunset ? "#ffc15f" : "#ffdf55";
  context.fillRect(x + 12, y + 12, 56, 56);
  context.fillRect(x + 5, y + 25, 70, 30);
  context.fillStyle = "#5a3b48";
  const blinking = Math.floor(frame / 80) % 5 === 4;
  context.fillRect(x + 25, y + (blinking ? 35 : 31), 6, blinking ? 3 : 8);
  if (pirate) {
    context.fillRect(x + 47, y + 29, 11, 11);
    context.fillRect(x + 42, y + 33, 22, 4);
  } else {
    context.fillRect(x + 49, y + (blinking ? 35 : 31), 6, blinking ? 3 : 8);
  }
  context.fillRect(x + 31, y + 49, 18, 5);
  context.fillStyle = "#f08a72";
  context.fillRect(x + 17, y + 44, 8, 5);
  context.fillRect(x + 55, y + 44, 8, 5);
}

function drawHappyMoon(context: CanvasRenderingContext2D, x: number, y: number, catMoon: boolean, frame: number, collectibles?: HTMLImageElement) {
  if (collectibles && drawCollectibleSprite(context, collectibles, 1, 1, x - 2, y - 2, 84, 84)) return;
  context.fillStyle = "#fff0ad";
  if (catMoon) {
    context.fillRect(x + 12, y + 3, 18, 20);
    context.fillRect(x + 50, y + 3, 18, 20);
  }
  context.fillRect(x + 10, y + 12, 60, 60);
  context.fillRect(x + 3, y + 25, 74, 34);
  context.fillStyle = "#e6cf91";
  context.fillRect(x + 18, y + 19, 9, 8);
  context.fillRect(x + 57, y + 50, 8, 8);
  context.fillRect(x + 21, y + 57, 6, 6);
  context.fillStyle = "#4a3b61";
  const blinking = Math.floor(frame / 95) % 5 === 4;
  context.fillRect(x + 24, y + (blinking ? 39 : 36), 6, blinking ? 3 : 7);
  context.fillRect(x + 50, y + (blinking ? 39 : 36), 6, blinking ? 3 : 7);
  context.fillRect(x + 32, y + 51, 16, 5);
  context.fillStyle = "#e794a0";
  context.fillRect(x + 16, y + 47, 8, 5);
  context.fillRect(x + 56, y + 47, 8, 5);
}

function drawCaveBackground(context: CanvasRenderingContext2D, cameraX: number, frame: number, cave: HTMLImageElement) {
  context.fillStyle = "#120d24";
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  context.fillStyle = "#20183c";
  context.fillRect(0, 118, VIEW_WIDTH, 338);

  const wallOffset = positiveModulo(cameraX * 0.08, 210);
  for (let index = -1; index < 6; index += 1) {
    const x = index * 210 - wallOffset;
    drawAtlasCell(context, cave, 4, 2, 2, 0, x, 105 + (index % 2) * 28, 210, 270, 0.28);
  }

  context.fillStyle = "#2b2050";
  context.fillRect(0, 0, VIEW_WIDTH, 38);
  const ceilingOffset = positiveModulo(cameraX * 0.2, 150);
  for (let index = -1; index < 8; index += 1) {
    const x = index * 150 - ceilingOffset;
    const depth = 58 + positiveModulo(index * 17, 48);
    context.beginPath();
    context.moveTo(x, 28);
    context.lineTo(x + 42, 28);
    context.lineTo(x + 72, depth);
    context.lineTo(x + 102, 28);
    context.lineTo(x + 150, 28);
    context.lineTo(x + 150, 0);
    context.lineTo(x, 0);
    context.closePath();
    context.fill();
  }

  const lavaY = 454 + Math.round(Math.sin(frame * 0.08) * 2);
  context.fillStyle = "#7b1838";
  context.fillRect(0, 448, VIEW_WIDTH, VIEW_HEIGHT - 448);
  for (let x = -positiveModulo(cameraX * 0.28, 176) - 30; x < VIEW_WIDTH + 176; x += 176) {
    drawAtlasCell(context, cave, 4, 2, 3, 0, x, lavaY, 184, 100);
  }
  context.fillStyle = frame % 28 < 14 ? "#ffd05a" : "#ff8a35";
  for (let index = 0; index < 8; index += 1) {
    const x = positiveModulo(index * 151 - cameraX * 0.35, VIEW_WIDTH + 40) - 20;
    const y = 474 + positiveModulo(index * 23, 44);
    context.fillRect(Math.round(x), y, index % 2 ? 6 : 9, 4);
  }

  for (let index = 0; index < 7; index += 1) {
    const x = index * 190 - positiveModulo(cameraX * 0.32, 190) - 20;
    drawAtlasCell(context, cave, 4, 2, 3, 1, x, 350 + (index % 2) * 24, 66, 82, 0.72);
  }
}

function drawBackground(context: CanvasRenderingContext2D, level: Level, cameraX: number, frame: number, raster: RasterAssets) {
  if (level.theme === "crystal-cave") {
    drawCaveBackground(context, cameraX, frame, raster.cave);
    return;
  }
  if (level.theme === "secret-sky") {
    context.fillStyle = "#77cdf5";
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    context.fillStyle = "#c6efff";
    context.fillRect(0, 255, VIEW_WIDTH, 285);
    for (let index = 0; index < 12; index += 1) {
      const x = index * 190 - positiveModulo(cameraX * 0.12, 190) - 70;
      drawPixelCloud(context, x, 48 + positiveModulo(index * 67, 250), index % 2 ? "#fff8ff" : "#f7edff", "#c4bff2");
    }
    const rainbowX = 710 - positiveModulo(cameraX * 0.04, 900);
    ["#ec6fa7", "#f4ad55", "#ffe56d", "#79d18d", "#70bde8", "#aa83dc"].forEach((color, index) => {
      context.strokeStyle = color;
      context.lineWidth = 9;
      context.beginPath();
      context.arc(rainbowX, 310, 155 - index * 9, Math.PI, Math.PI * 2);
      context.stroke();
    });
    for (let index = 0; index < 14; index += 1) {
      drawTinySparkle(context, positiveModulo(index * 173 - cameraX * 0.2, VIEW_WIDTH), 55 + positiveModulo(index * 83, 350), index % 2 ? "#fff5a9" : "#f9d3ff", index % 3 === 0 ? 2 : 1);
    }
    return;
  }
  const storm = level.theme === "boar-storm" || level.theme === "sky-storm";
  const night = level.theme === "forest-night" || level.theme === "wolf-moon" || level.theme === "boar-storm";
  const wolves = level.world === 3;
  const boars = level.world === 4;
  const pirates = level.world === 5;
  const forest = level.world >= 2 && level.world <= 4;
  const sunset = level.theme === "orchard-sunset" || level.theme === "forest-dusk" || level.theme === "wolf-pines";
  const sky = level.theme === "sky-storm" ? "#596581" : pirates ? "#72c8ed" : storm ? "#45475f" : boars ? "#d39462" : night ? "#171a3d" : wolves ? "#8d7894" : sunset ? "#f7a873" : "#91dcf4";
  context.fillStyle = sky;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const lowerSky = pirates ? (storm ? "#75829b" : "#a7e2ed") : night ? "#292653" : boars ? "#e3ad78" : sunset ? "#f2c07e" : "#bfe8e5";
  context.fillStyle = lowerSky;
  context.fillRect(0, 255, VIEW_WIDTH, 285);
  context.fillStyle = night ? "rgba(213,190,241,.12)" : "rgba(255,248,220,.2)";
  for (let x = -((cameraX * 0.04) % 36); x < VIEW_WIDTH; x += 36) {
    const y = 170 + ((Math.floor((x + cameraX) / 36) % 4) * 22);
    context.fillRect(Math.round(x), y, 5, 5);
  }

  if (night) {
    drawHappyMoon(context, 770, 46, level.world === 2, frame, raster.collectibles);
    context.fillStyle = "#f5dfff";
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 157 + 43) % VIEW_WIDTH;
      const y = 28 + ((index * 61) % 180);
      context.fillRect(x, y, index % 3 === 0 ? 4 : 2, index % 3 === 0 ? 4 : 2);
    }
  } else {
    drawHappySun(context, 770, 46, sunset || storm, pirates, frame, raster.collectibles);
  }

  const cloudColor = level.theme === "sky-storm" ? "#aeb8ce" : storm ? "#77758b" : night ? "#5c548c" : boars ? "#ffe1b5" : sunset ? "#ffe0cf" : "#f8fdff";
  const cloudShadow = level.theme === "sky-storm" ? "#727d98" : night ? "#3c3a69" : sunset ? "#d69b9c" : "#b7d9df";
  for (let index = 0; index < 7; index += 1) {
    const x = index * 310 - ((cameraX * 0.12) % 310) - 90;
    drawPixelCloud(context, x, 72 + (index % 3) * 48, cloudColor, cloudShadow);
  }

  const farColor = pirates ? (storm ? "#44506c" : "#7fb6c9") : boars ? (storm ? "#313c45" : "#596548") : wolves ? "#303956" : forest ? (night ? "#342c5f" : "#5d617b") : sunset ? "#c86d68" : "#6db6b1";
  context.fillStyle = farColor;
  if (pirates) {
    for (let index = -1; index < 6; index += 1) {
      const x = index * 230 - ((cameraX * 0.18) % 230);
      drawPixelCloud(context, x, 330 + (index % 2) * 55, farColor, storm ? "#30384f" : "#4f8397");
      context.fillStyle = storm ? "#343c58" : "#557b91";
      context.fillRect(Math.round(x + 35), 385 + (index % 2) * 55, 54, 10);
      context.fillRect(Math.round(x + 48), 395 + (index % 2) * 55, 28, 15);
    }
  } else {
    const mountainScroll = cameraX * 0.18;
    const firstMountain = Math.floor(mountainScroll / 180) - 1;
    for (let index = firstMountain; index < firstMountain + 8; index += 1) {
      const x = index * 180 - mountainScroll;
      const peak = 270 + positiveModulo(index, 3) * 30;
      context.beginPath();
      context.moveTo(x, 430);
      context.lineTo(x + 72, peak);
      context.lineTo(x + 96, peak + 26);
      context.lineTo(x + 180, 430);
      context.closePath();
      context.fill();
      context.fillStyle = night ? "rgba(220,211,244,.08)" : "rgba(255,244,218,.16)";
      context.beginPath();
      context.moveTo(x + 72, peak);
      context.lineTo(x + 96, peak + 26);
      context.lineTo(x + 118, 365);
      context.closePath();
      context.fill();
      context.fillStyle = farColor;
    }
  }

  const treeSpacing = level.world === 2 ? 190 : forest ? 165 : 220;
  const firstTree = Math.floor((cameraX * 0.45) / treeSpacing) - 2;
  const visibleTrees = Math.ceil(VIEW_WIDTH / treeSpacing) + 4;
  for (let index = firstTree; !pirates && index < firstTree + visibleTrees; index += 1) {
    const x = index * treeSpacing - cameraX * 0.45;
    const tall = 118 + positiveModulo(index * 19, 42);
    context.fillStyle = boars ? "#50372f" : wolves ? "#252a3c" : night ? "#281c49" : forest ? "#3d665e" : "#725039";
    context.fillRect(Math.round(x + 64), 430 - tall, 28, tall);
    context.fillStyle = boars ? "#7d5238" : wolves ? "#394256" : night ? "#493b77" : forest ? "#56806b" : "#9a6748";
    context.fillRect(Math.round(x + 69), 438 - tall, 7, tall - 18);
    context.fillStyle = boars ? (storm ? "#405347" : "#57744d") : wolves ? "#34485a" : night ? "#40366d" : forest ? "#477d68" : "#4d9b63";
    if (wolves) {
      for (let tier = 0; tier < 3; tier += 1) {
        context.beginPath();
        context.moveTo(Math.round(x + 76), 246 + tier * 44 - (index % 2) * 18);
        context.lineTo(Math.round(x + 16 - tier * 5), 348 + tier * 20);
        context.lineTo(Math.round(x + 137 + tier * 5), 348 + tier * 20);
        context.closePath();
        context.fill();
      }
      context.fillStyle = "#4d6570";
      context.fillRect(Math.round(x + 34), 335, 18, 6);
      context.fillRect(Math.round(x + 102), 369, 16, 6);
    } else if (boars) {
      context.fillRect(Math.round(x + 4), 285 - (index % 2) * 20, 145, 58);
      context.fillRect(Math.round(x + 22), 325 - (index % 2) * 20, 112, 46);
      context.fillStyle = storm ? "#526b57" : "#71935a";
      context.fillRect(Math.round(x + 18), 292 - (index % 2) * 20, 48, 11);
      context.fillRect(Math.round(x + 82), 332 - (index % 2) * 20, 42, 9);
      context.fillStyle = "#b57b3e";
      context.fillRect(Math.round(x + 30), 311 - (index % 2) * 20, 8, 8);
      context.fillRect(Math.round(x + 110), 300 - (index % 2) * 20, 8, 8);
    } else {
      const crownY = 290 - positiveModulo(index, 2) * 18;
      const crownInset = level.world === 2 ? 12 : 0;
      context.fillStyle = forest ? (night ? "#302754" : "#365b4f") : "#356f47";
      context.fillRect(Math.round(x + 19 + crownInset), crownY - 9, 110 - crownInset * 2, 87);
      context.fillRect(Math.round(x - 5 + crownInset), crownY + 26, 165 - crownInset * 2, 66);
      context.fillRect(Math.round(x + 45), crownY - 25, 61, 35);
      context.fillStyle = night ? "#40366d" : forest ? "#477d68" : "#4d9b63";
      context.fillRect(Math.round(x + 24 + crownInset), crownY - 4, 99 - crownInset * 2, 74);
      context.fillRect(Math.round(x + 2 + crownInset), crownY + 31, 151 - crownInset * 2, 52);
      context.fillRect(Math.round(x + 50), crownY - 19, 51, 25);
      context.fillStyle = night ? "#574982" : forest ? "#609478" : "#69b66f";
      context.fillRect(Math.round(x + 18 + crownInset), crownY + 7, 44, 13);
      context.fillRect(Math.round(x + 84 - crownInset), crownY + 48, 49, 11);
    }
    if (!forest) {
      context.fillStyle = "#e74b54";
      context.fillRect(Math.round(x + 35), 320, 10, 10);
      context.fillRect(Math.round(x + 108), 300, 10, 10);
      context.fillRect(Math.round(x + 78), 348, 10, 10);
    }
  }

  if (forest) {
    context.fillStyle = night ? "#f2d06b" : "#fff1a3";
    for (let index = 0; index < 20; index += 1) {
      const x = ((index * 173 - cameraX * 0.7) % (VIEW_WIDTH + 80)) - 20;
      const y = 210 + ((index * 47) % 190);
      context.fillRect(Math.round(x), y, 4, 4);
    }
  }

  if (pirates) {
    for (let index = 0; index < 7; index += 1) {
      const x = ((index * 181 - cameraX * 0.5) % (VIEW_WIDTH + 120)) - 40;
      drawTinySparkle(context, x, 205 + (index % 3) * 55, storm ? "#d7def0" : "#fff4b0", index % 3 === 0 ? 2 : 1);
    }
  }
}

function drawAmbientForeground(context: CanvasRenderingContext2D, level: Level, cameraX: number, frame: number) {
  if (level.world >= 3 && level.world <= 4) {
    const leafColor = level.world === 3 ? "#263645" : level.world === 4 ? "#40573b" : "#3c6857";
    context.fillStyle = leafColor;
    for (let index = 0; index < 8; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side < 0 ? (index * 17) % 75 - 28 : VIEW_WIDTH - ((index * 19) % 78) - 24;
      const y = 34 + ((index * 79 + Math.floor(cameraX * 0.08)) % 360);
      context.fillRect(x, y, 34, 12);
      context.fillRect(x + (side < 0 ? 10 : -10), y + 9, 29, 10);
    }
  } else if (level.world === 2) {
    for (let index = 0; index < 8; index += 1) {
      const x = positiveModulo(index * 139 + frame * 0.35, VIEW_WIDTH);
      const y = 120 + positiveModulo(index * 67 + frame * 0.2, 310);
      drawTinySparkle(context, x, y, index % 2 ? "#f4d76f" : "#cfa5ef");
    }
  }
}

function drawPlatform(context: CanvasRenderingContext2D, platform: Level["platforms"][number], cameraX: number, world: Level["world"], playerX: number, frame: number, raster: RasterAssets) {
  const x = Math.round(platform.x - cameraX);
  const forest = world >= 2 && world <= 4;
  if (x + platform.width < 0 || x > VIEW_WIDTH) return;
  if (platform.kind === "cloud-floor") {
    context.fillStyle = "rgba(178,164,232,.75)";
    context.fillRect(x + 14, platform.y + 19, Math.max(0, platform.width - 28), platform.height + 12);
    for (let tileX = x; tileX < x + platform.width; tileX += 150) {
      drawAtlasCell(context, raster.secret, 2, 2, 1, 1, tileX - 8, platform.y - 30, Math.min(172, x + platform.width - tileX + 18), 74);
    }
    return;
  }
  if (platform.kind === "cave-wall") {
    context.fillStyle = "#160e28";
    context.fillRect(x - 4, platform.y - 4, platform.width + 8, platform.height + 8);
    context.fillStyle = "#30204d";
    context.fillRect(x, platform.y, platform.width, platform.height);
    for (let tileY = platform.y; tileY < platform.y + platform.height; tileY += 96) {
      for (let tileX = x; tileX < x + platform.width; tileX += 112) {
        drawAtlasCell(
          context,
          raster.cave,
          4,
          2,
          2,
          0,
          tileX,
          tileY,
          Math.min(116, x + platform.width - tileX),
          Math.min(100, platform.y + platform.height - tileY),
          0.78,
        );
      }
    }
    context.fillStyle = "rgba(205,145,255,.35)";
    context.fillRect(x, platform.y, platform.width, 5);
    return;
  }
  if (platform.kind === "cave-ground") {
    context.fillStyle = "#211636";
    context.fillRect(x - 3, platform.y - 3, platform.width + 6, platform.height + 3);
    context.fillStyle = "#38265a";
    context.fillRect(x, platform.y, platform.width, platform.height);
    for (let tileX = x; tileX < x + platform.width; tileX += 112) {
      drawAtlasCell(context, raster.cave, 4, 2, 0, 0, tileX, platform.y - 5, Math.min(116, x + platform.width - tileX), platform.height + 12);
    }
    return;
  }
  if (platform.kind === "cave-ledge") {
    context.fillStyle = "#1b122e";
    context.fillRect(x - 3, platform.y - 3, platform.width + 6, platform.height + 7);
    for (let tileX = x; tileX < x + platform.width; tileX += 104) {
      drawAtlasCell(context, raster.cave, 4, 2, 1, 0, tileX, platform.y - 6, Math.min(108, x + platform.width - tileX), 55);
    }
    return;
  }
  if (platform.kind === "ship") {
    const shipBob = Math.round(Math.sin(frame * 0.075 + platform.x * 0.015) * 4);
    context.save();
    context.translate(0, shipBob);
    const mastX = x + Math.round(platform.width * 0.58);
    context.fillStyle = "#2a1a2e";
    context.fillRect(x + 7, platform.y - 5, platform.width - 14, 29);
    context.fillStyle = "#4a2b34";
    context.fillRect(mastX, platform.y - 118, 8, 125);
    context.fillStyle = "#8b5840";
    context.fillRect(mastX + 3, platform.y - 112, 3, 108);
    context.fillStyle = "#fff0c9";
    context.beginPath();
    context.moveTo(mastX + 8, platform.y - 108);
    context.lineTo(mastX + Math.min(92, platform.width * 0.28), platform.y - 66);
    context.lineTo(mastX + 8, platform.y - 28);
    context.closePath();
    context.fill();
    context.fillStyle = "#e4c995";
    context.fillRect(mastX + 12, platform.y - 68, Math.min(74, platform.width * 0.22), 5);
    context.fillStyle = "#b76bd0";
    context.fillRect(mastX + 13, platform.y - 82, Math.min(48, platform.width * 0.14), 9);
    const flagWave = Math.floor(frame / 12) % 2 === 0 ? 0 : 5;
    context.fillStyle = "#e95667";
    context.fillRect(mastX + 8, platform.y - 116, 34 + flagWave, 9);
    context.fillStyle = "#ffd45f";
    context.fillRect(mastX + 19, platform.y - 113, 8, 3);
    context.fillStyle = "#6f3e2e";
    context.fillRect(x + 8, platform.y, platform.width - 16, 18);
    context.fillStyle = "#d49a55";
    context.fillRect(x + 3, platform.y, platform.width - 6, 7);
    context.beginPath();
    context.moveTo(x + 18, platform.y + 18);
    context.lineTo(x + platform.width - 12, platform.y + 18);
    context.lineTo(x + platform.width - 58, platform.y + 72);
    context.lineTo(x + 68, platform.y + 72);
    context.closePath();
    context.fillStyle = "#7b4634";
    context.fill();
    context.fillStyle = "#3b2637";
    context.fillRect(x + 80, platform.y + 35, Math.max(28, platform.width - 160), 7);
    context.fillStyle = "#a86645";
    for (let plank = 30; plank < platform.width - 20; plank += 42) context.fillRect(x + plank, platform.y + 7, 4, 12);
    for (let porthole = 92; porthole < platform.width - 70; porthole += 62) {
      context.fillStyle = "#f6c75e";
      context.fillRect(x + porthole, platform.y + 27, 13, 13);
      context.fillStyle = "#74c5df";
      context.fillRect(x + porthole + 3, platform.y + 30, 7, 7);
    }
    context.fillStyle = "#fff1b1";
    context.fillRect(x + 35, platform.y + 31, 9, 5);
    context.fillStyle = "#563243";
    context.fillRect(x + 44, platform.y + 28, 6, 18);
    stampTileTexture(context, raster.tiles[world], 2, x + 12, platform.y + 18, platform.width - 24, 50, 0.2);
    context.restore();
    return;
  }
  if (platform.kind === "air-plank") {
    context.fillStyle = "#513143";
    context.fillRect(x, platform.y, platform.width, platform.height);
    context.fillStyle = "#d79855";
    context.fillRect(x + 4, platform.y + 3, platform.width - 8, 8);
    context.fillStyle = "#fff2d2";
    context.fillRect(x + 12, platform.y + platform.height, platform.width - 24, 8);
    context.fillRect(x + 28, platform.y + platform.height + 6, Math.max(24, platform.width - 56), 8);
    context.fillStyle = "#8a5a38";
    for (let board = 20; board < platform.width; board += 28) context.fillRect(x + board, platform.y + 3, 4, 11);
    stampTileTexture(context, raster.tiles[world], 3, x + 4, platform.y, platform.width - 8, platform.height, 0.19);
    return;
  }
  if (platform.kind === "spring") {
    context.fillStyle = "#3a2149";
    context.fillRect(x, platform.y, platform.width, platform.height);
    context.fillStyle = "#f7cc58";
    context.fillRect(x + 5, platform.y + 3, platform.width - 10, 6);
    context.fillStyle = "#c783e7";
    for (let mark = 12; mark < platform.width - 8; mark += 20) {
      context.fillRect(x + mark, platform.y + 10, 8, 8);
    }
    return;
  }
  if (platform.kind === "mist") {
    const distance = Math.abs(playerX - (platform.x + platform.width / 2));
    context.save();
    context.globalAlpha = distance < 330 ? 0.96 : 0.34;
    context.fillStyle = "#ede4ff";
    context.fillRect(x, platform.y + 7, platform.width, 15);
    context.fillRect(x + 18, platform.y, Math.max(35, platform.width * 0.35), 18);
    context.fillRect(x + platform.width * 0.52, platform.y + 2, Math.max(28, platform.width * 0.28), 17);
    context.fillStyle = "#b99ddd";
    context.fillRect(x + 8, platform.y + 16, platform.width - 16, 6);
    context.restore();
    stampTileTexture(context, raster.tiles[world], 1, x, platform.y, platform.width, platform.height + 7, 0.18);
    return;
  }
  if (platform.kind === "canopy") {
    context.fillStyle = "#2d2029";
    context.fillRect(x - 3, platform.y + 6, platform.width + 6, platform.height - 3);
    context.fillStyle = "#4b3028";
    context.fillRect(x, platform.y + 8, platform.width, platform.height - 8);
    context.fillStyle = "#bd8444";
    context.fillRect(x, platform.y + 8, platform.width, 7);
    context.fillStyle = "#5f8b49";
    context.fillRect(x + 5, platform.y, platform.width - 10, 11);
    for (let leaf = 12; leaf < platform.width - 8; leaf += 28) {
      context.fillStyle = leaf % 56 ? "#75a855" : "#486f42";
      context.fillRect(x + leaf, platform.y - 5, 18, 12);
      context.fillStyle = "#9bc45c";
      context.fillRect(x + leaf + 4, platform.y - 3, 7, 4);
    }
    stampTileTexture(context, raster.tiles[world], 2, x + 2, platform.y, platform.width - 4, platform.height, 0.22);
    return;
  }
  if (platform.kind === "branch") {
    context.fillStyle = "#2d2029";
    context.fillRect(x - 3, platform.y - 3, platform.width + 6, platform.height + 6);
    context.fillStyle = "#5a382d";
    context.fillRect(x, platform.y, platform.width, platform.height);
    context.fillStyle = "#936044";
    context.fillRect(x, platform.y, platform.width, 8);
    context.fillStyle = "#d4955d";
    for (let mark = 18; mark < platform.width; mark += 46) context.fillRect(x + mark, platform.y + 10, 18, 4);
    context.fillStyle = "#7ab75c";
    for (let leaf = 27; leaf < platform.width - 12; leaf += 78) {
      context.fillRect(x + leaf, platform.y - 7, 13, 8);
      context.fillRect(x + leaf + 8, platform.y - 11, 10, 8);
    }
    stampTileTexture(context, raster.tiles[world], 3, x + 2, platform.y, platform.width - 4, platform.height, 0.2);
    return;
  }
  if (platform.kind === "stone") {
    context.fillStyle = "#56546f";
    context.fillRect(x, platform.y, platform.width, platform.height);
    context.fillStyle = "#8b87a5";
    context.fillRect(x, platform.y, platform.width, 8);
    for (let mark = 8; mark < platform.width; mark += 38) {
      context.fillStyle = mark % 76 ? "#6d6a87" : "#49465f";
      context.fillRect(x + mark, platform.y + 11, 22, 6);
    }
    stampTileTexture(context, raster.tiles[world], 1, x + 2, platform.y, platform.width - 4, platform.height, 0.2);
    return;
  }
  const earth = world === 1 ? "#9a5d3b" : world === 2 ? "#3c4c50" : world === 3 ? "#303846" : "#493d32";
  const top = world === 1 ? "#62b45b" : world === 2 ? "#618766" : world === 3 ? "#526c5b" : "#65834c";
  const texture = world === 1 ? "#c9834d" : world === 2 ? "#536a60" : world === 3 ? "#465363" : "#6a5940";
  context.fillStyle = "#291d2c";
  context.fillRect(x - 3, platform.y - 3, platform.width + 6, platform.height + 3);
  context.fillStyle = earth;
  context.fillRect(x, platform.y, platform.width, platform.height);
  context.fillStyle = top;
  context.fillRect(x, platform.y, platform.width, 14);
  context.fillStyle = world === 1 ? "#91d565" : "#88aa65";
  for (let grass = 4; grass < platform.width; grass += 22) context.fillRect(x + grass, platform.y - (grass % 44 === 0 ? 7 : 4), 5, 7);
  context.fillStyle = texture;
  for (let tile = 0; tile < platform.width; tile += 48) {
    context.fillRect(x + tile + 4, platform.y + 26, 31, 8);
    context.fillRect(x + tile + 18, platform.y + 48, 24, 7);
    context.fillStyle = forest ? "#2d3e39" : "#77442f";
    context.fillRect(x + tile + 38, platform.y + 17, 5, 5);
    context.fillStyle = texture;
  }
  stampTileTexture(context, raster.tiles[world], 0, x + 2, platform.y, platform.width - 4, platform.height, 0.19);
}

function drawApple(context: CanvasRenderingContext2D, x: number, y: number, collectibles?: HTMLImageElement) {
  if (collectibles && drawCollectibleSprite(context, collectibles, 0, 0, x - 6, y - 11, 46, 46)) return;
  context.fillStyle = "#382332";
  context.fillRect(x + 1, y + 3, 30, 25);
  context.fillRect(x - 3, y + 8, 38, 14);
  context.fillStyle = "#5a382d";
  context.fillRect(x + 14, y - 8, 5, 10);
  context.fillStyle = "#5eb454";
  context.fillRect(x + 18, y - 7, 10, 6);
  context.fillStyle = "#e94255";
  context.fillRect(x + 3, y + 2, 26, 24);
  context.fillRect(x, y + 7, 32, 14);
  context.fillStyle = "#ff7a78";
  context.fillRect(x + 6, y + 5, 6, 6);
  context.fillStyle = "#b52f45";
  context.fillRect(x + 7, y + 22, 18, 5);
}

function drawCatPower(context: CanvasRenderingContext2D, x: number, y: number, collectibles?: HTMLImageElement) {
  if (collectibles && drawCollectibleSprite(context, collectibles, 1, 0, x - 6, y - 12, 52, 52)) return;
  context.fillStyle = "#2d1d39";
  context.fillRect(x, y + 2, 40, 36);
  context.fillRect(x + 1, y - 9, 16, 18);
  context.fillRect(x + 23, y - 9, 16, 18);
  context.fillStyle = "#4b295f";
  context.fillRect(x + 3, y + 4, 34, 31);
  context.fillRect(x + 4, y - 6, 12, 15);
  context.fillRect(x + 24, y - 6, 12, 15);
  context.fillStyle = "#bd83e5";
  context.fillRect(x + 7, y, 7, 7);
  context.fillRect(x + 26, y, 7, 7);
  context.fillStyle = "#fff3e4";
  context.fillRect(x + 10, y + 15, 5, 5);
  context.fillRect(x + 25, y + 15, 5, 5);
  context.fillStyle = "#ee9ccf";
  context.fillRect(x + 18, y + 23, 5, 4);
  context.fillStyle = "#f4d66f";
  context.fillRect(x + 16, y + 31, 9, 4);
}

function drawSticker(context: CanvasRenderingContext2D, x: number, y: number, pulse: number, collectibles?: HTMLImageElement) {
  if (collectibles && drawCollectibleSprite(context, collectibles, 2, 0, x - 5 - pulse, y - 5 - pulse, 48 + pulse * 2, 48 + pulse * 2)) return;
  context.fillStyle = "#4b295f";
  context.fillRect(x + 5, y, 28, 38);
  context.fillRect(x, y + 5, 38, 28);
  context.fillStyle = pulse > 0 ? "#ffe875" : "#f5c957";
  context.fillRect(x + 8, y + 4, 22, 30);
  context.fillRect(x + 4, y + 8, 30, 22);
  context.fillStyle = "#b468d1";
  context.fillRect(x + 15, y + 7, 8, 24);
  context.fillRect(x + 8, y + 14, 22, 9);
  context.fillStyle = "#fff8d6";
  context.fillRect(x + 17, y + 11, 4, 16);
  context.fillRect(x + 12, y + 16, 14, 4);
}

function drawRewardBlock(context: CanvasRenderingContext2D, x: number, y: number, hit: boolean, collectibles?: HTMLImageElement) {
  if (collectibles && drawCollectibleSprite(context, collectibles, hit ? 3 : 2, 1, x - 4, y - 4, 56, 56)) return;
  context.fillStyle = "#2c1d38";
  context.fillRect(x - 3, y - 3, 54, 54);
  context.fillStyle = hit ? "#746b7c" : "#5a2e70";
  context.fillRect(x, y, 48, 48);
  context.fillStyle = hit ? "#958c9d" : "#c787e8";
  context.fillRect(x + 5, y + 5, 38, 38);
  context.fillStyle = hit ? "#5e5765" : "#fff0a0";
  context.fillRect(x + 18, y + 12, 12, 12);
  context.fillRect(x + 8, y + 13, 7, 8);
  context.fillRect(x + 33, y + 13, 7, 8);
  context.fillRect(x + 12, y + 27, 24, 11);
  context.fillStyle = hit ? "#bbb2c0" : "#edc6fb";
  context.fillRect(x + 4, y + 4, 8, 5);
}

function drawSecretBlock(context: CanvasRenderingContext2D, x: number, y: number, hit: boolean, secret: HTMLImageElement) {
  if (!hit && drawAtlasCell(context, secret, 2, 2, 1, 0, x - 5, y - 5, 60, 60)) return;
  context.fillStyle = hit ? "#b8acc2" : "#f4c548";
  context.fillRect(x, y, 48, 48);
}

function drawSecretVine(context: CanvasRenderingContext2D, x: number, blockY: number, progress: number, secret: HTMLImageElement) {
  const height = Math.max(1, Math.round((blockY + 80) * progress));
  context.save();
  context.beginPath();
  context.rect(x - 28, blockY - height, 104, height + 10);
  context.clip();
  for (let y = blockY - 115; y > blockY - height - 115; y -= 105) {
    drawAtlasCell(context, secret, 2, 2, 0, 1, x - 27, y, 104, 128);
  }
  context.restore();
}

function drawEnemyWarning(context: CanvasRenderingContext2D, x: number, y: number, kind: "wolf" | "boar") {
  context.fillStyle = kind === "boar" ? "#fff0bd" : "#fff3c4";
  context.fillRect(x - (kind === "boar" ? 5 : 9), y - 35, kind === "boar" ? 72 : 77, 24);
  context.fillStyle = kind === "boar" ? "#4a2b2e" : "#3c294a";
  context.font = "bold 12px monospace";
  context.textAlign = "center";
  context.fillText(kind === "boar" ? "¡OINK!" : "¡AUUU!", x + 30, y - 19);
  context.textAlign = "start";
}

function drawEnemy(context: CanvasRenderingContext2D, enemy: LiveEnemy, cameraX: number, nearby: boolean, raster: RasterAssets) {
  if (!enemy.active) return;
  const x = Math.round(enemy.x - cameraX);
  const y = Math.round(enemyY(enemy));
  if (enemy.kind === "sky-unicorn") {
    const width = 76;
    const height = 64;
    const drawX = x + Math.round((enemy.width - width) / 2);
    const drawY = y + enemy.height - height;
    context.save();
    if (enemy.vx < 0) {
      context.translate(drawX + width, 0);
      context.scale(-1, 1);
      drawAtlasCell(context, raster.secret, 2, 2, 0, 0, 0, drawY, width, height);
    } else {
      drawAtlasCell(context, raster.secret, 2, 2, 0, 0, drawX, drawY, width, height);
    }
    context.restore();
    return;
  }
  if (enemy.kind === "bat") {
    const wingFrame = Math.floor(enemy.phase * 3.2) % 2;
    const width = 62;
    const height = 50;
    const drawX = x + Math.round((enemy.width - width) / 2);
    const drawY = y + enemy.height - height;
    if (raster.cave.complete && raster.cave.naturalWidth) {
      context.save();
      if (enemy.vx < 0) {
        context.translate(drawX + width, 0);
        context.scale(-1, 1);
        drawAtlasCell(context, raster.cave, 4, 2, wingFrame, 1, 0, drawY, width, height);
      } else {
        drawAtlasCell(context, raster.cave, 4, 2, wingFrame, 1, drawX, drawY, width, height);
      }
      context.restore();
    } else {
      context.fillStyle = "#2a193f";
      context.fillRect(x + 12, y + 9, 24, 22);
      context.fillStyle = "#a65ad0";
      context.fillRect(x, y + (wingFrame ? 15 : 4), 16, 12);
      context.fillRect(x + 32, y + (wingFrame ? 15 : 4), 16, 12);
      context.fillStyle = "#ffd66b";
      context.fillRect(x + 18, y + 15, 4, 4);
      context.fillRect(x + 27, y + 15, 4, 4);
    }
    return;
  }
  if (raster.enemies.complete && raster.enemies.naturalWidth) {
    if (nearby && (enemy.kind === "wolf" || enemy.kind === "boar")) drawEnemyWarning(context, x, y, enemy.kind);
    const [column, row] = enemyAtlasCell[enemy.kind];
    const [width, height] = enemyRasterSize[enemy.kind];
    const flyingOffset = enemy.kind === "bird" || enemy.kind === "parrot" ? Math.round(Math.sin(enemy.phase * 4) * 3) : 0;
    const drawX = x + Math.round((enemy.width - width) / 2);
    const drawY = y + enemy.height - height + flyingOffset;
    context.save();
    if (enemy.vx < 0) {
      context.translate(drawX + width, 0);
      context.scale(-1, 1);
      drawEnemyAtlasSprite(context, raster.enemies, column, row, 0, drawY, width, height);
    } else {
      drawEnemyAtlasSprite(context, raster.enemies, column, row, drawX, drawY, width, height);
    }
    context.restore();
    return;
  }
  const flying = enemy.kind === "bird" || enemy.kind === "parrot" || enemy.kind === "cloud";
  if (!flying) {
    context.save();
    context.globalAlpha = 0.18;
    context.fillStyle = "#21162b";
    context.fillRect(x + 5, y + enemy.height - 2, Math.max(30, enemy.width - 10), 6);
    context.restore();
  }
  if (enemy.kind === "slime") {
    context.fillStyle = "#243548";
    context.fillRect(x + 1, y + 8, 40, 31);
    context.fillRect(x + 7, y - 1, 28, 11);
    context.fillStyle = "#77cbe0";
    context.fillRect(x + 4, y + 8, 34, 28);
    context.fillRect(x + 10, y + 2, 22, 8);
    context.fillStyle = "#24445d";
    context.fillRect(x + 11, y + 14, 5, 7);
    context.fillRect(x + 27, y + 14, 5, 7);
    context.fillStyle = "#a7e7ef";
    context.fillRect(x + 8, y + 7, 8, 5);
    context.fillStyle = "#4d9db8";
    context.fillRect(x + 10, y + 31, 23, 5);
    context.fillStyle = "#24445d";
    context.fillRect(x + 18, y + 25, 8, 3);
  } else if (enemy.kind === "beetle") {
    context.fillStyle = "#251c36";
    context.fillRect(x + 1, y + 8, 40, 28);
    context.fillRect(x + 8, y + 2, 28, 8);
    context.fillStyle = "#3b2c58";
    context.fillRect(x + 4, y + 11, 34, 22);
    context.fillStyle = "#f3a557";
    context.fillRect(x + 9, y + 7, 12, 20);
    context.fillRect(x + 22, y + 7, 12, 20);
    context.fillStyle = "#fff5da";
    context.fillRect(x + 8, y + 12, 4, 5);
    context.fillRect(x + 31, y + 12, 4, 5);
    context.fillStyle = "#3b2c58";
    context.fillRect(x, y + 30, 12, 5);
    context.fillRect(x + 31, y + 30, 12, 5);
    context.fillRect(x + 12, y, 4, 9);
    context.fillRect(x + 29, y, 4, 9);
    context.fillStyle = "#ffd17a";
    context.fillRect(x + 13, y + 10, 5, 11);
  } else if (enemy.kind === "cloud") {
    context.fillStyle = "#4c3d6c";
    context.fillRect(x - 2, y + 10, 48, 27);
    context.fillRect(x + 7, y + 1, 30, 31);
    context.fillStyle = "#ece8ff";
    context.fillRect(x + 2, y + 12, 40, 22);
    context.fillRect(x + 10, y + 4, 24, 25);
    context.fillStyle = "#4c3d6c";
    context.fillRect(x + 12, y + 18, 5, 5);
    context.fillRect(x + 29, y + 18, 5, 5);
    context.fillRect(x + 19, y + 27, 9, 3);
    context.fillStyle = "#d9a7c9";
    context.fillRect(x + 6, y + 25, 6, 4);
    context.fillRect(x + 34, y + 25, 6, 4);
  } else if (enemy.kind === "bird") {
    const flapUp = Math.sin(enemy.phase * 2) > 0;
    context.fillStyle = "#21172c";
    context.fillRect(x + 8, y + 7, 34, 23);
    context.fillRect(x + 26, y + 2, 18, 21);
    context.fillStyle = "#3b2948";
    context.fillRect(x + 11, y + 10, 26, 17);
    context.fillRect(x + 28, y + 5, 13, 15);
    context.fillStyle = "#c96f50";
    context.fillRect(x + 15, y + 17, 18, 10);
    context.fillStyle = "#f2c15d";
    context.fillRect(x + 39, y + 11, 7, 5);
    context.fillStyle = "#fff7d6";
    context.fillRect(x + 34, y + 9, 3, 3);
    context.fillStyle = "#24192f";
    context.fillRect(x + 35, y + 9, 2, 2);
    context.fillRect(x + 3, y + 13, 12, 5);
    context.fillRect(x, y + 9, 8, 5);
    context.fillStyle = "#6f456f";
    if (flapUp) {
      context.fillRect(x + 13, y, 9, 14);
      context.fillRect(x + 20, y + 5, 9, 12);
    } else {
      context.fillRect(x + 13, y + 21, 9, 10);
      context.fillRect(x + 20, y + 18, 9, 10);
    }
  } else if (enemy.kind === "parrot") {
    const flapUp = Math.sin(enemy.phase * 2.3) > 0;
    context.fillStyle = "#221832";
    context.fillRect(x + 9, y + 5, 33, 27);
    context.fillRect(x + 18, y + 1, 24, 22);
    context.fillStyle = "#2d3156";
    context.fillRect(x + 12, y + 8, 26, 20);
    context.fillStyle = "#e65362";
    context.fillRect(x + 20, y + 4, 18, 18);
    context.fillStyle = "#ffd45f";
    context.fillRect(x + 36, y + 10, 10, 6);
    context.fillRect(x + 16, y + 22, 16, 7);
    context.fillStyle = "#fff8e9";
    context.fillRect(x + 29, y + 8, 4, 4);
    context.fillStyle = "#251b39";
    context.fillRect(x + 31, y + 9, 2, 2);
    context.fillStyle = "#55b66c";
    if (flapUp) {
      context.fillRect(x + 6, y, 10, 20);
      context.fillRect(x, y + 2, 9, 12);
    } else {
      context.fillRect(x + 6, y + 18, 12, 12);
      context.fillRect(x + 1, y + 24, 9, 8);
    }
    context.fillStyle = "#58bdda";
    context.fillRect(x + 8, y + 25, 8, 7);
    context.fillStyle = "#2d3156";
    context.fillRect(x + 5, y + 30, 5, 13);
    context.fillRect(x + 12, y + 30, 5, 16);
  } else if (enemy.kind === "pirate") {
    context.fillStyle = "#281b33";
    context.fillRect(x + 2, y + 1, 42, 14);
    context.fillRect(x + 8, y + 10, 32, 38);
    context.fillStyle = "#4a294f";
    context.fillRect(x + 5, y + 4, 36, 10);
    context.fillRect(x + 12, y, 23, 8);
    context.fillStyle = "#f3b07e";
    context.fillRect(x + 12, y + 12, 24, 18);
    context.fillStyle = "#2b203a";
    context.fillRect(x + 14, y + 16, 8, 5);
    context.fillRect(x + 18, y + 14, 4, 9);
    context.fillStyle = "#fff3d4";
    context.fillRect(x + 29, y + 17, 4, 4);
    context.fillStyle = "#d9575e";
    context.fillRect(x + 8, y + 29, 30, 16);
    context.fillStyle = "#f6cb58";
    context.fillRect(x + 8, y + 34, 30, 5);
    context.fillStyle = "#382743";
    context.fillRect(x + 6, y + 44, 14, 6);
    context.fillRect(x + 27, y + 44, 14, 6);
    context.fillStyle = "#f3b07e";
    context.fillRect(x, y + 30, 9, 12);
    context.fillRect(x + 38, y + 30, 8, 12);
    context.fillStyle = "#d9575e";
    context.fillRect(x + 1, y + 7, 13, 6);
    context.fillStyle = "#d7d0dc";
    context.fillRect(x + 42, y + 35, 7, 4);
    context.fillRect(x + 47, y + 31, 4, 8);
  } else if (enemy.kind === "boar") {
    if (nearby) {
      context.fillStyle = "#fff0bd";
      context.fillRect(x - 5, y - 34, 72, 23);
      context.fillStyle = "#4a2b2e";
      context.font = "bold 12px monospace";
      context.textAlign = "center";
      context.fillText("¡OINK!", x + 30, y - 18);
      context.textAlign = "start";
    }
    context.fillStyle = "#2d1d24";
    context.fillRect(x + 2, y + 8, 57, 33);
    context.fillRect(x + 12, y, 42, 31);
    context.fillStyle = "#4b2f2b";
    context.fillRect(x + 5, y + 11, 50, 27);
    context.fillRect(x + 15, y + 3, 35, 27);
    context.fillRect(x + 10, y - 2, 12, 13);
    context.fillRect(x + 43, y - 2, 12, 13);
    context.fillStyle = "#986047";
    context.fillRect(x + 19, y + 15, 29, 17);
    context.fillStyle = "#e58c79";
    context.fillRect(x + 24, y + 21, 19, 10);
    context.fillStyle = "#2d1d24";
    context.fillRect(x + 28, y + 24, 4, 4);
    context.fillRect(x + 37, y + 24, 4, 4);
    context.fillRect(x + 20, y + 11, 5, 5);
    context.fillRect(x + 43, y + 11, 5, 5);
    context.fillStyle = "#fff2cf";
    context.fillRect(x + 18, y + 27, 6, 8);
    context.fillRect(x + 44, y + 27, 6, 8);
    context.fillStyle = "#2d1d24";
    context.fillRect(x, y + 36, 18, 6);
    context.fillRect(x + 44, y + 36, 18, 6);
  } else {
    if (nearby) {
      context.fillStyle = "#fff3c4";
      context.fillRect(x - 9, y - 35, 77, 24);
      context.fillStyle = "#3c294a";
      context.font = "bold 12px monospace";
      context.textAlign = "center";
      context.fillText("¡AUUU!", x + 29, y - 19);
      context.textAlign = "start";
    }
    context.fillStyle = "#201a2b";
    context.fillRect(x + 2, y + 8, 53, 32);
    context.fillRect(x + 9, y, 38, 31);
    context.fillStyle = "#312c42";
    context.fillRect(x + 5, y + 11, 47, 26);
    context.fillRect(x + 12, y + 3, 32, 26);
    context.fillRect(x + 8, y - 3, 12, 14);
    context.fillRect(x + 37, y - 3, 12, 14);
    context.fillStyle = "#655d72";
    context.fillRect(x + 15, y + 8, 27, 18);
    context.fillStyle = "#f4cb68";
    context.fillRect(x + 19, y + 13, 5, 5);
    context.fillRect(x + 34, y + 13, 5, 5);
    context.fillStyle = "#201a2b";
    context.fillRect(x + 26, y + 22, 7, 6);
    context.fillRect(x, y + 34, 16, 6);
    context.fillRect(x + 42, y + 34, 16, 6);
  }
}

function drawCannon(context: CanvasRenderingContext2D, cannon: LiveCannon, cameraX: number) {
  const x = Math.round(cannon.x - cameraX);
  const barrelX = cannon.direction === -1 ? x - 13 : x + 22;
  context.fillStyle = "#171421";
  context.fillRect(barrelX - 3, cannon.y, 34, 19);
  context.fillRect(x - 3, cannon.y + 5, 41, 31);
  context.fillStyle = "#2c2638";
  context.fillRect(barrelX, cannon.y + 3, 28, 13);
  context.fillStyle = "#51435c";
  context.fillRect(x, cannon.y + 8, 35, 24);
  context.fillStyle = "#d0934f";
  context.fillRect(x + 3, cannon.y + 25, 12, 12);
  context.fillRect(x + 22, cannon.y + 25, 12, 12);
  context.fillStyle = "#704b37";
  context.fillRect(x + 7, cannon.y + 28, 4, 7);
  context.fillRect(x + 26, cannon.y + 28, 4, 7);
  context.fillStyle = "#171421";
  context.fillRect(cannon.direction === -1 ? barrelX : barrelX + 21, cannon.y + 5, 7, 9);
  context.fillStyle = "#8d7e9b";
  context.fillRect(x + 6, cannon.y + 12, 16, 4);
  if (cannon.cooldown > cannon.interval - 0.18) {
    const smokeX = cannon.direction === -1 ? barrelX - 13 : barrelX + 31;
    context.fillStyle = "rgba(245,240,255,.8)";
    context.fillRect(smokeX, cannon.y - 2, 10, 10);
    context.fillRect(smokeX + cannon.direction * 8, cannon.y - 12, 8, 8);
  }
}

function drawCannonball(context: CanvasRenderingContext2D, ball: Cannonball, cameraX: number) {
  if (!ball.active) return;
  const x = Math.round(ball.x - cameraX);
  const y = Math.round(ball.y);
  context.fillStyle = "#171421";
  context.fillRect(x, y, 24, 24);
  context.fillRect(x - 4, y + 6, 32, 12);
  context.fillStyle = "#81758e";
  context.fillRect(x + 5, y + 4, 7, 6);
  context.fillStyle = "#ffd76a";
  context.fillRect(ball.vx < 0 ? x + 25 : x - 8, y + 8, 8, 8);
}

function drawCheckpoint(context: CanvasRenderingContext2D, worldX: number, cameraX: number, active: boolean) {
  const x = Math.round(worldX - cameraX);
  context.fillStyle = "#f2e4cf";
  context.fillRect(x, 365, 7, 91);
  context.fillStyle = active ? "#bd83e5" : "#b7afaa";
  context.fillRect(x + 7, 370, 48, 30);
  context.fillStyle = active ? "#fff4a5" : "#ded6d1";
  context.fillRect(x + 19, 379, 10, 10);
  if (active) {
    drawTinySparkle(context, x + 49, 359, "#fff2a0");
    context.fillStyle = "#7cc36b";
    context.fillRect(x - 5, 450, 17, 6);
  }
}

function drawCaveEntrance(context: CanvasRenderingContext2D, worldX: number, cameraX: number, cave: HTMLImageElement) {
  const x = Math.round(worldX - cameraX);
  if (x < -190 || x > VIEW_WIDTH + 40) return;
  if (!drawAtlasCell(context, cave, 4, 2, 2, 1, x, 286, 178, 174)) {
    context.fillStyle = "#2a1b40";
    context.fillRect(x, 320, 178, 136);
    context.fillStyle = "#0d0917";
    context.fillRect(x + 42, 350, 94, 106);
  }
}

function drawGoalCat(context: CanvasRenderingContext2D, worldX: number, cameraX: number, finalLevel: boolean, collectibles?: HTMLImageElement, rescueProgress = 0, surfaceY = 456) {
  const x = Math.round(worldX - cameraX);
  const rescued = rescueProgress > 0;
  const catBob = rescued ? Math.round(Math.sin(rescueProgress * 18) * 5) : 0;
  context.fillStyle = "#4a2d46";
  context.fillRect(x + 69, surfaceY - 220, 10, 220);
  context.fillStyle = "#f4db93";
  context.fillRect(x + 72, surfaceY - 215, 4, 207);
  context.fillStyle = "#7b4f94";
  context.fillRect(x + 79, surfaceY - 210, 82, 51);
  context.fillStyle = "#d99df0";
  context.fillRect(x + 84, surfaceY - 205, 72, 41);
  context.fillStyle = "#fff3ad";
  context.fillRect(x + 98, surfaceY - 192, 12, 12);
  context.fillRect(x + 124, surfaceY - 192, 12, 12);
  context.fillStyle = "#6ab86a";
  context.fillRect(x + 59, surfaceY - 6, 31, 6);
  context.fillRect(x + 65, surfaceY - 12, 18, 6);
  const catX = x + 18;
  const catY = surfaceY - 58 + catBob;
  if (collectibles) drawCollectibleSprite(context, collectibles, 3, 0, catX - 8, catY - 15, 64, 64);
  else {
  context.fillStyle = "#352841";
  context.fillRect(catX + 1, catY + 5, 48, 48);
  context.fillRect(catX + 2, catY - 3, 18, 21);
  context.fillRect(catX + 30, catY - 3, 18, 21);
  context.fillStyle = finalLevel ? "#f5d58d" : "#f5f0e9";
  context.fillRect(catX + 4, catY + 8, 42, 42);
  context.fillRect(catX + 5, catY, 14, 18);
  context.fillRect(catX + 31, catY, 14, 18);
  context.fillStyle = "#4b3958";
  context.fillRect(catX + 13, catY + 20, 5, 6);
  context.fillRect(catX + 33, catY + 20, 5, 6);
  context.fillStyle = "#df79a9";
  context.fillRect(catX + 23, catY + 29, 6, 5);
  }
  if (!rescued) return;
  const sparkleSize = 7 + Math.round(Math.min(1, rescueProgress) * 7);
  drawTinySparkle(context, x + 12, surfaceY - 94 - sparkleSize, "#fff0a1");
  drawTinySparkle(context, x + 116, surfaceY - 84 + sparkleSize, "#f2b9ff");
  drawTinySparkle(context, x + 151, surfaceY - 118, "#fff0a1");
  context.save();
  context.globalAlpha = Math.min(1, rescueProgress * 2.4);
  const panelX = Math.round(VIEW_WIDTH / 2 - 195);
  context.fillStyle = "rgba(42, 25, 58, .88)";
  context.fillRect(panelX - 5, 55, 400, 74);
  context.fillStyle = "#fff8e9";
  context.fillRect(panelX, 60, 390, 64);
  context.fillStyle = "#f1d7f7";
  context.fillRect(panelX + 6, 66, 378, 52);
  context.fillStyle = "#6d3e82";
  context.font = "bold 21px monospace";
  context.textAlign = "center";
  context.fillText("¡GATITO RESCATADO!", VIEW_WIDTH / 2, 91);
  context.fillStyle = "#473052";
  context.font = "bold 13px monospace";
  context.fillText("NOA HA ENCONTRADO UN AMIGO", VIEW_WIDTH / 2, 111);
  context.textAlign = "start";
  context.restore();
}

function drawBossGate(context: CanvasRenderingContext2D, worldX: number, cameraX: number) {
  const x = Math.round(worldX - cameraX);
  context.fillStyle = "#24162f";
  context.fillRect(x + 10, 326, 112, 130);
  context.fillStyle = "#6d477e";
  context.fillRect(x, 326, 18, 130);
  context.fillRect(x + 114, 326, 18, 130);
  context.fillRect(x, 314, 132, 22);
  context.fillStyle = "#c78bea";
  context.fillRect(x + 16, 302, 100, 30);
  context.fillStyle = "#fff1a3";
  context.font = "bold 15px monospace";
  context.textAlign = "center";
  context.fillText("DUELO", x + 66, 323);
  context.fillStyle = "#fff3d2";
  context.fillRect(x + 40, 362, 18, 18);
  context.fillRect(x + 73, 362, 18, 18);
  context.fillStyle = "#d85e73";
  context.fillRect(x + 56, 397, 20, 12);
  context.fillStyle = "#b783d3";
  for (let brick = 0; brick < 4; brick += 1) {
    context.fillRect(x + 3, 340 + brick * 25, 12, 8);
    context.fillRect(x + 117, 350 + brick * 23, 12, 8);
  }
  drawTinySparkle(context, x + 60, 344, "#fff0a1");
  context.textAlign = "start";
}

function createInitialPlayer(level: Level): Player {
  return {
    x: level.start.x,
    y: level.start.y,
    width: 42,
    height: 58,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    power: "normal",
    invincible: 0,
    coyote: 0,
    jumpBuffer: 0,
    jumpsUsed: 0,
    doubleJumpFx: 0,
  };
}

function drawDoubleJumpTip(context: CanvasRenderingContext2D) {
  const x = 238;
  const y = 48;
  const width = 484;
  const height = 82;
  context.fillStyle = "#352044";
  context.fillRect(x - 5, y - 5, width + 10, height + 10);
  context.fillStyle = "#fff8e9";
  context.fillRect(x, y, width, height);
  context.fillStyle = "#f0ddf7";
  context.fillRect(x + 7, y + 7, width - 14, height - 14);
  context.fillStyle = "#6f3c86";
  context.font = "bold 17px monospace";
  context.textAlign = "center";
  context.fillText("¡PRUEBA EL DOBLE SALTO!", x + width / 2, y + 29);
  context.fillStyle = "#352044";
  context.font = "bold 14px monospace";
  context.fillText("TOCA SALTAR  ↑   Y EN EL AIRE  ↑  OTRA VEZ", x + width / 2, y + 58);
  context.textAlign = "start";
}

export function GameCanvas({ level, running, onLoseLife, onComplete, onBossEncounter, onSecretExit, onSnapshot, playSound }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, jump: false, shoot: false, jumpQueued: false, shootQueued: false });
  const heldKeysRef = useRef(new Set<string>());
  const touchPointersRef = useRef<Partial<Record<TouchKey, number>>>({});
  const runningRef = useRef(running);
  const callbacksRef = useRef({ onLoseLife, onComplete, onBossEncounter, onSecretExit, onSnapshot, playSound });

  useEffect(() => {
    callbacksRef.current = { onLoseLife, onComplete, onBossEncounter, onSecretExit, onSnapshot, playSound };
  }, [onLoseLife, onComplete, onBossEncounter, onSecretExit, onSnapshot, playSound]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const input = inputRef.current;
    const heldKeys = heldKeysRef.current;
    const syncKeyboardDirections = () => {
      input.left = heldKeys.has("ArrowLeft") || heldKeys.has("KeyA") || touchPointersRef.current.left !== undefined;
      input.right = heldKeys.has("ArrowRight") || heldKeys.has("KeyD") || touchPointersRef.current.right !== undefined;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
      heldKeys.add(event.code);
      syncKeyboardDirections();
      if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") {
        if (!input.jump) input.jumpQueued = true;
        input.jump = true;
      }
      if (event.code === "KeyX" || event.code === "KeyK") {
        if (!input.shoot) input.shootQueued = true;
        input.shoot = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      heldKeys.delete(event.code);
      syncKeyboardDirections();
      if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") {
        input.jump = heldKeys.has("ArrowUp") || heldKeys.has("KeyW") || heldKeys.has("Space") || touchPointersRef.current.jump !== undefined;
      }
      if (event.code === "KeyX" || event.code === "KeyK") {
        input.shoot = heldKeys.has("KeyX") || heldKeys.has("KeyK") || touchPointersRef.current.shoot !== undefined;
      }
    };
    const clear = () => {
      heldKeys.clear();
      touchPointersRef.current = {};
      Object.assign(input, { left: false, right: false, jump: false, shoot: false, jumpQueued: false, shootQueued: false });
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;

    const sprite = new Image();
    sprite.src = "./assets/sprites/noa-sprite-sheet.png";
    const catJumpSprite = new Image();
    catJumpSprite.src = "./assets/sprites/noa-cat-jump-v2.png";
    const catYarnSprite = new Image();
    catYarnSprite.src = "./assets/sprites/noa-cat-yarn-v2.png";
    const catRunSprite = new Image();
    catRunSprite.src = "./assets/sprites/noa-cat-run-v2.png";
    const jumpSprite = new Image();
    jumpSprite.src = "./assets/sprites/noa-jump-v2.png";
    const raster: RasterAssets = {
      enemies: createRasterImage("./assets/atlases/enemies-v1.png"),
      collectibles: createRasterImage("./assets/atlases/collectibles-v1.png"),
      cave: createRasterImage("./assets/atlases/cave-v1.png"),
      secret: createRasterImage("./assets/atlases/secret-sky-v1.png"),
      tiles: {
        1: createRasterImage("./assets/atlases/world-1-tiles-v1.png"),
        2: createRasterImage("./assets/atlases/world-2-tiles-v1.png"),
        3: createRasterImage("./assets/atlases/world-3-tiles-v1.png"),
        4: createRasterImage("./assets/atlases/world-4-tiles-v1.png"),
        5: createRasterImage("./assets/atlases/world-5-tiles-v1.png"),
        6: createRasterImage("./assets/atlases/secret-sky-v1.png"),
      },
    };
    const player = createInitialPlayer(level);
    let enemies: LiveEnemy[] = level.enemies.map((item, index) => ({ ...item, vx: item.speed, active: true, phase: index }));
    const items: LiveItem[] = level.items.map((item) => ({ ...item, age: 99, rise: 1, fromBlock: false }));
    const collected = new Set<string>();
    const collectedStickers = new Set<string>();
    const warnedEnemies = new Set<string>();
    const hitBlocks = new Set<string>();
    const projectiles: Projectile[] = [];
    const bursts: PixelBurst[] = [];
    const cannons: LiveCannon[] = (level.cannons ?? []).map((item, index) => ({ ...item, cooldown: 0.8 + index * 0.22 }));
    const cannonballs: Cannonball[] = [];
    const goalSurfaceY = level.platforms.find((platform) => level.goalX >= platform.x && level.goalX <= platform.x + platform.width)?.y ?? 456;
    let cameraX = 0;
    let apples = 0;
    let checkpointIndex = -1;
    let respawnX = level.start.x;
    let previousJump = false;
    let previousShoot = false;
    let shootCooldown = 0;
    let completed = false;
    let frame = 0;
    let lastTime = performance.now();
    let lastSnapshot = 0;
    let animationId = 0;
    let completeTimer = 0;
    let vineStartedFrame = -1;
    let goalCelebrationFrame = -1;

    const respawn = () => {
      player.x = respawnX;
      player.y = level.start.y;
      player.vx = 0;
      player.vy = 0;
      player.power = "normal";
      player.invincible = 1.4;
      player.jumpsUsed = 0;
      player.doubleJumpFx = 0;
      projectiles.length = 0;
      cannonballs.length = 0;
      callbacksRef.current.onLoseLife();
    };

    const hurt = () => {
      if (player.invincible > 0) return;
      callbacksRef.current.playSound("hurt");
      bursts.push({ x: player.x + player.width / 2, y: player.y + 22, life: 0.45, color: "#ff8b9d", kind: "stars" });
      if (player.power === "cat") {
        player.power = "apple";
        player.invincible = 1.8;
        player.vy = -300;
      } else if (player.power === "apple") {
        player.power = "normal";
        player.invincible = 1.8;
        player.vy = -300;
      } else {
        respawn();
      }
    };

    const update = (delta: number, now: number) => {
      const input = inputRef.current;
      const gamepads = navigator.getGamepads?.() ?? [];
      const pad = gamepads[0];
      const left = input.left || Boolean(pad && pad.axes[0] < -0.25);
      const right = input.right || Boolean(pad && pad.axes[0] > 0.25);
      const jump = input.jump || Boolean(pad?.buttons[0]?.pressed);
      const shoot = input.shoot || Boolean(pad?.buttons[2]?.pressed || pad?.buttons[1]?.pressed);

      if (left === right) player.vx *= Math.pow(0.0008, delta);
      else {
        player.vx = (left ? -1 : 1) * MOVE_SPEED;
        player.facing = left ? -1 : 1;
      }

      if (input.jumpQueued || (jump && !previousJump)) player.jumpBuffer = 0.13;
      input.jumpQueued = false;
      previousJump = jump;
      player.jumpBuffer = Math.max(0, player.jumpBuffer - delta);
      player.coyote = player.grounded ? 0.12 : Math.max(0, player.coyote - delta);
      if (player.jumpBuffer > 0 && player.coyote > 0 && player.jumpsUsed === 0) {
        player.vy = -JUMP_SPEED;
        player.grounded = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
        player.jumpsUsed = 1;
        callbacksRef.current.playSound("jump");
      } else if (player.jumpBuffer > 0 && !player.grounded && player.jumpsUsed === 1) {
        player.vy = -JUMP_SPEED * 0.94;
        player.jumpBuffer = 0;
        player.jumpsUsed = 2;
        player.doubleJumpFx = 0.38;
        callbacksRef.current.playSound("jump");
      }
      if (!jump && player.vy < -220) player.vy += GRAVITY * 1.4 * delta;

      shootCooldown = Math.max(0, shootCooldown - delta);
      if ((input.shootQueued || (shoot && !previousShoot)) && player.power === "cat" && shootCooldown === 0) {
        projectiles.push({
          x: player.x + player.width / 2 + player.facing * 20,
          y: player.y + 24,
          vx: player.facing * 430,
          vy: -45,
          life: 2.2,
        });
        shootCooldown = 0.35;
        callbacksRef.current.playSound("yarn");
      }
      input.shootQueued = false;
      previousShoot = shoot;

      const previousX = player.x;
      player.x += player.vx * delta;
      player.x = Math.max(0, Math.min(level.width - player.width, player.x));
      for (const platform of level.platforms) {
        if (platform.kind !== "cave-wall") continue;
        const vertical = player.y + player.height > platform.y && player.y < platform.y + platform.height;
        if (!vertical) continue;
        if (player.vx > 0 && previousX + player.width <= platform.x && player.x + player.width > platform.x) {
          player.x = platform.x - player.width;
          player.vx = 0;
        } else if (player.vx < 0 && previousX >= platform.x + platform.width && player.x < platform.x + platform.width) {
          player.x = platform.x + platform.width;
          player.vx = 0;
        }
      }
      const previousY = player.y;
      const previousBottom = previousY + player.height;
      player.vy += GRAVITY * delta;
      player.y += player.vy * delta;
      player.grounded = false;

      for (const platform of level.platforms) {
        const horizontal = player.x + player.width > platform.x && player.x < platform.x + platform.width;
        if (horizontal && player.vy >= 0 && previousBottom <= platform.y + 10 && player.y + player.height >= platform.y) {
          player.y = platform.y - player.height;
          if (platform.kind === "spring") {
            player.vy = -JUMP_SPEED * 1.12;
            player.grounded = false;
            player.jumpsUsed = 1;
            player.doubleJumpFx = 0.32;
            callbacksRef.current.playSound("jump");
          } else {
            player.vy = 0;
            player.grounded = true;
            player.jumpsUsed = 0;
          }
        } else if (platform.kind === "cave-wall" && horizontal && player.vy < 0) {
          const platformBottom = platform.y + platform.height;
          if (previousY >= platformBottom - 10 && player.y <= platformBottom) {
            player.y = platformBottom;
            player.vy = 0;
          }
        }
      }

      for (const block of level.rewardBlocks) {
        const horizontal = player.x + player.width > block.x && player.x < block.x + 48;
        if (!horizontal) continue;
        if (player.vy >= 0 && previousBottom <= block.y + 10 && player.y + player.height >= block.y) {
          player.y = block.y - player.height;
          player.vy = 0;
          player.grounded = true;
          player.jumpsUsed = 0;
        } else if (player.vy < 0 && previousY >= block.y + 40 && player.y <= block.y + 48) {
          player.y = block.y + 48;
          player.vy = 95;
          if (!hitBlocks.has(block.id)) {
            hitBlocks.add(block.id);
            callbacksRef.current.playSound("block");
            if (block.reward === "secret-vine") {
              completed = true;
              vineStartedFrame = frame;
              player.vx = 0;
              callbacksRef.current.playSound("checkpoint");
              completeTimer = window.setTimeout(() => callbacksRef.current.onSecretExit(), 1500);
            } else {
              items.push({ id: `${block.id}-reward`, kind: block.reward, x: block.x + 4, y: block.y - 42, age: 0, rise: 0, fromBlock: true });
            }
          }
        }
      }

      if (player.y > VIEW_HEIGHT + 120) {
        callbacksRef.current.playSound("hurt");
        respawn();
      }

      for (const item of items) {
        if (collected.has(item.id)) continue;
        item.age += delta;
        item.rise = Math.min(1, item.rise + delta * 2.8);
        if (item.fromBlock && item.age > 0.9 && item.rise === 1 && item.y < 410) {
          item.x += delta * 42;
          item.y = Math.min(410, item.y + delta * 115);
        }
        if (item.rise < 0.72) continue;
        const itemY = item.y + (1 - item.rise) * 48;
        const box = { x: item.x, y: itemY, width: 40, height: 40 };
        if (!intersects(player, box)) continue;
        collected.add(item.id);
        if (item.kind === "apple") {
          apples += 1;
          if (player.power === "normal") player.power = "apple";
          callbacksRef.current.playSound("apple");
        } else if (item.kind === "cat") {
          player.power = "cat";
          callbacksRef.current.playSound("cat");
        } else {
          collectedStickers.add(item.id);
          callbacksRef.current.playSound("sticker");
        }
      }

      enemies.forEach((enemy) => {
        if (!enemy.active) return;
        enemy.phase += delta * 2.4;
        enemy.x += enemy.vx * delta;
        const enemyDistance = Math.abs(player.x - enemy.x);
        if ((enemy.kind === "wolf" || enemy.kind === "boar") && enemyDistance < 340 && !warnedEnemies.has(enemy.id)) {
          warnedEnemies.add(enemy.id);
          callbacksRef.current.playSound(enemy.kind === "boar" ? "snort" : "howl");
        }
        if (enemy.kind === "boar" && enemyDistance < 310) {
          enemy.vx = (player.x < enemy.x ? -1 : 1) * Math.max(82, Math.abs(enemy.vx));
        }
        if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
          enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
          enemy.vx *= -1;
        }
        const hitbox = {
          x: enemy.x,
          y: enemyY(enemy),
          width: enemy.width,
          height: enemy.height,
        };
        if (!intersects(player, hitbox)) return;
        if (player.vy > 60 && previousBottom <= hitbox.y + 15) {
          enemy.active = false;
          player.vy = -390;
          player.jumpsUsed = 1;
          bursts.push({ x: enemy.x + enemy.width / 2, y: hitbox.y + 8, life: 0.5, color: "#ffe477", kind: "stars" });
          callbacksRef.current.playSound("stomp");
        } else {
          hurt();
        }
      });

      cannons.forEach((cannon) => {
        cannon.cooldown -= delta;
        if (cannon.cooldown > 0 || Math.abs(player.x - cannon.x) > 900) return;
        cannonballs.push({
          x: cannon.x + (cannon.direction === -1 ? -24 : 38),
          y: cannon.y + 4,
          vx: cannon.direction * (205 + level.screen * 14),
          active: true,
        });
        cannon.cooldown = cannon.interval;
        callbacksRef.current.playSound("cannon");
      });

      cannonballs.forEach((ball) => {
        if (!ball.active) return;
        ball.x += ball.vx * delta;
        if (ball.x < -80 || ball.x > level.width + 80) {
          ball.active = false;
          return;
        }
        const hitbox = { x: ball.x, y: ball.y, width: 24, height: 24 };
        if (!intersects(player, hitbox)) return;
        ball.active = false;
        if (player.vy > 60 && previousBottom <= hitbox.y + 12) {
          player.vy = -360;
          player.jumpsUsed = 1;
          bursts.push({ x: ball.x + 12, y: ball.y + 12, life: 0.45, color: "#ffe477", kind: "puff" });
          callbacksRef.current.playSound("stomp");
        } else {
          hurt();
        }
      });

      projectiles.forEach((ball) => {
        ball.x += ball.vx * delta;
        ball.y += ball.vy * delta;
        ball.vy += 120 * delta;
        ball.life -= delta;
        enemies.forEach((enemy) => {
          if (!enemy.active) return;
          const enemyHitbox = { ...enemy, y: enemyY(enemy) };
          if (intersects({ x: ball.x - 10, y: ball.y - 10, width: 20, height: 20 }, enemyHitbox)) {
            enemy.active = false;
            ball.life = 0;
            bursts.push({ x: enemy.x + enemy.width / 2, y: enemyHitbox.y + 10, life: 0.5, color: "#dca0f1", kind: "stars" });
            callbacksRef.current.playSound("stomp");
          }
        });
        cannonballs.forEach((cannonball) => {
          if (!cannonball.active) return;
          if (intersects({ x: ball.x - 10, y: ball.y - 10, width: 20, height: 20 }, { x: cannonball.x, y: cannonball.y, width: 24, height: 24 })) {
            cannonball.active = false;
            ball.life = 0;
            bursts.push({ x: cannonball.x + 12, y: cannonball.y + 12, life: 0.45, color: "#eef1ff", kind: "puff" });
            callbacksRef.current.playSound("stomp");
          }
        });
      });
      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        if (projectiles[index].life <= 0) projectiles.splice(index, 1);
      }
      for (let index = cannonballs.length - 1; index >= 0; index -= 1) {
        if (!cannonballs[index].active) cannonballs.splice(index, 1);
      }
      for (let index = bursts.length - 1; index >= 0; index -= 1) {
        bursts[index].life -= delta;
        if (bursts[index].life <= 0) bursts.splice(index, 1);
      }

      level.checkpoints.forEach((checkpoint, index) => {
        if (index > checkpointIndex && player.x >= checkpoint) {
          checkpointIndex = index;
          respawnX = checkpoint + 22;
          callbacksRef.current.playSound("checkpoint");
        }
      });

      if (!completed && player.x + player.width >= level.goalX) {
        completed = true;
        goalCelebrationFrame = frame;
        player.x = level.goalX - 48;
        player.y = goalSurfaceY - player.height;
        player.vx = 0;
        player.vy = 0;
        player.grounded = true;
        player.jumpsUsed = 0;
        player.facing = 1;
        callbacksRef.current.playSound("goal");
        completeTimer = window.setTimeout(
          () => level.boss ? callbacksRef.current.onBossEncounter() : callbacksRef.current.onComplete(),
          level.boss ? 850 : 1450,
        );
      }

      player.invincible = Math.max(0, player.invincible - delta);
      player.doubleJumpFx = Math.max(0, player.doubleJumpFx - delta);
      cameraX += (Math.max(0, Math.min(level.width - VIEW_WIDTH, player.x - 330)) - cameraX) * Math.min(1, delta * 5);

      if (now - lastSnapshot > 130) {
        callbacksRef.current.onSnapshot({ apples, stickers: [...collectedStickers], power: player.power, checkpoint: checkpointIndex + 1, paused: !runningRef.current });
        lastSnapshot = now;
      }
    };

    const drawPlayer = () => {
      const x = Math.round(player.x - cameraX);
      const runningFrame = Math.floor(frame / 12) % 4;
      let row = 0;
      let column = 0;
      if (player.power === "cat") {
        row = 3;
        column = player.grounded ? (Math.abs(player.vx) > 25 ? runningFrame % 2 : 0) : 2;
      } else if (!player.grounded) {
        row = 2;
        column = player.vy < 0 ? 0 : 1;
      } else if (Math.abs(player.vx) > 25) {
        row = 1;
        column = runningFrame;
      }
      const flashing = player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0;
      if (flashing) context.globalAlpha = 0.38;
      const usesCatYarnSprite = player.power === "cat" && player.grounded && Math.abs(player.vx) <= 25;
      const usesCatRunSprite = player.power === "cat" && player.grounded && Math.abs(player.vx) > 25;
      const usesCleanCatJump = player.power === "cat" && !player.grounded;
      const usesCleanJump = player.power !== "cat" && !player.grounded;
      const activeSprite = usesCatYarnSprite ? catYarnSprite : usesCatRunSprite ? catRunSprite : usesCleanCatJump ? catJumpSprite : usesCleanJump ? jumpSprite : sprite;
      if (activeSprite.complete && activeSprite.naturalWidth) {
        const cellWidth = sprite.naturalWidth / 4;
        const cellHeight = sprite.naturalHeight / 4;
        const insetX = row === 3 ? 0 : 14;
        // Las tres primeras filas comparten bordes muy juntos. La fila de gata,
        // en cambio, empieza con las orejas pegadas arriba: no la recortamos.
        const rowInsetTop = [10, 14, 18, 0][row];
        const rowInsetBottom = [14, 16, 20, 0][row];
        context.save();
        if (player.facing === -1) {
          context.translate(x + player.width / 2, 0);
          context.scale(-1, 1);
          context.translate(-(x + player.width / 2), 0);
        }
        if (usesCatYarnSprite) {
          // Sprite independiente con transparencia: se conservan las orejas,
          // la bola de lana y la punta de la cola.
          context.drawImage(catYarnSprite, x - 64, Math.round(player.y - 61), 165, 130);
        } else if (usesCatRunSprite) {
          // Al correr, Noa gata usa una pose propia y un pequeño balanceo de
          // pasos, sin volver a la hoja de sprites que cortaba las orejas.
          const stepBob = runningFrame % 2 === 0 ? 0 : 2;
          context.drawImage(catRunSprite, x - 65, Math.round(player.y - 54 + stepBob), 170, 125);
        } else if (usesCleanCatJump) {
          // El PNG de salto incluye margen transparente para que no se corten
          // orejas ni cola. Lo ampliamos para conservar el tamaño de Noa.
          context.drawImage(catJumpSprite, x - 48, Math.round(player.y - 45), 140, 140);
        } else if (usesCleanJump) {
          // La pose de salto normal también vive fuera de la hoja para que el
          // pelo no quede recortado al cruzar el borde de su celda.
          context.drawImage(jumpSprite, x - 50, Math.round(player.y - 37), 145, 125);
        } else {
          context.drawImage(
            sprite,
            column * cellWidth + insetX,
            row * cellHeight + rowInsetTop,
            cellWidth - insetX * 2,
            cellHeight - rowInsetTop - rowInsetBottom,
            x - 29,
            Math.round(player.y - 25),
            100,
            100,
          );
        }
        context.restore();
      } else {
        context.fillStyle = "#aa6bd5";
        context.fillRect(x, player.y, player.width, player.height);
      }
      if (player.doubleJumpFx > 0) {
        const sparkle = Math.floor(player.doubleJumpFx * 40) % 2 === 0 ? "#fff3a5" : "#c987e8";
        context.fillStyle = sparkle;
        context.fillRect(x - 8, Math.round(player.y + 18), 7, 7);
        context.fillRect(x + player.width + 4, Math.round(player.y + 31), 6, 6);
        context.fillRect(x + 8, Math.round(player.y + player.height + 4), 5, 5);
      }
      if (player.grounded && Math.abs(player.vx) > 60 && frame % 8 < 3) {
        context.fillStyle = "rgba(255,244,214,.62)";
        const dustX = player.facing === 1 ? x - 7 : x + player.width + 2;
        context.fillRect(dustX, Math.round(player.y + player.height - 7), 8, 6);
        context.fillRect(dustX + (player.facing === 1 ? -5 : 5), Math.round(player.y + player.height - 13), 5, 5);
      }
      context.globalAlpha = 1;
    };

    const render = () => {
      drawBackground(context, level, cameraX, frame, raster);
      level.platforms.forEach((platform) => drawPlatform(context, platform, cameraX, level.world, player.x, frame, raster));
      if (level.id === "2-1") drawCaveEntrance(context, level.goalX - 125, cameraX, raster.cave);
      if (level.id === "2-2") drawCaveEntrance(context, -18, cameraX, raster.cave);
      level.checkpoints.forEach((checkpoint, index) => drawCheckpoint(context, checkpoint, cameraX, index <= checkpointIndex));
      level.rewardBlocks.forEach((block) => {
        const x = Math.round(block.x - cameraX);
        if (block.reward === "secret-vine") {
          drawSecretBlock(context, x, block.y, hitBlocks.has(block.id), raster.secret);
          if (hitBlocks.has(block.id)) drawSecretVine(context, x, block.y, Math.min(1, (frame - vineStartedFrame) / 70), raster.secret);
        } else {
          drawRewardBlock(context, x, block.y, hitBlocks.has(block.id), raster.collectibles);
        }
        if (!hitBlocks.has(block.id) && Math.abs(player.x - block.x) < 230) {
          context.fillStyle = "#fff8d6";
          context.fillRect(x - 66, block.y - 35, 180, 24);
          context.fillStyle = "#4b295f";
          context.font = "bold 12px monospace";
          context.textAlign = "center";
          context.fillText(block.reward === "secret-vine" ? "¿QUÉ ESCONDE ESTE BLOQUE?" : "¡SALTA BAJO EL GATITO!", x + 24, block.y - 19);
          context.textAlign = "start";
        }
      });
      cannons.forEach((cannon) => drawCannon(context, cannon, cameraX));
      items.forEach((item) => {
        if (collected.has(item.id)) return;
        const x = Math.round(item.x - cameraX);
        const y = item.y + (1 - item.rise) * 48;
        const bob = Math.round(Math.sin(frame * 0.08 + item.x) * 4);
        if (item.kind === "apple") drawApple(context, x + 4, y + bob, raster.collectibles);
        else if (item.kind === "cat") drawCatPower(context, x, y + bob, raster.collectibles);
        else drawSticker(context, x, y + bob, Math.floor(frame / 12) % 2, raster.collectibles);
      });
      enemies.forEach((enemy) => drawEnemy(context, enemy, cameraX, (enemy.kind === "wolf" || enemy.kind === "boar") && Math.abs(player.x - enemy.x) < 360, raster));
      cannonballs.forEach((ball) => drawCannonball(context, ball, cameraX));
      projectiles.forEach((ball) => {
        const x = Math.round(ball.x - cameraX);
        context.fillStyle = "#4b295f";
        context.fillRect(x - 11, Math.round(ball.y) - 11, 22, 22);
        context.fillStyle = "#c78bea";
        context.fillRect(x - 8, Math.round(ball.y) - 8, 16, 16);
        context.fillStyle = "#eee0ff";
        context.fillRect(x - 5, Math.round(ball.y) - 4, 10, 3);
      });
      bursts.forEach((burst) => {
        const x = Math.round(burst.x - cameraX);
        const spread = Math.round((0.5 - burst.life) * 46);
        context.save();
        context.globalAlpha = Math.min(1, burst.life * 3);
        if (burst.kind === "stars") {
          drawTinySparkle(context, x - spread, burst.y - spread * 0.6, burst.color);
          drawTinySparkle(context, x + spread, burst.y - spread * 0.25, burst.color);
          drawTinySparkle(context, x - spread * 0.35, burst.y + spread * 0.45, "#fff7d1");
        } else {
          context.fillStyle = burst.color;
          context.fillRect(x - spread, burst.y - 6, 12, 10);
          context.fillRect(x + spread - 10, burst.y - spread * 0.4, 10, 10);
        }
        context.restore();
      });
      if (level.boss) drawBossGate(context, level.goalX, cameraX);
      else drawGoalCat(context, level.goalX, cameraX, false, raster.collectibles, goalCelebrationFrame < 0 ? 0 : Math.min(1, (frame - goalCelebrationFrame) / 22), goalSurfaceY);
      drawPlayer();
      drawAmbientForeground(context, level, cameraX, frame);
      if (level.id === "1-1" && player.x >= 130 && player.x < 1120) drawDoubleJumpTip(context);

      if (!runningRef.current) {
        context.fillStyle = "rgba(34, 24, 57, 0.42)";
        context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      }
    };

    const loop = (now: number) => {
      const delta = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;
      if (runningRef.current && !completed) update(delta, now);
      frame += 1;
      render();
      animationId = requestAnimationFrame(loop);
    };

    enemies = enemies.map((enemy) => ({ ...enemy }));
    animationId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationId);
      window.clearTimeout(completeTimer);
    };
  }, [level]);

  const keyboardKeepsPressed = (key: TouchKey) => key === "left"
    ? heldKeysRef.current.has("ArrowLeft") || heldKeysRef.current.has("KeyA")
    : key === "right"
      ? heldKeysRef.current.has("ArrowRight") || heldKeysRef.current.has("KeyD")
      : key === "jump"
        ? heldKeysRef.current.has("ArrowUp") || heldKeysRef.current.has("KeyW") || heldKeysRef.current.has("Space")
        : heldKeysRef.current.has("KeyX") || heldKeysRef.current.has("KeyK");

  const handleTouchStart = (key: TouchKey, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (touchPointersRef.current[key] !== undefined) return;
    touchPointersRef.current[key] = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Algunos navegadores móviles no permiten capturar dos botones a la vez.
    }
    inputRef.current[key] = true;
    if (key === "jump") inputRef.current.jumpQueued = true;
    if (key === "shoot") inputRef.current.shootQueued = true;
  };

  const handleTouchEnd = (key: TouchKey, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (touchPointersRef.current[key] !== event.pointerId) return;
    delete touchPointersRef.current[key];
    inputRef.current[key] = keyboardKeepsPressed(key);
  };

  const handleTouchCancel = (key: TouchKey, event: React.PointerEvent<HTMLButtonElement>) => {
    if (touchPointersRef.current[key] !== event.pointerId) return;
    delete touchPointersRef.current[key];
    inputRef.current[key] = keyboardKeepsPressed(key);
  };

  const preventTouchMenu = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();

  return (
    <div className="game-frame">
      <div className="game-stage">
        <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} aria-label={`Pantalla ${level.id}: ${level.title}`} />
      </div>
      <div className="touch-controls" aria-label="Controles táctiles">
        <div className="touch-group touch-move">
          <button type="button" className="touch-button touch-direction" aria-label="Mover a la izquierda" onPointerDown={(event) => handleTouchStart("left", event)} onPointerUp={(event) => handleTouchEnd("left", event)} onPointerCancel={(event) => handleTouchCancel("left", event)} onLostPointerCapture={(event) => handleTouchCancel("left", event)} onContextMenu={preventTouchMenu}><span>◀</span><small>IZQ.</small></button>
          <button type="button" className="touch-button touch-direction" aria-label="Mover a la derecha" onPointerDown={(event) => handleTouchStart("right", event)} onPointerUp={(event) => handleTouchEnd("right", event)} onPointerCancel={(event) => handleTouchCancel("right", event)} onLostPointerCapture={(event) => handleTouchCancel("right", event)} onContextMenu={preventTouchMenu}><span>▶</span><small>DER.</small></button>
        </div>
        <div className="touch-group touch-actions">
          <button type="button" className="touch-button touch-yarn" aria-label="Lanzar bola de lana" onPointerDown={(event) => handleTouchStart("shoot", event)} onPointerUp={(event) => handleTouchEnd("shoot", event)} onPointerCancel={(event) => handleTouchCancel("shoot", event)} onLostPointerCapture={(event) => handleTouchCancel("shoot", event)} onContextMenu={preventTouchMenu}><PixelIcon kind="yarn" /><small>LANA</small></button>
          <button type="button" className="touch-button touch-jump" aria-label="Saltar; vuelve a tocar para hacer doble salto" onPointerDown={(event) => handleTouchStart("jump", event)} onPointerUp={(event) => handleTouchEnd("jump", event)} onPointerCancel={(event) => handleTouchCancel("jump", event)} onLostPointerCapture={(event) => handleTouchCancel("jump", event)} onContextMenu={preventTouchMenu}><span className="touch-jump-arrows">↑<i>↑</i></span><small>SALTAR</small></button>
        </div>
      </div>
    </div>
  );
}

export type { SoundKind };
