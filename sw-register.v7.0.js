(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('./sw.v7.0.js?v=7.0');
    });
  }
})();
