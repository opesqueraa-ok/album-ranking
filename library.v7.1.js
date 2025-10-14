// library.v7.1.js
(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // === Helpers ===
  function fmt(n, d=1){
    if(n == null || isNaN(n)) return '—';
    return Number(n).toFixed(d);
  }
  function averageFromTracks(tracks){
    if(!tracks || !tracks.length) return null;
    const vals = tracks.map(t => Number(t.score)).filter(x=>!isNaN(x));
    if(!vals.length) return null;
    return vals.reduce((a,b)=>a+b,0)/vals.length;
  }
  function download(name, blob){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
  }

  // === Render tabla ===
  async function fetchAlbums(){
    // Puedes cambiar por tu vista si la tienes. Aquí uso albums + un count de tracks y avg_score.
    // Requiere: tabla public.albums (id, album, artist, released, cover, avg_score) y public.tracks (album_id, score)
    const { data: albums, error } = await sb
      .from('albums')
      .select('id, album, artist, released, cover, avg_score, tracks:tracks(count)')
      .order('updated_at', { ascending: false })
      .limit(500);
    if(error){ console.error(error); alert('Error loading albums: '+error.message); return []; }
    return albums.map(a => ({
      ...a,
      tracksCount: Array.isArray(a.tracks) && a.tracks.length ? a.tracks[0].count : 0
    }));
  }

  function row(album){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-cover">
        ${album.cover ? `<img class="cover" src="${album.cover}" alt="">` : ''}
      </td>
      <td>${album.album || ''}</td>
      <td>${album.artist || ''}</td>
      <td>${album.released || ''}</td>
      <td class="col-average">${fmt(album.avg_score ?? album.avg ?? album.avgScore)}</td>
      <td class="col-tracks">${album.tracksCount ?? '—'}</td>
      <td class="col-open"><button data-open="${album.id}">Open</button></td>
    `;
    return tr;
  }

  async function render(){
    const tbody = $('#tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="muted">Loading…</td></tr>';
    const items = await fetchAlbums();
    tbody.innerHTML = '';
    if(!items.length){
      tbody.innerHTML = '<tr><td colspan="7" class="muted">No albums yet</td></tr>';
      return;
    }
    for(const a of items){ tbody.appendChild(row(a)); }
    // wire "Open"
    $$('#tbody [data-open]').forEach(btn=>{
      if(btn._b) return; btn._b = true;
      btn.addEventListener('click', e=>{
        const id = btn.getAttribute('data-open');
        // navega a tu vista/route de detalle si la tienes
        alert('Abrir álbum: ' + id);
      });
    });
  }

  // === Export ===
  async function exportLibrary(){
    // Trae albums con sus tracks para exportar
    const { data: albums, error } = await sb
      .from('albums')
      .select('id, lang, album, artist, released, rankedby, cover, avg_score, notes, created_at, updated_at, tracks:tracks(id, n, dur, name, score)')
      .order('updated_at', { ascending: false });
    if(error){ alert('Export failed: ' + error.message); return; }

    const shaped = {
      albums: (albums||[]).map(a => ({
        id: a.id,
        lang: a.lang ?? 'en',
        album: a.album,
        artist: a.artist,
        released: a.released,
        rankedby: a.rankedby ?? '',
        cover: a.cover ?? '',
        tracks: (a.tracks||[]).map(t=>({ id:t.id, n:t.n, dur:t.dur, name:t.name, score:t.score })),
        avgScore: a.avg_score ?? averageFromTracks(a.tracks||[]),
        notes: a.notes ?? { trackNotes:{}, final:'' },
        updatedAt: a.updated_at ? new Date(a.updated_at).getTime() : Date.now(),
        createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
      }))
    };

    const blob = new Blob([JSON.stringify(shaped, null, 2)], { type:'application/json' });
    download(`albumrater-library-${new Date().toISOString().slice(0,10)}.json`, blob);
  }

  // === Import ===
  async function importLibrary(file){
    try{
      const text = await file.text();
      const json = JSON.parse(text);
      const albums = Array.isArray(json.albums) ? json.albums : [];
      if(!albums.length){ alert('El JSON no tiene albums.'); return; }

      // Usuario actual (para ownership si usas RLS por user_id)
      const { data: sess } = await sb.auth.getUser();
      const userId = sess?.user?.id || null;

      // upsert por lotes en albums, luego tracks
      // 1) ALBUMS
      const albumsPayload = albums.map(a => ({
        id: a.id, // respetamos id del archivo
        lang: a.lang ?? 'en',
        album: a.album ?? '',
        artist: a.artist ?? '',
        released: a.released ?? '',
        rankedby: a.rankedby ?? '',
        cover: a.cover ?? '',
        avg_score: (a.avgScore != null ? Number(a.avgScore) : averageFromTracks(a.tracks||[])) ?? null,
        user_id: userId, // si tu tabla lo requiere
      }));

      // upsert
      {
        const { error } = await sb.from('albums')
          .upsert(albumsPayload, { onConflict: 'id' })
          .select('id');
        if(error){ console.error(error); throw new Error('Error upserting albums: ' + error.message); }
      }

      // 2) TRACKS (borro y re-inserto del álbum para que coincida con el JSON)
      for(const a of albums){
        if(!a.id) continue;
        // eliminar antiguos
        {
          const { error } = await sb.from('tracks').delete().eq('album_id', a.id);
          if(error){ console.warn('No se pudo limpiar tracks de', a.id, error); }
        }
        // insertar nuevos
        const tracks = Array.isArray(a.tracks) ? a.tracks : [];
        if(tracks.length){
          const rows = tracks.map(t => ({
            album_id: a.id,
            n: t.n ?? null,
            dur: t.dur ?? null,
            name: t.name ?? '',
            score: (t.score != null ? Number(t.score) : null),
            user_id: userId, // si tu RLS lo requiere
          }));
          const { error } = await sb.from('tracks').insert(rows).select('id');
          if(error){ console.error(error); throw new Error('Error inserting tracks for album '+a.id+': ' + error.message); }
        }
      }

      alert('Import terminado ✅');
      render();
    }catch(err){
      console.error(err);
      alert('Import failed: ' + (err?.message || err));
    }
  }

  // === Library Button ===
  async function openLibrary(){
    // Puedes cambiar por tu modal/ruta; por ahora recarga la tabla.
    await render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // === Bind UI ===
  function bind(){
    const btnLib = $('#btnLibrary');
    const btnExport = $('#btnExportLibrary');
    const fileImport = $('#fileImport');

    if(btnLib && !btnLib._b){ btnLib._b=true; btnLib.addEventListener('click', openLibrary); }
    if(btnExport && !btnExport._b){ btnExport._b=true; btnExport.addEventListener('click', exportLibrary); }
    if(fileImport && !fileImport._b){
      fileImport._b=true;
      fileImport.addEventListener('change', e=>{
        const f = e.target.files?.[0];
        if(!f) return;
        importLibrary(f);
        e.target.value = ''; // permite re-seleccionar el mismo archivo
      });
    }

    // primera carga
    render();
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', bind); } else { bind(); }
})();
