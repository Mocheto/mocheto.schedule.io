"use client";
/* eslint-disable @next/next/no-img-element -- relative static asset must also work under a GitHub Pages subpath */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { noaDateSet, noaDates } from "./noa-calendar";

type Profile = { age: number; height: number; startWeight: number; goalWeight: number; waist: number; padelDay: string };
type ProgressEntry = { id: number; date: string; weight: number; waist: number };
type SavedState = {
  completed: string[];
  mealWeek: number;
  mealChoices: Record<string, number>;
  selectedMeals: string[];
  shopping: string[];
  custodyOverrides: Record<string, boolean>;
  progress: ProgressEntry[];
  profile: Profile;
};

const defaultProfile: Profile = { age: 42, height: 192, startWeight: 100, goalWeight: 87, waist: 108, padelDay: "Lunes" };

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
  ]},
  { day: "Martes", options: [
    ["Yogur griego natural, fruta y avena", "Pasta integral con atún, tomate y rúcula", "Pollo al limón, verduras y arroz"],
    ["Tostada de aguacate y queso fresco", "Ensalada de garbanzos, huevo y pimientos", "Salmón, brócoli y boniato"],
    ["Huevos revueltos, espinacas y tostada", "Curry ligero de pollo con arroz", "Ensalada caprese con atún y pan integral"],
    ["Yogur natural, kiwi y nueces", "Tacos de merluza con col y yogur", "Pavo salteado con verduras y cuscús"],
  ]},
  { day: "Miércoles", options: [
    ["Tortilla, pan integral y naranja", "Salmón teriyaki ligero, arroz y edamame", "Tacos de pollo, pico de gallo y col"],
    ["Avena nocturna con yogur y frutos rojos", "Arroz con pavo y verduras", "Sopa miso, tofu y ensalada de pepino"],
    ["Tostada integral, queso fresco y fruta", "Pasta boloñesa rápida de pavo", "Salmón a la plancha con ensalada"],
    ["Avena con plátano y canela", "Poke de pollo, arroz y aguacate", "Quesadillas de frijoles y pimientos"],
  ]},
  { day: "Jueves", options: [
    ["Avena con leche, manzana y canela", "Ensalada templada de patata, judías y atún", "Albóndigas de pavo con tomate y calabacín"],
    ["Pan integral, tomate y jamón serrano", "Cuscús con garbanzos y verduras", "Dorada, ensalada y pan integral"],
    ["Yogur, pera, avena y almendras", "Bowl mexicano de pollo y frijoles", "Crema de verduras y tostada de atún"],
    ["Tortilla francesa, tomate y pan integral", "Salmón con patata y brócoli", "Pasta integral con verduras y mozzarella"],
  ]},
  { day: "Viernes", options: [
    ["Yogur, pera, almendras y avena", "Pollo mediterráneo, cuscús y ensalada", "Pizza casera fina de verduras y mozzarella"],
    ["Huevos revueltos, tomate y tostada", "Poke de atún, arroz, pepino y aguacate", "Fajitas de ternera y pimientos"],
    ["Tostada de aguacate, huevo y tomate", "Lentejas rápidas con pavo y verduras", "Sushi bowl de salmón y pepino"],
    ["Yogur natural, plátano y nueces", "Pasta integral con pollo y rúcula", "Tacos de pavo con pico de gallo"],
  ]},
  { day: "Sábado", options: [
    ["Tostada con queso fresco, tomate y fruta", "Poke de salmón, arroz y verduras", "Fajitas de ternera, pimientos y guacamole"],
    ["Yogur, avena, kiwi y nueces", "Paella de pollo y verduras con ensalada", "Sushi casero sencillo y edamame"],
    ["Huevos, tostada integral y naranja", "Pizza casera de atún y verduras", "Pollo teriyaki rápido con arroz"],
    ["Avena nocturna con manzana y canela", "Burritos de ternera y frijoles", "Merluza a la plancha con boniato"],
  ]},
  { day: "Domingo", options: [
    ["Huevos, tostada, tomate y fruta", "Arroz de pollo y verduras + ensalada", "Crema de verduras y tostada de atún"],
    ["Yogur natural, fruta y almendras", "Pasta boloñesa de pavo + ensalada", "Tortilla de patata ligera y tomate"],
    ["Tostada integral con pavo y aguacate", "Salmón al horno con patata y verduras", "Ensalada de garbanzos y huevo"],
    ["Yogur, avena y frutos rojos", "Arroz mexicano con pollo y frijoles", "Frittata rápida de verduras"],
  ]},
];

