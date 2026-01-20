/* ----------------------------------------------------------
   library.v7.2.js — EDITORIAL LIBRARY
---------------------------------------------------------- */
(function () {
    const LIB_KEY = "albumrater_v7.2_library";
    
    function readLibrary() {
        try { return JSON.parse(localStorage.getItem(LIB_KEY)) || []; } catch { return []; }
    }
    function writeLibrary(l) { localStorage.setItem(LIB_KEY, JSON.stringify(l)); }
    function showToast(m) {
        const t = document.getElementById("toast");
        if(t){ t.textContent=m; t.style.display="block"; setTimeout(()=>t.style.display="none",2000); }
    }

    // Guardar
    function saveCurrentToLibrary() {
        if (!window.AlbumApp) return;
        const s = window.AlbumApp.getState();
        if (!s.artist || !s.album) { alert("Add Artist and Album first."); return; }
        
        const entry = {
            id: crypto.randomUUID(),
            artist: s.artist, album: s.album, released: s.released,
            cover: s.cover, tracks: s.tracks, avgScore: window.AlbumApp.computeAvg(),
            savedAt: Date.now()
        };
        const lib = readLibrary();
        lib.unshift(entry);
        writeLibrary(lib);
        showToast("Album saved to Library ✅");
    }

    // Cargar
    function loadAlbumFromLibrary(id) {
        const item = readLibrary().find(x => x.id === id);
        if (!item) return;
        window.AlbumApp.setState({
            artist: item.artist, album: item.album, released: item.released,
            cover: item.cover, tracks: item.tracks || []
        });
        document.getElementById("libraryBackdrop").style.display = "none";
        showToast("Album loaded 🎧");
    }

    // Borrar
    function deleteFromLibrary(id) {
        if (!confirm("Delete this album?")) return;
        writeLibrary(readLibrary().filter(x => x.id !== id));
        renderLibrary();
    }

    // Render UI
    function renderLibrary() {
        const listEl = document.getElementById("libraryList");
        if (!listEl) return;
        const lib = readLibrary();
        listEl.innerHTML = "";
        
        listEl.style.cssText = "display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:20px; padding:10px 0;";

        if (lib.length === 0) {
            listEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">Empty Collection</div>`;
            return;
        }

        lib.forEach(item => {
            const card = document.createElement("div");
            card.style.cssText = "background:#1a2130; border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);";
            card.innerHTML = `
                <div style="position:relative; width:100%; aspect-ratio:1/1;">
                    <img src="${item.cover||''}" style="width:100%; height:100%; object-fit:cover; display:block;">
                    <div style="position:absolute; top:10px; right:10px; background:${window.AlbumApp.getColor(item.avgScore)}; color:white; padding:2px 8px; border-radius:4px; font-weight:700;">${item.avgScore}</div>
                </div>
                <div style="padding:15px;">
                    <div style="font-weight:700; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.album}</div>
                    <div style="font-size:12px; color:#888; margin-bottom:10px;">${item.artist}</div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-load" style="flex:1; background:#3b82f6; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer;">Load</button>
                        <button class="btn-del" style="background:rgba(255,50,50,0.2); color:#ff5555; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">×</button>
                    </div>
                </div>
            `;
            card.querySelector(".btn-load").onclick = () => loadAlbumFromLibrary(item.id);
            card.querySelector(".btn-del").onclick = () => deleteFromLibrary(item.id);
            listEl.appendChild(card);
        });
    }

    // Modal
    function openLibraryModal() {
        let backdrop = document.getElementById("libraryBackdrop");
        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "libraryBackdrop";
            backdrop.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; justify-content:center; align-items:center;";
            backdrop.innerHTML = `
                <div style="background:#0b0f15; width:90%; max-width:900px; height:85vh; border-radius:12px; border:1px solid #333; display:flex; flex-direction:column;">
                    <div style="padding:20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
                        <h2 style="margin:0; font-family:'Lora';">My Collection</h2>
                        <button id="libClose" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
                    </div>
                    <div id="libraryList" style="padding:20px; overflow-y:auto; flex:1;"></div>
                </div>
            `;
            document.body.appendChild(backdrop);
            document.getElementById("libClose").onclick = () => backdrop.style.display="none";
            backdrop.onclick = (e) => { if(e.target===backdrop) backdrop.style.display="none"; };
        }
        renderLibrary();
        backdrop.style.display = "flex";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const btnSave = document.getElementById("btnSaveLibrary");
        const btnOpen = document.getElementById("btnLibrary");
        if (btnSave) btnSave.addEventListener("click", saveCurrentToLibrary);
        if (btnOpen) btnOpen.addEventListener("click", openLibraryModal);
    });
})();
