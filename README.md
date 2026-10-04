# Super Noa

Juego infantil de plataformas en 2D creado para navegador. Incluye cinco mundos con tres pantallas cada uno, un reino secreto desbloqueable en las nubes, doble salto, tres vidas, rutas elevadas, quince pegatinas de campaña y tres insignias secretas, puntos de control, cajas de recompensa, precipicios y duelos contra guardianes. El quinto mundo transcurre sobre barcos voladores e incorpora piratas, loros y cañones.

Al terminar una pantalla normal, Noa llega a un farol de rescate, se coloca junto al gatito aunque viniera saltando y aparece una breve celebración antes de continuar.

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

La compilación estática se genera en `dist-pages/`. El workflow `.github/workflows/super-noa-pages.yml` la publica en GitHub Pages después de cada push a `main`. Cada cambio validado se publica automáticamente en la rama principal.

## Controles

- Movimiento: flechas o `A`/`D`.
- Salto y doble salto: pulsa una o dos veces espacio, `W` o flecha arriba.
- Cajas con huella: se abren saltando y golpeándolas desde abajo.
- Bola de lana: `X` o `K`, después de recoger el potenciador de gato de una caja.
- Pausa: `Esc`.
- Monstruos finales: gana dos rondas de piedra, papel o tijera. Cada derrota puede repetirse gastando una manzana; sin manzanas se reinicia la pantalla, pero no se pierde una vida. También puedes rendirte y volver al mapa.
- Rutas especiales: ramas elásticas en el mundo 1, plataformas de niebla en el mundo 2, aullidos de aviso en el mundo 3, copas altas en el mundo 4 y barcos voladores con cañones en el mundo 5. En el mundo de los jabalíes hay un bloque secreto elevado que crea una enredadera hacia el Reino Secreto de las Nubes.
- Álbum: hay una pegatina opcional en una ruta especial de cada pantalla de campaña y tres insignias en el reino secreto.
- En móvil o tableta aparecen controles táctiles grandes, etiquetados con `IZQ.`, `DER.`, `LANA` y `SALTAR`. Mantén una dirección con un dedo y toca `SALTAR` con otro para hacer el doble salto.
- También se admite un mando mediante Gamepad API.

El progreso y las pegatinas se guardan únicamente en el navegador con la clave `super-noa-progress-v1`.

## Licencias

El personaje, los cinco monstruos finales, los escenarios, el código y los efectos sintetizados se crearon para este proyecto. La música procede de “Platformer Chiptunes”, de Guy G. Gamerson, publicada bajo CC0. Consulta [CREDITS.md](CREDITS.md).
