export type Theme = "orchard-day" | "orchard-sunset" | "forest-dusk" | "forest-night" | "wolf-pines" | "wolf-moon";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Platform = Rect & {
  kind?: "ground" | "branch" | "stone" | "spring" | "mist";
};

export type Enemy = Rect & {
  id: string;
  kind: "slime" | "beetle" | "cloud" | "wolf";
  minX: number;
  maxX: number;
  speed: number;
};

export type LevelItem = {
  id: string;
  kind: "apple" | "cat" | "sticker";
  x: number;
  y: number;
};

export type RewardBlock = {
  id: string;
  x: number;
  y: number;
  reward: "apple" | "cat";
};

export type BossId = "bramble-king" | "mist-countess" | "great-wolf";

export type Level = {
  id: string;
  world: 1 | 2 | 3;
  screen: 1 | 2 | 3;
  title: string;
  subtitle: string;
  theme: Theme;
  width: number;
  start: { x: number; y: number };
  goalX: number;
  platforms: Platform[];
  enemies: Enemy[];
  items: LevelItem[];
  rewardBlocks: RewardBlock[];
  checkpoints: number[];
  boss?: BossId;
};

export type Power = "normal" | "apple" | "cat";

export type GameSnapshot = {
  apples: number;
  stickers: string[];
  power: Power;
  checkpoint: number;
  paused: boolean;
};
