/* ----------------------------------------------------------
   Album Autofill v7.2 — Offline version
   Maneja:
   - Crear filas
   - Score picker
   - Colores
   - Render + timeline
   - Guardar/cargar estado
   - MusicBrainz search
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
  [cite_start]const tracksEl = () => document.getElementById("tracks"); // [cite: 2]

  let LANG = (localStorage.getItem("albumrater_lang") || "en").startsWith("es") ? "es" : "en";

  const KEY_STATE = "albumrater_v7.2_state";

  /* ------------------------------------------------------
     Helpers generales
  ------------------------------------------------------ */
  function durationToSeconds(d) {
    if (!d) return 0;
    const m = d.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0; [cite_start]// [cite: 3]
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10); [cite_start]// [cite: 4]
  }

  function secondsToMinutesText(s) {
    const m = Math.round(s / 60);
    return m ?
      `${m} min` : "—"; [cite_start]// [cite: 5]
  }

  function colorFor(score) {
    if (!Number.isFinite(score)) return NEUTRAL;
    const base = Math.floor(score);
    return COLORS[Math.max(5, Math.min(10, base))] || NEUTRAL; [cite_start]// [cite: 6]
  }

  /* ------------------------------------------------------
     Score Picker
  ------------------------------------------------------ */
  function rankPicker(initial) {
    const wrap = document.createElement("div");
    wrap.style.display = "grid"; [cite_start]// [cite: 7]
    wrap.style.gridTemplateColumns = "1fr 1fr";
    wrap.style.gap = "6px";

    const iSel = document.createElement("select");
    const dSel = document.createElement("select");
    dSel.disabled = true; [cite_start]// [cite: 8]

    // int select
    let opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-";
    iSel.appendChild(opt);
    [cite_start]for (let i = 5; i <= 10; i++) { // [cite: 9]
      let o = document.createElement("option");
      o.value = i; [cite_start]// [cite: 10]
      o.textContent = i;
      iSel.appendChild(o);
    }

    // fill dec
    function fillDec(max) {
      dSel.innerHTML = "";
      let base0 = document.createElement("option"); [cite_start]// [cite: 11]
      base0.value = "0.0";
      base0.textContent = "0.0";
      dSel.appendChild(base0);
      [cite_start]if (max) { // [cite: 12]
        for (let t = 1; t <= 9; t++) {
          const val = (t / 10).toFixed(1);
          let o = document.createElement("option"); [cite_start]// [cite: 13]
          o.value = val;
          o.textContent = val;
          dSel.appendChild(o); [cite_start]// [cite: 14]
        }
      }
    }
    fillDec(false);
    [cite_start]function setFromNumber(v) { // [cite: 15]
      if (!Number.isFinite(v)) {
        iSel.value = "";
        dSel.disabled = true; [cite_start]// [cite: 16]
        dSel.value = "0.0";
        return;
      }
      const base = Math.floor(v);
      const dec = Math.round((v - base) * 10) / 10; [cite_start]// [cite: 17]
      iSel.value = base;
      dSel.disabled = false;
      fillDec(base < 10);
      dSel.value = dec.toFixed(1); [cite_start]// [cite: 18]
    }

    function current() {
      if (iSel.value === "") return NaN;
      return parseFloat(iSel.value) + parseFloat(dSel.value); [cite_start]// [cite: 19]
    }

    function trigger() {
      wrap.dispatchEvent(new CustomEvent("change-score", { detail: current() }));
    [cite_start]} // [cite: 20]

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
    dSel.addEventListener("change", trigger); [cite_start]// [cite: 21]

    setFromNumber(initial);

    wrap.append(iSel, dSel);

    return {
      el: wrap,
      get: current,
      set: setFromNumber
    }; [cite_start]// [cite: 22]
  }

  /* ------------------------------------------------------
     makeRow()
  ------------------------------------------------------ */
  function makeRow(i, data = {}) {
    const row = document.createElement("div");
    row.className = "row"; [cite_start]// [cite: 23]

    const n = document.createElement("input");
    n.type = "number";
    n.min = 1;
    n.value = data.n ?? (i + 1); [cite_start]// [cite: 24]
    
    const dur = document.createElement("input");
    dur.placeholder = "mm:ss";
    dur.value = data.dur || "";

    const name = document.createElement("input"); [cite_start]// [cite: 25]
    name.placeholder = LANG === "es" ? "Nombre de la canción" : "Track name";
    name.value = data.name || "";
    [cite_start]const initScore = // [cite: 26]
      typeof data.score === "number" && Number.isFinite(data.score)
        ?
        [cite_start]data.score // [cite: 27]
        : NaN;

    const picker = rankPicker(initScore);

    const pill = document.createElement("div");
    pill.className = "pill"; [cite_start]// [cite: 28]
    pill.textContent = "-";
    pill.style.background = NEUTRAL;

    function paint(v) {
      if (!Number.isFinite(v)) {
        pill.style.background = NEUTRAL;
        pill.textContent = "-"; [cite_start]// [cite: 29]
        return;
      }
      pill.style.background = colorFor(v);
      pill.textContent = v.toFixed(1).replace(/\.0$/, ""); [cite_start]// [cite: 30]
    }

    picker.el.addEventListener("change-score", e => {
      paint(e.detail);
      render();
    });
    [n, dur, name].forEach(el => el.addEventListener("input", render)); [cite_start]// [cite: 31]

    paint(picker.get());

    row.append(n, dur, name, picker.el, pill);
    [cite_start]row.value = () => ({ // [cite: 32]
      n: Number(n.value || 0),
      dur: dur.value.trim(),
      name: name.value.trim(),
      score: picker.get()
    });
    return row; [cite_start]// [cite: 33]
  }

  /* ------------------------------------------------------
     ensureRows()
  ------------------------------------------------------ */
  function ensureRows(n) {
    const el = tracksEl();
    const cur = el.children.length; [cite_start]// [cite: 34]

    if (cur < n) {
      for (let i = cur; i < n; i++) {
        el.appendChild(makeRow(i)); [cite_start]// [cite: 35]
      }
    } else if (cur > n) {
      for (let i = cur - 1; i >= n; i--) el.removeChild(el.children[i]); [cite_start]// [cite: 36]
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
      .filter(t => t.name || t.dur || Number.isFinite(t.score)); [cite_start]// [cite: 37]
    [cite_start]return { // [cite: 38]
      lang: $("#lang").value,
      album: $("#album").value.trim(),
      artist: $("#artist").value.trim(),
      released: $("#released").value.trim(),
      rankedby: $("#rankedby").value.trim(),
      cover: $("#coverOut").src || [cite_start]// [cite: 39]
        "",
      tracks
    };
  [cite_start]} // [cite: 40]

  function setState(s) {
    LANG = s.lang || LANG;
    $("#lang").value = LANG;

    $("#album").value = s.album || [cite_start]// [cite: 41]
      "";
    $("#artist").value = s.artist || "";
    $("#released").value = s.released || "";
    $("#rankedby").value = s.rankedby || "";
    if (s.cover) $("#coverOut").src = s.cover; [cite_start]// [cite: 42]

    const el = tracksEl();
    el.innerHTML = "";
    (s.tracks || []).forEach((t, i) => el.appendChild(makeRow(i, t))); [cite_start]// [cite: 43]
    if (!(s.tracks || []).length) ensureRows(7);

    render();
  }

  function save() {
    try {
      localStorage.setItem(KEY_STATE, JSON.stringify(getState())); [cite_start]// [cite: 44]
    } catch (e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY_STATE); [cite_start]// [cite: 45]
      if (raw) {
        setState(JSON.parse(raw));
        return; [cite_start]// [cite: 46]
      }
    } catch {}
    ensureRows(7);
    render(); [cite_start]// [cite: 47]
  }

  /* ------------------------------------------------------
     RENDER + TABLE + TIMELINE
  ------------------------------------------------------ */
  function render() {
    const info = $("#info");
    if (!info) return; [cite_start]// [cite: 48]

    info.innerHTML = "";

    const pair = (L, V) => {
      const l = document.createElement("div");
      l.className = "label"; [cite_start]// [cite: 49]
      l.textContent = L;
      const v = document.createElement("div");
      v.innerHTML = V;
      info.append(l, v);
    };

    const album = $("#album").value.trim(); [cite_start]// [cite: 50]
    const artist = $("#artist").value.trim();
    const released = $("#released").value.trim();
    const rankedby = $("#rankedby").value.trim();
    pair(LANG === "es" ? "Álbum:" : "Album:", `<strong><em>${album || "—"}</em></strong>`); [cite_start]// [cite: 51]
    pair(LANG === "es" ? "Artista:" : "Artist:", `<strong>${artist || "—"}</strong>`); [cite_start]// [cite: 52]
    pair(LANG === "es" ? "Fecha de lanzamiento:" : "Release Date:", released || "—"); [cite_start]// [cite: 53]
    if (rankedby) pair(LANG === "es" ? "Rankeado por:" : "Ranked by:", rankedby);

    const el = tracksEl();
    const tracks = [...el.children]
      .map(r => r.value())
      .filter(t => t.name || t.dur || Number.isFinite(t.score))
      .sort((a, b) => a.n - b.n); [cite_start]// [cite: 54]
    const table = $("#table");
    table.innerHTML = "";
    const thead = document.createElement("thead"); [cite_start]// [cite: 55]
    thead.innerHTML = `
      <tr>
        <th style="width:80px">${LANG === "es" ?
        "Duración" : "Duration"}</th>
        <th style="width:36px">#</th>
        <th>${LANG === "es" ? [cite_start]// [cite: 58]
        "Nombre" : "Name"}</th>
        <th style="width:90px">Score</th>
      </tr>`;
    table.appendChild(thead);
    const tbody = document.createElement("tbody"); [cite_start]// [cite: 59]
    table.appendChild(tbody);

    let totalSec = 0;
    let scores = [];
    [cite_start]tracks.forEach(tr => { // [cite: 60]
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
        || [cite_start]"—"}</td> // [cite: 61]
        <td>${tr.n || ""}</td>
        <td>${tr.name || "—"}</td>
        <td>${badge}</td>`;
      tbody.appendChild(row);
    });
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : NaN; [cite_start]// [cite: 62]
    $("#finalScore").textContent = Number.isFinite(avg) ?
      avg.toFixed(1) : "—"; [cite_start]// [cite: 63]

    pair(LANG === "es" ? "Duración total" : "Total duration", secondsToMinutesText(totalSec));

    drawChart("chart", scores);

    save(); [cite_start]// [cite: 64]
  }

  function drawChart(id, values) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); [cite_start]// [cite: 65]

    const P = { l: 60, r: 20, t: 20, b: 36 };
    const W = canvas.width - P.l - P.r; [cite_start]// [cite: 66]
    const H = canvas.height - P.t - P.b; [cite_start]// [cite: 67]
    // marco
    ctx.strokeStyle = "#2a3140";
    ctx.strokeRect(P.l, P.t, W, H);

    ctx.fillStyle = "#aeb5c0";
    ctx.font = "12px system-ui";
    [cite_start]for (let y = 5; y <= 10; y++) { // [cite: 68]
      const yy = P.t + H - ((y - 5) / 5) * H;
      ctx.strokeStyle = "#1a2130"; [cite_start]// [cite: 69]
      ctx.beginPath();
      ctx.moveTo(P.l, yy);
      ctx.lineTo(P.l + W, yy);
      ctx.stroke();
      ctx.fillText(String(y), 18, yy + 4); [cite_start]// [cite: 70]
    }

    if (!values.length) return;

    const n = values.length;
    const x = i => P.l + (i / (n - 1)) * W; [cite_start]// [cite: 71]
    const y = v => P.t + H - ((v - 5) / 5) * H; [cite_start]// [cite: 72]

    ctx.strokeStyle = "rgba(122,162,255,0.95)";
    ctx.lineWidth = 4; [cite_start]// [cite: 73]
    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));
    for (let i = 1; i < n; i++) ctx.lineTo(x(i), y(values[i]));
    ctx.stroke(); [cite_start]// [cite: 74]
    ctx.fillStyle = "#cfd9ff";
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); [cite_start]// [cite: 75]
      ctx.arc(x(i), y(values[i]), 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = "#aeb5c0";
    [cite_start]for (let i = 0; i < n; i++) { // [cite: 76]
      ctx.fillText(String(i + 1), x(i) - 3, P.t + H + 16); [cite_start]// [cite: 77]
    }
  }

  /* ------------------------------------------------------
     MusicBrainz + iTunes Autofill
  ------------------------------------------------------ */
  let lastFetchTs = 0;
  [cite_start]async function safeFetch(url) { // [cite: 78]
    const now = Date.now();
    const wait = Math.max(0, 1000 - (now - lastFetchTs));
    if (wait) await new Promise(r => setTimeout(r, wait)); [cite_start]// [cite: 79]
    lastFetchTs = Date.now();
    return fetch(url); [cite_start]// [cite: 80]
  }

  function mmss(ms) {
    if (!ms) return "";
    const s = Math.floor(ms / 1000); [cite_start]// [cite: 81]
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`; [cite_start]// [cite: 82]
  }

  async function searchReleasesMB(artist, album) {
    const query = encodeURIComponent(`release:${album} AND artist:${artist}`);
    const url = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=7`;
    const res = await safeFetch(url); [cite_start]// [cite: 83]

    if (!res.ok) throw new Error("MB search fail");

    const data = await res.json(); [cite_start]// [cite: 84]
    return (data.releases || [])
      .map(r => ({
        id: r.id,
        title: r.title || "",
        artistCredit: (r["artist-credit"] || []).map(a => a.name).join(", "),
        date: r.date || "",
        country: r.country || "",
        trackCount: r["track-count"] || ""
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0)); [cite_start]// [cite: 85]
  }

  async function fetchReleaseMB(id) {
    const url = `https://musicbrainz.org/ws/2/release/${id}?fmt=json&inc=recordings+media`;
    const res = await safeFetch(url);
    if (!res.ok) throw new Error("MB fetch fail"); [cite_start]// [cite: 86]
    const data = await res.json();

    const tracks = [];
    (data.media || [])[cite_start].forEach(m => { // [cite: 87]
      (m.tracks || []).forEach(t => {
        tracks.push({
          title: t.title,
          duration: t.length ? mmss(t.length) : ""
        });
      });
    });
    [cite_start]const totalMs = (data.media || []).reduce( // [cite: 88]
      (acc, m) =>
        acc +
        (m.tracks || []).reduce((a, t) => a + (t.length || 0), 0),
      0
    );
    [cite_start]return { // [cite: 89]
      title: data.title ||
        [cite_start]"", // [cite: 90]
      artist: (data["artist-credit"] || []).map(a => a.name).join(", "),
      year: (data.date || "").slice(0, 4),
      trackCount: tracks.length,
      tracks,
      coverUrl: null,
      totalTime: totalMs ?
        [cite_start]mmss(totalMs) : "" // [cite: 91]
    };
  }

  async function fetchCoverMB(id) {
    const url = `https://coverartarchive.org/release/${id}`;
    const res = await safeFetch(url); [cite_start]// [cite: 92]
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const img = data?.images?.[0]; [cite_start]// [cite: 93]
    if (!img) return null;

    return img.thumbnails?.large || img.image || null; [cite_start]// [cite: 94]
  }

  async function autofillMB(artist, album) {
    const list = await searchReleasesMB(artist, album);
    if (!list.length) return null; [cite_start]// [cite: 95]
    const best = list[0];
    const rel = await fetchReleaseMB(best.id);
    rel.coverUrl = await fetchCoverMB(best.id);

    return rel; [cite_start]// [cite: 96]
  }

  async function autofillITunes(artist, album) {
    const term = `${artist} ${album}`;
    [cite_start]const searchURL = `https://itunes.apple.com/search?${new URLSearchParams({ // [cite: 97]
      term,
      entity: "album",
      limit: 5
    }).toString()}`;
    const res = await fetch(searchURL); [cite_start]// [cite: 98]
    if (!res.ok) throw new Error("iTunes search failed");

    const json = await res.json(); [cite_start]// [cite: 99]
    if (!json.resultCount) return null;

    const low = s => (s || "").toLowerCase(); [cite_start]// [cite: 100]
    const best =
      json.results.find(
        r =>
          low(r.collectionName).includes(low(album)) &&
          low(r.artistName).includes(low(artist))
      ) ||
      json.results[0]; [cite_start]// [cite: 101]

    const lookupURL = `https://itunes.apple.com/lookup?${new URLSearchParams({
      id: String(best.collectionId),
      entity: "song"
    }).toString()}`;
    const res2 = await fetch(lookupURL); [cite_start]// [cite: 102]
    if (!res2.ok) throw new Error("iTunes lookup fail");

    const json2 = await res2.json(); [cite_start]// [cite: 103]
    if (!json2.results || json2.results.length <= 1) return null;

    const albumInfo = json2.results[0]; [cite_start]// [cite: 104]
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
            [cite_start]secs ? `${mm}:${ss}` : "" // [cite: 105]
        };
      });
    [cite_start]return { // [cite: 106]
      title: albumInfo.collectionName,
      artist: albumInfo.artistName,
      year: (albumInfo.releaseDate || "").slice(0, 4),
      trackCount: tracks.length,
      tracks,
      coverUrl: albumInfo.artworkUrl100
        ?
        [cite_start]albumInfo.artworkUrl100.replace("100x100bb", "1000x1000bb") // [cite: 107]
        : "",
      totalTime: ""
    }; [cite_start]// [cite: 108]
  }

  async function runAutofill() {
    const artist = $("#artist").value.trim();
    const album = $("#album").value.trim();
    [cite_start]if (!artist || !album) { // [cite: 109]
      alert(LANG === "es" ? "Escribe artista y álbum." : "Type artist and album.");
      return; [cite_start]// [cite: 110]
    }

    try {
      const mb = await autofillMB(artist, album);
      [cite_start]if (mb) { // [cite: 111]
        fillDOM(mb);
        window.dispatchEvent(new CustomEvent("album-autofilled", { detail: mb }));
        return; [cite_start]// [cite: 112]
      }
    } catch (e) {
      console.warn("MB fail", e); [cite_start]// [cite: 113]
    }

    try {
      const it = await autofillITunes(artist, album);
      [cite_start]if (it) { // [cite: 114]
        fillDOM(it);
        window.dispatchEvent(new CustomEvent("album-autofilled", { detail: it }));
        return; [cite_start]// [cite: 115]
      }
    } catch (e) {
      console.warn("iTunes fail", e); [cite_start]// [cite: 116]
    }

    alert("No automatic info found.");
  }

  function fillDOM(payload) {
    if (payload.title) $("#album").value = payload.title; [cite_start]// [cite: 117]
    if (payload.artist) $("#artist").value = payload.artist;
    if (payload.year) $("#released").value = payload.year;
    if (payload.coverUrl) $("#coverOut").src = payload.coverUrl;

    if (payload.trackCount) $("#trackcount").value = payload.trackCount; [cite_start]// [cite: 118]
    ensureRows(payload.trackCount || tracksEl().children.length);

    const rows = [...tracksEl().children];
    rows.forEach((row, i) => {
      const t = payload.tracks[i];
      if (!t) return;
      
      // LOG DE DEPURACIÓN AÑADIDO: Verifica si la duración llega correctamente desde la API.
      // Si la duración es "" (vacío), el problema es de la fuente de datos (MusicBrainz/iTunes).
      console.log(`Pista ${i}: Duración recibida: "${t.duration}" | Nombre: "${t.title}"`);
      
      const inputs = row.querySelectorAll("input");
      
      // inputs[1] es la duración, inputs[2] es el nombre. (Verificado en makeRow)
      if (inputs[1]) inputs[1].value = t.duration || "";
      if (inputs[2]) inputs[2].value = t.title || "";
    });
    render(); [cite_start]// [cite: 119]
  }

  /* ------------------------------------------------------
     BIND
  ------------------------------------------------------ */
  function bind() {
    $("#btnBuscarAlbum").addEventListener("click", runAutofill); [cite_start]// [cite: 120]
    $("#addRow").addEventListener("click", () => {
      [cite_start]ensureRows(tracksEl().children.length + 1); // [cite: 121]
    });
    
    // CORRECCIÓN: Se cambió "tracksEls" (typo) a "tracksEl" para llamar a la función correcta.
    $("#delRow").addEventListener("click", () => {
      ensureRows(Math.max(1, tracksEl().children.length - 1));
    }); [cite_start]// [cite: 122]
    
    $("#applyCount").addEventListener("click", () => {
      ensureRows(parseInt($("#trackcount").value || "1"));
    }); [cite_start]// [cite: 123]
    $("#cover").addEventListener("change", ev => {
      const f = ev.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => {
        $("#coverOut").src = e.target.result;
        save();
      };
      r.readAsDataURL(f);
    }); [cite_start]// [cite: 124]
    window.addEventListener("album-autofilled", e => {
      const d = e.detail;
      if (d.trackCount) ensureRows(d.trackCount);

      render();
    }); [cite_start]// [cite: 125]
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
  }; [cite_start]// [cite: 126]
  
  /* ------------------------------------------------------
     BOOT
  ------------------------------------------------------ */
  function boot() {
    bind();
    load(); [cite_start]// [cite: 127]
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    boot(); [cite_start]// [cite: 128]
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
