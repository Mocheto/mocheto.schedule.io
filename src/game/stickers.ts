export type StickerDefinition = {
  id: string;
  name: string;
  icon: string;
  world: 1 | 2 | 3 | 4;
  hint: string;
};

export const stickerCatalog: StickerDefinition[] = [
  { id: "sticker-1-1", name: "Manzana feliz", icon: "🍎", world: 1, hint: "Busca sobre las ramas altas." },
  { id: "sticker-1-2", name: "Abeja del prado", icon: "🐝", world: 1, hint: "Sube hacia el cielo naranja." },
  { id: "sticker-1-3", name: "Rey de las raíces", icon: "🌳", world: 1, hint: "Explora el camino hacia la fortaleza." },
  { id: "sticker-2-1", name: "Huella brillante", icon: "🐾", world: 2, hint: "Confía en una plataforma de niebla." },
  { id: "sticker-2-2", name: "Luna violeta", icon: "🌙", world: 2, hint: "Mira por encima del sendero nocturno." },
  { id: "sticker-2-3", name: "Bigotes mágicos", icon: "🐱", world: 2, hint: "La niebla esconde un camino elevado." },
  { id: "sticker-3-1", name: "Pino valiente", icon: "🌲", world: 3, hint: "Salta por encima de las huellas." },
  { id: "sticker-3-2", name: "Lobo amigo", icon: "🐺", world: 3, hint: "Escucha el aullido y busca arriba." },
  { id: "sticker-3-3", name: "Corona del bosque", icon: "👑", world: 3, hint: "Está en la ruta más alta de la guarida." },
  { id: "sticker-4-1", name: "Bellota dorada", icon: "🌰", world: 4, hint: "Busca entre las primeras copas altas." },
  { id: "sticker-4-2", name: "Colmillo valiente", icon: "🦷", world: 4, hint: "Cruza el gran vacío sin bajar al suelo." },
  { id: "sticker-4-3", name: "Rey de las bellotas", icon: "🏵️", world: 4, hint: "Está antes del último duelo, casi en las nubes." },
];
