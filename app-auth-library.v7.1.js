// app-auth-library.v7.1.js
(() => {
  const $ = (s) => document.querySelector(s);
  const SITE_URL = window.SITE_URL || (location.origin + location.pathname + '?v=7.1');
  const sb = window.sb;

  // ===== Helpers =====
  function avgScore(tracks = []) {
    const vals = tracks.map(t => t.score).filter(v => Number.isFinite(v) && v >= 5 && v <= 10);
    return vals.length ? +(vals.reduce((a,b)=>a+b,0) / vals.length).toFixed(1) : null;
  }
  function nowISO() { return new Date().toISOString(); }

  async function ensureLogged() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      alert('Primero inicia sesión con Google.');
      return null;
    }
    return session.user;
  }

  // Sube cover si viene como dataURL. Devuelve URL pública o cadena vacía.
  async function uploadCoverIfNeeded(userId, src) {
    if (!src) return '';
    if (!/^data:/.test(src)) return src; // ya es URL

    const m = src.match(/^data:(.+?);base64,(.*)$/);
    if (!m) return '';
    const mime = m[1], b64 = m[2];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    const file = new Blob([bytes], { type: mime });

    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error } = await sb.storage.from('covers').upload(path, file, { upsert: false, contentType: mime });
    if (error) { console.warn('cover upload error', error); return ''; }
    const { data } = sb.storage.from('covers').getPublicUrl(path);
    return data?.publicUrl || '';
  }

  // ===== AUTH UI =====
  async function paintAuth() {
    const { data: { session } } = await sb.auth.getSession();
    const u = session?.user || null;

    const sIn  = $('#btnSignIn');
    const sOut = $('#btnSignOut');
    const stat = $('#authStatus');
    const lib  = $('#btnLibrary');
    const save = $('#btnSaveToLibrary');
    const exp  = $('#btnExportLibrary');
    const impL = $('label[for="fileImportLibrary"]');

    if (u) {
      sIn.style.display = 'none';
      sOut.style.display = 'inline-block';
      stat.style.display = 'inline-block';
      stat.textContent = u.email || 'Signed in';
      lib.disabled = false; save.disabled = false; exp.disabled = false; impL.classList.remove('disabled');
    } else {
      sIn.style.display = 'inline-block';
      sOut.style.display = 'none';
      stat.style.display = 'none';
      stat.textContent = '';
      lib.disabled = true; save.disabled = true; exp.disabled = true; // Import lo dejamos habilitado (no requiere login)
    }
  }

  // ===== LIBRARY =====
  async function loadLibrary() {
    const user = await ensureLogged(); if (!user) return;
    const tbody = $('#tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="padding:14px;color:#aeb5c0">Loading…</td></tr>';

    const { data, error } = await sb
      .from('albums')
      .select('id, album, artist, released, avg_score, tracks, cover_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="7" style="padding:14px;color:#f88">Could not load library.</td></tr>';
      return;
    }
    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:14px;color:#aeb5c0">No albums saved yet.</td></tr>';
      return;
    }

    const rows = data.map(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-cover"><img class="cover-sm" src="${r.cover_url || ''}" alt=""></td>
        <td>${r.album || '—'}</td>
        <td>${r.artist || '—'}</td>
        <td>${r.released || ''}</td>
        <td class="col-average">${(r.avg_score ?? '')}</td>
        <td class="col-tracks">${(Array.isArray(r.tracks)? r.tracks.length : (r.tracks_count ?? ''))}</td>
        <td class="col-open"><button class="btn btn-open" data-id="${r.id}">Open</button></td>
      `;
      return tr;
    });

    tbody.innerHTML = '';
    rows.forEach(tr => tbody.appendChild(tr));

    // abrir en el editor
    tbody.querySelectorAll('.btn-open').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const id = ev.currentTarget.getAttribute('data-id');
        const { data, error } = await sb.from('albums').select('*').eq('id', id).single();
        if (error || !data) { alert('Album not found'); return; }

        // Pasamos los datos al editor sin romper nada
        window.AlbumApp?.setState({
          lang: (localStorage.getItem('albumrater_lang') || 'en'),
          album: data.album || '',
          artist: data.artist || '',
          released: data.released || '',
          rankedby: data.rankedby || '',
          cover: data.cover_url || '',
          tracks: data.tracks || []
        });

        // ocultar panel
        $('#libPanel').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, { once: false });
    });
  }

  // ===== SAVE =====
  async function saveCurrentToLibrary() {
    const user = await ensureLogged(); if (!user) return;

    if (!window.AlbumApp?.getState) { alert('Editor no encontrado'); return; }
    const s = window.AlbumApp.getState();

    const coverSrc = $('#coverOut')?.src || '';
    const coverUrl = await uploadCoverIfNeeded(user.id, coverSrc);

    const payload = {
      user_id: user.id,
      album: s.album || '—',
      artist: s.artist || '—',
      released: s.released || '',
      rankedby: s.rankedby || '',
      cover_url: coverUrl || (coverSrc.startsWith('http') ? coverSrc : ''),
      avg_score: avgScore(s.tracks),
      tracks: s.tracks || [],
      created_at: nowISO()
    };

    const { error } = await sb.from('albums').insert(payload);
    if (error) { alert('Could not save: ' + error.message); return; }
    alert('Saved to your library ✅');
    if ($('#libPanel').style.display !== 'none') loadLibrary();
  }

  // ===== EXPORT / IMPORT =====
  async function exportLibrary() {
    const user = await ensureLogged(); if (!user) return;
    const { data, error } = await sb
      .from('albums')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { alert('Could not export: ' + error.message); return; }

    const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'albumrater-library.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function readFileAsText(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ''));
      r.onerror = rej;
      r.readAsText(file);
    });
  }

  async function importLibraryFromFile(file) {
    const user = await ensureLogged(); if (!user) return;
    try {
      const text = await readFileAsText(file);
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('JSON debe ser un arreglo');
      const rows = arr.map(x => ({
        user_id: user.id,
        album: x.album || '—',
        artist: x.artist || '—',
        released: x.released || '',
        rankedby: x.rankedby || '',
        cover_url: x.cover_url || '',
        avg_score: x.avg_score ?? null,
        tracks: Array.isArray(x.tracks) ? x.tracks : [],
        created_at: x.created_at || nowISO()
      }));
      // Inserción en lotes pequeños por seguridad
      while (rows.length) {
        const chunk = rows.splice(0, 200);
        const { error } = await sb.from('albums').insert(chunk);
        if (error) throw error;
      }
      alert('Import completed ✅');
      if ($('#libPanel').style.display !== 'none') loadLibrary();
    } catch (e) {
      console.error(e);
      alert('Import failed: ' + (e.message || e));
    }
  }

  // ===== BINDINGS =====
  function bindUI() {
    // Auth
    $('#btnSignIn')?.addEventListener('click', async () => {
      await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: SITE_URL, queryParams: { prompt: 'consent', access_type: 'offline' } }
      });
    });
    $('#btnSignOut')?.addEventListener('click', async () => {
      await sb.auth.signOut(); paintAuth();
    });

    // Library toggle
    $('#btnLibrary')?.addEventListener('click', async () => {
      const el = $('#libPanel');
      const showing = el.style.display !== 'none';
      if (showing) {
        el.style.display = 'none';
      } else {
        el.style.display = 'block';
        loadLibrary();
      }
    });

    // Save / Export / Import
    $('#btnSaveToLibrary')?.addEventListener('click', saveCurrentToLibrary);
    $('#btnExportLibrary')?.addEventListener('click', exportLibrary);
    $('#fileImportLibrary')?.addEventListener('change', (ev) => {
      const f = ev.target.files?.[0]; if (!f) return;
      importLibraryFromFile(f).finally(() => (ev.target.value = ''));
    });

    // Idioma (opcional – si tu UI ya lo maneja, esto no estorba)
    $('#lang')?.addEventListener('change', (e) => {
      const v = e.target.value;
      try {
        const st = (window.AlbumApp?.getState?.() || {});
        window.AlbumApp?.setState?.({ ...st, lang: v });
        localStorage.setItem('albumrater_lang', v);
      } catch {}
    });
  }

  // ===== INIT =====
  function boot() {
    bindUI();
    paintAuth(); // estado inicial
    sb.auth.onAuthStateChange((_evt) => paintAuth()); // reacciona a login regreso de Google
    // Oculta library al inicio
    const lib = $('#libPanel'); if (lib) lib.style.display = 'none';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
