/* ----------------------------------------------------------
   library.v7.2.js — EDITORIAL LIBRARY EDITION
   Diseño de tarjetas elegantes y consistencia visual 
   con el estilo de reseña profesional.
---------------------------------------------------------- */

(function () {
  const LIB_KEY = "albumrater_v7.2_library";
  const $ = (s) => document.querySelector(s);

  // Colores de puntuación para consistencia
  const COLORS = {
    10: '#2e47ee', 9: '#0285c6', 8: '#02aec6',
    7: '#23be32', 6: '#f0ca15', 5: '#e12928'
  };

  function colorFor(score) {
    if (!Number.isFinite(score)) return '#2a3140';
    const base = Math.floor(score);
    return COLORS[Math.max(5, Math.min(10, base))] || '#2a3140';
  }

  /* --- Helpers de storage --- */
  function readLibrary() {
    try {
      const raw = localStorage.getItem(LIB_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }

  function writeLibrary(list) {
    try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } 
    catch (e) { console.warn("Error guardando librería", e); }
  }

  function uuid() {
    return (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10));
  }

  function computeAvg(tracks) {
    const vals = (tracks || []).map((t) => t.score).filter((v) => Number.isFinite(v) && v >= 0 && v <= 10);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function showToast(msg) {
    const t = $("#toast");
    if (!t) { alert(msg); return; }
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => { t.style.display = "none"; }, 1800);
  }

  /* --- Renderizado de Cards --- */
  let currentSort = "new";

  function sortLibrary(list, mode) {
    const arr = [...list];
    if (mode === "avg_desc") arr.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
    else if (mode === "avg_asc") arr.sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0));
    else if (mode === "alpha") arr.sort((a, b) => (a.album || "").localeCompare(b.album || ""));
    else arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return arr;
  }

  function renderLibrary() {
    const listEl = $("#libraryList");
    const emptyEl = $("#libraryEmpty");
    if (!listEl || !emptyEl) return;

    // Cambiar el contenedor a un grid de tarjetas
    listEl.style.display = "grid";
    listEl.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
    listEl.style.gap = "20px";
    listEl.style.padding = "10px 0";

    const lib = sortLibrary(readLibrary(), currentSort);
    listEl.innerHTML = "";

    if (!lib.length) {
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";

    lib.forEach((item) => {
      const card = document.createElement("div");
      card.className = "lib-card";
      card.style.background = "#1a2130";
      card.style.borderRadius = "12px";
      card.style.overflow = "hidden";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.border = "1px solid rgba(255,255,255,0.05)";
      card.style.transition = "transform 0.2s ease";

      // Area de Imagen/Portada
      const imgWrap = document.createElement("div");
      imgWrap.style.position = "relative";
      imgWrap.style.aspectRatio = "1 / 1";
      
      const img = document.createElement("img");
      img.src = item.cover || "https://via.placeholder.com/300?text=No+Cover";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      // Badge de Score flotante
      const scoreBadge = document.createElement("div");
      scoreBadge.style.position = "absolute";
      scoreBadge.style.top = "10px";
      scoreBadge.style.right = "10px";
      scoreBadge.style.background = colorFor(item.avgScore);
      scoreBadge.style.color = "white";
      scoreBadge.style.padding = "4px 8px";
      scoreBadge.style.borderRadius = "6px";
      scoreBadge.style.fontWeight = "800";
      scoreBadge.style.fontFamily = "'Lora', serif";
      scoreBadge.style.fontSize = "14px";
      scoreBadge.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
      scoreBadge.textContent = Number.isFinite(item.avgScore) ? item.avgScore.toFixed(1) : "—";

      imgWrap.append(img, scoreBadge);

      // Info del Album
      const content = document.createElement("div");
      content.style.padding = "15px";
      content.style.flexGrow = "1";

      const albumT = document.createElement("div");
      albumT.style.fontWeight = "700";
      albumT.style.fontSize = "15px";
      albumT.style.marginBottom = "4px";
      albumT.style.whiteSpace = "nowrap";
      albumT.style.overflow = "hidden";
      albumT.style.textOverflow = "ellipsis";
      albumT.textContent = item.album;

      const artistT = document.createElement("div");
      artistT.style.fontSize = "13px";
      artistT.style.opacity = "0.7";
      artistT.textContent = item.artist;

      const metaT = document.createElement("div");
      metaT.style.fontSize = "11px";
      metaT.style.marginTop = "8px";
      metaT.style.color = "var(--muted)";
      metaT.textContent = `${item.released || '—'} · ${item.trackCount || 0} tracks`;

      // Botones
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      actions.style.marginTop = "15px";

      const btnOpen = document.createElement("button");
      btnOpen.textContent = "Open";
      btnOpen.style.flex = "1";
      btnOpen.style.padding = "6px";
      btnOpen.style.fontSize = "12px";
      btnOpen.style.borderRadius = "6px";
      btnOpen.addEventListener("click", () => loadAlbumFromLibrary(item.id));

      const btnDel = document.createElement("button");
      btnDel.innerHTML = "🗑️";
      btnDel.style.background = "transparent";
      btnDel.style.border = "1px solid rgba(255,255,255,0.1)";
      btnDel.style.padding = "6px 10px";
      btnDel.style.borderRadius = "6px";
      btnDel.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteFromLibrary(item.id);
      });

      actions.append(btnOpen, btnDel);
      content.append(albumT, artistT, metaT, actions);
      card.append(imgWrap, content);
      listEl.appendChild(card);
    });

    if ($("#librarySort")) $("#librarySort").value = currentSort;
  }

  /* --- Funciones de Modal --- */
  function openLibraryModal() {
    const backdrop = $("#libraryBackdrop");
    if (!backdrop) return;
    renderLibrary();
    backdrop.style.display = "flex";
  }

  function closeLibraryModal() {
    $("#libraryBackdrop").style.display = "none";
  }

  /* --- Operaciones de Datos --- */
  function saveCurrentToLibrary() {
    if (!window.AlbumApp) return;
    const state = window.AlbumApp.getState();
    const avg = computeAvg(state.tracks);
    if (!state.album && !state.tracks.length) return alert("Nothing to save.");

    const entry = {
      id: uuid(),
      album: state.album || "Untitled Album",
      artist: state.artist || "Unknown Artist",
      released: state.released,
      cover: state.cover,
      tracks: state.tracks,
      avgScore: avg,
      trackCount: state.tracks.length,
      createdAt: Date.now()
    };

    const lib = readLibrary();
    lib.unshift(entry);
    writeLibrary(lib);
    showToast("Album saved to collection 📁");
  }

  function loadAlbumFromLibrary(id) {
    const lib = readLibrary();
    const item = lib.find(x => x.id === id);
    if (!item || !window.AlbumApp) return;

    window.AlbumApp.setState({
      album: item.album,
      artist: item.artist,
      released: item.released,
      cover: item.cover,
      tracks: item.tracks,
      lang: localStorage.getItem("albumrater_lang") || "en"
    });

    closeLibraryModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Album loaded 🎧");
  }

  function deleteFromLibrary(id) {
    if (!confirm("Remove this album?")) return;
    const lib = readLibrary().filter(x => x.id !== id);
    writeLibrary(lib);
    renderLibrary();
    showToast("Removed 🗑️");
  }

  function bind() {
    const btnSave = $("#btnSaveToLibrary") || $("#btnSaveLibrary");
    const btnOpen = $("#btnMyLibrary") || $("#btnLibrary");
    
    if (btnSave) btnSave.onclick = saveCurrentToLibrary;
    if (btnOpen) btnOpen.onclick = openLibraryModal;
    if ($("#libraryClose")) $("#libraryClose").onclick = closeLibraryModal;
    
    if ($("#librarySort")) {
      $("#librarySort").onchange = (e) => {
        const v = e.target.value;
        currentSort = (v === "score_desc" || v === "high") ? "avg_desc" : 
                      (v === "score_asc" || v === "low") ? "avg_asc" : 
                      (v === "alpha") ? "alpha" : "new";
        renderLibrary();
      };
    }
  }

  function boot() { bind(); }
  if (document.readyState === "complete") boot(); else document.addEventListener("DOMContentLoaded", boot);

})();
