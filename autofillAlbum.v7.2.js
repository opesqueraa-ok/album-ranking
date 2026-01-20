/* ----------------------------------------------------------
   autofill.v7.2.js — EDITORIAL AUTOFILL
   - Busca en iTunes API (más fiable para carátulas y años)
   - Actualiza el estado global de AlbumApp
   - Soporta Artist, Album, Year y Cover
---------------------------------------------------------- */

(function () {
  const btnFetch = document.getElementById("btnFetch");

  if (!btnFetch) return;

  btnFetch.addEventListener("click", async () => {
    const artistInput = document.getElementById("inArtist").value.trim();
    const albumInput = document.getElementById("inAlbum").value.trim();

    if (!artistInput || !albumInput) {
      alert(
        window.AlbumApp.state.lang === "es"
          ? "Por favor, ingresa Artista y Álbum."
          : "Please enter Artist and Album."
      );
      return;
    }

    // UI Feedback
    const originalText = btnFetch.textContent;
    btnFetch.textContent = window.AlbumApp.state.lang === "es" ? "Buscando..." : "Searching...";
    btnFetch.disabled = true;

    try {
      // Usamos iTunes API por su sencillez y calidad de carátulas
      const searchTerm = encodeURIComponent(`${artistInput} ${albumInput}`);
      const url = `https://itunes.apple.com/search?term=${searchTerm}&entity=album&limit=1`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const albumData = data.results[0];

        // 1. Obtener carátula en alta resolución (reemplazamos 100x100 por 600x600)
        const coverUrl = albumData.artworkUrl100.replace(
          "100x100bb.jpg",
          "600x600bb.jpg"
        );

        // 2. Extraer el año (YYYY-MM-DD...)
        const releaseYear = albumData.releaseDate
          ? albumData.releaseDate.split("-")[0]
          : "";

        // 3. Actualizar el estado global de la App
        // Esto disparará automáticamente el renderPreview() del index.html
        window.AlbumApp.setState({
          artist: albumData.artistName,
          album: albumData.collectionName,
          released: releaseYear,
          cover: coverUrl
        });

        console.log("Autofill exitoso:", albumData.collectionName);
      } else {
        alert(
          window.AlbumApp.state.lang === "es"
            ? "No se encontraron resultados."
            : "No results found."
        );
      }
    } catch (error) {
      console.error("Error en autofill:", error);
      alert("Error conectando con el servicio de búsqueda.");
    } finally {
      btnFetch.textContent = originalText;
      btnFetch.disabled = false;
    }
  });
})();
