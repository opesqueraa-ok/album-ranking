/* ----------------------------------------------------------
   library.v7.2.js — EDITORIAL LIBRARY & PERSISTENCE
   - Guarda/Carga álbumes en localStorage.
   - Genera dinámicamente el Modal (Ventana flotante).
   - Renderiza tarjetas con diseño Editorial (Cover + Score).
---------------------------------------------------------- */

(function () {
    const LIB_KEY = "albumrater_v7.2_library";
    const $ = (s) => document.querySelector(s);

    // Traducciones internas de la librería
    const libI18n = {
        en: {
            empty: "Your collection is empty.",
            confirmDel: "Delete this album from your collection?",
            btnLoad: "Load Album",
            title: "My Collection",
            toastSaved: "Album saved to collection ✅",
            toastLoaded: "Album loaded to editor 🎧",
            toastDel: "Album removed 🗑️",
            errIncomplete: "Please add at least an Artist and Album name."
        },
        es: {
            empty: "Tu colección está vacía.",
            confirmDel: "¿Eliminar este álbum de tu colección?",
            btnLoad: "Cargar Álbum",
            title: "Mi Colección",
            toastSaved: "Álbum guardado en la colección ✅",
            toastLoaded: "Álbum cargado al editor 🎧",
            toastDel: "Álbum eliminado 🗑️",
            errIncomplete: "Por favor agrega al menos Artista y Álbum."
        }
    };

    // --- HELPERS DE ALMACENAMIENTO ---
    function readLibrary() {
        try {
            const raw = localStorage.getItem(LIB_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    function writeLibrary(list) {
        localStorage.setItem(LIB_KEY, JSON.stringify(list));
    }

    function getLang() {
        return window.AlbumApp?.state?.lang || 'en';
    }

    function showToast(msg) {
        const t = document.getElementById("toast");
        if (!t) return;
        t.textContent = msg;
        t.style.display = "block";
        setTimeout(() => { t.style.display = "none"; }, 2000);
    }

    // --- GUARDAR ÁLBUM ACTUAL ---
    function saveCurrentToLibrary() {
        if (!window.AlbumApp) return;
        
        // 1. Obtener estado actual
        const state = window.AlbumApp.getState();
        const lang = getLang();

        // 2. Validación
        if (!state.artist || !state.album) {
            alert(libI18n[lang].errIncomplete);
            return;
        }

        // 3. Crear objeto de guardado (Snapshot)
        // Calculamos el promedio aquí para guardarlo fijo en la tarjeta
        const avg = window.AlbumApp.computeAvg(); 
        
        const entry = {
            id: crypto.randomUUID(), // ID único
            artist: state.artist,
            album: state.album,
            released: state.released,
            rankedby: state.rankedby,
            cover: state.cover,
            tracks: state.tracks, // Array de tracks con puntajes
            avgScore: avg,
            savedAt: Date.now()
        };

        // 4. Guardar (al principio de la lista)
        const lib = readLibrary();
        lib.unshift(entry);
        writeLibrary(lib);

        showToast(libI18n[lang].toastSaved);
    }

    // --- CARGAR ÁLBUM AL EDITOR ---
    function loadAlbumFromLibrary(id) {
        const lib = readLibrary();
        const item = lib.find(x => x.id === id);
        if (!item) return;

        // Inyectar datos en la App Principal
        window.AlbumApp.setState({
            artist: item.artist,
            album: item.album,
            released: item.released,
            rankedby: item.rankedby,
            cover: item.cover,
            tracks: item.tracks || []
        });

        // Cerrar modal y notificar
        const backdrop = document.getElementById("libraryBackdrop");
        if (backdrop) backdrop.style.display = "none";
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(libI18n[getLang()].toastLoaded);
    }

    // --- ELIMINAR DE LA LIBRERÍA ---
    function deleteFromLibrary(id) {
        if (!confirm(libI18n[getLang()].confirmDel)) return;
        
        const lib = readLibrary().filter(x => x.id !== id);
        writeLibrary(lib);
        renderLibrary(); // Re-renderizar la lista
        showToast(libI18n[getLang()].toastDel);
    }

    // --- UI: RENDERIZADO DE TARJETAS (EDITORIAL STYLE) ---
    function renderLibrary() {
        const listEl = document.getElementById("libraryList");
        const emptyEl = document.getElementById("libraryEmpty");
        if (!listEl) return;

        const lib = readLibrary();
        const lang = getLang();

        listEl.innerHTML = "";
        
        // Configuración Grid
        listEl.style.display = "grid";
        listEl.style.gridTemplateColumns = "repeat(auto-fill, minmax(220px, 1fr))";
        listEl.style.gap = "20px";
        listEl.style.padding = "10px 0";

        // Estado Vacío
        if (lib.length === 0) {
            listEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#8a94a6;">${libI18n[lang].empty}</div>`;
            return;
        }

        // Generar Tarjetas
        lib.forEach(item => {
            const scoreVal = parseFloat(item.avgScore) || 0;
            const scoreColor = window.AlbumApp.getColor(scoreVal);

            const card = document.createElement("div");
            card.style.cssText = `
                background: #1a2130;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.05);
                display: flex;
                flex-direction: column;
                transition: transform 0.2s;
            `;
            
            // Efecto Hover simple
            card.onmouseover = () => card.style.borderColor = "rgba(255,255,255,0.2)";
            card.onmouseout = () => card.style.borderColor = "rgba(255,255,255,0.05)";

            card.innerHTML = `
                <div style="position: relative; width: 100%; aspect-ratio: 1/1;">
                    <img src="${item.cover || 'https://via.placeholder.com/300'}" 
                         style="width:100%; height:100%; object-fit:cover; display:block;">
                    <div style="
                        position: absolute; top: 10px; right: 10px;
                        background: ${scoreColor}; color: white;
                        padding: 4px 10px; border-radius: 4px;
                        font-family: 'Lora', serif; font-weight: 700; font-size: 16px;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                    ">
                        ${scoreVal.toFixed(1)}
                    </div>
                </div>
                <div style="padding: 15px; display: flex; flex-direction: column; gap: 4px; flex-grow: 1;">
                    <div style="font-family:'Lora', serif; font-weight:700; font-size:15px; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${item.album}
                    </div>
                    <div style="font-size:12px; color:#8a94a6; margin-bottom:10px;">
                        ${item.artist}
                    </div>
                    <div style="font-size:11px; color:#555; margin-bottom:15px;">
                        ${item.released || '—'} • ${item.tracks?.length || 0} tracks
                    </div>
                    
                    <div style="margin-top:auto; display:flex; gap:10px;">
                        <button class="btn-load" style="
                            flex:1; background:#3b82f6; color:white; border:none; 
                            padding:8px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px;
                        ">${libI18n[lang].btnLoad}</button>
                        <button class="btn-del" style="
                            width:30px; background:rgba(225,41,40,0.1); color:#e12928; border:1px solid rgba(225,41,40,0.2); 
                            border-radius:4px; cursor:pointer; font-weight:bold;
                        ">×</button>
                    </div>
                </div>
            `;

            // Bind Eventos
            card.querySelector(".btn-load").onclick = () => loadAlbumFromLibrary(item.id);
            card.querySelector(".btn-del").onclick = () => deleteFromLibrary(item.id);

            listEl.appendChild(card);
        });
    }

    // --- MODAL MANAGER (Crea el HTML si no existe) ---
    function openLibraryModal() {
        let backdrop = document.getElementById("libraryBackdrop");

        // Si no existe el modal en el DOM, lo creamos
        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "libraryBackdrop";
            backdrop.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85); z-index: 9999;
                display: none; justify-content: center; align-items: center;
                backdrop-filter: blur(5px);
            `;

            const content = document.createElement("div");
            content.style.cssText = `
                background: #0b0f15; width: 90%; max-width: 900px; height: 85vh;
                border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
                display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 50px 100px rgba(0,0,0,0.5);
            `;

            const header = document.createElement("div");
            header.id = "libHeader";
            header.style.cssText = `
                padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex; justify-content: space-between; align-items: center;
                background: #161b26;
            `;

            const scrollArea = document.createElement("div");
            scrollArea.id = "libraryList";
            scrollArea.style.cssText = "padding: 25px; overflow-y: auto; flex-grow: 1;";

            content.appendChild(header);
            content.appendChild(scrollArea);
            backdrop.appendChild(content);
            document.body.appendChild(backdrop);
        }

        // Actualizar Textos del Header según idioma
        const header = document.getElementById("libHeader");
        const lang = getLang();
        header.innerHTML = `
            <h2 style="margin:0; font-family:'Lora', serif; font-size:22px; color:white;">${libI18n[lang].title}</h2>
            <button id="libClose" style="background:none; border:none; color:white; font-size:28px; cursor:pointer; line-height:1;">&times;</button>
        `;

        // Bind Close
        document.getElementById("libClose").onclick = () => {
            backdrop.style.display = "none";
        };
        
        // Cerrar al hacer clic fuera
        backdrop.onclick = (e) => {
            if (e.target === backdrop) backdrop.style.display = "none";
        };

        renderLibrary();
        backdrop.style.display = "flex";
    }

    // --- INICIALIZACIÓN ---
    document.addEventListener("DOMContentLoaded", () => {
        const btnSave = document.getElementById("btnSaveLibrary");
        const btnOpen = document.getElementById("btnLibrary");

        if (btnSave) btnSave.addEventListener("click", saveCurrentToLibrary);
        if (btnOpen) btnOpen.addEventListener("click", openLibraryModal);
    });

    // Exponer para depuración si es necesario
    window.Library = { open: openLibraryModal, save: saveCurrentToLibrary };

})();
