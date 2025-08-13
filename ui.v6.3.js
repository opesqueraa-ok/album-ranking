// UI v6.3: idioma, export/import/clear conectados de forma robusta
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
    const t=I18N[lang]; $('#subtitle').textContent=t.subtitle;
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]||el.textContent;});
    $('#applyCount').textContent=t.apply; $('#addRow').textContent=t.addRow; $('#delRow').textContent=t.delRow;
    $('#clearAll').textContent=t.clearAll; $('#importLabel').textContent=t.import; $('#exportJSON').textContent=t.export; $('#lang').value=lang;
  }

  function exportJSON(){
    const s=window.AlbumApp.getState();
    const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='albumrater-data.json'; a.click();
    URL.revokeObjectURL(url);
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
    const lang = localStorage.getItem(KEY_LANG)||($('#lang').value||'en');
    const msg = I18N[lang].confirmClear;
    if(!confirm(msg)) return;
    localStorage.removeItem('albumrater_v6_state');
    window.AlbumApp.setState({lang, album:'', artist:'', released:'', rankedby:'', cover:'', tracks:[]});
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // idioma
    let LANG=localStorage.getItem(KEY_LANG)||(navigator.language.startsWith('es')?'es':'en');
    $('#lang').value=LANG; applyI18N(LANG);
    $('#lang').addEventListener('change',e=>{LANG=e.target.value; localStorage.setItem(KEY_LANG,LANG); applyI18N(LANG); const s=window.AlbumApp.getState(); s.lang=LANG; window.AlbumApp.setState(s); window.AlbumApp.save();});

    // export/import/clear
    $('#exportJSON').addEventListener('click', exportJSON);
    $('#importJSON').addEventListener('change', ev=>{ const f=ev.target.files[0]; if(f) importJSON(f); ev.target.value=''; });
    $('#clearAll').addEventListener('click', clearAll);
  });
})();