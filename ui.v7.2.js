/* ----------------------------------------------------------
   UI v7.2 — Offline version
   Controla:
   - Idioma
   - Botones del topbar
   - Export / Import
   - Clear All
   - Clear Scores
   - Sort Top 10
   - Notas por track
   - Notas finales
   - Render general
   - Guardado local
---------------------------------------------------------- */

(function () {

  const $ = s => document.querySelector(s);
  const KEY_LANG = "albumrater_lang";
  const KEY_STATE = "albumrater_v7.2_state";

  /* ========================================
     IDIOMAS
  ======================================== */
  const I18N = {
    en: {
      subtitle: "Quick form to score albums. Choose track count, pick scores with two taps (integer + decimal), and everything updates live.",
      album: "Album",
      artist: "Artist",
      released: "Release Date",
      rankedby: "Ranked by",
      cover: "Cover",
      trackcount: "Tracks",
      duration: "Duration",
      name: "Name",
      score: "Score (int + decimal)",
      color: "Color",
      num: "#",
      clear_all: "Clear All",
      clear_scores: "Clear Scores",
      sort_top10: "Sort Top 10",
      restore_order: "Restore Order",
      import_data: "Import Data",
      export_data: "Export Data",
      save_library: "Save to Library",
      library: "Library",
      library_title: "My Library",
      final_thoughts: "Final Album Thoughts",
      notes_review: "Notes & Review",
      deleted: "Deleted",
      saved: "Saved",
      no_albums: "No albums saved yet."
    },
    es: {
      subtitle: "Formulario rápido para puntuar álbumes. Elige número de canciones, selecciona puntaje en dos toques (entero + decimal) y todo se actualiza al instante.",
      album: "Álbum",
      artist: "Artista",
      released: "Fecha de lanzamiento",
      rankedby: "Rankeado por",
      cover: "Portada",
      trackcount: "Canciones",
      duration: "Duración",
      name: "Nombre",
      score: "Puntaje (entero + decimal)",
      color: "Color",
      num: "#",
      clear_all: "Borrar Todo",
      clear_scores: "Borrar Puntajes",
      sort_top10: "Ordenar Top 10",
      restore_order: "Restaurar Orden",
      import_data: "Importar Datos",
      export_data: "Exportar Datos",
      save_library: "Guardar en Biblioteca",
      library: "Biblioteca",
      library_title: "Mi Biblioteca",
      final_thoughts: "Conclusión Final del Álbum",
      notes_review: "Notas y Reseña",
      deleted: "Eliminado",
      saved: "Guardado",
      no_albums: "Aún no hay álbumes guardados."
    }
  };

  function applyLanguage(lang) {
    const t = I18N[lang];
    $("#subtitle").textContent = t.subtitle;
    $('[data-i18n="album"]').textContent = t.album;
    $('[data-i18n="artist"]').textContent = t.artist;
    $('[data-i18n="released"]').textContent = t.released;
    $('[data-i18n="rankedby"]').textContent = t.rankedby;
    $('[data-i18n="cover"]').textContent = t.cover;
    $('[data-i18n="trackcount"]').textContent = t.trackcount;
    $('[data-i18n="num"]').textContent = t.num;
    $('[data-i18n="duration"]').textContent = t.duration;
    $('[data-i18n="name"]').textContent = t.name;
    $('[data-i18n="score"]').textContent = t.score;
    $('[data-i18n="color"]').textContent = t.color;
    $('[data-i18n="library_title"]').textContent = t.library_title;

    $("#importLabel").textContent = t.import_data;
    $("#exportJSON").textContent = t.export_data;
    $("#clearAll").textContent = t.clear_all;
    $("#clearScores").textContent = t.clear_scores;
    $("#sortTop10").textContent = t.sort_top10;
    $("#btnSaveToLibrary").textContent = t.save_library;
    $("#btnMyLibrary").textContent = t.library;
  }

  /* ========================================
     EXPORTAR / IMPORTAR JSON (estado actual)
  ======================================== */
  function exportJSON() {
    const s = window.AlbumApp.getState();
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);

    const album = s.album || "album";
    const artist = s.artist || "artist";
    a.download = `${album} - ${artist}.json`;

    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJSON(file) {
    const r = new FileReader();
    r.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        window.AlbumApp.setState(obj);
        window.AlbumApp.save();
        showToast("Loaded");
      } catch {
        alert("Invalid file.");
      }
    };
    r.readAsText(file);
  }

  /* ========================================
     CLEAR ALL
  ======================================== */
  function clearAll() {
    if (!confirm("Clear ALL fields?")) return;

    window.AlbumApp.setState({
      lang: $("#lang").value,
      album: "",
      artist: "",
      released: "",
      rankedby: "",
      cover: "",
      tracks: []
    });

    window.AlbumApp.ensureRows(7);
    window.AlbumApp.render();
    window.AlbumApp.save();
  }

  /* ========================================
     TOP 10 SORT TOGGLE
  ======================================== */
  const SORT_STATE = { active: false, snapshot: null };

  function setSortButton(active) {
    const lang = $("#lang").value;
    $("#sortTop10").textContent = active ? I18N[lang].restore_order : I18N[lang].sort_top10;
  }

  function sortTop10() {
    const el = $("#tracks");

    if (!SORT_STATE.active) {
      SORT_STATE.snapshot = [...el.children].map(r => r.value());

      const arr = SORT_STATE.snapshot.map(x => ({ ...x }));
      const scored = arr.filter(t => Number.isFinite(t.score));
      const unscored = arr.filter(t => !Number.isFinite(t.score));

      scored.sort((a, b) => b.score - a.score);

      const top = scored.slice(0, 10);
      const rest = scored.slice(10).concat(unscored);

      const merged = top.concat(rest).map((t, i) => ({ ...t, n: i + 1 }));

      el.innerHTML = "";
      merged.forEach((t, i) => el.appendChild(window.AlbumApp.makeRow(i, t)));

      SORT_STATE.active = true;
      window.AlbumApp.render();
      setSortButton(true);
      return;
    }

    el.innerHTML = "";
    SORT_STATE.snapshot.forEach((t, i) => el.appendChild(window.AlbumApp.makeRow(i, t)));

    SORT_STATE.active = false;
    SORT_STATE.snapshot = null;
    window.AlbumApp.render();
    setSortButton(false);
  }

  /* ========================================
     TOAST
  ======================================== */
  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.style.display = "block";
    setTimeout(() => (t.style.display = "none"), 1500);
  }

  /* ========================================
     BIND UI
  ======================================== */
  function bindUI() {

    /* idioma */
    let lang = localStorage.getItem(KEY_LANG) || "en";
    $("#lang").value = lang;
    applyLanguage(lang);

    $("#lang").addEventListener("change", e => {
      localStorage.setItem(KEY_LANG, e.target.value);
      applyLanguage(e.target.value);
      window.AlbumApp.render();
    });

    /* export */
    $("#exportJSON").addEventListener("click", exportJSON);

    /* import */
    $("#importJSON").addEventListener("change", ev => {
      const f = ev.target.files[0];
      if (f) importJSON(f);
      ev.target.value = "";
    });

    /* clear all */
    $("#clearAll").addEventListener("click", clearAll);

    /* sort top 10 */
    $("#sortTop10").addEventListener("click", sortTop10);

    /* clear cover */
    $("#btnClearCover").addEventListener("click", () => {
      $("#coverOut").src = "";
      window.AlbumApp.save();
    });

    /* limpieza de puntajes */
    $("#clearScores").addEventListener("click", () => {
      const el = $("#tracks");
      [...el.children].forEach(row => {
        const v = row.value();
        v.score = NaN;
        row.replaceWith(window.AlbumApp.makeRow(0, v));
      });
      window.AlbumApp.render();
    });

    /* library buttons — la funcionalidad estará en library.v7.2.js */
    $("#btnSaveToLibrary").addEventListener("click", () => {
      window.Library.saveCurrent();
    });
    $("#btnMyLibrary").addEventListener("click", () => {
      window.Library.openModal();
    });
    $("#libraryClose").addEventListener("click", () => {
      $("#libraryBackdrop").style.display = "none";
    });
  }

  /* ========================================
     BOOT
  ======================================== */
  function boot() {
    bindUI();
  }

  boot();
})();
