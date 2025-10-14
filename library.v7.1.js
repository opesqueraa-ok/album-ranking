// library.v7.1.js
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // Pinta filas
  function renderRows(rows) {
    const tb = $("#tbody");
    tb.innerHTML = "";
    if (!rows || !rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = "No albums yet.";
      td.className = "muted";
      tr.appendChild(td);
      tb.appendChild(tr);
      return;
    }

    rows.forEach((r) => {
      const tr = document.createElement("tr");

      const tdCover = document.createElement("td");
      tdCover.className = "col-cover";
      const img = document.createElement("img");
      img.className = "cover";
      img.alt = "cover";
      img.src = r.cover || r.cover_url || "";
      tdCover.appendChild(img);

      const tdAlbum = document.createElement("td");
      tdAlbum.textContent = r.album || "—";

      const tdArtist = document.createElement("td");
      tdArtist.textContent = r.artist || "—";

      const tdRel = document.createElement("td");
      tdRel.textContent = r.released || "";

      const tdAvg = document.createElement("td");
      tdAvg.className = "col-average";
      const avg = r.avg ?? r.avg_score ?? null;
      tdAvg.textContent = avg == null ? "—" : String(avg);

      const tdTracks = document.createElement("td");
      tdTracks.className = "col-tracks";
      tdTracks.textContent = Array.isArray(r.tracks) ? r.tracks.length : "—";

      const tdOpen = document.createElement("td");
      tdOpen.className = "col-open";
      const btn = document.createElement("button");
      btn.textContent = "Open";
      btn.addEventListener("click", () => openIntoApp(r));
      tdOpen.appendChild(btn);

      tr.append(tdCover, tdAlbum, tdArtist, tdRel, tdAvg, tdTracks, tdOpen);
      tb.appendChild(tr);
    });
  }

  // Carga biblioteca del usuario
  async function loadMyLibrary() {
    const { data: s } = await window.sb.auth.getSession();
    const user = s?.session?.user;
    if (!user) {
      renderRows([]);
      return;
    }
    // Trae todos los campos posibles (compatibilidad con migraciones)
    const { data, error } = await window.sb
      .from("albums")
      .select("id, album, artist, released, rankedby, cover, cover_url, tracks, avg, avg_score, final_notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      renderRows([]);
      return;
    }
    renderRows(data || []);
  }

  // Exportar a JSON (todos los del usuario)
  async function exportLibrary() {
    const { data: s } = await window.sb.auth.getSession();
    const user = s?.session?.user;
    if (!user) return;

    const { data, error } = await window.sb
      .from("albums")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      alert("No se pudo exportar.");
      console.error(error);
      return;
    }
    const blob = new Blob([JSON.stringify(data || [], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "albumrater-library.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Importar desde JSON (agrega filas a la tabla remota)
  async function importLibrary(file) {
    const { data: s } = await window.sb.auth.getSession();
    const user = s?.session?.user;
    if (!user) {
      alert("Inicia sesión primero.");
      return;
    }
    const r = new FileReader();
    r.onload = async (e) => {
      try {
        const list = JSON.parse(e.target.result);
        if (!Array.isArray(list)) throw new Error("Formato inválido");

        const toInsert = list.map((row) => ({
          user_id: user.id,
          album: row.album || "",
          artist: row.artist || "",
          released: row.released || "",
          rankedby: row.rankedby || "",
          cover: row.cover || row.cover_url || "",
          tracks: row.tracks || [],
          avg: row.avg ?? row.avg_score ?? null,
          final_notes: row.final_notes || "",
        }));

        // Inserta en lotes pequeños para evitar límites
        while (toInsert.length) {
          const chunk = toInsert.splice(0, 200);
          const { error } = await window.sb.from("albums").insert(chunk);
          if (error) throw error;
        }
        alert("Importado correctamente.");
        loadMyLibrary();
      } catch (err) {
        alert("No se pudo importar ese archivo.");
        console.error(err);
      }
    };
    r.readAsText(file);
  }

  // Abrir álbum en la app principal (si la tienes separada)
  function openIntoApp(row) {
    // Aquí solo mostramos los datos, o podrías redirigir con querystring.
    console.log("Open album:", row);
    alert("Aquí puedes enlazar con tu editor principal o guardar en localStorage antes de redirigir.");
  }

  function bindUI() {
    const libBtn = $("#btnLibrary");
    const expBtn = $("#btnExportLibrary");
    const impInp = $("#fileImport");

    if (libBtn && !libBtn._b) {
      libBtn._b = true;
      libBtn.addEventListener("click", loadMyLibrary);
    }
    if (expBtn && !expBtn._b) {
      expBtn._b = true;
      expBtn.addEventListener("click", exportLibrary);
    }
    if (impInp && !impInp._b) {
      impInp._b = true;
      impInp.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (f) importLibrary(f);
        e.target.value = "";
      });
    }

    // Auto-cargar si ya hay sesión
    window.sb.auth.getSession().then(({ data }) => {
      if (data?.session?.user) loadMyLibrary();
      else renderRows([]); // pinta vacío
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUI);
  } else {
    bindUI();
  }
})();
