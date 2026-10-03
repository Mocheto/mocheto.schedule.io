import { useEffect, useRef } from "react";
import type { Level, GameSnapshot, Power, Rect } from "./types";

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const GRAVITY = 1650;
const MOVE_SPEED = 250;
const JUMP_SPEED = 625;

type SoundKind = "apple" | "cat" | "jump" | "hurt" | "stomp" | "yarn" | "checkpoint" | "goal";

type GameCanvasProps = {
  level: Level;
  running: boolean;
  onLoseLife: () => void;
  onComplete: () => void;
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

type Player = Rect & {
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 1 | -1;
  power: Power;
  invincible: number;
  coyote: number;
  jumpBuffer: number;
};

type LiveEnemy = Level["enemies"][number] & { vx: number; active: boolean; phase: number };
type Projectile = { x: number; y: number; vx: number; vy: number; life: number };

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const drawPixelCloud = (context: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y + 12), 88, 22);
  context.fillRect(Math.round(x + 16), Math.round(y), 34, 32);
  context.fillRect(Math.round(x + 50), Math.round(y + 6), 24, 28);
};

function drawBackground(context: CanvasRenderingContext2D, level: Level, cameraX: number) {
  const night = level.theme === "forest-night";
  const forest = level.world === 2;
  const sunset = level.theme === "orchard-sunset" || level.theme === "forest-dusk";
  const sky = night ? "#24204f" : sunset ? "#f7a873" : "#91dcf4";
  context.fillStyle = sky;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (night) {
    context.fillStyle = "#fff4b8";
    context.fillRect(785, 55, 76, 76);
    context.fillStyle = sky;
    context.fillRect(760, 42, 63, 63);
    context.fillStyle = "#f5dfff";
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 157 + 43) % VIEW_WIDTH;
      const y = 28 + ((index * 61) % 180);
      context.fillRect(x, y, index % 3 === 0 ? 4 : 2, index % 3 === 0 ? 4 : 2);
    }
  } else {
    context.fillStyle = sunset ? "#fff0b5" : "#ffe36f";
    context.fillRect(765, 54, 70, 70);
  }

  const cloudColor = night ? "#5c548c" : sunset ? "#ffe0cf" : "#f8fdff";
  for (let index = 0; index < 7; index += 1) {
    const x = index * 310 - ((cameraX * 0.12) % 310) - 90;
    drawPixelCloud(context, x, 72 + (index % 3) * 48, cloudColor);
  }

  const farColor = forest ? (night ? "#342c5f" : "#5d617b") : sunset ? "#c86d68" : "#6db6b1";
  context.fillStyle = farColor;
  context.beginPath();
  context.moveTo(0, 390);
  for (let x = 0; x <= VIEW_WIDTH + 100; x += 100) {
    const worldX = x + cameraX * 0.22;
    const y = 300 + ((Math.floor(worldX / 100) % 3) * 23);
    context.lineTo(x, y);
  }
  context.lineTo(VIEW_WIDTH, 480);
  context.lineTo(0, 480);
  context.closePath();
  context.fill();

  const treeSpacing = forest ? 155 : 220;
  const firstTree = Math.floor((cameraX * 0.45) / treeSpacing) - 1;
  for (let index = firstTree; index < firstTree + 9; index += 1) {
    const x = index * treeSpacing - cameraX * 0.45;
    const tall = 118 + ((index * 19) % 42);
    context.fillStyle = night ? "#281c49" : forest ? "#3d665e" : "#725039";
    context.fillRect(Math.round(x + 64), 430 - tall, 28, tall);
    context.fillStyle = night ? "#40366d" : forest ? "#477d68" : "#4d9b63";
    context.fillRect(Math.round(x + 18), 290 - (index % 2) * 18, 118, 76);
    context.fillRect(Math.round(x), 325 - (index % 2) * 18, 155, 62);
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
}

