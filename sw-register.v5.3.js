(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.v5.3.js?v=5.3'));
  }
})();