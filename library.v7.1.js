// library.v7.1.js — v7.1 (JSON en albums.tracks)
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ---------- helpers ----------
  const fmt = (n, d = 1) =>
    n == null || isNaN(n) ? "—" : Number(n).toFixed(d);

  const avgFromTracks = (tracks) => {
    const arr = Array.isArray(tracks) ? tracks : [];
    const vals = arr
      .map((t) => Number(t?.score))
      .filter((x) => Number.isFinite(x));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const toast = (msg) => {
    console.log(msg);
    alert(msg); // simple, portable
  };

  // ---------- state/UI ----------
  function setAuthUI(session) {
    const signed = !!session?.user;
    const btnLib = $("#btnLibrary");
    const btnExp = $("#btnExportLibrary");
    const imp = $("#fileImport");
    const status = $("#authStatus");
    const inBtn = $("#btnSignIn");
    const outBtn = $("#btnSignOut");

    if (signed) {
      status.style.display = "inline";
      status.textContent = session.user.email || "Signed in";
      inBtn.style.display = "none";
      outBtn.style.display = "inline-block";
      btnLib.disabled = false;
      btnExp.disabled = false;
      imp.disabled = false;
    } else {
      status.style.display = "none";
      status.textContent = "";
      inBtn.style.display = "inline-block";
      outBtn.style.display = "none";
      btnLib.disabled = true;
      btnExp.disabled = true;
      imp.disabled = true;
    }
  }

  // ---------- render ----------
  async function fetchMyAlbums() {
    // Traemos solo lo que existe en TU esquema actual:
    // id, album, artist, released, cover, avg_score (si existe),
    // tracks (JSON), rankedby opcional, user_id para RLS
    const { data: sess } = await sb.auth.getSession();
    const uid = sess?.session?.user?.id || null;
    if (!uid) return { items: [], needLogin: true };

    // Si tienes RLS por user_id, úsalo; si no, quita el .eq('user_id', uid)
    const { data, error } = await sb
      .from("albums")
      .select("id, album, artist, released, cover, avg_score, tracks, rankedby, updated_at, created_at, user_id")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      toast("Error loading albums: " + error.message);
      return { items: [] };
    }

    const items = (data || []).map((row) => {
      const count = Array.isArray(row.tracks) ? row.tracks.length : 0;
      const avg = row.avg_score ?? avgFromTracks(row.tracks);
      return {
        id: row.id,
        album: row.album || "",
        artist: row.artist || "",
        released: row.released || "",
        cover: row.cover || "",
        avg_score: avg,
        tracksCount: count,
      };
    });

    return { items };
  }

  function rowEl(a) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-cover">${a.cover ? `<img class="cover" src="${a.cover}" alt="">` : ""}</td>
      <td>${a.album}</td>
      <td>${a.artist}</td>
      <td>${a.released}</td>
      <td class="col-average">${fmt(a.avg_score)}</td>
      <td class="col-tracks">${a.tracksCount || 0}</td>
      <td class="col-open"><button data-open="${a.id}">Open</button></td>
    `;
    return tr;
  }

  async function render() {
    const tbody = $("#tbody");
    tbody.innerHTML = `<tr><td colspan="7" class="muted">Loading...</td></tr>`;

    const { items, needLogin } = await fetchMyAlbums();
    if (needLogin) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Sign in to view your library.</td></tr>`;
      return;
    }

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">No albums yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    items.forEach((a) => tbody.appendChild(rowEl(a)));

    // Wire "Open"
    $$('#tbody [data-open]').forEach((btn) => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open");
        // Aquí puedes navegar a tu vista original de detalle; por ahora, solo mensaje.
        alert("Abrir álbum: " + id);
      });
    });
  }

  // ---------- export ----------
  async function exportLibrary() {
    const { data: sess } = await sb.auth.getSession();
    const uid = sess?.session?.user?.id || null;
    if (!uid) return toast("Sign in first.");

    const { data, error } = await sb
      .from("albums")
      .select("id, lang, album, artist, released, rankedby, cover, avg_score, tracks, final_notes, created_at, updated_at, user_id")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      return toast("Export failed: " + error.message);
    }

    const shaped = {
      albums: (data || []).map((a) => ({
        id: a.id,
        lang: a.lang ?? "en",
        album: a.album || "",
        artist: a.artist || "",
        released: a.released || "",
        rankedby: a.rankedby || "",
        cover: a.cover || "",
        tracks: Array.isArray(a.tracks) ? a.tracks : [],
        avgScore: a.avg_score ?? avgFromTracks(a.tracks),
        notes: a.final_notes ?? "",
        updatedAt: a.updated_at ? new Date(a.updated_at).getTime() : Date.now(),
        createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
      })),
    };

    const blob = new Blob([JSON.stringify(shaped, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `albumrater-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  // ---------- import ----------
  async function importLibrary(file) {
    const { data: sess } = await sb.auth.getSession();
    const uid = sess?.session?.user?.id || null;
    if (!uid) return toast("Sign in first.");

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const albums = Array.isArray(json.albums) ? json.albums : [];
      if (!albums.length) return toast("El JSON no contiene albums.");

      // Prepara payload para TU esquema (tracks JSON en albums)
      const rows = albums.map((a) => ({
        id: a.id, // respetamos si viene id
        user_id: uid,
        lang: a.lang ?? "en",
        album: a.album ?? "",
        artist: a.artist ?? "",
        released: a.released ?? "",
        rankedby: a.rankedby ?? "",
        cover: a.cover ?? "",
        tracks: Array.isArray(a.tracks) ? a.tracks : [],
        avg_score:
          a.avgScore != null
            ? Number(a.avgScore)
            : avgFromTracks(a.tracks || []),
        final_notes: typeof a.notes === "string" ? a.notes : (a.notes?.final ?? ""),
      }));

      const { error } = await sb.from("albums").upsert(rows, {
        onConflict: "id",
      });
      if (error) throw error;

      toast("Import terminado ✅");
      render();
    } catch (e) {
      console.error(e);
      toast("Import failed: " + (e?.message || e));
    }
  }

  // ---------- bind ----------
  function bind() {
    const btnLib = $("#btnLibrary");
    const btnExport = $("#btnExportLibrary");
    const fileImport = $("#fileImport");

    if (btnLib && !btnLib._b) {
      btnLib._b = true;
      btnLib.addEventListener("click", render);
    }
    if (btnExport && !btnExport._b) {
      btnExport._b = true;
      btnExport.addEventListener("click", exportLibrary);
    }
    if (fileImport && !fileImport._b) {
      fileImport._b = true;
      fileImport.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        importLibrary(f);
        e.target.value = "";
      });
    }

    // Estado inicial de auth + render reactivo
    sb.auth.getSession().then(({ data }) => {
      setAuthUI(data.session);
      render();
    });
    sb.auth.onAuthStateChange((_ev, session) => {
      setAuthUI(session);
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