const ingredientCatalog = [
  { id: "eggs", label: "Huevos", category: "Proteínas", match: /huevo|tortilla/i, amount: 2, unit: "ud" },
  { id: "chicken", label: "Pollo", category: "Proteínas", match: /pollo/i, amount: 220, unit: "g" },
  { id: "turkey", label: "Pavo", category: "Proteínas", match: /pavo/i, amount: 200, unit: "g" },
  { id: "beef", label: "Ternera", category: "Proteínas", match: /ternera/i, amount: 200, unit: "g" },
  { id: "salmon", label: "Salmón", category: "Proteínas", match: /salmón/i, amount: 220, unit: "g" },
  { id: "white-fish", label: "Merluza o dorada", category: "Proteínas", match: /merluza|dorada/i, amount: 220, unit: "g" },
  { id: "tuna", label: "Atún", category: "Proteínas", match: /atún/i, amount: 1, unit: "lata" },
  { id: "tofu", label: "Tofu", category: "Proteínas", match: /tofu/i, amount: 180, unit: "g" },
  { id: "ham", label: "Jamón serrano", category: "Proteínas", match: /jamón serrano/i, amount: 80, unit: "g" },
  { id: "yogurt", label: "Yogur natural", category: "Proteínas", match: /yogur/i, amount: 1, unit: "ud" },
  { id: "milk", label: "Leche", category: "Proteínas", match: /con leche|avena caliente/i, amount: 500, unit: "ml" },
  { id: "fresh-cheese", label: "Queso fresco o mozzarella", category: "Proteínas", match: /queso fresco|mozzarella/i, amount: 125, unit: "g" },
  { id: "legumes", label: "Lentejas, garbanzos, judías o frijoles", category: "Proteínas", match: /lentejas|garbanzos|judías|frijoles/i, amount: 1, unit: "bote" },
  { id: "tomato", label: "Tomate", category: "Verdura y fruta", match: /tomate|pico de gallo/i, amount: 2, unit: "ud" },
  { id: "greens", label: "Hojas verdes", category: "Verdura y fruta", match: /ensalada|rúcula/i, amount: 1, unit: "bolsa" },
  { id: "pepper", label: "Pimientos", category: "Verdura y fruta", match: /pimiento/i, amount: 2, unit: "ud" },
  { id: "zucchini", label: "Calabacín", category: "Verdura y fruta", match: /calabacín/i, amount: 1, unit: "ud" },
  { id: "broccoli", label: "Brócoli", category: "Verdura y fruta", match: /brócoli/i, amount: 1, unit: "ud" },
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
  { id: "edamame", label: "Edamame", category: "Despensa", match: /edamame/i, amount: 120, unit: "g" },
  { id: "tortillas", label: "Tortillas de maíz o trigo", category: "Despensa", match: /tacos|fajitas|burrito/i, amount: 4, unit: "ud" },
  { id: "pizza-base", label: "Base fina integral", category: "Despensa", match: /pizza/i, amount: 1, unit: "ud" },
  { id: "soy", label: "Salsa de soja baja en sal", category: "Despensa", match: /teriyaki|sushi|miso/i, amount: 1, unit: "botella si falta" },
  { id: "olive-oil", label: "AOVE", category: "Despensa", match: /AOVE|mediterráneo|ensalada|horno/i, amount: 1, unit: "botella si falta" },
];

