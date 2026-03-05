# 🎵 Album Rater App (ARA)

![Version](https://img.shields.io/badge/Version-9.1_Visual-blue.svg)
![Tech](https://img.shields.io/badge/Tech-Vanilla_JS_%7C_HTML_%7C_CSS-yellow.svg)

**Album Rater App** es una herramienta web interactiva diseñada para amantes de la música, críticos y entusiastas que desean rankear álbumes pista por pista y generar una tarjeta editorial visualmente atractiva para compartir en redes sociales.

---

## ✨ Características Principales

* 📊 **Gráfica Interactiva (Drag-to-Rate):** Olvídate de teclear números. Arrastra los puntos en la gráfica para establecer la calificación de cada canción (escala de 5.0 a 10.0). ¡Siente la forma del álbum!
* 🔍 **Auto-Fill Inteligente:** Integración con las APIs de **iTunes** y **MusicBrainz** para obtener instantáneamente la portada, año y la lista completa de canciones con sus duraciones.
* 🎨 **Color-Coding Dinámico:** Las calificaciones de las pistas se colorean automáticamente en el resumen final según su puntaje (Azul para 9+, Celeste para 8+, Verde para 7+, etc.).
* 📸 **Exportación a Imagen:** Convierte tu review en una elegante tarjeta "Editorial" en formato PNG con un solo clic, lista para compartir en X (Twitter), Instagram o Reddit.
* 📱 **Soporte PWA (Progressive Web App):** Instálala en tu teléfono móvil directamente desde el navegador gracias a su `manifest.webmanifest`.
* 💿 **Soporte para Leaks/Mixtapes:** ¿El álbum no está en las bases de datos? Sube la portada manualmente y añade las pistas a tu gusto.

---

## 🚀 Cómo Usarlo

1. **Busca el Álbum:** Ingresa el nombre del Artista y el Álbum en la sección de *Metadata* y presiona el botón de *Auto-Fill*.
2. **Ajusta los Detalles:** Agrega tu nombre en "Ranked By" para darle el crédito a tu review.
3. **Califica visualmente:** Usa la gráfica interactiva para subir o bajar el puntaje de cada canción. El promedio general se calculará en tiempo real.
4. **Exporta:** Haz clic en **Save Image** en la esquina superior derecha para descargar tu tarjeta de calificación final.

---

## 🛠️ Tecnologías y Librerías Utilizadas

Este proyecto fue construido utilizando **HTML5, CSS3 y JavaScript Vanilla**, sin frameworks pesados, para garantizar la máxima velocidad.

Librerías externas implementadas:
* [Chart.js](https://www.chartjs.org/) - Para la renderización de la gráfica visual.
* [chartjs-plugin-dragdata](https://github.com/chrispahm/chartjs-plugin-dragdata) - Para permitir la manipulación de datos arrastrando los puntos en el canvas.
* [html2canvas](https://html2canvas.hertzen.com/) - Para renderizar el DOM y exportar la tarjeta final como imagen.

---

*Diseñado y programado con pasión por la música.* 🎧
