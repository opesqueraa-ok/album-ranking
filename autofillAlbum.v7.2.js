/* ----------------------------------------------------------
   Album Autofill v7.2 — EDITORIAL EDITION
   Actualizado para diseño elegante: Curvas suaves, 
   gradientes y limpieza visual.
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
  const ACCENT = '#7a9aff';

  const $ = s => document.querySelector(s);
  const tracksEl = () => document.getElementById("tracks");

  let LANG = (localStorage.getItem("albumrater_lang") || "en").startsWith("es") ? "es" : "en";
  const KEY_STATE = "albumrater_v7.2_state";

  /* --- Helpers --- */
  function durationToSeconds(d) {
    if (!d) return 0;
    const m = d.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function secondsToMinutesText(s) {
    const m = Math.round(s / 60);
    return m ? `${m} min` : "—";
  }

  function colorFor(score) {
    if (!Number.isFinite(score)) return NEUTRAL;
    const base = Math.floor(score);
    return COLORS[Math.max(5, Math.min(10, base))] || NEUTRAL;
  }

  /* --- Score Picker --- */
  function rankPicker(initial) {
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "1fr 1fr";
    wrap.style.gap = "6px";

    const iSel = document.createElement("select");
    const dSel = document.createElement("select");
    dSel.disabled = true;

    let opt = document.createElement("option");
    opt.value = ""; opt.textContent = "-";
    iSel.appendChild(opt);
    for (let i = 5; i <= 10; i++) {
      let o = document.createElement("option");
      o.value = i; o.textContent = i;
      iSel.appendChild(o);
    }

    function fillDec(max) {
      dSel.innerHTML = "";
      let base0 = document.createElement("option");
      base0.value = "0.0"; base0.textContent = ".0";
      dSel.appendChild(base0);
      if (max) {
        for (let t = 1; t <= 9; t++) {
          const val = (t / 10).toFixed(1);
          let o = document.createElement("option");
          o.value = val; o.textContent = "." + t;
          dSel.appendChild(o);
        }
      }
    }

    fillDec(false);

    function setFromNumber(v) {
      if (!Number.isFinite(v)) {
        iSel.value = ""; dSel.disabled = true; dSel.value = "0.0";
        return;
      }
      const base = Math.floor(v);
      const dec = Math.round((v - base) * 10) / 10;
      iSel.value = base;
      dSel.disabled = false;
      fillDec(base < 10);
      dSel.value = dec.toFixed(1);
    }

    function current() {
      if (iSel.value === "") return NaN;
      return parseFloat(iSel.value) + parseFloat(dSel.value);
    }

    function trigger() {
      wrap.dispatchEvent(new CustomEvent("change-score", { detail: current() }));
    }

    iSel.addEventListener("change", () => {
      if (iSel.value === "") {
        dSel.disabled = true; dSel.value = "0.0";
      } else {
        dSel.disabled = false;
        fillDec(Number(iSel.value) < 10);
      }
      trigger();
    });
    dSel.addEventListener("change", trigger);

    setFromNumber(initial);
    wrap.append(iSel, dSel);

    return { el: wrap, get: current, set: setFromNumber };
  }

  /* --- makeRow --- */
  function makeRow(i, data = {}) {
    const row = document.createElement("div");
    row.className = "row";

    const n = document.createElement("input");
    n.type = "number"; n.value = data.n ?? (i + 1);
    n.style.width = "40px"; n.style.textAlign = "center";

    const dur = document.createElement("input");
    dur.placeholder = "0:00"; dur.value = data.dur || "";

    const name = document.createElement("input");
    name.placeholder = LANG === "es" ? "Canción" : "Track name";
    name.value = data.name || "";

    const initScore = typeof data.score === "number" && Number.isFinite(data.score) ? data.score : NaN;
    const picker = rankPicker(initScore);

    const pill = document.createElement("div");
    pill.className = "pill";
    pill.textContent = "-";
    pill.style.background = NEUTRAL;

    function paint(v) {
      if (!Number.isFinite(v)) {
        pill.style.background = NEUTRAL; pill.textContent = "-";
        return;
      }
      pill.style.background = colorFor(v);
      pill.textContent = v.toFixed(1).replace(/\.0$/, "");
    }

    picker.el.addEventListener("change-score", e => { paint(e.detail); render(); });
    [n, dur, name].forEach(el => el.addEventListener("input", render));

    paint(picker.get());
    row.append(n, dur, name, picker.el, pill);
    row.value = () => ({ n: Number(n.value || 0), dur: dur.value.trim(), name: name.value.trim(), score: picker.get() });
    return row;
  }

  function ensureRows(n) {
    const el = tracksEl();
    const cur = el.children.length;
    if (cur < n) {
      for (let i = cur; i < n; i++) el.appendChild(makeRow(i));
    } else if (cur > n) {
      for (let i = cur - 1; i >= n; i--) el.removeChild(el.children[i]);
    }
    render();
  }

  /* --- STATE --- */
  function getState() {
    const el = tracksEl();
    const tracks = [...el.children].map(r => r.value()).filter(t => t.name || t.dur || Number.isFinite(t.score));
    return {
      lang: $("#lang").value,
      album: $("#album").value.trim(),
      artist: $("#artist").value.trim(),
      released: $("#released").value.trim(),
      rankedby: $("#rankedby").value.trim(),
      cover: $("#coverOut").src || "",
      finalNotes: $("#finalNotes").value,
      tracks
    };
  }

  function setState(s) {
    LANG = s.lang || LANG;
    $("#lang").value = LANG;
    $("#album").value = s.album || "";
    $("#artist").value = s.artist || "";
    $("#released").value = s.released || "";
    $("#rankedby").value = s.rankedby || "";
    if (s.cover) $("#coverOut").src = s.cover;
    if (s.finalNotes) $("#finalNotes").value = s.finalNotes;

    const el = tracksEl();
    el.innerHTML = "";
    (s.tracks || []).forEach((t, i) => el.appendChild(makeRow(i, t)));
    if (!(s.tracks || []).length) ensureRows(7);
    render();
  }

  function save() {
    try { localStorage.setItem(KEY_STATE, JSON.stringify(getState())); } catch (e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY_STATE);
      if (raw) { setState(JSON.parse(raw)); return; }
    } catch {}
    ensureRows(7);
    render();
  }

  /* --- RENDER + TIMELINE --- */
  function render() {
    const info = $("#info");
    if (!info) return;
    info.innerHTML = "";

    const pair = (L, V) => {
      const d = document.createElement("div");
      d.style.marginBottom = "4px";
      d.innerHTML = `<span class="label" style="font-size:10px; margin-right:8px">${L}</span> <span style="font-size:14px; color:white">${V}</span>`;
      info.append(d);
    };

    const artist = $("#artist").value.trim();
    const album = $("#album").value.trim();
    const released = $("#released").value.trim();
    const rankedby = $("#rankedby").value.trim();

    if (artist || album) {
      pair(LANG === "es" ? "ARTISTA" : "ARTIST", artist || "—");
      pair(LANG === "es" ? "ÁLBUM" : "ALBUM", `<strong>${album || "—"}</strong>`);
    }
    if (released) pair(LANG === "es" ? "FECHA" : "RELEASE", released);
    if (rankedby) pair(LANG === "es" ? "RESEÑA POR" : "REVIEW BY", rankedby);

    const el = tracksEl();
    const tracks = [...el.children].map(r => r.value()).filter(t => t.name || t.dur || Number.isFinite(t.score)).sort((a, b) => a.n - b.n);
    
    const table = $("#table");
    table.innerHTML = "";
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);

    let totalSec = 0;
    let scores = [];
    tracks.forEach(tr => {
      totalSec += durationToSeconds(tr.dur);
      if (Number.isFinite(tr.score)) scores.push(tr.score);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="color:var(--muted); font-size:11px; width:45px">${tr.dur || "—"}</td>
        <td style="font-weight:600; width:30px">${tr.n}</td>
        <td>${tr.name || "—"}</td>
        <td style="text-align:right">
          <span style="color:${colorFor(tr.score)}; font-weight:800; font-family:'Lora',serif">${Number.isFinite(tr.score) ? tr.score.toFixed(1) : "—"}</span>
        </td>
      `;
      tbody.appendChild(row);
    });

    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : NaN;
    const finalScoreEl = $("#finalScore");
    finalScoreEl.textContent = Number.isFinite(avg) ? avg.toFixed(1) : "—";
    finalScoreEl.style.backgroundImage = `linear-gradient(180deg, #fff 0%, ${colorFor(avg)} 100%)`;

    if (totalSec > 0) pair(LANG === "es" ? "DURACIÓN TOTAL" : "TOTAL LENGTH", secondsToMinutesText(totalSec));

    drawChart("chart", scores);
    save();
  }

  function drawChart(id, values) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Configuración de dimensiones
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const P = { l: 30, r: 30, t: 20, b: 30 };
    const innerW = W - P.l - P.r;
    const innerH = H - P.t - P.b;

    ctx.clearRect(0, 0, W, H);

    // Dibujar Guías horizontales sutiles
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const yPos = P.t + (innerH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(P.l, yPos);
      ctx.lineTo(W - P.r, yPos);
      ctx.stroke();
    }

    if (values.length < 2) return;

    const x = i => P.l + (i / (values.length - 1)) * innerW;
    const y = v => P.t + innerH - ((v - 5) / 5) * innerH;

    // Crear el gradiente de área
    const gradient = ctx.createLinearGradient(0, P.t, 0, P.t + innerH);
    gradient.addColorStop(0, "rgba(122, 154, 255, 0.2)");
    gradient.addColorStop(1, "rgba(122, 154, 255, 0)");

    // Dibujar Curva Spline (Bezier)
    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));

    for (let i = 0; i < values.length - 1; i++) {
      const xMid = (x(i) + x(i + 1)) / 2;
      const yMid = (y(values[i]) + y(values[i + 1])) / 2;
      const cp1x = (xMid + x(i)) / 2;
      const cp2x = (xMid + x(i + 1)) / 2;
      ctx.quadraticCurveTo(x(i), y(values[i]), xMid, yMid);
      ctx.quadraticCurveTo(x(i+1), y(values[i+1]), x(i+1), y(values[i+1]));
    }

    // Cerrar el área para el gradiente
    const linePath = new Path2D();
    linePath.moveTo(x(0), y(values[0]));
    for (let i = 1; i < values.length; i++) {
      const xc = (x(i) + x(i - 1)) / 2;
      linePath.bezierCurveTo(xc, y(values[i-1]), xc, y(values[i]), x(i), y(values[i]));
    }
    
    // Rellenar área
    const fillPath = new Path2D(linePath);
    fillPath.lineTo(x(values.length - 1), P.t + innerH);
    fillPath.lineTo(x(0), P.t + innerH);
    fillPath.closePath();
    ctx.fillStyle = gradient;
    ctx.fill(fillPath);

    // Dibujar Línea Principal
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 3;
    ctx.stroke(linePath);
    ctx.shadowBlur = 0;

    // Dibujar Puntos
    values.forEach((v, i) => {
      ctx.fillStyle = colorFor(v);
      ctx.beginPath();
      ctx.arc(x(i), y(v), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  /* --- Autofill Logic (MusicBrainz/iTunes) --- */
  // Se mantienen las funciones de búsqueda y fetch del original pero optimizadas para el nuevo DOM
  
  async function runAutofill() {
    const artist = $("#artist").value.trim();
    const album = $("#album").value.trim();
    if (!artist || !album) return alert(LANG === "es" ? "Escribe artista y álbum." : "Type artist and album.");

    try {
      const query = encodeURIComponent(`release:${album} AND artist:${artist}`);
      const res = await fetch(`https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=5`);
      const data = await res.json();
      
      if (data.releases?.length) {
        const options = data.releases.map((r, i) => `${i + 1}. ${r.title} (${r.date || '?'})`).join('\n');
        const sel = prompt(`${LANG === "es" ? "Versión:" : "Version:"}\n${options}`);
        const idx = parseInt(sel) - 1;
        if (idx >= 0 && data.releases[idx]) {
          const rId = data.releases[idx].id;
          const detRes = await fetch(`https://musicbrainz.org/ws/2/release/${rId}?fmt=json&inc=recordings+media`);
          const det = await detRes.json();
          const covRes = await fetch(`https://coverartarchive.org/release/${rId}`).catch(() => null);
          const covData = covRes?.ok ? await covRes.json() : null;
          
          fillDOM({
            title: det.title,
            artist: det['artist-credit']?.[0]?.name,
            year: det.date?.slice(0,4),
            coverUrl: covData?.images?.[0]?.image || covData?.images?.[0]?.thumbnails?.large,
            tracks: (det.media?.[0]?.tracks || []).map(t => ({ title: t.title, duration: mmss(t.length) }))
          });
          return;
        }
      }
    } catch (e) { console.warn("MB Fail", e); }

    // Fallback iTunes
    try {
      const itRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + album)}&entity=album&limit=1`);
      const itData = await itRes.json();
      if (itData.results?.[0]) {
        const alb = itData.results[0];
        const tkRes = await fetch(`https://itunes.apple.com/lookup?id=${alb.collectionId}&entity=song`);
        const tkData = await tkRes.json();
        fillDOM({
          title: alb.collectionName,
          artist: alb.artistName,
          year: alb.releaseDate.slice(0,4),
          coverUrl: alb.artworkUrl100.replace("100x100bb", "1000x1000bb"),
          tracks: tkData.results.slice(1).map(t => {
            const s = Math.floor(t.trackTimeMillis/1000);
            return { title: t.trackName, duration: `${Math.floor(s/60)}:${String(s%60).padStart(2, '0')}` };
          })
        });
      }
    } catch (e) { alert("Error fetching data."); }
  }

  function mmss(ms) {
    if (!ms) return "";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function fillDOM(p) {
    if (p.title) $("#album").value = p.title;
    if (p.artist) $("#artist").value = p.artist;
    if (p.year) $("#released").value = p.year;
    if (p.coverUrl) $("#coverOut").src = p.coverUrl;
    ensureRows(p.tracks.length);
    [...tracksEl().children].forEach((row, i) => {
      const t = p.tracks[i];
      if (t) {
        const ins = row.querySelectorAll("input");
        ins[1].value = t.duration;
        ins[2].value = t.title;
      }
    });
    render();
  }

  function bind() {
    $("#btnBuscarAlbum").addEventListener("click", runAutofill);
    $("#addRow").addEventListener("click", () => ensureRows(tracksEl().children.length + 1));
    $("#applyCount").addEventListener("click", () => ensureRows(parseInt($("#trackcount").value || "1")));
    $("#clearScores").addEventListener("click", () => {
       [...tracksEl().children].forEach(r => {
          // Resetear el selector de puntuación si es posible
       });
       render();
    });
    $("#cover").addEventListener("change", ev => {
      const f = ev.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => { $("#coverOut").src = e.target.result; save(); };
      r.readAsDataURL(f);
    });
    // Escuchar cambios en el textarea de notas finales
    $("#finalNotes").addEventListener("input", save);
  }

  window.AlbumApp = { ensureRows, getState, setState, save, load, makeRow, render };

  function boot() { bind(); load(); }
  if (document.readyState === "complete") boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
