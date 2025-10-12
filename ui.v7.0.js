// ui.v7.0.js
(function(){
  const $=s=>document.querySelector(s);

  // ---- Notas: exponer getters/setters para Cloud ----
  function getNotesForCurrent(){
    // Si ya tienes tu implementación previa de notas, usa esa.
    // Aquí asumimos que las guardas en localStorage/estado.
    try{
      const s = window.AlbumApp.getState();
      const key = `album_notes__${(s.album||'').trim()}__${(s.artist||'').trim()}`;
      return JSON.parse(localStorage.getItem(key) || '{"trackNotes":{},"final":""}');
    }catch(e){ return { trackNotes:{}, final:'' }; }
  }
  function setNotesForCurrent(n){
    try{
      const s = window.AlbumApp.getState();
      const key = `album_notes__${(s.album||'').trim()}__${(s.artist||'').trim()}`;
      localStorage.setItem(key, JSON.stringify(n||{trackNotes:{},final:''}));
      // pintar output si existe
      const out = $('#notesOutput');
      if(out){
        const lines=[];
        (s.tracks||[]).forEach((t,i)=>{
          const note = n?.trackNotes?.[i];
          if(note) lines.push(`${i+1}. ${t?.name||('Track '+(i+1))}: ${note}`);
        });
        const header = s.album ? `${s.album} by ${s.artist||''}\n` : '';
        const final = (n?.final||'').trim() ? `\nFinal Album Thoughts: ${n.final.trim()}` : '';
        out.textContent = header + lines.join('\n') + final;
      }
      const ta=$('#finalNotes'); if(ta) ta.value = n?.final || '';
    }catch(e){}
  }
  window.UI_Notes_get = getNotesForCurrent;
  window.UI_Notes_set = setNotesForCurrent;

  // ---- Biblioteca: UI ----
  async function openLibrary(sort='new'){
    const modal=$('#libraryModal'); const grid=$('#libGrid');
    const sel=$('#libSort'); const close=$('#libClose');
    if(!modal||!grid) return;

    modal.style.display='flex';
    grid.innerHTML = '<div style="padding:12px;color:#aeb5c0">Loading…</div>';
    const items = await window.Cloud.listMyAlbums(sort);

    grid.innerHTML='';
    if(!items.length){
      grid.innerHTML='<div style="padding:16px;color:#aeb5c0">Your library is empty. Save an album first.</div>';
    }else{
      items.forEach(a=>{
        const card=document.createElement('div'); card.className='libCard';
        const img=document.createElement('img'); img.src=a.cover_url||''; img.alt='Cover';
        const title=document.createElement('div'); title.className='libTitle'; title.textContent=a.album;
        const meta=document.createElement('div'); meta.className='libMeta'; meta.textContent=`${a.artist} · ${(a.avg_score==null?'—':Number(a.avg_score).toFixed(1))}`;
        const row=document.createElement('div'); row.className='libRow';
        const open=document.createElement('button'); open.className='libBtn'; open.textContent='Open';
        open.addEventListener('click', ()=> window.Cloud.loadAlbumIntoUI(a.id));
        const del=document.createElement('button'); del.className='libBtn'; del.textContent='Delete';
        del.addEventListener('click', ()=> window.Cloud.deleteAlbum(a.id));
        row.append(open, del);
        card.append(img, title, meta, row);
        grid.appendChild(card);
      });
    }
    if(sel && !sel._b){ sel._b=true; sel.addEventListener('change', ()=> openLibrary(sel.value)); }
    if(close && !close._b){ close._b=true; close.addEventListener('click', ()=> (modal.style.display='none')); }
  }
  window.UI_Library_open = openLibrary;

  // ---- Bind toolbar ----
  function bind(){
    const saveC = $('#btnSaveCloud'); if(saveC && !saveC._b){ saveC._b=true; saveC.addEventListener('click', ()=> window.Cloud.saveCurrentToCloud()); }
    const openL = $('#btnOpenLibrary'); if(openL && !openL._b){ openL._b=true; openL.addEventListener('click', ()=> openLibrary('new')); }
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', bind); } else { bind(); }
})();
