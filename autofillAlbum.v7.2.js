/* ----------------------------------------------------------
   autofill.v7.2.js — ITUNES API FETCH
   - Conecta el botón "Buscar Álbum" con la API de iTunes.
   - Requiere que en el HTML el botón tenga id="btnFetch".
---------------------------------------------------------- */

(function () {
  console.log("🔧 Autofill Script: Iniciado.");

  document.addEventListener("DOMContentLoaded", () => {
    
    // 1. SELECCIÓN DE ELEMENTOS
    // Asegúrate que en tu HTML los IDs sean exactamente estos:
    const btn = document.getElementById("btnFetch");
    const inputArtist = document.getElementById("inArtist");
    const inputAlbum = document.getElementById("inAlbum");

    // Si el botón no existe, detenemos el script para evitar errores
    if (!btn) {
      console.error("❌ ERROR CRÍTICO: No se encontró el botón con id='btnFetch' en el HTML.");
      return;
    }

    // 2. LÓGICA DEL CLICK
    btn.addEventListener("click", async () => {
      console.log("🖱️ Click detectado en Buscar Álbum.");

      // Leer valores de los inputs
      const artistVal = inputArtist ? inputArtist.value.trim() : "";
      const albumVal = inputAlbum ? inputAlbum.value.trim() : "";

      // Validar que no estén vacíos
      if (!artistVal || !albumVal) {
        alert("⚠️ Por favor ingresa el Artista y el nombre del Álbum antes de buscar.");
        return;
      }

      // Guardar texto original del botón ("Buscar Álbum") para restaurarlo luego
      const originalText = btn.textContent;
      
      // Cambiar estado visual del botón (Feedback de carga)
      btn.textContent = "⏳ Buscando...";
      btn.disabled = true;
      btn.style.opacity = "0.7";
      btn.style.cursor = "wait";

      try {
        // 3. PETICIÓN A LA API (iTunes)
        // Usamos encodeURIComponent para manejar espacios y caracteres especiales
        const query = encodeURIComponent(`${artistVal} ${albumVal}`);
        const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;
        
        console.log(`🌐 Consultando API: ${url}`);

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error de red: ${response.status}`);
        }

        const data = await response.json();

        // 4. PROCESAR RESULTADOS
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          console.log("✅ Álbum encontrado:", result.collectionName);

          // Obtener carátula en Alta Resolución (Hack de iTunes)
          // Cambiamos "100x100bb" por "1000x1000bb"
          let highResCover = "";
          if (result.artworkUrl100) {
            highResCover = result.artworkUrl100.replace("100x100bb", "1000x1000bb");
          }

          // Extraer solo el año (YYYY) de la fecha completa
          const year = result.releaseDate ? result.releaseDate.substring(0, 4) : "";

          // 5. ACTUALIZAR LA APP
          // Enviamos los datos a la lógica principal (window.AlbumApp)
          if (window.AlbumApp && typeof window.AlbumApp.setState === 'function') {
            window.AlbumApp.setState({
              artist: result.artistName,
              album: result.collectionName,
              released: year,
              cover: highResCover
            });
          } else {
            console.warn("⚠️ window.AlbumApp no está listo. Los datos se obtuvieron pero no se pudieron pintar.");
          }

        } else {
          // Si iTunes devuelve una lista vacía
          alert("❌ No se encontraron resultados en iTunes para esa búsqueda. Revisa si el nombre está bien escrito.");
        }

      } catch (error) {
        console.error("❌ Error en el proceso de Autofill:", error);
        alert("Ocurrió un error al intentar conectar con el servicio de búsqueda.");
      } finally {
        // 6. RESTAURAR BOTÓN
        // Pase lo que pase (éxito o error), devolvemos el botón a la normalidad
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      }
    });
  });
})();
