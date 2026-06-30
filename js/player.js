/**
 * KYCA Player — StreamGuys audio (with ads) + schedule-aware Watch Live video
 * Persists across page navigation via localStorage
 */
(function() {
  var STREAM_URL       = 'http://ophanim.net:8444/s/8030';
  var STREAMGUYS_URL   = 'https://player.streamguys.com/prescott/kyca/sgplayer/player.php';
  var API_URL          = 'https://pbc-cms-production.up.railway.app';
  var STORAGE_KEY      = 'kyca_player_open';
  var VOL_KEY          = 'kyca_volume';
  var POLL_INTERVAL    = 5 * 60 * 1000; // check schedule every 5 min

  // ── Inject CSS ──────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `
    #kyca-player-widget {
      position: fixed;
      bottom: -420px;
      right: 24px;
      width: 320px;
      background: #032a48;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 -4px 32px rgba(0,0,0,0.45);
      z-index: 99999;
      transition: bottom 0.35s cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
      border-bottom: none;
    }
    #kyca-player-widget.visible { bottom: 0; }

    /* Header bar */
    #kyca-player-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #021d35;
      border-bottom: 2px solid #c0392b;
      cursor: pointer;
      user-select: none;
    }
    #kyca-player-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #kyca-player-logo-img {
      height: 28px;
      width: auto;
      object-fit: contain;
    }
    .kyca-live-dot {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #c0392b;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 3px;
    }
    .kyca-live-dot::before {
      content: '';
      width: 5px; height: 5px;
      background: #fff;
      border-radius: 50%;
      animation: kyca-pulse 1.2s ease-in-out infinite;
    }
    @keyframes kyca-pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:.4; transform:scale(.7); }
    }
    #kyca-player-header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #kyca-minimize-btn, #kyca-close-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      font-size: 16px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;
      transition: color .15s, background .15s;
    }
    #kyca-minimize-btn:hover, #kyca-close-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
    }

    /* On-air info bar */
    #kyca-on-air-bar {
      padding: 8px 14px;
      background: rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    #kyca-on-air-show {
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #kyca-watch-live-btn {
      display: none;
      align-items: center;
      gap: 5px;
      background: #c0392b;
      color: #fff;
      border: none;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .05em;
      text-transform: uppercase;
      padding: 5px 10px;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background .15s;
      animation: kyca-pulse-btn 2s ease-in-out infinite;
    }
    #kyca-watch-live-btn:hover { background: #a93226; animation: none; }
    @keyframes kyca-pulse-btn {
      0%,100% { box-shadow: 0 0 0 0 rgba(192,57,43,0.5); }
      50%      { box-shadow: 0 0 0 6px rgba(192,57,43,0); }
    }

    /* Player iframe area */
    #kyca-player-body {
      position: relative;
      width: 100%;
      background: #000;
    }
    #kyca-player-iframe {
      width: 100%;
      height: 220px;
      border: none;
      display: block;
    }
    /* Video mode — taller */
    #kyca-player-widget.video-mode #kyca-player-iframe {
      height: 280px;
    }
    #kyca-player-widget.video-mode {
      width: 380px;
    }

    /* Audio controls */
    #kyca-audio-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #021d35;
    }
    #kyca-play-btn {
      width: 42px; height: 42px;
      border-radius: 50%;
      background: #c0392b;
      border: none;
      cursor: pointer;
      color: #fff;
      font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background .15s, transform .1s;
    }
    #kyca-play-btn:hover { background: #a93226; transform: scale(1.07); }
    #kyca-audio-info { flex: 1; min-width: 0; }
    #kyca-track-label {
      font-size: 12px;
      color: rgba(255,255,255,0.7);
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #kyca-vol-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #kyca-vol-icon {
      color: rgba(255,255,255,0.5);
      font-size: 13px;
      cursor: pointer;
      user-select: none;
    }
    #kyca-vol {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }
    #kyca-vol::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #c0392b;
      cursor: pointer;
    }
    #kyca-vol::-moz-range-thumb {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #c0392b;
      border: none;
    }
    #kyca-player-widget.video-mode #kyca-audio-mode { display: none; }

    /* Back to audio button (shown in video mode) */
    #kyca-back-audio-btn {
      display: none;
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: none;
      border-top: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.5);
      font-size: 11px;
      padding: 6px;
      cursor: pointer;
      text-align: center;
      transition: color .15s;
    }
    #kyca-back-audio-btn:hover { color: #fff; }
    #kyca-player-widget.video-mode #kyca-back-audio-btn { display: block; }

    body.kyca-player-open { padding-bottom: 0; }

    @media (max-width: 400px) {
      #kyca-player-widget { width: calc(100vw - 16px); right: 8px; }
      #kyca-player-widget.video-mode { width: calc(100vw - 16px); }
    }
  `;
  document.head.appendChild(style);

  // ── Build HTML ───────────────────────────────────────────────
  var widget = document.createElement('div');
  widget.id = 'kyca-player-widget';
  widget.innerHTML = `
    <div id="kyca-player-header">
      <div id="kyca-player-header-left">
        <img id="kyca-player-logo-img" src="/images/logo-kyca.png" onerror="this.style.display='none'" alt="KYCA" />
        <span class="kyca-live-dot">Live</span>
      </div>
      <div id="kyca-player-header-right">
        <button id="kyca-minimize-btn" title="Minimize">&#8211;</button>
        <button id="kyca-close-btn" title="Close">&#10005;</button>
      </div>
    </div>
    <div id="kyca-on-air-bar">
      <span id="kyca-on-air-show">KYCA 1490 AM</span>
      <button id="kyca-watch-live-btn">&#128250; Watch Live</button>
    </div>
    <div id="kyca-player-body">
      <!-- Visible: audio controls or video embed -->
      <div id="kyca-audio-mode">
        <audio id="kyca-audio" preload="none" style="display:none"></audio>
        <div id="kyca-audio-controls">
          <button id="kyca-play-btn">&#9654;</button>
          <div id="kyca-audio-info">
            <div id="kyca-track-label">Live Stream</div>
            <div id="kyca-vol-row">
              <span id="kyca-vol-icon">&#128266;</span>
              <input type="range" id="kyca-vol" min="0" max="1" step="0.02" value="1" />
            </div>
          </div>
        </div>
      </div>
      <iframe id="kyca-player-iframe"
        src=""
        allow="autoplay; fullscreen"
        allowfullscreen
        scrolling="no"
        style="width:100%;border:none;display:none;height:280px;">
      </iframe>
      <button id="kyca-back-audio-btn">&#8592; Back to audio</button>
      <!-- Hidden StreamGuys iframe — satisfies streaming contract -->
      <iframe id="kyca-sg-iframe"
        src=""
        style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;top:0;left:0;"
        tabindex="-1"
        aria-hidden="true">
      </iframe>
    </div>
  `;
  document.body.appendChild(widget);

  var watchBtn     = document.getElementById('kyca-watch-live-btn');
  var backAudioBtn = document.getElementById('kyca-back-audio-btn');
  var onAirShow    = document.getElementById('kyca-on-air-show');
  var header       = document.getElementById('kyca-player-header');

  var isOpen       = false;
  var isMinimized  = false;
  var isVideoMode  = false;
  var isPlaying    = false;
  var currentVideoUrl = null;
  var pollTimer    = null;

  var audio    = document.getElementById('kyca-audio');
  var iframe   = document.getElementById('kyca-player-iframe');
  var sgIframe = document.getElementById('kyca-sg-iframe');
  var playBtn  = document.getElementById('kyca-play-btn');
  var volSlider = document.getElementById('kyca-vol');
  var volIcon   = document.getElementById('kyca-vol-icon');
  var trackLabel = document.getElementById('kyca-track-label');

  // Restore volume
  var savedVol = parseFloat(localStorage.getItem(VOL_KEY) || '1');
  audio.volume = savedVol;
  volSlider.value = savedVol;

  function startAudio() {
    audio.src = STREAM_URL;
    audio.load();
    audio.play().then(function() {
      isPlaying = true;
      playBtn.innerHTML = '&#9646;&#9646;';
      trackLabel.textContent = 'Live Stream';
    }).catch(function() {
      isPlaying = false;
      playBtn.innerHTML = '&#9654;';
      trackLabel.textContent = 'Click play to listen';
    });
  }

  function stopAudio() {
    audio.pause();
    audio.src = '';
    isPlaying = false;
    playBtn.innerHTML = '&#9654;';
    trackLabel.textContent = 'Paused';
  }

  playBtn.addEventListener('click', function() {
    if (isPlaying) { stopAudio(); } else { startAudio(); }
  });

  volSlider.addEventListener('input', function() {
    audio.volume = parseFloat(this.value);
    localStorage.setItem(VOL_KEY, this.value);
    updateVolIcon();
  });

  volIcon.addEventListener('click', function() {
    audio.muted = !audio.muted;
    updateVolIcon();
  });

  function updateVolIcon() {
    if (audio.muted || audio.volume === 0) volIcon.innerHTML = '&#128263;';
    else if (audio.volume < 0.5) volIcon.innerHTML = '&#128265;';
    else volIcon.innerHTML = '&#128266;';
  }

  // ── Player state ─────────────────────────────────────────────
  function openPlayer() {
    if (!isOpen) {
      isOpen = true;
      localStorage.setItem(STORAGE_KEY, '1');
      // Start audio stream
      startAudio();
      // Load hidden StreamGuys iframe (contract requirement)
      sgIframe.src = STREAMGUYS_URL;
    }
    widget.classList.add('visible');
    widget.style.bottom = '';
    isMinimized = false;
  }

  function minimizePlayer() {
    isMinimized = true;
    widget.style.bottom = '-' + (widget.offsetHeight - 44) + 'px';
  }

  function closePlayer() {
    stopAudio();
    iframe.src = '';
    sgIframe.src = '';
    isOpen = false;
    isVideoMode = false;
    widget.classList.remove('visible', 'video-mode');
    widget.style.bottom = '';
    localStorage.removeItem(STORAGE_KEY);
    if (pollTimer) clearInterval(pollTimer);
  }

  function switchToVideo(url) {
    currentVideoUrl = url;
    isVideoMode = true;
    widget.classList.add('video-mode');
    iframe.style.display = 'block';
    iframe.src = toEmbedUrl(url);
    // Keep audio running underneath
  }

  function switchToAudio() {
    isVideoMode = false;
    widget.classList.remove('video-mode');
    widget.style.bottom = '';
    iframe.style.display = 'none';
    iframe.src = '';
    currentVideoUrl = null;
  }

  function toEmbedUrl(url) {
    if (!url) return url;
    // YouTube: watch?v=ID or youtu.be/ID → embed/ID
    var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1';
    // Vimeo event: vimeo.com/event/ID → player.vimeo.com/video/ID
    var vimeoEvent = url.match(/vimeo\.com\/event\/(\d+)/);
    if (vimeoEvent) return 'https://vimeo.com/event/' + vimeoEvent[1] + '/embed';
    // Vimeo video: vimeo.com/ID
    var vimeoVideo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoVideo) return 'https://player.vimeo.com/video/' + vimeoVideo[1] + '?autoplay=1';
    // Already an embed URL or unknown — use as-is
    return url;
  }

  // ── Schedule check ───────────────────────────────────────────
  function checkSchedule() {
    var now = new Date();
    var day = now.getDay(); // 0=Sun, 1=Mon...
    var hour = now.getHours();
    var dayGroups = {
      0:'sun', 1:'mon-fri', 2:'mon-fri', 3:'mon-fri', 4:'mon-fri', 5:'mon-fri', 6:'sat'
    };
    var dayGroup = dayGroups[day];

    fetch(API_URL + '/api/schedule/kyca')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var slots = data.slots || [];
        var current = null;
        for (var i = 0; i < slots.length; i++) {
          var s = slots[i];
          if (s.day_group === dayGroup && s.start_hour <= hour && s.end_hour > hour) {
            current = s;
            break;
          }
        }
        if (current) {
          onAirShow.textContent = '▶ ' + current.name;
          if (current.video_url) {
            watchBtn.style.display = 'inline-flex';
            watchBtn.onclick = function() { switchToVideo(current.video_url); };
          } else {
            watchBtn.style.display = 'none';
            // If we were in video mode for a previous show, switch back
            if (isVideoMode) switchToAudio();
          }
        } else {
          onAirShow.textContent = 'KYCA 1490 AM';
          watchBtn.style.display = 'none';
          if (isVideoMode) switchToAudio();
        }
      })
      .catch(function() {});
  }

  // ── Wire up buttons ──────────────────────────────────────────
  document.getElementById('kyca-minimize-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    if (isMinimized) { openPlayer(); } else { minimizePlayer(); }
  });

  document.getElementById('kyca-close-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    closePlayer();
  });

  backAudioBtn.addEventListener('click', switchToAudio);

  // Click header to restore if minimized
  header.addEventListener('click', function() {
    if (isMinimized) openPlayer();
  });

  // ── Hook all Listen Live links ───────────────────────────────
  function hookListenLinks() {
    document.querySelectorAll('a[href*="streamguys"], [data-listen]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        openPlayer();
        checkSchedule();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(checkSchedule, POLL_INTERVAL);
      });
    });
  }

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    hookListenLinks();

    // Resume if was open before navigation
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      openPlayer();
      checkSchedule();
      pollTimer = setInterval(checkSchedule, POLL_INTERVAL);
    }
  });

})();
