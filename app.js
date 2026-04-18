(function () {
  'use strict';

  /* ============================================
     DOM REFERENCES
     ============================================ */
  const audio         = document.getElementById('audio-engine');
  const vinyl         = document.getElementById('vinyl');
  const tonearmPivot  = document.getElementById('tonearm-pivot');
  const tonearmAssembly = document.getElementById('tonearm-assembly');
  const btnPlayPause  = document.getElementById('btn-play-pause');
  const btnPrev       = document.getElementById('btn-prev');
  const btnNext       = document.getElementById('btn-next');
  const progressContainer = document.getElementById('progress-container');
  const progressFill  = document.getElementById('progress-fill');
  const progressThumb = document.getElementById('progress-thumb');
  const timeDisplay   = document.getElementById('time-display');
  const volumeSlider  = document.getElementById('volume-slider');
  const volumeIcon    = document.getElementById('volume-icon');
  const trackList     = document.getElementById('track-list');
  const npTitle       = document.getElementById('np-title');
  const npArtist      = document.getElementById('np-artist');
  const labelTitle    = document.getElementById('label-title');
  const labelArtist   = document.getElementById('label-artist');
  const fileInput     = document.getElementById('file-input');

  /* ============================================
     STATE MACHINE
     ============================================ */
  const S = { STOPPED: 'stopped', PAUSED: 'paused', PLAYING: 'playing' };

  const state = {
    current: S.STOPPED,
    trackIndex: 0,
    isScrubbing: false,
    mutedVolume: null,
    objectUrls: [],
  };

  function transition(newState) {
    state.current = newState;
    document.body.className = `state-${newState}`;
  }

  /* ============================================
     TRACK DATA
     ============================================ */
  const TRACKS = [
    {
      title: 'Song 1',
      artist: 'SoundHelix',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      labelColor: '#b8301f',
    },
    {
      title: 'Song 2',
      artist: 'SoundHelix',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      labelColor: '#1a5080',
    },
    {
      title: 'Song 3',
      artist: 'SoundHelix',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      labelColor: '#2a6040',
    },
    {
      title: 'Song 4',
      artist: 'SoundHelix',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      labelColor: '#603010',
    },
    {
      title: 'Song 5',
      artist: 'SoundHelix',
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      labelColor: '#501840',
    },
  ];

  /* ============================================
     TONEARM GEOMETRY
     ============================================ */
  const ARM_REST_DEG  = 28;
  const ARM_START_DEG = 3;
  const ARM_END_DEG   = 22;

  function updateTonearmAngle() {
    if (!audio.duration || state.current !== S.PLAYING) return;
    const progress = audio.currentTime / audio.duration;
    const angle = ARM_START_DEG + (ARM_END_DEG - ARM_START_DEG) * progress;
    tonearmPivot.style.transform = `rotate(${angle}deg)`;
  }

  function resetTonearmToPlayStart() {
    tonearmPivot.style.transform = `rotate(${ARM_START_DEG}deg)`;
  }

  /* ============================================
     VINYL RESET
     ============================================ */
  function snapVinylReset() {
    vinyl.style.transition = 'none';
    vinyl.style.animation = 'none';
    vinyl.style.transform = 'rotate(0deg)';
    void vinyl.offsetWidth; // force reflow
    vinyl.style.transition = '';
    vinyl.style.animation = '';
  }

  /* ============================================
     NEEDLE BOUNCE
     ============================================ */
  function triggerNeedleBounce() {
    tonearmAssembly.classList.remove('needle-settling');
    void tonearmAssembly.offsetWidth;
    tonearmAssembly.classList.add('needle-settling');
    setTimeout(() => tonearmAssembly.classList.remove('needle-settling'), 500);
  }

  /* ============================================
     PLAYBACK FUNCTIONS
     ============================================ */
  function loadTrack(index) {
    state.trackIndex = index;
    const track = TRACKS[index];

    audio.src = track.src;
    audio.load();

    labelTitle.textContent  = track.title;
    labelArtist.textContent = track.artist;
    npTitle.textContent     = track.title;
    npArtist.textContent    = track.artist;

    const label = document.getElementById('record-label');
    if (label) label.style.background = '';

    updateActiveItem(index);
    updateProgressBar(0);
    updateTimeDisplay(0, 0);
    transition(S.STOPPED);
    snapVinylReset();

    tonearmPivot.style.transition = 'none';
    tonearmPivot.style.transform  = `rotate(${ARM_REST_DEG}deg)`;
    void tonearmPivot.offsetWidth;
    tonearmPivot.style.transition = '';
  }

  function playTrack() {
    audio.play()
      .then(() => {
        transition(S.PLAYING);
        triggerNeedleBounce();
      })
      .catch((err) => console.warn('Playback error:', err));
  }

  function pauseTrack() {
    audio.pause();
    transition(S.PAUSED);
  }

  function stopTrack() {
    audio.pause();
    audio.currentTime = 0;
    transition(S.STOPPED);
    snapVinylReset();
    updateProgressBar(0);
    updateTimeDisplay(0, audio.duration || 0);
  }

  function prevTrack() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      const prev = (state.trackIndex - 1 + TRACKS.length) % TRACKS.length;
      loadTrack(prev);
      playTrack();
    }
  }

  function nextTrack() {
    const next = (state.trackIndex + 1) % TRACKS.length;
    loadTrack(next);
    playTrack();
  }

  function togglePlayPause() {
    if (state.current === S.PLAYING) {
      pauseTrack();
    } else {
      if (state.current === S.STOPPED) {
        resetTonearmToPlayStart();
      }
      playTrack();
    }
  }

  /* ============================================
     PROGRESS & TIME
     ============================================ */
  function updateProgressBar(progress) {
    const pct = (progress * 100).toFixed(2) + '%';
    progressFill.style.width  = pct;
    progressThumb.style.left  = pct;
  }

  function updateTimeDisplay(current, duration) {
    timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration || 0)}`;
  }

  function getProgressFromEvent(e) {
    const rect = progressContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function seekTo(progress) {
    if (!audio.duration) return;
    audio.currentTime = progress * audio.duration;
    updateProgressBar(progress);
    if (state.current === S.PLAYING) updateTonearmAngle();
    updateTimeDisplay(audio.currentTime, audio.duration);
  }

  /* ============================================
     TRACK LIST
     ============================================ */
  function renderTrackList() {
    trackList.innerHTML = TRACKS.map((track, i) => `
      <li class="track-item ${i === state.trackIndex ? 'active' : ''}" data-index="${i}">
        <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="track-info">
          <span class="track-name">${escapeHtml(track.title)}</span>
          <span class="track-artist">${escapeHtml(track.artist)}</span>
        </span>
        <span class="track-duration">${track.duration ? formatTime(track.duration) : '—'}</span>
      </li>
    `).join('');
  }

  function updateActiveItem(index) {
    document.querySelectorAll('.track-item').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });
  }

  /* ============================================
     LOCAL FILE UPLOAD
     ============================================ */
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    state.objectUrls.push(url);

    const name = file.name.replace(/\.[^.]+$/, '');
    TRACKS.unshift({
      title: name,
      artist: 'Local',
      src: url,
      labelColor: '#285070',
      isLocal: true,
    });

    renderTrackList();
    loadTrack(0);
    playTrack();

    fileInput.value = '';
  });

  /* ============================================
     VOLUME
     ============================================ */
  volumeSlider.addEventListener('input', () => {
    audio.volume = parseFloat(volumeSlider.value);
    updateVolumeIcon(audio.volume);
  });

  volumeIcon.addEventListener('click', () => {
    if (audio.volume > 0) {
      state.mutedVolume = audio.volume;
      audio.volume = 0;
      volumeSlider.value = 0;
    } else {
      audio.volume = state.mutedVolume || 0.8;
      volumeSlider.value = audio.volume;
    }
    updateVolumeIcon(audio.volume);
  });

  function updateVolumeIcon(vol) {
    if (vol === 0) volumeIcon.textContent = '🔇';
    else if (vol < 0.4) volumeIcon.textContent = '🔉';
    else volumeIcon.textContent = '🔊';
  }

  /* ============================================
     AUDIO EVENTS
     ============================================ */
  audio.addEventListener('timeupdate', () => {
    if (state.isScrubbing || !audio.duration) return;
    const progress = audio.currentTime / audio.duration;
    updateProgressBar(progress);
    updateTonearmAngle();
    updateTimeDisplay(audio.currentTime, audio.duration);
  });

  audio.addEventListener('loadedmetadata', () => {
    updateTimeDisplay(0, audio.duration);
    const idx = state.trackIndex;
    if (TRACKS[idx]) {
      TRACKS[idx].duration = audio.duration;
      document.querySelectorAll('.track-item').forEach((el, i) => {
        if (i === idx) {
          const durEl = el.querySelector('.track-duration');
          if (durEl) durEl.textContent = formatTime(audio.duration);
        }
      });
    }
  });

  audio.addEventListener('ended', () => {
    nextTrack();
  });

  audio.addEventListener('error', () => {
    console.warn('Audio error on:', audio.src);
    transition(S.STOPPED);
  });

  /* ============================================
     BUTTON EVENTS
     ============================================ */
  btnPlayPause.addEventListener('click', togglePlayPause);
  btnPrev.addEventListener('click', prevTrack);
  btnNext.addEventListener('click', nextTrack);

  /* ============================================
     PROGRESS BAR SCRUBBING
     ============================================ */
  progressContainer.addEventListener('mousedown', (e) => {
    state.isScrubbing = true;
    seekTo(getProgressFromEvent(e));
  });

  progressContainer.addEventListener('touchstart', (e) => {
    state.isScrubbing = true;
    seekTo(getProgressFromEvent(e));
  }, { passive: true });

  document.addEventListener('mousemove', (e) => {
    if (!state.isScrubbing) return;
    seekTo(getProgressFromEvent(e));
  });

  document.addEventListener('touchmove', (e) => {
    if (!state.isScrubbing) return;
    seekTo(getProgressFromEvent(e));
  }, { passive: true });

  document.addEventListener('mouseup', () => { state.isScrubbing = false; });
  document.addEventListener('touchend', () => { state.isScrubbing = false; });

  /* ============================================
     TRACK LIST CLICK
     ============================================ */
  trackList.addEventListener('click', (e) => {
    const item = e.target.closest('.track-item');
    if (!item) return;
    const index = parseInt(item.dataset.index, 10);
    if (index === state.trackIndex && state.current === S.PLAYING) {
      pauseTrack();
    } else {
      loadTrack(index);
      playTrack();
    }
  });

  /* ============================================
     KEYBOARD SHORTCUTS
     ============================================ */
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case ' ': e.preventDefault(); togglePlayPause(); break;
      case 'ArrowRight': audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); break;
      case 'ArrowLeft':  audio.currentTime = Math.max(0, audio.currentTime - 5); break;
      case 'ArrowUp':    audio.volume = Math.min(1, audio.volume + 0.05); volumeSlider.value = audio.volume; updateVolumeIcon(audio.volume); break;
      case 'ArrowDown':  audio.volume = Math.max(0, audio.volume - 0.05); volumeSlider.value = audio.volume; updateVolumeIcon(audio.volume); break;
      case 'n': case 'N': nextTrack(); break;
      case 'p': case 'P': prevTrack(); break;
    }
  });

  /* ============================================
     HELPERS
     ============================================ */
  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function lighten(hex) {
    return blendColor(hex, '#ffffff', 0.25);
  }

  function darken(hex) {
    return blendColor(hex, '#000000', 0.3);
  }

  function blendColor(hex, with_, amount) {
    const p = (h) => parseInt(h, 16);
    const h = hex.replace('#', '');
    const w = with_.replace('#', '');
    const r = Math.round(p(h.slice(0,2)) * (1-amount) + p(w.slice(0,2)) * amount);
    const g = Math.round(p(h.slice(2,4)) * (1-amount) + p(w.slice(2,4)) * amount);
    const b = Math.round(p(h.slice(4,6)) * (1-amount) + p(w.slice(4,6)) * amount);
    return `rgb(${r},${g},${b})`;
  }

  /* ============================================
     INIT
     ============================================ */
  function init() {
    audio.volume = parseFloat(volumeSlider.value);
    renderTrackList();
    loadTrack(0);
  }

  document.addEventListener('DOMContentLoaded', init);

})();
