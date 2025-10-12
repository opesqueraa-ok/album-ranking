// cloud.v7.0.js
(function(){
  const $=s=>document.querySelector(s);

  function avgScore(tracks){
    const vals=(tracks||[]).map(t=>t.score).filter(v=>Number.isFinite(v) && v>=5 && v<=10);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  }

  async function uploadCoverIfNeeded(userId, coverSrc){
    if(!coverSrc || coverSrc.startsWith('http')) return coverSrc; // ya es URL
    // coverSrc es base64 data URL
    const m = coverSrc.match(/^data:(.+?);base64,(.*)$/);
    if(!m) return null;
    const mime = m[1]; const b64 = m[2];
    const bin = atob(b64); const len = bin.length;
    const buf = new Uint8Array(len); for(let i=0;i<len;i++) buf[i]=bin.charCodeAt(i);
    const file = new Blob([buf], { type: mime });
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { data, error } = await sb.storage.from('covers').upload(filename, file, { upsert:false, contentType:mime });
    if(error){ console.warn('cover upload error', error); return null; }
    const { data:pub } = sb.storage.from('covers').getPublicUrl(filename);
    return pub?.publicUrl || null;
  }

  async function saveCurrentToCloud(){
    const { data:{ session } } = await sb.auth.getSession();
    if(!session){ alert('Sign in first.'); return; }
    const uid = session.user.id;
    const s = window.AlbumApp.getState();
    const notes = window.UI_Notes_get?.() || { trackNotes:{}, final:'' }; // la UI expone getter
    const coverUrl = await uploadCoverIfNeeded(uid, s.cover);
    const payload = {
      user_id: uid,
      album: s.album || '—',
      artist: s.artist || '—',
      released: s.released || '',
      rankedby: s.rankedby || '',
      cover_url: coverUrl || '',
      avg_score: avgScore(s.tracks),
      tracks: s.tracks || [],
      notes
    };
    const { error } = await sb.from('albums').insert(payload);
    if(error){ alert('Could not save: '+error.message); return; }
    alert('Saved to your library ✅');
  }

  async function listMyAlbums(sort='new'){
    const { data:{ session } } = await sb.auth.getSession();
    if(!session) return [];
    let q = sb.from('albums').select('*');
    if(sort==='new') q = q.order('created_at', { ascending:false });
    if(sort==='score_desc') q = q.order('avg_score', { ascending:false }).order('created_at', { ascending:false });
    if(sort==='score_asc') q = q.order('avg_score', { ascending:true }).order('created_at', { ascending:false });
    if(sort==='alpha') q = q.order('album', { ascending:true });
    const { data, error } = await q;
    if(error){ console.warn(error); return []; }
    return data || [];
  }

  async function loadAlbumIntoUI(id){
    const { data:{ session } } = await sb.auth.getSession();
    if(!session) return;
    const { data, error } = await sb.from('albums').select('*').eq('id', id).single();
    if(error || !data){ alert('Album not found'); return; }
    // pintar UI
    window.AlbumApp.setState({
      lang: (localStorage.getItem('albumrater_lang')||'en'),
      album: data.album,
      artist: data.artist,
      released: data.released || '',
      rankedby: data.rankedby || '',
      cover: data.cover_url || '',
      tracks: data.tracks || []
    });
    // notas
    window.UI_Notes_set?.(data.notes || { trackNotes:{}, final:'' });
    // cerrar modal
    const modal=$('#libraryModal'); if(modal) modal.style.display='none';
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  async function deleteAlbum(id){
    if(!confirm('Delete this album from cloud?')) return;
    const { error } = await sb.from('albums').delete().eq('id', id);
    if(error){ alert('Could not delete: '+error.message); return; }
    // refrescar
    const sel = $('#libSort'); window.UI_Library_open?.(sel?.value||'new');
  }

  // Exponer a la UI
  window.Cloud = { saveCurrentToCloud, listMyAlbums, loadAlbumIntoUI, deleteAlbum };
})();
