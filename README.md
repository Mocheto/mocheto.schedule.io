# Brújula

Brújula es un planificador personal de alimentación, entrenamiento y progreso. Propone una ruta inicial de 12 semanas, con un objetivo intermedio sostenible y un enfoque en la constancia.

## Qué incluye

- planificación semanal de fuerza, carrera/paseo y pádel;
- cinco semanas base de menús, duplicables, editables y asignables al calendario;
- biblioteca de 104 platos con fotografía, receta rápida y valores nutricionales modificables;
- constructor diario con cálculo de kcal, proteína, hidratos y grasas, diagnóstico y diagrama circular;
- selección de comidas y lista de compra calculada por ingredientes;
- calendario mensual de custodia, festivos de Barcelona, comidas y entrenamiento;
- panel compacto con vistas separadas para hoy, semana, calendario, comidas y progreso;
- seguimiento diario de ayuno nocturno, vinagre diluido y compromisos alimentarios estrictos;
- contador diario de hidratación en pasos de 250 ml, con objetivo configurable y registro histórico;
- registro de peso y perímetro de cintura;
- ajuste de los datos personales y del día de pádel;
- exportación e importación de una copia de seguridad JSON.

## Ejecutar en local

Se necesita Node.js 22 o posterior.

```bash
npm ci
npm run dev
```

Abre la dirección que aparezca en la terminal; normalmente es `http://localhost:3000`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia el entorno de desarrollo. |
| `npm run lint` | Ejecuta las comprobaciones estáticas. |
| `npm run build` | Genera la versión de Vinext. |
| `npm run build:pages` | Genera la versión estática para GitHub Pages en `dist-pages/`. |
| `npm run preview:pages` | Sirve localmente el resultado de `build:pages`. |
| `npm test` | Ejecuta el lint y la compilación para Pages. |

## Publicación en GitHub Pages

El workflow [`.github/workflows/dieta-pages.yml`](.github/workflows/dieta-pages.yml) compila y publica el sitio cada vez que se suben cambios a la rama `main`.

Antes del primer despliegue hay que activar Pages en GitHub:

1. Abre **Settings → Pages** en el repositorio.
2. En **Build and deployment**, selecciona **GitHub Actions** como fuente.
3. Sube los cambios a `main`, o ejecuta manualmente **Actions → Publicar planificador Brújula → Run workflow**.

La URL temporal de GitHub Pages es `https://mocheto.github.io/mocheto.schedule.io/`. El dominio principal es `https://mocheto.schedule.io` una vez configurado en GitHub Pages y en el proveedor DNS. El archivo [`public/CNAME`](public/CNAME) contiene ese dominio.

## Datos y privacidad

La aplicación no tiene cuentas, analítica ni backend para los datos del plan. Todo se guarda en `localStorage` del navegador. Para moverlo entre navegadores o dispositivos, usa **Ajustar plan → Exportar copia** e importa después el archivo JSON.

Los objetivos nutricionales, platos personalizados, semanas de menú, asignaciones, vasos de agua y días archivados forman parte de esa copia. Al archivar un día se conserva la hidratación registrada junto con las comidas, el movimiento y las excepciones de hábitos.

## Assets de recetas

Las fotografías optimizadas están en [`public/recipes/dishes`](public/recipes/dishes). Cada receta base utiliza un WebP cuadrado de 480 px mediante un identificador derivado del nombre del plato.

El script [`scripts/build-recipe-assets.mjs`](scripts/build-recipe-assets.mjs) permite reconstruir los 104 recortes a partir de nueve láminas fuente:

```bash
node scripts/build-recipe-assets.mjs lamina-1.png lamina-2.png lamina-3.png lamina-4.png lamina-5.png lamina-6.png lamina-7.png lamina-8.png lamina-9.png
```

Las ocho primeras láminas contienen una cuadrícula 4×3 y la última una cuadrícula 4×2.

> El calendario contiene información familiar. Si Pages está disponible públicamente, cualquier persona que conozca la URL podrá verlo. Revisa la visibilidad del repositorio y de Pages antes de compartirlo.

## Nota de salud

El contenido es orientación general y no sustituye el consejo de un profesional sanitario o dietista-nutricionista. Ante dolor, mareo o síntomas inusuales durante el ejercicio, detén la actividad y consulta a un profesional.
