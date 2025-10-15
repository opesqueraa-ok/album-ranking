// app-auth-library.v7.1.js
(function () {
  const $ = s => document.querySelector(s);
  const sb = window.sb;

  // ---------- UTIL ----------
  function avgScore(tracks = []) {
    const vals = tracks.map(t => t.score).filter(v => Number.isFinite(v) && v >= 5 && v <= 10);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
  }

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }

  function showPanel(panelId, show) {
    const el = document.getElementById(panelId);
    if (!el) return;
    el.style.display = show ? '' : 'none';
  }

  // ---------- AUTH ----------
  async function handleOAuthReturn() {
    const url = new URL(location.href);

    // PKCE (?code=..)
    if (url.searchParams.get('code')) {
      const { error } = await sb.auth.exchangeCodeForSession(location.href);
      if (error) console.error('exchangeCodeForSession:', error);
    }

    // Implicito (#access_token=..)
    if (url.hash.includes('access_token=')) {
      const p = new URLSearchParams(url.hash.slice(1));
      const access_token = p.get('access_token');
      const refresh_token = p.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        if (error) console.error('setSession:', error);
      }
    }

    // Limpia URL pero conserva ?v=7.1
    const clean = url.pathname + (url.search.includes('v=') ? url.search : '?v=7.1');
    if (url.search || url.hash) history.replaceState({}, document.title, clean);
  }

  async function signInGoogle() {
    const redirectTo = window.SITE_URL || (location.origin + location.pathname);
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'select_account' }
      }
    });
    if (error) alert('No se pudo iniciar sesión: ' + error.message);
  }

  async function signOut() {
    const { error } = await sb.auth.signOut();
    if (error) alert('No se pudo cerrar sesión: ' + error.message);
  }

  function paintAuthUI(session) {
    const u = session?.user || null;
    const email = u?.email || u?.identities?.[0]?.identity_data?.email || '';
    const st = $('#authStatus');
    const inBtn = $('#btnSignIn');
    const outBtn = $('#btnSignOut');
    const gated = [$('#btnLibrary'), $('#btnSaveToLibrary'), $('#btnExportLibrary'), document.querySelector('label[for="fileImportLibrary"]')];

    if (u) {
      if (st) { st.style.display='inline'; st.textContent=email; }
      if (inBtn) inBtn.style.display='none';
      if (outBtn) outBtn.style.display='inline-block';
      gated.forEach(b => b && (b.disabled = false));
    } else {
      if (st) { st.style.display='none'; st.textContent=''; }
      if (inBtn) inBtn.style.display='inline-block';
      if (outBtn) outBtn.style.display='none';
      gated.forEach(b => b && (b.disabled = true));
    }
  }

  // ---------- LIBRARY ----------
  function renderRows(items) {
    const tbody = $('#tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:14px;color:#aeb5c0">No albums yet.</td></tr>';
      return;
    }
    for (const a of items) {
      const tr = document.createElement('tr');
      const avg = (a.avg ?? a.avg_score);
      tr.innerHTML = `
        <td class="col-cover">${a.cover_url ? `<img class="cover-sm" src="${a.cover_url}" alt="">` : ''}</td>
        <td>${a.album || '—'}</td>
        <td>${a.artist || '—'}</td>
        <td>${a.released || ''}</td>
        <td class="col-average">${Number.isFinite(avg) ? (+avg).toFixed(1) : '—'}</td>
        <td class="col-tracks">${Array.isArray(a.tracks) ? a.tracks.length : '—'}</td>
        <td class="col-open"><button class="btn openBtn" data-id="${a.id}">Open</button></td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll('.openBtn').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const id = ev.currentTarget.getAttribute('data-id');
        const { data, error } = await sb.from('albums').select('*').eq('id', id).single();
        if (error) { alert('No se pudo abrir: ' + error.message); return; }
        // pinta en el editor
        window.AlbumApp?.setState?.({
          lang: localStorage.getItem('albumrater_lang') || 'en',
          album: data.album,
          artist: data.artist,
          released: data.released || '',
          rankedby: data.rankedby || '',
          cover: data.cover_url || '',
          tracks: data.tracks || []
        });
        window.UI_Notes_set?.(data.notes || { trackNotes:{}, final:'' });
        showPanel('libPanel', false);
        showPanel('app', true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  async function fetchMyAlbums() {
    const session = await requireSession();
    if (!session) { alert('Inicia sesión para usar Library'); return; }
    const { data, error } = await sb.from('albums').select('*').order('created_at', { ascending:false });
    if (error) { alert('Error al cargar: ' + error.message); return; }
    renderRows(data || []);
  }

  async function saveCurrent() {
    const session = await requireSession();
    if (!session) { alert('Inicia sesión para guardar'); return; }
    const s = window.AlbumApp?.getState?.() || {};
    const notes = window.UI_Notes_get?.() || { trackNotes:{}, final:'' };
    const payload = {
      user_id: session.user.id,
      album: s.album || '—',
      artist: s.artist || '—',
      released: s.released || '',
      rankedby: s.rankedby || '',
      cover_url: s.cover || '',
      avg_score: avgScore(s.tracks || []),
      tracks: (s.tracks || []).map(t => ({
        n: t.n || null, dur: t.dur || '', name: t.name || '',
        score: Number.isFinite(t.score) ? t.score : null
      })),
      notes
    };
    const { error } = await sb.from('albums').insert(payload);
    if (error) { alert('No se pudo guardar: ' + error.message); return; }
    alert('Guardado ✅');
    fetchMyAlbums();
  }

  async function exportLibrary() {
    const session = await requireSession(); if (!session) return alert('Inicia sesión');
    const { data, error } = await sb.from('albums').select('*').order('created_at',{ascending:false});
    if (error) return alert('Error al exportar: '+error.message);
    const blob = new Blob([JSON.stringify(data||[],null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'albumrater-library.json'; a.click(); URL.revokeObjectURL(a.href);
  }

  async function importLibrary(file) {
    const session = await requireSession(); if (!session) return alert('Inicia sesión');
    const txt = await file.text(); let arr=[]; try{arr=JSON.parse(txt)}catch{return alert('JSON inválido')}
    if (!Array.isArray(arr)) return alert('JSON inválido');
    for (const rec of arr) {
      const payload = {
        user_id: session.user.id,
        album: rec.album || rec.title || '—',
        artist: rec.artist || '',
        released: rec.released || rec.year || '',
        rankedby: rec.rankedby || '',
        cover_url: rec.cover_url || rec.cover || '',
        avg_score: rec.avg ?? rec.avg_score ?? null,
        tracks: rec.tracks || [],
        notes: rec.notes || { trackNotes:{}, final:'' }
      };
      await sb.from('albums').insert(payload);
    }
    alert('Importados ✅'); fetchMyAlbums();
  }

  // ---------- BIND ----------
  function bind() {
    // Auth
    const inBtn  = $('#btnSignIn');
    const outBtn = $('#btnSignOut');
    if (inBtn && !inBtn._b)  { inBtn._b  = true; inBtn.addEventListener('click', signInGoogle); }
    if (outBtn && !outBtn._b){ outBtn._b = true; outBtn.addEventListener('click', signOut); }

    // Library
    const bLib  = $('#btnLibrary');
    const bSave = $('#btnSaveToLibrary');
    const bExp  = $('#btnExportLibrary');
    const fImp  = $('#fileImportLibrary');
    if (bLib && !bLib._b){ bLib._b = true; bLib.addEventListener('click', () => {
      const showing = getComputedStyle($('#libPanel')).display !== 'none';
      showPanel('libPanel', !showing);
      showPanel('app', showing);
      if (!showing) fetchMyAlbums();
    });}
    if (bSave && !bSave._b){ bSave._b = true; bSave.addEventListener('click', saveCurrent); }
    if (bExp && !bExp._b){ bExp._b = true; bExp.addEventListener('click', exportLibrary); }
    if (fImp && !fImp._b){ fImp._b = true; fImp.addEventListener('change', e=>{
      const f = e.target.files?.[0]; if (f) importLibrary(f); e.target.value='';
    }); }

    // Idioma (tu UI ya escucha #lang en ui.v7.1.js)
    const langSel = $('#lang');
    if (langSel) {
      const saved = localStorage.getItem('albumrater_lang') || (navigator.language||'en').startsWith('es')?'es':'en';
      langSel.value = saved;
      langSel.onchange = () => { localStorage.setItem('albumrater_lang', langSel.value); window.AlbumApp?.setState?.({ ...window.AlbumApp?.getState?.(), lang: langSel.value }); };
    }
  }

  async function boot() {
    await handleOAuthReturn();
    const { data } = await sb.auth.getSession();
    paintAuthUI(data.session);
    sb.auth.onAuthStateChange((_evt, session) => paintAuthUI(session));
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
