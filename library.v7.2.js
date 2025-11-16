/* ----------------------------------------------------------
   library.v7.2.js — Librería OFFLINE (localStorage)
   - Guarda álbum actual en una lista local
   - Lista álbumes guardados en un modal
   - Cargar/borrar álbumes
   - Sin Supabase, solo localStorage
---------------------------------------------------------- */

(function () {
  const LIB_KEY = "albumrater_v7.2_library";

  const $ = (s) => document.querySelector(s);

  /* ----------------------------------------
     Helpers de storage
  ---------------------------------------- */
  function readLibrary() {
    try {
      const raw = localStorage.getItem(LIB_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data;
    } catch {
      return [];
    }
  }

  function writeLibrary(list) {
    try {
      localStorage.setItem(LIB_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Error guardando librería", e);
    }
  }

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function computeAvg(tracks) {
    const vals = (tracks || [])
      .map((t) => t.score)
      .filter((v) => Number.isFinite(v) && v >= 0 && v <= 10);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function showToast(msg) {
    const t = $("#toast");
    if (!t) {
      alert(msg);
      return;
    }
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      t.style.display = "none";
    }, 1800);
  }

  /* ----------------------------------------
     Render de la librería
  ---------------------------------------- */

  let currentSort = "new"; // "new" | "avg_desc" | "avg_asc" | "alpha"

  function sortLibrary(list, mode) {
    const arr = [...list];
    switch (mode) {
      case "avg_desc":
        arr.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
        break;
      case "avg_asc":
        arr.sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0));
        break;
      case "alpha":
        arr.sort((a, b) =>
          (a.album || "").localeCompare(b.album || "", undefined, {
            sensitivity: "base",
          })
        );
        break;
      case "new":
      default:
        arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
    }
    return arr;
  }

  function renderLibrary() {
    const listEl = $("#libraryList");
    const emptyEl = $("#libraryEmpty");
    const sortSel = $("#librarySort");

    if (!listEl || !emptyEl) return;

    const lib = sortLibrary(readLibrary(), currentSort);

    listEl.innerHTML = "";

    if (!lib.length) {
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";

    lib.forEach((item) => {
      const row = document.createElement("div");
      row.className = "lib-row";
      row.style.display = "contents"; // para usar la grid del contenedor

      // cover
      const colCover = document.createElement("div");
      const img = document.createElement("img");
      img.className = "lib-cover";
      img.src = item.cover || "";
      img.alt = item.album || "";
      colCover.appendChild(img);

      // info (album + artist + released)
      const colInfo = document.createElement("div");
      colInfo.style.minWidth = "0";
      const title = document.createElement("div");
      title.style.fontWeight = "600";
      title.style.whiteSpace = "nowrap";
      title.style.overflow = "hidden";
      title.style.textOverflow = "ellipsis";
      title.textContent = item.album || "—";

      const meta = document.createElement("div");
      meta.style.fontSize = "12px";
      meta.style.opacity = "0.8";
      meta.style.whiteSpace = "nowrap";
      meta.style.overflow = "hidden";
      meta.style.textOverflow = "ellipsis";
      meta.textContent = [
        item.artist || "",
        item.released || "",
      ]
        .filter(Boolean)
        .join(" · ");

      colInfo.appendChild(title);
      colInfo.appendChild(meta);

      // avg
      const colAvg = document.createElement("div");
      colAvg.style.textAlign = "center";
      if (Number.isFinite(item.avgScore)) {
        colAvg.textContent = item.avgScore.toFixed(1).replace(/\.0$/, "");
      } else {
        colAvg.textContent = "—";
      }

      // tracks
      const colTracks = document.createElement("div");
      colTracks.style.textAlign = "center";
      colTracks.textContent = String(item.trackCount || (item.tracks || []).length || "—");

      // actions (open/delete)
      const colOpen = document.createElement("div");
      colOpen.style.display = "flex";
      colOpen.style.justifyContent = "center";
      colOpen.style.gap = "6px";

      const btnOpen = document.createElement("button");
      btnOpen.textContent = "Open";
      btnOpen.style.fontSize = "12px";
      btnOpen.addEventListener("click", () => loadAlbumFromLibrary(item.id));

      const btnDel = document.createElement("button");
      btnDel.textContent = "Delete";
      btnDel.style.fontSize = "12px";
      btnDel.addEventListener("click", () => deleteFromLibrary(item.id));

      colOpen.appendChild(btnOpen);
      colOpen.appendChild(btnDel);

      listEl.append(colCover, colInfo, colAvg, colTracks, colOpen);
    });

    if (sortSel) {
      sortSel.value = currentSort;
    }
  }

  function openLibraryModal() {
    const backdrop = $("#libraryBackdrop");
    if (!backdrop) return;
    renderLibrary();
    backdrop.style.display = "flex";
  }

  function closeLibraryModal() {
    const backdrop = $("#libraryBackdrop");
    if (!backdrop) return;
    backdrop.style.display = "none";
  }

  /* ----------------------------------------
     Operaciones: guardar / cargar / borrar
  ---------------------------------------- */

  function saveCurrentToLibrary() {
    if (!window.AlbumApp || !window.AlbumApp.getState) {
      alert("La app aún no está lista.");
      return;
    }

    const state = window.AlbumApp.getState();
    const avg = computeAvg(state.tracks || []);
    const trackCount = (state.tracks || []).length;

    if (!state.album && !trackCount) {
      alert("No hay nada que guardar.");
      return;
    }

    const now = Date.now();

    const entry = {
      id: uuid(),
      album: state.album || "—",
      artist: state.artist || "—",
      released: state.released || "",
      rankedby: state.rankedby || "",
      cover: state.cover || "",
      tracks: state.tracks || [],
      avgScore: avg,
      trackCount,
      createdAt: now,
      updatedAt: now,
    };

    const lib = readLibrary();
    lib.unshift(entry);
    writeLibrary(lib);
    showToast("Saved to local library ✅");
  }

  function loadAlbumFromLibrary(id) {
    if (!window.AlbumApp || !window.AlbumApp.setState) return;
    const lib = readLibrary();
    const item = lib.find((x) => x.id === id);
    if (!item) return;

    // Reconstruimos un state compatible con AlbumApp
    const state = {
      lang: localStorage.getItem("albumrater_lang") || "en",
      album: item.album,
      artist: item.artist,
      released: item.released || "",
      rankedby: item.rankedby || "",
      cover: item.cover || "",
      tracks: item.tracks || [],
    };

    window.AlbumApp.setState(state);
    closeLibraryModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Album loaded from library 🎧");
  }

  function deleteFromLibrary(id) {
    if (!confirm("Delete this album from local library?")) return;
    const lib = readLibrary().filter((x) => x.id !== id);
    writeLibrary(lib);
    renderLibrary();
    showToast("Album deleted 🗑️");
  }

  /* ----------------------------------------
     Bindeos de UI
  ---------------------------------------- */

  function bind() {
    const btnSave =
      $("#btnSaveToLibrary") || $("#btnSaveLibrary") || $("#btnSaveLib");
    const btnOpen =
      $("#btnMyLibrary") || $("#btnLibrary") || $("#btnOpenLibrary");
    const btnClose = $("#libraryClose");
    const sortSel = $("#librarySort");

    if (btnSave && !btnSave._bound) {
      btnSave._bound = true;
      btnSave.addEventListener("click", saveCurrentToLibrary);
    }

    if (btnOpen && !btnOpen._bound) {
      btnOpen._bound = true;
      btnOpen.addEventListener("click", openLibraryModal);
    }

    if (btnClose && !btnClose._bound) {
      btnClose._bound = true;
      btnClose.addEventListener("click", closeLibraryModal);
    }

    if (sortSel && !sortSel._bound) {
      sortSel._bound = true;
      sortSel.addEventListener("change", () => {
        const v = sortSel.value;
        if (v === "desc" || v === "score_desc" || v === "high") {
          currentSort = "avg_desc";
        } else if (v === "asc" || v === "score_asc" || v === "low") {
          currentSort = "avg_asc";
        } else if (v === "alpha") {
          currentSort = "alpha";
        } else {
          currentSort = "new";
        }
        renderLibrary();
      });
    }
  }

  function boot() {
    bind();
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }

})();
