// library.v7.1.js
(function(){
  const $ = s => document.querySelector(s);

  // === Utilidades ===
  function toJsonSafeTrack(t){
    // convierte NaN/undefined -> null (JSON válido)
    const score = Number.isFinite(t?.score) ? t.score : null;
    return { n: t?.n ?? null, dur: t?.dur ?? '', name: t?.name ?? '', score };
  }
  function avgScore(tracks) {
    const vals = (tracks || [])
      .map(t => t?.score)
      .filter(v => Number.isFinite(v) && v >= 5 && v <= 10);
    return vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null;
  }

  async function tryEnsureCoversBucket(){
    // si el bucket no existe, evitamos que el upload rompa el guardado
    try {
      const { data, error } = await sb.storage.listBuckets();
      if (error) return false;
      return !!(data || []).find(b => b.name === 'covers');
    } catch { return false; }
  }

  async function uploadCoverIfNeeded(userId, coverSrc){
    if (!coverSrc || coverSrc.startsWith('http')) return coverSrc;
    const hasBucket = await tryEnsureCoversBucket();
    if (!hasBucket) return null; // skip: no bloquees el guardado

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

  // === Guardar álbum actual en la nube ===
  async function saveCurrentToCloud(){
    const { data:{ session } } = await sb.auth.getSession();
    if (!session) return alert('Sign in first.');
    const uid = session.user.id;

    const s = window.AlbumApp?.getState?.();
    if (!s) return alert('Editor not ready.');

    // ¡SANITIZAR!
    const safeTracks = (s.tracks || []).map(toJsonSafeTrack);
    const notes  = window.UI_Notes_get?.() || { trackNotes:{}, final:'' };

    let coverUrl = null;
    try { coverUrl = await uploadCoverIfNeeded(uid, s.cover); } catch (e) { console.warn(e); }

    const payload = {
      user_id: uid,
      album:   s.album || '—',
      artist:  s.artist || '—',
      released:s.released || '',
      rankedby:s.rankedby || '',
      cover_url: coverUrl || '',
      avg_score: avgScore(safeTracks),
      tracks:  safeTracks,
      notes
    };

    const { error } = await sb.from('albums').insert(payload);
    if (error) {
      console.error('Insert error:', error);
      alert('Could not save: ' + (error.message || 'Unknown error'));
      return;
    }
    alert('Saved to your library ✅');
    const panel = $('#libPanel');
    if (panel && panel.style.display === 'block') loadMyLibrary();
  }

  // === Listado y apertura ===
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
    const body = $('#tbody');
    try{
      const { data:{ session } } = await sb.auth.getSession();
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
        console.error('Select error:', error);
        body.innerHTML = `<tr><td colspan="7" style="padding:14px;color:#e99">Error loading: ${error.message}</td></tr>`;
        return;
      }

      if (!data || !data.length) {
        body.innerHTML = `<tr><td colspan="7" style="padding:14px;color:#aeb5c0">No albums saved yet.</td></tr>`;
        return;
      }

      body.innerHTML = data.map(rowHtml).join('');
      body.querySelectorAll('.openAlbum').forEach(btn=>{
        btn.addEventListener('click', async (ev)=>{
          const id = ev.currentTarget.closest('tr')?.dataset?.id;
          if (!id) return;
          const { data, error } = await sb.from('albums').select('*').eq('id', id).single();
          if (error || !data) { alert('Album not found'); return; }

          window.AlbumApp?.setState?.({
            lang: (localStorage.getItem('albumrater_lang')||'en'),
            album: data.album,
            artist: data.artist,
            released: data.released || '',
            rankedby: data.rankedby || '',
            cover: data.cover_url || '',
            tracks: (data.tracks || []).map(toJsonSafeTrack)
          });
          window.UI_Notes_set?.(data.notes || { trackNotes:{}, final:'' });

          togglePanel(false);
          window.scrollTo({ top:0, behavior:'smooth' });
        });
      });
    }catch(e){
      console.error(e);
      body.innerHTML = `<tr><td colspan="7" style="padding:14px;color:#e99">Unexpected error.</td></tr>`;
    }
  }

  function togglePanel(force){
    const panel = $('#libPanel');
    if (!panel) return;
    const open = (typeof force === 'boolean') ? force : (panel.style.display !== 'block');
    panel.style.display = open ? 'block' : 'none';
    if (open) loadMyLibrary();
  }

  // (Opcional) export/import de library en la nube…
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
      const uid = (await sb.auth.getUser()).data.user?.id || null;
      const toInsert = arr.map(x => ({
        user_id: uid,
        album: x.album || '—',
        artist: x.artist || '—',
        released: x.released || '',
        rankedby: x.rankedby || '',
        cover_url: x.cover_url || '',
        avg_score: x.avg_score ?? avgScore((x.tracks||[]).map(toJsonSafeTrack)),
        tracks: (x.tracks||[]).map(toJsonSafeTrack),
        notes: x.notes || { trackNotes:{}, final:'' }
      }));
      const { error } = await sb.from('albums').insert(toInsert);
      if (error) return alert('Import failed: ' + error.message);
      alert('Library imported ✔');
      loadMyLibrary();
    }catch(e){ alert('Import failed: ' + e.message); }
  }

  function bind(){
    const btnLib = $('#btnLibrary'); if (btnLib && !btnLib._b){ btnLib._b=true; btnLib.addEventListener('click', ()=> togglePanel()); }
    const btnSave = $('#btnSaveToLibrary'); if (btnSave && !btnSave._b){ btnSave._b=true; btnSave.addEventListener('click', saveCurrentToCloud); }

    const btnExportLib = $('#btnExportLibrary'); if (btnExportLib && !btnExportLib._b){ btnExportLib._b=true; btnExportLib.addEventListener('click', exportLibrary); }
    const fileImportLib = $('#fileImportLibrary'); if (fileImportLib && !fileImportLib._b){
      fileImportLib._b=true; fileImportLib.addEventListener('change', (e)=>{ const f=e.target.files?.[0]; if(f) importLibraryFromFile(f); e.target.value=''; });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
