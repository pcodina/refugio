/* ==========================================================================
   CONFIGURACIÓN DEL REPRODUCTOR — único sitio que hay que tocar
   --------------------------------------------------------------------------
   visible: true  → la canción se puede escuchar en la web.
   visible: false → aparece en el tracklist, sin reproductor (atenuada).
   file:    ruta al MP3 dentro de assets/audio/ (null si aún no existe).
   duration: segundos, solo para mostrar la duración antes de cargar el audio.

   SHOW_LOCKED_TRACKS: false → las canciones no visibles desaparecen del tracklist.
   ========================================================================== */

const TRACKS = [
  { n: '01', title: 'Grietas',         file: 'assets/audio/grietas.mp3',         duration: 236,  visible: true  },
  { n: '02', title: 'Guías ciegos',    file: 'assets/audio/guias-ciegos.mp3',    duration: 270,  visible: true  },
  { n: '03', title: 'Ecos',            file: 'assets/audio/ecos.mp3',            duration: 204,  visible: true  },
  { n: '04', title: 'Nuestros huesos', file: 'assets/audio/nuestros-huesos.mp3', duration: 309,  visible: false },
  { n: '05', title: 'Metralla',        file: null,                               duration: null, visible: false },
];

const SHOW_LOCKED_TRACKS = true;

/* ========================================================================== */

/* Medición: cada clic en un elemento con data-event y cada play emiten un
   CustomEvent "refugio:event". Para conectar analítica más adelante:
   document.addEventListener('refugio:event', (e) => { e.detail.event, e.detail.label }) */
function emit(event, label) {
  document.dispatchEvent(new CustomEvent('refugio:event', { detail: { event, label } }));
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-event]');
  if (el) emit(el.dataset.event, el.dataset.label || null);
});

const ICON_PLAY = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
const ICON_PAUSE = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z"/></svg>';

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  s = Math.floor(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function initPlayer(root) {
  const audio = root.querySelector('.player__audio');
  const list = root.querySelector('.tracklist');
  const toggle = root.querySelector('.player__toggle');
  const titleEl = root.querySelector('.player__title');
  const currentEl = root.querySelector('.player__current');
  const durationEl = root.querySelector('.player__duration');
  const seek = root.querySelector('.player__seek');
  const steps = root.querySelectorAll('.player__step');

  const playable = TRACKS.filter((t) => t.visible && t.file);
  const rows = new Map();
  let index = -1;
  let dragging = false;

  for (const t of TRACKS) {
    const isPlayable = playable.includes(t);
    if (!isPlayable && !SHOW_LOCKED_TRACKS) continue;

    const li = document.createElement('li');
    li.className = 'track' + (isPlayable ? '' : ' track--locked');
    const inner = `
      <span class="track__n">${t.n}</span>
      <span class="track__title">${t.title}</span>
      <span class="track__dur">${isPlayable ? fmt(t.duration) : ''}</span>
      <span class="track__state">${isPlayable ? ICON_PLAY + '<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</span>`;

    if (isPlayable) {
      li.innerHTML = `<button class="track__btn" type="button">${inner}</button>`;
      const btn = li.firstElementChild;
      btn.setAttribute('aria-label', `Reproducir ${t.title}`);
      btn.addEventListener('click', () => {
        const i = playable.indexOf(t);
        if (i === index) togglePlay(); else load(i, true);
      });
      rows.set(t, li);
    } else {
      li.innerHTML = `<div class="track__static">${inner}<span class="sr-only">(no disponible en esta escucha)</span></div>`;
    }
    list.appendChild(li);
  }

  if (!playable.length) {
    root.querySelector('.player__now').hidden = true;
    return;
  }

  function render() {
    const playing = !audio.paused && !audio.ended;
    const t = playable[index];
    root.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', `${playing ? 'Pausar' : 'Reproducir'} ${t.title}`);

    rows.forEach((li, track) => {
      const current = track === t;
      const btn = li.firstElementChild;
      li.classList.toggle('is-current', current);
      li.classList.toggle('is-playing', current && playing);
      btn.setAttribute('aria-label', `${current && playing ? 'Pausar' : 'Reproducir'} ${track.title}`);
      btn.setAttribute('aria-current', current ? 'true' : 'false');
      li.querySelector('.track__state .icon').outerHTML = current && playing ? ICON_PAUSE : ICON_PLAY;
    });

    steps[0].disabled = index <= 0;
    steps[1].disabled = index >= playable.length - 1;
  }

  function setProgress(time, total) {
    seek.max = Math.floor(total) || 0;
    if (!dragging) seek.value = Math.floor(time);
    seek.style.setProperty('--progress', total ? `${(time / total) * 100}%` : '0%');
    seek.setAttribute('aria-valuetext', `${fmt(time)} de ${fmt(total)}`);
    currentEl.textContent = fmt(time);
    durationEl.textContent = fmt(total);
  }

  function load(i, autoplay) {
    index = i;
    const t = playable[i];
    audio.src = t.file;
    titleEl.textContent = t.title;
    setProgress(0, t.duration);
    if (autoplay) play();
    render();
    updateMediaSession(t);
  }

  function play() {
    // play() debe llamarse dentro del gesto del usuario (requisito de Safari iOS)
    const p = audio.play();
    if (p) p.catch(() => render());
    emit('play_track', playable[index].title);
  }

  function togglePlay() {
    if (audio.paused) play(); else audio.pause();
  }

  function updateMediaSession(t) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: 'REFUGIØ', album: 'Heridumbre' });
  }

  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', play);
    ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('previoustrack', () => index > 0 && load(index - 1, true));
    ms.setActionHandler('nexttrack', () => index < playable.length - 1 && load(index + 1, true));
  }

  toggle.addEventListener('click', togglePlay);
  steps.forEach((b) => b.addEventListener('click', () => {
    const next = index + Number(b.dataset.step);
    if (next >= 0 && next < playable.length) load(next, !audio.paused);
  }));

  seek.addEventListener('pointerdown', () => { dragging = true; });
  seek.addEventListener('pointerup', () => { dragging = false; });
  seek.addEventListener('input', () => {
    const total = audio.duration || playable[index].duration;
    setProgress(Number(seek.value), total);
    if (audio.readyState > 0) audio.currentTime = Number(seek.value);
  });
  // Si se busca antes de cargar el audio, se aplica cuando hay metadatos
  audio.addEventListener('loadedmetadata', () => {
    if (Number(seek.value) > 0 && audio.currentTime === 0) audio.currentTime = Number(seek.value);
    setProgress(audio.currentTime, audio.duration);
  });

  audio.addEventListener('timeupdate', () => setProgress(audio.currentTime, audio.duration || playable[index].duration));
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', () => {
    if (index < playable.length - 1) load(index + 1, true);
    else { audio.currentTime = 0; render(); }
  });

  load(0, false);
}

const playerRoot = document.querySelector('.player');
if (playerRoot) initPlayer(playerRoot);

/* Videoclips: el iframe (youtube-nocookie) solo se carga al pulsar.
   Sin JS, el enlace abre el vídeo en YouTube. */
document.querySelectorAll('.video__poster').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.player__audio')?.pause();
    const frame = document.createElement('div');
    frame.className = 'video__frame';
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${link.dataset.video}?autoplay=1&rel=0"
      title="Videoclip de ${link.dataset.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen></iframe>`;
    link.replaceWith(frame);
    frame.querySelector('iframe').focus();
  });
});
