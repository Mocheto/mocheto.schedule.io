# Guía para agentes

## Arquitectura

Super Noa es un juego React/Vite de plataformas dibujado sobre Canvas 2D.

- `src/App.tsx`: navegación, HUD, progreso local, música y modales.
- `src/game/GameCanvas.tsx`: bucle, física, controles y renderizado.
- `src/game/levels.ts`: definición declarativa de las doce pantallas, sus cajas de recompensa y los cuatro encuentros finales.
- `src/game/BossBattle.tsx`: duelos de piedra, papel o tijera contra los monstruos finales.
- `src/game/stickers.ts`: catálogo estable de las doce pegatinas coleccionables.
- `src/game/types.ts`: tipos del motor y extensión futura.
- `src/styles.css`: interfaz adaptable y controles táctiles.
- `public/assets/`: hoja de animaciones y música.

## Reglas

- Mantén los textos visibles en español y adecuados para una niña de cinco años.
- No copies recursos, niveles, música, sonidos o personajes de Nintendo ni de otros juegos comerciales.
- Conserva rutas relativas (`./assets/...`) para que funcione tanto en el dominio propio como bajo una subruta de GitHub Pages.
- El progreso usa `super-noa-progress-v1`. Amplía el formato de forma tolerante a campos ausentes.
- Las fotografías de referencia son privadas: no deben copiarse al repositorio, al sitio ni a documentación pública.
- Los datos de niveles deben permanecer declarativos para poder incorporar coleccionables en el futuro sin cambiar el motor.
- No edites manualmente `dist-pages/`; es un artefacto generado.
- Conserva la atribución musical y la licencia de `CREDITS.md`.

## Verificación

Después de cambios ejecuta:

```bash
npm run lint
npm run build:pages
```

Antes de publicar comprueba las doce pantallas, doble salto, muelles, niebla, avisos de lobos y jabalíes, rutas por las copas, pegatinas y álbum, los cuatro duelos, el reintento gastando una manzana y el reinicio sin manzanas, cajas golpeadas desde abajo, pérdida de vidas, reaparición, checkpoints, manzana, gato, lana, progreso, sonido, teclado y controles táctiles.
