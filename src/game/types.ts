export type Theme = "orchard-day" | "orchard-sunset" | "forest-dusk" | "forest-night" | "crystal-cave" | "wolf-pines" | "wolf-moon" | "boar-canopy" | "boar-storm" | "sky-pirates" | "sky-storm" | "secret-sky";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Platform = Rect & {
  kind?: "ground" | "branch" | "stone" | "spring" | "mist" | "canopy" | "ship" | "air-plank" | "cloud-floor" | "cave-ground" | "cave-ledge" | "cave-wall";
};

export type Enemy = Rect & {
  id: string;
  kind: "slime" | "beetle" | "cloud" | "wolf" | "boar" | "bird" | "pirate" | "parrot" | "bat" | "sky-unicorn";
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
  reward: "apple" | "cat" | "secret-vine";
};

export type Cannon = {
  id: string;
  x: number;
  y: number;
  direction: -1 | 1;
  interval: number;
};

export type BossId = "bramble-king" | "mist-countess" | "great-wolf" | "great-boar" | "sky-captain" | "rainbow-queen";

export type Level = {
  id: string;
  world: 1 | 2 | 3 | 4 | 5 | 6;
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
  cannons?: Cannon[];
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
