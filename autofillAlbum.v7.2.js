/* ----------------------------------------------------------
   autofillAlbum.v7.2.js
   - Busca en iTunes API y actualiza la App.
---------------------------------------------------------- */
(function () {
  console.log("🔧 AutofillAlbum Script Cargado");

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnFetch");
    const inputArtist = document.getElementById("inArtist");
    const inputAlbum = document.getElementById("inAlbum");

    if (!btn) {
      console.error("❌ Autofill: No se encontró el botón btnFetch");
      return;
    }

    btn.addEventListener("click", async () => {
      const artistVal = inputArtist ? inputArtist.value.trim() : "";
      const albumVal = inputAlbum ? inputAlbum.value.trim() : "";

      if (!artistVal || !albumVal) {
        alert("Please enter Artist and Album name.");
        return;
      }

      const originalText = btn.textContent;
      btn.textContent = "⏳ Searching...";
      btn.disabled = true;
      btn.style.opacity = "0.7";

      try {
        const query = encodeURIComponent(`${artistVal} ${albumVal}`);
        const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          
          // Imagen 1000x1000
          let highResCover = "";
          if (result.artworkUrl100) {
            highResCover = result.artworkUrl100.replace("100x100bb", "1000x1000bb");
          }
          const year = result.releaseDate ? result.releaseDate.substring(0, 4) : "";

          window.AlbumApp.setState({
            artist: result.artistName,
            album: result.collectionName,
            released: year,
            cover: highResCover
          });
        } else {
          alert("No results found on iTunes.");
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        alert("Connection error.");
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
      }
    });
  });
})();
