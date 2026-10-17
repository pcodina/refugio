# REFUGIØ — Heridumbre (landing / EPK)

Sitio estático. Subir el contenido de esta carpeta tal cual al servidor.

## Elegir qué canciones se escuchan
Bloque `TRACKS` al principio de `js/main.js`:
- `visible: true` → se puede escuchar.
- `visible: false` → aparece en el tracklist atenuada, sin reproductor.
- `SHOW_LOCKED_TRACKS = false` → oculta del todo las no visibles.
- "Metralla" no tiene MP3 todavía: añadir el archivo en `assets/audio/` y rellenar `file` y `duration` (segundos).

## Pendiente
- Portada de Heridumbre: descomentar el bloque marcado en `index.html` y añadir la imagen en `assets/images/`.
- `og:url` y `og:image`: descomentar en `<head>` con el dominio definitivo.

## Medición
Clics con `data-event` y cada reproducción emiten `refugio:event` en `document`:
`document.addEventListener('refugio:event', e => console.log(e.detail))`
Eventos: click_escuchar_heridumbre, play_track, click_spotify, click_bandcamp, click_instagram, click_email.

## Privacidad
`<meta name="robots" content="noindex,nofollow">`. No añadir a sitemap.xml.
