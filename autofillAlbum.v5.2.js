/*! Album Autofill v5.2 — App Punteo Álbumes
 *  Fuentes: Genius (vía proxy/worker) + MusicBrainz (fallback) + Cover Art Archive.
 */
(() => {
  const UA = 'AlbumRankingApp/5.2 (contacto: you@example.com)';
  const DEFAULT_SELECTORS = {
    artist: '#campoArtista',
    album: '#campoAlbum',
    year: '#campoYear',
    trackCount: '#campoTrackCount',
    totalTime: '#campoTotalTime',
    coverImg: '#coverImg',
    coverUrlInput: '#coverUrl',
    tracksTable: '#tracksTable',
    btnBuscar: '#btnBuscarAlbum'
  };

  function q(obj){ return new URLSearchParams(obj).toString(); }

  // --- GENIUS via Worker ---
async function fetchGeniusTracks(artist, album){
    const base = 'https://empty-bread-de3e.opesqueraa.workers.dev';
    if(!base) return null;
    const url = `${base}/album?${q({artist, album})}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Genius proxy error');
    const data = await res.json();
    if(!data || !Array.isArray(data.tracks) || !data.tracks.length) return null;
    return {
      title: data.title || album,
      artist: data.artist || artist,
      year: data.year || '',
      trackCount: data.tracks.length,
      totalTime: '', // Genius no da duraciones
      coverUrl: data.coverUrl || null,
      tracks: data.tracks.map(t => ({ title: t.title, duration: t.duration || '' }))
    };
  }

  // --- MusicBrainz + Cover ---
  let lastFetchTs = 0;
  async function safeFetch(url, opts = {}) {
    const now = Date.now();
    const wait = Math.max(0, 1000 - (now - lastFetchTs));
    if (wait) await new Promise(r => setTimeout(r, wait));
    lastFetchTs = Date.now();
    const headers = Object.assign({'User-Agent': UA}, opts.headers || {});
    const res = await fetch(url, Object.assign({}, opts, { headers }));
    return res;
  }

  function mmss(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2,'0')}`;
  }

  async function searchReleases(artist, album) {
    const query = encodeURIComponent(`release:${album} AND artist:${artist}`);
    const url = `https://musicbrainz.org/ws/2/release/?query=${query}&fmt=json&limit=7`;
    const res = await safeFetch(url);
    if (!res.ok) throw new Error('Fallo al buscar en MusicBrainz');
    const data = await res.json();
    const releases = (data.releases || [])
      .map(r => ({
        id: r.id,
        title: r.title || '',
        score: r.score || 0,
        country: r.country || '',
        date: r.date || '',
        status: r.status || '',
        disambiguation: r.disambiguation || '',
        releaseGroup: r['release-group']?.['primary-type'] || '',
        trackCount: r['track-count'] || '',
        artistCredit: (r['artist-credit'] || []).map(a => a.name).join(', ')
      }))
      .sort((a,b) => (b.score - a.score));
    return releases;
  }

  async function fetchReleaseWithTracks(releaseId) {
    const url = `https://musicbrainz.org/ws/2/release/${releaseId}?fmt=json&inc=recordings+media`;
    const res = await safeFetch(url);
    if (!res.ok) throw new Error('Fallo al obtener tracks del release');
    const data = await res.json();

    const tracks = [];
    (data.media || []).forEach(med => {
      (med.tracks || []).forEach(t => {
        tracks.push({
          disc: med.position,
          position: t.position,
          title: t.title,
          durationMs: t.length ?? null
        });
      });
    });

    const totalMs = tracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    return {
      title: data.title || '',
      artist: (data['artist-credit'] || []).map(a => a.name).join(', '),
      year: (data.date || '').slice(0,4),
      country: data.country || '',
      trackCount: tracks.length,
      tracks,
      totalTime: mmss(totalMs),
      id: data.id
    };
  }

  async function fetchCover(releaseId) {
    const head = await safeFetch(`https://coverartarchive.org/release/${releaseId}/front`, { method: 'HEAD' });
    if (head.ok) return `https://coverartarchive.org/release/${releaseId}/front`;
    const meta = await safeFetch(`https://coverartarchive.org/release/${releaseId}`);
    if (!meta.ok) return null;
    const json = await meta.json().catch(() => null);
    const big = json?.images?.find(i => i.thumbnails?.large) || json?.images?.[0];
    return big?.image || big?.thumbnails?.large || null;
  }

  function ensureModal() {
    let modal = document.getElementById('albumAutofillModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'albumAutofillModal';
    modal.style.cssText = `position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
      background: rgba(0,0,0,.55); z-index: 9999; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;`;
    modal.innerHTML = `
      <div style="width: min(680px, 92vw); background: #111; color: #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,.6)">
        <div style="padding:16px 18px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #222;">
          <strong style="letter-spacing:.2px">Selecciona la edición del álbum</strong>
          <button id="aam_close" style="background:#222;border:none;color:#bbb;padding:6px 10px;border-radius:6px;cursor:pointer">Cerrar</button>
        </div>
        <div id="aam_list" style="max-height: 60vh; overflow:auto;"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#aam_close').addEventListener('click', () => (modal.style.display = 'none'));
    return modal;
  }

  function showCandidates(cands) {
    const modal = ensureModal();
    const list = modal.querySelector('#aam_list');
    list.innerHTML = '';
    if (!cands.length) {
      list.innerHTML = `<div style="padding:18px">No se encontraron ediciones. Intenta ajustar el nombre o edítalo manualmente.</div>`;
    } else {
      cands.forEach(c => {
        const row = document.createElement('div');
        row.style.cssText = 'padding:14px 18px;border-bottom:1px solid #222;display:flex;gap:10px;align-items:center;justify-content:space-between';
        row.innerHTML = `
          <div style="min-width:0">
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</div>
            <div style="opacity:.8;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${c.artistCredit || ''} · ${c.releaseGroup || ''} ${c.status ? '· '+c.status : ''} ${c.country ? '· '+c.country : ''} ${c.date ? '· '+c.date : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;white-space:nowrap;opacity:.9">
            ${c.trackCount ? `<span>${c.trackCount} tracks</span>` : ''}
            <button class="aam_pick" data-id="${c.id}" style="background:#3b82f6;border:none;color:#fff;padding:6px 10px;border-radius:6px;cursor:pointer">Usar</button>
          </div>`;
        list.appendChild(row);
      });
    }
    modal.style.display = 'flex';
    return modal;
  }

  function closeModal() {
    const modal = document.getElementById('albumAutofillModal');
    if (modal) modal.style.display = 'none';
  }

  function fillDOM(sel, payload) {
    const qs = (q) => q ? document.querySelector(q) : null;
    const albumEl = qs(sel.album); if (albumEl && payload.title) albumEl.value = payload.title;
    const artistEl = qs(sel.artist); if (artistEl && payload.artist) artistEl.value = payload.artist;
    const yearEl = qs(sel.year); if (yearEl && payload.year) yearEl.value = payload.year;
    const countEl = qs(sel.trackCount); if (countEl) countEl.value = String(payload.trackCount || '');
    const totalEl = qs(sel.totalTime); if (totalEl) totalEl.value = payload.totalTime || '';
    const coverImg = qs(sel.coverImg); const coverUrlInput = qs(sel.coverUrlInput);
    if (payload.coverUrl) { if (coverImg) coverImg.src = payload.coverUrl; if (coverUrlInput) coverUrlInput.value = payload.coverUrl; }
  }

  async function runAutofill(sel) {
    const artist = document.querySelector(sel.artist)?.value?.trim() || '';
    const album  = document.querySelector(sel.album)?.value?.trim() || '';
    if (!artist || !album) { alert('Escribe artista y álbum primero.'); return; }

    // 1) Intento Genius (si se configuró el proxy)
    try{
      const g = await fetchGeniusTracks(artist, album);
      if (g && g.tracks && g.tracks.length){
        fillDOM(sel, g);
        window.dispatchEvent(new CustomEvent('album-autofilled', { detail: g }));
        return; // listo
      }
    }catch(e){
      console.warn('Genius falló o no configurado:', e);
    }

    // 2) Fallback: MusicBrainz
    try {
      const candidates = await searchReleases(artist, album);
      const modal = showCandidates(candidates);
      modal.querySelectorAll('.aam_pick').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
          const id = ev.currentTarget.getAttribute('data-id');
          ev.currentTarget.disabled = true; ev.currentTarget.textContent = 'Cargando…';
          try {
            const base = await fetchReleaseWithTracks(id);
            const coverUrl = await fetchCover(id);
            const payload = {
              title: base.title, artist: base.artist, year: base.year,
              trackCount: base.trackCount, totalTime: base.totalTime,
              tracks: base.tracks.map(t => ({ title: t.title, duration: mmss(t.durationMs) })),
              coverUrl: coverUrl || null
            };
            fillDOM(sel, payload);
            window.dispatchEvent(new CustomEvent('album-autofilled', { detail: payload }));
            closeModal();
          } catch (e) {
            console.error(e);
            alert('No se pudo cargar la edición seleccionada. Intenta con otra.');
            ev.currentTarget.disabled = false; ev.currentTarget.textContent = 'Usar';
          }
        }, { once: true });
      });
    } catch (e) {
      console.error(e);
      alert('No se encontraron resultados. Ajusta el nombre o edítalo manualmente.');
    }
  }

  function injectButtonIfMissing(sel) {
    if (document.querySelector(sel.btnBuscar)) return;
    const albumInput = document.querySelector(sel.album);
    if (!albumInput) return;
    const btn = document.createElement('button');
    btn.id = sel.btnBuscar.replace('#',''); btn.type = 'button'; btn.textContent = 'Buscar info';
    btn.style.marginLeft = '8px'; btn.style.padding = '6px 10px'; btn.style.borderRadius = '6px';
    btn.style.border = 'none'; btn.style.cursor = 'pointer'; btn.style.background = '#3b82f6'; btn.style.color = '#fff';
    albumInput.insertAdjacentElement('afterend', btn);
  }

  const AlbumAutofill = {
    init(options = {}) {
      const selectors = Object.assign({}, DEFAULT_SELECTORS, options.selectors || {});
      injectButtonIfMissing(selectors);
      const btn = document.querySelector(selectors.btnBuscar);
      if (btn) btn.addEventListener('click', () => runAutofill(selectors));
      else console.warn('AlbumAutofill: no se encontró el botón de búsqueda.');
    }
  };

  window.AlbumAutofill = AlbumAutofill;
  if (window.AlbumAutofillAutoInit !== false) {
    document.addEventListener('DOMContentLoaded', () => AlbumAutofill.init());
  }
})();
