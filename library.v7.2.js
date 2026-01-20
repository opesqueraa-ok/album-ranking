/* ----------------------------------------------------------
   library.v7.2.js — EDITORIAL LIBRARY EDITION
   - Persistencia de Año, Ranker y Portada en Alta Resolución.
   - Diseño de tarjetas (cards) consistente con el estilo Editorial.
   - Colores sólidos para scores (sin degradados).
---------------------------------------------------------- */

(function () {
  const LIB_KEY = "albumrater_v7.2_library";
  const $ = (s) => document.querySelector(s);

  // Traducciones internas para la interfaz de la librería
  const libI18n = {
    en: {
      empty: "Your library is empty.",
      confirmDel: "Delete this album from your collection?",
      btnOpen: "Open",
      btnDel: "Delete",
      toastLoaded: "Album loaded 🎧",
      toastSaved: "Saved to collection ✅",
      toastDel: "Removed 🗑️"
    },
    es: {
      empty: "Tu librería está vacía.",
      confirmDel: "¿Eliminar este álbum de tu colección?",
      btnOpen: "Abrir",
      btnDel: "Borrar",
      toastLoaded: "Álbum cargado 🎧",
      toastSaved: "Guardado en la colección ✅",
      toastDel: "Eliminado 🗑️"
    }
  };

  /* --- Helpers de Storage --- */
  function readLibrary() {
    try {
      const raw = localStorage.getItem(LIB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function writeLibrary(list) {
    localStorage.setItem(LIB_KEY, JSON.stringify(list));
  }

  function showToast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    setTimeout(() => { t.style.display = "none"; }, 2000);
  }

  /* --- Renderizado Estilo Editorial --- */
  function renderLibrary() {
    const listEl = $("#libraryList");
    const emptyEl = $("#libraryEmpty");
    if (!listEl) return;

    const lang = window.AlbumApp?.state.lang || 'en';
    const t = libI18n[lang];
    const lib = readLibrary();

    listEl.innerHTML = "";
    
    // Estilo del contenedor (Grid de tarjetas)
    listEl.style.display = "grid";
    listEl.style.gridTemplateColumns = "repeat(auto-fill, minmax(200px, 1fr))";
    listEl.style.gap = "20px";
    listEl.style.padding = "20px 0";

    if (lib.length === 0) {
      if (emptyEl) {
        emptyEl.textContent = t.empty;
        emptyEl.style.display = "block";
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    lib.forEach((item) => {
      const card = document.createElement("div");
      card.className = "lib-card";
      card.style.cssText = `
        background: #1a2130;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.05);
        display: flex;
        flex-direction: column;
        transition: transform 0.2s;
      `;

      // Imagen y Score Flotante
      const imgContainer = document.createElement("div");
      imgContainer.style.position = "relative";
      
      const img = document.createElement("img");
      img.src = item.cover || "https://via.placeholder.com/300?text=No+Cover";
      img.style.width = "100%";
      img.style.aspectRatio = "1/1";
      img.style.objectFit = "cover";
      img.style.display = "block";

      const badge = document.createElement("div");
      const scoreValue = parseFloat(item.avgScore) || 0;
      badge.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: ${window.AlbumApp.getColor(scoreValue)};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'Lora', serif;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      `;
      badge.textContent = scoreValue > 0 ? scoreValue.toFixed(1) : "0.0";

      imgContainer.append(img, badge);

      // Info
      const info = document.createElement("div");
      info.style.padding = "12px";
      
      const title = document.createElement("div");
      title.style.cssText = "font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
      title.textContent = item.album;

      const artist = document.createElement("div");
      artist.style.cssText = "font-size: 12px; color: #8a94a6; margin-top: 2px;";
      artist.textContent = item.artist;

      const meta = document.createElement("div");
      meta.style.cssText = "font-size: 11px; color: #555; margin-top: 8px;";
      meta.textContent = `${item.released || '—'} • ${item.tracks?.length || 0} tracks`;

      // Botones de Acción
      const actions = document.createElement("div");
      actions.style.cssText = "display: flex; gap: 8px; margin-top: 12px;";

      const btnOpen = document.createElement("button");
      btnOpen.textContent = t.btnOpen;
      btnOpen.className = "btn";
      btnOpen.style.cssText = "flex: 1; padding: 6px; font-size: 11px; background: #3b82f6; color: white; border:none; border-radius:4px; cursor:pointer;";
      btnOpen.onclick = () => loadAlbumFromLibrary(item.id);

      const btnDel = document.createElement("button");
      btnDel.textContent = "×";
      btnDel.style.cssText = "background: rgba(225, 41, 40, 0.1); color: #e12928; border: 1px solid rgba(225, 41, 40, 0.2); border-radius: 4px; padding: 0 10px; cursor: pointer;";
      btnDel.onclick = (e) => {
        e.stopPropagation();
        deleteFromLibrary(item.id);
      };

      actions.append(btnOpen, btnDel);
      info.append(title, artist, meta, actions);
      card.append(imgContainer, info);
      listEl.appendChild(card);
    });
  }

  /* --- Operaciones de Datos --- */
  function saveCurrentToLibrary() {
    if (!window.AlbumApp) return;
    const state = window.AlbumApp.getState();
    const avg = window.AlbumApp.computeAvg();
    const lang = state.lang || 'en';

    if (!state.album && !state.artist) return;

    const entry = {
      id: crypto.randomUUID(),
      album: state.album,
      artist: state.artist,
      released: state.released,
      rankedby: state.rankedby,
      cover: state.cover,
      tracks: state.tracks,
      avgScore: avg,
      createdAt: Date.now()
    };

    const lib = readLibrary();
    lib.unshift(entry);
    writeLibrary(lib);
    showToast(libI18n[lang].toastSaved);
  }

  function loadAlbumFromLibrary(id) {
    const lib = readLibrary();
    const item = lib.find(x => x.id === id);
    if (!item) return;

    window.AlbumApp.setState({
      album: item.album,
      artist: item.artist,
      released: item.released,
      rankedby: item.rankedby,
      cover: item.cover,
      tracks: item.tracks
    });

    const backdrop = $("#libraryBackdrop");
    if (backdrop) backdrop.style.display = "none";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(libI18n[window.AlbumApp.state.lang].toastLoaded);
  }

  function deleteFromLibrary(id) {
    const lang = window.AlbumApp?.state.lang || 'en';
    if (!confirm(libI18n[lang].confirmDel)) return;

    const lib = readLibrary().filter(x => x.id !== id);
    writeLibrary(lib);
    renderLibrary();
    showToast(libI18n[lang].toastDel);
  }

  /* --- UI Helpers --- */
  function openLibraryModal() {
    // Si no tienes un modal en tu HTML, lo creamos dinámicamente o lo mostramos
    let backdrop = $("#libraryBackdrop");
    if (!backdrop) {
        // Crear estructura básica de modal si no existe
        backdrop = document.createElement("div");
        backdrop.id = "libraryBackdrop";
        backdrop.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;";
        
        const content = document.createElement("div");
        content.style.cssText = "background:#0b0f15; width:100%; max-width:900px; max-height:90vh; border-radius:12px; border:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; overflow:hidden;";
        
        const header = document.createElement("div");
        header.style.cssText = "padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;";
        header.innerHTML = `<h2 style="margin:0; font-family:'Lora', serif;">My Collection</h2><button id="libClose" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>`;
        
        const scrollArea = document.createElement("div");
        scrollArea.id = "libraryList";
        scrollArea.style.cssText = "padding:20px; overflow-y:auto; flex-grow:1;";
        
        content.append(header, scrollArea);
        backdrop.appendChild(content);
        document.body.appendChild(backdrop);
        
        $("#libClose").onclick = () => backdrop.style.display = "none";
    }
    
    renderLibrary();
    backdrop.style.display = "flex";
  }

  /* --- Bindeo Final --- */
  document.addEventListener("DOMContentLoaded", () => {
    const btnSave = $("#btnSaveLibrary");
    const btnOpen = $("#btnLibrary");

    if (btnSave) btnSave.onclick = saveCurrentToLibrary;
    if (btnOpen) btnOpen.onclick = openLibraryModal;
  });

  // Exportar funciones necesarias
  window.Library = { render: renderLibrary, open: openLibraryModal };

})();
