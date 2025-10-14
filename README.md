# Album Ranking App (Album Rater) — v7.1

Try the latest version:
- **GitHub Pages:** https://opesqueraa-ok.github.io/album-ranking/?v7.1

## What is this?
A fast, offline-capable web app to **score music albums** track by track. You can:
- Autofill album data (title, year, tracks, cover) using **MusicBrainz** (with iTunes fallback).
- Rate each track with **integer + decimal** (5.0–10.0) or leave it **unscored** (“-”).
- See a **live average** and a **timeline chart** of your enjoyment.
- Add **per-track notes** and **final album thoughts** (review).
- **Sort Top 10** (toggle between best-10 and original album order).
- **Export / Import** your data (JSON) — the export filename includes “`Album - Artist.json`”.
- Works on **mobile and desktop**, and can be installed as a **PWA**.

> v7.0 focuses on versioned caching & asset busting for more reliable updates.

## Key Features
- **Two-tap scoring** (integer + decimal) with color badges.
- **Unscored mode** for tracks you haven’t rated yet.
- **Notes & Review**: per-track notes (with pencil button) and a final notes box; rendered summary below the chart.
- **Library (optional)**: you can store multiple albums (local). *Cloud sync (Supabase) is coming soon.*
- **PWA**: works offline once cached; add it to your home screen.

## Tech Stack
- Plain **HTML/CSS/JS** (no framework).
- **MusicBrainz** + **Cover Art Archive**, fallback to **iTunes Search API**.
- **Service Worker** for offline caching.
- Local persistence via **localStorage** + JSON export/import.

## Files
- `index.html` — UI layout and wiring.
- `autofillAlbum.v6.5.js` — autofill logic (MB + iTunes) and rating grid.
- `ui.v6.5.js` — i18n, export/import, clear, notes, “Sort Top 10”, etc.
- `manifest.webmanifest` — PWA metadata.
- `sw-register.v7.0.js`, `sw.v7.0.js` — service worker registration & caching.

> If you prefer, rename `autofillAlbum`/`ui` to `*.v7.0.js` and update references in `index.html` and `sw.v7.0.js`.

## Development
Just open `index.html` locally or serve with any static web server.
To deploy, push to the repo’s `main` branch and enable **GitHub Pages**.

## Privacy
All data is stored **locally** in your browser unless you export it manually. No tracking.

## Changelog
- **v7.0**
  - Bumped versioned assets and cache name.
  - Cleaned SW precache list and manifest references.
  - Kept storage keys to preserve existing data.

---

# Aplicación de Ranking de Álbumes (Album Rater) — v7.1

Prueba la última versión:
- **GitHub Pages:** https://opesqueraa-ok.github.io/album-ranking/?v7.1

## ¿Qué es?
Una app web rápida, con soporte **offline**, para **puntuar álbumes** canción por canción. Puedes:
- Autocompletar datos del álbum (título, año, canciones, portada) con **MusicBrainz** (fallback a iTunes).
- Puntuar cada track con **entero + decimal** (5.0–10.0) o dejarlo **sin puntuar** (“-”).
- Ver el **promedio** en vivo y un **gráfico** de tu disfrute.
- Añadir **notas por canción** y una **conclusión final** del álbum.
- **Ordenar Top 10** (alternar entre top-10 y el orden original del álbum).
- **Exportar / Importar** tus datos (JSON) — el nombre del archivo exportado incluye “`Álbum - Artista.json`”.
- Funciona en **móvil y escritorio** y se puede instalar como **PWA**.

> v7.0 se centra en versionado de assets y cache busting para actualizaciones más fiables.

## Funcionalidades clave
- **Puntaje en dos pasos** (entero + decimal) con badges de color.
- **Modo sin puntuar** para canciones aún no calificadas.
- **Notas & Reseña**: notas por canción (botón con lápiz) y nota final; el resumen se muestra bajo el gráfico.
- **Biblioteca (opcional)**: puedes almacenar múltiples álbumes (local). *Sincronización en la nube (Supabase) próximamente.*
- **PWA**: funciona offline una vez cacheada; añádela a tu pantalla de inicio.

## Tecnologías
- **HTML/CSS/JS** puro (sin framework).
- **MusicBrainz** + **Cover Art Archive**, fallback a **iTunes Search API**.
- **Service Worker** para cacheo offline.
- Persistencia local con **localStorage** + exportación/importación JSON.

## Archivos
- `index.html` — estructura e integración de la UI.
- `autofillAlbum.v6.5.js` — autofill (MB + iTunes) y grilla de puntuación.
- `ui.v6.5.js` — i18n, export/import, limpiar, notas, “Sort Top 10”, etc.
- `manifest.webmanifest` — metadatos PWA.
- `sw-register.v7.0.js`, `sw.v7.0.js` — registro del SW y cacheo.

> Si prefieres, renombra `autofillAlbum`/`ui` a `*.v7.0.js` y actualiza referencias en `index.html` y `sw.v7.0.js`.

## Desarrollo
Abre `index.html` localmente o sirve con cualquier servidor estático.
Para publicar, haz push a `main` y habilita **GitHub Pages**.

## Privacidad
Tus datos se guardan **localmente** en tu navegador salvo que exportes manualmente. No hay tracking.

## Cambios
- **v7.0**
  - Actualización de versiones en assets y nombre de caché.
  - Limpieza de la lista de precarga del SW y referencias del manifest.
  - Se mantienen las keys de almacenamiento para no perder datos.
