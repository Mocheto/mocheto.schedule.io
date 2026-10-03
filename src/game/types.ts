export type Theme = "orchard-day" | "orchard-sunset" | "forest-dusk" | "forest-night";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Platform = Rect & {
  kind?: "ground" | "branch" | "stone";
};

export type Enemy = Rect & {
  id: string;
  kind: "slime" | "beetle" | "cloud";
  minX: number;
  maxX: number;
  speed: number;
};

export type LevelItem = {
  id: string;
  kind: "apple" | "cat";
  x: number;
  y: number;
};

export type Level = {
  id: string;
  world: 1 | 2;
  screen: 1 | 2;
  title: string;
  subtitle: string;
  theme: Theme;
  width: number;
  start: { x: number; y: number };
  goalX: number;
  platforms: Platform[];
  enemies: Enemy[];
  items: LevelItem[];
  checkpoints: number[];
};

export type Power = "normal" | "apple" | "cat";

export type GameSnapshot = {
  apples: number;
  power: Power;
  checkpoint: number;
  paused: boolean;
};

