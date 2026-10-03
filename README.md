# Super Noa

Juego infantil de plataformas en 2D creado para navegador. Incluye dos mundos con dos pantallas cada uno, cinco vidas, puntos de control, controles táctiles, teclado y mando.

## Desarrollo

```bash
npm install
npm run dev
```

## Verificación y GitHub Pages

```bash
npm test
npm run preview:pages
```

La compilación estática se genera en `dist-pages/`. El workflow `.github/workflows/super-noa-pages.yml` la publica en GitHub Pages después de cada push a `main`.

## Controles

- Movimiento: flechas o `A`/`D`.
- Salto: espacio, `W` o flecha arriba.
- Bola de lana: `X` o `K`, después de recoger el potenciador de gato.
- Pausa: `Esc`.
- En móvil o tableta aparecen controles táctiles grandes.
- También se admite un mando mediante Gamepad API.

El progreso se guarda únicamente en el navegador con la clave `super-noa-progress-v1`.

## Licencias

El personaje, los escenarios, el código y los efectos sintetizados se crearon para este proyecto. La música procede de “Platformer Chiptunes”, de Guy G. Gamerson, publicada bajo CC0. Consulta [CREDITS.md](CREDITS.md).
