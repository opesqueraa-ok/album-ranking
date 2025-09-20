// UI v6.5 wiring (lang/export/import/clear + notes + better export name)
(function () {
  const $ = s => document.querySelector(s);

  const I18N = {
    en: {
      subtitle:
        "Quick form to score albums. Choose track count, pick scores with two taps (integer + decimal), and everything updates live.",
      album: "Album",
      artist: "Artist",
      released: "Release Date",
      rankedby: "Ranked by",
      cover: "Cover",
      trackcount: "Tracks",
      num: "#",
      duration: "Duration",
      name: "Name",
      score: "Score (int + decimal)",
      color: "Color",
      apply: "Apply Track Count",
      addRow: "+ Add Row",
      delRow: "– Remove Last",
      clearAll: "Clear All Data",
      clearScores: "Clear Score",
      import: "Import Data",
      export: "Export Data",
      total: "Duration",
      avg: "Average",
      confirmClear: "Are you sure you want to clear all fields?",
      notePrompt: "Write a note for this track:",
      imported: "Imported.",
      invalidFile: "Invalid file.",
      exportFail: "Could not export.",
    },
    es: {
      subtitle:
        "Formulario rápido para puntuar álbumes. Elige número de canciones, selecciona puntaje en dos toques (entero + decimal) y todo se actualiza al instante.",
      album: "Álbum",
      artist: "Artista",
      released: "Fecha de lanzamiento",
      rankedby: "Rankeado por",
      cover: "Cover",
      trackcount: "Canciones",
      num: "#",
      duration: "Duración",
      name: "Nombre",
      score: "Puntaje (entero + decimal)",
      color: "Color",
      apply: "Aplicar cantidad",
      addRow: "+ Añadir fila",
      delRow: "– Quitar última",
      clearAll: "Borrar todos los datos",
      clearScores: "Limpiar puntajes",
      import: "Importar datos",
      export: "Exportar datos",
      total: "Duración total",
      avg: "Promedio",
      confirmClear: "¿Seguro que deseas borrar todos los campos?",
      notePrompt: "Escribe una nota para esta canción:",
      imported: "Importado.",
      invalidFile: "Archivo inválido.",
      exportFail: "No se pudo exportar.",
    },
  };

  const KEY_LANG = "albumrater_lang";
  const NOTES_KEY = "albumrater_v6_notes";

  // ---------- I18N ----------
  function applyI18N(lang) {
    const t = I18N[lang] || I18N.en;
    const sub = $("#subtitle");
    if (sub) sub.textContent = t.subtitle;
    document
      .querySelectorAll("[data-i18n]")
      .forEach(
        (el) => (el.textContent = t[el.dataset.i18n] || el.textContent)
      );
    const ids = [
      ["applyCount", "apply"],
      ["addRow", "addRow"],
      ["delRow", "delRow"],
      ["clearAll", "clearAll"],
      ["importLabel", "import"],
      ["exportJSON", "export"],
      ["clearScores", "clearScores"],
    ];
    ids.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t[key];
    });
    const langSel = $("#lang");
    if (langSel) langSel.value = lang;
  }

  // ---------- Helpers ----------
  const safeName = (s) =>
    (s || "")
      .replace(/[\\/:*?"<>|]+/g, "")
      .trim()
      .replace(/\s+/g, " ");

  function currentLang() {
    return (
      localStorage.getItem(KEY_LANG) ||
      (navigator.language || "en").startsWith("es")
        ? "es"
        : "en"
    );
  }

  function stateKeyForNotes() {
    const s = window.AlbumApp.getState();
    return `${safeName(s.album || "Album")}__${safeName(s.artist || "Artist")}`;
  }

  function loadAllNotes() {
    try {
      return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveAllNotes(obj) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(obj));
  }

  function getNotesForCurrent() {
    const all = loadAllNotes();
    return all[stateKeyForNotes()] || { trackNotes: {}, final: "" };
  }

  function setNotesForCurrent(n) {
    const all = loadAllNotes();
    all[stateKeyForNotes()] = n;
    saveAllNotes(all);
  }

  // ---------- Export / Import / Clear ----------
  function exportJSON() {
    try {
      const s = window.AlbumApp.getState();
      const notes = getNotesForCurrent();
      const payload = { ...s, notes };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const album = safeName(s.album || "Album");
      const artist = safeName(s.artist || "");
      const fname = artist ? `${album} - ${artist}.json` : `${album}.json`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((I18N[currentLang()] || I18N.en).exportFail);
      console.error(e);
    }
  }

  function importJSON(file) {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        // 1) Cargar estado visual
        window.AlbumApp.setState(obj);
        window.AlbumApp.save();
        // 2) Restaurar notas si existen
        if (obj && obj.notes) {
          setNotesForCurrent({
            trackNotes: obj.notes.trackNotes || {},
            final: obj.notes.final || "",
          });
          // pintar UI de notas
          renderNotesOutput();
          const final = $("#finalNotes");
          if (final) final.value = obj.notes.final || "";
        }
        alert((I18N[currentLang()] || I18N.en).imported);
      } catch (err) {
        alert((I18N[currentLang()] || I18N.en).invalidFile);
      }
    };
    r.readAsText(file);
  }

  function clearAll() {
    const lang = localStorage.getItem(KEY_LANG) || $("#lang")?.value || "en";
    const msg = (I18N[lang] || I18N.en).confirmClear;
    if (!confirm(msg)) return;
    localStorage.removeItem("albumrater_v6_state");
    // Mantener las notas del álbum en almacenamiento; solo vaciamos pantalla
    window.AlbumApp.setState({
      lang,
      album: "",
      artist: "",
      released: "",
      rankedby: "",
      cover: "",
      tracks: [],
    });
  }

  // Limpia SOLO los puntajes (los deja en “-”)
  function clearScores() {
    const s = window.AlbumApp.getState();
    s.tracks = (s.tracks || []).map((t) => ({ ...t, score: NaN }));
    window.AlbumApp.setState(s);
    window.AlbumApp.save();
  }

  // ---------- Notas por canción ----------
  function ensureNoteButtons() {
    const container = document.getElementById("tracks");
    if (!container) return;

    [...container.children].forEach((row, idx) => {
      // ya existe botón?
      if (row.querySelector(".noteBtn")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "noteBtn";
      btn.title = "Add note";
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33h-.5v-.5l9.06-9.06.5.5L5.92 19.58zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>';

      // insertar como última celda de la fila (tenemos una columna para esto)
      row.appendChild(btn);

      btn.addEventListener("click", () => {
        const lang = currentLang();
        const t = I18N[lang] || I18N.en;
        const notes = getNotesForCurrent();
        const prev = notes.trackNotes[idx] || "";
        const text = prompt(t.notePrompt, prev == null ? "" : String(prev));
        if (text == null) return; // cancel
        notes.trackNotes[idx] = text.trim();
        setNotesForCurrent(notes);
        renderNotesOutput();
        // resaltar botón si tiene nota
        btn.classList.toggle("active", !!notes.trackNotes[idx]);
      });

      // pintar estado activo si ya hay nota
      const notes = getNotesForCurrent();
      btn.classList.toggle("active", !!notes.trackNotes[idx]);
    });
  }

  function renderNotesOutput() {
    const out = $("#notesOutput");
    if (!out) return;

    const s = window.AlbumApp.getState();
    const notes = getNotesForCurrent();

    // construir listado: "1. Track Name: note"
    const lines = [];
    const tracks = s.tracks || [];
    tracks.forEach((t, i) => {
      const note = notes.trackNotes[i];
      if (note && note.trim()) {
        const name = t?.name || `Track ${i + 1}`;
        lines.push(`${i + 1}. ${name}: ${note.trim()}`);
      }
    });

    const albumTitle = s.album ? `${s.album} by ${s.artist || ""}`.trim() : "";
    const header = albumTitle ? albumTitle + "\n" : "";

    const final = notes.final || "";
    const finalBlock = final.trim()
      ? `\nFinal Album Thoughts: ${final.trim()}`
      : "";

    out.textContent = header + lines.join("\n") + finalBlock;
  }

  function bindFinalNotes() {
    const ta = $("#finalNotes");
    if (!ta || ta._bound) return;
    ta._bound = true;
    ta.addEventListener("input", () => {
      const n = getNotesForCurrent();
      n.final = ta.value || "";
      setNotesForCurrent(n);
      renderNotesOutput();
    });
  }

  // Observar cambios en #tracks para inyectar botones de notas
  function observeTrackList() {
    const target = document.getElementById("tracks");
    if (!target || target._observerAttached) return;
    target._observerAttached = true;

    const mo = new MutationObserver(() => {
      ensureNoteButtons();
      renderNotesOutput();
    });
    mo.observe(target, { childList: true, subtree: false });
    // primer pase
    ensureNoteButtons();
    renderNotesOutput();
  }

  // ---------- Bind UI ----------
  function bindUI() {
    let LANG =
      localStorage.getItem(KEY_LANG) ||
      ((navigator.language || "en").startsWith("es") ? "es" : "en");
    applyI18N(LANG);

    const langSel = $("#lang");
    if (langSel && !langSel._bound) {
      langSel._bound = true;
      langSel.addEventListener("change", (e) => {
        LANG = e.target.value;
        localStorage.setItem(KEY_LANG, LANG);
        applyI18N(LANG);
        const s = window.AlbumApp.getState();
        s.lang = LANG;
        window.AlbumApp.setState(s);
        window.AlbumApp.save();
      });
    }

    const exp = $("#exportJSON");
    if (exp && !exp._bound) {
      exp._bound = true;
      exp.addEventListener("click", exportJSON);
    }

    const imp = $("#importJSON");
    if (imp && !imp._bound) {
      imp._bound = true;
      imp.addEventListener("change", (ev) => {
        const f = ev.target.files[0];
        if (f) importJSON(f);
        ev.target.value = "";
      });
    }

    const clr = $("#clearAll");
    if (clr && !clr._bound) {
      clr._bound = true;
      clr.addEventListener("click", clearAll);
    }

    const clrScores = $("#clearScores");
    if (clrScores && !clrScores._bound) {
      clrScores._bound = true;
      clrScores.addEventListener("click", clearScores);
    }

    // Notas
    bindFinalNotes();
    observeTrackList();

    // Re-pintar notas cuando cambie el álbum/artist (por ejemplo tras autofill)
    window.addEventListener("album-autofilled", () => {
      bindFinalNotes();
      observeTrackList();
      const notes = getNotesForCurrent();
      const ta = $("#finalNotes");
      if (ta) ta.value = notes.final || "";
      renderNotesOutput();
    });
  }

  function boot() {
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      try {
        bindUI();
      } catch (e) {
        console.error(e);
      }
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        try {
          bindUI();
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  boot();
})();
