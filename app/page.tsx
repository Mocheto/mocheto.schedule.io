"use client";
/* eslint-disable @next/next/no-img-element -- relative static asset must also work under a GitHub Pages subpath */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { barcelonaHolidays2026 } from "./barcelona-holidays";
import { noaDateSet, noaDates } from "./noa-calendar";

type Profile = { age: number; height: number; startWeight: number; goalWeight: number; waist: number; padelDay: string };
type ProgressEntry = { id: number; date: string; weight: number; waist: number };
type Exercise = { id: string; name: string; prescription: string; image: string; cues: string[]; routine: string; category: "Fuerza" | "HIIT" | "Casa"; muscle: string };
type ExerciseGroup = { id: string; name: string; exerciseIds: string[]; builtIn?: boolean };
type MealCategory = "Desayuno" | "Comida" | "Cena";
type Dish = { id: string; name: string; category: MealCategory; protein: number; carbs: number; fat: number; builtIn?: boolean };
type MealPlan = { id: string; name: string; days: Record<string, string[]>; builtIn?: boolean };
type NutritionTargets = { kcal: number; protein: number; carbs: number; fat: number; waterMl: number };
type RecipeBadge = { id: string; label: string; symbol: string; description: string; kind: "trait" | "allergen" };
type DailyArchiveEntry = { date: string; archivedAt: number; workoutCompleted: boolean; completedMeals: number[]; habitExceptions: string[]; waterMl?: number };
type WeeklyHistoryEntry = { id: number; weekStart: string; weekEnd: string; completed: number; keyCompleted: number; keyTotal?: number; habitExceptions: number; selectedMeals: number; weight: number; waist: number };
type ActiveView = "today" | "week" | "calendar" | "exercises" | "meals" | "progress" | "history";
type SavedState = {
  completed: string[];
  mealWeek: number;
  mealChoices: Record<string, number>;
  selectedMeals: string[];
  shopping: string[];
  dietExceptions: Record<string, string[]>;
  custodyOverrides: Record<string, boolean>;
  progress: ProgressEntry[];
  dailyArchives: Record<string, DailyArchiveEntry>;
  exerciseGroups: ExerciseGroup[];
  exerciseSchedule: Record<string, string>;
  dishOverrides: Record<string, Partial<Dish>>;
  customDishes: Dish[];
  mealPlans: MealPlan[];
  activeMealPlanId: string;
  mealPlanAssignments: Record<string, string>;
  nutritionTargets: NutritionTargets;
  waterIntake: Record<string, number>;
  weeklyHistory: WeeklyHistoryEntry[];
  trackingStartedAt: string;
  profile: Profile;
};

const defaultProfile: Profile = { age: 42, height: 192, startWeight: 100, goalWeight: 87, waist: 108, padelDay: "Lunes" };

const dailyDietCommitments = [
  { id: "fast-12", title: "Ayuno nocturno de 12 h", detail: "Desde que terminas de cenar hasta el desayuno; agua e infusiones sin azúcar sí cuentan como hidratación." },
  { id: "vinegar", title: "Vinagre siempre diluido", detail: "15 ml en al menos 300 ml de agua con o antes de una comida. Nunca solo y detente si causa molestias." },
  { id: "no-alcohol", title: "0 alcohol", detail: "Incluye cerveza, vino y combinados." },
  { id: "no-sugary-drinks", title: "0 refrescos ni zumos", detail: "Agua, café o infusiones sin azúcar como bebidas habituales." },
  { id: "no-refined", title: "0 bollería y harinas refinadas", detail: "Evita dulces, pan blanco y pasta blanca; elige fruta entera y versiones integrales." },
];

const baseWeek = [
  { id: "padel", day: "Lun", title: "Pádel", detail: "60 min · sesión fija", tone: "padel", key: true },
  { id: "strength-a", day: "Mar", title: "Fuerza A", detail: "30 min · cuerpo completo", tone: "strength", key: true },
  { id: "run", day: "Mié", title: "Correr / andar", detail: "30 min · sin perseguir marcas", tone: "run", key: true },
  { id: "mobility", day: "Jue", title: "Recuperar", detail: "10 min · movilidad", tone: "rest", key: false },
  { id: "strength-b", day: "Vie", title: "Fuerza B", detail: "30 min · cuerpo completo", tone: "strength", key: true },
  { id: "walk", day: "Sáb", title: "Paseo", detail: "30 min · ritmo cómodo", tone: "walk", key: false },
  { id: "family-walk", day: "Dom", title: "Paseo en familia", detail: "40 min · suma sin restar vida", tone: "walk", key: false },
];

const meals = [
  { day: "Lunes", options: [
    ["Tostada integral, tomate, AOVE y 2 huevos", "Lentejas con verduras y pollo", "Merluza al horno, patata y ensalada"],
    ["Yogur natural, avena, plátano y nueces", "Burrito bowl de pavo y frijoles", "Crema de calabacín y tortilla francesa"],
    ["Avena caliente con manzana y almendras", "Ensalada de quinoa, pollo y verduras", "Tortilla de calabacín con tomate"],
    ["Tostada integral con pavo y tomate", "Chili rápido de ternera y frijoles", "Dorada en papillote con patata"],
    ["Kéfir natural, frutos rojos, avena y chía", "Ensalada de quinoa, salmón, espinacas y aguacate", "Crema de calabacín y jengibre con 2 huevos"],
  ]},
  { day: "Martes", options: [
    ["Yogur griego natural, fruta y avena", "Pasta integral con atún, tomate y rúcula", "Pollo al limón, verduras y arroz"],
    ["Tostada de aguacate y queso fresco", "Ensalada de garbanzos, huevo y pimientos", "Salmón, brócoli y boniato"],
    ["Huevos revueltos, espinacas y tostada", "Curry ligero de pollo con arroz", "Ensalada caprese con atún y pan integral"],
    ["Yogur natural, kiwi y nueces", "Tacos de merluza con col y yogur", "Pavo salteado con verduras y cuscús"],
    ["Tostada integral con aguacate y 2 huevos", "Lentejas estofadas con zanahoria, apio y cúrcuma", "Merluza al horno con brócoli y boniato"],
  ]},
  { day: "Miércoles", options: [
    ["Tortilla, pan integral y naranja", "Salmón teriyaki ligero, arroz y edamame", "Tacos de pollo, pico de gallo y col"],
    ["Avena nocturna con yogur y frutos rojos", "Arroz con pavo y verduras", "Sopa miso, tofu y ensalada de pepino"],
    ["Tostada integral, queso fresco y fruta", "Pasta boloñesa rápida de pavo", "Salmón a la plancha con ensalada"],
    ["Avena con plátano y canela", "Poke de pollo, arroz y aguacate", "Quesadillas de frijoles y pimientos"],
    ["Yogur natural, pera, nueces y canela", "Pollo al curry con arroz integral y verduras", "Puré de coliflor y tortilla con espárragos"],
  ]},
  { day: "Jueves", options: [
    ["Avena con leche, manzana y canela", "Ensalada templada de patata, judías y atún", "Albóndigas de pavo con tomate y calabacín"],
    ["Pan integral, tomate y jamón serrano", "Cuscús con garbanzos y verduras", "Dorada, ensalada y pan integral"],
    ["Yogur, pera, avena y almendras", "Bowl mexicano de pollo y frijoles", "Crema de verduras y tostada de atún"],
    ["Tortilla francesa, tomate y pan integral", "Salmón con patata y brócoli", "Pasta integral con verduras y mozzarella"],
    ["Avena nocturna con kéfir, manzana y chía", "Ensalada de garbanzos, pepino, tomate y aceitunas", "Sardinas o caballa con puré de calabaza"],
  ]},
  { day: "Viernes", options: [
    ["Yogur, pera, almendras y avena", "Pollo mediterráneo, cuscús y ensalada", "Pizza casera fina de verduras y mozzarella"],
    ["Huevos revueltos, tomate y tostada", "Poke de atún, arroz, pepino y aguacate", "Fajitas de ternera y pimientos"],
    ["Tostada de aguacate, huevo y tomate", "Lentejas rápidas con pavo y verduras", "Sushi bowl de salmón y pepino"],
    ["Yogur natural, plátano y nueces", "Pasta integral con pollo y rúcula", "Tacos de pavo con pico de gallo"],
    ["Tortilla de espinacas y tostada integral", "Tacos de lechuga con pavo, aguacate y lima", "Salteado de setas y tofu con arroz de coliflor"],
  ]},
  { day: "Sábado", options: [
    ["Tostada con queso fresco, tomate y fruta", "Poke de salmón, arroz y verduras", "Fajitas de ternera, pimientos y guacamole"],
    ["Yogur, avena, kiwi y nueces", "Paella de pollo y verduras con ensalada", "Sushi casero sencillo y edamame"],
    ["Huevos, tostada integral y naranja", "Pizza casera de atún y verduras", "Pollo teriyaki rápido con arroz"],
    ["Avena nocturna con manzana y canela", "Burritos de ternera y frijoles", "Merluza a la plancha con boniato"],
    ["Yogur natural, plátano, avena y semillas", "Tabulé de quinoa con hummus, tomate y pepino", "Sopa de miso con tofu y ensalada de zanahoria y remolacha"],
  ]},
  { day: "Domingo", options: [
    ["Huevos, tostada, tomate y fruta", "Arroz de pollo y verduras + ensalada", "Crema de verduras y tostada de atún"],
    ["Yogur natural, fruta y almendras", "Pasta boloñesa de pavo + ensalada", "Tortilla de patata ligera y tomate"],
    ["Tostada integral con pavo y aguacate", "Salmón al horno con patata y verduras", "Ensalada de garbanzos y huevo"],
    ["Yogur, avena y frutos rojos", "Arroz mexicano con pollo y frijoles", "Frittata rápida de verduras"],
    ["Tostada integral con queso fresco, tomate y fruta", "Arroz integral con pollo, judías verdes y pimientos", "Crema de calabaza con ensalada de kale, nueces y atún"],
  ]},
];

const menuWeekIndexes = meals[0].options.map((_, index) => index);

const ingredientCatalog = [
  { id: "eggs", label: "Huevos", category: "Proteínas", match: /huevo|tortilla/i, amount: 2, unit: "ud" },
  { id: "chicken", label: "Pollo", category: "Proteínas", match: /pollo/i, amount: 220, unit: "g" },
  { id: "turkey", label: "Pavo", category: "Proteínas", match: /pavo/i, amount: 200, unit: "g" },
  { id: "beef", label: "Ternera", category: "Proteínas", match: /ternera/i, amount: 200, unit: "g" },
  { id: "salmon", label: "Salmón", category: "Proteínas", match: /salmón/i, amount: 220, unit: "g" },
  { id: "blue-fish", label: "Sardinas o caballa", category: "Proteínas", match: /sardinas|caballa/i, amount: 1, unit: "lata o ración" },
  { id: "white-fish", label: "Merluza o dorada", category: "Proteínas", match: /merluza|dorada/i, amount: 220, unit: "g" },
  { id: "tuna", label: "Atún", category: "Proteínas", match: /atún/i, amount: 1, unit: "lata" },
  { id: "tofu", label: "Tofu", category: "Proteínas", match: /tofu/i, amount: 180, unit: "g" },
  { id: "ham", label: "Jamón serrano", category: "Proteínas", match: /jamón serrano/i, amount: 80, unit: "g" },
  { id: "yogurt", label: "Yogur natural o kéfir", category: "Proteínas", match: /yogur|kéfir/i, amount: 1, unit: "ud" },
  { id: "milk", label: "Leche", category: "Proteínas", match: /con leche|avena caliente/i, amount: 500, unit: "ml" },
  { id: "fresh-cheese", label: "Queso fresco o mozzarella", category: "Proteínas", match: /queso fresco|mozzarella/i, amount: 125, unit: "g" },
  { id: "legumes", label: "Lentejas, garbanzos, judías o frijoles", category: "Proteínas", match: /lentejas|garbanzos|judías|frijoles/i, amount: 1, unit: "bote" },
  { id: "hummus", label: "Hummus", category: "Proteínas", match: /hummus/i, amount: 100, unit: "g" },
  { id: "tomato", label: "Tomate", category: "Verdura y fruta", match: /tomate|pico de gallo/i, amount: 2, unit: "ud" },
  { id: "greens", label: "Hojas verdes", category: "Verdura y fruta", match: /ensalada|rúcula|kale/i, amount: 1, unit: "bolsa" },
  { id: "pepper", label: "Pimientos", category: "Verdura y fruta", match: /pimiento/i, amount: 2, unit: "ud" },
  { id: "zucchini", label: "Calabacín", category: "Verdura y fruta", match: /calabacín/i, amount: 1, unit: "ud" },
  { id: "broccoli", label: "Brócoli", category: "Verdura y fruta", match: /brócoli/i, amount: 1, unit: "ud" },
  { id: "cauliflower", label: "Coliflor", category: "Verdura y fruta", match: /coliflor/i, amount: 1, unit: "ud" },
  { id: "pumpkin", label: "Calabaza", category: "Verdura y fruta", match: /calabaza/i, amount: 400, unit: "g" },
  { id: "mushrooms", label: "Setas", category: "Verdura y fruta", match: /setas/i, amount: 200, unit: "g" },
  { id: "carrot", label: "Zanahoria", category: "Verdura y fruta", match: /zanahoria/i, amount: 2, unit: "ud" },
  { id: "celery", label: "Apio", category: "Verdura y fruta", match: /apio/i, amount: 1, unit: "manojo" },
  { id: "beetroot", label: "Remolacha", category: "Verdura y fruta", match: /remolacha/i, amount: 2, unit: "ud" },
  { id: "asparagus", label: "Espárragos", category: "Verdura y fruta", match: /espárragos/i, amount: 1, unit: "manojo" },
  { id: "spinach", label: "Espinacas", category: "Verdura y fruta", match: /espinacas/i, amount: 1, unit: "bolsa" },
  { id: "cabbage", label: "Col", category: "Verdura y fruta", match: /\bcol\b/i, amount: 0.5, unit: "ud" },
  { id: "cucumber", label: "Pepino", category: "Verdura y fruta", match: /pepino/i, amount: 1, unit: "ud" },
  { id: "avocado", label: "Aguacate", category: "Verdura y fruta", match: /aguacate|guacamole/i, amount: 1, unit: "ud" },
  { id: "fruit", label: "Fruta de temporada", category: "Verdura y fruta", match: /fruta|plátano|naranja|manzana|pera|kiwi|frutos rojos/i, amount: 2, unit: "piezas" },
  { id: "mixed-veg", label: "Verdura variada", category: "Verdura y fruta", match: /verdura/i, amount: 400, unit: "g" },
  { id: "bread", label: "Pan integral", category: "Despensa", match: /tostada|pan integral/i, amount: 4, unit: "rebanadas" },
  { id: "oats", label: "Avena", category: "Despensa", match: /avena/i, amount: 60, unit: "g" },
  { id: "rice", label: "Arroz", category: "Despensa", match: /arroz|poke|sushi|paella/i, amount: 90, unit: "g" },
  { id: "quinoa", label: "Quinoa", category: "Despensa", match: /quinoa/i, amount: 90, unit: "g" },
  { id: "pasta", label: "Pasta integral", category: "Despensa", match: /pasta/i, amount: 90, unit: "g" },
  { id: "couscous", label: "Cuscús", category: "Despensa", match: /cuscús/i, amount: 90, unit: "g" },
  { id: "potato", label: "Patata o boniato", category: "Despensa", match: /patata|boniato/i, amount: 300, unit: "g" },
  { id: "nuts", label: "Frutos secos", category: "Despensa", match: /nueces|almendras|frutos secos/i, amount: 30, unit: "g" },
  { id: "seeds", label: "Chía o semillas", category: "Despensa", match: /chía|semillas/i, amount: 30, unit: "g" },
  { id: "olives", label: "Aceitunas", category: "Despensa", match: /aceitunas/i, amount: 1, unit: "tarro" },
  { id: "citrus", label: "Limón o lima", category: "Despensa", match: /limón|lima/i, amount: 1, unit: "ud" },
  { id: "edamame", label: "Edamame", category: "Despensa", match: /edamame/i, amount: 120, unit: "g" },
  { id: "tortillas", label: "Tortillas de maíz o trigo", category: "Despensa", match: /tacos|fajitas|burrito/i, amount: 4, unit: "ud" },
  { id: "pizza-base", label: "Base fina integral", category: "Despensa", match: /pizza/i, amount: 1, unit: "ud" },
  { id: "soy", label: "Salsa de soja baja en sal", category: "Despensa", match: /teriyaki|sushi|miso/i, amount: 1, unit: "botella si falta" },
  { id: "olive-oil", label: "AOVE", category: "Despensa", match: /AOVE|mediterráneo|ensalada|horno/i, amount: 1, unit: "botella si falta" },
];

