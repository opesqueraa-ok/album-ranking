// ---------------------------------------------------------
// APP LOGIC (SINGLE SCRIPT) - v8.0
// ---------------------------------------------------------
window.AlbumApp = (function() {
    let state = { 
        artist: "", album: "", released: "", rankedby: "", cover: "", 
        tracks: [{ name: "", duration: "", score: "" }, { name: "", duration: "", score: "" }]
    };

    const dom = {
        inArtist: document.getElementById("inArtist"),
        inAlbum: document.getElementById("inAlbum"),
        inYear: document.getElementById("inYear"),
        inRanker: document.getElementById("inRanker"),
        trackEditor: document.getElementById("trackEditor"),
        pCover: document.getElementById("prevCover"),
        pScore: document.getElementById("prevScore"),
        pArtist: document.getElementById("prevArtist"),
        pAlbum: document.getElementById("prevAlbum"),
        pDetails: document.getElementById("prevDetails"),
        pTracks: document.getElementById("prevTracks"),
        fileInput: document.getElementById("fileInput"),
        btnFetch: document.getElementById("btnFetch")
    };

    // --- AUXILIAR: FORMATO TIEMPO ---
    function msToTime(duration) {
        if (!duration) return "--:--";
        let seconds = Math.floor((duration / 1000) % 60);
        let minutes = Math.floor((duration / (1000 * 60)));
        return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    }

    // --- MOTORES DE BÚSQUEDA ---
    async function searchITunes(artist, album) {
        console.log("🔵 Intentando iTunes...");
        try {
            const query = encodeURIComponent(`${artist} ${album}`);
            const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=1`);
            const data = await res.json();
            if (!data.results || data.results.length === 0) return null;
            const result = data.results[0];
            
            const lookupRes = await fetch(`https://itunes.apple.com/lookup?id=${result.collectionId}&entity=song&limit=200`);
            const lookupData = await lookupRes.json();
            const tracksRaw = lookupData.results.filter(x => x.wrapperType === 'track');

            return {
                source: "iTunes",
                artist: result.artistName,
                album: result.collectionName,
                released: result.releaseDate ? result.releaseDate.substring(0, 4) : "",
                cover: result.artworkUrl100 ? result.artworkUrl100.replace("100x100bb", "1000x1000bb") : "",
                tracks: tracksRaw.map(t => ({ name: t.trackName, duration: msToTime(t.trackTimeMillis), score: "" }))
            };
        } catch(e) { return null; }
    }

    async function searchMusicBrainz(artist, album) {
        console.log("🟠 Intentando MusicBrainz...");
        try {
            const query = encodeURIComponent(`release:${album} AND artist:${artist} AND status:official`);
            const res = await fetch(`https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json`);
            const data = await res.json();
            if (!data.releases || data.releases.length === 0) return null;

            const release = data.releases[0];
            const detailsRes = await fetch(`https://musicbrainz.org/ws/2/release/${release.id}?inc=recordings+media&fmt=json`);
            const detailsData = await detailsRes.json();

            let mbTracks = [];
            if (detailsData.media) {
                detailsData.media.forEach(medium => {
                    if (medium.tracks) medium.tracks.forEach(t => mbTracks.push({ name: t.title, duration: msToTime(t.length), score: "" }));
                });
            }

            let coverUrl = "";
            try {
                const cRes = await fetch(`https://coverartarchive.org/release/${release.id}/front`);
                if (cRes.ok) coverUrl = cRes.url;
            } catch (e) {}

            return {
                source: "MusicBrainz",
                artist: release['artist-credit'] ? release['artist-credit'][0].name : artist,
                album: release.title,
                released: release.date ? release.date.substring(0, 4) : "",
                cover: coverUrl,
                tracks: mbTracks
            };
        } catch(e) { return null; }
    }

    // --- EVENT LISTENER DEL BOTÓN BÚSQUEDA ---
    dom.btnFetch.addEventListener("click", async () => {
        const art = dom.inArtist.value.trim();
        const alb = dom.inAlbum.value.trim();
        if(!art || !alb) { alert("Ingresa Artista y Álbum primero."); return; }

        const originalTxt = dom.btnFetch.textContent;
        dom.btnFetch.textContent = "⏳ Buscando...";
        dom.btnFetch.disabled = true;

        // Lógica Híbrida
        let res = await searchITunes(art, alb);
        if (!res) res = await searchMusicBrainz(art, alb);

        if (res) {
            setState({
                artist: res.artist,
                album: res.album,
                released: res.released,
                cover: res.cover || state.cover, // Mantiene la actual si no encuentra nueva
                tracks: res.tracks
            });
        } else {
            alert("❌ No encontrado en bases de datos oficiales.\nEs posible que sea un Leak o muy nuevo.\n\n👉 Usa la opción 'Subir Imagen Local' y llena los tracks manualmente.");
        }

        dom.btnFetch.textContent = originalTxt;
        dom.btnFetch.disabled = false;
    });

    // --- LÓGICA DE RENDERIZADO ---
    function getBadgeColor(s) {
        const v = parseFloat(s);
        if (isNaN(v)) return "#333";
        if (v >= 9.0) return "#3b82f6"; // Azul Blue
        if (v >= 8.0) return "#06b6d4"; // Cyan
        if (v >= 7.0) return "#22c55e"; // Green
        if (v >= 6.0) return "#eab308"; // Yellow
        if (v >= 4.0) return "#f97316"; // Orange
        return "#ef4444"; // Red
    }

    function computeAvg() {
        let t=0, c=0; 
        state.tracks.forEach(x => { const s = parseFloat(x.score); if(!isNaN(s)){ t+=s; c++; } }); 
        return c===0 ? "0.0" : (t/c).toFixed(1);
    }
    
    function render() {
        if(document.activeElement!==dom.inArtist) dom.inArtist.value=state.artist;
        if(document.activeElement!==dom.inAlbum) dom.inAlbum.value=state.album;
        if(document.activeElement!==dom.inYear) dom.inYear.value=state.released;
        if(document.activeElement!==dom.inRanker) dom.inRanker.value=state.rankedby;

        dom.pArtist.textContent = state.artist || "Artist";
        dom.pAlbum.textContent = state.album || "Album Title";
        dom.pDetails.textContent = `${state.released || "Year"} • ${state.rankedby || "Ranked by You"}`;
        
        dom.pCover.src = state.cover || "https://via.placeholder.com/800x800/111/333?text=No+Cover";
        dom.pScore.textContent = computeAvg();

        dom.pTracks.innerHTML = "";
        state.tracks.forEach((t, i) => {
            const row = document.createElement("div"); 
            row.className = "p-track";
            let badge = t.score ? `<span class="score-badge" style="background:${getBadgeColor(t.score)}">${t.score}</span>` : `<span style="color:#333;font-weight:bold;">-</span>`;
            row.innerHTML = `<div class="col-dur">${t.duration||"--:--"}</div><div class="col-num">${i+1}</div><div class="col-name">${t.name||"Track Title"}</div><div class="col-score">${badge}</div>`;
            dom.pTracks.appendChild(row);
        });

        if(document.querySelectorAll(".track-input-name").length !== state.tracks.length) renderEditor();
    }

    function renderEditor(){
        dom.trackEditor.innerHTML = "";
        state.tracks.forEach((t,i) => {
            const row = document.createElement("div"); row.className = "track-row";
            row.innerHTML = `
                <span class="track-num">${i+1}</span>
                <input type="text" value="${t.duration||''}" oninput="window.AlbumApp.updateTrack(${i},'duration',this.value)" style="width:45px;text-align:center;color:#888;font-size:12px;" placeholder="m:ss">
                <input class="track-input-name" type="text" value="${t.name}" oninput="window.AlbumApp.updateTrack(${i},'name',this.value)" style="flex:1;" placeholder="Track Title">
                <input type="number" step="0.1" value="${t.score}" oninput="window.AlbumApp.updateTrack(${i},'score',this.value)" style="width:50px;text-align:center;font-weight:bold;color:white;" placeholder="-">
                <button class="btn-remove" onclick="window.AlbumApp.removeTrack(${i})">×</button>
            `;
            dom.trackEditor.appendChild(row);
        });
    }

    // --- Lógica Archivos Manuales ---
    dom.fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => setState({ cover: e.target.result });
            reader.readAsDataURL(file);
        }
    });

    // Guardar Imagen
    document.getElementById("btnSaveLibrary").addEventListener("click", () => {
        const card = document.getElementById("cardExport");
        html2canvas(card, { scale: 2, backgroundColor: "#050505" }).then(canvas => {
            const link = document.createElement("a");
            link.download = `${state.artist}-${state.album}-Review.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });
    });

    // API State
    function setState(newState){ state = {...state, ...newState}; if(newState.tracks) renderEditor(); render(); }
    function updateTrack(i, f, v) { state.tracks[i][f] = v; render(); }
    function addTrack() { state.tracks.push({name:"", duration:"", score:""}); renderEditor(); }
    function removeTrack(i) { state.tracks.splice(i,1); renderEditor(); render(); }
    function clearScores() { state.tracks.forEach(t => t.score = ""); renderEditor(); render(); }
    function removeCover() { setState({ cover: "" }); dom.fileInput.value = ""; }

    // Listeners
    dom.inArtist.addEventListener("input", e => setState({artist: e.target.value}));
    dom.inAlbum.addEventListener("input", e => setState({album: e.target.value}));
    dom.inYear.addEventListener("input", e => setState({released: e.target.value}));
    dom.inRanker.addEventListener("input", e => setState({rankedby: e.target.value}));

    renderEditor(); render();
    return { setState, updateTrack, addTrack, removeTrack, clearScores, removeCover };
})();
