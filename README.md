# Brújula

Planificador personal de alimentación, ejercicio y progreso. Está diseñado como
una ruta inicial de 12 semanas para un hombre de 42 años, 192 cm y 100 kg, con
un objetivo final de 87 kg y poco tiempo disponible.

La aplicación prioriza la constancia sobre la perfección. Incluye:

- objetivo intermedio de 94–96 kg durante las primeras 12 semanas;
- planificación semanal de fuerza, carrera/paseo y pádel;
- rutinas de fuerza para mancuernas y máquina multifunción;
- menú semanal flexible de estilo mediterráneo, mexicano, japonés e italiano;
- cuatro semanas completas de menús y sustitución independiente por día;
- fichas 💡 con recetas sencillas de 3 pasos y tiempos de preparación;
- selección de los platos que realmente se van a preparar;
- lista de compra calculada por ingredientes y cantidades orientativas;
- calendario mensual navegable con los días de custodia de Noa;
- superposición de custodia, comidas y entrenamiento en cada fecha;
- registro de peso y perímetro de cintura;
- guardado local y exportación/importación de una copia JSON.

El pádel queda planificado los lunes por defecto. Puede cambiarse desde
**Ajustar plan** si finalmente se fija otro día.

## Uso local

Requiere Node.js 22 o posterior. Los comandos son iguales en Linux y macOS y no
dependen de rutas absolutas:

```bash
npm ci
npm run dev
```

La dirección local se muestra en la terminal, normalmente
`http://localhost:3000`.

## Comprobaciones

```bash
npm run lint
npm test
npm run build:pages
```

`npm run build` genera la versión vinext. `npm run build:pages` genera en
`dist-pages/` la versión estática que se publica en GitHub Pages.

## GitHub Pages

El repositorio incluye el workflow `.github/workflows/dieta-pages.yml`. Al
subir cambios a `main`, GitHub valida, compila y publica el sitio desde la
raíz del repositorio. La primera vez hay que elegir **GitHub Actions** como fuente en
**Settings → Pages → Build and deployment** del repositorio.

El archivo `public/CNAME` publica el sitio con el dominio
`mocheto.schedule.io` cuando el dominio esté configurado en GitHub Pages y DNS.

También se puede iniciar manualmente desde **Actions → Publicar planificador
Brújula → Run workflow**.

## Datos y privacidad

No hay cuentas, analítica ni servidor de datos. El progreso se almacena en
`localStorage`, únicamente en el navegador que se esté usando. Para trasladar
los datos entre equipos o navegadores, usa **Ajustar plan → Exportar copia** e
importa después el archivo JSON.

El calendario de 2026 se extrajo de las celdas azules (`#00B0F0`) del Excel del
convenio, sin modificar ni copiar el archivo original al repositorio. La opción
**Corregir días** permite añadir o quitar fechas; esas correcciones también se
guardan únicamente en el navegador.

> [!IMPORTANT]
> El calendario contiene información familiar. Si GitHub Pages se publica de
> forma pública, cualquier visitante con la dirección podrá verlo. Revisa la
> visibilidad del repositorio y de Pages antes de activar el despliegue.

## Alcance de salud

El contenido es orientación general y no sustituye el consejo médico ni el de
un dietista-nutricionista. El rango energético es un punto de partida que debe
ajustarse a la tendencia real, el hambre y la respuesta al entrenamiento. Ante
dolor, mareos o síntomas inusuales, hay que detener el ejercicio y consultar a
un profesional sanitario.
