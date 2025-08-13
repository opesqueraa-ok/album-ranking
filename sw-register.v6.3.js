(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.v6.3.js?v=6.3'));
  }
})();