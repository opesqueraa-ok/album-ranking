/* ----------------------------------------------------------
   autofill.v7.2.js — ITUNES API FETCH
   - Conecta con iTunes Search API.
   - Obtiene Carátula High-Res (600x600).
   - Extrae el Año de Lanzamiento.
   - Actualiza el estado global de window.AlbumApp.
---------------------------------------------------------- */

(function () {
  // Helper para seleccionar elementos por ID
  const $ = (id) => document.getElementById(id);

  // Esperar a que el DOM esté listo para evitar errores de elementos nulos
  document.addEventListener("DOMContentLoaded", () => {
    const btn = $("btnFetch");

    // Si por alguna razón el botón no existe, salimos
    if (!btn) return;

    btn.addEventListener("click", async () => {
      // Leer valores actuales
      const artistVal = $("inArtist").value.trim();
      const albumVal = $("inAlbum").value.trim();
      
      // Detectar idioma actual desde la App
      const lang = window.AlbumApp?.state.lang || "en";

      // 1. Validación básica
      if (!artistVal || !albumVal) {
        alert(lang === "es"
          ? "Por favor, ingresa el Artista y el nombre del Álbum."
          : "Please enter both Artist and Album names.");
        return;
      }

      // 2. Feedback visual (Botón en estado de carga)
      const originalText = btn.textContent;
      btn.textContent = lang === "es" ? "Buscando..." : "Searching...";
      btn.disabled = true;
      btn.style.opacity = "0.7";
      btn.style.cursor = "wait";

      try {
        // 3. Petición a la API de iTunes
        const query = encodeURIComponent(`${artistVal} ${albumVal}`);
        // limit=1 para obtener la coincidencia más relevante
        const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];

          // 4. Procesar Datos
          
          // Truco para High-Res: iTunes devuelve 100x100, cambiamos a 600x600 o 1000x1000
          // "bb" asegura fondo negro/borde si es necesario, jpg formato standard
          const highResCover = result.artworkUrl100
            ? result.artworkUrl100.replace("100x100bb", "600x600bb")
            : "";

          // Año: iTunes devuelve formato ISO (2023-01-01T...), cortamos los primeros 4 chars
          const year = result.releaseDate
            ? result.releaseDate.substring(0, 4)
            : "";

          // 5. Actualizar Estado Global de la App
          // Esto disparará automáticamente el renderPreview() en index.html
          window.AlbumApp.setState({
            artist: result.artistName,
            album: result.collectionName, // Nombre oficial del álbum
            released: year,
            cover: highResCover
          });

          console.log(`✅ Autofill success: ${result.collectionName}`);

        } else {
          // No se encontraron resultados
          alert(lang === "es"
            ? "No se encontraron resultados en iTunes."
            : "No results found on iTunes.");
        }

      } catch (err) {
        console.error("Autofill Error:", err);
        alert(lang === "es" 
          ? "Error de conexión con el servicio de búsqueda." 
          : "Connection error with search service.");
      } finally {
        // 6. Restaurar Botón
        btn.textContent = originalText;
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
      }
    });
  });

})();
