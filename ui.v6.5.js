// UI v6.5 wiring (lang/export/import/clear)
(function(){
  const $=s=>document.querySelector(s);
  const I18N={
    en:{subtitle:"Quick form to score albums. Choose track count, pick scores with two taps (integer + decimal), and everything updates live.",
        album:"Album",artist:"Artist",released:"Release Date",rankedby:"Ranked by",cover:"Cover",trackcount:"Tracks",
        num:"#",duration:"Duration",name:"Name",score:"Score (int + decimal)",color:"Color",
        apply:"Apply Track Count",addRow:"+ Add Row",delRow:"– Remove Last",clearAll:"Clear All Data",
        import:"Import Data",export:"Export Data",total:"Duration",avg:"Average",
        confirmClear:"Are you sure you want to clear all fields?"},
    es:{subtitle:"Formulario rápido para puntuar álbumes. Elige número de canciones, selecciona puntaje en dos toques (entero + decimal) y todo se actualiza al instante.",
        album:"Álbum",artist:"Artista",released:"Fecha de lanzamiento",rankedby:"Rankeado por",cover:"Cover",trackcount:"Canciones",
        num:"#",duration:"Duración",name:"Nombre",score:"Puntaje (entero + decimal)",color:"Color",
        apply:"Aplicar cantidad",addRow:"+ Añadir fila",delRow:"– Quitar última",clearAll:"Borrar todos los datos",
        import:"Importar datos",export:"Exportar datos",total:"Duración total",avg:"Promedio",
        confirmClear:"¿Seguro que deseas borrar todos los campos?"}
  };
  const KEY_LANG='albumrater_lang';

  function applyI18N(lang){
    const t=I18N[lang]; const sub=$('#subtitle'); if(sub) sub.textContent=t.subtitle;
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]||el.textContent;});
    const ids=[['applyCount','apply'],['addRow','addRow'],['delRow','delRow'],['clearAll','clearAll'],['importLabel','import'],['exportJSON','export']];
    ids.forEach(([id,key])=>{ const el=document.getElementById(id); if(el) el.textContent=t[key]; });
    const langSel=$('#lang'); if(langSel) langSel.value=lang;
  }

  function exportJSON(){
    try{
      const s=window.AlbumApp.getState();
      const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='albumrater-data.json'; a.click();
      URL.revokeObjectURL(url);
    }catch(e){ alert('No se pudo exportar.'); console.error(e); }
  }
  function importJSON(file){
    const r=new FileReader();
    r.onload=e=>{
      try{ const obj=JSON.parse(e.target.result); window.AlbumApp.setState(obj); window.AlbumApp.save(); alert('Importado.'); }
      catch(err){ alert('Archivo inválido.'); }
    };
    r.readAsText(file);
  }
  function clearAll(){
    const lang = localStorage.getItem(KEY_LANG)||($('#lang')?.value||'en');
    const msg = (I18N[lang]||I18N.en).confirmClear;
    if(!confirm(msg)) return;
    localStorage.removeItem('albumrater_v6_state');
    window.AlbumApp.setState({lang, album:'', artist:'', released:'', rankedby:'', cover:'', tracks:[]});
  }

  function bindUI(){
    let LANG=localStorage.getItem(KEY_LANG)||(navigator.language.startsWith('es')?'es':'en');
    applyI18N(LANG);
    const langSel=$('#lang'); if(langSel && !langSel._bound){ langSel._bound=true; langSel.addEventListener('change',e=>{LANG=e.target.value; localStorage.setItem(KEY_LANG,LANG); applyI18N(LANG); const s=window.AlbumApp.getState(); s.lang=LANG; window.AlbumApp.setState(s); window.AlbumApp.save();}); }
    const exp=$('#exportJSON'); if(exp && !exp._bound){ exp._bound=true; exp.addEventListener('click', exportJSON); }
    const imp=$('#importJSON'); if(imp && !imp._bound){ imp._bound=true; imp.addEventListener('change', ev=>{ const f=ev.target.files[0]; if(f) importJSON(f); ev.target.value=''; }); }
    const clr=$('#clearAll'); if(clr && !clr._bound){ clr._bound=true; clr.addEventListener('click', clearAll); }
  }

  function boot(){
    if(document.readyState==='complete' || document.readyState==='interactive'){
      try{ bindUI(); }catch(e){ console.error(e); }
    }else{
      document.addEventListener('DOMContentLoaded', ()=>{ try{ bindUI(); }catch(e){ console.error(e); } });
    }
  }
  boot();
})();