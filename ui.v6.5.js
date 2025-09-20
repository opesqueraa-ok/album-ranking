// UI v6.5 wiring (lang/export/import/clear + notes + better export name)
(function () {
  const $ = s => document.querySelector(s);

  // ... (I18N tal cual lo tienes)

  const KEY_LANG = "albumrater_lang";
  const NOTES_KEY = "albumrater_v6_notes";

  // ---------- I18N ----------
  // (igual que tu versión)

  // ---------- Helpers ----------
  const safeName = (s) =>
    (s || "").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, " ");

  // FIX: precedencia correcta
  function currentLang() {
    const stored = localStorage.getItem(KEY_LANG);
    if (stored) return stored;
    return ((navigator.language || "en").startsWith("es")) ? "es" : "en";
  }

  function stateKeyForNotes() {
    const s = window.AlbumApp.getState();
    return `${safeName(s.album || "Album")}__${safeName(s.artist || "Artist")}`;
  }

  // ... (resto del archivo SIN cambios)
  // pega aquí el resto de tu ui.v6.5.js tal cual lo enviaste
})();
