# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Panel de propiedades (solo ADMIN)

El sitio publico ya **no** lee un archivo de datos: pide las propiedades a la API
(`GET /api/properties`, solo las publicadas). Se cargan y editan desde el panel.

1. Ingresa por `/login` (URL oculta, no esta en el menu) con una cuenta `ADMIN`.
2. En `/admin` esta el panel de propiedades: alta, edicion, fotos, destacar,
   publicar/despublicar y eliminar. El sitio se actualiza solo.

### Puesta en marcha del backend

```bash
cd server
npx prisma db push              # crea/actualiza las tablas en SQLite
npm run seed                    # crea el usuario admin inicial
npm run importar:propiedades    # opcional: carga las 25 propiedades historicas
node src/index.js               # API en http://localhost:4000
```

Las fotos subidas desde el panel se guardan en `server/uploads/properties/` y se
sirven en `/uploads/...` (en desarrollo Vite hace proxy de esa ruta).

### Fotos desde ZonaProp

Las fotos de los avisos publicados se pueden traer automaticamente:

```bash
cd server
npm run importar:fotos              # baja todas las fotos y actualiza la base
npm run importar:fotos -- --dry-run # solo informa, no escribe nada
npm run importar:fotos -- --agregar # además crea como borrador los avisos nuevos
```

- Recorre la pagina de la inmobiliaria en ZonaProp, entra a cada aviso y baja
  **todas** sus fotos (hasta 1600x1200) a `public/propiedades/<id-del-aviso>/`.
- Asocia cada aviso con la propiedad cuyo `external_link` termina en ese ID.
- Con `--agregar`, los avisos publicados que todavia no estan en el catalogo se
  crean **sin publicar**, con titulo, direccion, precio, medidas, descripcion y
  caracteristicas tomados de la ficha. Se revisan y publican desde `/admin`.
- Vuelve a correrlo cuando quieras: no baja de nuevo las fotos que ya estan.
- Al final lista las propiedades que ya no estan publicadas en ZonaProp.
- Necesita `curl` (viene en Windows 10+ y en Linux/macOS).
