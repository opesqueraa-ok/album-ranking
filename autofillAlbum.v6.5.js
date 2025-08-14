/*! Album Autofill v6.5 — MB + iTunes, iOS-safe */
(() => {
  const COLORS = {10:'#2e47ee',9:'#0285c6',8:'#02aec6',7:'#23be32',6:'#f0ca15',5:'#e12928'};
  const NEUTRAL = '#2a3140';
  let LANG = (localStorage.getItem('albumrater_lang') || (navigator.language||'en')).startsWith('es') ? 'es' : 'en';
  const $ = s => document.querySelector(s);
  const tracksEl = () => document.getElementById('tracks');

  // --- Toggle Top10: guarda/restaura orden original ---
  const SORT_STATE = { active: false, snapshot: null };
  function setSortButton(active){
    const btn = document.getElementById('sortTop10');
    if (!btn) return;
    btn.textContent = active ? 'Restore album order' : 'Sort Top 10';
  }

  function durationToSeconds(d){ if(!d)return 0; const m=d.match(/^(\d{1,2}):(\d{2})$/); if(!m)return 0; return parseInt(m[1],10)*60+parseInt(m[2],10); }
  function secondsToMinutesText(s){ const m=Math.round(s/60); return m? m+' min':'—'; }
  function colorFor(score){ if(!Number.isFinite(score)) return NEUTRAL; const k=Math.max(5,Math.min(10,Math.floor(Number(score)||0))); return COLORS[k]; }

  // Picker con estado "—" (NaN)
  function rankPicker(initial){
    const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gridTemplateColumns='1fr 1fr'; wrap.style.gap='6px';
    const iSel=document.createElement('select');
    let o=document.createElement('option'); o.value=''; o.textContent='-'; iSel.appendChild(o);
    for(let i=5;i<=10;i++){ o=document.createElement('option'); o.value=i; o.textContent=i; iSel.appendChild(o); }
    const dSel=document.createElement('select'); dSel.disabled=true;

    function fillDec(max){
      dSel.innerHTML='';
      let o2=document.createElement('option'); o2.value='0'; o2.textContent='0.0'; dSel.appendChild(o2);
      if(max){ for(let t=1;t<=9;t++){ const val=(t/10).toFixed(1); o2=document.createElement('option'); o2.value=val; o2.textContent=val; dSel.appendChild(o2);} }
    }
    fillDec(false);

    function setFromNumber(v){
      if(!Number.isFinite(v)){ iSel.value=''; dSel.disabled=true; dSel.value='0'; return; }
      const b=Math.floor(v); const dec=Math.round((v-b)*10)/10;
      iSel.value=String(b); dSel.disabled=false; fillDec(b<10); dSel.value=dec.toFixed(1);
    }
    function current(){ const ib=iSel.value; if(ib==='') return NaN; const dd=parseFloat(dSel.value||'0'); return parseFloat(ib)+dd; }
    function trigger(){ wrap.dispatchEvent(new CustomEvent('change-score',{detail:current()})); }

    iSel.addEventListener('change', ()=>{
      if(iSel.value===''){ dSel.disabled=true; dSel.value='0'; }
      else { dSel.disabled=false; fillDec(Number(iSel.value)<10); }
      trigger();
    });
    dSel.addEventListener('change', trigger);

    setFromNumber(initial);
    wrap.append(iSel,dSel);
    return {el:wrap,get:current,set:setFromNumber};
  }

  function makeRow(i,data={}){
    const row=document.createElement('div'); row.className='row';
    const n=document.createElement('input'); n.type='number'; n.min=1; n.value=(data.n ?? (i+1));
    const dur=document.createElement('input'); dur.placeholder='mm:ss'; dur.value=data.dur||'';
    const name=document.createElement('input'); name.placeholder=(LANG==='es'?'Nombre de la canción':'Track name'); name.value=data.name||'';
    const initScore = (typeof data.score==='number' && Number.isFinite(data.score)) ? data.score : NaN;
    const picker=rankPicker(initScore); const pill=document.createElement('div'); pill.className='pill'; pill.textContent='-'; pill.style.background=NEUTRAL;
    row.append(n,dur,name,picker.el,pill);

    function paint(v){
      if(!Number.isFinite(v)){ pill.style.background=NEUTRAL; pill.textContent='-'; return; }
      const c=colorFor(v); pill.style.background=c; pill.textContent=v.toFixed(1).replace(/\.0$/,'');
    }
    picker.el.addEventListener('change-score', e=>{ paint(e.detail); render(); });
    [n,dur,name].forEach(el=> el.addEventListener('input', render));
    paint(picker.get());

    row.value=()=>({n:Number(n.value||0), dur:dur.value.trim(), name:name.value.trim(), score:picker.get()});
    return row;
  }

  function ensureRows(n){
    const el = tracksEl(); const cur=el.children.length;
    if(cur<n){for(let i=cur;i<n;i++) el.appendChild(makeRow(i));}
    else if(cur>n){for(let i=cur-1;i>=n;i--) el.removeChild(el.children[i]);}
    render();
  }

  // Estado
  const KEY='albumrater_v6_state';
  function getState(){
    const el = tracksEl();
    const tracks=[...el.children].map(r=>r.value()).filter(t=>t.name||t.dur||Number.isFinite(t.score));
    return {lang:LANG, album:$('#album').value.trim(), artist:$('#artist').value.trim(), released:$(
      '#released').value.trim(), rankedby:$('#rankedby').value.trim(), cover:$('#coverOut').src||'', tracks};
  }
  function setState(s){
    LANG=s.lang||LANG; const langSel=$('#lang'); if(langSel) langSel.value = LANG;
    $('#album').value=s.album||''; $('#artist').value=s.artist||''; $('#released').value=s.released||''; $('#rankedby').value=s.rankedby||'';
    if(s.cover) $('#coverOut').src=s.cover;
    const el = tracksEl(); el.innerHTML='';
    (s.tracks||[]).forEach((t,i)=> el.appendChild(makeRow(i,{n:t.n,dur:t.dur,name:t.name,score:(typeof t.score==='number'?t.score:NaN)})));
    if(!(s.tracks||[]).length) ensureRows(7);

    // reset toggle
    SORT_STATE.active = false;
    SORT_STATE.snapshot = null;
    setSortButton(false);

    render();
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(getState())); }catch(e){} }
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw){ setState(JSON.parse(raw)); return; }
    }catch(e){}
    ensureRows(7); render();
  }

  // Render + chart
  function render(){
    const info=document.getElementById('info'); if(!info) return; info.innerHTML='';
    const pair=(L,V)=>{const l=document.createElement('div'); l.className='label'; l.textContent=L; const v=document.createElement('div'); v.innerHTML=V; info.append(l,v);};
    const album=$('#album').value.trim(), artist=$('#artist').value.trim(), released=$('#released').value.trim(), rankedby=$('#rankedby').value.trim();
    pair((LANG==='es'?'Álbum':'Album')+':','<strong><em>'+(album||'—')+'</em></strong>');
    pair((LANG==='es'?'Artista':'Artist')+':','<strong>'+(artist||'—')+'</strong>');
    pair((LANG==='es'?'Fecha de lanzamiento':'Release Date')+':',released||'—');
    if(rankedby) pair((LANG==='es'?'Rankeado por':'Ranked by')+':', rankedby);

    const el = tracksEl();
    const tracks=[...el.children].map(r=>r.value())
      .filter(tr=>tr.name||tr.dur||Number.isFinite(tr.score))
      .sort((a,b)=>a.n-b.n);

    const table=document.getElementById('table'); table.innerHTML='';
    const thead=document.createElement('thead');
    thead.innerHTML='<tr><th style="width:80px">'+(LANG==='es'?'Duración':'Duration')+'</th><th style="width:36px">#</th><th>'+(LANG==='es'?'Nombre':'Name')+'</th><th style="width:90px">Score</th></tr>';
    table.appendChild(thead);
    const tbody=document.createElement('tbody'); table.appendChild(tbody);

    let totalSec=0, scores=[];
    tracks.forEach(tr=>{
      totalSec+=durationToSeconds(tr.dur);
      if(Number.isFinite(tr.score) && tr.score>=5&&tr.score<=10) scores.push(tr.score);
      const badge = Number.isFinite(tr.score)
        ? ('<span class="pill" style="background:'+colorFor(tr.score)+'">'+tr.score.toFixed(1).replace(/\.0$/,'')+'</span>')
        : ('<span class="pill" style="background:'+NEUTRAL+'">-</span>');
      const el=document.createElement('tr');
      el.innerHTML='<td>'+(tr.dur||'—')+'</td><td>'+(tr.n||'')+'</td><td>'+(tr.name||'—')+'</td><td>'+badge+'</td>';
      tbody.appendChild(el);
    });

    const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):NaN;
    document.getElementById('finalScore').textContent=Number.isFinite(avg)?avg.toFixed(1):'—';
    pair((LANG==='es'?'Duración total':'Duration'), secondsToMinutesText(totalSec));

    const series = tracks.map(tr=>tr.score).filter(v=>Number.isFinite(v));
    drawChart('chart', series);
    save();
  }

  function drawChart(id,values){
    const canvas=document.getElementById(id); if(!canvas) return;
    const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
    const P={l:60,r:20,t:20,b:36}, W=canvas.width-P.l-P.r, H=canvas.height-P.t-P.b;
    ctx.strokeStyle='#2a3140'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(P.l,P.t); ctx.lineTo(P.l,P.t+H); ctx.lineTo(P.l+W,P.t+H); ctx.stroke();
    ctx.fillStyle='#aeb5c0'; ctx.font='12px system-ui';
    for(let y=5;y<=10;y++){ const yy=P.t+H-((y-5)/5)*H; ctx.strokeStyle='#1a2130'; ctx.beginPath(); ctx.moveTo(P.l,yy); ctx.lineTo(P.l+W,yy); ctx.stroke(); ctx.fillText(String(y),18,yy+4); }
    if(!values.length) return;
    const n=values.length, x=i=>P.l+(i/(Math.max(1,n-1)))*W, y=v=>P.t+H-((v-5)/5)*H;
    ctx.strokeStyle='rgba(122,162,255,0.95)'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x(0),y(values[0])); for(let i=1;i<n;i++) ctx.lineTo(x(i), y(values[i])); ctx.stroke();
    ctx.fillStyle='#cfd9ff'; for(let i=0;i<n;i++){ ctx.beginPath(); ctx.arc(x(i), y(values[i]), 5, 0, 2*Math.PI); ctx.fill(); }
    ctx.fillStyle='#aeb5c0'; for(let i=0;i<n;i++){ ctx.fillText(String(i+1), x(i)-3, P.t+H+16); }
  }

  // --- MusicBrainz + iTunes fallback ---
  let lastFetchTs = 0;
  async function safeFetch(url, opts = {}) {
    const now=Date.now(); const wait=Math.max(0,1000-(now-lastFetchTs));
    if(wait) await new Promise(r=>setTimeout(r,wait));
    lastFetchTs=Date.now(); return fetch(url, opts);
  }
  function mmss(ms){
    if (!Number.isFinite(ms) || ms <= 0) return '';
    const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const r = s % 60;
    return `${m}:${String(r).padStart(2,'0')}`;
  }

  async function searchReleasesMB(artist, album) {
    const queryStr = encodeURIComponent(`release:${album} AND artist:${artist}`);
    const url = `https://musicbrainz.org/ws/2/release/?query=${queryStr}&fmt=json&limit=7`;
    const res = await safeFetch(url);
    if (!res.ok) throw new Error('MB search failed');
    const data = await res.json();
    return (data.releases || []).map(r => ({
      id:r.id, title:r.title||'', score:r.score||0, country:r.country||'', date:r.date||'',
      trackCount:r['track-count']||'', artistCredit:(r['artist-credit']||[]).map(a=>a.name).join(', ')
    })).sort((a,b)=>b.score-a.score);
  }

  async function fetchReleaseMB(id){
    const url = `https://musicbrainz.org/ws/2/release/${id}?fmt=json&inc=recordings+media`;
    const res = await safeFetch(url); if(!res.ok) throw new Error('MB release failed');
    const data = await res.json();
    const tracks=[]; (data.media||[]).forEach(m=> (m.tracks||[]).forEach(t=> tracks.push({title:t.title, duration: t.length? mmss(t.length): ''})));
    const totalMs = (data.media||[]).reduce((acc,m)=> acc + (m.tracks||[]).reduce((a,t)=> a+(t.length||0),0), 0);
    return {
      title:data.title||'', artist:(data['artist-credit']||[]).map(a=>a.name).join(', '),
      year:(data.date||'').slice(0,4), trackCount:tracks.length, tracks, totalTime: totalMs? mmss(totalMs): '' , id:data.id
    };
  }

  async function fetchCoverMB(releaseId){
    const meta = await safeFetch(`https://coverartarchive.org/release/${releaseId}`);
    if (!meta.ok) return null; const json = await meta.json().catch(()=>null);
    const big = json?.images?.find(i => i.thumbnails?.large) || json?.images?.[0];
    return big?.image || big?.thumbnails?.large || null;
  }

  // Modal selección
  function ensureModal() {
    let modal = document.getElementById('albumAutofillModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'albumAutofillModal';
    modal.style.cssText = `position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,.55); z-index: 9999; font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial;`;
    modal.innerHTML = `<div style="width:min(680px,92vw);background:#111;color:#eee;border-radius:10px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.6)">
      <div style="padding:16px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;">
        <strong>Selecciona la edición del álbum</strong>
        <button id="aam_close" style="background:#222;border:none;color:#bbb;padding:6px 10px;border-radius:6px;cursor:pointer">Cerrar</button>
      </div>
      <div id="aam_list" style="max-height:60vh;overflow:auto"></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#aam_close').addEventListener('click', () => (modal.style.display = 'none'));
    return modal;
  }

  function showCandidates(cands){
    const modal = ensureModal(); const list = modal.querySelector('#aam_list'); list.innerHTML='';
    if(!cands.length){ list.innerHTML = `<div style="padding:18px">No se encontraron ediciones.</div>`; }
    else{
      cands.forEach(c=>{
        const row = document.createElement('div'); row.style.cssText='padding:14px 18px;border-bottom:1px solid #222;display:flex;gap:10px;align-items:center;justify-content:space-between';
        row.innerHTML = `<div style="min-width:0"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</div>
        <div style="opacity:.8;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.artistCredit||''} ${c.date?('· '+c.date):''} ${c.country?('· '+c.country):''}</div></div>
        <div style="display:flex;gap:8px;align-items:center;white-space:nowrap;opacity:.9">${c.trackCount?`<span>${c.trackCount} tracks</span>`:''}
        <button class="aam_pick" data-id="${c.id}" style="background:#3b82f6;border:none;color:#fff;padding:6px 10px;border-radius:6px;cursor:pointer">Usar</button></div>`;
        list.appendChild(row);
      });
    }
    modal.style.display='flex'; return modal;
  }
  function closeModal(){ const modal=document.getElementById('albumAutofillModal'); if(modal) modal.style.display='none'; }

  // Autofill (MB -> iTunes fallback)
  async function runAutofill(){
    const artist = $('#artist').value.trim();
    const album  = $('#album').value.trim();
    if(!artist || !album){ alert((LANG==='es'?'Escribe artista y álbum primero.':'Type artist and album first.')); return; }
    try{
      const cands = await searchReleasesMB(artist, album);
      if(cands.length){
        const modal = showCandidates(cands);
        modal.querySelectorAll('.aam_pick').forEach(btn => {
          btn.addEventListener('click', async (ev) => {
            const id = ev.currentTarget.getAttribute('data-id');
            ev.currentTarget.disabled = true; ev.currentTarget.textContent = 'Cargando…';
            try {
              const base = await fetchReleaseMB(id);
              const coverUrl = await fetchCoverMB(id);
              const payload = { title: base.title, artist: base.artist, year: base.year, trackCount: base.trackCount, totalTime: base.totalTime, coverUrl, tracks: base.tracks };
              fillDOM(payload);
              window.dispatchEvent(new CustomEvent('album-autofilled', { detail: payload }));
              closeModal();
            } catch (e) {
              console.error(e);
              alert('No se pudo cargar la edición seleccionada.');
              ev.currentTarget.disabled = false; ev.currentTarget.textContent = 'Usar';
            }
          }, { once: true });
        });
        return;
      }
    }catch(e){ console.warn('MB error', e); }
    try{
      const term = `${artist} ${album}`;
      const searchUrl = `https://itunes.apple.com/search?${new URLSearchParams({term,entity:'album',limit:'5'}).toString()}`;
      const res = await fetch(searchUrl); if(!res.ok) throw new Error('itunes search');
      const json = await res.json(); if(!json.resultCount) throw new Error('no results');
      const low = s => (s||'').toLowerCase();
      const best = json.results.find(r => low(r.collectionName).includes(low(album)) && low(r.artistName).includes(low(artist))) || json.results[0];
      const lookupUrl = `https://itunes.apple.com/lookup?${new URLSearchParams({id:String(best.collectionId),entity:'song'}).toString()}`;
      const res2 = await fetch(lookupUrl); if(!res2.ok) throw new Error('itunes lookup');
      const json2 = await res2.json(); if(!json2.results || json2.results.length<=1) throw new Error('no tracks');
      const albumInfo = json2.results[0];
      const tracks = json2.results.slice(1).filter(x=>x.wrapperType==='track').map(t => {
        const secs = Math.floor((t.trackTimeMillis||0)/1000); const mm = Math.floor(secs/60); const ss = String(secs%60).padStart(2,'0');
        return { title: t.trackName, duration: secs? `${mm}:${ss}`: '' };
      });
      const cover = albumInfo.artworkUrl100 ? albumInfo.artworkUrl100.replace('100x100bb', '1000x1000bb') : '';
      const year = (albumInfo.releaseDate||'').slice(0,4);
      const payload = { title: albumInfo.collectionName, artist: albumInfo.artistName, year, trackCount: tracks.length, coverUrl: cover, totalTime: '', tracks };
      fillDOM(payload);
      window.dispatchEvent(new CustomEvent('album-autofilled', { detail: payload }));
      return;
    }catch(e){ console.warn('iTunes error', e); }
    alert('No encontré info automática. Puedes llenar manualmente.');
  }

  function fillDOM(payload){
    if(payload.title) $('#album').value = payload.title;
    if(payload.artist) $('#artist').value = payload.artist;
    if(payload.year) $('#released').value = payload.year;
    if(payload.trackCount) $('#trackcount').value = String(payload.trackCount);
    if(payload.coverUrl) $('#coverOut').src = payload.coverUrl;
  }

  // Bind UI
  function bindCore(){
    const b = document.getElementById('btnBuscarAlbum');
    if(b && !b._bound){ b.addEventListener('click', runAutofill); b._bound = true; }
    const add = document.getElementById('addRow'); if(add && !add._bound){ add._bound=true; add.addEventListener('click', ()=> ensureRows(document.getElementById('tracks').children.length+1)); }
    const del = document.getElementById('delRow'); if(del && !del._bound){ del._bound=true; del.addEventListener('click', ()=> ensureRows(Math.max(1, document.getElementById('tracks').children.length-1))); }
    const app= document.getElementById('applyCount'); if(app && !app._bound){ app._bound=true; app.addEventListener('click', ()=> ensureRows(parseInt(document.getElementById('trackcount').value||'1',10))); }
    const cov= document.getElementById('cover'); if(cov && !cov._bound){ cov._bound=true; cov.addEventListener('change',ev=>{const f=ev.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=e=>{document.getElementById('coverOut').src=e.target.result; save();}; r.readAsDataURL(f);}); }

    // Toggle Sort Top 10
    const sortBtn = document.getElementById('sortTop10');
    if (sortBtn && !sortBtn._bound) {
      sortBtn._bound = true;
      sortBtn.addEventListener('click', () => {
        const el = document.getElementById('tracks');

        if (!SORT_STATE.active) {
          // Guardar snapshot y ordenar
          SORT_STATE.snapshot = [...el.children].map(r => r.value());
          const arr = SORT_STATE.snapshot.map(x => ({ ...x })); // copia de trabajo
          const scored = arr.filter(t => Number.isFinite(t.score));
          const un     = arr.filter(t => !Number.isFinite(t.score));
          scored.sort((a, b) => b.score - a.score);
          const top  = scored.slice(0, 10);
          const rest = scored.slice(10).concat(un);
          const merged = top.concat(rest).map((t, i) => ({ ...t, n: i + 1 }));

          el.innerHTML = '';
          merged.forEach((t, i) => el.appendChild(makeRow(i, t)));
          SORT_STATE.active = true;
          setSortButton(true);
          render();
          return;
        }

        // Restaurar snapshot
        if (SORT_STATE.snapshot) {
          const original = SORT_STATE.snapshot.map(x => ({ ...x }));
          el.innerHTML = '';
          original.forEach((t, i) => el.appendChild(makeRow(i, t)));
        }
        SORT_STATE.active = false;
        SORT_STATE.snapshot = null;
        setSortButton(false);
        render();
      });

      // Texto inicial del botón
      setSortButton(SORT_STATE.active);
    }
  } // <- cierre bindCore()

  // Al completar autofill: llenar filas + reset toggle
  window.addEventListener('album-autofilled', (e) => {
    const d = e.detail || {}; const list = d.tracks || [];
    document.getElementById('trackcount').value = list.length || document.getElementById('trackcount').value;
    ensureRows(list.length || document.getElementById('tracks').children.length);
    [...document.getElementById('tracks').children].forEach((row, i) => {
      const inputs = row.querySelectorAll('input'); // [num, dur, name]
      const t = list[i] || {};
      if (inputs[1]) inputs[1].value = t.duration || '';
      if (inputs[2]) inputs[2].value = t.title || '';
    });
    if (d.year) document.getElementById('released').value = d.year;

    SORT_STATE.active = false;
    SORT_STATE.snapshot = null;
    setSortButton(false);

    render();
  });

  // API mínima para depurar desde consola
  window.AlbumApp = { ensureRows, getState, setState, save, load };

  // Arranque
  function boot(){
    if(document.readyState==='complete' || document.readyState==='interactive'){
      try{ bindCore(); load(); }catch(e){ console.error(e); }
    }else{
      document.addEventListener('DOMContentLoaded', ()=>{ try{ bindCore(); load(); }catch(e){ console.error(e); } });
    }
  }
  boot();
})();