const strengthA: Exercise[] = [
  { id: "goblet-squat", name: "Sentadilla con mancuerna", prescription: "3×8–12", image: "./exercises/goblet-squat.webp", routine: "Fuerza A", category: "Fuerza", muscle: "Piernas", cues: ["Mancuerna pegada al pecho.", "Rodillas en la dirección de los pies.", "Sube empujando el suelo."] },
  { id: "chest-press", name: "Press de pecho", prescription: "3×8–12", image: "./exercises/chest-press.webp", routine: "Fuerza A", category: "Fuerza", muscle: "Pecho", cues: ["Pies firmes y escápulas apoyadas.", "Codos a unos 45° del torso.", "Termina sobre el pecho, sin chocar mancuernas."] },
  { id: "seated-row", name: "Remo en máquina", prescription: "3×8–12", image: "./exercises/seated-row.webp", routine: "Fuerza A", category: "Fuerza", muscle: "Espalda", cues: ["Torso alto y hombros lejos de las orejas.", "Lleva los codos hacia atrás.", "Acerca el agarre a las costillas sin balancearte."] },
  { id: "romanian-deadlift", name: "Peso muerto rumano", prescription: "2×8–12", image: "./exercises/romanian-deadlift.webp", routine: "Fuerza A", category: "Fuerza", muscle: "Cadena posterior", cues: ["Rodillas ligeramente flexionadas.", "Lleva la cadera atrás con espalda larga.", "Mantén las mancuernas cerca de las piernas."] },
  { id: "plank", name: "Plancha", prescription: "2×20–40 s", image: "./exercises/plank.webp", routine: "Fuerza A", category: "Fuerza", muscle: "Core", cues: ["Codos debajo de los hombros.", "Aprieta abdomen y glúteos.", "Forma una línea de cabeza a talones."] },
];
const strengthB: Exercise[] = [
  { id: "assisted-lunge", name: "Zancada asistida", prescription: "3×8/lado", image: "./exercises/assisted-lunge.webp", routine: "Fuerza B", category: "Fuerza", muscle: "Piernas", cues: ["Usa el apoyo solo para equilibrarte.", "Da el paso hacia atrás.", "Mantén la rodilla delantera alineada con el pie."] },
  { id: "lat-pulldown", name: "Jalón al pecho", prescription: "3×8–12", image: "./exercises/lat-pulldown.webp", routine: "Fuerza B", category: "Fuerza", muscle: "Espalda", cues: ["Pecho alto y hombros abajo.", "Lleva la barra hacia la parte alta del pecho.", "Evita balancear el torso."] },
  { id: "shoulder-press", name: "Press de hombro", prescription: "3×8–12", image: "./exercises/shoulder-press.webp", routine: "Fuerza B", category: "Fuerza", muscle: "Hombros", cues: ["Pies firmes y costillas controladas.", "Empieza con antebrazos verticales.", "Sube sin arquear la espalda."] },
  { id: "glute-bridge", name: "Puente de glúteo", prescription: "3×10–15", image: "./exercises/glute-bridge.webp", routine: "Fuerza B", category: "Fuerza", muscle: "Glúteos", cues: ["Pies apoyados cerca de los glúteos.", "Eleva la cadera apretando glúteos.", "Termina en línea sin hiperextender la espalda."] },
  { id: "farmers-carry", name: "Paseo del granjero", prescription: "3×30 s", image: "./exercises/farmers-carry.webp", routine: "Fuerza B", category: "Fuerza", muscle: "Cuerpo completo", cues: ["Crece hacia arriba y baja los hombros.", "Mancuernas quietas junto al cuerpo.", "Camina con pasos cortos y controlados."] },
];
const hiitExercises: Exercise[] = [
  { id: "step-jack", name: "Step jack", prescription: "30 s · 20 s pausa", image: "./exercises/step-jack.webp", routine: "HIIT", category: "HIIT", muscle: "Cuerpo completo", cues: ["Abre una pierna cada vez.", "Lleva los brazos por encima de la cabeza.", "Mantén un ritmo que puedas repetir."] },
  { id: "high-knees", name: "Rodillas altas", prescription: "30 s · 20 s pausa", image: "./exercises/high-knees.webp", routine: "HIIT", category: "HIIT", muscle: "Piernas", cues: ["Crece hacia arriba.", "Alterna rodilla y brazo contrario.", "Aterriza suave sobre el antepié."] },
  { id: "mountain-climber", name: "Escalador", prescription: "30 s · 20 s pausa", image: "./exercises/mountain-climber.webp", routine: "HIIT", category: "HIIT", muscle: "Core", cues: ["Manos debajo de los hombros.", "Mantén la cadera estable.", "Alterna rodillas sin perder la línea del tronco."] },
  { id: "squat-thrust", name: "Squat thrust sin salto", prescription: "30 s · 30 s pausa", image: "./exercises/squat-thrust.webp", routine: "HIIT", category: "HIIT", muscle: "Cuerpo completo", cues: ["Apoya las manos antes de llevar los pies atrás.", "Llega a una plancha firme.", "Vuelve de forma controlada y levántate."] },
];
const homeExercises: Exercise[] = [
  { id: "chair-squat", name: "Sentadilla a silla", prescription: "3×10–15", image: "./exercises/chair-squat.webp", routine: "Casa", category: "Casa", muscle: "Piernas", cues: ["Usa una silla estable.", "Lleva la cadera hacia atrás.", "Toca el asiento y vuelve a subir."] },
  { id: "incline-pushup", name: "Flexión inclinada", prescription: "3×8–12", image: "./exercises/incline-pushup.webp", routine: "Casa", category: "Casa", muscle: "Pecho", cues: ["Apoya las manos en una superficie firme.", "Mantén el cuerpo en una línea.", "Baja el pecho con los codos a unos 45°."] },
  { id: "dead-bug", name: "Dead bug", prescription: "3×8/lado", image: "./exercises/dead-bug.webp", routine: "Casa", category: "Casa", muscle: "Core", cues: ["Mantén la zona lumbar apoyada.", "Extiende brazo y pierna contrarios.", "Recorta el recorrido si pierdes el control."] },
  { id: "bird-dog", name: "Bird dog", prescription: "3×8/lado", image: "./exercises/bird-dog.webp", routine: "Casa", category: "Casa", muscle: "Core", cues: ["Manos bajo hombros y rodillas bajo caderas.", "Extiende brazo y pierna contrarios.", "Mantén la pelvis nivelada."] },
];
const allExercises = [...strengthA, ...strengthB, ...hiitExercises, ...homeExercises];
const defaultExerciseGroups: ExerciseGroup[] = [
  { id: "strength-a", name: "Fuerza A", exerciseIds: strengthA.map((exercise) => exercise.id), builtIn: true },
  { id: "strength-b", name: "Fuerza B", exerciseIds: strengthB.map((exercise) => exercise.id), builtIn: true },
  { id: "hiit-short", name: "HIIT corto", exerciseIds: hiitExercises.map((exercise) => exercise.id), builtIn: true },
  { id: "home-full", name: "Casa · cuerpo completo", exerciseIds: homeExercises.map((exercise) => exercise.id), builtIn: true },
];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const workoutByDay: Record<number, string> = { 0: "Paseo en familia · 40 min", 1: "Paseo suave · 20 min", 2: "Fuerza A · 30 min", 3: "Correr / andar · 30 min", 4: "Movilidad · 10 min", 5: "Fuerza B · 30 min", 6: "Paseo largo · 40 min" };

