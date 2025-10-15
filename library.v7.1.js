<script>
/* library.v7.1.js – abre/guarda/exp-imp la librería en Supabase */

(function () {
  const $ = s => document.querySelector(s);
  const sb = window.sb;

  function avgScore(tracks = []) {
    const vals = tracks.map(t => t.score).filter(v => Number.isFinite(v) && v >= 5 && v <= 10);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
  }

  function requireSession() {
    return sb.auth.getSession().then(({ data }) => data.session || null);
  }

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
      tr.innerHTML = `
        <td class="col-cover">${a.cover_url ? `<img class="cover-sm" src="${a.cover_url}">` : ''}</td>
        <td>${a.album || '—'}</td>
        <td>${a.artist || '—'}</td>
        <td>${a.released || ''}</td>
        <td class="col-average">${a.avg?.toFixed?.(1) ?? a.avg_score?.toFixed?.(1) ?? '—'}</td>
        <td class="col-tracks">${Array.isArray(a.tracks) ? a.tracks.length : '—'}</td>
        <td class="col-open"><button class="openBtn" data-id="${a.id}">Open</button></td>
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
        window.UI_Notes_set?.(data.notes || { trackNotes: {}, final: '' });
        // sube al editor y oculta panel
        document.getElementById('libPanel').style.display = 'none';
        document.getElementById('app').style.display = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  async function fetchMyAlbums() {
    const session = await requireSession();
    if (!session) { alert('Inicia sesión para usar la Library.'); return; }
    const { data, error } = await sb.from('albums')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { alert('Error al cargar: ' + error.message); return; }
    renderRows(data || []);
  }

  async function saveCurrent() {
    const session = await requireSession();
    if (!session) { alert('Inicia sesión para guardar en la Library.'); return; }
    const uid = session.user.id;

    const s = window.AlbumApp?.getState?.() || {};
    const notes = window.UI_Notes_get?.() || { trackNotes: {}, final: '' };
    const avg = avgScore(s.tracks || []);

    const payload = {
      user_id: uid,
      album: s.album || '—',
      artist: s.artist || '—',
      released: s.released || '',
      rankedby: s.rankedby || '',
      cover_url: s.cover || '',
      avg_score: avg,
      tracks: (s.tracks || []).map(t => ({
        n: t.n || null,
        dur: t.dur || '',
        name: t.name || '',
        score: Number.isFinite(t.score) ? t.score : null
      })),
      notes
    };

    const { error } = await sb.from('albums').insert(payload);
    if (error) { alert('No se pudo guardar: ' + error.message); return; }
    alert('Guardado en tu Library ✅');
    fetchMyAlbums();
  }

  // Export/Import de la LIBRERÍA (tabla albums)
  async function exportLibrary() {
    const session = await requireSession();
    if (!session) { alert('Inicia sesión'); return; }
    const { data, error } = await sb.from('albums').select('*').order('created_at', { ascending: false });
    if (error) { alert('Error al exportar: ' + error.message); return; }
    const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'albumrater-library.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importLibrary(file) {
    const session = await requireSession();
    if (!session) { alert('Inicia sesión'); return; }
    const text = await file.text();
    let arr = [];
    try { arr = JSON.parse(text); } catch { alert('JSON inválido'); return; }
    if (!Array.isArray(arr)) { alert('JSON inválido'); return; }
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
        notes: rec.notes || { trackNotes: {}, final: '' }
      };
      await sb.from('albums').insert(payload);
    }
    alert('Importados ✅');
    fetchMyAlbums();
  }

  // Panel show/hide
  function toggleLibraryPanel(show) {
    const panel = document.getElementById('libPanel');
    const app   = document.getElementById('app');
    if (show === true || (show !== false && panel.style.display === 'none')) {
      panel.style.display = '';
      app.style.display = 'none';
      fetchMyAlbums();
    } else {
      panel.style.display = 'none';
      app.style.display = '';
    }
  }

  function bind() {
    const btnLib = $('#btnLibrary');
    const btnSave = $('#btnSaveToLibrary');
    const btnExp = $('#btnExportLibrary');
    const fileImp = $('#fileImportLibrary');

    if (btnLib && !btnLib._b)  { btnLib._b = true;  btnLib.addEventListener('click', () => toggleLibraryPanel()); }
    if (btnSave && !btnSave._b){ btnSave._b = true; btnSave.addEventListener('click', saveCurrent); }
    if (btnExp && !btnExp._b)  { btnExp._b = true;  btnExp.addEventListener('click', exportLibrary); }
    if (fileImp && !fileImp._b){ fileImp._b = true; fileImp.addEventListener('change', e => {
      const f = e.target.files?.[0]; if (f) importLibrary(f);
      e.target.value = '';
    }); }
  }

  window.Library = { refresh: fetchMyAlbums, open: () => toggleLibraryPanel(true) };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
</script>