function drawPlatform(context: CanvasRenderingContext2D, platform: Level["platforms"][number], cameraX: number, forest: boolean) {
  const x = Math.round(platform.x - cameraX);
  if (x + platform.width < 0 || x > VIEW_WIDTH) return;
  if (platform.kind === "branch") {
    context.fillStyle = "#5a382d";
    context.fillRect(x, platform.y, platform.width, platform.height);
    context.fillStyle = "#936044";
    context.fillRect(x, platform.y, platform.width, 8);
    context.fillStyle = "#d4955d";
    for (let mark = 18; mark < platform.width; mark += 46) context.fillRect(x + mark, platform.y + 10, 18, 4);
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
    return;
  }
  context.fillStyle = forest ? "#385543" : "#a7653c";
  context.fillRect(x, platform.y, platform.width, platform.height);
  context.fillStyle = forest ? "#73b05a" : "#69b857";
  context.fillRect(x, platform.y, platform.width, 14);
  context.fillStyle = forest ? "#4c7950" : "#d3894b";
  for (let tile = 0; tile < platform.width; tile += 48) {
    context.fillRect(x + tile + 4, platform.y + 26, 34, 9);
    context.fillRect(x + tile + 18, platform.y + 48, 27, 8);
  }
}

function drawApple(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = "#5a382d";
  context.fillRect(x + 14, y - 8, 5, 10);
  context.fillStyle = "#5eb454";
  context.fillRect(x + 18, y - 7, 10, 6);
  context.fillStyle = "#e94255";
  context.fillRect(x + 3, y + 2, 26, 24);
  context.fillRect(x, y + 7, 32, 14);
  context.fillStyle = "#ff7a78";
  context.fillRect(x + 6, y + 5, 6, 6);
}

function drawCatPower(context: CanvasRenderingContext2D, x: number, y: number) {
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
}

function drawEnemy(context: CanvasRenderingContext2D, enemy: LiveEnemy, cameraX: number) {
  if (!enemy.active) return;
  const x = Math.round(enemy.x - cameraX);
  const y = Math.round(enemy.y + (enemy.kind === "cloud" ? Math.sin(enemy.phase) * 7 : 0));
  if (enemy.kind === "slime") {
    context.fillStyle = "#77cbe0";
    context.fillRect(x + 4, y + 8, 34, 28);
    context.fillRect(x + 10, y + 2, 22, 8);
    context.fillStyle = "#24445d";
    context.fillRect(x + 11, y + 14, 5, 7);
    context.fillRect(x + 27, y + 14, 5, 7);
    context.fillStyle = "#a7e7ef";
    context.fillRect(x + 8, y + 7, 8, 5);
  } else if (enemy.kind === "beetle") {
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
  } else {
    context.fillStyle = "#ece8ff";
    context.fillRect(x + 2, y + 12, 40, 22);
    context.fillRect(x + 10, y + 4, 24, 25);
    context.fillStyle = "#4c3d6c";
    context.fillRect(x + 12, y + 18, 5, 5);
    context.fillRect(x + 29, y + 18, 5, 5);
    context.fillRect(x + 19, y + 27, 9, 3);
  }
}

function drawCheckpoint(context: CanvasRenderingContext2D, worldX: number, cameraX: number, active: boolean) {
  const x = Math.round(worldX - cameraX);
  context.fillStyle = "#f2e4cf";
  context.fillRect(x, 365, 7, 91);
  context.fillStyle = active ? "#bd83e5" : "#b7afaa";
  context.fillRect(x + 7, 370, 48, 30);
  context.fillStyle = active ? "#fff4a5" : "#ded6d1";
  context.fillRect(x + 19, 379, 10, 10);
}

function drawGoalCat(context: CanvasRenderingContext2D, worldX: number, cameraX: number, finalLevel: boolean) {
  const x = Math.round(worldX - cameraX);
  context.fillStyle = "#6f4a32";
  context.fillRect(x + 63, 333, 7, 123);
  context.fillStyle = "#c68ee9";
  context.fillRect(x + 70, 339, 68, 36);
  context.fillStyle = "#fff3ad";
  context.fillRect(x + 81, 350, 12, 12);
  context.fillRect(x + 105, 350, 12, 12);
  const catX = x + 18;
  const catY = 400;
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
  };
}

