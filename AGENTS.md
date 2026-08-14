# Guía para agentes

## Propósito y arquitectura

Brújula es una aplicación React de cliente. La interfaz y el estado principal están en `app/page.tsx`; el calendario de custodia vive en `app/noa-calendar.ts`, los festivos oficiales en `app/barcelona-holidays.ts`, los estilos globales en `app/globals.css` y los assets específicos de platos en `public/recipes/dishes/`.

Hay dos rutas de compilación:

- `npm run dev` y `npm run build` usan Vinext para desarrollo local.
- `npm run build:pages` usa `vite.github.config.ts` y genera el sitio estático en `dist-pages/` para GitHub Pages.

El workflow `.github/workflows/dieta-pages.yml` publica `dist-pages/` en GitHub Pages tras cada push a `main`.

## Normas de implementación

- Mantén la interfaz, los textos y los mensajes al usuario en español.
- La app se publica tanto con dominio propio como bajo una subruta de GitHub Pages. Conserva rutas relativas para recursos estáticos (por ejemplo, `./recipes/...`) y comprueba la compilación `build:pages` después de cambiar enlaces, imágenes o rutas.
- Los datos de usuario se guardan localmente con la clave `brujula-plan-v1`. Conserva la compatibilidad con datos ya guardados: al ampliar el estado, añade valores por defecto y migraciones tolerantes a campos ausentes.
- `nutritionTargets` contiene los objetivos de kcal, macros y agua; `waterIntake` registra mililitros por fecha. `DailyArchiveEntry.waterMl` es opcional para poder abrir archivos anteriores a la hidratación.
- Las semanas base también son propuestas editables. No sustituyas sus identificadores ni los identificadores de platos existentes porque se usan en asignaciones persistidas.
- Los nombres de los WebP de recetas se generan con la misma normalización que `dishId()` en `app/page.tsx`. Si se añaden platos base, crea su asset correspondiente y comprueba que no haya imágenes rotas en la biblioteca, el constructor ni el modal.
- `scripts/build-recipe-assets.mjs` recorta nueve láminas fuente en 104 WebP de 480×480. Las ocho primeras deben ser cuadrículas 4×3 y la novena 4×2.
- `getRecipeBadges()` deriva características y alérgenos de la propuesta. Mantén separados los badges `trait` y `allergen`, conserva los 14 alérgenos del anexo II del Reglamento (UE) 1169/2011 y no presentes `Sin gluten*` como una certificación.
- Al cambiar recetas o patrones de alérgenos, comprueba falsos positivos y negativos contra el nombre, `ingredientCatalog` y los pasos generados. Los filtros de exclusión deben ocultar cualquier plato que lleve el badge correspondiente.
- Contrasta los cambios del calendario de festivos con una fuente oficial del Ayuntamiento, la Generalitat o el BOE e incluye el enlace de procedencia junto a los datos.
- No introduzcas servicios externos, cuentas, analítica ni envío de información sin una solicitud explícita.
- Trata el calendario de custodia como información familiar sensible. No lo exportes a servicios externos ni lo dupliques en documentación pública sin autorización expresa.
- No edites manualmente `dist-pages/`; es un artefacto generado.

## Verificación

Después de cambios de código, ejecuta:

```bash
npm run lint
npm run build:pages
```

Usa `npm test` cuando quieras ejecutar ambas comprobaciones de una vez. Para revisar el resultado estático en local:

```bash
npm run preview:pages
```

Después de modificar el estado diario, verifica como mínimo: registro de agua, archivo y actualización del día, reapertura desde Semana/Histórico, exportación/importación y compatibilidad con datos sin `waterIntake` o `waterMl`.

Después de modificar badges, verifica la leyenda, un filtro de característica, un filtro de alérgeno, una combinación sin resultados y el modal de receta en escritorio y móvil. Ningún badge debe superponerse a la fotografía.

## Cambios de despliegue

- Para cambios en Pages, revisa también `.github/workflows/dieta-pages.yml`, `vite.github.config.ts` y `public/CNAME`.
- GitHub Pages debe tener **GitHub Actions** configurado como fuente en **Settings → Pages**; si no existe un sitio Pages, `actions/configure-pages` fallará antes de subir el artefacto.
