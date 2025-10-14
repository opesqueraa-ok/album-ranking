// library.v7.1.js
(function(){
  const $ = s => document.querySelector(s);

  function avgScore(tracks) {
    const vals = (tracks || [])
      .map(t => t.score)
      .filter(v => Number.isFinite(v) && v >= 5 && v <= 10);
    return vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null;
  }

  async function uploadCoverIfNeeded(userId, coverSrc){
    if (!coverSrc || coverSrc.startsWith('http')) return coverSrc;
    const m = coverSrc.match(/^data:(.+?);base64,(.*)$/);
    if (!m) return null;
    const mime = m[1]; const b64 = m[2];
    const bin  = atob(b64); const len = bin.length;
    const buf  = new Uint8Array(len); for (let i=0;i<len;i++) buf[i] = bin.charCodeAt(i);
    const file = new Blob([buf], { type: mime });
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error } = await sb.storage.from('covers').upload(filename, file, { upsert:false, contentType:mime });
    if (error) { console.warn('cover upload error', error); return null; }

    const { data:pub } = sb.storage.from('covers').getPublicUrl(filename);
    return pub?.publicUrl || null;
  }

  async function saveCurrentToCloud(){
    const { data:{ session } } = await sb.auth.getSession();
    if (!session) return alert('Sign in first.');
    const uid = session.user.id;

    const s = window.AlbumApp?.getState?.();
    if (!s) return alert('Editor not ready.');

    const notes  = window.UI_Notes_get?.() || { trackNotes:{}, final:'' };
    const coverUrl = await uploadCoverIfNeeded(uid, s.cover);
    const payload = {
      user_id: uid,
      album:   s.album || '—',
      artist:  s.artist || '—',
      released:s.released || '',
      rankedby:s.rankedby || '',
      cover_url: coverUrl || '',
      avg_score: avgScore(s.tracks),
      tracks:  s.tracks || [],
      notes
    };

    const { error } = await sb.from('albums').insert(payload);
    if (error) return alert('Could not save: ' + error.message);
    alert('Saved to your library ✅');
    // refrescamos si el panel está abierto
    const panel = $('#libPanel');
    if (panel && panel.style.display === 'block') loadMyLibrary();
  }

  function rowHtml(a){
    const cov = a.cover_url ? `<img class="cover-sm" src="${a.cover_url}">` : '';
    const avg = (a.avg_score ?? '').toString();
    const tracksLen = Array.isArray(a.tracks) ? a.tracks.length : '';
    return `<tr data-id="${a.id}">
      <td class="col-cover">${cov}</td>
      <td>${a.album || '—'}</td>
      <td>${a.artist || '—'}</td>
      <td>${a.released || '—'}</td>
      <td class="col-average">${avg || '—'}</td>
      <td class="col-tracks">${tracksLen || '—'}</td>
      <td class="col-open"><button class="openAlbum">Open</button></td>
    </tr>`;
  }

  async function loadMyLibrary(){
    const { data:{ session } } = await sb.auth.getSession();
    const body = $('#tbody');
    if (!session) {
      body.innerHTML = `<tr><td colspan="7" style="padding:14px;color:#aeb5c0">Sign in to view your library.</td></tr>`;
      return;
    }
    body.innerHTML = `<tr><td colspan="7" style="padding:14px;color:#aeb5c0">Loading…</td></tr>`;

    const { data, error } = await sb
      .from('albums')
      .select('id,album,artist,released,avg_score,tracks,cover_url,created_at,rankedby,notes')
      .order('created_at', { ascending:false });

    if (error) {
      body.innerHTML = `<tr><td colspan="7" style="padding:14px;color:#e99">Error loading: ${error.message}</td></tr>`;
      return;
    }

    if (!data || !data.length) {
      body.innerHTML = `<tr><td colspan="7" style="padding:14px;color:#aeb5c0">No albums saved yet.</td></tr>`;
      return;
    }

    body.innerHTML = data.map(rowHtml).join('');

    // bind open buttons
    body.querySelectorAll('.openAlbum').forEach(btn=>{
      btn.addEventListener('click', async (ev)=>{
        const id = ev.currentTarget.closest('tr')?.dataset?.id;
        if (!id) return;
        const { data, error } = await sb.from('albums').select('*').eq('id', id).single();
        if (error || !data) return alert('Album not found');

        window.AlbumApp?.setState?.({
          lang: (localStorage.getItem('albumrater_lang')||'en'),
          album: data.album,
          artist: data.artist,
          released: data.released || '',
          rankedby: data.rankedby || '',
          cover: data.cover_url || '',
          tracks: data.tracks || []
        });
        window.UI_Notes_set?.(data.notes || { trackNotes:{}, final:'' });

        // cerrar panel y subir al top
        togglePanel(false);
        window.scrollTo({ top:0, behavior:'smooth' });
      });
    });
  }

  function togglePanel(force){
    const panel = $('#libPanel');
    if (!panel) return;
    const open = (typeof force === 'boolean') ? force : (panel.style.display !== 'block');
    panel.style.display = open ? 'block' : 'none';
    if (open) loadMyLibrary();
  }

  // Export/Import de LIBRARY (nube) — opcional
  async function exportLibrary(){
    const { data, error } = await sb.from('albums').select('*').order('created_at', { ascending:false });
    if (error) return alert('Export failed: ' + error.message);
    const blob = new Blob([JSON.stringify(data||[], null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'album-library.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
  }

  async function importLibraryFromFile(file){
    try{
      const txt = await file.text();
      const arr = JSON.parse(txt);
      if (!Array.isArray(arr)) throw new Error('Invalid JSON');
      // inserta como copia (no borra nada)
      const toInsert = arr.map(x => ({
        user_id: (await sb.auth.getUser()).data.user?.id || null,
        album: x.album || '—',
        artist: x.artist || '—',
        released: x.released || '',
        rankedby: x.rankedby || '',
        cover_url: x.cover_url || '',
        avg_score: x.avg_score ?? avgScore(x.tracks||[]),
        tracks: x.tracks || [],
        notes: x.notes || { trackNotes:{}, final:'' }
      }));
      const { error } = await sb.from('albums').insert(toInsert);
      if (error) return alert('Import failed: ' + error.message);
      alert('Library imported ✔');
      loadMyLibrary();
    }catch(e){
      alert('Import failed: ' + e.message);
    }
  }

  function bind(){
    const btnLib = $('#btnLibrary'); if (btnLib && !btnLib._b){ btnLib._b=true; btnLib.addEventListener('click', ()=> togglePanel()); }
    const btnSave = $('#btnSaveToLibrary'); if (btnSave && !btnSave._b){ btnSave._b=true; btnSave.addEventListener('click', saveCurrentToCloud); }

    // Opcional: export/import de LIBRARY
    const btnExportLib = $('#btnExportLibrary'); if (btnExportLib && !btnExportLib._b){ btnExportLib._b=true; btnExportLib.addEventListener('click', exportLibrary); }
    const fileImportLib = $('#fileImportLibrary'); if (fileImportLib && !fileImportLib._b){
      fileImportLib._b=true; fileImportLib.addEventListener('change', (e)=>{ const f=e.target.files?.[0]; if(f) importLibraryFromFile(f); e.target.value=''; });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
