(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.v6.js?v=6.1'));
  }
})();