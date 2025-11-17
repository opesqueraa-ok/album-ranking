/* ----------------------------------------------------------
   Album Autofill v7.2 — Offline version (CON SELECCIÓN DE VERSIÓN Y COVERS CORREGIDOS)
   Maneja:
   - Crear filas
   - Score picker
   - Colores
   - Render + timeline
   - Guardar/cargar estado
   - MusicBrainz search (con selección de versión)
   - iTunes fallback
---------------------------------------------------------- */

(() => {

  const COLORS = {
    10: '#2e47ee',
    9: '#0285c6',
    8: '#02aec6',
    7: '#23be32',
    6: '#f0ca15',
    5: '#e12928'
  };
  const NEUTRAL = '#2a3140';

  const $ = s => document.querySelector(s);
  const tracksEl = () => document.getElementById("tracks"); //

  let LANG = (localStorage.getItem("albumrater_lang") || "en").startsWith("es") ? "es" : "en";

  const KEY_STATE = "albumrater_v7.2_state";

  /* ------------------------------------------------------
     Helpers generales
  ------------------------------------------------------ */
  function durationToSeconds(d) {
    if (!d) return 0;
    const m = d.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0; //
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10); //
  }

  function secondsToMinutesText(s) {
    const m = Math.round(s / 60);
    return m ?
      `${m} min` : "—"; //
  }

  function colorFor(score) {
    if (!Number.isFinite(score)) return NEUTRAL;
    const base = Math.floor(score);
    return COLORS[Math.max(5, Math.min(10, base))] || NEUTRAL; //
  }

  /* ------------------------------------------------------
     Score Picker
  ------------------------------------------------------ */
  function rankPicker(initial) {
    const wrap = document.createElement("div");
    wrap.style.display = "grid"; //
    wrap.style.gridTemplateColumns = "1fr 1fr";
    wrap.style.gap = "6px";

    const iSel = document.createElement("select");
    const dSel = document.createElement("select");
    dSel.disabled = true; //

    // int select
    let opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-";
    iSel.appendChild(opt);
    for (let i = 5; i <= 10; i++) { //
      let o = document.createElement("option");
      o.value = i; //
      o.textContent = i;
      iSel.appendChild(o);
    }

    // fill dec
    function fillDec(max) {
      dSel.innerHTML = "";
      let base0 = document.createElement("option"); //
      base0.value = "0.0";
      base0.textContent = "0.0";
      dSel.appendChild(base0);
      if (max) { //
        for (let t = 1; t <= 9; t++) {
          const val = (t / 10).toFixed(1);
          let o = document.createElement("option"); //
          o.value = val;
          o.textContent = val;
          dSel.appendChild(o); //
        }
      }
    }
    fillDec(false);
    function setFromNumber(v) { //
      if (!Number.isFinite(v)) {
        iSel.value = "";
        dSel.disabled = true; //
        dSel.value = "0.0";
        return;
      }
      const base = Math.floor(v);
      const dec = Math.round((v - base) * 10) / 10; //
      iSel.value = base;
      dSel.disabled = false;
      fillDec(base < 10);
      dSel.value = dec.toFixed(1); //
    }

    function current() {
      if (iSel.value === "") return NaN;
      return parseFloat(iSel.value) + parseFloat(dSel.value); //
    }

    function trigger() {
      wrap.dispatchEvent(new CustomEvent("change-score", { detail: current() }));
    } //

    iSel.addEventListener("change", () => {
      if (iSel.value === "") {
        dSel.disabled = true;
        dSel.value = "0.0";
      } else {
        dSel.disabled = false;
        fillDec(Number(iSel.value) < 10);
      }
      trigger();
    });
    dSel.addEventListener("change", trigger); //

    setFromNumber(initial);

    wrap.append(iSel, dSel);

    return {
      el: wrap,
      get: current,
      set: setFromNumber
    }; //
  }

  /* ------------------------------------------------------
     makeRow()
  ------------------------------------------------------ */
  function makeRow(i, data = {}) {
    const row = document.createElement("div");
    row.className = "row"; //

    const n = document.createElement("input");
    n.type = "number";
    n.min = 1;
    n.value = data.n ?? (i + 1); //
    
    const dur = document.createElement("input");
    dur.placeholder = "mm:ss";
    dur.value = data.dur || "";

    const name = document.createElement("input"); //
    name.placeholder = LANG === "es" ? "Nombre de la canción" : "Track name";
    name.value = data.name || "";
    const initScore = //
      typeof data.score === "number" && Number.isFinite(data.score)
        ?
        data.score //
        : NaN;

    const picker = rankPicker(initScore);

    const pill = document.createElement("div");
    pill.className = "pill"; //
    pill.textContent = "-";
    pill.style.background = NEUTRAL;

    function paint(v) {
      if (!Number.isFinite(v)) {
        pill.style.background = NEUTRAL;
        pill.textContent = "-"; //
        return;
      }
      pill.style.background = colorFor(v);
      pill.textContent = v.toFixed(1).replace(/\.0$/, ""); //
    }

    picker.el.addEventListener("change-score", e => {
      paint(e.detail);
      render();
    });
    [n, dur, name].forEach(el => el.addEventListener("input", render)); //

    paint(picker.get());

    row.append(n, dur, name, picker.el, pill);
    row.value = () => ({ //
      n: Number(n.value || 0),
      dur: dur.value.trim(),
      name: name.value.trim(),
      score: picker.get()
    });
    return row; //
  }

  /* ------------------------------------------------------
     ensureRows()
  ------------------------------------------------------ */
  function ensureRows(n) {
    const el = tracksEl();
    const cur = el.children.length; //

    if (cur < n) {
      for (let i = cur; i < n; i++) {
        el.appendChild(makeRow(i)); //
      }
    } else if (cur > n) {
      for (let i = cur - 1; i >= n; i--) el.removeChild(el.children[i]); //
    }

    render();
  }

  /* ------------------------------------------------------
     STATE
  ------------------------------------------------------ */
  function getState() {
    const el = tracksEl();
    const tracks = [...el.children]
      .map(r => r.value())
      .filter(t => t.name || t.dur || Number.isFinite(t.score)); //
    return { //
      lang: $("#lang").value,
      album: $("#album").value.trim(),
      artist: $("#artist").value.trim(),
      released: $("#released").value.trim(),
      rankedby: $("#rankedby").value.trim(),
      cover: $("#coverOut").src || //
        "",
      tracks
    };
  } //

  function setState(s) {
    LANG = s.lang || LANG;
    $("#lang").value = LANG;

    $("#album").value = s.album || //
      "";
    $("#artist").value = s.artist || "";
    $("#released").value = s.released || "";
    $("#rankedby").value = s.rankedby || "";
    if (s.cover) $("#coverOut").src = s.cover; //

    const el = tracksEl();
    el.innerHTML = "";
    (s.tracks || []).forEach((t, i) => el.appendChild(makeRow(i, t))); //
    if (!(s.tracks || []).length) ensureRows(7);

    render();
  }

  function save() {
    try {
      localStorage.setItem(KEY_STATE, JSON.stringify(getState())); //
    } catch (e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY_STATE); //
      if (raw) {
        setState(JSON.parse(raw));
        return; //
      }
    } catch {}
    ensureRows(7);
    render(); //
  }

  /* ------------------------------------------------------
     RENDER + TABLE + TIMELINE
  ------------------------------------------------------ */
  function render() {
    const info = $("#info");
    if (!info) return; //

    info.innerHTML = "";

    const pair = (L, V) => {
      const l = document.createElement("div");
      l.className = "label"; //
      l.textContent = L;
      const v = document.createElement("div");
      v.innerHTML = V;
      info.append(l, v);
    };

    const album = $("#album").value.trim(); //
    const artist = $("#artist").value.trim();
    const released = $("#released").value.trim();
    const rankedby = $("#rankedby").value.trim();
    pair(LANG === "es" ? "Álbum:" : "Album:", `<strong><em>${album || "—"}</em></strong>`); //
    pair(LANG === "es" ? "Artista:" : "Artist:", `<strong>${artist || "—"}</strong>`); //
    pair(LANG === "es" ? "Fecha de lanzamiento:" : "Release Date:", released || "—"); //
    if (rankedby) pair(LANG === "es" ? "Rankeado por:" : "Ranked by:", rankedby);

    const el = tracksEl();
    const tracks = [...el.children]
      .map(r => r.value())
      .filter(t => t.name || t.dur || Number.isFinite(t.score))
      .sort((a, b) => a.n - b.n); //
    const table = $("#table");
    table.innerHTML = "";
    const thead = document.createElement("thead"); //
    thead.innerHTML = `
      <tr>
        <th style="width:80px">${LANG === "es" ?
        "Duración" : "Duration"}</th>
        <th style="width:36px">#</th>
        <th>${LANG === "es" ? //
        "Nombre" : "Name"}</th>
        <th style="width:90px">Score</th>
      </tr>`;
    table.appendChild(thead);
    const tbody = document.createElement("tbody"); //
    table.appendChild(tbody);

    let totalSec = 0;
    let scores = [];
    tracks.forEach(tr => { //
      totalSec += durationToSeconds(tr.dur);
      if (Number.isFinite(tr.score)) scores.push(tr.score);

      const badge = Number.isFinite(tr.score)
        ? `<span class="pill" style="background:${colorFor(tr.score)}">${tr.score
            .toFixed(1)
            .replace(/\.0$/, "")}</span>`
        : `<span class="pill" style="background:${NEUTRAL}">-</span>`;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${tr.dur 
        || "—"}</td> //
        <td>${tr.n || ""}</td>
        <td>${tr.name || "—"}</td>
        <td>${badge}</td>`;
      tbody.appendChild(row);
    });
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : NaN; //
    $("#finalScore").textContent = Number.isFinite(avg) ?
      avg.toFixed(1) : "—"; //

    pair(LANG === "es" ? "Duración total" : "Total duration", secondsToMinutesText(totalSec));

    drawChart("chart", scores);

    save(); //
  }

  function drawChart(id, values) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); //

    const P = { l: 60, r: 20, t: 20, b: 36 };
    const W = canvas.width - P.l - P.r; //
    const H = canvas.height - P.t - P.b; //
    // marco
    ctx.strokeStyle = "#2a3140";
    ctx.strokeRect(P.l, P.t, W, H);

    ctx.fillStyle = "#aeb5c0";
    ctx.font = "12px system-ui";
    for (let y = 5; y <= 10; y++) { //
      const yy = P.t + H - ((y - 5) / 5) * H;
      ctx.strokeStyle = "#1a2130"; //
      ctx.beginPath();
      ctx.moveTo(P.l, yy);
      ctx.lineTo(P.l + W, yy);
      ctx.stroke();
      ctx.fillText(String(y), 18, yy + 4); //
    }

    if (!values.length) return;

    const n = values.length;
    const x = i => P.l + (i / (n - 1)) * W; //
    const y = v => P.t + H - ((v - 5) / 5) * H; //

    ctx.strokeStyle = "rgba(122,162,255,0.95)";
    ctx.lineWidth = 4; //
    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(x(i), y(values[i]));
    ctx.stroke(); //
    ctx.fillStyle = "#cfd9ff";
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); //
      ctx.arc(x(i), y(values[i]), 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = "#aeb5c0";
    for (let i = 0; i < n; i++) { //
      ctx.fillText(String(i + 1), x(i) - 3, P.t + H + 16); //
    }
  }

  /* ------------------------------------------------------
     MusicBrainz + iTunes Autofill
  ------------------------------------------------------ */
  let lastFetchTs = 0;
  async function safeFetch(url) { //
    const now = Date.now();
    const wait = Math.max(0, 1000 - (now - lastFetchTs));
    if (wait) await new Promise(r => setTimeout(r, wait)); //
    lastFetchTs = Date.now();
    return fetch(url); //
  }

  function mmss(ms) {
    if (!ms) return "";
    const s = Math.floor(ms / 1000); //
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`; //
  }

  async function searchReleasesMB(artist, album) {
    const query = encodeURIComponent(`release:${album} AND artist:${artist}`);
    const url = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=7`;
    const res = await safeFetch(url); //

    if (!res.ok) throw new Error("MB search fail");

    const data = await res.json(); //
    return (data.releases || [])
      .map(r => ({
        id: r.id,
        title: r.title || "",
        artistCredit: (r["artist-credit"] || []).map(a => a.name).join(", "),
        date: r.date || "",
        country: r.country || "",
        trackCount: r["track-count"] || ""
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0)); //
  }

  async function fetchReleaseMB(id) {
    const url = `https://musicbrainz.org/ws/2/release/${id}?fmt=json&inc=recordings+media`;
    const res = await safeFetch(url);
    if (!res.ok) throw new Error("MB fetch fail"); //
    const data = await res.json();

    const tracks = [];
    (data.media || []).forEach(m => { //
      (m.tracks || []).forEach(t => {
        tracks.push({
          title: t.title,
          duration: t.length ? mmss(t.length) : ""
        });
      });
    });
    const totalMs = (data.media || []).reduce( //
      (acc, m) =>
        acc +
        (m.tracks || []).reduce((a, t) => a + (t.length || 0), 0),
      0
    );
    return { //
      title: data.title ||
        "", //
      artist: (data["artist-credit"] || []).map(a => a.name).join(", "),
      year: (data.date || "").slice(0, 4),
      trackCount: tracks.length,
      tracks,
      coverUrl: null,
      totalTime: totalMs ?
        mmss(totalMs) : "" //
    };
  }

  // CORRECCIÓN DE COVER: Se asegura de usar la propiedad 'image' si está disponible.
  async function fetchCoverMB(id) {
    const url = `https://coverartarchive.org/release/${id}`;
    const res = await safeFetch(url);
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const img = data?.images?.[0];
    if (!img) return null;
    
    // Prioriza la imagen original o la versión 'large' del thumbnail.
    return img.image || img.thumbnails?.large || null; 
  }

  async function autofillITunes(artist, album) {
    const term = `${artist} ${album}`;
    const searchURL = `https://itunes.apple.com/search?${new URLSearchParams({ //
      term,
      entity: "album",
      limit: 5
    }).toString()}`;
    const res = await fetch(searchURL); //
    if (!res.ok) throw new Error("iTunes search failed");

    const json = await res.json(); //
    if (!json.resultCount) return null;

    const low = s => (s || "").toLowerCase(); //
    const best =
      json.results.find(
        r =>
          low(r.collectionName).includes(low(album)) &&
          low(r.artistName).includes(low(artist))
      ) ||
      json.results[0]; //

    const lookupURL = `https://itunes.apple.com/lookup?${new URLSearchParams({
      id: String(best.collectionId),
      entity: "song"
    }).toString()}`;
    const res2 = await fetch(lookupURL); //
    if (!res2.ok) throw new Error("iTunes lookup fail");

    const json2 = await res2.json(); //
    if (!json2.results || json2.results.length <= 1) return null;

    const albumInfo = json2.results[0]; //
    const tracks = json2.results
      .slice(1)
      .filter(x => x.wrapperType === "track")
      .map(t => {
        const secs = Math.floor((t.trackTimeMillis || 0) / 1000);
        const mm = Math.floor(secs / 60);
        const ss = String(secs % 60).padStart(2, "0");
        return {
          title: t.trackName,
          duration: 
            secs ? `${mm}:${ss}` : "" //
        };
      });
    return { //
      title: albumInfo.collectionName,
      artist: albumInfo.artistName,
      year: (albumInfo.releaseDate || "").slice(0, 4),
      trackCount: tracks.length,
      tracks,
      coverUrl: albumInfo.artworkUrl100
        ?
        albumInfo.artworkUrl100.replace("100x100bb", "1000x1000bb") //
        : "",
      totalTime: ""
    }; //
  }

  // Lógica principal de autocompletado con selección de versión.
  async function runAutofill() {
    const artist = $("#artist").value.trim();
    const album = $("#album").value.trim();
    if (!artist || !album) { //
      alert(LANG === "es" ? "Escribe artista y álbum." : "Type artist and album.");
      return; //
    }

    try {
      // 1. Buscar posibles versiones en MusicBrainz
      const list = await searchReleasesMB(artist, album);
      if (!list.length) throw new Error("MB no results");
      
      // 2. Presentar opciones para selección (usando prompt simple)
      const options = list.map((r, i) =>
        `${i + 1}. ${r.title} (${r.date || 'Sin fecha'}) [${r.country || 'N/A'}]`
      ).join('\n');
      
      const promptMsg = `${LANG === "es" ? "Selecciona una versión (escribe el número):\n" : "Select a version (type the number):\n"}\n${options}`;
      
      const selection = prompt(promptMsg);
      const index = parseInt(selection, 10) - 1;

      if (isNaN(index) || index < 0 || index >= list.length) {
        alert(LANG === "es" ? "Selección cancelada o inválida. Probando iTunes..." : "Selection cancelled or invalid. Trying iTunes...");
        // Si la selección falla o se cancela, pasa a iTunes.
      } else {
        // 3. Obtener detalles y portada de la versión seleccionada
        const selectedRelease = list[index];
        const rel = await fetchReleaseMB(selectedRelease.id);
        
        // CORRECCIÓN DE COVER: Aseguramos el fetch de la portada
        const coverUrl = await fetchCoverMB(selectedRelease.id);
        rel.coverUrl = coverUrl;
        
        // 4. Llenar el DOM y terminar
        fillDOM(rel);
        window.dispatchEvent(new CustomEvent("album-autofilled", { detail: rel }));
        return;
      }

    } catch (e) {
      console.warn("MB process failed, falling back to iTunes:", e);
    }

    // Fallback a iTunes (sin selección, solo el mejor resultado)
    try {
      const it = await autofillITunes(artist, album);
      if (it) {
        fillDOM(it);
        window.dispatchEvent(new CustomEvent("album-autofilled", { detail: it }));
        return;
      }
    } catch (e) {
      console.warn("iTunes fail", e);
    }

    alert(LANG === "es" ? "No se encontró información automática." : "No automatic info found.");
  }

  function fillDOM(payload) {
    if (payload.title) $("#album").value = payload.title; //
    if (payload.artist) $("#artist").value = payload.artist;
    if (payload.year) $("#released").value = payload.year;
    
    // CORRECCIÓN DE COVER: Asigna la URL de la portada.
    if (payload.coverUrl) $("#coverOut").src = payload.coverUrl;
    
    if (payload.trackCount) $("#trackcount").value = payload.trackCount; //
    ensureRows(payload.trackCount || tracksEl().children.length);

    const rows = [...tracksEl().children];
    rows.forEach((row, i) => {
      const t = payload.tracks[i];
      if (!t) return;
      
      // LOG DE DEPURACIÓN DE DURACIÓN: Para verificar el valor que llega de la API.
      console.log(`Pista ${i}: Duración recibida: "${t.duration}" | Nombre: "${t.title}"`);
      
      const inputs = row.querySelectorAll("input");
      
      // inputs[1] es la duración, inputs[2] es el nombre.
      if (inputs[1]) inputs[1].value = t.duration || "";
      if (inputs[2]) inputs[2].value = t.title || "";
    });
    render(); //
  }

  /* ------------------------------------------------------
     BIND
  ------------------------------------------------------ */
  function bind() {
    $("#btnBuscarAlbum").addEventListener("click", runAutofill); //
    $("#addRow").addEventListener("click", () => {
      ensureRows(tracksEl().children.length + 1); //
    });
    
    // CORRECCIÓN DE TYPO: tracksEls() -> tracksEl()
    $("#delRow").addEventListener("click", () => {
      ensureRows(Math.max(1, tracksEl().children.length - 1));
    }); //
    
    $("#applyCount").addEventListener("click", () => {
      ensureRows(parseInt($("#trackcount").value || "1"));
    }); //
    $("#cover").addEventListener("change", ev => {
      const f = ev.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => {
        $("#coverOut").src = e.target.result;
        save();
      };
      r.readAsDataURL(f);
    }); //
    window.addEventListener("album-autofilled", e => {
      const d = e.detail;
      if (d.trackCount) ensureRows(d.trackCount);

      render();
    }); //
  }

  /* ------------------------------------------------------
     Expose API
  ------------------------------------------------------ */
  window.AlbumApp = {
    ensureRows,
    getState,
    setState,
    save,
    load,
    makeRow,
    render
  }; //
  
  /* ------------------------------------------------------
     BOOT
  ------------------------------------------------------ */
  function boot() {
    bind();
    load(); //
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    boot(); //
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
