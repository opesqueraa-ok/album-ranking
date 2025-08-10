# Album Rater (PWA)

Ficha rápida para puntuar álbumes desde el navegador o iPhone (instalable como app).

## Cómo subir a GitHub Pages (sin terminal)
1. Crea un repositorio nuevo en GitHub, por ejemplo `album-rater` (público).
2. Entra al repo → **Add file → Upload files** y sube todo el contenido de esta carpeta:
   - `index.html`, `manifest.webmanifest`, `sw.js`, carpeta `icons/` y archivo `.nojekyll`.
3. Ve a **Settings → Pages**.
   - En **Source** elige **Deploy from a branch**.
   - En **Branch** elige `main` y carpeta **/** (root).
   - Guarda. En 1–2 minutos tendrás la URL tipo `https://tu-usuario.github.io/album-rater/`.

## Instalar en iPhone
1. Abre la URL pública en **Safari**.
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Se instalará como app y funcionará **offline**.

## Notas
- Colores de puntaje: 10 `#2e47ee`, 9 `#0285c6`, 8 `#02aec6`, 7 `#23be32`, 6 `#f0ca15`, 5 `#e12928`.
- Los datos se guardan en `localStorage`. Usa **Exportar JSON** para respaldar o mover datos.
- Para URL sin `/repo`, crea un repo `tu-usuario.github.io` y sube aquí el contenido.
