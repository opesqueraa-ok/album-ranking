# Album Rater v3.1

Single-file PWA to rate album tracks and export shareable images.

## Features
- EN/ES language selector (persistent)
- Auto-save to localStorage
- Import/Export JSON
- Clear All Data (with confirmation)
- "Ranked by" field
- Image export:
  - Story 1080×1920 with blurred cover background + overlay
  - Post 1080×1350 (4:5)
- Exports include album, artist, date, average, duration, color table, timeline, "Ranked by" and footer credit.
- Cache-busting via VERSION string in `index.html` and `sw.js`

## Deploy (GitHub Pages)
1. Delete previous files (index.html, manifest.webmanifest, sw.js, icons/, .nojekyll, README.md, favicon* if any).
2. Upload the contents of this zip at repo root (include icons/).
3. Settings → Pages → Deploy from a branch → main → /.
4. Open your URL. If you don't see changes, hard-reload or reinstall the shortcut.
