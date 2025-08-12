// UI glue: idioma, export/import JSON, clear, subtítulo y i18n de etiquetas.
(function(){
  const I18N={
    en:{subtitle:"Quick form to score albums. Choose track count, pick scores (int + decimal) or '-' to leave unscored. Everything updates live.",
        album:"Album",artist:"Artist",released:"Release Date",rankedby:"Ranked by",cover:"Cover",trackcount:"Tracks",
        num:"#",duration:"Duration",name:"Name",score:"Score (int + decimal)",color:"Color",
        apply:"Apply Track Count",addRow:"+ Add Row",delRow:"– Remove Last",clearAll:"Clear All Data",
        import:"Import Data",export:"Export Data",confirmClear:"Are you sure you want to clear all fields?"
    },
    es:{subtitle:"Formulario para puntuar álbumes. Elige número de canciones, puntúa (entero + decimal) o '-' para dejar sin puntuar. Todo se actualiza al instante.",
        album:"Álbum",artist:"Artista",released:"Fecha de lanzamiento",rankedby:"Rankeado por",cover:"Cover",trackcount:"Canciones",
        num:"#",duration:"Duración",name:"Nombre",score:"Puntaje (entero + decimal)",color:"Color",
        apply:"Aplicar cantidad",addRow:"+ Añadir fila",delRow:"– Quitar última",clearAll:"Borrar todos los datos",
        import:"Importar datos",export:"Exportar datos",confirmClear:"¿Seguro que deseas borrar todos los campos?"
    }
  };
  const $=s=>document.querySelector(s);
  function applyI18N(){
    const lang = localStorage.getItem('albumrater_lang') || (navigator.language||'en').startsWith('es')?'es':'en';
    const t = I18N[lang];
    $('#subtitle').textContent=t.subtitle;
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]||el.textContent;});
    $('#applyCount').textContent=t.apply; $('#addRow').textContent=t.addRow; $('#delRow').textContent=t.delRow;
    $('#clearAll').textContent=t.clearAll; $('#importLabel').textContent=t.import; $('#exportJSON').textContent=t.export; $('#lang').value=lang;
  }

  // Language selector
  document.getElementById('lang').addEventListener('change',e=>{
    localStorage.setItem('albumrater_lang', e.target.value);
    applyI18N();
    // trigger rerender to refresh table headers
    if(window.AlbumApp){ const s = window.AlbumApp.getState(); window.AlbumApp.setState(s); }
  });

  // Export JSON
  document.getElementById('exportJSON').onclick=()=>{
    const s = window.AlbumApp.getState();
    const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='albumrater-data.json'; a.click(); URL.revokeObjectURL(url);
  };

  // Import JSON
  document.getElementById('importJSON').addEventListener('change',ev=>{
    const f=ev.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=e=>{ try{ const s=JSON.parse(e.target.result); window.AlbumApp.setState(s); window.AlbumApp.save(); alert('Datos importados.'); }catch(err){ alert('Archivo inválido.'); } };
    r.readAsText(f);
  });

  // Clear All
  document.getElementById('clearAll').onclick=()=>{
    const lang = localStorage.getItem('albumrater_lang') || 'en';
    const msg = I18N[lang].confirmClear;
    if(!confirm(msg)) return;
    window.AlbumApp.clearAll();
  };

  // Boot
  applyI18N();
})();