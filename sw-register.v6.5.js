(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.v6.5.1.js?v=6.5.1');
    });
  }
})();
