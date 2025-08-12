/*! Album Autofill v5.3 — App Punteo Álbumes
 *  Fuentes: Genius (vía proxy/worker) + MusicBrainz (fallback) + Cover Art Archive.
 */
(() => {
  const UA = 'AlbumRankingApp/5.3 (contacto: you@example.com)';
  const DEFAULT_SELECTORS = {
    artist: '#artist',
    album: '#album',
    year: '#released',
    trackCount: '#trackcount',
    totalTime: null,
    coverImg: '#coverOut',
    coverUrlInput: null,
    tracksTable: null,
    btnBuscar: '#btnBuscarAlbum'
  };

  const COLORS = {10:'#2e47ee',9:'#0285c6',8:'#02aec6',7:'#23be32',6:'#f0ca15',5:'#e12928'};
  const NEUTRAL = '#2a3140';
  let LANG = (navigator.language||'en').startsWith('es') ? 'es' : 'en';

  function q(obj){ return new URLSearchParams(obj).toString(); }

  // ---- Helpers UI (render + state) ----
  const $ = (s)=>document.querySelector(s);
  const tracksEl = document.createElement('div'); // placeholder (reemplazado por el real en init)
  function durationToSeconds(d){ if(!d)return 0; const m=d.match(/^(\d{1,2}):(\d{2})$/); if(!m)return 0; return parseInt(m[1],10)*60+parseInt(m[2],10); }
  function secondsToMinutesText(s){ const m=Math.round(s/60); return m? m+' min':'—'; }
  function colorFor(score){ if(!Number.isFinite(score)) return NEUTRAL; const k=Math.max(5,Math.min(10,Math.floor(Number(score)||0))); return COLORS[k]; }

  function rankPicker(initial){
    const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gridTemplateColumns='1fr 1fr'; wrap.style.gap='6px';
    const iSel=document.createElement('select');
    let o=document.createElement('option'); o.value=''; o.textContent='-'; iSel.appendChild(o);
    for(let i=5;i<=10;i++){ o=document.createElement('option'); o.value=i; o.textContent=i; iSel.appendChild(o); }
    const dSel=document.createElement('select'); dSel.disabled=true;
    function fillDec(max){ dSel.innerHTML=''; let o2=document.createElement('option'); o2.value='0'; o2.textContent='0.0'; dSel.appendChild(o2); if(max){ for(let t=1;t<=9;t++){ const val=(t/10).toFixed(1); o2=document.createElement('option'); o2.value=val; o2.textContent=val; dSel.appendChild(o2);} } }
    fillDec(false);
    function setFromNumber(v){ if(!Number.isFinite(v)){ iSel.value=''; dSel.disabled=true; dSel.value='0'; return; } const b=Math.floor(v); const dec=Math.round((v-b)*10)/10; iSel.value=String(b); dSel.disabled=false; fillDec(b<10); dSel.value=dec.toFixed(1); }
    function current(){ const ib=iSel.value; if(ib==='') return NaN; const dd=parseFloat(dSel.value||'0'); return parseFloat(ib)+dd; }
    function trigger(){ wrap.dispatchEvent(new CustomEvent('change-score',{detail:current()})); }
    iSel.addEventListener('change', ()=>{ if(iSel.value===''){ dSel.disabled=true; dSel.value='0'; } else { dSel.disabled=false; fillDec(Number(iSel.value)<10); } trigger(); });
    dSel.addEventListener('change', trigger);
    setFromNumber(initial);
    wrap.append(iSel,dSel);
    return {el:wrap,get:current,set:setFromNumber};
  }

  function makeRow(i,data={},tracksElRef){
    const row=document.createElement('div'); row.className='row';
    const n=document.createElement('input'); n.type='number'; n.min=1; n.value=(data.n ?? (i+1));
    const dur=document.createElement('input'); dur.placeholder='mm:ss'; dur.value=data.dur||'';
    const name=document.createElement('input'); name.placeholder=(LANG==='es'?'Nombre de la canción':'Track name'); name.value=data.name||'';
    const initScore = (typeof data.score==='number' && Number.isFinite(data.score)) ? data.score : NaN;
    const picker=rankPicker(initScore); const pill=document.createElement('div'); pill.className='pill'; pill.textContent='-'; pill.style.background=NEUTRAL;
    row.append(n,dur,name,picker.el,pill);
    function paint(v){ if(!Number.isFinite(v)){ pill.style.background=NEUTRAL; pill.textContent='-'; return; } const c=colorFor(v); pill.style.background=c; pill.textContent=(v||0).toFixed(1).replace(/\.0$/,''); }
    picker.el.addEventListener('change-score', e=>{ paint(e.detail); render(tracksElRef); });
    [n,dur,name].forEach(el=> el.addEventListener('input', ()=>render(tracksElRef)));
    paint(picker.get());
    row.value=()=>({n:Number(n.value||0), dur:dur.value.trim(), name:name.value.trim(), score:picker.get()});
    return row;
  }

  function ensureRows(n,tracksElRef){ const cur=tracksElRef.children.length; if(cur<n){for(let i=cur;i<n;i++) tracksElRef.appendChild(makeRow(i,{},tracksElRef));} else if(cur>n){for(let i=cur-1;i>=n;i--) tracksElRef.removeChild(tracksElRef.children[i]);} render(tracksElRef); }

  function render(tracksElRef){
    const t={en:{duration:'Duration',num:'#',name:'Name',total:'Duration'},es:{duration:'Duración',num:'#',name:'Nombre',total:'Duración total'}}[LANG];
    const info=document.getElementById('info'); info.innerHTML='';
    const pair=(L,V)=>{const l=document.createElement('div'); l.className='label'; l.textContent=L; const v=document.createElement('div'); v.innerHTML=V; info.append(l,v);};
    const album=$('#album').value.trim(), artist=$('#artist').value.trim(), released=$('#released').value.trim(), rankedby=$('#rankedby').value.trim();
    pair((LANG==='es'?'Álbum':'Album')+':','<strong><em>'+(album||'—')+'</em></strong>'); pair((LANG==='es'?'Artista':'Artist')+':','<strong>'+(artist||'—')+'</strong>'); pair((LANG==='es'?'Fecha de lanzamiento':'Release Date')+':',released||'—'); if(rankedby) pair((LANG==='es'?'Rankeado por':'Ranked by')+':', rankedby);
    const tracks=[...tracksElRef.children].map(r=>r.value()).filter(tr=>tr.name||tr.dur||Number.isFinite(tr.score)).sort((a,b)=>a.n-b.n);
    const table=document.getElementById('table'); table.innerHTML=''; const thead=document.createElement('thead'); thead.innerHTML='<tr><th style="width:80px">'+t.duration+'</th><th style="width:36px">'+t.num+'</th><th>'+t.name+'</th><th style="width:90px">Score</th></tr>'; table.appendChild(thead);
    const tbody=document.createElement('tbody'); table.appendChild(tbody);
    let totalSec=0, scores=[]; tracks.forEach(tr=>{ totalSec+=durationToSeconds(tr.dur); if(Number.isFinite(tr.score) && tr.score>=5&&tr.score<=10) scores.push(tr.score);
      const badge = Number.isFinite(tr.score) ? ('<span class="pill" style="background:'+colorFor(tr.score)+'">'+tr.score.toFixed(1).replace(/\.0$/,'')+'</span>') : ('<span class="pill" style="background:'+NEUTRAL+'">-</span>');
      const el=document.createElement('tr'); el.innerHTML='<td>'+(tr.dur||'—')+'</td><td>'+(tr.n||'')+'</td><td>'+(tr.name||'—')+'</td><td>'+badge+'</td>'; tbody.appendChild(el); });
    const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):NaN; document.getElementById('finalScore').textContent=Number.isFinite(avg)?avg.toFixed(1):'—';
    pair(t.total, secondsToMinutesText(totalSec));
    const series = tracks.map(tr=>tr.score).filter(v=>Number.isFinite(v));
    drawChart('chart', series); save(tracksElRef);
  }

  function drawChart(id,values){
    const canvas=document.getElementById(id), ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
    const P={l:60,r:20,t:20,b:36}, W=canvas.width-P.l-P.r, H=canvas.height-P.t-P.b;
    ctx.strokeStyle='#2a3140'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(P.l,P.t); ctx.lineTo(P.l,P.t+H); ctx.lineTo(P.l+W,P.t+H); ctx.stroke();
    ctx.fillStyle='#aeb5c0'; ctx.font='12px system-ui';
    for(let y=5;y<=10;y++){ const yy=P.t+H-((y-5)/5)*H; ctx.strokeStyle='#1a2130'; ctx.beginPath(); ctx.moveTo(P.l,yy); ctx.lineTo(P.l+W,yy); ctx.stroke(); ctx.fillText(String(y),18,yy+4); }
    if(!values.length) return; const n=values.length, x=i=>P.l+(i/(Math.max(1,n-1)))*W, y=v=>P.t+H-((v-5)/5)*H;
    ctx.strokeStyle='rgba(122,162,255,0.95)'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x(0),y(values[0])); for(let i=1;i<n;i++) ctx.lineTo(x(i), y(values[i])); ctx.stroke();
    ctx.fillStyle='#cfd9ff'; for(let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(x(i), y(values[i]), 5, 0, 2*Math.PI); ctx.fill(); }
    ctx.fillStyle='#aeb5c0'; for(let i=0;i<n;i++){ ctx.fillText(String(i+1), x(i)-3, P.t+H+16); }
  }

  // --- State (save/load) ---
  const KEY='albumrater_v5_3_state';
  function getState(tracksElRef){ const tracks=[...tracksElRef.children].map(r=>r.value()).filter(t=>t.name||t.dur||Number.isFinite(t.score)); return {lang:LANG, album:$('#album').value.trim(), artist:$('#artist').value.trim(), released:$('#released').value.trim(), rankedby:$('#rankedby').value.trim(), cover:$('#coverOut').src||'', tracks}; }
  function setState(s,tracksElRef){
    LANG=s.lang||LANG; $('#album').value=s.album||''; $('#artist').value=s.artist||''; $('#released').value=s.released||''; $('#rankedby').value=s.rankedby||'';
    if(s.cover) $('#coverOut').src=s.cover;
    tracksElRef.innerHTML=''; (s.tracks||[]).forEach((t,i)=> tracksElRef.appendChild(makeRow(i,{n:t.n,dur:t.dur,name:t.name,score:(typeof t.score==='number'?t.score:NaN)},tracksElRef)));
    if(!(s.tracks||[]).length) ensureRows(7,tracksElRef);
    render(tracksElRef);
  }
  function save(tracksElRef){ localStorage.setItem(KEY, JSON.stringify(getState(tracksElRef))); }
  function load(tracksElRef){ try{ const raw=localStorage.getItem(KEY); if(raw){ setState(JSON.parse(raw),tracksElRef); return; } }catch(e){} setState({lang:LANG, album:'', artist:'', released:'', rankedby:'', cover:'', tracks:[ {n:1,dur:'',name:'',score:NaN},{n:2,dur:'',name:'',score:NaN},{n:3,dur:'',name:'',score:NaN},{n:4,dur:'',name:'',score:NaN},{n:5,dur:'',name:'',score:NaN},{n:6,dur:'',name:'',score:NaN},{n:7,dur:'',name:'',score:NaN} ]},tracksElRef); }

  // --- GENIUS via Worker ---
  async function fetchGeniusTracks(artist, album){
    const base = (window.GENIUS_PROXY_URL||'').trim();
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
      totalTime: '',
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
      .map(r => ({ id: r.id, title: r.title || '', score: r.score || 0, country: r.country || '', date: r.date || '', status: r.status || '', disambiguation: r.disambiguation || '', releaseGroup: r['release-group']?.['primary-type'] || '', trackCount: r['track-count'] || '', artistCredit: (r['artist-credit'] || []).map(a => a.name).join(', ') }))
      .sort((a,b) => (b.score - a.score));
    return releases;
  }

  async function fetchReleaseWithTracks(releaseId) {
    const url = `https://musicbrainz.org/ws/2/release/${releaseId}?fmt=json&inc=recordings+media`;
    const res = await safeFetch(url);
    if (!res.ok) throw new Error('Fallo al obtener tracks del release');
    const data = await res.json();
    const tracks = [];
    (data.media || []).forEach(med => { (med.tracks || []).forEach(t => { tracks.push({ disc: med.position, position: t.position, title: t.title, durationMs: t.length ?? null }); }); });
    const totalMs = tracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
    return { title: data.title || '', artist: (data['artist-credit'] || []).map(a => a.name).join(', '), year: (data.date || '').slice(0,4), country: data.country || '', trackCount: tracks.length, tracks, totalTime: mmss(totalMs), id: data.id };
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

  function mergeDurations(geniusList, mbRelease){
    if(!mbRelease || !mbRelease.tracks || !mbRelease.tracks.length) return geniusList;
    const byOrder = mbRelease.tracks.map(t=> ({ title:t.title, duration: mmss(t.durationMs||0) }));
    if(byOrder.length === geniusList.length){
      return geniusList.map((g,i)=> ({ title:g.title, duration: g.duration || byOrder[i].duration }));
    }
    return geniusList;
  }

  async function autoEnrichDurations(artist, album, geniusPayload){
    try{
      const cands = await searchReleases(artist, album);
      if(!cands.length) return geniusPayload;
      // intenta el primero que tenga trackCount igual
      let best = cands.find(c => Number(c.trackCount) === geniusPayload.tracks.length) || cands[0];
      const rel = await fetchReleaseWithTracks(best.id);
      const coverUrl = await fetchCover(best.id);
      const mergedTracks = mergeDurations(geniusPayload.tracks, rel);
      return { ...geniusPayload, tracks: mergedTracks, year: geniusPayload.year || rel.year, coverUrl: geniusPayload.coverUrl || coverUrl, totalTime: rel.totalTime || geniusPayload.totalTime };
    }catch(e){ console.warn('No se pudo enriquecer con MB', e); return geniusPayload; }
  }

  async function runAutofill(sel, tracksElRef) {
    const artist = document.querySelector(sel.artist)?.value?.trim() || '';
    const album  = document.querySelector(sel.album)?.value?.trim() || '';
    if (!artist || !album) { alert('Escribe artista y álbum primero.'); return; }

    // 1) Genius
    try{
      const g = await fetchGeniusTracks(artist, album);
      if (g && g.tracks && g.tracks.length){
        const enriched = await autoEnrichDurations(artist, album, g);
        fillDOM(sel, enriched);
        window.dispatchEvent(new CustomEvent('album-autofilled', { detail: enriched }));
        return;
      }
    }catch(e){ console.warn('Genius falló o proxy no configurado:', e); }

    // 2) Fallback MB con modal
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

  // --- Modal (MB selector) ---
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

  // ---- Page wiring ----
  document.addEventListener('DOMContentLoaded', () => {
    const tracksRef = document.getElementById('tracks');
    // Botones básicos
    document.getElementById('addRow').onclick=()=> ensureRows(tracksRef.children.length+1,tracksRef);
    document.getElementById('delRow').onclick=()=> ensureRows(Math.max(1, tracksRef.children.length-1),tracksRef);
    document.getElementById('applyCount').onclick=()=> ensureRows(parseInt(document.getElementById('trackcount').value||'1',10),tracksRef);
    document.getElementById('cover').addEventListener('change',ev=>{const f=ev.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=e=>{document.getElementById('coverOut').src=e.target.result; save(tracksRef);}; r.readAsDataURL(f);});
    document.getElementById('btnBuscarAlbum').addEventListener('click', ()=> runAutofill(DEFAULT_SELECTORS, tracksRef));
    // Export/Import/Clear
    document.getElementById('exportJSON').onclick=()=>{ const blob=new Blob([JSON.stringify(getState(tracksRef),null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='albumrater-data.json'; a.click(); URL.revokeObjectURL(url); };
    document.getElementById('importJSON').addEventListener('change',ev=>{ const f=ev.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=e=>{ try{ const obj=JSON.parse(e.target.result); setState(obj,tracksRef); save(tracksRef); alert(LANG==='es'?'Datos importados.':'Data imported.'); }catch(err){ alert(LANG==='es'?'Archivo inválido.':'Invalid file.'); } }; r.readAsText(f); });
    document.getElementById('clearAll').onclick=()=>{ const msg=(LANG==='es'?'¿Seguro que deseas borrar todos los campos?':'Are you sure you want to clear all fields?'); if(!confirm(msg)) return; localStorage.removeItem(KEY); setState({lang:LANG, album:'', artist:'', released:'', rankedby:'', cover:'', tracks:[]},tracksRef); };
    // Inicial
    ensureRows(7,tracksRef); load(tracksRef);
  });

  // ---- Simple chart draw used in render ----
  // (drawChart está arriba)

})();