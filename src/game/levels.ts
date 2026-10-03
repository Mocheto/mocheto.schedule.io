import type { Enemy, Level, LevelItem, Platform, Theme } from "./types";

const ground = (segments: Array<[number, number]>): Platform[] =>
  segments.map(([x, width]) => ({ x, y: 456, width, height: 120, kind: "ground" }));

const ledge = (x: number, y: number, width: number, kind: Platform["kind"] = "branch"): Platform => ({
  x,
  y,
  width,
  height: 22,
  kind,
});

const enemy = (
  id: string,
  kind: Enemy["kind"],
  x: number,
  y: number,
  minX: number,
  maxX: number,
  speed = 34,
): Enemy => ({ id, kind, x, y, width: 42, height: 36, minX, maxX, speed });

const apple = (id: string, x: number, y: number): LevelItem => ({ id, kind: "apple", x, y });
const cat = (id: string, x: number, y: number): LevelItem => ({ id, kind: "cat", x, y });

export const themeNames: Record<Theme, string> = {
  "orchard-day": "Mañana entre manzanos",
  "orchard-sunset": "Tarde de manzanas",
  "forest-dusk": "Bosque de los bigotes",
  "forest-night": "Claro de la luna",
};

export const levels: Level[] = [
  {
    id: "1-1",
    world: 1,
    screen: 1,
    title: "El sendero de las manzanas",
    subtitle: "Aprende a saltar y encuentra al primer gatito.",
    theme: "orchard-day",
    width: 2960,
    start: { x: 80, y: 380 },
    goalX: 2800,
    platforms: [
      ...ground([[0, 2960]]),
      ledge(330, 370, 180), ledge(590, 315, 150), ledge(1030, 370, 190),
      ledge(1370, 300, 180), ledge(1890, 365, 170), ledge(2180, 310, 190),
    ],
    enemies: [
      enemy("e1", "slime", 560, 420, 520, 720, 26),
      enemy("e2", "beetle", 1110, 420, 970, 1320, 32),
      enemy("e3", "slime", 1970, 420, 1810, 2110, 28),
      enemy("e4", "beetle", 2460, 420, 2360, 2680, 34),
    ],
    items: [apple("a1", 410, 320), apple("a2", 1100, 320), cat("c1", 1460, 410), apple("a3", 2240, 260)],
    checkpoints: [930, 1900],
  },
  {
    id: "1-2",
    world: 1,
    screen: 2,
    title: "La fiesta de las copas",
    subtitle: "Sube por las ramas anchas y sigue las manzanas.",
    theme: "orchard-sunset",
    width: 3240,
    start: { x: 80, y: 380 },
    goalX: 3070,
    platforms: [
      ...ground([[0, 3240]]),
      ledge(270, 370, 180), ledge(540, 305, 190), ledge(1080, 350, 220),
      ledge(1390, 285, 170), ledge(1910, 365, 200), ledge(2200, 295, 200),
      ledge(2710, 355, 190), ledge(2920, 290, 170),
    ],
    enemies: [
      enemy("e1", "beetle", 690, 420, 610, 860, 34),
      enemy("e2", "slime", 1190, 314, 1090, 1240, 26),
      enemy("e3", "cloud", 1550, 250, 1450, 1640, 22),
      enemy("e4", "beetle", 2050, 420, 1900, 2470, 36),
      enemy("e5", "slime", 2780, 420, 2700, 2910, 30),
    ],
    items: [apple("a1", 350, 320), cat("c1", 620, 410), apple("a2", 1460, 235), apple("a3", 2290, 245), apple("a4", 2990, 240)],
    checkpoints: [1050, 2100],
  },
  {
    id: "2-1",
    world: 2,
    screen: 1,
    title: "El bosque de los bigotes",
    subtitle: "Las luciérnagas iluminan el camino hacia otro gatito.",
    theme: "forest-dusk",
    width: 3100,
    start: { x: 80, y: 380 },
    goalX: 2930,
    platforms: [
      ...ground([[0, 3100]]),
      ledge(290, 350, 210, "stone"), ledge(910, 375, 190, "stone"),
      ledge(1220, 305, 190, "branch"), ledge(1740, 365, 180, "stone"),
      ledge(2050, 295, 210, "branch"), ledge(2590, 350, 190, "stone"),
    ],
    enemies: [
      enemy("e1", "slime", 520, 420, 430, 650, 28),
      enemy("e2", "cloud", 1060, 250, 930, 1180, 22),
      enemy("e3", "beetle", 1810, 420, 1690, 2240, 34),
      enemy("e4", "slime", 2680, 314, 2600, 2720, 26),
    ],
    items: [apple("a1", 380, 300), cat("c1", 1300, 410), apple("a2", 2110, 245), apple("a3", 2660, 300)],
    checkpoints: [900, 1810],
  },
  {
    id: "2-2",
    world: 2,
    screen: 2,
    title: "El claro de la luna",
    subtitle: "La última aventura termina con una gran fiesta gatuna.",
    theme: "forest-night",
    width: 3460,
    start: { x: 80, y: 380 },
    goalX: 3290,
    platforms: [
      ...ground([[0, 3460]]),
      ledge(300, 365, 200, "stone"), ledge(600, 300, 160, "branch"),
      ledge(980, 350, 200, "stone"), ledge(1320, 285, 190, "branch"),
      ledge(1830, 365, 210, "stone"), ledge(2190, 300, 190, "branch"),
      ledge(2700, 350, 190, "stone"), ledge(3020, 285, 180, "branch"),
    ],
    enemies: [
      enemy("e1", "beetle", 510, 420, 420, 700, 34),
      enemy("e2", "cloud", 1120, 245, 990, 1260, 24),
      enemy("e3", "slime", 1900, 420, 1800, 2200, 30),
      enemy("e4", "cloud", 2390, 235, 2220, 2490, 24),
      enemy("e5", "beetle", 2800, 420, 2680, 3130, 36),
    ],
    items: [apple("a1", 370, 315), cat("c1", 670, 410), apple("a2", 1390, 235), apple("a3", 2250, 250), apple("a4", 3090, 235)],
    checkpoints: [980, 1960, 2780],
  },
];

export const getLevel = (id: string) => levels.find((level) => level.id === id) ?? levels[0];
