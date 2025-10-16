// ui.v7.2.js – Auth (Google) + Library modal + Export/Import + Sort/Notes wiring + Clear Cover + Clear All + OAuth return fix
(() => {
  // ---------- helpers ----------
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const safe = (s) => (s || "").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, " ");

  // Supabase client
  let supabaseClient = null;
  function sb() {
    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    }
    return supabaseClient;
  }

  // ---------- OAuth return hash cleanup ----------
  function isOAuthHash(h) {
    if (!h) return false;
    const q = h.replace(/^#/, "");
    return /access_token=|refresh_token=|provider_token=/.test(q);
  }
  async function handleOAuthReturn() {
    if (isOAuthHash(location.hash)) {
      try { await sb().auth.getSession(); } catch {}
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  // ---------- Auth UI ----------
  async function refreshAuthUI() {
    const { data } = await sb().auth.getSession();
    const session = data?.session || null;
    const signed = !!session;

    const inBtn   = $("#btnSigninGoogle");
    const outBtn  = $("#btnSignout");
    const saveBtn = $("#btnSaveToLibrary");
    const libBtn  = $("#btnMyLibrary");
    const authMini= $("#authMini");

    if (inBtn)   inBtn.style.display   = signed ? "none" : "";
    if (outBtn)  outBtn.style.display  = signed ? "" : "none";
    if (saveBtn) saveBtn.style.display = signed ? "" : "none";
    if (libBtn)  libBtn.style.display  = signed ? "" : "none";
    if (authMini) authMini.style.display = signed ? "inline-flex" : "none";
  }

  async function signInGoogle() {
    await sb().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.SITE_URL }
    });
  }
  async function signOut() {
    await sb().auth.signOut();
    await refreshAuthUI();
  }

  // ---------- App state helpers (delegan en autofill script) ----------
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
      .filter((v) => Number.isFinite(v) && v >= 5 && v <= 10);
    if (!valid.length) return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return Number(avg.toFixed(2));
  }

  // ---------- Export / Import (estado local, no cloud) ----------
  function exportJSON() {
    try {
      const s = getAppState();
      const payload = { ...s };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const album = safe(s?.album || "Album");
      const artist = safe(s?.artist || "");
      const fname = artist ? `${album} - ${artist}.json` : `${album}.json`;
      const a = document.createElement("a");
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
      toast("Exported current album data.");
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
        toast("Imported.");
      } catch (err) {
        alert("Invalid file.");
      }
    };
    r.readAsText(file);
  }

  // ---------- Clear All & Clear Scores ----------
  function clearAll() {
    if (!confirm("Are you sure you want to clear EVERYTHING?")) return;
    localStorage.removeItem("albumrater_v6_state");
    localStorage.removeItem("albumrater_v7_state");
    setAppState({
      lang: $("#lang")?.value || "en",
      album: "",
      artist: "",
      released: "",
      rankedby: "",
      cover: "",
      tracks: [],
      finalNotes: ""
    });
    const img = $("#coverOut"); if (img) img.src = "";
    const ta  = $("#finalNotes"); if (ta) ta.value = "";
    saveLocal();
    toast("All cleared.");
  }
  function clearScores() {
    const s = getAppState();
    if (!s) return;
    s.tracks = (s.tracks || []).map((t) => ({ ...t, score: NaN }));
    setAppState(s);
    saveLocal();
    toast("Scores cleared.");
  }

  // ---------- Clear Cover ----------
  function clearCover() {
    const img = $("#coverOut");
    const file = $("#cover");
    if (img) img.src = "";
    if (file) file.value = "";
    const s = getAppState() || {};
    s.cover = "";
    setAppState(s);
    saveLocal();
    toast("Cover cleared.");
  }

  // ---------- Notes live output ----------
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
  window.addEventListener("album-autofilled", () => renderNotesOutput());

  // ---------- Sort Top 10 reversible (delegado a autofill; aquí solo etiqueta) ----------
  function setSortButtonLabel(active) {
    const b = $("#sortTop10");
    if (!b) return;
    b.textContent = active ? "Restore album order" : "Sort Top 10";
  }

  // ---------- Library (Supabase) ----------
  function openLibraryModal(show) {
    const bd = $("#libraryBackdrop");
    if (!bd) return;
    bd.style.display = show ? "flex" : "none";
  }

  function colorFor(score) {
    if (!Number.isFinite(score)) return "var(--neutral)";
    const k = Math.max(5, Math.min(10, Math.floor(Number(score) || 0)));
    const colors = {10:'var(--c10)',9:'var(--c9)',8:'var(--c8)',7:'var(--c7)',6:'var(--c6)',5:'var(--c5)'};
    return colors[k] || "var(--neutral)";
  }

  async function saveToLibrary() {
    const { data: sData } = await sb().auth.getSession();
    const user = sData?.session?.user;
    if (!user) { alert("Please sign in first."); return; }
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
      avg: avg, // asumimos que ya creaste la columna avg (como acordamos)
      final_notes: s.finalNotes || ""
    };

    const { error } = await sb().from("albums").insert(payload);
    if (error) { console.error(error); alert("Error saving album."); return; }
    toast("Saved to your library.");
  }

  let LIB_CACHE = [];
  function paintLibraryList(rows) {
    const list = $("#libraryList");
    const empty = $("#libraryEmpty");
    list.innerHTML = "";
    if (!rows || !rows.length) {
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";

    rows.forEach((row) => {
      // cover
      const c = document.createElement("img");
      c.className = "lib-cover";
      c.src = row.cover || "";

      // title
      const t = document.createElement("div");
      t.innerHTML = `<div style="font-weight:700">${row.album || "—"}</div><div style="opacity:.8">${row.artist || ""}</div>`;

      // average (colored badge)
      const av = document.createElement("div");
      av.className = "center";
      const val = (row.avg == null || Number.isNaN(row.avg)) ? "—" : Number(row.avg).toFixed(1);
      const bg = (row.avg == null || Number.isNaN(row.avg)) ? "var(--neutral)" : colorFor(row.avg);
      av.innerHTML = `<span class="pill" style="background:${bg}">${val}</span>`;

      // tracks
      const tc = document.createElement("div");
      tc.className = "center";
      tc.textContent = Array.isArray(row.tracks) ? row.tracks.length : "—";

      // actions: Open + Delete
      const act = document.createElement("div");
      act.className = "center";
      const open = document.createElement("button");
      open.textContent = "Open";
      open.addEventListener("click", () => {
        const s = {
          lang: $("#lang")?.value || "en",
          album: row.album,
          artist: row.artist,
          released: row.released,
          rankedby: row.rankedby,
          cover: row.cover,
          tracks: row.tracks || [],
          finalNotes: row.final_notes || ""
        };
        setAppState(s);
        const ta = $("#finalNotes"); if (ta) ta.value = row.final_notes || "";
        saveLocal();
        renderNotesOutput();
        openLibraryModal(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.style.marginLeft = "8px";
      del.addEventListener("click", async () => {
        if (!confirm("Delete this album from cloud?")) return;
        const { data: sData } = await sb().auth.getSession();
        const user = sData?.session?.user;
        const { error } = await sb().from("albums").delete().eq("id", row.id).eq("user_id", user.id);
        if (error) { alert("Could not delete."); return; }
        toast("Deleted.");
        // remove locally & repaint
        LIB_CACHE = LIB_CACHE.filter(r => r.id !== row.id);
        applyLibSearchSort(); // repaint after delete
      });
      act.append(open, del);

      // append as grid
      const frag = document.createDocumentFragment();
      [c, t, av, tc, act].forEach(el => frag.appendChild(el));
      list.appendChild(frag);
    });
  }

  function applyLibSearchSort() {
    const q = ($("#librarySearch")?.value || "").toLowerCase().trim();
    const mode = $("#librarySort")?.value || "new";
    let rows = [...LIB_CACHE];

    if (q) {
      rows = rows.filter(r =>
        (r.album || "").toLowerCase().includes(q) ||
        (r.artist || "").toLowerCase().includes(q)
      );
    }
    if (mode === "new") rows.sort((a,b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (mode === "avg_desc") rows.sort((a,b) => (Number(b.avg)||-1) - (Number(a.avg)||-1));
    if (mode === "avg_asc") rows.sort((a,b) => (Number(a.avg)||-1) - (Number(b.avg)||-1));
    if (mode === "alpha") rows.sort((a,b) => (a.album||"").localeCompare(b.album||""));

    paintLibraryList(rows);
  }

  async function openLibrary() {
    const { data: sData } = await sb().auth.getSession();
    const user = sData?.session?.user;
    if (!user) { alert("Please sign in first."); return; }

    const { data, error } = await sb().from("albums")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); alert("Error loading library."); return; }

    LIB_CACHE = data || [];
    applyLibSearchSort();
    openLibraryModal(true);
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg, ms = 1600) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.style.display = "none"), ms);
  }

  // ---------- Bind UI ----------
  function bindUI() {
    // Auth buttons
    const bi = $("#btnSigninGoogle");
    if (bi && !bi._bound) { bi._bound = true; bi.addEventListener("click", signInGoogle); }
    const bo = $("#btnSignout");
    if (bo && !bo._bound) { bo._bound = true; bo.addEventListener("click", signOut); }
    const bs = $("#btnSaveToLibrary");
    if (bs && !bs._bound) { bs._bound = true; bs.addEventListener("click", saveToLibrary); }
    const bm = $("#btnMyLibrary");
    if (bm && !bm._bound) { bm._bound = true; bm.addEventListener("click", openLibrary); }

    // Library modal controls
    const bc = $("#libraryClose");
    if (bc && !bc._bound) { bc._bound = true; bc.addEventListener("click", () => openLibraryModal(false)); }
    const back = $("#libraryBackdrop");
    if (back && !back._backdropBound) {
      back._backdropBound = true;
      back.addEventListener("click", (e) => { if (e.target === back) openLibraryModal(false); });
    }
    const search = $("#librarySearch");
    if (search && !search._bound) { search._bound = true; search.addEventListener("input", applyLibSearchSort); }
    const sortSel = $("#librarySort");
    if (sortSel && !sortSel._bound) { sortSel._bound = true; sortSel.addEventListener("change", applyLibSearchSort); }

    // Export / Import / Clear
    const exp = $("#exportJSON");
    if (exp && !exp._bound) { exp._bound = true; exp.addEventListener("click", exportJSON); }
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
    if (clrAll && !clrAll._bound) { clrAll._bound = true; clrAll.addEventListener("click", clearAll); }
    const clrScores = $("#clearScores");
    if (clrScores && !clrScores._bound) { clrScores._bound = true; clrScores.addEventListener("click", clearScores); }

    // Clear Cover
    const clrCover = $("#btnClearCover");
    if (clrCover && !clrCover._bound) { clrCover._bound = true; clrCover.addEventListener("click", clearCover); }
    const coverInput = $("#cover");
    if (coverInput && !coverInput._bound) {
      coverInput._bound = true;
      coverInput.addEventListener("change", ev => {
        const f = ev.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => { const img = $("#coverOut"); if (img) img.src = e.target.result; const s = getAppState()||{}; s.cover = e.target.result; setAppState(s); saveLocal(); };
        r.readAsDataURL(f);
      });
    }

    // Notes binder
    bindFinalNotes();

    // sort button label sync (autofill gestiona la lógica)
    setSortButtonLabel(false);

    // react to auth state
    sb().auth.onAuthStateChange(() => refreshAuthUI());
    refreshAuthUI();
  }

  // ---------- boot ----------
  (async function boot(){
    await handleOAuthReturn();
    if (document.readyState === "complete" || document.readyState === "interactive") {
      bindUI();
    } else {
      document.addEventListener("DOMContentLoaded", bindUI);
    }
  })();
})();
