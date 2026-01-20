/* ----------------------------------------------------------
   autofillAlbum.v7.2.js
   - Busca Metadatos del Álbum
   - Busca Lista de Canciones (Tracks)
   - Convierte duración a mm:ss
---------------------------------------------------------- */
(function () {
  console.log("🔧 AutofillAlbum Script Cargado (Con Tracks + Duración)");

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btnFetch");
    const inputArtist = document.getElementById("inArtist");
    const inputAlbum = document.getElementById("inAlbum");

    if (!btn) {
        console.error("❌ Error: No se encontró el botón btnFetch");
        return;
    }

    // --- FUNCIÓN AUXILIAR: Convertir milisegundos a m:ss ---
    function msToTime(duration) {
        if (!duration) return "--:--";
        let seconds = Math.floor((duration / 1000) % 60);
        let minutes = Math.floor((duration / (1000 * 60)));
        // Asegurar que los segundos tengan dos dígitos (ej. 3:05 en vez de 3:5)
        return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    }

    // --- EVENTO CLICK ---
    btn.addEventListener("click", async () => {
      const artistVal = inputArtist ? inputArtist.value.trim() : "";
      const albumVal = inputAlbum ? inputAlbum.value.trim() : "";

      if (!artistVal || !albumVal) {
        alert("Por favor ingresa primero el Artista y el Álbum.");
        return;
      }

      // UI: Feedback de carga
      const originalText = btn.textContent;
      btn.textContent = "⏳ Buscando en iTunes...";
      btn.disabled = true;
      btn.style.opacity = "0.7";

      try {
        // ------------------------------------------------------
        // PASO 1: Buscar el Álbum (para obtener ID y Portada)
        // ------------------------------------------------------
        const query = encodeURIComponent(`${artistVal} ${albumVal}`);
        const searchUrl = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;
        
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
          const albumData = searchData.results[0];
          const collectionId = albumData.collectionId;

          // Truco para conseguir imagen HD (1000x1000)
          let highResCover = "";
          if (albumData.artworkUrl100) {
            highResCover = albumData.artworkUrl100.replace("100x100bb", "1000x1000bb");
          }
          
          // Año de lanzamiento (primeros 4 dígitos: "2023-05-12" -> "2023")
          const year = albumData.releaseDate ? albumData.releaseDate.substring(0, 4) : "";

          // ------------------------------------------------------
          // PASO 2: Buscar las canciones usando el ID del álbum
          // ------------------------------------------------------
          const lookupUrl = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song&limit=200`;
          const lookupRes = await fetch(lookupUrl);
          const lookupData = await lookupRes.json();

          // Filtramos resultados (el item 0 suele ser el álbum, queremos los 'track')
          const tracksRaw = lookupData.results.filter(item => item.wrapperType === 'track');
          
          // Mapeamos al formato que usa tu index.html
          const newTracks = tracksRaw.map(t => ({
              name: t.trackName,
              duration: msToTime(t.trackTimeMillis), // Convierte ms a "3:45"
              score: "" // Se deja vacío para puntuar manualmente
          }));

          // ------------------------------------------------------
          // PASO 3: Actualizar la App
          // ------------------------------------------------------
          if (window.AlbumApp) {
              window.AlbumApp.setState({
                artist: albumData.artistName,
                album: albumData.collectionName,
                released: year,
                cover: highResCover,
                tracks: newTracks
              });
          } else {
              console.error("❌ Error: No se encontró window.AlbumApp");
          }

        } else {
          alert("No se encontraron resultados. Revisa la ortografía.");
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        alert("Error de conexión con iTunes API.");
      } finally {
        // Restaurar botón
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
      }
    });
  });
})();
