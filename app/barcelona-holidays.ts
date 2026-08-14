export type BarcelonaHoliday = {
  name: string;
  scope: "Estatal" | "Cataluña" | "Barcelona";
};

// Calendario laboral oficial de Barcelona para 2026:
// https://guia.barcelona.cat/es/detall/festes-estatals-i-autonomiques-a-catalunya-i-locals-a-barcelona-al-2025_99400735671.html
export const barcelonaHolidays2026: Record<string, BarcelonaHoliday> = {
  "2026-01-01": { name: "Año Nuevo", scope: "Estatal" },
  "2026-01-06": { name: "Reyes", scope: "Estatal" },
  "2026-04-03": { name: "Viernes Santo", scope: "Estatal" },
  "2026-04-06": { name: "Lunes de Pascua", scope: "Cataluña" },
  "2026-05-01": { name: "Fiesta del Trabajo", scope: "Estatal" },
  "2026-05-25": { name: "Pascua Granada", scope: "Barcelona" },
  "2026-06-24": { name: "San Juan", scope: "Cataluña" },
  "2026-08-15": { name: "Asunción", scope: "Estatal" },
  "2026-09-11": { name: "Diada Nacional de Cataluña", scope: "Cataluña" },
  "2026-09-24": { name: "La Mercè", scope: "Barcelona" },
  "2026-10-12": { name: "Fiesta Nacional de España", scope: "Estatal" },
  "2026-12-08": { name: "La Inmaculada", scope: "Estatal" },
  "2026-12-25": { name: "Navidad", scope: "Estatal" },
  "2026-12-26": { name: "San Esteban", scope: "Cataluña" },
};
