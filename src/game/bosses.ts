import type { BossId } from "./types";

export const bossCatalog: Record<BossId, { name: string; assetPrefix: string; intro: string }> = {
  "bramble-king": { name: "Rey Zarzal", assetPrefix: "./assets/sprites/boss-rey-zarzal", intro: "El guardián de las raíces te reta a un duelo." },
  "mist-countess": { name: "Condesa Niebla", assetPrefix: "./assets/sprites/boss-condesa-niebla", intro: "La guardiana de las grutas quiere probar tu ingenio." },
  "great-wolf": { name: "Gran Lobo", assetPrefix: "./assets/sprites/boss-gran-lobo", intro: "El rey de las huellas te espera para el último duelo." },
  "great-boar": { name: "Gran Jabalí", assetPrefix: "./assets/sprites/boss-gran-jabali", intro: "El guardián de las bellotas protege las copas del bosque." },
  "sky-captain": { name: "Capitán Celeste", assetPrefix: "./assets/sprites/boss-capitan-celeste", intro: "El capitán de la flota te reta por el tesoro de las nubes." },
  "vampire-count": { name: "Conde Vampiro", assetPrefix: "./assets/sprites/boss-conde-vampiro", intro: "El conde del castillo te reta a un duelo de ingenio." },
  "rainbow-queen": { name: "Reina Arcoíris", assetPrefix: "./assets/sprites/boss-reina-arcoiris-v2", intro: "La guardiana del cielo quiere comprobar tu magia." },
};