const strengthA = ["Sentadilla con mancuerna · 3×8–12", "Press de pecho · 3×8–12", "Remo en máquina · 3×8–12", "Peso muerto rumano · 2×8–12", "Plancha · 2×20–40 s"];
const strengthB = ["Zancada asistida · 3×8/lado", "Jalón al pecho · 3×8–12", "Press de hombro · 3×8–12", "Puente de glúteo · 3×10–15", "Paseo del granjero · 3×30 s"];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const workoutByDay: Record<number, string> = { 0: "Paseo en familia · 40 min", 1: "Paseo suave · 20 min", 2: "Fuerza A · 30 min", 3: "Correr / andar · 30 min", 4: "Movilidad · 10 min", 5: "Fuerza B · 30 min", 6: "Paseo largo · 40 min" };

const toIsoDate = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const mondayMealIndex = (jsDay: number) => (jsDay + 6) % 7;

function getRecipe(dish: string) {
  const simple = /yogur|tostada|huevos revueltos|tortilla francesa|avena nocturna/i.test(dish);
  let time = simple ? 5 : 18;
  let icon = "🍳";
  let image = "./recipes/recipe-02.webp";
  let steps = [
    "Prepara y corta todos los ingredientes antes de encender el fuego.",
    "Cocina la proteína y las verduras con poco AOVE hasta que estén en su punto.",
    "Añade el hidrato ya cocido, ajusta sal y especias, y sirve.",
  ];

  if (/yogur|avena nocturna|avena caliente|avena con/i.test(dish)) { time = 3; icon = "🥣"; image = "./recipes/recipe-00.webp"; steps = ["Pon el yogur o la leche en un bol.", "Añade avena y fruta troceada.", "Termina con frutos secos o canela; deja reposar si es avena nocturna."]; }
  else if (/tostada|pan integral, tomate|pan integral con/i.test(dish)) { time = 5; icon = "🍞"; image = "./recipes/recipe-01.webp"; steps = ["Tuesta el pan integral.", "Prepara el tomate, aguacate o queso mientras se tuesta.", "Monta la tostada y añade la proteína al final."]; }
  else if (/ensalada|caprese/i.test(dish)) { time = 10; icon = "🥗"; image = /garbanzo|lenteja|judía/i.test(dish) ? "./recipes/recipe-03.webp" : "./recipes/recipe-04.webp"; steps = ["Lava y corta las verduras.", "Añade la proteína y el hidrato cocido si lo lleva.", "Aliña con AOVE, limón o vinagre justo antes de comer."]; }
  else if (/poke|sushi bowl|sushi casero/i.test(dish)) { time = 15; icon = "🍚"; image = "./recipes/recipe-06.webp"; steps = ["Cuece el arroz o usa una ración ya preparada.", "Cocina la proteína si no se consume lista y corta las verduras.", "Monta el bol por secciones y aliña ligeramente."]; }
  else if (/bowl/i.test(dish)) { time = 15; icon = "🍚"; image = /mexicano|frijoles|burrito/i.test(dish) ? "./recipes/recipe-09.webp" : "./recipes/recipe-06.webp"; steps = ["Cuece el arroz o usa una ración ya preparada.", "Cocina la proteína si no se consume lista y corta las verduras.", "Monta el bol por secciones y aliña ligeramente."]; }
  else if (/taco|fajita|burrito|quesadilla/i.test(dish)) { time = 15; icon = "🌮"; image = "./recipes/recipe-08.webp"; steps = ["Saltea la proteína y los pimientos a fuego fuerte.", "Calienta las tortillas en una sartén seca.", "Rellena con verduras, pico de gallo o yogur y sirve."]; }
  else if (/chili/i.test(dish)) { time = 18; icon = "🌶️"; image = "./recipes/recipe-09.webp"; steps = ["Dora la carne o el pavo con especias.", "Añade tomate y frijoles ya cocidos.", "Cuece 10–12 minutos hasta que espese y sirve con una ración medida de arroz o pan."]; }
  else if (/pasta|boloñesa/i.test(dish)) { time = 18; icon = "🍝"; image = "./recipes/recipe-10.webp"; steps = ["Cuece la pasta integral al dente y reserva un poco de agua.", "Saltea tomate, verduras y proteína en otra sartén.", "Mezcla todo durante un minuto y ajusta la textura con el agua reservada."]; }
  else if (/crema|sopa miso/i.test(dish)) { time = 20; icon = "🍲"; image = /miso/i.test(dish) ? "./recipes/recipe-07.webp" : "./recipes/recipe-03.webp"; steps = ["Trocea las verduras pequeñas para que se hagan antes.", "Cuece 12–15 minutos con el agua justa.", "Tritura la crema o añade miso y tofu al final sin hervir fuerte."]; }
  else if (/salmón/i.test(dish)) { time = 20; icon = "🐟"; image = "./recipes/recipe-05.webp"; steps = ["Calienta horno o sartén y seca bien el pescado.", "Cocina 3–4 minutos por lado, o 12–15 minutos al horno.", "Sirve con verdura y la ración de patata, arroz o boniato."]; }
  else if (/merluza|dorada/i.test(dish)) { time = 20; icon = "🐟"; image = "./recipes/recipe-04.webp"; steps = ["Calienta horno o sartén y seca bien el pescado.", "Cocina 3–4 minutos por lado, o 12–15 minutos al horno.", "Sirve con verdura y la ración de patata, arroz o boniato."]; }
  else if (/tortilla|frittata|huevos revueltos|huevos,/i.test(dish)) { time = 12; icon = "🥚"; image = "./recipes/recipe-01.webp"; steps = ["Saltea primero las verduras hasta que pierdan agua.", "Bate los huevos, mezcla y vierte en la sartén.", "Cuaja a fuego medio y termina tapada para no usar más aceite."]; }
  else if (/pizza/i.test(dish)) { time = 20; icon = "🍕"; image = "./recipes/recipe-11.webp"; steps = ["Usa una base fina integral y extiende tomate triturado.", "Reparte verduras, proteína y poca mozzarella.", "Hornea fuerte 10–12 minutos hasta que los bordes estén crujientes."]; }
  else if (/arroz|paella/i.test(dish)) { time = 22; icon = "🥘"; image = "./recipes/recipe-02.webp"; steps = ["Saltea proteína y verduras en una sartén amplia.", "Añade el arroz y el doble de caldo o agua.", "Cocina sin remover hasta que el arroz esté tierno y deja reposar 3 minutos."]; }
  else if (/lentejas|garbanzos|judías|frijoles/i.test(dish)) { time = 18; icon = "🥘"; image = "./recipes/recipe-03.webp"; steps = ["Enjuaga la legumbre cocida si es de bote.", "Saltea verduras picadas con especias suaves.", "Añade la legumbre y una proteína ligera; calienta hasta que quede meloso."]; }

  const ingredients = ingredientCatalog.filter((ingredient) => ingredient.match.test(dish)).map((ingredient) => ingredient.label);
  return { dish, simple, time, icon, image, steps, ingredients: ingredients.length > 0 ? ingredients : ["Ingredientes principales del plato", "AOVE", "Sal y especias"] };
}

