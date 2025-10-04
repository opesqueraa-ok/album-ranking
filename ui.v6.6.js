// UI v6.6 wiring: i18n, export/import, clear, notes, clear score, sort top10, tabs, Library (IndexedDB)
(function(){
  const $=s=>document.querySelector(s);
  const KEY_LANG='albumrater_lang';
  const NOTES_KEY='albumrater_v6_notes';

  const I18N={
    en:{subtitle:"Quick form to score albums. Choose track count, pick scores with two taps (integer + decimal), and everything updates live.",
        album:"Album",artist:"Artist",released:"Release Date",rankedby:"Ranked by",cover:"Cover",trackcount:"Tracks",
        num:"#",duration:"Duration",name:"Name",score:"Score (int + decimal)",color:"Color",
        apply:"Apply Track Count",addRow:"+ Add Row",delRow:"– Remove Last",clearAll:"Clear All Data",clearScores:"Clear Score",
        import:"Import Data",export:"Export Data",total:"Duration",avg:"Average",
        confirmClear:"Are you sure you want to clear all fields?",
        notePrompt:"Write a note for this track:",imported:"Imported.",invalidFile:"Invalid file.",exportFail:"Could not export.",
        saveToLib:"Save to Library", myLibrary:"My Library", editor:"Editor",
        searchPH:"Search albums or artists", importLib:"Import Library", exportLib:"Export Library",
    },
    es:{subtitle:"Formulario rápido para puntuar álbumes. Elige número de canciones, selecciona puntaje en dos toques (entero + decimal) y todo se actualiza al instante.",
        album:"Álbum",artist:"Artista",released:"Fecha de lanzamiento",rankedby:"Rankeado por",cover:"Cover",trackcount:"Canciones",
        num:"#",duration:"Duración",name:"Nombre",score:"Puntaje (entero + decimal)",color:"Color",
        apply:"Aplicar cantidad",addRow:"+ Añadir fila",delRow:"– Quitar última",clearAll:"Borrar todos los datos",clearScores:"Limpiar puntajes",
        import:"Importar datos",export:"Exportar datos",total:"Duración total",avg:"Promedio",
        confirmClear:"¿Seguro que deseas borrar todos los campos?",
        notePrompt:"Escribe una nota para esta canción:",imported:"Importado.",invalidFile:"Archivo inválido.",exportFail:"No se pudo exportar.",
        saveToLib:"Guardar en Biblioteca", myLibrary:"Mi Biblioteca", editor:"Editor",
        searchPH:"Buscar álbumes o artistas", importLib:"Importar Biblioteca", exportLib:"Exportar Biblioteca",
    }
  };

  function currentLang(){
    const l = localStorage.getItem(KEY_LANG) || (navigator.language||'en');
    return l.startsWith('es') ? 'es' : 'en';
  }

  function applyI18N(lang){
    const t=I18N[lang];
    const sub=$('#subtitle'); if(sub) sub.textContent=t.subtitle;
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]||el.textContent;});
    const ids=[['applyCount','apply'],['addRow','addRow'],['delRow','delRow'],['clearAll','clearAll'],['importLabel','import'],['exportJSON','export'],['clearScores','clearScores'],['saveToLib','saveToLib']];
    ids.forEach(([id,key])=>{ const el=document.getElementById(id); if(el) el.textContent=t[key]; });
    const langSel=$('#lang'); if(langSel) langSel.value=lang;
    // placeholders lib
    const ls=$('#libSearch'); if(ls) ls.placeholder = t.searchPH;
    const libExp=$('#libExport'); if(libExp) libExp.textContent = t.exportLib;
    const libImpLabel = $('#libraryView label span.small'); if(libImpLabel) libImpLabel.textContent = t.importLib;
    const tabLib = $('#tabLibrary'); if(tabLib) tabLib.textContent = t.myLibrary;
    const tabEd = $('#tabEditor'); if(tabEd) tabEd.textContent = t.editor;
  }

  // ---------- helpers ----------
  const safeName = (s)=> (s||'').replace(/[\\/:*?"<>|]+/g,'').trim().replace(/\s+/g,' ');
  function getAvgScore(tracks){ const xs=(tracks||[]).map(t=>t.score).filter(Number.isFinite); return xs.length? xs.reduce((a,b)=>a+b,0)/xs.length : NaN; }

  // ---------- notes storage ----------
  function stateKeyForNotes(){
    const s=window.AlbumApp.getState();
    return `${safeName(s.album||'Album')}__${safeName(s.artist||'Artist')}`;
  }
  function loadAllNotes(){ try{ return JSON.parse(localStorage.getItem(NOTES_KEY)||'{}'); }catch{ return {}; } }
  function saveAllNotes(obj){ localStorage.setItem(NOTES_KEY, JSON.stringify(obj)); }
  function getNotesForCurrent(){ const all=loadAllNotes(); return all[stateKeyForNotes()] || {trackNotes:{}, final:''}; }
  function setNotesForCurrent(n){ const all=loadAllNotes(); all[stateKeyForNotes()] = n; saveAllNotes(all); }

  function renderNotesOutput(){
    const out = $('#notesOutput'); if(!out) return;
    const s = window.AlbumApp.getState();
    const notes = getNotesForCurrent();
    const lines = [];
    const tracks = s.tracks || [];
    tracks.forEach((t,i)=>{
      const note = notes.trackNotes[i];
      if(note && note.trim()){
        const name = t?.name || `Track ${i+1}`;
        lines.push(`${i+1}. ${name}: ${note.trim()}`);
      }
    });
    const albumTitle = s.album ? `${s.album} by ${s.artist || ""}`.trim() : "";
    const header = albumTitle ? albumTitle + "\n" : "";
    const final = notes.final || "";
    const finalBlock = final.trim() ? `\nFinal Album Thoughts: ${final.trim()}` : "";
    out.textContent = header + lines.join("\n") + finalBlock;
  }

  function bindFinalNotes(){
    const ta=$('#finalNotes'); if(!ta || ta._bound) return;
    ta._bound=true;
    ta.addEventListener('input', ()=>{
      const n = getNotesForCurrent(); n.final = ta.value || ''; setNotesForCurrent(n); renderNotesOutput();
    });
  }

  // inyectar botón de nota (pluma) por fila
  function ensureNoteButtons(){
    const container = document.getElementById('tracks'); if(!container) return;
    const notes = getNotesForCurrent();
    [...container.children].forEach((row, idx)=>{
      if(row.querySelector('.noteBtn')) return;
      const btn = document.createElement('button');
      btn.type='button'; btn.className='noteBtn'; btn.title='Add note';
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33h-.5v-.5l9.06-9.06.5.5L5.92 19.58zM20.71 7.04a1.003 1.003 0 000-1.42l-2.34-2.34a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>';
      row.appendChild(btn);

      btn.addEventListener('click', ()=>{
        const lang=currentLang(); const t=I18N[lang]||I18N.en;
        const prev = notes.trackNotes[idx] || '';
        const text = prompt(t.notePrompt, prev == null ? '' : String(prev));
        if(text==null) return;
        notes.trackNotes[idx] = text.trim();
        setNotesForCurrent(notes);
        btn.classList.toggle('active', !!notes.trackNotes[idx]);
        renderNotesOutput();
      });

      btn.classList.toggle('active', !!notes.trackNotes[idx]);
    });
  }

  function observeTrackList(){
    const target = document.getElementById('tracks'); if(!target || target._observerAttached) return;
    target._observerAttached = true;
    const mo = new MutationObserver(()=>{ ensureNoteButtons(); renderNotesOutput(); });
    mo.observe(target, { childList:true, subtree:false });
    ensureNoteButtons(); renderNotesOutput();
  }

  // ---------- Export / Import / Clear / ClearScores ----------
  function exportJSON(){
    try{
      const s=window.AlbumApp.getState();
      const notes=getNotesForCurrent();
      const payload={...s, notes};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const album=safeName(s.album||'Album'), artist=safeName(s.artist||'');
      const fname = artist ? `${album} - ${artist}.json` : `${album}.json`;
      const a=document.createElement('a'); a.href=url; a.download=fname; a.click(); URL.revokeObjectURL(url);
    }catch(e){ alert((I18N[currentLang()]||I18N.en).exportFail); console.error(e); }
  }
  function importJSON(file){
    const r=new FileReader();
    r.onload=e=>{
      try{
        const obj=JSON.parse(e.target.result);
        window.AlbumApp.setState(obj); window.AlbumApp.save();
        if(obj && obj.notes){
          setNotesForCurrent({trackNotes:obj.notes.trackNotes||{}, final:obj.notes.final||''});
          renderNotesOutput();
          const final=$('#finalNotes'); if(final) final.value = obj.notes.final || '';
        }
        alert((I18N[currentLang()]||I18N.en).imported);
      }catch(err){ alert((I18N[currentLang()]||I18N.en).invalidFile); }
    };
    r.readAsText(file);
  }
  function clearAll(){
    const lang = localStorage.getItem(KEY_LANG)||($('#lang')?.value||'en');
    const msg = (I18N[lang]||I18N.en).confirmClear;
    if(!confirm(msg)) return;
    localStorage.removeItem('albumrater_v6_state');
    window.AlbumApp.setState({lang, id:null, album:'', artist:'', released:'', rankedby:'', cover:'', tracks:[]});
  }
  function clearScores(){
    const s=window.AlbumApp.getState(); s.tracks=(s.tracks||[]).map(t=>({...t, score:NaN}));
    window.AlbumApp.setState(s); window.AlbumApp.save();
  }

  // ---------- Tabs (Editor / Library) ----------
  function showEditor(){ $('#editorView').style.display='block'; $('#libraryView').style.display='none'; $('#tabEditor').classList.add('active'); $('#tabLibrary').classList.remove('active'); }
  function showLibrary(){ $('#editorView').style.display='none'; $('#libraryView').style.display='block'; $('#tabEditor').classList.remove('active'); $('#tabLibrary').classList.add('active'); renderLibrary(); }

  // ---------- Library (IndexedDB) ----------
  function computeAlbumObject(){
    const s = window.AlbumApp.getState();
    const avg = getAvgScore(s.tracks);
    // llevar notas embebidas también:
    const notes = getNotesForCurrent();
    return {
      ...s,
      avgScore: Number.isFinite(avg) ? Number(avg.toFixed(2)) : null,
      notes
    };
  }

  async function saveToLibrary(){
    const obj = computeAlbumObject();
    const saved = await window.AlbumDB.upsert(obj);
    alert('Saved ✔');
    renderLibrary(); // refrescar si estás en la library
  }

  function sortAlbums(list, mode){
    const arr = list.slice();
    if(mode==='avgAsc') arr.sort((a,b)=>(a.avgScore??-1)-(b.avgScore??-1));
    else if(mode==='avgDesc') arr.sort((a,b)=>(b.avgScore??-1)-(a.avgScore??-1));
    else if(mode==='newest') arr.sort((a,b)=>(b.updatedAt??0)-(a.updatedAt??0));
    else if(mode==='oldest') arr.sort((a,b)=>(a.updatedAt??0)-(b.updatedAt??0));
    else if(mode==='az') arr.sort((a,b)=>(a.album||'').localeCompare(b.album||''));
    else if(mode==='za') arr.sort((a,b)=>(b.album||'').localeCompare(a.album||''));
    return arr;
  }

  async function renderLibrary(){
    const grid = $('#libGrid'), count=$('#libCount'); if(!grid) return;
    const all = await window.AlbumDB.getAll();

    const q = ($('#libSearch')?.value||'').toLowerCase().trim();
    const min = parseFloat($('#libMin')?.value||'');
    const max = parseFloat($('#libMax')?.value||'');
    const sort = $('#libSort')?.value||'avgDesc';

    let list = all.filter(a=>{
      const txt = `${a.album||''} ${a.artist||''}`.toLowerCase();
      const inText = !q || txt.includes(q);
      const s = a.avgScore ?? NaN;
      const inMin = Number.isNaN(min)? true : (Number.isFinite(s) ? s>=min : false);
      const inMax = Number.isNaN(max)? true : (Number.isFinite(s) ? s<=max : false);
      return inText && inMin && inMax;
    });

    list = sortAlbums(list, sort);

    grid.innerHTML='';
    count.textContent = `${list.length} item(s)`;

    list.forEach(a=>{
      const card = document.createElement('div');
      card.className='lib-card';
      card.innerHTML = `
        <img src="${a.cover||''}" alt="">
        <div class="meta">
          <div class="lib-title" title="${a.album||''}">${a.album||'—'}</div>
          <div class="lib-artist" title="${a.artist||''}">${a.artist||'—'}</div>
          <div class="lib-row"><span>Avg</span><strong>${Number.isFinite(a.avgScore)?a.avgScore.toFixed(1):'—'}</strong></div>
          <div class="lib-actions">
            <button class="open">Open</button>
            <button class="del" style="background:#2a1111;border-color:#552222">Delete</button>
          </div>
        </div>
      `;
      card.querySelector('.open').addEventListener('click', async ()=>{
        const full = await window.AlbumDB.getOne(a.id);
        if(full){
          // cargar en editor + notas a NOTES_KEY
          window.AlbumApp.setState(full);
          if(full.notes){
            const all = loadAllNotes();
            const key = `${safeName(full.album||'Album')}__${safeName(full.artist||'Artist')}`;
            all[key] = full.notes;
            saveAllNotes(all);
            // pintar UI
            const ta = $('#finalNotes'); if(ta) ta.value = full.notes.final || '';
            renderNotesOutput();
          }
          showEditor();
          window.scrollTo({top:0,behavior:'smooth'});
        }
      });
      card.querySelector('.del').addEventListener('click', async ()=>{
        if(confirm('Delete this album from library?')){
          await window.AlbumDB.remove(a.id);
          renderLibrary();
        }
      });
      grid.appendChild(card);
    });
  }

  function exportLibraryFile(albums){
    const blob=new Blob([JSON.stringify({albums},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='albumrater-library.json'; a.click(); URL.revokeObjectURL(url);
  }

  async function exportLibrary(){
    const all = await window.AlbumDB.getAll();
    exportLibraryFile(all);
  }

  function importLibrary(file){
    const r=new FileReader();
    r.onload=async (e)=>{
      try{
        const obj=JSON.parse(e.target.result);
        const arr = Array.isArray(obj)? obj : (Array.isArray(obj.albums)? obj.albums : []);
        if(!arr.length){ alert('Nothing to import.'); return; }
        await window.AlbumDB.bulkImport(arr);
        alert('Library imported.');
        renderLibrary();
      }catch(err){ alert('Invalid file.'); }
    };
    r.readAsText(file);
  }

  // ---------- bind UI ----------
  function bindUI(){
    let LANG=currentLang();
    applyI18N(LANG);

    const langSel=$('#lang'); if(langSel && !langSel._bound){ langSel._bound=true; langSel.addEventListener('change',e=>{LANG=e.target.value; localStorage.setItem(KEY_LANG,LANG); applyI18N(LANG); const s=window.AlbumApp.getState(); s.lang=LANG; window.AlbumApp.setState(s); window.AlbumApp.save();}); }
    const exp=$('#exportJSON'); if(exp && !exp._bound){ exp._bound=true; exp.addEventListener('click', exportJSON); }
    const imp=$('#importJSON'); if(imp && !imp._bound){ imp._bound=true; imp.addEventListener('change', ev=>{ const f=ev.target.files[0]; if(f) importJSON(f); ev.target.value=''; }); }
    const clr=$('#clearAll'); if(clr && !clr._bound){ clr._bound=true; clr.addEventListener('click', clearAll); }
    const clrS=$('#clearScores'); if(clrS && !clrS._bound){ clrS._bound=true; clrS.addEventListener('click', clearScores); }

    // tabs
    const tEd = $('#tabEditor'), tLib = $('#tabLibrary');
    if(tEd && !tEd._bound){ tEd._bound=true; tEd.addEventListener('click', showEditor); }
    if(tLib && !tLib._bound){ tLib._bound=true; tLib.addEventListener('click', showLibrary); }

    // save to library
    const saveBtn = $('#saveToLib');
    if(saveBtn && !saveBtn._bound){ saveBtn._bound=true; saveBtn.addEventListener('click', saveToLibrary); }

    // library controls
    const libApply = $('#libApply'); if(libApply && !libApply._bound){ libApply._bound=true; libApply.addEventListener('click', renderLibrary); }
    const libExport = $('#libExport'); if(libExport && !libExport._bound){ libExport._bound=true; libExport.addEventListener('click', exportLibrary); }
    const libImport = $('#libImport'); if(libImport && !libImport._bound){ libImport._bound=true; libImport.addEventListener('change', ev=>{ const f=ev.target.files[0]; if(f) importLibrary(f); ev.target.value=''; }); }

    // notes
    bindFinalNotes();
    observeTrackList();

    // refrescar notas tras autofill
    window.addEventListener('album-autofilled', ()=>{
      bindFinalNotes(); observeTrackList();
      const n = getNotesForCurrent();
      const ta = $('#finalNotes'); if(ta) ta.value = n.final || '';
      renderNotesOutput();
    });
  }

  function boot(){
    if(document.readyState==='complete' || document.readyState==='interactive'){ try{ bindUI(); }catch(e){ console.error(e); } }
    else document.addEventListener('DOMContentLoaded', ()=>{ try{ bindUI(); }catch(e){ console.error(e); } });
  }
  boot();
})();
