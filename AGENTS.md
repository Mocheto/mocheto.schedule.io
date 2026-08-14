# Guía para agentes

## Propósito y arquitectura

Brújula es una aplicación React de cliente. La interfaz y el estado principal están en `app/page.tsx`; el calendario de custodia vive en `app/noa-calendar.ts`, los festivos oficiales en `app/barcelona-holidays.ts` y los estilos globales en `app/globals.css`.

Hay dos rutas de compilación:

- `npm run dev` y `npm run build` usan Vinext para desarrollo local.
- `npm run build:pages` usa `vite.github.config.ts` y genera el sitio estático en `dist-pages/` para GitHub Pages.

El workflow `.github/workflows/dieta-pages.yml` publica `dist-pages/` en GitHub Pages tras cada push a `main`.

## Normas de implementación

- Mantén la interfaz, los textos y los mensajes al usuario en español.
- La app se publica tanto con dominio propio como bajo una subruta de GitHub Pages. Conserva rutas relativas para recursos estáticos (por ejemplo, `./recipes/...`) y comprueba la compilación `build:pages` después de cambiar enlaces, imágenes o rutas.
- Los datos de usuario se guardan localmente con la clave `brujula-plan-v1`. Conserva la compatibilidad con datos ya guardados: al ampliar el estado, añade valores por defecto y migraciones tolerantes a campos ausentes.
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

## Cambios de despliegue

- Para cambios en Pages, revisa también `.github/workflows/dieta-pages.yml`, `vite.github.config.ts` y `public/CNAME`.
- GitHub Pages debe tener **GitHub Actions** configurado como fuente en **Settings → Pages**; si no existe un sitio Pages, `actions/configure-pages` fallará antes de subir el artefacto.
