// ui.v7.0.js — Auth (Google) + Library + Export/Import + Sort/Notes wiring
(function () {
  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const safe = (s) =>
    (s || "").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, " ");

  // URL de retorno tras OAuth (ajústala si cambias el dominio o ruta)
  const SITE_RETURN_URL =
    window.SITE_URL ||
    "https://opesqueraa-ok.github.io/album-ranking/".replace(/(?<!:)\/{2,}/g, "/");

  // ---------- Supabase client ----------
  let supabaseClient = null;
  function sb() {
    if (!supabaseClient) {
      if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase CDN o credenciales no están disponibles en index.html.");
        throw new Error("Supabase client not configured");
      }
      supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    }
    return supabaseClient;
  }

  // ---------- Auth UI ----------
  async function refreshAuthUI() {
    try {
      const { data } = await sb().auth.getSession();
      const session = data?.session || null;
      const signed = !!session;

      const inBtn = $("#btnSigninGoogle");
      const outBtn = $("#btnSignout");
      const saveBtn = $("#btnSaveToLibrary");
      const myLibBtn = $("#btnMyLibrary");

      if (inBtn) inBtn.style.display = signed ? "none" : "";
      if (outBtn) outBtn.style.display = signed ? "" : "none";
      if (saveBtn) saveBtn.style.display = signed ? "" : "none";
      if (myLibBtn) myLibBtn.style.display = signed ? "" : "none";
    } catch (e) {
      console.warn("refreshAuthUI:", e);
    }
  }

  async function signInGoogle() {
    try {
      await sb().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: SITE_RETURN_URL,
        },
      });
      // Nota: la redirección la maneja Supabase/Google
    } catch (e) {
      alert("No se pudo iniciar sesión con Google.");
      console.error(e);
    }
  }

  async function signOut() {
    try {
      await sb().auth.signOut();
    } finally {
      await refreshAuthUI();
    }
  }

  // ---------- App state helpers ----------
  function getAppState() {
    return window.AlbumApp?.getState ? window.AlbumApp.getState() : null;
  }
  function setAppState(s) {
    if (window.AlbumApp?.setState) window.AlbumApp.setState(s);
  }
  function saveLocal() {
    if (window.AlbumApp?.save) window.AlbumApp.save();
  }

  // Average from scores
  function computeAverage(tracks) {
    const valid = (tracks || [])
      .map((t) => Number(t.score))
      .filter((v) => Number.isFinite(v));
    if (!valid.length) return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return Number(avg.toFixed(2));
  }

  // ---------- Export / Import / Clear ----------
  function exportJSON() {
    try {
      const s = getAppState();
      const payload = { ...s };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const album = safe(s?.album || "Album");
      const artist = safe(s?.artist || "");
      const fname = artist ? `${album} - ${artist}.json` : `${album}.json`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Could not export.");
      console.error(e);
    }
  }

  function importJSON(file) {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);
        setAppState(obj);
        saveLocal();
        alert("Imported.");
      } catch (err) {
        alert("Invalid file.");
      }
    };
    r.readAsText(file);
  }

  function clearAll() {
    if (!confirm("Are you sure you want to clear all fields?")) return;
    localStorage.removeItem("albumrater_v6_state");
    setAppState({
      lang: $("#lang")?.value || "en",
      album: "",
      artist: "",
      released: "",
      rankedby: "",
      cover: "",
      tracks: [],
    });
  }

  // Limpia SOLO puntuaciones (las deja en “-”)
  function clearScores() {
    const s = getAppState();
    if (!s) return;
    s.tracks = (s.tracks || []).map((t) => ({ ...t, score: NaN }));
    setAppState(s);
    saveLocal();
  }

  // ---------- Notas por pista ----------
  // Inserta botón de lapicito en cada fila (última columna)
  function ensureNoteButtons() {
    const container = $("#tracks");
    if (!container) return;

    [...container.children].forEach((row, idx) => {
      if (row.querySelector(".noteBtn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "noteBtn";
      btn.title = "Add note";
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33h-.5v-.5l9.06-9.06.5.5L5.92 19.58zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>';

      row.appendChild(btn);

      btn.addEventListener("click", () => {
        const s = getAppState() || {};
        const tracks = s.tracks || [];
        const current = tracks[idx] || {};
        const prev = current.note || "";
        const text = prompt("Write a note for this track:", prev || "");
        if (text == null) return;
        current.note = String(text).trim();
        tracks[idx] = current;
        s.tracks = tracks;
        setAppState(s);
        saveLocal();
        renderNotesOutput();
        btn.classList.toggle("active", !!current.note);
      });

      // activar si ya existe nota
      const s = getAppState() || {};
      const note = s?.tracks?.[idx]?.note;
      btn.classList.toggle("active", !!note);
    });
  }

  function renderNotesOutput() {
    const out = $("#notesOutput");
    if (!out) return;

    const s = getAppState() || {};
    const lines = [];
    (s.tracks || []).forEach((t, i) => {
      if (t?.note) {
        const name = t.name || `Track ${i + 1}`;
        lines.push(`${i + 1}. ${name}: ${t.note}`);
      }
    });

    const albumTitle = s.album ? `${s.album} by ${s.artist || ""}`.trim() : "";
    const header = albumTitle ? albumTitle + "\n" : "";
    const final = s.finalNotes || "";
    const tail = final.trim() ? `\nFinal Album Thoughts: ${final.trim()}` : "";

    out.textContent = header + lines.join("\n") + tail;
  }

  function bindFinalNotes() {
    const ta = $("#finalNotes");
    if (!ta || ta._bound) return;
    ta._bound = true;
    ta.addEventListener("input", () => {
      const s = getAppState() || {};
      s.finalNotes = ta.value || "";
      setAppState(s);
      saveLocal();
      renderNotesOutput();
    });
  }

  // Observa cambios en #tracks para agregar los botones de notas
  function observeTrackList() {
    const target = $("#tracks");
    if (!target || target._observerAttached) return;
    target._observerAttached = true;

    const mo = new MutationObserver(() => {
      ensureNoteButtons();
      renderNotesOutput();
    });
    mo.observe(target, { childList: true });

    // primera pasada
    ensureNoteButtons();
    renderNotesOutput();
  }

  // ---------- Sort Top 10 reversible ----------
  const SORT_STATE = { active: false, snapshot: null };
  function setSortButtonLabel() {
    const b = $("#sortTop10");
    if (!b) return;
    b.textContent = SORT_STATE.active ? "Restore album order" : "Sort Top 10";
  }
  function bindSortTop10() {
    const b = $("#sortTop10");
    if (!b || b._bound) return;
    b._bound = true;
    b.addEventListener("click", () => {
      const el = $("#tracks");
      if (!el) return;

      if (!SORT_STATE.active) {
        // guardar snapshot
        SORT_STATE.snapshot = [...el.children].map((r) => r.value());
        const arr = SORT_STATE.snapshot.map((x) => ({ ...x }));
        const scored = arr.filter((t) => Number.isFinite(t.score));
        const un = arr.filter((t) => !Number.isFinite(t.score));
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, 10);
        const rest = scored.slice(10).concat(un);
        const merged = top.concat(rest).map((t, i) => ({ ...t, n: i + 1 }));

        el.innerHTML = "";
        merged.forEach((t, i) => el.appendChild(makeRow(i, t))); // makeRow proviene de autofill js
        SORT_STATE.active = true;
        setSortButtonLabel();

        ensureNoteButtons();
        renderNotesOutput();
        return;
      }

      // restaurar snapshot
      const original = SORT_STATE.snapshot?.map((x) => ({ ...x })) || [];
      el.innerHTML = "";
      original.forEach((t, i) => el.appendChild(makeRow(i, t)));
      SORT_STATE.active = false;
      SORT_STATE.snapshot = null;
      setSortButtonLabel();

      ensureNoteButtons();
      renderNotesOutput();
    });
    setSortButtonLabel();
  }

  // ---------- Library (Supabase) ----------
  async function saveToLibrary() {
    const { data: sData } = await sb().auth.getSession();
    const user = sData?.session?.user;
    if (!user) {
      alert("Please sign in first.");
      return;
    }
    const s = getAppState();
    if (!s) return;

    const avg = computeAverage(s.tracks);
    const payload = {
      user_id: user.id,
      album: s.album || "",
      artist: s.artist || "",
      released: s.released || "",
      rankedby: s.rankedby || "",
      cover: s.cover || $("#coverOut")?.src || "",
      tracks: s.tracks || [],
      avg: avg,
      final_notes: s.finalNotes || "",
    };

    const { error } = await sb().from("albums").insert(payload);
    if (error) {
      console.error(error);
      alert("Error saving album.");
      return;
    }
    alert("Saved to your library.");
  }

  function openLibraryModal(show) {
    const bd = $("#libraryBackdrop");
    if (!bd) return;
    bd.style.display = show ? "flex" : "none";
  }

  async function openLibrary() {
    const { data: sData } = await sb().auth.getSession();
    const user = sData?.session?.user;
    if (!user) {
      alert("Please sign in first.");
      return;
    }

    const sortSel = $("#librarySort");
    const order = sortSel?.value || "desc";

    let q = sb().from("albums").select("*").eq("user_id", user.id);
    if (order === "desc") q = q.order("avg", { ascending: false, nullsFirst: false });
    else if (order === "asc") q = q.order("avg", { ascending: true, nullsFirst: true });
    else q = q.order("created_at", { ascending: false });

    const { data, error } = await q;
    if (error) {
      console.error(error);
      alert("Error loading library.");
      return;
    }

    const list = $("#libraryList");
    const empty = $("#libraryEmpty");
    list.innerHTML = `
      <div style="grid-column:1/-1;display:grid;grid-template-columns:88px 1fr 96px 96px 96px;gap:10px;color:#9fb0c6;padding:6px 0 10px;position:sticky;top:0;background:#0f1218;">
        <div>Cover</div><div>Album — Artist</div><div style="text-align:center">Avg</div><div style="text-align:center">Tracks</div><div style="text-align:center">Opened</div>
      </div>
    `;

    if (!data || !data.length) {
      empty.style.display = "";
      openLibraryModal(true);
      return;
    }
    empty.style.display = "none";

    data.forEach((row) => {
      const item = document.createElement("div");
      item.className = "lib-row lib-grid";

      const cover = document.createElement("img");
      cover.className = "lib-cover";
      cover.src = row.cover || "";

      const title = document.createElement("div");
      title.innerHTML = `<div style="font-weight:700">${row.album || "—"}</div><div style="opacity:.8">${row.artist || ""}</div>`;

      const avg = document.createElement("div");
      avg.style.textAlign = "center";
      avg.textContent = row.avg != null ? String(row.avg) : "—";

      const tc = document.createElement("div");
      tc.style.textAlign = "center";
      tc.textContent = Array.isArray(row.tracks) ? row.tracks.length : "—";

      const open = document.createElement("div");
      open.style.textAlign = "center";
      const btn = document.createElement("button");
      btn.textContent = "Open";
      btn.addEventListener("click", () => {
        const s = {
          lang: $("#lang")?.value || "en",
          album: row.album,
          artist: row.artist,
          released: row.released,
          rankedby: row.rankedby,
          cover: row.cover,
          tracks: row.tracks || [],
          finalNotes: row.final_notes || "",
        };
        setAppState(s);
        saveLocal();
        const ta = $("#finalNotes");
        if (ta) ta.value = row.final_notes || "";
        renderNotesOutput();
        openLibraryModal(false);
      });
      open.appendChild(btn);

      item.append(cover, title, avg, tc, open);
      list.appendChild(item);
    });

    openLibraryModal(true);
  }

  // ---------- Bind UI ----------
  function bindUI() {
    // Auth buttons
    const bi = $("#btnSigninGoogle");
    if (bi && !bi._bound) {
      bi._bound = true;
      bi.addEventListener("click", signInGoogle);
    }
    const bo = $("#btnSignout");
    if (bo && !bo._bound) {
      bo._bound = true;
      bo.addEventListener("click", signOut);
    }
    const bs = $("#btnSaveToLibrary");
    if (bs && !bs._bound) {
      bs._bound = true;
      bs.addEventListener("click", saveToLibrary);
    }
    const bm = $("#btnMyLibrary");
    if (bm && !bm._bound) {
      bm._bound = true;
      bm.addEventListener("click", openLibrary);
    }

    // Modal controls
    const bc = $("#libraryClose");
    if (bc && !bc._bound) {
      bc._bound = true;
      bc.addEventListener("click", () => openLibraryModal(false));
    }
    const sortSel = $("#librarySort");
    if (sortSel && !sortSel._bound) {
      sortSel._bound = true;
      sortSel.addEventListener("change", openLibrary);
    }
    const back = $("#libraryBackdrop");
    if (back && !back._backdropBound) {
      back._backdropBound = true;
      back.addEventListener("click", (e) => {
        if (e.target === back) openLibraryModal(false);
      });
    }

    // Export / Import / Clear
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
    const clrAll = $("#clearAll");
    if (clrAll && !clrAll._bound) {
      clrAll._bound = true;
      clrAll.addEventListener("click", clearAll);
    }
    const clrScores = $("#clearScores");
    if (clrScores && !clrScores._bound) {
      clrScores._bound = true;
      clrScores.addEventListener("click", clearScores);
    }

    // Notes + observer
    bindFinalNotes();
    observeTrackList();

    // Sort Top 10
    bindSortTop10();

    // Re-pintar notas tras autofill
    window.addEventListener("album-autofilled", () => {
      bindFinalNotes();
      observeTrackList();
      renderNotesOutput();
    });

    // Auth changes
    try {
      sb().auth.onAuthStateChange(() => refreshAuthUI());
    } catch (e) {
      console.warn("onAuthStateChange no disponible todavía:", e);
    }
    refreshAuthUI();
  }

  // ---------- boot ----------
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

  // makeRow fallback guard (si ui carga antes que autofill; la app real lo carga después)
  function makeRow(i, data) {
    if (window.makeRow) return window.makeRow(i, data);
    const row = document.createElement("div");
    row.className = "row";
    ["n", "dur", "name"].forEach(() => {
      const inp = document.createElement("input");
      row.appendChild(inp);
    });
    const selBox = document.createElement("div");
    selBox.textContent = (data?.score ?? "-").toString();
    row.appendChild(selBox);
    const pill = document.createElement("div");
    pill.className = "pill";
    row.appendChild(pill);
    const noteBtn = document.createElement("button");
    noteBtn.className = "noteBtn";
    row.appendChild(noteBtn);
    row.value = () => data || {};
    return row;
  }
})();
```0