export function GameCanvas({ level, running, onLoseLife, onComplete, onSnapshot, playSound }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, jump: false, shoot: false, jumpQueued: false, shootQueued: false });
  const runningRef = useRef(running);
  const callbacksRef = useRef({ onLoseLife, onComplete, onSnapshot, playSound });

  useEffect(() => {
    callbacksRef.current = { onLoseLife, onComplete, onSnapshot, playSound };
  }, [onLoseLife, onComplete, onSnapshot, playSound]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const input = inputRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
      if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = true;
      if (event.code === "ArrowRight" || event.code === "KeyD") input.right = true;
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
      if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = false;
      if (event.code === "ArrowRight" || event.code === "KeyD") input.right = false;
      if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") input.jump = false;
      if (event.code === "KeyX" || event.code === "KeyK") input.shoot = false;
    };
    const clear = () => Object.assign(input, { left: false, right: false, jump: false, shoot: false, jumpQueued: false, shootQueued: false });
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
    const player = createInitialPlayer(level);
    let enemies: LiveEnemy[] = level.enemies.map((item, index) => ({ ...item, vx: item.speed, active: true, phase: index }));
    const collected = new Set<string>();
    const projectiles: Projectile[] = [];
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

    const respawn = () => {
      player.x = respawnX;
      player.y = level.start.y;
      player.vx = 0;
      player.vy = 0;
      player.power = "normal";
      player.invincible = 1.4;
      projectiles.length = 0;
      callbacksRef.current.onLoseLife();
    };

    const hurt = () => {
      if (player.invincible > 0) return;
      callbacksRef.current.playSound("hurt");
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
      if (player.jumpBuffer > 0 && player.coyote > 0) {
        player.vy = -JUMP_SPEED;
        player.grounded = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
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

      player.x += player.vx * delta;
      player.x = Math.max(0, Math.min(level.width - player.width, player.x));
      const previousY = player.y;
      const previousBottom = previousY + player.height;
      player.vy += GRAVITY * delta;
      player.y += player.vy * delta;
      player.grounded = false;

      for (const platform of level.platforms) {
        const horizontal = player.x + player.width > platform.x && player.x < platform.x + platform.width;
        if (horizontal && player.vy >= 0 && previousBottom <= platform.y + 10 && player.y + player.height >= platform.y) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.grounded = true;
        }
      }

      if (player.y > VIEW_HEIGHT + 120) {
        callbacksRef.current.playSound("hurt");
        respawn();
      }

      for (const item of level.items) {
        if (collected.has(item.id)) continue;
        const box = { x: item.x, y: item.y, width: 40, height: 40 };
        if (!intersects(player, box)) continue;
        collected.add(item.id);
        if (item.kind === "apple") {
          apples += 1;
          if (player.power === "normal") player.power = "apple";
          callbacksRef.current.playSound("apple");
        } else {
          player.power = "cat";
          callbacksRef.current.playSound("cat");
        }
      }

      enemies.forEach((enemy) => {
        if (!enemy.active) return;
        enemy.phase += delta * 2.4;
        enemy.x += enemy.vx * delta;
        if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
          enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
          enemy.vx *= -1;
        }
        const hitbox = {
          x: enemy.x,
          y: enemy.y + (enemy.kind === "cloud" ? Math.sin(enemy.phase) * 7 : 0),
          width: enemy.width,
          height: enemy.height,
        };
        if (!intersects(player, hitbox)) return;
        if (player.vy > 60 && previousBottom <= hitbox.y + 15) {
          enemy.active = false;
          player.vy = -390;
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
          if (intersects({ x: ball.x - 10, y: ball.y - 10, width: 20, height: 20 }, enemy)) {
            enemy.active = false;
            ball.life = 0;
            callbacksRef.current.playSound("stomp");
          }
        });
      });
      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        if (projectiles[index].life <= 0) projectiles.splice(index, 1);
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
        player.vx = 0;
        callbacksRef.current.playSound("goal");
        completeTimer = window.setTimeout(() => callbacksRef.current.onComplete(), 650);
      }

      player.invincible = Math.max(0, player.invincible - delta);
      cameraX += (Math.max(0, Math.min(level.width - VIEW_WIDTH, player.x - 330)) - cameraX) * Math.min(1, delta * 5);

      if (now - lastSnapshot > 130) {
        callbacksRef.current.onSnapshot({ apples, power: player.power, checkpoint: checkpointIndex + 1, paused: !runningRef.current });
        lastSnapshot = now;
      }
    };

    const drawPlayer = () => {
      const x = Math.round(player.x - cameraX);
      const runningFrame = Math.floor(frame / 7) % 4;
      let row = 0;
      let column = 0;
      if (player.power === "cat") {
        row = 3;
        column = player.grounded ? (Math.abs(player.vx) > 25 ? 1 : 0) : 2;
        if (shootCooldown > 0.16) column = 3;
      } else if (!player.grounded) {
        row = 2;
        column = player.vy < 0 ? 0 : 1;
      } else if (Math.abs(player.vx) > 25) {
        row = 1;
        column = runningFrame;
      }
      const flashing = player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0;
      if (flashing) context.globalAlpha = 0.38;
      if (sprite.complete && sprite.naturalWidth) {
        const cellWidth = sprite.naturalWidth / 4;
        const cellHeight = sprite.naturalHeight / 4;
        context.save();
        if (player.facing === -1) {
          context.translate(x + player.width / 2, 0);
          context.scale(-1, 1);
          context.translate(-(x + player.width / 2), 0);
        }
        context.drawImage(
          sprite,
          column * cellWidth,
          row * cellHeight,
          cellWidth,
          cellHeight,
          x - 29,
          Math.round(player.y - 25),
          100,
          100,
        );
        context.restore();
      } else {
        context.fillStyle = "#aa6bd5";
        context.fillRect(x, player.y, player.width, player.height);
      }
      context.globalAlpha = 1;
    };

    const render = () => {
      drawBackground(context, level, cameraX);
      level.platforms.forEach((platform) => drawPlatform(context, platform, cameraX, level.world === 2));
      level.checkpoints.forEach((checkpoint, index) => drawCheckpoint(context, checkpoint, cameraX, index <= checkpointIndex));
      level.items.forEach((item) => {
        if (collected.has(item.id)) return;
        const x = Math.round(item.x - cameraX);
        const bob = Math.round(Math.sin(frame * 0.08 + item.x) * 4);
        if (item.kind === "apple") drawApple(context, x + 4, item.y + bob);
        else drawCatPower(context, x, item.y + bob);
      });
      enemies.forEach((enemy) => drawEnemy(context, enemy, cameraX));
      projectiles.forEach((ball) => {
        const x = Math.round(ball.x - cameraX);
        context.fillStyle = "#4b295f";
        context.fillRect(x - 11, Math.round(ball.y) - 11, 22, 22);
        context.fillStyle = "#c78bea";
        context.fillRect(x - 8, Math.round(ball.y) - 8, 16, 16);
        context.fillStyle = "#eee0ff";
        context.fillRect(x - 5, Math.round(ball.y) - 4, 10, 3);
      });
      drawGoalCat(context, level.goalX, cameraX, level.id === "2-2");
      drawPlayer();

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

  const bindTouch = (key: keyof InputState) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      inputRef.current[key] = true;
      if (key === "jump") inputRef.current.jumpQueued = true;
      if (key === "shoot") inputRef.current.shootQueued = true;
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      inputRef.current[key] = false;
    },
    onPointerCancel: () => {
      inputRef.current[key] = false;
    },
    onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
  });

  return (
    <div className="game-stage">
      <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} aria-label={`Pantalla ${level.id}: ${level.title}`} />
      <div className="touch-controls" aria-label="Controles táctiles">
        <div className="touch-group touch-move">
          <button type="button" className="touch-button" aria-label="Mover a la izquierda" {...bindTouch("left")}>◀</button>
          <button type="button" className="touch-button" aria-label="Mover a la derecha" {...bindTouch("right")}>▶</button>
        </div>
        <div className="touch-group touch-actions">
          <button type="button" className="touch-button touch-yarn" aria-label="Lanzar bola de lana" {...bindTouch("shoot")}>🧶</button>
          <button type="button" className="touch-button touch-jump" aria-label="Saltar" {...bindTouch("jump")}>↑</button>
        </div>
      </div>
    </div>
  );
}

export type { SoundKind };