const toIsoDate = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const mondayMealIndex = (jsDay: number) => (jsDay + 6) % 7;
const dishId = (name: string) => `dish-${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
const nutritionKcal = (dish: Pick<Dish, "protein" | "carbs" | "fat">) => Math.round(dish.protein * 4 + dish.carbs * 4 + dish.fat * 9);
const weekStartIso = (iso: string) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return toIsoDate(date.getFullYear(), date.getMonth(), date.getDate());
};

function getRecipe(dish: string) {
  const simple = /yogur|kéfir|tostada|huevos revueltos|tortilla francesa|avena nocturna/i.test(dish);
  let time = simple ? 5 : 18;
  let icon = "🍳";
  let image = "./recipes/recipe-02.webp";
  let steps = [
    "Prepara y corta todos los ingredientes antes de encender el fuego.",
    "Cocina la proteína y las verduras con poco AOVE hasta que estén en su punto.",
    "Añade el hidrato ya cocido, ajusta sal y especias, y sirve.",
  ];

  if (/yogur|kéfir|avena nocturna|avena caliente|avena con/i.test(dish)) { time = 3; icon = "🥣"; image = "./recipes/recipe-00.webp"; steps = ["Pon el yogur, el kéfir o la leche en un bol.", "Añade avena y fruta troceada.", "Termina con frutos secos, semillas o canela; deja reposar si es avena nocturna."]; }
  else if (/tostada|pan integral, tomate|pan integral con/i.test(dish)) { time = 5; icon = "🍞"; image = "./recipes/recipe-01.webp"; steps = ["Tuesta el pan integral.", "Prepara el tomate, aguacate o queso mientras se tuesta.", "Monta la tostada y añade la proteína al final."]; }
  else if (/ensalada|caprese|tabulé/i.test(dish)) { time = 10; icon = "🥗"; image = /garbanzo|lenteja|judía|hummus/i.test(dish) ? "./recipes/recipe-03.webp" : "./recipes/recipe-04.webp"; steps = ["Lava y corta las verduras.", "Añade la proteína y el hidrato cocido si lo lleva.", "Aliña con AOVE, limón o vinagre justo antes de comer."]; }
  else if (/poke|sushi bowl|sushi casero/i.test(dish)) { time = 15; icon = "🍚"; image = "./recipes/recipe-06.webp"; steps = ["Cuece el arroz o usa una ración ya preparada.", "Cocina la proteína si no se consume lista y corta las verduras.", "Monta el bol por secciones y aliña ligeramente."]; }
  else if (/bowl/i.test(dish)) { time = 15; icon = "🍚"; image = /mexicano|frijoles|burrito/i.test(dish) ? "./recipes/recipe-09.webp" : "./recipes/recipe-06.webp"; steps = ["Cuece el arroz o usa una ración ya preparada.", "Cocina la proteína si no se consume lista y corta las verduras.", "Monta el bol por secciones y aliña ligeramente."]; }
  else if (/tacos de lechuga/i.test(dish)) { time = 15; icon = "🥬"; image = "./recipes/recipe-08.webp"; steps = ["Separa, lava y seca hojas grandes de lechuga.", "Saltea el pavo con cebolla y especias.", "Rellena las hojas y termina con aguacate y lima."]; }
  else if (/taco|fajita|burrito|quesadilla/i.test(dish)) { time = 15; icon = "🌮"; image = "./recipes/recipe-08.webp"; steps = ["Saltea la proteína y los pimientos a fuego fuerte.", "Calienta las tortillas en una sartén seca.", "Rellena con verduras, pico de gallo o yogur y sirve."]; }
  else if (/chili/i.test(dish)) { time = 18; icon = "🌶️"; image = "./recipes/recipe-09.webp"; steps = ["Dora la carne o el pavo con especias.", "Añade tomate y frijoles ya cocidos.", "Cuece 10–12 minutos hasta que espese y sirve con una ración medida de arroz o pan."]; }
  else if (/pasta|boloñesa/i.test(dish)) { time = 18; icon = "🍝"; image = "./recipes/recipe-10.webp"; steps = ["Cuece la pasta integral al dente y reserva un poco de agua.", "Saltea tomate, verduras y proteína en otra sartén.", "Mezcla todo durante un minuto y ajusta la textura con el agua reservada."]; }
  else if (/crema|puré|sopa de miso/i.test(dish)) { time = 20; icon = "🍲"; image = /miso/i.test(dish) ? "./recipes/recipe-07.webp" : "./recipes/recipe-03.webp"; steps = ["Trocea las verduras pequeñas para que se hagan antes.", "Cuece 12–15 minutos con el agua justa.", "Tritura la crema o el puré; si lleva miso y tofu, añádelos al final sin hervir fuerte."]; }
  else if (/salmón/i.test(dish)) { time = 20; icon = "🐟"; image = "./recipes/recipe-05.webp"; steps = ["Calienta horno o sartén y seca bien el pescado.", "Cocina 3–4 minutos por lado, o 12–15 minutos al horno.", "Sirve con verdura y la ración de patata, arroz o boniato."]; }
  else if (/merluza|dorada|sardinas|caballa/i.test(dish)) { time = 20; icon = "🐟"; image = "./recipes/recipe-04.webp"; steps = ["Calienta horno o sartén y seca bien el pescado.", "Cocina 3–4 minutos por lado, o 12–15 minutos al horno.", "Sirve con verdura y la ración de patata, arroz o boniato."]; }
  else if (/tortilla|frittata|huevos revueltos|huevos,/i.test(dish)) { time = 12; icon = "🥚"; image = "./recipes/recipe-01.webp"; steps = ["Saltea primero las verduras hasta que pierdan agua.", "Bate los huevos, mezcla y vierte en la sartén.", "Cuaja a fuego medio y termina tapada para no usar más aceite."]; }
  else if (/pizza/i.test(dish)) { time = 20; icon = "🍕"; image = "./recipes/recipe-11.webp"; steps = ["Usa una base fina integral y extiende tomate triturado.", "Reparte verduras, proteína y poca mozzarella.", "Hornea fuerte 10–12 minutos hasta que los bordes estén crujientes."]; }
  else if (/arroz|paella/i.test(dish)) { time = 22; icon = "🥘"; image = "./recipes/recipe-02.webp"; steps = ["Saltea proteína y verduras en una sartén amplia.", "Añade el arroz y el doble de caldo o agua.", "Cocina sin remover hasta que el arroz esté tierno y deja reposar 3 minutos."]; }
  else if (/lentejas|garbanzos|judías|frijoles/i.test(dish)) { time = 18; icon = "🥘"; image = "./recipes/recipe-03.webp"; steps = ["Enjuaga la legumbre cocida si es de bote.", "Saltea verduras picadas con especias suaves.", "Añade la legumbre y una proteína ligera; calienta hasta que quede meloso."]; }

  const ingredients = ingredientCatalog.filter((ingredient) => ingredient.match.test(dish)).map((ingredient) => ingredient.label);
  const generatedImage = baseDishCatalog.some((item) => item.name === dish) ? `./recipes/dishes/${dishId(dish)}.webp` : image;
  return { dish, simple, time, icon, image: generatedImage, steps, ingredients: ingredients.length > 0 ? ingredients : ["Ingredientes principales del plato", "AOVE", "Sal y especias"] };
}

const traitBadgeDefinitions: RecipeBadge[] = [
  { id: "gluten-free", label: "Sin gluten*", symbol: "SG", description: "La receta propuesta no incluye ingredientes evidentes con gluten; revisa etiquetas y contaminación cruzada.", kind: "trait" },
  { id: "vegetarian", label: "Vegetariano", symbol: "V", description: "Sin carne ni pescado en el nombre de la receta.", kind: "trait" },
  { id: "vegan", label: "Vegano", symbol: "VG", description: "Sin ingredientes animales evidentes en la propuesta.", kind: "trait" },
  { id: "high-protein", label: "Proteína alta*", symbol: "P+", description: "Aporta al menos 45 g según la estimación editable del plato.", kind: "trait" },
  { id: "wholegrain", label: "Integral", symbol: "IN", description: "Incluye cereal integral, avena o quinoa.", kind: "trait" },
  { id: "legumes", label: "Con legumbre", symbol: "LG", description: "Incluye lentejas, garbanzos, judías o frijoles.", kind: "trait" },
  { id: "omega3", label: "Pescado azul", symbol: "Ω3", description: "Incluye salmón, sardina o caballa.", kind: "trait" },
  { id: "quick", label: "≤ 10 min", symbol: "10′", description: "Preparación estimada de diez minutos o menos.", kind: "trait" },
  { id: "vegetable-rich", label: "Con verdura", symbol: "½", description: "La propuesta incluye verdura o ensalada de forma explícita.", kind: "trait" },
  { id: "batch", label: "Cocina por lotes", symbol: "×2", description: "Plato fácil de preparar en más de una ración.", kind: "trait" },
];

const allergenBadgeDefinitions: RecipeBadge[] = [
  { id: "gluten", label: "Gluten", symbol: "GL", description: "Cereales con gluten o una salsa/producto que requiere comprobación.", kind: "allergen" },
  { id: "crustaceans", label: "Crustáceos", symbol: "CR", description: "Crustáceos o derivados.", kind: "allergen" },
  { id: "eggs", label: "Huevo", symbol: "HU", description: "Huevo o derivados.", kind: "allergen" },
  { id: "fish", label: "Pescado", symbol: "PE", description: "Pescado o derivados.", kind: "allergen" },
  { id: "peanuts", label: "Cacahuete", symbol: "CA", description: "Cacahuete o derivados.", kind: "allergen" },
  { id: "soy", label: "Soja", symbol: "SO", description: "Soja o derivados.", kind: "allergen" },
  { id: "milk", label: "Leche", symbol: "LE", description: "Leche o derivados, incluida lactosa.", kind: "allergen" },
  { id: "nuts", label: "Frutos de cáscara", symbol: "FC", description: "Almendra, nuez u otros frutos de cáscara.", kind: "allergen" },
  { id: "celery", label: "Apio", symbol: "AP", description: "Apio o derivados.", kind: "allergen" },
  { id: "mustard", label: "Mostaza", symbol: "MO", description: "Mostaza o derivados.", kind: "allergen" },
  { id: "sesame", label: "Sésamo", symbol: "SE", description: "Sésamo o derivados.", kind: "allergen" },
  { id: "sulphites", label: "Sulfitos", symbol: "SU", description: "Dióxido de azufre o sulfitos en concentración declarable.", kind: "allergen" },
  { id: "lupin", label: "Altramuz", symbol: "AL", description: "Altramuz o derivados.", kind: "allergen" },
  { id: "molluscs", label: "Moluscos", symbol: "ML", description: "Moluscos o derivados.", kind: "allergen" },
];

const allergenPatterns: Record<string, RegExp> = {
  gluten: /tostada|\bpan\b|pasta|cusc[uú]s|pizza|burrit|taco|fajita|quesadilla|avena|teriyaki|miso|sushi|poke/i,
  crustaceans: /gamba|langostino|cangrejo|bogavante|crust[aá]ceo/i,
  eggs: /huevo|tortilla|frittata/i,
  fish: /salm[oó]n|merluza|dorada|sardina|caballa|at[uú]n|pescado|sushi/i,
  peanuts: /cacahuete/i,
  soy: /soja|tofu|miso|edamame|teriyaki|sushi/i,
  milk: /yogur|k[eé]fir|leche|queso|mozzarella|caprese|avena caliente/i,
  nuts: /nueces|almendras|frutos secos/i,
  celery: /apio/i,
  mustard: /mostaza/i,
  sesame: /s[eé]samo|tahini/i,
  sulphites: /sulfitos/i,
  lupin: /altramuz/i,
  molluscs: /mejill[oó]n|ostra|calamar|pulpo|molusco/i,
};

function getRecipeBadges(dish: Dish, time: number) {
  const name = dish.name;
  const allergens = allergenBadgeDefinitions.filter((badge) => allergenPatterns[badge.id].test(name));
  const animalProtein = /pollo|pavo|ternera|jam[oó]n|salm[oó]n|merluza|dorada|sardina|caballa|at[uú]n|pescado/i.test(name);
  const animalIngredient = animalProtein || /huevo|tortilla|frittata|yogur|k[eé]fir|leche|queso|mozzarella|caprese|avena caliente/i.test(name);
  const traitIds = new Set<string>();
  if (!allergens.some((badge) => badge.id === "gluten")) traitIds.add("gluten-free");
  if (!animalProtein) traitIds.add("vegetarian");
  if (!animalIngredient) traitIds.add("vegan");
  if (dish.protein >= 45) traitIds.add("high-protein");
  if (/integral|avena|quinoa/i.test(name)) traitIds.add("wholegrain");
  if (/lenteja|garbanzo|jud[ií]a|frijol|hummus/i.test(name)) traitIds.add("legumes");
  if (/salm[oó]n|sardina|caballa/i.test(name)) traitIds.add("omega3");
  if (time <= 10) traitIds.add("quick");
  if (/verdura|ensalada|tomate|espinaca|br[oó]coli|calabac[ií]n|pepino|pimiento|coliflor|calabaza|r[uú]cula|kale/i.test(name)) traitIds.add("vegetable-rich");
  if (/lenteja|curry|chili|crema|pur[eé]|pasta|arroz|paella|alb[oó]ndiga|boloñesa/i.test(name)) traitIds.add("batch");
  return { traits: traitBadgeDefinitions.filter((badge) => traitIds.has(badge.id)), allergens };
}

function estimateDish(name: string, category: MealCategory): Omit<Dish, "id" | "name"> {
  let protein = category === "Desayuno" ? 32 : category === "Comida" ? 48 : 42;
  let carbs = category === "Desayuno" ? 68 : category === "Comida" ? 88 : 64;
  let fat = category === "Desayuno" ? 20 : category === "Comida" ? 27 : 24;
  if (/lenteja|garbanzo|frijol|judía|quinoa|tofu/i.test(name)) { protein += 5; carbs += 8; fat -= 3; }
  if (/salmón|aguacate|nueces|almendras|semillas|chía|AOVE|queso|mozzarella/i.test(name)) fat += 6;
  if (/ensalada|crema|puré|sopa|tortilla|frittata/i.test(name)) carbs -= 14;
  if (/arroz|pasta|pizza|poke|sushi|cuscús|patata|boniato|avena/i.test(name)) carbs += 10;
  if (/pollo|pavo|ternera|atún|merluza|dorada|salmón|huevo/i.test(name)) protein += 6;
  return { category, protein: Math.max(10, protein), carbs: Math.max(15, carbs), fat: Math.max(8, fat), builtIn: true };
}

const baseDishCatalog: Dish[] = (() => {
  const catalog = new Map<string, Dish>();
  meals.forEach((meal) => meal.options.forEach((week) => week.forEach((name, index) => {
    const id = dishId(name);
    if (!catalog.has(id)) catalog.set(id, { id, name, ...estimateDish(name, ["Desayuno", "Comida", "Cena"][index] as MealCategory) });
  })));
  return [...catalog.values()];
})();
const defaultMealPlans: MealPlan[] = menuWeekIndexes.map((week) => ({
  id: `base-week-${week + 1}`,
  name: `Semana ${week + 1}`,
  builtIn: true,
  days: Object.fromEntries(meals.map((meal) => [meal.day, meal.options[week].map(dishId)])),
}));
const defaultNutritionTargets: NutritionTargets = { kcal: 2200, protein: 130, carbs: 230, fat: 75, waterMl: 2000 };

const defaultState: SavedState = { completed: [], mealWeek: 0, mealChoices: {}, selectedMeals: [], shopping: [], dietExceptions: {}, custodyOverrides: {}, progress: [], dailyArchives: {}, exerciseGroups: defaultExerciseGroups, exerciseSchedule: { "2": "strength-a", "5": "strength-b" }, dishOverrides: {}, customDishes: [], mealPlans: defaultMealPlans, activeMealPlanId: "base-week-1", mealPlanAssignments: {}, nutritionTargets: defaultNutritionTargets, waterIntake: {}, weeklyHistory: [], trackingStartedAt: "2026-08-14", profile: defaultProfile };

export default function Home() {
  const [data, setData] = useState<SavedState>(defaultState);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(7);
  const [selectedDate, setSelectedDate] = useState("2026-08-14");
  const [editingCustody, setEditingCustody] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("today");
  const [activeMealDay, setActiveMealDay] = useState("Lunes");
  const [mealGrouping, setMealGrouping] = useState<"category" | "macro">("category");
  const [dishTraitFilters, setDishTraitFilters] = useState<string[]>([]);
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
  const [activeDishId, setActiveDishId] = useState<string | null>(null);
  const [newMealPlanName, setNewMealPlanName] = useState("");
  const [activeExerciseGroupId, setActiveExerciseGroupId] = useState("strength-a");
  const [exerciseGrouping, setExerciseGrouping] = useState<"category" | "muscle">("category");
  const [newGroupName, setNewGroupName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem("brujula-plan-v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          const firstRecipeVersion = parsed.mealWeek === undefined;
          setData({
            ...defaultState,
            ...parsed,
            mealPlans: parsed.mealPlans?.length ? parsed.mealPlans : defaultMealPlans,
            activeMealPlanId: parsed.activeMealPlanId ?? `base-week-${(parsed.mealWeek ?? 0) + 1}`,
            nutritionTargets: { ...defaultNutritionTargets, ...parsed.nutritionTargets },
            profile: { ...defaultProfile, ...parsed.profile, padelDay: firstRecipeVersion ? "Lunes" : (parsed.profile?.padelDay ?? "Lunes") },
          });
        }
      } catch { /* A corrupt local value should not block the planner. */ }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("brujula-plan-v1", JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    if (!activeRecipe && !activeExercise) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setActiveRecipe(null); setActiveExercise(null); } };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [activeExercise, activeRecipe]);

  const exerciseGroupById = useMemo(() => new Map(data.exerciseGroups.map((group) => [group.id, group])), [data.exerciseGroups]);
  const dishCatalog = useMemo(() => [
    ...baseDishCatalog.map((dish) => ({ ...dish, ...(data.dishOverrides[dish.id] ?? {}) })),
    ...data.customDishes,
  ], [data.customDishes, data.dishOverrides]);
  const dishById = useMemo(() => new Map(dishCatalog.map((dish) => [dish.id, dish])), [dishCatalog]);
  const mealPlanById = useMemo(() => new Map(data.mealPlans.map((plan) => [plan.id, plan])), [data.mealPlans]);
  const activeMealPlan = mealPlanById.get(data.activeMealPlanId) ?? data.mealPlans[0] ?? defaultMealPlans[0];
  const planForDate = (iso: string) => mealPlanById.get(data.mealPlanAssignments[weekStartIso(iso)]) ?? activeMealPlan;
  const weekPlan = useMemo(() => baseWeek.map((item, index) => {
    const jsDay = [1, 2, 3, 4, 5, 6, 0][index];
    const assignedGroup = exerciseGroupById.get(data.exerciseSchedule[String(jsDay)]);
    if (assignedGroup) return { ...item, title: assignedGroup.name, detail: `${assignedGroup.exerciseIds.length} ejercicios · rutina asignada`, tone: "strength", key: true };
    if (dayNames[jsDay] === data.profile.padelDay) return { ...item, title: "Pádel", detail: `60 min · ${data.profile.padelDay.toLowerCase()}`, tone: "padel", key: true };
    return item;
  }), [data.exerciseSchedule, data.profile.padelDay, exerciseGroupById]);
  const latest = data.progress.at(-1);
  const currentWeight = latest?.weight ?? data.profile.startWeight;
  const currentWaist = latest?.waist ?? data.profile.waist;
  const lost = Math.max(0, data.profile.startWeight - currentWeight);
  const goalProgress = Math.min(100, Math.max(0, Math.round((lost / (data.profile.startWeight - data.profile.goalWeight)) * 100)));
  const hasNoa = (date: string) => data.custodyOverrides[date] ?? noaDateSet.has(date);
  const workoutForDay = (jsDay: number) => {
    const assignedGroup = exerciseGroupById.get(data.exerciseSchedule[String(jsDay)]);
    if (assignedGroup) return `${assignedGroup.name} · ${assignedGroup.exerciseIds.length} ejercicios`;
    return dayNames[jsDay] === data.profile.padelDay ? "Pádel · 60 min" : workoutByDay[jsDay];
  };
  const selectedDishes = meals.flatMap((meal) => (activeMealPlan.days[meal.day] ?? []).map((id, index) => ({ key: `${meal.day}-${index}`, dish: dishById.get(id)?.name ?? "Plato sin definir" })).filter((entry) => data.selectedMeals.includes(entry.key)));
  const shoppingItems = ingredientCatalog.map((ingredient) => {
    const matches = selectedDishes.filter(({ dish }) => ingredient.match.test(dish)).length;
    return { ...ingredient, matches, total: ingredient.amount * matches };
  }).filter((ingredient) => ingredient.matches > 0);
  const shoppingCategories = ["Proteínas", "Verdura y fruta", "Despensa"];
  const monthDays = useMemo(() => {
    const firstDay = new Date(2026, calendarMonth, 1);
    const daysInMonth = new Date(2026, calendarMonth + 1, 0).getDate();
    const leading = (firstDay.getDay() + 6) % 7;
    return [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  }, [calendarMonth]);
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
  const selectedHoliday = barcelonaHolidays2026[selectedDate];
  const selectedDietExceptions = data.dietExceptions[selectedDate] ?? [];
  const selectedMealDay = meals[mondayMealIndex(selectedDateObject.getDay())];
  const selectedDateMealPlan = planForDate(selectedDate);
  const selectedDateDishIds = selectedDateMealPlan.days[selectedMealDay.day] ?? [];
  const selectedDateDishes = selectedDateDishIds.map((id) => dishById.get(id)).filter((dish): dish is Dish => Boolean(dish));
  const selectedMenu = selectedDateDishes.map((dish) => dish.name);
  const selectedWaterMl = data.waterIntake[selectedDate] ?? 0;
  const selectedWaterPercent = Math.min(100, Math.round((selectedWaterMl / Math.max(1, data.nutritionTargets.waterMl)) * 100));
  const activeRecipeData = activeRecipe ? getRecipe(activeRecipe) : null;
  const activeRecipeDish = activeRecipe ? dishCatalog.find((dish) => dish.name === activeRecipe) : undefined;
  const activeRecipeBadges = activeRecipeDish && activeRecipeData ? getRecipeBadges(activeRecipeDish, activeRecipeData.time) : { traits: [], allergens: [] };
  const now = new Date();
  const todayIso = now.getFullYear() === 2026 ? toIsoDate(2026, now.getMonth(), now.getDate()) : "2026-08-14";
  const weekAnchor = new Date(`${todayIso}T12:00:00`);
  const weekMonday = new Date(weekAnchor);
  weekMonday.setDate(weekAnchor.getDate() - ((weekAnchor.getDay() + 6) % 7));
  const weekDates = weekPlan.map((_, index) => { const date = new Date(weekMonday); date.setDate(weekMonday.getDate() + index); return toIsoDate(date.getFullYear(), date.getMonth(), date.getDate()); });
  const selectedPlanItem = weekPlan[mondayMealIndex(selectedDateObject.getDay())];
  const selectedMealKeys = [0, 1, 2].map((index) => `${selectedMealDay.day}-${index}`);
  const selectedDayArchive = data.dailyArchives[selectedDate];
  const selectedWorkoutCompleted = data.completed.includes(selectedPlanItem.id);
  const selectedCompletedMeals = [0, 1, 2].filter((index) => data.selectedMeals.includes(selectedMealKeys[index]));
  const visibleWeekDone = weekPlan.map((item, index) => data.dailyArchives[weekDates[index]]?.workoutCompleted ?? data.completed.includes(item.id));
  const keyCompleted = weekPlan.filter((item, index) => item.key && visibleWeekDone[index]).length;
  const completion = Math.round((visibleWeekDone.filter(Boolean).length / weekPlan.length) * 100);
  const archivedDays = Object.values(data.dailyArchives);
  const trackedDays = archivedDays.length;
  const totalHabitExceptions = archivedDays.reduce((total, day) => total + day.habitExceptions.length, 0);
  const overallHabitRate = trackedDays === 0 ? 0 : Math.max(0, Math.round(((trackedDays * dailyDietCommitments.length - totalHabitExceptions) / (trackedDays * dailyDietCommitments.length)) * 100));
  const hydratedDays = archivedDays.filter((day) => (day.waterMl ?? 0) >= data.nutritionTargets.waterMl).length;
  const hydrationRate = trackedDays === 0 ? 0 : Math.round((hydratedDays / trackedDays) * 100);
  const waistLost = Math.max(0, data.profile.waist - currentWaist);
  const habitHistory = dailyDietCommitments.map((habit) => {
    const exceptions = archivedDays.filter((day) => day.habitExceptions.includes(habit.id)).length;
    return { ...habit, exceptions, rate: trackedDays === 0 ? 0 : Math.max(0, Math.round(((trackedDays - exceptions) / trackedDays) * 100)) };
  });
  const activeExerciseGroup = data.exerciseGroups.find((group) => group.id === activeExerciseGroupId) ?? data.exerciseGroups[0];
  const activeDayDishIds = activeMealPlan.days[activeMealDay] ?? [];
  const activeDayDishes = activeDayDishIds.map((id) => dishById.get(id)).filter((dish): dish is Dish => Boolean(dish));
  const activeDayTotals = activeDayDishes.reduce((totals, dish) => ({ kcal: totals.kcal + nutritionKcal(dish), protein: totals.protein + dish.protein, carbs: totals.carbs + dish.carbs, fat: totals.fat + dish.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const macroEnergy = { protein: activeDayTotals.protein * 4, carbs: activeDayTotals.carbs * 4, fat: activeDayTotals.fat * 9 };
  const macroEnergyTotal = Math.max(1, macroEnergy.protein + macroEnergy.carbs + macroEnergy.fat);
  const macroPercent = { protein: Math.round(macroEnergy.protein / macroEnergyTotal * 100), carbs: Math.round(macroEnergy.carbs / macroEnergyTotal * 100), fat: Math.round(macroEnergy.fat / macroEnergyTotal * 100) };
  const proteinStop = macroPercent.protein;
  const carbsStop = macroPercent.protein + macroPercent.carbs;
  const targetChecks = {
    kcal: activeDayTotals.kcal >= data.nutritionTargets.kcal * 0.85 && activeDayTotals.kcal <= data.nutritionTargets.kcal * 1.15,
    protein: activeDayTotals.protein >= data.nutritionTargets.protein * 0.85 && activeDayTotals.protein <= data.nutritionTargets.protein * 1.4,
    carbs: activeDayTotals.carbs >= data.nutritionTargets.carbs * 0.7 && activeDayTotals.carbs <= data.nutritionTargets.carbs * 1.3,
    fat: activeDayTotals.fat >= data.nutritionTargets.fat * 0.7 && activeDayTotals.fat <= data.nutritionTargets.fat * 1.3,
  };
  const activeDayOk = activeDayDishes.length === 3 && Object.values(targetChecks).every(Boolean);
  const dominantMacro = (dish: Dish) => {
    const shares = { Proteína: dish.protein * 4, Hidratos: dish.carbs * 4, Grasas: dish.fat * 9 };
    return Object.entries(shares).sort((a, b) => b[1] - a[1])[0][0];
  };
  const mealCatalogSections = useMemo(() => {
    const sections = new Map<string, Dish[]>();
    dishCatalog.forEach((dish) => {
      const badges = getRecipeBadges(dish, getRecipe(dish.name).time);
      if (!dishTraitFilters.every((filter) => badges.traits.some((badge) => badge.id === filter))) return;
      if (badges.allergens.some((badge) => excludedAllergens.includes(badge.id))) return;
      const key = mealGrouping === "category" ? dish.category : dominantMacro(dish);
      sections.set(key, [...(sections.get(key) ?? []), dish]);
    });
    return [...sections.entries()];
  }, [dishCatalog, dishTraitFilters, excludedAllergens, mealGrouping]);
  const filteredDishCount = mealCatalogSections.reduce((total, [, dishes]) => total + dishes.length, 0);
  const activeDish = activeDishId ? dishById.get(activeDishId) : undefined;
  const exerciseCatalogSections = useMemo(() => {
    const sections = new Map<string, Exercise[]>();
    allExercises.forEach((exercise) => {
      const key = exerciseGrouping === "category" ? exercise.category : exercise.muscle;
      sections.set(key, [...(sections.get(key) ?? []), exercise]);
    });
    return [...sections.entries()];
  }, [exerciseGrouping]);
  const nextFreeDate = (() => {
    const cursor = new Date(selectedDateObject);
    for (let offset = 1; offset <= 7; offset += 1) {
      cursor.setDate(cursor.getDate() + 1);
      const iso = toIsoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      if (!hasNoa(iso)) return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(cursor);
    }
    return "el siguiente día disponible";
  })();

  const toggleCompleted = (id: string) => setData((current) => ({ ...current, completed: current.completed.includes(id) ? current.completed.filter((item) => item !== id) : [...current.completed, id] }));
  const toggleShopping = (item: string) => setData((current) => ({ ...current, shopping: current.shopping.includes(item) ? current.shopping.filter((value) => value !== item) : [...current.shopping, item] }));
  const toggleMeal = (key: string) => setData((current) => ({ ...current, selectedMeals: current.selectedMeals.includes(key) ? current.selectedMeals.filter((item) => item !== key) : [...current.selectedMeals, key] }));
  const toggleListFilter = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const setWater = (date: string, value: number) => setData((current) => ({ ...current, waterIntake: { ...current.waterIntake, [date]: Math.min(5000, Math.max(0, value)) } }));
  const toggleCustody = (date: string) => setData((current) => ({ ...current, custodyOverrides: { ...current.custodyOverrides, [date]: !(current.custodyOverrides[date] ?? noaDateSet.has(date)) } }));
  const toggleDietException = (date: string, habitId: string) => setData((current) => {
    const exceptions = current.dietExceptions[date] ?? [];
    const nextExceptions = exceptions.includes(habitId) ? exceptions.filter((id) => id !== habitId) : [...exceptions, habitId];
    return { ...current, dietExceptions: { ...current.dietExceptions, [date]: nextExceptions } };
  });
  const renameExerciseGroup = (groupId: string, name: string) => setData((current) => ({ ...current, exerciseGroups: current.exerciseGroups.map((group) => group.id === groupId ? { ...group, name } : group) }));
  const toggleExerciseInGroup = (groupId: string, exerciseId: string) => setData((current) => ({
    ...current,
    exerciseGroups: current.exerciseGroups.map((group) => group.id === groupId ? { ...group, exerciseIds: group.exerciseIds.includes(exerciseId) ? group.exerciseIds.filter((id) => id !== exerciseId) : [...group.exerciseIds, exerciseId] } : group),
  }));
  const createExerciseGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fallbackLetter = String.fromCharCode(65 + data.exerciseGroups.filter((group) => /^Fuerza [A-Z]/.test(group.name)).length);
    const name = newGroupName.trim() || `Fuerza ${fallbackLetter}`;
    const id = `custom-${Date.now()}`;
    setData((current) => ({ ...current, exerciseGroups: [...current.exerciseGroups, { id, name, exerciseIds: [] }] }));
    setActiveExerciseGroupId(id);
    setNewGroupName("");
  };
  const deleteExerciseGroup = (groupId: string) => {
    const fallback = data.exerciseGroups.find((group) => group.id !== groupId)?.id ?? "strength-a";
    setData((current) => ({
      ...current,
      exerciseGroups: current.exerciseGroups.filter((group) => group.id !== groupId),
      exerciseSchedule: Object.fromEntries(Object.entries(current.exerciseSchedule).filter(([, assignedId]) => assignedId !== groupId)),
    }));
    setActiveExerciseGroupId(fallback);
  };
  const assignExerciseGroup = (jsDay: number, groupId: string) => setData((current) => {
    const nextSchedule = { ...current.exerciseSchedule };
    if (groupId) nextSchedule[String(jsDay)] = groupId;
    else delete nextSchedule[String(jsDay)];
    return { ...current, exerciseSchedule: nextSchedule };
  });
  const updateNutritionTarget = (field: keyof NutritionTargets, value: string) => setData((current) => ({ ...current, nutritionTargets: { ...current.nutritionTargets, [field]: Math.max(0, Number(value)) } }));
  const updateDish = (id: string, patch: Partial<Dish>) => setData((current) => {
    const custom = current.customDishes.some((dish) => dish.id === id);
    return custom
      ? { ...current, customDishes: current.customDishes.map((dish) => dish.id === id ? { ...dish, ...patch } : dish) }
      : { ...current, dishOverrides: { ...current.dishOverrides, [id]: { ...(current.dishOverrides[id] ?? {}), ...patch } } };
  });
  const createDish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("dish-name") ?? "").trim();
    if (!name) return;
    const dish: Dish = { id: `custom-dish-${Date.now()}`, name, category: String(form.get("dish-category")) as MealCategory, protein: Number(form.get("dish-protein")) || 0, carbs: Number(form.get("dish-carbs")) || 0, fat: Number(form.get("dish-fat")) || 0 };
    setData((current) => ({ ...current, customDishes: [...current.customDishes, dish] }));
    setActiveDishId(dish.id);
    event.currentTarget.reset();
  };
  const deleteDish = (id: string) => {
    setData((current) => ({ ...current, customDishes: current.customDishes.filter((dish) => dish.id !== id) }));
    setActiveDishId(null);
  };
  const updateMealSlot = (day: string, index: number, dish: string) => setData((current) => ({
    ...current,
    mealPlans: current.mealPlans.map((plan) => plan.id === activeMealPlan.id ? { ...plan, days: { ...plan.days, [day]: [0, 1, 2].map((slot) => slot === index ? dish : (plan.days[day]?.[slot] ?? "")) } } : plan),
  }));
  const renameMealPlan = (name: string) => setData((current) => ({ ...current, mealPlans: current.mealPlans.map((plan) => plan.id === activeMealPlan.id ? { ...plan, name } : plan) }));
  const createMealPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = `custom-menu-${Date.now()}`;
    const name = newMealPlanName.trim() || `Mi semana ${data.mealPlans.length + 1}`;
    const plan: MealPlan = { id, name, days: Object.fromEntries(Object.entries(activeMealPlan.days).map(([day, ids]) => [day, [...ids]])) };
    setData((current) => ({ ...current, mealPlans: [...current.mealPlans, plan], activeMealPlanId: id }));
    setNewMealPlanName("");
  };
  const deleteMealPlan = (id: string) => {
    if (activeMealPlan.builtIn) return;
    const fallback = data.mealPlans.find((plan) => plan.id !== id) ?? defaultMealPlans[0];
    setData((current) => ({ ...current, mealPlans: current.mealPlans.filter((plan) => plan.id !== id), activeMealPlanId: fallback.id, mealPlanAssignments: Object.fromEntries(Object.entries(current.mealPlanAssignments).filter(([, planId]) => planId !== id)) }));
  };
  const assignMealPlanToWeek = (iso: string, planId: string) => setData((current) => ({ ...current, mealPlanAssignments: { ...current.mealPlanAssignments, [weekStartIso(iso)]: planId } }));
  const archiveSelectedDay = () => setData((current) => ({
    ...current,
    dailyArchives: {
      ...current.dailyArchives,
      [selectedDate]: {
        date: selectedDate,
        archivedAt: Date.now(),
        workoutCompleted: current.completed.includes(selectedPlanItem.id),
        completedMeals: [0, 1, 2].filter((index) => current.selectedMeals.includes(selectedMealKeys[index])),
        habitExceptions: current.dietExceptions[selectedDate] ?? [],
        waterMl: current.waterIntake[selectedDate] ?? 0,
      },
    },
  }));
  const openView = (view: ActiveView) => {
    if (view === "today") {
      const now = new Date();
      const planDate = now.getFullYear() === 2026 ? toIsoDate(2026, now.getMonth(), now.getDate()) : "2026-08-14";
      setSelectedDate(planDate);
      setCalendarMonth(Number(planDate.slice(5, 7)) - 1);
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const prepareNextWeek = () => {
    setData((current) => {
      const anchor = new Date(`${todayIso}T12:00:00`);
      const mondayOffset = (anchor.getDay() + 6) % 7;
      const monday = new Date(anchor);
      monday.setDate(anchor.getDate() - mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const weekStart = toIsoDate(monday.getFullYear(), monday.getMonth(), monday.getDate());
      const weekEnd = toIsoDate(sunday.getFullYear(), sunday.getMonth(), sunday.getDate());
      const archivedWeek = Object.values(current.dailyArchives).filter((entry) => entry.date >= weekStart && entry.date <= weekEnd);
      const habitExceptions = archivedWeek.reduce((total, entry) => total + entry.habitExceptions.length, 0);
      const snapshot: WeeklyHistoryEntry = { id: Date.now(), weekStart, weekEnd, completed: archivedWeek.filter((entry) => entry.workoutCompleted).length, keyCompleted: weekPlan.filter((item, index) => item.key && current.dailyArchives[weekDates[index]]?.workoutCompleted).length, keyTotal: weekPlan.filter((item) => item.key).length, habitExceptions, selectedMeals: archivedWeek.reduce((total, entry) => total + entry.completedMeals.length, 0), weight: current.progress.at(-1)?.weight ?? current.profile.startWeight, waist: current.progress.at(-1)?.waist ?? current.profile.waist };
      return { ...current, completed: [], shopping: [], selectedMeals: [], weeklyHistory: [...current.weeklyHistory.filter((entry) => entry.weekStart !== weekStart), snapshot].slice(-24) };
    });
    setActiveView("history");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addProgress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const weight = Number(form.get("weight"));
    const waist = Number(form.get("waist"));
    const date = String(form.get("date"));
    if (!weight || !waist || !date) return;
    setData((current) => ({ ...current, progress: [...current.progress, { id: Date.now(), date, weight, waist }].slice(-12) }));
    event.currentTarget.reset();
  };

  const updateProfile = (field: keyof Profile, value: string) => setData((current) => ({ ...current, profile: { ...current.profile, [field]: field === "padelDay" ? value : Number(value) } }));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "brujula-datos.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setData({ ...defaultState, ...parsed, mealPlans: parsed.mealPlans?.length ? parsed.mealPlans : defaultMealPlans, activeMealPlanId: parsed.activeMealPlanId ?? `base-week-${(parsed.mealWeek ?? 0) + 1}`, nutritionTargets: { ...defaultNutritionTargets, ...parsed.nutritionTargets } });
      }
      catch { window.alert("No se ha podido leer el archivo de Brújula."); }
    };
    reader.readAsText(file);
  };

  return (
    <main className={ready ? "ready app-shell" : "loading app-shell"} data-active-view={activeView}>
      <header className="topbar">
        <button className="brand" type="button" aria-label="Brújula, ir a hoy" onClick={() => openView("today")}><span className="brand-mark">B</span><span>Brújula</span></button>
        <nav aria-label="Navegación principal">
          <button className={activeView === "today" ? "active" : ""} type="button" aria-current={activeView === "today" ? "page" : undefined} onClick={() => openView("today")}>Hoy</button>
          <button className={activeView === "week" ? "active" : ""} type="button" aria-current={activeView === "week" ? "page" : undefined} onClick={() => openView("week")}>Semana</button>
          <button className={activeView === "calendar" ? "active" : ""} type="button" aria-current={activeView === "calendar" ? "page" : undefined} onClick={() => openView("calendar")}>Calendario</button>
          <button className={activeView === "exercises" ? "active" : ""} type="button" aria-current={activeView === "exercises" ? "page" : undefined} onClick={() => openView("exercises")}>Ejercicios</button>
          <button className={activeView === "meals" ? "active" : ""} type="button" aria-current={activeView === "meals" ? "page" : undefined} onClick={() => openView("meals")}>Comidas</button>
          <button className={activeView === "progress" ? "active" : ""} type="button" aria-current={activeView === "progress" ? "page" : undefined} onClick={() => openView("progress")}>Progreso</button>
          <button className={activeView === "history" ? "active" : ""} type="button" aria-current={activeView === "history" ? "page" : undefined} onClick={() => openView("history")}>Histórico</button>
        </nav>
        <button className="quiet-button" type="button" onClick={() => setSettingsOpen(!settingsOpen)}>Ajustar plan</button>
      </header>

      {settingsOpen && (
        <section className="settings-panel" aria-label="Ajustes del plan">
          <div className="settings-heading"><div><p className="eyebrow">TU PLAN</p><h2>Ajustes sencillos</h2></div><button type="button" onClick={() => setSettingsOpen(false)}>Cerrar ×</button></div>
          <div className="settings-grid">
            <label>Peso inicial (kg)<input type="number" value={data.profile.startWeight} onChange={(event) => updateProfile("startWeight", event.target.value)} /></label>
            <label>Objetivo (kg)<input type="number" value={data.profile.goalWeight} onChange={(event) => updateProfile("goalWeight", event.target.value)} /></label>
            <label>Cintura inicial (cm)<input type="number" value={data.profile.waist} onChange={(event) => updateProfile("waist", event.target.value)} /></label>
            <label>Día de pádel<select value={data.profile.padelDay} onChange={(event) => updateProfile("padelDay", event.target.value)}>{["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map((day) => <option key={day}>{day}</option>)}</select></label>
          </div>
          <div className="data-actions"><button type="button" onClick={exportData}>Exportar copia</button><button type="button" onClick={() => fileInput.current?.click()}>Importar copia</button><input ref={fileInput} hidden type="file" accept="application/json" onChange={importData} /><span>Los datos viven solo en este navegador.</span></div>
        </section>
      )}

      <section className="hero" id="inicio" hidden={activeView !== "today"}>
        <div className="hero-copy">
          <p className="eyebrow">{new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(selectedDateObject).toUpperCase()}</p>
          <h1>Hoy,<br /><em>sin ruido.</em></h1>
          <p className="intro">Movimiento, comidas y compromisos en una sola vista. Lo demás puede esperar.</p>
          <div className="hero-actions"><button className="primary-button" type="button" onClick={() => openView("week")}>Ver esta semana <span>→</span></button><span className="microcopy">Empieza pequeño. Repite.</span></div>
        </div>
        <div className="route-card" aria-label="Ruta de objetivos de peso">
          <div className="route-head"><span>LA RUTA, NO LA CARRERA</span><strong>{goalProgress}% recorrido</strong></div>
          <div className="route-line" aria-hidden="true"><span className="route-dot current" /><span className="route-path"><i style={{ width: `${Math.max(8, goalProgress)}%` }} /></span><span className="route-dot waypoint" /><span className="route-path future" /><span className="route-dot goal" /></div>
          <div className="route-labels"><div><strong>{data.profile.startWeight} kg</strong><span>Inicio</span></div><div><strong>94–96 kg</strong><span>Primera meta</span></div><div><strong>{data.profile.goalWeight} kg</strong><span>Destino</span></div></div>
          <p>La primera victoria no son 13 kg: es demostrarte durante 12 semanas que este ritmo cabe en tu vida.</p>
        </div>
      </section>

      <section className="signal-grid" aria-label="Indicadores principales" hidden={activeView !== "today"}>
        <article><span>GUÍA DIARIA</span><strong>2.200–2.400</strong><small>kcal orientativas</small></article>
        <article><span>AHORA</span><strong>{currentWaist}</strong><small>cm de cintura</small></article>
        <article className="success-card"><span>ESTA SEMANA</span><strong>{completion}%</strong><small>{completion >= 80 ? "semana ganada" : "todo suma"}</small></article>
      </section>

      <section className="today-dashboard" aria-label="Plan del día" hidden={activeView !== "today"}>
        <article className="today-plan-card">
          <div className="dashboard-card-heading"><div><p className="eyebrow">PLAN DEL DÍA</p><h2>{hasNoa(selectedDate) ? "Descanso y comidas" : "Tu siguiente paso"}</h2></div>{selectedHoliday && <span className="today-holiday">{selectedHoliday.name}</span>}</div>
          <div className="today-plan-list">
            <div className="today-movement"><span>Movimiento</span><strong>{hasNoa(selectedDate) ? "Descanso programado" : workoutForDay(selectedDateObject.getDay())}</strong><button className={selectedWorkoutCompleted ? "today-check checked" : "today-check"} type="button" aria-label={`${selectedWorkoutCompleted ? "Desmarcar" : "Marcar"} movimiento de hoy`} aria-pressed={selectedWorkoutCompleted} onClick={() => toggleCompleted(selectedPlanItem.id)}>{selectedWorkoutCompleted ? "✓" : ""}</button></div>
            {selectedMenu.map((dish, index) => { const picked = selectedCompletedMeals.includes(index); return <div className="today-meal-row" key={dish}><span>{["Desayuno", "Comida", "Cena"][index]}</span><strong>{dish}</strong><button className={picked ? "today-check checked" : "today-check"} type="button" aria-label={`${picked ? "Desmarcar" : "Marcar"} ${["desayuno", "comida", "cena"][index]} de hoy`} aria-pressed={picked} onClick={() => toggleMeal(selectedMealKeys[index])}>{picked ? "✓" : ""}</button><button type="button" aria-label={`Ver receta de ${dish}`} onClick={() => setActiveRecipe(dish)}>💡</button></div>; })}
          </div>
          <div className={selectedDayArchive ? "daily-close archived" : "daily-close"}>
            <div><span>{selectedDayArchive ? "DÍA ARCHIVADO" : "CIERRE DEL DÍA"}</span><strong>{selectedDayArchive ? `${selectedDayArchive.workoutCompleted ? "Movimiento hecho" : "Movimiento pendiente"} · ${selectedDayArchive.completedMeals.length}/3 comidas · ${dailyDietCommitments.length - selectedDayArchive.habitExceptions.length}/5 hábitos · ${selectedDayArchive.waterMl ?? 0} ml` : "Guarda lo que realmente ocurrió hoy."}</strong></div>
            <button type="button" onClick={archiveSelectedDay}>{selectedDayArchive ? "Actualizar archivo" : "Archivar este día"}</button>
          </div>
        </article>
        <article className="today-habits-card">
          <div className="dashboard-card-heading"><div><p className="eyebrow">COMPROMISOS</p><h2>{dailyDietCommitments.length - selectedDietExceptions.length}/{dailyDietCommitments.length} cumplidos</h2></div></div>
          <div className="today-habits-list">{dailyDietCommitments.map((habit) => { const missed = selectedDietExceptions.includes(habit.id); return <button className={missed ? "today-habit missed" : "today-habit met"} type="button" aria-pressed={missed} onClick={() => toggleDietException(selectedDate, habit.id)} key={habit.id}><span aria-hidden="true">{missed ? "×" : "✓"}</span><strong>{habit.title}</strong></button>; })}</div>
        </article>
        <article className="today-water-card">
          <div className="water-copy"><div><p className="eyebrow">HIDRATACIÓN</p><h2>{selectedWaterMl.toLocaleString("es-ES")} <small>ml</small></h2></div><div className="water-ring" style={{ "--water-level": `${selectedWaterPercent}%` } as React.CSSProperties}><span>{selectedWaterPercent}%</span></div></div>
          <div className="water-glasses" role="group" aria-label="Vasos de agua del día">{Array.from({ length: Math.max(1, Math.ceil(data.nutritionTargets.waterMl / 250)) }, (_, index) => { const amount = (index + 1) * 250; const filled = selectedWaterMl >= amount; return <button className={filled ? "filled" : ""} type="button" aria-label={`${filled ? "Quitar" : "Registrar"} vaso ${index + 1}, ${amount} mililitros`} aria-pressed={filled} onClick={() => setWater(selectedDate, filled && selectedWaterMl === amount ? amount - 250 : amount)} key={amount}><span>◆</span></button>; })}</div>
          <div className="water-controls"><button type="button" onClick={() => setWater(selectedDate, selectedWaterMl - 250)} disabled={selectedWaterMl === 0}>− 250 ml</button><span>Meta {data.nutritionTargets.waterMl.toLocaleString("es-ES")} ml</span><button type="button" onClick={() => setWater(selectedDate, selectedWaterMl + 250)}>+ 250 ml</button></div>
        </article>
        <article className="today-week-card">
          <div className="dashboard-card-heading"><div><p className="eyebrow">ESTA SEMANA</p><h2>De un vistazo</h2></div><button type="button" onClick={() => openView("calendar")}>Ver calendario</button></div>
          <div className="today-mini-week">{weekPlan.map((item, index) => { const archived = data.dailyArchives[weekDates[index]]; const done = archived?.workoutCompleted ?? data.completed.includes(item.id); return <button className={`${done ? "done" : ""} ${archived ? "archived" : ""}`} type="button" onClick={() => openView("week")} key={item.id}><span>{item.day} · {Number(weekDates[index].slice(-2))}</span><strong>{archived ? "✓ Archivado" : item.title}</strong></button>; })}</div>
        </article>
      </section>

      <section className="week-section" id="semana" hidden={activeView !== "week"}>
        <div className="section-heading"><div><p className="eyebrow">MOVIMIENTO</p><h2>Tu semana, de un vistazo</h2></div><p><strong>{keyCompleted} de {weekPlan.filter((item) => item.key).length} sesiones clave</strong> completadas.<br />Los paseos también cuentan.</p></div>
        <div className="week-grid">
          {weekPlan.map((item, index) => { const date = weekDates[index]; const archived = data.dailyArchives[date]; const done = archived?.workoutCompleted ?? data.completed.includes(item.id); return (
            <article className={`day-card ${item.tone} ${done ? "done" : ""} ${archived ? "archived" : ""}`} key={item.id}>
              <div className="day-top"><span>{item.day} · {Number(date.slice(-2))}</span><button type="button" disabled={Boolean(archived)} aria-label={archived ? `${item.title}, día archivado` : `${done ? "Desmarcar" : "Marcar"} ${item.title}`} aria-pressed={done} onClick={() => toggleCompleted(item.id)}>{archived ? "◼" : done ? "✓" : ""}</button></div>
              <h3>{item.title}</h3><p>{item.detail}</p>{item.key && <small className="key-label">sesión clave</small>}
              {archived && <div className="day-archive-summary"><strong>Día archivado</strong><span>{archived.completedMeals.length}/3 comidas · {dailyDietCommitments.length - archived.habitExceptions.length}/5 hábitos · {archived.waterMl ?? 0} ml</span></div>}
            </article>
          ); })}
        </div>

        <div className="training-detail">
          <article><p className="eyebrow">FUERZA A</p><h3>Base y empuje</h3><ol className="exercise-list">{strengthA.map((exercise) => <li key={exercise.id}><span><strong>{exercise.name}</strong><small>{exercise.prescription}</small></span><button type="button" aria-label={`Ver ilustración de ${exercise.name}`} title={`Ver ${exercise.name}`} onClick={() => setActiveExercise(exercise)}>🏋</button></li>)}</ol></article>
          <article><p className="eyebrow">FUERZA B</p><h3>Tirón y estabilidad</h3><ol className="exercise-list">{strengthB.map((exercise) => <li key={exercise.id}><span><strong>{exercise.name}</strong><small>{exercise.prescription}</small></span><button type="button" aria-label={`Ver ilustración de ${exercise.name}`} title={`Ver ${exercise.name}`} onClick={() => setActiveExercise(exercise)}>🏋</button></li>)}</ol></article>
          <aside><p className="eyebrow">PROGRESIÓN</p><h3>Hazlo sostenible</h3><p><strong>Semanas 1–2:</strong> una sesión de fuerza basta.</p><p><strong>Semanas 3–6:</strong> intenta completar las dos.</p><p><strong>Semanas 7–12:</strong> añade peso solo si terminas con 2 repeticiones “en reserva”.</p></aside>
        </div>
      </section>

      <section className="agenda-section" id="agenda" hidden={activeView !== "calendar"}>
        <div className="section-heading light agenda-heading">
          <div><p className="eyebrow">VISTA COMPLETA</p><h2>Calendario</h2></div>
          <p>Los <strong>{noaDates.length} días azules</strong> del Excel quedan libres de entrenamiento. Los festivos oficiales de Barcelona aparecen en naranja para anticipar horarios, deporte y comidas.</p>
        </div>
        <div className="calendar-toolbar">
          <div className="month-navigation">
            <button type="button" aria-label="Mes anterior" onClick={() => { const month = Math.max(0, calendarMonth - 1); setCalendarMonth(month); setSelectedDate(toIsoDate(2026, month, 1)); }} disabled={calendarMonth === 0}>←</button>
            <strong>{monthNames[calendarMonth]} 2026</strong>
            <button type="button" aria-label="Mes siguiente" onClick={() => { const month = Math.min(11, calendarMonth + 1); setCalendarMonth(month); setSelectedDate(toIsoDate(2026, month, 1)); }} disabled={calendarMonth === 11}>→</button>
          </div>
          <div className="calendar-legend"><span><i className="noa-swatch" /> Con Noa · sin entreno</span><span><i className="holiday-swatch" /> Festivo</span><span><i className="free-swatch" /> Disponible</span></div>
          <button className={editingCustody ? "edit-custody active" : "edit-custody"} type="button" onClick={() => setEditingCustody(!editingCustody)}>{editingCustody ? "Terminar edición" : "Corregir días"}</button>
        </div>
        {editingCustody && <p className="edit-hint">Modo edición activo: pulsa cualquier día para añadirlo o quitarlo del calendario de Noa. Los cambios se guardan en este navegador.</p>}
        <div className="calendar-layout">
          <div className="calendar-card">
            <div className="calendar-weekdays">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">
              {monthDays.map((day, index) => {
                if (day === null) return <span className="calendar-empty" key={`empty-${index}`} />;
                const iso = toIsoDate(2026, calendarMonth, day);
                const date = new Date(2026, calendarMonth, day);
                const custody = hasNoa(iso);
                const holiday = barcelonaHolidays2026[iso];
                const exceptionCount = (data.dietExceptions[iso] ?? []).length;
                const mealDay = meals[mondayMealIndex(date.getDay())];
                const mealCount = data.dailyArchives[iso]?.completedMeals.length ?? [0, 1, 2].filter((mealIndex) => data.selectedMeals.includes(`${mealDay.day}-${mealIndex}`)).length;
                return (
                  <button
                    type="button"
                    className={`calendar-day ${custody ? "with-noa" : "free-day"} ${holiday ? "holiday" : ""} ${data.dailyArchives[iso] ? "archived" : ""} ${selectedDate === iso ? "selected" : ""}`}
                    key={iso}
                    aria-label={`${day} de ${monthNames[calendarMonth]}${holiday ? `, festivo: ${holiday.name}` : ""}, ${custody ? "con Noa, sin entrenamiento" : workoutForDay(date.getDay())}`}
                    onClick={() => { setSelectedDate(iso); if (editingCustody) toggleCustody(iso); }}
                  >
                    <span className="date-number">{day}</span>
                    {holiday && <span className="holiday-badge">Festivo</span>}
                    <span className="custody-label">{custody ? "Noa" : workoutForDay(date.getDay()).split(" · ")[0]}</span>
                    {mealCount > 0 && <small>{mealCount} {mealCount === 1 ? "plato" : "platos"}</small>}
                    {exceptionCount > 0 && <small className="habit-misses">{exceptionCount} {exceptionCount === 1 ? "excepción" : "excepciones"}</small>}
                    {data.dailyArchives[iso] && <small className="calendar-archived">✓ archivado</small>}
                  </button>
                );
              })}
            </div>
          </div>
          <aside className={hasNoa(selectedDate) ? "day-focus with-noa" : "day-focus"}>
            <p className="eyebrow">{new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(selectedDateObject).toUpperCase()}</p>
            <h3>{hasNoa(selectedDate) ? "Día con Noa" : "Día disponible"}</h3>
            {selectedHoliday && <div className="focus-block holiday-focus"><span>FESTIVO · {selectedHoliday.scope.toUpperCase()}</span><strong>{selectedHoliday.name}</strong><p>Comprueba horarios del gimnasio o del pádel. Si están cerrados, cambia la sesión por un paseo o movilidad. En una comida social, decide antes qué vas a priorizar y vuelve al plan en la siguiente comida.</p></div>}
            <div className="focus-block">
              <span>MOVIMIENTO</span>
              <strong>{hasNoa(selectedDate) ? "Descanso programado" : workoutForDay(selectedDateObject.getDay())}</strong>
              <p>{hasNoa(selectedDate) ? `No se asigna ejercicio. Si pierdes una sesión clave, prueba a moverla al ${nextFreeDate}.` : "La sesión cabe en el plan semanal. Márcala en Mi semana cuando la completes."}</p>
            </div>
            <div className="focus-block">
              <span>COMIDAS DEL DÍA · {selectedDateMealPlan.name.toUpperCase()}</span>
              {selectedMenu.map((dish, index) => {
                const key = `${selectedMealDay.day}-${index}`;
                return <div className="focus-meal" key={key}><input id={`focus-${key}`} type="checkbox" checked={data.selectedMeals.includes(key)} onChange={() => toggleMeal(key)} /><label htmlFor={`focus-${key}`}>{dish}</label><button type="button" aria-label={`Ver receta de ${dish}`} onClick={() => setActiveRecipe(dish)}>💡</button></div>;
              })}
            </div>
            <div className="focus-block">
              <span>COMPROMISOS DEL DÍA · {dailyDietCommitments.length - selectedDietExceptions.length}/{dailyDietCommitments.length}</span>
              <p className="habit-instruction">Todos empiezan cumplidos. Pulsa únicamente el compromiso que no hayas alcanzado.</p>
              <div className="habit-checklist">
                {dailyDietCommitments.map((habit) => {
                  const missed = selectedDietExceptions.includes(habit.id);
                  return <button className={missed ? "focus-habit missed" : "focus-habit met"} type="button" aria-pressed={missed} onClick={() => toggleDietException(selectedDate, habit.id)} key={habit.id}><span className="habit-state" aria-hidden="true">{missed ? "×" : "✓"}</span><span><strong>{habit.title}</strong><small>{missed ? "No cumplido" : habit.detail}</small></span></button>;
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="exercises-section" id="ejercicios" hidden={activeView !== "exercises"}>
        <div className="section-heading light exercises-heading"><div><p className="eyebrow">TU TALLER DE MOVIMIENTO</p><h2>Ejercicios</h2></div><p>Construye grupos que puedas repetir. <strong>A y B siguen asignados por defecto</strong>; HIIT y Casa quedan listos como alternativas.</p></div>

        <div className="exercise-workbench">
          <aside className="routine-rail">
            <div><p className="eyebrow">GRUPOS</p><h3>Tus rutinas</h3></div>
            <div className="routine-tabs" role="tablist" aria-label="Elegir grupo de ejercicios">
              {data.exerciseGroups.map((group) => <button role="tab" aria-selected={activeExerciseGroup?.id === group.id} className={activeExerciseGroup?.id === group.id ? "active" : ""} type="button" onClick={() => setActiveExerciseGroupId(group.id)} key={group.id}><strong>{group.name}</strong><span>{group.exerciseIds.length} ejercicios</span></button>)}
            </div>
            <form className="new-routine" onSubmit={createExerciseGroup}>
              <label htmlFor="new-routine-name">Nuevo grupo</label>
              <div><input id="new-routine-name" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Fuerza C" /><button type="submit">Añadir</button></div>
            </form>
          </aside>

          <article className="routine-editor">
            {activeExerciseGroup && <>
              <div className="routine-editor-head">
                <label>Nombre del grupo<input value={activeExerciseGroup.name} onChange={(event) => renameExerciseGroup(activeExerciseGroup.id, event.target.value)} /></label>
                {!activeExerciseGroup.builtIn && <button className="delete-routine" type="button" onClick={() => deleteExerciseGroup(activeExerciseGroup.id)}>Eliminar grupo</button>}
              </div>
              <div className="routine-summary">
                <span>{activeExerciseGroup.exerciseIds.length} ejercicios seleccionados</span>
                <div>{activeExerciseGroup.exerciseIds.length === 0 ? <small>Elige movimientos de la biblioteca.</small> : activeExerciseGroup.exerciseIds.map((id) => { const exercise = allExercises.find((item) => item.id === id); return exercise && <button type="button" onClick={() => toggleExerciseInGroup(activeExerciseGroup.id, id)} key={id}>{exercise.name} ×</button>; })}</div>
              </div>
              <div className="catalog-toolbar"><div><p className="eyebrow">BIBLIOTECA</p><h3>Agrupa para decidir mejor</h3></div><div role="group" aria-label="Agrupar ejercicios"><button className={exerciseGrouping === "category" ? "active" : ""} type="button" onClick={() => setExerciseGrouping("category")}>Por tipo</button><button className={exerciseGrouping === "muscle" ? "active" : ""} type="button" onClick={() => setExerciseGrouping("muscle")}>Por músculo</button></div></div>
              <div className="exercise-catalog">
                {exerciseCatalogSections.map(([section, exercises]) => <section key={section}><div className="catalog-section-title"><h4>{section}</h4><span>{exercises.length}</span></div><div className="catalog-grid">{exercises.map((exercise) => { const selected = activeExerciseGroup.exerciseIds.includes(exercise.id); return <article className={selected ? "catalog-exercise selected" : "catalog-exercise"} key={exercise.id}><button className="catalog-select" type="button" aria-pressed={selected} onClick={() => toggleExerciseInGroup(activeExerciseGroup.id, exercise.id)}><img src={exercise.image} alt="" /><span><strong>{exercise.name}</strong><small>{exercise.prescription} · {exercise.muscle}</small></span><i>{selected ? "✓" : "+"}</i></button><button className="catalog-preview" type="button" aria-label={`Ver técnica de ${exercise.name}`} onClick={() => setActiveExercise(exercise)}>🏋</button></article>; })}</div></section>)}
              </div>
            </>}
          </article>
        </div>

        <section className="schedule-builder">
          <div><p className="eyebrow">CALENDARIO SEMANAL</p><h3>¿Cuándo toca cada grupo?</h3><p>Deja un día sin grupo para conservar su actividad habitual. Asignar una rutina sustituye el movimiento de ese día.</p></div>
          <div className="schedule-days">
            {[{ label: "Lun", jsDay: 1 }, { label: "Mar", jsDay: 2 }, { label: "Mié", jsDay: 3 }, { label: "Jue", jsDay: 4 }, { label: "Vie", jsDay: 5 }, { label: "Sáb", jsDay: 6 }, { label: "Dom", jsDay: 0 }].map(({ label, jsDay }) => <label key={jsDay}><span>{label}</span><select aria-label={`Rutina del ${dayNames[jsDay]}`} value={data.exerciseSchedule[String(jsDay)] ?? ""} onChange={(event) => assignExerciseGroup(jsDay, event.target.value)}><option value="">Actividad habitual</option>{data.exerciseGroups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>)}
          </div>
        </section>
      </section>

      <section className="meals-section" id="comidas" hidden={activeView !== "meals"}>
        <div className="section-heading light"><div><p className="eyebrow">COMER BIEN, SIN VIVIR A DIETA</p><h2>Una semana con sabor</h2></div><p>Sirve primero <strong>½ plato de verdura</strong>, después proteína y completa con hidrato. Ajusta la cantidad a tu hambre y entrenamiento.</p></div>
        <div className="meal-rules"><span>3 comidas principales</span><span>Proteína en cada comida</span><span>Agua como bebida habitual</span><span>Sin alcachofa</span></div>
        <aside className="strict-rules" aria-label="Compromiso estricto de alimentación">
          <div><p className="eyebrow">MODO ESTRICTO · OBJETIVOS ELEGIDOS</p><h3>Reglas visibles, día a día.</h3><p>Márcalas en el calendario. Son compromisos personales para favorecer la constancia, no alimentos médicamente prohibidos para toda la población.</p></div>
          <ul><li>0 alcohol</li><li>0 refrescos y zumos</li><li>0 bollería y dulces con azúcar añadido</li><li>0 pan y pasta refinados</li><li>Ayuno nocturno de 12 h</li><li>Vinagre solo diluido</li></ul>
        </aside>
        <div className="nutrition-targets">
          <div><p className="eyebrow">OBJETIVO DIARIO</p><h3>Tu referencia, editable</h3><p>Las kcal se calculan con 4 kcal/g para proteína e hidratos y 9 kcal/g para grasas.</p></div>
          <div className="target-inputs">
            {([['kcal', 'kcal'], ['protein', 'Proteína g'], ['carbs', 'Hidratos g'], ['fat', 'Grasas g'], ['waterMl', 'Agua ml']] as [keyof NutritionTargets, string][]).map(([field, label]) => <label key={field}><span>{label}</span><input type="number" min="0" step={field === "waterMl" ? 250 : 1} value={data.nutritionTargets[field]} onChange={(event) => updateNutritionTarget(field, event.target.value)} /></label>)}
          </div>
        </div>

        <div className="meal-workbench">
          <aside className="meal-plan-rail">
            <div><p className="eyebrow">PROPUESTAS</p><h3>Semanas</h3></div>
            <div className="meal-plan-list">{data.mealPlans.map((plan) => <button className={activeMealPlan.id === plan.id ? "active" : ""} type="button" onClick={() => setData((current) => ({ ...current, activeMealPlanId: plan.id }))} key={plan.id}><span>{plan.name}</span><small>{plan.builtIn ? "base editable" : "personal"}</small></button>)}</div>
            <form className="new-meal-plan" onSubmit={createMealPlan}><input aria-label="Nombre de la nueva semana" value={newMealPlanName} onChange={(event) => setNewMealPlanName(event.target.value)} placeholder="Mi semana…" /><button type="submit">Duplicar actual +</button></form>
          </aside>

          <article className="day-builder">
            <div className="day-builder-head">
              <div><p className="eyebrow">CONSTRUCTOR SEMANAL</p><input aria-label="Nombre de la semana" value={activeMealPlan.name} onChange={(event) => renameMealPlan(event.target.value)} /></div>
              {!activeMealPlan.builtIn && <button className="danger-link" type="button" onClick={() => deleteMealPlan(activeMealPlan.id)}>Eliminar semana</button>}
            </div>
            <div className="meal-day-tabs" role="tablist" aria-label="Elegir día del menú">{meals.map((meal) => <button role="tab" aria-selected={activeMealDay === meal.day} className={activeMealDay === meal.day ? "active" : ""} type="button" onClick={() => setActiveMealDay(meal.day)} key={meal.day}>{meal.day.slice(0, 3)}</button>)}</div>
            <div className={activeDayOk ? "day-verdict ok" : "day-verdict adjust"}>
              <div><span>{activeDayOk ? "DÍA OK" : "REVISAR DÍA"}</span><strong>{activeDayOk ? "Encaja con tus objetivos" : "Hay valores fuera de tu rango"}</strong></div>
              <div className="daily-total"><strong>{activeDayTotals.kcal}</strong><span>/ {data.nutritionTargets.kcal} kcal</span></div>
            </div>
            <div className="nutrition-visual">
              <div className="macro-donut-wrap"><div className="macro-donut" role="img" aria-label={`Distribución energética: ${macroPercent.protein}% proteína, ${macroPercent.carbs}% hidratos y ${macroPercent.fat}% grasas`} style={{ background: `conic-gradient(#2f6b50 0 ${proteinStop}%, #d9673d ${proteinStop}% ${carbsStop}%, #5f9ca4 ${carbsStop}% 100%)` }}><div><strong>{activeDayTotals.kcal}</strong><span>kcal</span></div></div><p>Distribución energética</p></div>
              <div className="macro-meter">
                {([['protein', 'Proteína', macroPercent.protein], ['carbs', 'Hidratos', macroPercent.carbs], ['fat', 'Grasas', macroPercent.fat]] as [keyof Pick<NutritionTargets, 'protein' | 'carbs' | 'fat'>, string, number][]).map(([field, label, percent]) => <div className={`${targetChecks[field] ? "within" : "outside"} macro-${field}`} key={field}><span>{label} · {percent}%</span><strong>{activeDayTotals[field]} g</strong><i><b style={{ width: `${Math.min(100, Math.round((activeDayTotals[field] / Math.max(1, data.nutritionTargets[field])) * 100))}%` }} /></i><small>meta {data.nutritionTargets[field]} g</small></div>)}
              </div>
            </div>
            <div className="meal-slots">
              {(["Desayuno", "Comida", "Cena"] as MealCategory[]).map((label, index) => { const dish = activeDayDishes[index]; const key = `${activeMealDay}-${index}`; const picked = data.selectedMeals.includes(key); const badges = dish ? getRecipeBadges(dish, getRecipe(dish.name).time) : { traits: [], allergens: [] }; return <article key={label}>
                <div className="slot-label"><span>{label}</span><label><input type="checkbox" checked={picked} onChange={() => toggleMeal(key)} /> preparar</label></div>
                {dish && <img src={getRecipe(dish.name).image} alt="" />}
                <select aria-label={`${label} del ${activeMealDay}`} value={activeDayDishIds[index] ?? ""} onChange={(event) => updateMealSlot(activeMealDay, index, event.target.value)}><option value="">Elige un plato</option>{dishCatalog.filter((item) => item.category === label).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
                {dish && <><div className="slot-macros"><span>{nutritionKcal(dish)} kcal</span><span>P {dish.protein}</span><span>HC {dish.carbs}</span><span>G {dish.fat}</span></div><div className="dish-badges compact">{[...badges.traits, ...badges.allergens].map((badge) => <span className={badge.kind} title={badge.description} key={badge.id}><i>{badge.symbol}</i>{badge.label}</span>)}</div><div className="slot-actions"><button type="button" onClick={() => setActiveRecipe(dish.name)}>Ver receta</button><button type="button" onClick={() => setActiveDishId(dish.id)}>Editar valores</button></div></>}
              </article>; })}
            </div>
            <button className={activeDayOk ? "prepare-day ok" : "prepare-day"} type="button" onClick={() => { const keys = [0, 1, 2].map((index) => `${activeMealDay}-${index}`); const allSelected = keys.every((key) => data.selectedMeals.includes(key)); setData((current) => ({ ...current, selectedMeals: allSelected ? current.selectedMeals.filter((key) => !keys.includes(key)) : [...new Set([...current.selectedMeals, ...keys])] })); }}>{[0, 1, 2].every((index) => data.selectedMeals.includes(`${activeMealDay}-${index}`)) ? "Quitar día de la preparación" : activeDayOk ? "Preparar este día" : "Preparar igualmente"}</button>
          </article>
        </div>

        <section className="meal-assignment">
          <div><p className="eyebrow">LLEVAR AL CALENDARIO</p><h3>Asigna una propuesta a una semana</h3><p>La fecha se ajusta automáticamente al lunes de esa semana.</p></div>
          <label><span>Una fecha de la semana</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
          <label><span>Propuesta</span><select value={data.mealPlanAssignments[weekStartIso(selectedDate)] ?? activeMealPlan.id} onChange={(event) => assignMealPlanToWeek(selectedDate, event.target.value)}>{data.mealPlans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select></label>
          <button type="button" onClick={() => assignMealPlanToWeek(selectedDate, activeMealPlan.id)}>Asignar {activeMealPlan.name}</button>
        </section>

        <section className="dish-library">
          <div className="catalog-toolbar"><div><p className="eyebrow">BIBLIOTECA DE PLATOS</p><h3>Recetas y estimaciones modificables</h3></div><div role="group" aria-label="Agrupar platos"><button className={mealGrouping === "category" ? "active" : ""} type="button" onClick={() => setMealGrouping("category")}>Por comida</button><button className={mealGrouping === "macro" ? "active" : ""} type="button" onClick={() => setMealGrouping("macro")}>Por nutriente</button></div></div>
          <div className="badge-filter-panel">
            <div className="badge-filter-head"><div><p className="eyebrow">FILTROS DE RECETAS</p><h4>{filteredDishCount} de {dishCatalog.length} platos visibles</h4></div>{(dishTraitFilters.length > 0 || excludedAllergens.length > 0) && <button type="button" onClick={() => { setDishTraitFilters([]); setExcludedAllergens([]); }}>Limpiar filtros</button>}</div>
            <div className="badge-filter-row"><strong>Mostrar solo</strong><div>{traitBadgeDefinitions.map((badge) => <button className={dishTraitFilters.includes(badge.id) ? "active trait" : "trait"} type="button" aria-pressed={dishTraitFilters.includes(badge.id)} title={badge.description} onClick={() => toggleListFilter(badge.id, setDishTraitFilters)} key={badge.id}><i>{badge.symbol}</i>{badge.label}</button>)}</div></div>
            <div className="badge-filter-row allergens"><strong>Excluir alérgenos</strong><div>{allergenBadgeDefinitions.map((badge) => <button className={excludedAllergens.includes(badge.id) ? "active allergen" : "allergen"} type="button" aria-pressed={excludedAllergens.includes(badge.id)} title={badge.description} onClick={() => toggleListFilter(badge.id, setExcludedAllergens)} key={badge.id}><i>{badge.symbol}</i>Sin {badge.label.toLowerCase()}</button>)}</div></div>
            <details className="badge-legend"><summary><span>Leyenda de badges</span><small>Ver significado y alcance</small></summary><div><section><h5>Características</h5>{traitBadgeDefinitions.map((badge) => <p key={badge.id}><i>{badge.symbol}</i><span><strong>{badge.label}</strong><small>{badge.description}</small></span></p>)}</section><section><h5>Alérgenos UE</h5>{allergenBadgeDefinitions.map((badge) => <p key={badge.id}><i>{badge.symbol}</i><span><strong>{badge.label}</strong><small>{badge.description}</small></span></p>)}</section></div><aside><strong>* Filtro orientativo.</strong> En celiaquía o alergia, comprueba siempre la etiqueta de cada producto, las salsas y la contaminación cruzada de la cocina.</aside></details>
          </div>
          {activeDish && <div className="dish-editor">
            <div><p className="eyebrow">EDITANDO PLATO</p><input aria-label="Nombre del plato" value={activeDish.name} onChange={(event) => updateDish(activeDish.id, { name: event.target.value })} /></div>
            <label>Tipo<select value={activeDish.category} onChange={(event) => updateDish(activeDish.id, { category: event.target.value as MealCategory })}>{["Desayuno", "Comida", "Cena"].map((category) => <option key={category}>{category}</option>)}</select></label>
            {([['protein', 'Proteína'], ['carbs', 'Hidratos'], ['fat', 'Grasas']] as [keyof Pick<Dish, 'protein' | 'carbs' | 'fat'>, string][]).map(([field, label]) => <label key={field}>{label} (g)<input type="number" min="0" value={activeDish[field]} onChange={(event) => updateDish(activeDish.id, { [field]: Math.max(0, Number(event.target.value)) })} /></label>)}
            <div className="editor-kcal"><strong>{nutritionKcal(activeDish)}</strong><span>kcal calculadas</span></div>
            <button type="button" onClick={() => setActiveDishId(null)}>Cerrar</button>{!activeDish.builtIn && <button className="danger-link" type="button" onClick={() => deleteDish(activeDish.id)}>Eliminar</button>}
          </div>}
          <form className="new-dish-form" onSubmit={createDish}><input name="dish-name" placeholder="Nombre del nuevo plato" required /><select name="dish-category" aria-label="Tipo de comida"><option>Desayuno</option><option>Comida</option><option>Cena</option></select><label>P<input name="dish-protein" type="number" min="0" placeholder="g" required /></label><label>HC<input name="dish-carbs" type="number" min="0" placeholder="g" required /></label><label>G<input name="dish-fat" type="number" min="0" placeholder="g" required /></label><button type="submit">Añadir plato +</button></form>
          <div className="dish-catalog-sections">{mealCatalogSections.length === 0 ? <div className="dish-filter-empty"><strong>No hay platos con esta combinación.</strong><p>Quita algún filtro o crea una receta que encaje.</p><button type="button" onClick={() => { setDishTraitFilters([]); setExcludedAllergens([]); }}>Mostrar todos</button></div> : mealCatalogSections.map(([section, dishes], sectionIndex) => <details open={sectionIndex === 0} key={section}><summary><span>{section}</span><small>{dishes.length} platos</small></summary><div className="dish-grid">{dishes.map((dish) => { const badges = getRecipeBadges(dish, getRecipe(dish.name).time); return <article key={dish.id}><img src={getRecipe(dish.name).image} alt="" /><div><strong>{dish.name}</strong><small>{dish.category} · predomina {dominantMacro(dish).toLowerCase()}</small><span>{nutritionKcal(dish)} kcal · P {dish.protein} · HC {dish.carbs} · G {dish.fat}</span><div className="dish-badges">{[...badges.traits, ...badges.allergens].map((badge) => <span className={badge.kind} title={badge.description} key={badge.id}><i>{badge.symbol}</i>{badge.label}</span>)}</div></div><button type="button" onClick={() => setActiveDishId(dish.id)}>Editar</button><button type="button" onClick={() => setActiveRecipe(dish.name)}>Receta</button></article>; })}</div></details>)}</div>
        </section>
        <div className="food-footer">
          <div><p className="eyebrow">COMPRA SOLO LO QUE VAS A COCINAR</p><p>Marca arriba los desayunos, comidas y cenas que prepararás. Brújula agrupa automáticamente sus ingredientes y calcula una cantidad orientativa para una persona.</p></div>
          <button className="primary-button" type="button" onClick={() => setShoppingOpen(!shoppingOpen)}>{shoppingOpen ? "Cerrar lista" : `Generar lista · ${selectedDishes.length} platos`} <span>→</span></button>
        </div>
        {shoppingOpen && (
          <div className="shopping-panel">
            <div className="shopping-summary"><div><p className="eyebrow">LISTA GENERADA</p><h3>{selectedDishes.length === 0 ? "Marca algún plato primero" : `${shoppingItems.length} ingredientes para ${selectedDishes.length} platos`}</h3></div>{selectedDishes.length > 0 && <button type="button" onClick={() => setData((current) => ({ ...current, shopping: [] }))}>Desmarcar compra</button>}</div>
            {selectedDishes.length === 0 ? <p className="empty-shopping">Usa las casillas de cada plato. La lista se actualizará sin añadir extras que no estén en el menú.</p> : <div className="shopping-list">{shoppingCategories.map((category) => { const items = shoppingItems.filter((item) => item.category === category); return items.length > 0 && <section key={category}><h3>{category}</h3>{items.map((item) => <label aria-label={`Marcar ${item.label} como comprado`} className={data.shopping.includes(item.id) ? "checked" : ""} key={item.id}><input aria-label={item.label} type="checkbox" checked={data.shopping.includes(item.id)} onChange={() => toggleShopping(item.id)} /><span><strong>{item.label}</strong><small>{Number.isInteger(item.total) ? item.total : item.total.toFixed(1)} {item.unit}</small></span></label>)}</section>; })}</div>}
            {selectedDishes.length > 0 && <p className="quantity-note">Cantidades orientativas para una persona. Revisa primero despensa, aceite, sal y especias antes de comprar.</p>}
          </div>
        )}
      </section>

      <section className="progress-section" id="progreso" hidden={activeView !== "progress"}>
        <div className="progress-copy"><p className="eyebrow">MIDE LA TENDENCIA, NO EL DÍA</p><h2>Una comprobación semanal.</h2><p>Pésate y mide la cintura el mismo día, a una hora parecida. Mira bloques de 3–4 semanas: el agua, la sal y el sueño hacen ruido.</p><div className="progress-stat"><strong>{currentWeight.toFixed(1)} kg</strong><span>{lost > 0 ? `−${lost.toFixed(1)} kg desde el inicio` : "punto de partida"}</span></div></div>
        <div className="progress-panel">
          <form onSubmit={addProgress}><label>Fecha<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label>Peso<input name="weight" type="number" min="50" max="200" step="0.1" placeholder={String(currentWeight)} required /></label><label>Cintura<input name="waist" type="number" min="50" max="200" step="0.1" placeholder={String(currentWaist)} required /></label><button type="submit">Guardar medición</button></form>
          <div className="history">
            {data.progress.length === 0 ? <p className="empty-state">Tu primera medición aparecerá aquí. Una por semana es suficiente.</p> : data.progress.slice().reverse().map((entry) => <div key={entry.id}><time>{new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${entry.date}T12:00:00`))}</time><strong>{entry.weight.toFixed(1)} kg</strong><span>{entry.waist.toFixed(1)} cm</span><button type="button" aria-label="Eliminar medición" onClick={() => setData((current) => ({ ...current, progress: current.progress.filter((item) => item.id !== entry.id) }))}>×</button></div>)}
          </div>
        </div>
      </section>

      <section className="history-section" id="historico" hidden={activeView !== "history"}>
        <div className="section-heading light"><div><p className="eyebrow">EVOLUCIÓN REAL</p><h2>Histórico</h2></div><p>Las semanas archivadas, tus mediciones y las excepciones muestran la tendencia sin castigar un día aislado.</p></div>
        <div className="history-metrics" aria-label="Resumen histórico">
          <article><span>SEMANAS ARCHIVADAS</span><strong>{data.weeklyHistory.length}</strong><small>{data.weeklyHistory.length === 1 ? "semana cerrada" : "semanas cerradas"}</small></article>
          <article><span>ADHERENCIA DE HÁBITOS</span><strong>{overallHabitRate}%</strong><small>{totalHabitExceptions} {totalHabitExceptions === 1 ? "excepción" : "excepciones"} en {trackedDays} días</small></article>
          <article><span>HIDRATACIÓN</span><strong>{hydrationRate}%</strong><small>{hydratedDays}/{trackedDays} días alcanzando la meta</small></article>
          <article><span>CAMBIO DE PESO</span><strong>{lost > 0 ? `−${lost.toFixed(1)}` : "0,0"} kg</strong><small>desde {data.profile.startWeight} kg</small></article>
          <article><span>CAMBIO DE CINTURA</span><strong>{waistLost > 0 ? `−${waistLost.toFixed(1)}` : "0,0"} cm</strong><small>desde {data.profile.waist} cm</small></article>
        </div>
        <div className="history-layout">
          <article className="habit-evolution">
            <div className="history-card-heading"><p className="eyebrow">HÁBITOS</p><h3>Cumplimiento acumulado</h3></div>
            <div className="habit-history-list">{habitHistory.map((habit) => <div key={habit.id}><div><strong>{habit.title}</strong><span>{habit.rate}% · {habit.exceptions} {habit.exceptions === 1 ? "excepción" : "excepciones"}</span></div><div className="habit-rate" role="progressbar" aria-label={`Cumplimiento de ${habit.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={habit.rate}><i style={{ width: `${habit.rate}%` }} /></div></div>)}</div>
          </article>
          <article className="weekly-history">
            <div className="history-card-heading"><p className="eyebrow">HITOS SEMANALES</p><h3>Semanas cerradas</h3></div>
            {data.weeklyHistory.length === 0 ? <div className="history-empty"><strong>Aún no hay semanas archivadas.</strong><p>Cuando pulses “Cerrar semana y archivar”, aquí aparecerá el resumen antes de comenzar la siguiente.</p></div> : <div className="weekly-history-list">{data.weeklyHistory.slice().reverse().map((entry) => <div className="weekly-history-row" key={entry.id}><time>{new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(new Date(`${entry.weekStart}T12:00:00`))}–{new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(new Date(`${entry.weekEnd}T12:00:00`))}</time><div><strong>{entry.keyCompleted}/{entry.keyTotal ?? 4} sesiones clave</strong><span>{entry.completed}/7 actividades · {entry.selectedMeals} platos</span></div><div className={entry.habitExceptions > 0 ? "week-exceptions has-errors" : "week-exceptions"}><strong>{entry.habitExceptions}</strong><span>excepciones</span></div><div><strong>{entry.weight.toFixed(1)} kg</strong><span>{entry.waist.toFixed(1)} cm</span></div></div>)}</div>}
          </article>
        </div>
        {data.progress.length > 0 && <article className="measurement-timeline"><div className="history-card-heading"><p className="eyebrow">MEDICIONES</p><h3>Hitos de peso y cintura</h3></div><div>{data.progress.map((entry) => <span key={entry.id}><time>{new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${entry.date}T12:00:00`))}</time><strong>{entry.weight.toFixed(1)} kg</strong><small>{entry.waist.toFixed(1)} cm</small></span>)}</div></article>}
      </section>

      {activeExercise && (
        <div className="exercise-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveExercise(null); }}>
          <section className="exercise-viewer" role="dialog" aria-modal="true" aria-labelledby="exercise-title">
            <button className="exercise-close" type="button" aria-label="Cerrar ilustración" onClick={() => setActiveExercise(null)}>×</button>
            <figure><img src={activeExercise.image} alt={`Ilustración técnica de ${activeExercise.name}: posición inicial y final`} /></figure>
            <div className="exercise-copy">
              <p className="eyebrow">{activeExercise.routine.toUpperCase()} · TÉCNICA</p>
              <h2 id="exercise-title">{activeExercise.name}</h2>
              <strong className="exercise-dose">{activeExercise.prescription}</strong>
              <p>Mira la posición inicial y final antes de cargar peso. El movimiento debe sentirse estable y controlado.</p>
              <ul>{activeExercise.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
            </div>
          </section>
        </div>
      )}

      {activeRecipeData && (
        <div className="recipe-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveRecipe(null); }}>
          <section className="recipe-drawer" role="dialog" aria-modal="true" aria-labelledby="recipe-title">
            <button className="recipe-close" type="button" aria-label="Cerrar receta" onClick={() => setActiveRecipe(null)}>×</button>
            <div className="recipe-photo"><img src={activeRecipeData.image} alt={`Foto representativa de ${activeRecipeData.dish}`} /><span className="recipe-photo-icon">{activeRecipeData.icon}</span></div>
            <div className="recipe-content">
              <p className="eyebrow">{activeRecipeData.simple ? "MONTAJE RÁPIDO" : "RECETA RÁPIDA"}</p>
              <h2 id="recipe-title">{activeRecipeData.dish}</h2>
              <div className="recipe-time"><strong>{activeRecipeData.time}</strong><span>minutos<br />aprox.</span></div>
              <div className="recipe-badge-panel"><div className="dish-badges">{[...activeRecipeBadges.traits, ...activeRecipeBadges.allergens].map((badge) => <span className={badge.kind} title={badge.description} key={badge.id}><i>{badge.symbol}</i>{badge.label}</span>)}</div>{(activeRecipeBadges.allergens.length > 0 || activeRecipeBadges.traits.some((badge) => badge.id === "gluten-free")) && <small>Estimación por ingredientes del nombre. Comprueba envases, salsas y contaminación cruzada.</small>}</div>
              <div className="recipe-columns">
                <div><h3>Necesitas</h3><ul>{activeRecipeData.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}<li>AOVE, sal y especias</li></ul></div>
                <div><h3>Cómo hacerlo</h3><ol>{activeRecipeData.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
              </div>
              <p className="recipe-tip">💡 Cocina dos raciones cuando te venga bien: la segunda resuelve otra comida sin añadir tiempo.</p>
            </div>
          </section>
        </div>
      )}

      <section className="reset-week" hidden={activeView !== "week"}><div><p className="eyebrow">NUEVA SEMANA</p><h2>Repetir es avanzar.</h2><p>Guarda el balance actual en Histórico y limpia actividades, selección de platos y lista de compra para comenzar de nuevo.</p></div><button type="button" onClick={prepareNextWeek}>Cerrar semana y archivar</button></section>

      <footer><div className="brand"><span className="brand-mark">B</span><span>Brújula</span></div><p>Orientación general, no consejo médico. Si notas dolor, mareos o síntomas inusuales, detén el ejercicio y consulta a un profesional sanitario. El rango energético es un punto de partida: ajústalo según la tendencia, el hambre y, si puedes, con un dietista-nutricionista.</p><span>Hecho para la constancia, no para la perfección.</span></footer>
    </main>
  );
}
