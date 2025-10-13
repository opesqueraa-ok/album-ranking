/*! cloud.v7.1.js — Supabase helpers: save/load/list/delete albums + cover upload */
(function () {
  const $ = (s) => document.querySelector(s);

  // --- Supabase client getter (independiente de ui.js) ---
  let _sb = null;
  function sb() {
    if (_sb) return _sb;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      throw new Error("Supabase client or credentials missing (check index.html).");
    }
    _sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return _sb;
  }

  // --- helpers ---
  function avgScore(tracks) {
    const vals = (tracks || [])
      .map((t) => Number(t?.score))
      .filter((v) => Number.isFinite(v));
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Number(avg.toFixed(2));
  }

  async function uploadCoverIfNeeded(userId, coverSrc) {
    // Si ya es URL http(s) o está vacío, devolver tal cual
    if (!coverSrc || /^https?:\/\//i.test(coverSrc)) return coverSrc;

    // Debe ser un data URL base64
    const m = String(coverSrc).match(/^data:(.+?);base64,(.*)$/);
    if (!m) return coverSrc;
    const mime = m[1];
    const b64 = m[2];

    const bin = atob(b64);
    const len = bin.length;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);

    const blob = new Blob([buf], { type: mime || "image/png" });
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    // Asegúrate de tener creado el bucket público "covers" en Supabase Storage
    const { error: upErr } = await sb()
      .storage
      .from("covers")
      .upload(filename, blob, { upsert: false, contentType: mime || "image/png" });

    if (upErr) {
      console.warn("cover upload error", upErr);
      return coverSrc; // fallback: deja el dataURL local
    }

    const { data: pub } = sb().storage.from("covers").getPublicUrl(filename);
    return pub?.publicUrl || coverSrc;
  }

  // --- SAVE ---
  async function saveCurrentToCloud() {
    // Requiere sesión
    const { data: sessData, error: sessErr } = await sb().auth.getSession();
    if (sessErr) {
      alert("Auth error. Try signing in again.");
      return;
    }
    const session = sessData?.session;
    if (!session) {
      alert("Sign in first.");
      return;
    }
    const uid = session.user.id;

    // Estado actual de la UI
    const s = window.AlbumApp?.getState ? window.AlbumApp.getState() : null;
    if (!s) {
      alert("No album state to save.");
      return;
    }

    // Subir portada si hace falta
    const coverUrl = await uploadCoverIfNeeded(uid, s.cover || $("#coverOut")?.src || "");

    // Preparar payload compatible con tabla "albums"
    const payload = {
      user_id: uid,
      album: s.album || "—",
      artist: s.artist || "—",
      released: s.released || "",
      rankedby: s.rankedby || "",
      cover: coverUrl || "",
      tracks: s.tracks || [],
      avg: avgScore(s.tracks),
      final_notes: s.finalNotes || "",
    };

    const { error } = await sb().from("albums").insert(payload);
    if (error) {
      console.error(error);
      alert("Could not save album.");
      return;
    }
    toast("Saved to your library ✅");
  }

  // --- LIST ---
  // order: 'new' | 'score_desc' | 'score_asc' | 'alpha'
  async function listMyAlbums(order = "new") {
    const { data: sessData } = await sb().auth.getSession();
    const user = sessData?.session?.user;
    if (!user) return [];

    let q = sb().from("albums").select("*").eq("user_id", user.id);
    if (order === "score_desc") q = q.order("avg", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    else if (order === "score_asc") q = q.order("avg", { ascending: true, nullsFirst: true }).order("created_at", { ascending: false });
    else if (order === "alpha") q = q.order("album", { ascending: true });
    else q = q.order("created_at", { ascending: false });

    const { data, error } = await q;
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  }

  // --- LOAD (pintar un álbum guardado en el formulario actual) ---
  async function loadAlbumIntoUI(id) {
    const { data: sessData } = await sb().auth.getSession();
    const user = sessData?.session?.user;
    if (!user) {
      alert("Sign in first.");
      return;
    }

    const { data, error } = await sb().from("albums").select("*").eq("id", id).eq("user_id", user.id).single();
    if (error || !data) {
      alert("Album not found.");
      return;
    }

    // Restaura estado en la UI
    const state = {
      lang: $("#lang")?.value || "en",
      album: data.album || "",
      artist: data.artist || "",
      released: data.released || "",
      rankedby: data.rankedby || "",
      cover: data.cover || "",
      tracks: Array.isArray(data.tracks) ? data.tracks : [],
      finalNotes: data.final_notes || "",
    };

    if (window.AlbumApp?.setState) window.AlbumApp.setState(state);
    if (window.AlbumApp?.save) window.AlbumApp.save();

    const ta = $("#finalNotes");
    if (ta) ta.value = state.finalNotes;
    // Notas consolidadas
    if (window.renderNotesOutput) window.renderNotesOutput();

    // Cierra modal si existe en esta app
    const backdrop = $("#libraryBackdrop");
    if (backdrop) backdrop.style.display = "none";

    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Album loaded ✓");
  }

  // --- DELETE ---
  async function deleteAlbum(id) {
    const { data: sessData } = await sb().auth.getSession();
    const user = sessData?.session?.user;
    if (!user) {
      alert("Sign in first.");
      return;
    }
    if (!confirm("Delete this album from cloud?")) return;

    const { error } = await sb().from("albums").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      alert("Could not delete album.");
      return;
    }
    toast("Deleted ✓");
    // Si la UI expone un refresco de biblioteca, úsalo
    if (typeof window.UI_Library_open === "function") {
      const sel = $("#librarySort");
      window.UI_Library_open(sel?.value || "new");
    }
  }

  // --- Toast mínimo reutilizable ---
  function toast(msg = "", ms = 1800) {
    let t = $("#toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.style.cssText =
        "position:fixed;left:50%;transform:translateX(-50%);bottom:20px;background:#111a;backdrop-filter:blur(6px);color:#fff;padding:10px 14px;border:1px solid #334;border-radius:10px;z-index:99999;display:none";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(t._h);
    t._h = setTimeout(() => (t.style.display = "none"), ms);
  }

  // Exponer a la UI
  window.Cloud = { saveCurrentToCloud, listMyAlbums, loadAlbumIntoUI, deleteAlbum };
})();
```0