const defaultState: SavedState = { completed: [], mealWeek: 0, mealChoices: {}, selectedMeals: [], shopping: [], custodyOverrides: {}, progress: [], profile: defaultProfile };

export default function Home() {
  const [data, setData] = useState<SavedState>(defaultState);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(7);
  const [selectedDate, setSelectedDate] = useState("2026-08-14");
  const [editingCustody, setEditingCustody] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
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
    if (!activeRecipe) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveRecipe(null); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [activeRecipe]);

  const weekPlan = useMemo(() => baseWeek.map((item) => item.id === "padel" ? { ...item, day: data.profile.padelDay.slice(0, 3), detail: `60 min · ${data.profile.padelDay.toLowerCase()}` } : item), [data.profile.padelDay]);
  const keyCompleted = weekPlan.filter((item) => item.key && data.completed.includes(item.id)).length;
  const completion = Math.round((data.completed.length / weekPlan.length) * 100);
  const latest = data.progress.at(-1);
  const currentWeight = latest?.weight ?? data.profile.startWeight;
  const currentWaist = latest?.waist ?? data.profile.waist;
  const lost = Math.max(0, data.profile.startWeight - currentWeight);
  const goalProgress = Math.min(100, Math.max(0, Math.round((lost / (data.profile.startWeight - data.profile.goalWeight)) * 100)));
  const hasNoa = (date: string) => data.custodyOverrides[date] ?? noaDateSet.has(date);
  const workoutForDay = (jsDay: number) => dayNames[jsDay] === data.profile.padelDay ? "Pádel · 60 min" : workoutByDay[jsDay];
  const selectedDishes = meals.flatMap((meal) => {
    const choice = data.mealChoices[meal.day] ?? data.mealWeek;
    return meal.options[choice].map((dish, index) => ({ key: `${meal.day}-${index}`, dish })).filter((entry) => data.selectedMeals.includes(entry.key));
  });
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
  const selectedMealDay = meals[mondayMealIndex(selectedDateObject.getDay())];
  const selectedMenu = selectedMealDay.options[data.mealChoices[selectedMealDay.day] ?? data.mealWeek];
  const activeRecipeData = activeRecipe ? getRecipe(activeRecipe) : null;
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
  const swapMeal = (day: string) => setData((current) => ({ ...current, mealChoices: { ...current.mealChoices, [day]: ((current.mealChoices[day] ?? current.mealWeek) + 1) % 4 } }));
  const toggleCustody = (date: string) => setData((current) => ({ ...current, custodyOverrides: { ...current.custodyOverrides, [date]: !(current.custodyOverrides[date] ?? noaDateSet.has(date)) } }));

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
      try { setData({ ...defaultState, ...JSON.parse(String(reader.result)) }); }
      catch { window.alert("No se ha podido leer el archivo de Brújula."); }
    };
    reader.readAsText(file);
  };

  return (
    <main className={ready ? "ready" : "loading"}>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Brújula, inicio"><span className="brand-mark">B</span><span>Brújula</span></a>
        <nav aria-label="Navegación principal"><a className="active" href="#inicio">Resumen</a><a href="#semana">Mi semana</a><a href="#agenda">Agenda</a><a href="#comidas">Comidas</a><a href="#progreso">Progreso</a></nav>
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

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">TU RUTA · PRIMERAS 12 SEMANAS</p>
          <h1>Menos prisa.<br /><em>Más semanas buenas.</em></h1>
          <p className="intro">Un plan realista para volver a sentirte activo: tres sesiones clave, comida de verdad y margen para una vida con una niña de cuatro años.</p>
          <div className="hero-actions"><a className="primary-button" href="#semana">Ver esta semana <span>→</span></a><span className="microcopy">Empieza pequeño. Repite.</span></div>
        </div>
        <div className="route-card" aria-label="Ruta de objetivos de peso">
          <div className="route-head"><span>LA RUTA, NO LA CARRERA</span><strong>{goalProgress}% recorrido</strong></div>
          <div className="route-line" aria-hidden="true"><span className="route-dot current" /><span className="route-path"><i style={{ width: `${Math.max(8, goalProgress)}%` }} /></span><span className="route-dot waypoint" /><span className="route-path future" /><span className="route-dot goal" /></div>
          <div className="route-labels"><div><strong>{data.profile.startWeight} kg</strong><span>Inicio</span></div><div><strong>94–96 kg</strong><span>Primera meta</span></div><div><strong>{data.profile.goalWeight} kg</strong><span>Destino</span></div></div>
          <p>La primera victoria no son 13 kg: es demostrarte durante 12 semanas que este ritmo cabe en tu vida.</p>
        </div>
      </section>

      <section className="signal-grid" aria-label="Indicadores principales">
        <article><span>GUÍA DIARIA</span><strong>2.200–2.400</strong><small>kcal orientativas</small></article>
        <article><span>AHORA</span><strong>{currentWaist}</strong><small>cm de cintura</small></article>
        <article className="success-card"><span>ESTA SEMANA</span><strong>{completion}%</strong><small>{completion >= 80 ? "semana ganada" : "todo suma"}</small></article>
      </section>

      <section className="week-section" id="semana">
        <div className="section-heading"><div><p className="eyebrow">MOVIMIENTO</p><h2>Tu semana, de un vistazo</h2></div><p><strong>{keyCompleted} de 4 sesiones clave</strong> completadas.<br />Los paseos también cuentan.</p></div>
        <div className="week-grid">
          {weekPlan.map((item) => { const done = data.completed.includes(item.id); return (
            <article className={`day-card ${item.tone} ${done ? "done" : ""}`} key={item.id}>
              <div className="day-top"><span>{item.day}</span><button type="button" aria-label={`${done ? "Desmarcar" : "Marcar"} ${item.title}`} aria-pressed={done} onClick={() => toggleCompleted(item.id)}>{done ? "✓" : ""}</button></div>
              <h3>{item.title}</h3><p>{item.detail}</p>{item.key && <small className="key-label">sesión clave</small>}
            </article>
          ); })}
        </div>

        <div className="training-detail">
          <article><p className="eyebrow">FUERZA A</p><h3>Base y empuje</h3><ol>{strengthA.map((exercise) => <li key={exercise}>{exercise}</li>)}</ol></article>
          <article><p className="eyebrow">FUERZA B</p><h3>Tirón y estabilidad</h3><ol>{strengthB.map((exercise) => <li key={exercise}>{exercise}</li>)}</ol></article>
          <aside><p className="eyebrow">PROGRESIÓN</p><h3>Hazlo sostenible</h3><p><strong>Semanas 1–2:</strong> una sesión de fuerza basta.</p><p><strong>Semanas 3–6:</strong> intenta completar las dos.</p><p><strong>Semanas 7–12:</strong> añade peso solo si terminas con 2 repeticiones “en reserva”.</p></aside>
        </div>
      </section>

      <section className="agenda-section" id="agenda">
        <div className="section-heading light agenda-heading">
          <div><p className="eyebrow">TU TIEMPO REAL</p><h2>Calendario con Noa</h2></div>
          <p>Los <strong>{noaDates.length} días azules</strong> del Excel quedan libres de entrenamiento. Selecciona una fecha para ver juntos custodia, menú y movimiento.</p>
        </div>
        <div className="calendar-toolbar">
          <div className="month-navigation">
            <button type="button" aria-label="Mes anterior" onClick={() => { const month = Math.max(0, calendarMonth - 1); setCalendarMonth(month); setSelectedDate(toIsoDate(2026, month, 1)); }} disabled={calendarMonth === 0}>←</button>
            <strong>{monthNames[calendarMonth]} 2026</strong>
            <button type="button" aria-label="Mes siguiente" onClick={() => { const month = Math.min(11, calendarMonth + 1); setCalendarMonth(month); setSelectedDate(toIsoDate(2026, month, 1)); }} disabled={calendarMonth === 11}>→</button>
          </div>
          <div className="calendar-legend"><span><i className="noa-swatch" /> Con Noa · sin entreno</span><span><i className="free-swatch" /> Disponible</span></div>
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
                const mealDay = meals[mondayMealIndex(date.getDay())];
                const mealCount = [0, 1, 2].filter((mealIndex) => data.selectedMeals.includes(`${mealDay.day}-${mealIndex}`)).length;
                return (
                  <button
                    type="button"
                    className={`calendar-day ${custody ? "with-noa" : "free-day"} ${selectedDate === iso ? "selected" : ""}`}
                    key={iso}
                    aria-label={`${day} de ${monthNames[calendarMonth]}, ${custody ? "con Noa, sin entrenamiento" : workoutForDay(date.getDay())}`}
                    onClick={() => { setSelectedDate(iso); if (editingCustody) toggleCustody(iso); }}
                  >
                    <span className="date-number">{day}</span>
                    <span className="custody-label">{custody ? "Noa" : workoutForDay(date.getDay()).split(" · ")[0]}</span>
                    {mealCount > 0 && <small>{mealCount} {mealCount === 1 ? "plato" : "platos"}</small>}
                  </button>
                );
              })}
            </div>
          </div>
          <aside className={hasNoa(selectedDate) ? "day-focus with-noa" : "day-focus"}>
            <p className="eyebrow">{new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(selectedDateObject).toUpperCase()}</p>
            <h3>{hasNoa(selectedDate) ? "Día con Noa" : "Día disponible"}</h3>
            <div className="focus-block">
              <span>MOVIMIENTO</span>
              <strong>{hasNoa(selectedDate) ? "Descanso programado" : workoutForDay(selectedDateObject.getDay())}</strong>
              <p>{hasNoa(selectedDate) ? `No se asigna ejercicio. Si pierdes una sesión clave, prueba a moverla al ${nextFreeDate}.` : "La sesión cabe en el plan semanal. Márcala en Mi semana cuando la completes."}</p>
            </div>
            <div className="focus-block">
              <span>COMIDAS DEL DÍA</span>
              {selectedMenu.map((dish, index) => {
                const key = `${selectedMealDay.day}-${index}`;
                return <div className="focus-meal" key={key}><input id={`focus-${key}`} type="checkbox" checked={data.selectedMeals.includes(key)} onChange={() => toggleMeal(key)} /><label htmlFor={`focus-${key}`}>{dish}</label><button type="button" aria-label={`Ver receta de ${dish}`} onClick={() => setActiveRecipe(dish)}>💡</button></div>;
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="meals-section" id="comidas">
        <div className="section-heading light"><div><p className="eyebrow">COMER BIEN, SIN VIVIR A DIETA</p><h2>Una semana con sabor</h2></div><p>Sirve primero <strong>½ plato de verdura</strong>, después proteína y completa con hidrato. Ajusta la cantidad a tu hambre y entrenamiento.</p></div>
        <div className="recipe-visual">
          <img src="./recipes/recipe-contact-sheet.webp" alt="Doce platos rápidos y equilibrados vistos desde arriba" />
          <div className="week-switcher">
            <p className="eyebrow">ROTACIÓN DE MENÚS</p>
            <h3>Cuatro semanas, sin empezar de cero.</h3>
            <p>Cambia la semana completa o sustituye solo un día. La selección y la lista de compra se actualizan al momento.</p>
            <div role="group" aria-label="Elegir semana de menú">{[0, 1, 2, 3].map((week) => <button className={data.mealWeek === week ? "active" : ""} type="button" key={week} onClick={() => setData((current) => ({ ...current, mealWeek: week, mealChoices: {} }))}>Semana {week + 1}</button>)}</div>
          </div>
        </div>
        <div className="meal-rules"><span>3 comidas principales</span><span>Proteína en cada comida</span><span>Agua como bebida habitual</span><span>Sin alcachofa</span></div>
        <div className="meal-days">
          {meals.map((meal) => { const choice = data.mealChoices[meal.day] ?? data.mealWeek; const selected = meal.options[choice]; return (
            <article className="meal-day" key={meal.day}>
              <div className="meal-title"><h3>{meal.day}</h3><button type="button" onClick={() => swapMeal(meal.day)}>Cambiar menú ↻</button><button type="button" onClick={() => { const keys = [0, 1, 2].map((index) => `${meal.day}-${index}`); const allSelected = keys.every((key) => data.selectedMeals.includes(key)); setData((current) => ({ ...current, selectedMeals: allSelected ? current.selectedMeals.filter((key) => !keys.includes(key)) : [...new Set([...current.selectedMeals, ...keys])] })); }}>{[0, 1, 2].every((index) => data.selectedMeals.includes(`${meal.day}-${index}`)) ? "Quitar día" : "Preparar todo"}</button></div>
              <div className="meal-lines">
                {["Desayuno", "Comida", "Cena"].map((label, index) => { const key = `${meal.day}-${index}`; const picked = data.selectedMeals.includes(key); const inputId = `meal-${meal.day}-${index}`; return <div className={`meal-row ${picked ? "picked" : ""}`} key={label}><input id={inputId} type="checkbox" checked={picked} onChange={() => toggleMeal(key)} /><span>{label}</span><label className="dish-name" htmlFor={inputId}>{selected[index]}</label><button className="recipe-button" type="button" aria-label={`Ver receta de ${selected[index]}`} title="Ver receta rápida" onClick={() => setActiveRecipe(selected[index])}>💡</button></div>; })}
              </div>
            </article>
          ); })}
        </div>
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

      <section className="progress-section" id="progreso">
        <div className="progress-copy"><p className="eyebrow">MIDE LA TENDENCIA, NO EL DÍA</p><h2>Una comprobación semanal.</h2><p>Pésate y mide la cintura el mismo día, a una hora parecida. Mira bloques de 3–4 semanas: el agua, la sal y el sueño hacen ruido.</p><div className="progress-stat"><strong>{currentWeight.toFixed(1)} kg</strong><span>{lost > 0 ? `−${lost.toFixed(1)} kg desde el inicio` : "punto de partida"}</span></div></div>
        <div className="progress-panel">
          <form onSubmit={addProgress}><label>Fecha<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label>Peso<input name="weight" type="number" min="50" max="200" step="0.1" placeholder={String(currentWeight)} required /></label><label>Cintura<input name="waist" type="number" min="50" max="200" step="0.1" placeholder={String(currentWaist)} required /></label><button type="submit">Guardar medición</button></form>
          <div className="history">
            {data.progress.length === 0 ? <p className="empty-state">Tu primera medición aparecerá aquí. Una por semana es suficiente.</p> : data.progress.slice().reverse().map((entry) => <div key={entry.id}><time>{new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${entry.date}T12:00:00`))}</time><strong>{entry.weight.toFixed(1)} kg</strong><span>{entry.waist.toFixed(1)} cm</span><button type="button" aria-label="Eliminar medición" onClick={() => setData((current) => ({ ...current, progress: current.progress.filter((item) => item.id !== entry.id) }))}>×</button></div>)}
          </div>
        </div>
      </section>

      {activeRecipeData && (
        <div className="recipe-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveRecipe(null); }}>
          <section className="recipe-drawer" role="dialog" aria-modal="true" aria-labelledby="recipe-title">
            <button className="recipe-close" type="button" aria-label="Cerrar receta" onClick={() => setActiveRecipe(null)}>×</button>
            <div className="recipe-photo"><img src={activeRecipeData.image} alt={`Foto representativa de ${activeRecipeData.dish}`} /><span>{activeRecipeData.icon}</span></div>
            <div className="recipe-content">
              <p className="eyebrow">{activeRecipeData.simple ? "MONTAJE RÁPIDO" : "RECETA RÁPIDA"}</p>
              <h2 id="recipe-title">{activeRecipeData.dish}</h2>
              <div className="recipe-time"><strong>{activeRecipeData.time}</strong><span>minutos<br />aprox.</span></div>
              <div className="recipe-columns">
                <div><h3>Necesitas</h3><ul>{activeRecipeData.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}<li>AOVE, sal y especias</li></ul></div>
                <div><h3>Cómo hacerlo</h3><ol>{activeRecipeData.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
              </div>
              <p className="recipe-tip">💡 Cocina dos raciones cuando te venga bien: la segunda resuelve otra comida sin añadir tiempo.</p>
            </div>
          </section>
        </div>
      )}

      <section className="reset-week"><div><p className="eyebrow">NUEVA SEMANA</p><h2>Repetir es avanzar.</h2><p>Cuando llegue el lunes, conserva tus mediciones y empieza el marcador de constancia de nuevo.</p></div><button type="button" onClick={() => setData((current) => ({ ...current, completed: [], shopping: [] }))}>Preparar otra semana</button></section>

      <footer><div className="brand"><span className="brand-mark">B</span><span>Brújula</span></div><p>Orientación general, no consejo médico. Si notas dolor, mareos o síntomas inusuales, detén el ejercicio y consulta a un profesional sanitario. El rango energético es un punto de partida: ajústalo según la tendencia, el hambre y, si puedes, con un dietista-nutricionista.</p><span>Hecho para la constancia, no para la perfección.</span></footer>
    </main>
  );
}
