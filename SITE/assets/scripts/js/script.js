/* ================================================================
   THE WATANAGASHI ARCHIVE — script.js
   ================================================================ */

const FALLBACK_BG     = 'assets/images/MUSICPLAYERPLAYLISTDEFAULTBACKGROUND.png';
const INTRO_VIDEO_URL = 'assets/video/USODA!.mp4';
const NOT_FOUND_URL   = 'not_found.html';
const BG_DARK_URL     = 'assets/images/background/whitebg.jpeg';
const LIKE_ICON_URL   = 'https://img1.picmix.com/output/stamp/normal/1/7/9/0/2890971_aea86.png';

const ICON_LIKE    = 'https://cdn-icons-png.flaticon.com/128/739/739231.png';
const ICON_DISLIKE = 'https://cdn-icons-png.flaticon.com/128/880/880613.png';

const MUSIC_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBBr6zPaWgGNcGHz9iiNTO8O4EgAzsUMOk",
  authDomain:        "scrapfielddatabase.firebaseapp.com",
  databaseURL:       "https://scrapfielddatabase-default-rtdb.firebaseio.com",
  projectId:         "scrapfielddatabase",
  storageBucket:     "scrapfielddatabase.firebasestorage.app",
  messagingSenderId: "489751764776",
  appId:             "1:489751764776:web:22255a1e9bf05a538bfa1d",
};

const TRACKS        = [];
const PLAYLIST_META = [];

let curIdx    = -1;
let isPlaying = false;
let shuffleOn = false;
let loopOn    = false;
let artHidden = false;
let prevVol   = 30;

let _trackDuration  = 0;
let _trackStartTime = 0;
let _endTimer       = null;
let _pollTimer      = null;

const $ = id => document.getElementById(id);

let PLAY_IMG, PROG_FILL, PROG_INPUT, TIME_LEFT, AUDIO_NAME,
    VOL_RANGE, VOL_IND, VOL_IMG, VOL_FILL,
    DISK, MUSIC_BG, PLAYLIST_EL, VIZ, ctx2d, DOWNLOAD, YT_IFRAME;

let _currentPage = 'introduction';

/* ================================================================
   PREFERENCES
   ================================================================ */
const PREFS = {
  alwaysHideRena:    false,
  alwaysSkipIntro:   true,
  introSound:        false,
  alwaysAutoplay:    false,
  hideRenaUnlocked:  false,
  themesUnlocked:    false,
  showMusicOfWeek:   true,
  showMostRated:     true,
  showLikes:         true,
  musicSort:         'newest',
  videoSort:         'default',
  gallerySort:       'newest',
  layoutAlign:       'left',
  adaptiveAccent:    true,
  soundsOn:          true,

  load() {
    try {
      const s = JSON.parse(localStorage.getItem('_scrapPrefs') || '{}');
      this.alwaysHideRena   = !!s.alwaysHideRena;
      this.alwaysSkipIntro  = s.alwaysSkipIntro !== false;
      this.introSound       = !!s.introSound;
      this.alwaysAutoplay   = !!s.alwaysAutoplay;
      this.hideRenaUnlocked = !!s.hideRenaUnlocked;
      this.themesUnlocked   = !!s.themesUnlocked;
      this.showMusicOfWeek  = s.showMusicOfWeek !== false;
      this.showMostRated    = s.showMostRated    !== false;
      this.showLikes        = s.showLikes        !== false;
      this.musicSort        = s.musicSort   || 'newest';
      this.videoSort        = s.videoSort   || 'newest';
      this.gallerySort      = s.gallerySort || 'newest';
      this.layoutAlign      = s.layoutAlign || 'left';
      this.adaptiveAccent   = s.adaptiveAccent !== false;
      this.soundsOn         = s.soundsOn !== false;
    } catch(e) {}
  },
  save() {
    try {
      localStorage.setItem('_scrapPrefs', JSON.stringify({
        alwaysHideRena:  this.alwaysHideRena,
        alwaysSkipIntro: this.alwaysSkipIntro,
        introSound:      this.introSound,
        alwaysAutoplay:  this.alwaysAutoplay,
        hideRenaUnlocked:this.hideRenaUnlocked,
        themesUnlocked:  this.themesUnlocked,
        showMusicOfWeek: this.showMusicOfWeek,
        showMostRated:   this.showMostRated,
        showLikes:       this.showLikes,
        musicSort:       this.musicSort,
        videoSort:       this.videoSort,
        gallerySort:     this.gallerySort,
        layoutAlign:     this.layoutAlign,
        adaptiveAccent:  this.adaptiveAccent,
        soundsOn:        this.soundsOn,
      }));
    } catch(e) {}
  }
};

/* ================================================================
   DARK THEME BACKGROUND
   ================================================================ */
function applyDarkThemeBg() {
  const old = document.getElementById('_darkThemeBgStyle');
  if (old) old.remove();
  const s = document.createElement('style');
  s.id = '_darkThemeBgStyle';
  s.textContent = ` 
    body {
      background-image: url('${BG_DARK_URL}');
      background-size: 74% !important;
      background-attachment: fixed !important;
      background-repeat: no-repeat !important;
      background-position: center center !important;
    }
    :root[data-theme="legacy"] body,
    body[data-theme="legacy"] {
      background-image: url('assets/images/SITEBACKGROUND.png') !important;
    }
  `;
  document.head.appendChild(s);
  /* Re-apply adaptive accent when background changes */
  if (_adaptiveAccentActive) {
    if (_adaptiveAccentRefreshTimer) clearTimeout(_adaptiveAccentRefreshTimer);
    _adaptiveAccentRefreshTimer = setTimeout(() => {
      if (_adaptiveAccentActive) applyAdaptiveAccent(true);
    }, 600);
  }
}

/* ================================================================
   LAYOUT ALIGNMENT
   ================================================================ */
function applyLayoutAlign(align) {
  const body = document.body;
  if (align === 'left') {
    body.style.justifyContent = 'flex-start';
    body.style.paddingLeft = '12px';
    body.style.paddingRight = '6px';
  } else if (align === 'right') {
    body.style.justifyContent = 'flex-end';
    body.style.paddingRight = '12px';
    body.style.paddingLeft = '6px';
  } else {
    body.style.justifyContent = 'center';
    body.style.paddingLeft = '6px';
    body.style.paddingRight = '6px';
  }
  _patchApplyCharAlign(align);
  _patchApplyFooterAlign(align);
}

/* ================================================================
   ADAPTIVE ACCENT COLOR
   ================================================================ */
let _adaptiveAccentActive  = false;
let _adaptiveAccentObserver = null;
let _adaptiveAccentRefreshTimer = null;

window._vizAccentColor = null;

function _rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}

function _adjustForContrast(r, g, b) {
  const max = Math.max(r,g,b);
  if (max === 0) return [204, 26, 26];
  const scale = 220 / max;
  return [Math.min(255, Math.round(r*scale)), Math.min(255, Math.round(g*scale)), Math.min(255, Math.round(b*scale))];
}

function _getHue(r, g, b) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    if (max===r) hue = ((g-b)/d)*60;
    else if (max===g) hue = ((b-r)/d)*60+120;
    else hue = ((r-g)/d)*60+240;
    if (hue < 0) hue += 360;
  }
  return hue;
}

function _sampleBgColor(cb) {
  const FALLBACK = () => cb(180, 20, 20);
  try {
    const bodyStyle = window.getComputedStyle(document.body);
    const bgImg = bodyStyle.backgroundImage;
    const urlMatch = bgImg && bgImg.match(/url\(["']?([^"')]+)["']?\)/);
    if (!urlMatch) return FALLBACK();
    const img = new Image();
    const timer = setTimeout(FALLBACK, 5000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 48; canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 48, 48);
        const data = ctx.getImageData(0, 0, 48, 48).data;
        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const max = Math.max(r,g,b), min = Math.min(r,g,b);
          if (max < 30 || (max - min) / max < 0.15) continue;
          const key = `${Math.round(r/24)*24},${Math.round(g/24)*24},${Math.round(b/24)*24}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        let best = null, bestN = 0;
        for (const [k, n] of Object.entries(buckets)) {
          if (n > bestN) { bestN = n; best = k; }
        }
        if (best) {
          const [r, g, b] = best.split(',').map(Number);
          cb(r, g, b);
        } else { FALLBACK(); }
      } catch(e) { FALLBACK(); }
    };
    img.onerror = () => { clearTimeout(timer); FALLBACK(); };
    img.crossOrigin = 'anonymous';
    img.src = urlMatch[1];
  } catch(e) { FALLBACK(); }
}

/* Watch background / theme changes and re-apply accent automatically */
function _setupAdaptiveAccentWatcher() {
  if (_adaptiveAccentObserver) return;

  function scheduleRefresh() {
    if (!_adaptiveAccentActive) return;
    if (_adaptiveAccentRefreshTimer) clearTimeout(_adaptiveAccentRefreshTimer);
    _adaptiveAccentRefreshTimer = setTimeout(() => {
      if (_adaptiveAccentActive) applyAdaptiveAccent(true);
    }, 500);
  }

  _adaptiveAccentObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      /* data-theme attribute on <html> */
      if (m.type === 'attributes' && m.target === document.documentElement) {
        scheduleRefresh(); break;
      }
      /* style attribute on body (background-image changed) */
      if (m.type === 'attributes' && m.target === document.body) {
        scheduleRefresh(); break;
      }
      /* <style> tags added/removed in <head> (theme style injection) */
      if (m.type === 'childList' && m.target === document.head) {
        const relevant = [...m.addedNodes, ...m.removedNodes].some(
          n => n.nodeType === 1 && (n.id === '_darkThemeBgStyle' || n.id === '_themeStyle')
        );
        if (relevant) { scheduleRefresh(); break; }
      }
    }
  });

  _adaptiveAccentObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  _adaptiveAccentObserver.observe(document.body,            { attributes: true, attributeFilter: ['style', 'class'] });
  _adaptiveAccentObserver.observe(document.head,            { childList: true });
}

function applyAdaptiveAccent(enable) {
  _adaptiveAccentActive = enable;
  if (!enable) {
    const old = document.getElementById('_adaptiveAccentStyle');
    if (old) old.remove();
    window._vizAccentColor = null;
    document.body.classList.remove('adaptive-accent-on');
    if (_adaptiveAccentObserver) { _adaptiveAccentObserver.disconnect(); _adaptiveAccentObserver = null; }
    return;
  }

  /* Set up watcher so accent refreshes whenever theme/background changes */
  _setupAdaptiveAccentWatcher();

  _sampleBgColor((r, g, b) => {
    if (!_adaptiveAccentActive) return;
    const [ar, ag, ab] = _adjustForContrast(r, g, b);
    const hex  = _rgbToHex(ar, ag, ab);
    const hex2 = _rgbToHex(Math.min(255,ar+28), Math.min(255,ag+28), Math.min(255,ab+28));
    const hue  = _getHue(ar, ag, ab);
    window._vizAccentColor = { r:ar, g:ag, b:ab, hex, hex2, hue };
    const rgba = (a) => `rgba(${ar},${ag},${ab},${a})`;

    const imgFilter = `
body .mp-ctrl-btn img,
body .mp-ctrl-btn .player-img,
body .mp-mute-btn img,
body .mp-loop-btn img,
body .music-header-img {
  filter: hue-rotate(${Math.round(hue)}deg) saturate(1.15) !important;
  -webkit-filter: hue-rotate(${Math.round(hue)}deg) saturate(1.15) !important;
}
body .mp-ctrl-btn:hover img,
body .mp-ctrl-btn:hover .player-img,
body .mp-mute-btn:hover img,
body .mp-loop-btn:hover img {
  filter: hue-rotate(${Math.round(hue)}deg) saturate(1.15) brightness(1.3) !important;
  -webkit-filter: hue-rotate(${Math.round(hue)}deg) saturate(1.15) brightness(1.3) !important;
}`;

    let s = document.getElementById('_adaptiveAccentStyle');
    if (!s) { s = document.createElement('style'); s.id = '_adaptiveAccentStyle'; document.head.appendChild(s); }
    s.textContent = `
:root:not([data-theme="legacy"]) {
  --th-accent:  ${hex} !important;
  --th-accent2: ${hex2} !important;
  --th-sel-bg:  ${rgba(0.75)} !important;
}
#audioName, .activeSong, .mp-time-val, #volumeIndicator { color: ${hex} !important; }
.nav-link.active, .nav-link:hover { color: ${hex} !important; }
a:hover { color: ${hex} !important; }
.pl-group-header { color: ${hex} !important; }
.vi-link-btn, .vi-link-url, .vi-desc-link, .email-contact-link { color: ${hex} !important; }
#mainContent .hl:not(#commPanelBlog *):not([style*="color:#cc"]) { color: ${hex} !important; }
#mainContent strong:not(#commPanelBlog *):not(.comm-wip *) { color: ${hex} !important; }
/* These always stay red — intentional brand elements */
.na-span { color: #cc1a1a !important; }
#commPanelBlog .hl, .comm-wip strong, [style*="color:#cc1a1a"] { color: #cc1a1a !important; }
._nav-badge { background: #cc1a1a !important; }
.gi-avg { color: #ffffff !important; }
/* Community tab active state — override hardcoded red in patch */
.comm-tab.active,
#commTabChat.active,
#commTabBlog.active,
button.comm-tab.active {
  background: linear-gradient(to bottom,
    rgba(255,255,255,.18) 0%,
    rgba(${ar},${ag},${ab},.45) 18%,
    rgba(${Math.round(ar*.55)},${Math.round(ag*.55)},${Math.round(ab*.55)},.85) 60%,
    rgba(${Math.round(ar*.22)},${Math.round(ag*.22)},${Math.round(ab*.22)},.95) 60%,
    rgba(${Math.round(ar*.33)},${Math.round(ag*.33)},${Math.round(ab*.33)},.82) 100%
  ) !important;
  border-color: ${rgba(0.70)} !important;
  color: #fff !important;
}
.comm-ok-btn, a.comm-ok-btn {
  background: linear-gradient(to bottom,
    rgba(255,255,255,.20) 0%,
    rgba(${ar},${ag},${ab},.92) 0%,
    rgba(${Math.round(ar*.7)},${Math.round(ag*.7)},${Math.round(ab*.7)},.82) 4%,
    rgba(${Math.round(ar*.4)},${Math.round(ag*.4)},${Math.round(ab*.4)},.97) 52%,
    rgba(${Math.round(ar*.22)},${Math.round(ag*.22)},${Math.round(ab*.22)},1) 52%,
    rgba(${Math.round(ar*.33)},${Math.round(ag*.33)},${Math.round(ab*.33)},.90) 100%
  ) !important;
  border-color: ${rgba(0.70)} !important;
  border-top-color: rgba(255,255,255,.20) !important;
}
.comm-tab-bar { border-bottom: 2px solid ${rgba(0.50)} !important; }
.comm-tab { border-color: ${rgba(0.45)} !important; }
#mpPlusPopup   { border-color: ${rgba(0.50)} !important; background: rgba(4,4,4,.97) !important; }
#galPlusPopup  { border-color: ${rgba(0.40)} !important; background: rgba(5,5,5,.98) !important; }
#vPlusPopup    { border-color: ${rgba(0.40)} !important; background: rgba(5,5,5,.98) !important; }
#mpSortSubmenu { border-top-color: ${rgba(0.30)} !important; }
#mpPlusPopup div:hover, #mpPlusPopup a:hover { background: rgba(50,50,50,0.80) !important; color: #fff !important; }
#vPlusPopup div:hover, #vPlusPopup a:hover   { background: rgba(50,50,50,0.80) !important; color: #fff !important; }
#galPlusPopup div:hover                       { background: rgba(50,50,50,0.80) !important; color: #fff !important; }
::selection      { background: ${rgba(0.75)} !important; }
::-moz-selection { background: ${rgba(0.75)} !important; }
.gi-card.gi-card-awarded { border-color: ${rgba(0.80)} !important; }
.gi-card:hover { border-color: ${rgba(0.60)} !important; }
.vg-pager-btn.active { border-color: ${rgba(0.70)} !important; color: ${hex} !important; background: rgba(${Math.round(ar/4)},${Math.round(ag/4)},${Math.round(ab/4)},.5) !important; }
.gallery-pager-btn.active { border-color: ${rgba(0.70)} !important; color: ${hex} !important; }
.mp-row-sep { color: ${rgba(0.50)} !important; }
::-webkit-scrollbar-thumb { background: rgba(${Math.round(ar/3.5)},${Math.round(ag/3.5)},${Math.round(ab/3.5)},.60) !important; border-radius:0 !important; }
::-webkit-scrollbar-thumb:hover { background: rgba(${Math.round(ar/2.5)},${Math.round(ag/2.5)},${Math.round(ab/2.5)},.78) !important; }
html { scrollbar-color: rgba(${Math.round(ar/3.5)},${Math.round(ag/3.5)},${Math.round(ab/3.5)},.60) transparent !important; }
/* pref-btn: accent only affects border, NOT background — background controlled by data-active */
#pg-preferences button.pref-btn, #_prefBar button.pref-btn {
  border-color: ${rgba(0.60)} !important;
}
#pg-preferences button.pref-btn[data-active="1"], #_prefBar button.pref-btn[data-active="1"] {
  background: #000000 !important;
  color: #ffffff !important;
  border-color: ${rgba(0.75)} !important;
}
#pg-preferences button.pref-btn[data-active="0"], #_prefBar button.pref-btn[data-active="0"] {
  background: #1a1a1a !important;
  color: rgba(200,200,200,0.8) !important;
}
#pg-preferences button.pref-btn:hover, #_prefBar button.pref-btn:hover {
  border-color: ${rgba(0.85)} !important;
  color: #fff !important;
}
#pg-preferences select, #_prefBar select { border-color: ${rgba(0.60)} !important; }
body.adaptive-accent-on .nav-icons {
  filter: hue-rotate(1deg) saturate(1.05) !important;
  -webkit-filter: hue-rotate(1deg) saturate(1.05) !important;
}
#vPopAutoplayDot.dot-on { background: ${hex} !important; }
.vg-vote-badge { display: none !important; }
${imgFilter}
`;
    document.body.classList.add('adaptive-accent-on');
  });
}

/* ================================================================
   FIREBASE MUSIC RATINGS
   ================================================================ */
const MusicFirebase = {
  db: null, _ready: false,
  _ref: null, _get: null, _set: null, _remove: null, _onValue: null,
  _userId: '',
  _ratings: {},

  init: async function() {
    if (this._ready) return;
    let uid = localStorage.getItem('_musicUserId');
    if (!uid) { uid = 'mu_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('_musicUserId', uid); }
    this._userId = uid;
    try {
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js');
      const { getDatabase, ref, get, set, remove, onValue } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js');
      let app;
      try { app = getApps().find(a => a.name === 'music-ratings'); } catch(e) {}
      if (!app) {
        try { app = initializeApp(MUSIC_FIREBASE_CONFIG, 'music-ratings'); } catch(e) { app = getApps()[0]; }
      }
      this.db = getDatabase(app);
      this._ref = ref; this._get = get; this._set = set; this._remove = remove; this._onValue = onValue;
      this._ready = true;
      const snap = await this._get(this._ref(this.db, 'music/ratings'));
      const val = snap.val();
      if (val) Object.assign(this._ratings, val);
      this._onValue(this._ref(this.db, 'music/ratings'), snapshot => {
        const v = snapshot.val() || {};
        Object.keys(this._ratings).forEach(k => delete this._ratings[k]);
        Object.assign(this._ratings, v);
        if (curIdx >= 0 && TRACKS[curIdx]) updateVoteDisplay(TRACKS[curIdx]);
        buildPlaylist();
      });
    } catch(e) {
      console.warn('[MusicFirebase] Firebase unavailable, using localStorage', e);
      this._ready = false;
    }
  },

  vote: async function(videoId, direction) {
    const uid = this._userId;
    if (!this._ratings[videoId]) this._ratings[videoId] = { users: {} };
    const prev = (this._ratings[videoId].users || {})[uid] || 0;
    const newVal = prev === direction ? 0 : direction;
    if (!this._ratings[videoId].users) this._ratings[videoId].users = {};
    if (newVal === 0) delete this._ratings[videoId].users[uid];
    else this._ratings[videoId].users[uid] = newVal;
    if (this._ready) {
      try {
        if (newVal === 0) await this._remove(this._ref(this.db, 'music/ratings/' + videoId.replace(/[.#$[\]]/g,'_') + '/users/' + uid));
        else await this._set(this._ref(this.db, 'music/ratings/' + videoId.replace(/[.#$[\]]/g,'_') + '/users/' + uid), newVal);
      } catch(e) { console.warn('[MusicFirebase] vote save error', e); }
    } else { this._saveLocal(); }
    return this.getStats(videoId);
  },

  getStats: function(videoId) {
    const d = this._ratings[videoId];
    if (!d || !d.users) return { up: 0, down: 0, vote: 0 };
    const users = d.users;
    const uid = this._userId;
    let up = 0, down = 0;
    Object.values(users).forEach(v => { if (v === 1) up++; else if (v === -1) down++; });
    return { up, down, vote: users[uid] || 0 };
  },

  getScore: function(videoId) { const s = this.getStats(videoId); return s.up - s.down; },
  _saveLocal: function() { try { localStorage.setItem('_musicRatingsLocal', JSON.stringify(this._ratings)); } catch(e) {} },
  _loadLocal: function() { try { const d = JSON.parse(localStorage.getItem('_musicRatingsLocal') || '{}'); Object.assign(this._ratings, d); } catch(e) {} }
};

const LIKES = {
  load() { MusicFirebase._loadLocal(); },
  upvote(id)   { return MusicFirebase.vote(id,  1); },
  downvote(id) { return MusicFirebase.vote(id, -1); },
  get(id)      { return MusicFirebase.getStats(id); },
  getScore(id) { return MusicFirebase.getScore(id); },
};

/* ================================================================
   MUSIC OF THE WEEK
   ================================================================ */
const MOTW = {
  getWeekKey() {
    const now = new Date(), jan1 = new Date(now.getFullYear(),0,1);
    return now.getFullYear()+'-w'+Math.ceil(((now-jan1)/86400000+jan1.getDay()+1)/7);
  },
  resolve() {
    const key = this.getWeekKey();
    try {
      const st = JSON.parse(localStorage.getItem('_motw')||'null');
      if (st && st.weekKey===key && st.videoId && TRACKS.find(t=>t.videoId===st.videoId)) return st.videoId;
    } catch(e) {}
    if (!TRACKS.length) return null;
    let best=null, bestScore=-Infinity;
    TRACKS.forEach(t => { const s=LIKES.getScore(t.videoId); if(s>bestScore){bestScore=s;best=t.videoId;} });
    if (!best||bestScore<=0) best=TRACKS[Math.floor(Math.random()*TRACKS.length)].videoId;
    try { localStorage.setItem('_motw',JSON.stringify({weekKey:key,videoId:best})); } catch(e) {}
    return best;
  }
};

/* ================================================================
   JSONP
   ================================================================ */
let _jsonpCounter = 0;
function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const cbName = '__ytjsonp_' + (++_jsonpCounter);
    const timer = setTimeout(() => { delete window[cbName]; if(s.parentNode) s.parentNode.removeChild(s); reject(new Error('timeout')); }, 10000);
    window[cbName] = data => { clearTimeout(timer); delete window[cbName]; if(s.parentNode) s.parentNode.removeChild(s); resolve(data); };
    const s = document.createElement('script');
    s.src = url + '&callback=' + cbName;
    s.onerror = () => { clearTimeout(timer); delete window[cbName]; reject(new Error('error')); };
    document.head.appendChild(s);
  });
}

async function fetchPlaylistViaDataAPI(playlistId, apiKey) {
  const results = []; let pageToken = '';
  const base = 'https://www.googleapis.com/youtube/v3/playlistItems';
  do {
    const url = base+'?part=snippet&playlistId='+encodeURIComponent(playlistId)+'&maxResults=50&key='+encodeURIComponent(apiKey)+(pageToken?'&pageToken='+encodeURIComponent(pageToken):'');
    let data; try { data = await jsonpRequest(url); } catch(e) { break; }
    if (data.error) break;
    (data.items||[]).forEach(item => {
      const vid=item.snippet?.resourceId?.videoId, ttl=item.snippet?.title;
      if (vid&&ttl&&ttl!=='Deleted video'&&ttl!=='Private video') results.push({videoId:vid,title:ttl});
    });
    pageToken = data.nextPageToken||'';
  } while(pageToken);
  return results;
}

async function fetchVideoDuration(videoId, apiKey) {
  const url='https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id='+encodeURIComponent(videoId)+'&key='+encodeURIComponent(apiKey);
  try {
    const data=await jsonpRequest(url); const dur=data?.items?.[0]?.contentDetails?.duration;
    if(!dur) return 0;
    const m=dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if(!m) return 0;
    return (parseInt(m[1]||0)*3600)+(parseInt(m[2]||0)*60)+parseInt(m[3]||0);
  } catch(e) { return 0; }
}

async function initPlaylists() {
  if (typeof MUSIC_CONFIG==='undefined'||!MUSIC_CONFIG.length) {
    if(PLAYLIST_EL) PLAYLIST_EL.innerHTML='<p style="opacity:.5;padding:8px 6px;font-size:11px">No playlists.</p>';
    if(AUDIO_NAME) AUDIO_NAME.textContent='No tracks \u2014 see music.js'; return;
  }
  const apiKey=(typeof YOUTUBE_API_KEY!=='undefined')?YOUTUBE_API_KEY.trim():'';
  if(!apiKey||apiKey==='SUA_API_KEY_AQUI') {
    if(PLAYLIST_EL) PLAYLIST_EL.innerHTML='<p style="color:#ff9940;padding:8px 6px;font-size:11px">API key missing</p>';
    if(AUDIO_NAME) AUDIO_NAME.textContent='API key missing'; return;
  }
  if(PLAYLIST_EL) PLAYLIST_EL.innerHTML='<p style="opacity:.5;padding:8px 6px;font-size:11px">loading playlists\u2026</p>';
  for (let plIdx=0; plIdx<MUSIC_CONFIG.length; plIdx++) {
    const cfg=MUSIC_CONFIG[plIdx], rawId=(cfg.id||'').trim();
    const playlistId=rawId.replace(/.*[?&]list=/,'').split('&')[0];
    const label=cfg.name||('Playlist '+(plIdx+1)), albumArt=cfg.artwork||FALLBACK_BG;
    PLAYLIST_META.push({label,albumArt});
    if(PLAYLIST_EL){
      const p=document.createElement('p'); p.style.cssText='opacity:.5;padding:4px 8px;font-size:11px'; p.textContent='loading '+label+'\u2026';
      if(plIdx===0) PLAYLIST_EL.innerHTML=''; PLAYLIST_EL.appendChild(p);
    }
    const items=await fetchPlaylistViaDataAPI(playlistId,apiKey);
    items.reverse().forEach(item=>TRACKS.push({title:item.title,videoId:item.videoId,albumArt,type:'youtube',_plIdx:plIdx,_plLabel:label}));
    buildPlaylist();
  }
  if(AUDIO_NAME) AUDIO_NAME.textContent=TRACKS.length?'Select a track to play':'No tracks found';
}

function buildEmbedSrc(videoId, autoplay, startSec) {
  return 'https://www.youtube.com/embed/'+videoId+'?autoplay='+(autoplay?1:0)+'&controls=1&rel=0&modestbranding=1&enablejsapi=1&origin='+encodeURIComponent(location.origin)+(startSec?'&start='+Math.floor(startSec):'');
}
function setIframeSrc(src) { if(YT_IFRAME) YT_IFRAME.src=src; }

function ytCommand(cmd, args) {
  if(!YT_IFRAME) return;
  try {
    YT_IFRAME.contentWindow.postMessage(JSON.stringify({event:'command',func:cmd,args:args||[]}), '*');
  } catch(e) {}
}
function ytSetVolume(vol) { ytCommand('setVolume', [vol]); }
function ytMute()   { ytCommand('mute'); }
function ytUnmute() { ytCommand('unMute'); }

function _applyAlbumArt(t) {
  if (!MUSIC_BG) return;
  MUSIC_BG.style.background = '#000';
  if (!artHidden && t && t.albumArt) {
    MUSIC_BG.style.backgroundImage = "url('"+t.albumArt+"')";
    MUSIC_BG.style.backgroundSize = 'cover';
    MUSIC_BG.style.backgroundPosition = 'center';
    MUSIC_BG.style.backgroundRepeat = 'no-repeat';
  }
}

async function loadTrack(idx, play) {
  if(idx<0||idx>=TRACKS.length) return;
  const onMusicPage=(_currentPage==='music'); if(play&&!onMusicPage) play=false;
  curIdx=idx; const t=TRACKS[idx];
  if(typeof window.renaOnTrackChange==='function') window.renaOnTrackChange(t.title);
  if(typeof window.rikaOnTrackChange==='function') window.rikaOnTrackChange(t.title);
  markActiveTrack(idx);
  if(AUDIO_NAME) AUDIO_NAME.textContent=t.title;
  updateVoteDisplay(t);
  _applyAlbumArt(t);
  updateDownloadBtn(t);
  clearEndTimer(); clearPollTimer();
  _trackDuration=0; _trackStartTime=0;
  if(play) {
    setIframeSrc(buildEmbedSrc(t.videoId,true));
    setTimeout(()=>ytSetVolume(prevVol), 1200);
    setPlaying(true);
    const apiKey=(typeof YOUTUBE_API_KEY!=='undefined')?YOUTUBE_API_KEY.trim():'';
    if(apiKey) fetchVideoDuration(t.videoId,apiKey).then(dur=>{
      if(curIdx!==idx) return; _trackDuration=dur; _trackStartTime=Date.now();
      if(dur>0) startEndTimer(dur); startPollTimer();
    });
  } else { setIframeSrc(buildEmbedSrc(t.videoId,false)); setPlaying(false); }
}

function selectAndPlay(idx) {
  setControlsEnabled(true);
  const onMusicPage=(_currentPage==='music');
  if(onMusicPage) {
    curIdx=idx; const t=TRACKS[idx];
    if(typeof window.renaOnTrackChange==='function') window.renaOnTrackChange(t.title);
    markActiveTrack(idx);
    if(AUDIO_NAME) AUDIO_NAME.textContent=t.title;
    updateVoteDisplay(t);
    _applyAlbumArt(t);
    updateDownloadBtn(t);
    clearEndTimer(); clearPollTimer();
    setIframeSrc(buildEmbedSrc(t.videoId,true));
    setTimeout(()=>ytSetVolume(prevVol), 1200);
    setPlaying(true);
    const apiKey=(typeof YOUTUBE_API_KEY!=='undefined')?YOUTUBE_API_KEY.trim():'';
    if(apiKey) fetchVideoDuration(t.videoId,apiKey).then(dur=>{
      if(curIdx!==idx) return; _trackDuration=dur; _trackStartTime=Date.now();
      if(dur>0) startEndTimer(dur); startPollTimer();
    });
  } else { loadTrack(idx,false); }
}

function updateVoteDisplay(t) {
  const likeBtn=$('mpLikeBtn'), likeVal=$('mpLikeVal');
  const dislikeBtn=$('mpDislikeBtn'), dislikeVal=$('mpDislikeVal');
  if (!t) {
    if(likeBtn){likeBtn.style.opacity='0.3';likeBtn.style.pointerEvents='none';}
    if(dislikeBtn){dislikeBtn.style.opacity='0.3';dislikeBtn.style.pointerEvents='none';}
    if(likeVal) likeVal.textContent='0';
    if(dislikeVal) dislikeVal.textContent='0';
    return;
  }
  const d=LIKES.get(t.videoId);
  if(likeBtn){likeBtn.style.opacity='1';likeBtn.style.pointerEvents='auto';}
  if(dislikeBtn){dislikeBtn.style.opacity='1';dislikeBtn.style.pointerEvents='auto';}
  if(likeVal) likeVal.textContent=d.up;
  if(dislikeVal) dislikeVal.textContent=d.down;
  if(likeBtn){const img=likeBtn.querySelector('img');if(img)img.style.filter=d.vote===1?'invert(48%) sepia(100%) saturate(350%) hue-rotate(88deg) brightness(1.15)':'grayscale(80%) brightness(0.5)';}
  if(dislikeBtn){const img=dislikeBtn.querySelector('img');if(img)img.style.filter=d.vote===-1?'invert(15%) sepia(100%) saturate(700%) hue-rotate(330deg) brightness(1.2)':'grayscale(80%) brightness(0.5)';}
}

function togglePlay() {
  if(curIdx<0||!TRACKS.length||_currentPage!=='music') return;
  if(!isPlaying) {
    ytCommand('playVideo'); setPlaying(true);
    setTimeout(()=>ytSetVolume(prevVol), 400);
    _trackStartTime=Date.now(); if(_trackDuration>0) startEndTimer(_trackDuration); startPollTimer();
  } else { ytCommand('pauseVideo'); setPlaying(false); clearEndTimer(); clearPollTimer(); }
}

function setPlaying(s) {
  isPlaying=s;
  if(PLAY_IMG) PLAY_IMG.src=s?'https://frutigeraeroarchive.org/images/music_player/music_player_pause.png':'https://frutigeraeroarchive.org/images/music_player/music_player_play.png';
  if(DISK) DISK.style.animationPlayState=s?'running':'paused';
  const cdDisc = document.getElementById('cdDisc');
  if (cdDisc) cdDisc.classList.toggle('cd-playing', !!s);
  if(typeof window.renaSetMusicPlaying==='function') window.renaSetMusicPlaying(s);
  if(typeof window.rikaSetMusicPlaying==='function') window.rikaSetMusicPlaying(s);
}

function prevTrack() { if(!TRACKS.length) return; loadTrack(shuffleOn?rnd():(curIdx<=0?TRACKS.length-1:curIdx-1),isPlaying); }
function nextTrack() { if(!TRACKS.length) return; loadTrack(shuffleOn?rnd():(curIdx+1)%TRACKS.length,true); }
function rnd() { let r; do{r=Math.floor(Math.random()*TRACKS.length);}while(r===curIdx&&TRACKS.length>1); return r; }

function startEndTimer(dur) { clearEndTimer(); _endTimer=setTimeout(()=>{ if(!isPlaying) return; loopOn?loadTrack(curIdx,true):nextTrack(); },(dur+2)*1000); }
function clearEndTimer() { if(_endTimer){clearTimeout(_endTimer);_endTimer=null;} }
function startPollTimer() { clearPollTimer(); _pollTimer=setInterval(updateProg,500); }
function clearPollTimer()  { if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;} }

function updateProg() {
  if(!isPlaying||_trackDuration<=0||_trackStartTime<=0) return;
  const elapsed=(Date.now()-_trackStartTime)/1000, pct=Math.min((elapsed/_trackDuration)*100,100);
  if(PROG_INPUT) PROG_INPUT.value=pct; setProgFill(pct);
  if(TIME_LEFT) TIME_LEFT.textContent=fmt(Math.max(_trackDuration-elapsed,0));
}
function setProgFill(p) { if(PROG_FILL) PROG_FILL.style.width=p+'%'; }
function fmt(s) { if(!isFinite(s)||isNaN(s)) return '0:00'; return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'); }
function seekTo(pct) {
  if(curIdx<0||_trackDuration<=0) return;
  const sec=Math.floor((pct/100)*_trackDuration);
  setIframeSrc(buildEmbedSrc(TRACKS[curIdx].videoId,isPlaying,sec));
  if(isPlaying){_trackStartTime=Date.now()-sec*1000;clearEndTimer();if(_trackDuration>sec)startEndTimer(_trackDuration-sec);}
  setTimeout(()=>ytSetVolume(prevVol), 1200);
}

function setControlsEnabled(on) {
  ['audioPlayPause','audioBack','audioForward','audioLoop','progressBar']
    .forEach(id=>{const b=$(id);if(!b)return;b.disabled=!on;b.classList.toggle('ctrl-disabled',!on);});
  const pb=$('mpPlusBtn');
  if(pb){ pb.style.opacity='1'; pb.style.pointerEvents='auto'; }
  if(DISK) DISK.classList.toggle('ctrl-disabled',!on);
  if(VIZ)  VIZ.classList.toggle('ctrl-disabled',!on);
  const lb=$('mpLikeBtn'),db=$('mpDislikeBtn');
  if(lb){lb.style.opacity=on?'1':'0.3';lb.style.pointerEvents=on?'auto':'none';}
  if(db){db.style.opacity=on?'1':'0.3';db.style.pointerEvents=on?'auto':'none';}
}

let _musicSort = 'newest';

function buildPlaylist() {
  if(!PLAYLIST_EL) return;
  PLAYLIST_EL.innerHTML='';
  if(!TRACKS.length){PLAYLIST_EL.innerHTML='<p style="opacity:.5;padding:8px 6px;font-size:11px">No tracks found</p>';return;}

  let sorted=TRACKS.map((t,i)=>({...t,_origIdx:i}));
  if(_musicSort==='popular')  sorted.sort((a,b)=>(LIKES.get(b.videoId).up+LIKES.get(b.videoId).down)-(LIKES.get(a.videoId).up+LIKES.get(a.videoId).down));
  else if(_musicSort==='highest') sorted.sort((a,b)=>LIKES.getScore(b.videoId)-LIKES.getScore(a.videoId));
  else if(_musicSort==='unrated')  sorted=sorted.filter(t=>{const d=LIKES.get(t.videoId);return d.up===0&&d.down===0;});
  else if(_musicSort==='oldest')   sorted=[...sorted].reverse();

  if(PREFS.showMusicOfWeek) {
    const motwId=MOTW.resolve(), motwTrack=motwId?TRACKS.find(t=>t.videoId===motwId):null;
    if(motwTrack) {
      const hdr=document.createElement('div');hdr.className='pl-group-header';
      const icon=document.createElement('img');icon.src=LIKE_ICON_URL;icon.style.cssText='width:14px;height:14px;vertical-align:middle;margin-right:4px;image-rendering:pixelated;';
      hdr.appendChild(icon);hdr.appendChild(document.createTextNode('Music of the Week'));
      PLAYLIST_EL.appendChild(hdr);
      const ol=document.createElement('ol');ol.className='pl-track-list';
      const li=document.createElement('li'),a=document.createElement('a');
      a.href='#';a.dataset.idx=TRACKS.indexOf(motwTrack);
      a.innerHTML=motwTrack.title+_likeBadge(motwTrack.videoId);
      if(TRACKS.indexOf(motwTrack)===curIdx) a.classList.add('activeSong');
      a.addEventListener('click',ev=>{ev.preventDefault();selectAndPlay(TRACKS.indexOf(motwTrack));});
      li.appendChild(a);ol.appendChild(li);PLAYLIST_EL.appendChild(ol);_sep();
    }
  }

  if(PREFS.showMostRated) {
    const rated=TRACKS.map((t,i)=>({...t,_origIdx:i})).filter(t=>LIKES.get(t.videoId).up>0).sort((a,b)=>LIKES.getScore(b.videoId)-LIKES.getScore(a.videoId)).slice(0,3);
    if(rated.length) {
      const hdr=document.createElement('div');hdr.className='pl-group-header';
      const icon=document.createElement('img');icon.src=LIKE_ICON_URL;icon.style.cssText='width:14px;height:14px;vertical-align:middle;margin-right:4px;image-rendering:pixelated;';
      hdr.appendChild(icon);hdr.appendChild(document.createTextNode('Most Rated'));
      PLAYLIST_EL.appendChild(hdr);
      const ol=document.createElement('ol');ol.className='pl-track-list';
      rated.forEach(t=>{
        const li=document.createElement('li'),a=document.createElement('a');
        a.href='#';a.dataset.idx=t._origIdx;
        a.innerHTML=t.title+_likeBadge(t.videoId);
        if(t._origIdx===curIdx) a.classList.add('activeSong');
        a.addEventListener('click',ev=>{ev.preventDefault();selectAndPlay(t._origIdx);});
        li.appendChild(a);ol.appendChild(li);
      });
      PLAYLIST_EL.appendChild(ol);_sep();
    }
  }

  let lastPlIdx=-1, ol=null;
  sorted.forEach(t=>{
    const origIdx=t._origIdx!==undefined?t._origIdx:TRACKS.indexOf(t);
    if(t._plIdx!==lastPlIdx){
      if(ol) PLAYLIST_EL.appendChild(ol);
      if(lastPlIdx!==-1) _sep();
      const hdr=document.createElement('div');hdr.className='pl-group-header';
      hdr.textContent=(PLAYLIST_META[t._plIdx]||{}).label||('Playlist '+(t._plIdx+1));
      PLAYLIST_EL.appendChild(hdr);
      ol=document.createElement('ol');ol.className='pl-track-list';
      lastPlIdx=t._plIdx;
    }
    const li=document.createElement('li'),a=document.createElement('a');
    a.href='#';a.dataset.idx=origIdx;
    a.innerHTML=t.title+(PREFS.showLikes?_likeBadge(t.videoId):'');
    if(origIdx===curIdx) a.classList.add('activeSong');
    a.addEventListener('click',ev=>{ev.preventDefault();selectAndPlay(origIdx);});
    li.appendChild(a);ol.appendChild(li);
  });
  if(ol) PLAYLIST_EL.appendChild(ol);
}

function _sep() { const s=document.createElement('div');s.className='pl-separator';PLAYLIST_EL.appendChild(s); }
function _likeBadge(vid) { return ''; }

function markActiveTrack(idx) {
  if(!PLAYLIST_EL) return;
  PLAYLIST_EL.querySelectorAll('a').forEach(a=>a.classList.remove('activeSong'));
  const a=PLAYLIST_EL.querySelector('a[data-idx="'+idx+'"]');
  if(a){a.classList.add('activeSong');a.scrollIntoView({block:'nearest'});}
}

function setVolFill(v) { if(VOL_FILL) VOL_FILL.style.width=v+'%'; }
function updateVolIcon(v) {
  if(!VOL_IMG) return;
  const b='https://frutigeraeroarchive.org/images/music_player/';
  VOL_IMG.src=v===0?b+'volume_muted.png':v<=20?b+'volume_small.png':v<=69?b+'volume_medium.png':b+'volume_max.png';
}

/* ================================================================
   VISUALIZER
   ================================================================ */
const VIZ_BARS=28, _vizTarget=new Float32Array(28), _vizCur=new Float32Array(28);
let _vizBeat=0, _vizLastT=0;
let _vizRunning = false;

function startViz() {
  if (_vizRunning) return;
  _vizRunning = true;
  requestAnimationFrame(drawViz);
}

function stopViz() {
  _vizRunning = false;
}

function drawViz() {
  if (!_vizRunning) return;
  requestAnimationFrame(drawViz);
  if(!ctx2d||!VIZ) return;
  const W=VIZ.width, H=VIZ.height, now=Date.now()/1000, dt=Math.min(now-_vizLastT,0.05);
  _vizLastT=now;
  ctx2d.clearRect(0,0,W,H);ctx2d.fillStyle='rgba(4,4,4,.96)';ctx2d.fillRect(0,0,W,H);
  const ac = window._vizAccentColor;
  if(!isPlaying){
    for(let i=0;i<VIZ_BARS;i++){_vizTarget[i]=0;_vizCur[i]*=0.92;}
    ctx2d.strokeStyle = ac ? `rgba(${ac.r},${ac.g},${ac.b},.35)` : 'rgba(160,20,20,.35)';
    ctx2d.lineWidth=1;ctx2d.beginPath();ctx2d.moveTo(0,H*.5);ctx2d.lineTo(W,H*.5);ctx2d.stroke();return;
  }
  if(Math.random()<dt*2.2) _vizBeat=0.55+Math.random()*0.45;
  _vizBeat*=Math.pow(0.18,dt);
  for(let i=0;i<VIZ_BARS;i++){
    const n=i/(VIZ_BARS-1),shape=0.12+Math.exp(-n*3.2)*0.6+Math.exp(-Math.pow(n-.35,2)*18)*0.25;
    const l1=Math.sin(now*(1.1+i*.07)+i*.9)*.5+.5,l2=Math.sin(now*(2.3+i*.11)+i*1.7)*.5+.5,l3=Math.sin(now*(0.6+i*.13)+i*.4)*.5+.5;
    _vizTarget[i]=Math.min(1,(l1*.45+l2*.35+l3*.20)*shape+_vizBeat*Math.exp(-n*4)*.9);
  }
  for(let i=0;i<VIZ_BARS;i++){
    const diff=_vizTarget[i]-_vizCur[i];_vizCur[i]+=diff*Math.min(1,dt*(diff>0?22:7));_vizCur[i]=Math.max(0,Math.min(1,_vizCur[i]));
  }
  const barW=W/VIZ_BARS,gap=Math.max(1,barW*.15),innerW=barW-gap;
  for(let i=0;i<VIZ_BARS;i++){
    const v=_vizCur[i],bH=Math.max(2,v*(H-4)),x=i*barW+gap*.5,y=H-bH-1;
    let cr, cg, cb2;
    if (ac) {
      cr  = Math.round(ac.r * (0.45 + v*0.55));
      cg  = Math.round(ac.g * (0.45 + v*0.55));
      cb2 = Math.round(ac.b * (0.45 + v*0.55));
    } else {
      cr = Math.round(100+v*155); cg = Math.round(v*18); cb2 = Math.round(v*14);
    }
    ctx2d.fillStyle=`rgba(${cr},${cg},${cb2},${(0.55+v*.45).toFixed(2)})`;
    ctx2d.fillRect(x,y,innerW,bH);
    if(v>0.08){
      const hr  = ac ? Math.min(255,cr+40)  : 255;
      const hg  = ac ? Math.min(255,cg+25)  : Math.round(v*60);
      const hb2 = ac ? Math.min(255,cb2+15) : Math.round(v*40);
      ctx2d.fillStyle=`rgba(${hr},${hg},${hb2},${((0.55+v*.45)*.9).toFixed(2)})`;
      ctx2d.fillRect(x,y,innerW,Math.min(2,bH));
    }
  }
  ctx2d.strokeStyle = ac ? `rgba(${ac.r},${ac.g},${ac.b},.18)` : 'rgba(120,0,0,.18)';
  ctx2d.lineWidth=1;ctx2d.beginPath();ctx2d.moveTo(0,H*.5);ctx2d.lineTo(W,H*.5);ctx2d.stroke();
}

function updateDownloadBtn(t) {
  const link=$('mpPopUrl');if(!link) return;
  if(t&&t.videoId){
    link.href='https://www.youtube.com/watch?v='+t.videoId;
    link.setAttribute('target','_blank');link.setAttribute('rel','noopener noreferrer');
    link.style.pointerEvents='auto';link.style.opacity='1';
  } else {
    link.removeAttribute('href');link.style.pointerEvents='none';link.style.opacity='0.4';
  }
}

/* ================================================================
   Intro video
   ================================================================ */
function initIntroVideo() {
  const isMobile=('ontouchstart' in window)||(navigator.maxTouchPoints>0)||/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent)||(window.innerWidth<=768)||(typeof window.orientation!=='undefined')||(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches);
  if(isMobile||PREFS.alwaysSkipIntro) return;
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  const video=document.createElement('video');
  video.style.cssText='width:100%;height:100%;object-fit:contain;display:block;';
  video.src=INTRO_VIDEO_URL;video.muted=false;video.playsInline=true;video.controls=false;
  video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
  const hint=document.createElement('div');
  hint.style.cssText='position:absolute;bottom:18px;right:18px;color:rgba(255,255,255,.45);font-family:Tahoma,sans-serif;font-size:11px;pointer-events:none;';
  hint.textContent='click to skip';
  overlay.appendChild(video);overlay.appendChild(hint);document.body.appendChild(overlay);
  function dismiss(){
    let steps=0;const startVol=isFinite(video.volume)?video.volume:1;
    overlay.style.opacity='0';
    const fi=setInterval(()=>{steps++;try{video.volume=Math.max(0,startVol*(1-steps/24));}catch(e){}if(steps>=24){clearInterval(fi);video.pause();setTimeout(()=>{if(overlay.parentNode)overlay.parentNode.removeChild(overlay);},200);}},50);
  }
  video.addEventListener('ended',dismiss);overlay.addEventListener('click',dismiss);
  const p=video.play();if(p!==undefined)p.catch(()=>{hint.textContent='click to play & skip';overlay.addEventListener('click',()=>video.play().catch(()=>{}),{once:true});});
}

let _autoplayObserver=null;
function syncVideoAutoplayBtn(on) {
  window.videoAutoPlay=on;
  const btn=document.getElementById('videoAutoPlayBtn');
  if(btn){btn.textContent=on?'Autoplay Enabled (Click to disable)':'Autoplay Disabled (Click to enable)';btn.classList.toggle('on',on);return;}
  if(_autoplayObserver) _autoplayObserver.disconnect();
  _autoplayObserver=new MutationObserver(()=>{
    const b=document.getElementById('videoAutoPlayBtn');if(!b) return;
    b.textContent=on?'Autoplay Enabled (Click to disable)':'Autoplay Disabled (Click to enable)';b.classList.toggle('on',on);
    _autoplayObserver.disconnect();_autoplayObserver=null;
  });
  _autoplayObserver.observe(document.body,{childList:true,subtree:true});
}

window._unlockThemes=function(){
  PREFS.themesUnlocked=true;PREFS.save();
  const btn=document.getElementById('nbtn-themes');if(btn) btn.style.display='';
  buildPreferencesUI();
};

/* ================================================================
   LAYOUT ALIGN helpers
   ================================================================ */
function _patchApplyCharAlign(align) {
  const rena  = document.getElementById('renaChan');
  const rika  = document.getElementById('rikaChan');
  const flash = document.getElementById('rikaTransformFlash');
  const codeOv  = document.getElementById('codeVideoOverlay');
  const codeBox = document.getElementById('_renaCodeBox');
  if (align === 'right') {
    [rena, rika, flash].forEach(el => {
      if (!el) return;
      el.style.right = 'auto'; el.style.left = '0';
      el.style.backgroundPosition = 'bottom left';
    });
    if (codeOv)  { codeOv.style.right='auto';  codeOv.style.left='10px'; }
    if (codeBox) { codeBox.style.right='auto';  codeBox.style.left='10px'; }
  } else {
    [rena, rika, flash].forEach(el => {
      if (!el) return;
      el.style.left = 'auto'; el.style.right = '0';
      el.style.backgroundPosition = 'bottom right';
    });
    if (codeOv)  { codeOv.style.left='auto';  codeOv.style.right='10px'; }
    if (codeBox) { codeBox.style.left='auto';  codeBox.style.right='10px'; }
  }
}

function _patchApplyFooterAlign(align) {
  const footer = document.querySelector('footer');
  if (!footer) return;
  footer.style.textAlign    = 'right';
  footer.style.paddingRight = '18px';
  footer.style.paddingLeft  = '';
}

/* ================================================================
   SIDEBAR EXTENDER
   ================================================================ */
function _initSidebarExtender() {
  const aside = document.getElementById('sidebarAside');
  const nav   = document.getElementById('navigationMenu');
  const main  = document.getElementById('mainContent');
  if (!aside || !nav || !main) return;

  let ext = document.getElementById('_sidebarExtender');
  if (!ext) {
    ext = document.createElement('div');
    ext.id = '_sidebarExtender';
    aside.appendChild(ext);
  }

  function sync() {
    const diff = main.offsetHeight - nav.offsetHeight;
    if (diff > 0) { ext.style.height = diff + 'px'; ext.style.display = 'block'; }
    else { ext.style.display = 'none'; }
  }

  sync();
  const ro = new ResizeObserver(sync);
  ro.observe(main); ro.observe(nav);

  const _og = window.gotoPage;
  window.gotoPage = function(name) {
    if (_og) _og(name);
    requestAnimationFrame(() => requestAnimationFrame(sync));
  };
}

/* ================================================================
   CD PLAYER
   ================================================================ */
function _initCDPlayer() {
  const playlistRight = document.getElementById('playlistRight');
  if (!playlistRight || document.getElementById('cdDisc')) return;

  const oldDisk = document.getElementById('spinningDisk');
  if (oldDisk) oldDisk.style.display = 'none';

  const cdDisc = document.createElement('img');
  cdDisc.id    = 'cdDisc';
  cdDisc.src   = 'https://fluorescent-lights.neocities.org/Digital-CD-Disk-Vector-Transparent-PNG.png';
  cdDisc.alt   = 'CD';
  cdDisc.title = 'Click to open on YouTube';

  cdDisc.addEventListener('click', () => {
    const link = document.getElementById('mpPopUrl');
    if (link && link.href && link.href !== 'about:blank' && link.href !== window.location.href) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  });

  const canvas = document.getElementById('visualizerCanvas');
  if (canvas && canvas.parentNode === playlistRight) {
    canvas.parentNode.insertBefore(cdDisc, canvas.nextSibling);
  } else {
    playlistRight.appendChild(cdDisc);
  }
}

/* ================================================================
   VIDEO PAGINATION
   ================================================================ */
(function() {
  const PAGE_SIZE = 9;

  window._repaginateSection = function(listEl) {
    if (!listEl) return;
    const oldPager = listEl.querySelector('.vg-pager');
    if (oldPager) oldPager.remove();
    const grid = listEl.querySelector('.vg-grid');
    if (!grid) return;
    delete grid._pgDone;
    paginateSection(listEl);
  };

  function paginateSection(listEl) {
    if (!listEl) return;
    const grid = listEl.querySelector('.vg-grid');
    if (!grid || grid._pgDone) return;
    const entries = Array.from(grid.querySelectorAll('.vg-entry'));
    if (entries.length <= PAGE_SIZE) return;

    grid._pgDone = true;
    const totalPages = Math.ceil(entries.length / PAGE_SIZE);
    let curPage = 0;

    const pager = document.createElement('div');
    pager.className = 'vg-pager';
    grid.parentNode.insertBefore(pager, grid.nextSibling);

    function showPage(page) {
      curPage = page;
      grid.innerHTML = '';
      const start = page * PAGE_SIZE;
      for (let i = start; i < Math.min(start + PAGE_SIZE, entries.length); i++) grid.appendChild(entries[i]);

      pager.innerHTML = '';
      const prev = document.createElement('span');
      prev.className = 'vg-pager-btn vg-pager-arrow';
      prev.textContent = '<';
      prev.addEventListener('click', () => { if (curPage > 0) showPage(curPage - 1); });
      pager.appendChild(prev);

      for (let p = 0; p < totalPages; p++) {
        const btn = document.createElement('span');
        btn.className = 'vg-pager-btn' + (p === curPage ? ' active' : '');
        btn.textContent = p + 1;
        btn.addEventListener('click', () => showPage(p));
        pager.appendChild(btn);
      }

      const next = document.createElement('span');
      next.className = 'vg-pager-btn vg-pager-arrow';
      next.textContent = '>';
      next.addEventListener('click', () => { if (curPage < totalPages - 1) showPage(curPage + 1); });
      pager.appendChild(next);
    }
    showPage(0);
  }

  const ids = ['videoListAnimes', 'videoListNostalg', 'videoListAwesome'];

  const _origInit = window.initVideos;
  window.initVideos = function() {
    if (_origInit) _origInit();
    setTimeout(() => ids.forEach(id => paginateSection(document.getElementById(id))), 800);
  };

  const mo = new MutationObserver(() => {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const g = el.querySelector('.vg-grid');
      if (g && !g._pgDone && g.querySelectorAll('.vg-entry').length > 0) paginateSection(el);
    });
  });
  document.addEventListener('DOMContentLoaded', () => {
    const mc = document.getElementById('mainContent');
    if (mc) mo.observe(mc, { childList:true, subtree:true });
  });
})();

/* ================================================================
   GALLERY PAGINATION
   ================================================================ */
(function() {
  const GALLERY_PAGE_SIZE = 9;

  function paginateGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid || grid._pgDone) return;
    const cards = Array.from(grid.querySelectorAll('.gi-card'));
    if (cards.length <= GALLERY_PAGE_SIZE) return;

    grid._pgDone = true;
    const totalPages = Math.ceil(cards.length / GALLERY_PAGE_SIZE);
    let curPage = 0;

    const existingPager = document.getElementById('galleryPager');
    if (existingPager) existingPager.remove();

    const pager = document.createElement('div');
    pager.className = 'vg-pager';
    pager.id = 'galleryPager';
    grid.parentNode.insertBefore(pager, grid.nextSibling);

    function showPage(page) {
      curPage = page;
      grid.innerHTML = '';
      const start = page * GALLERY_PAGE_SIZE;
      for (let i = start; i < Math.min(start + GALLERY_PAGE_SIZE, cards.length); i++) {
        grid.appendChild(cards[i]);
      }
      pager.innerHTML = '';

      const prev = document.createElement('span');
      prev.className = 'vg-pager-btn vg-pager-arrow';
      prev.textContent = '<';
      prev.addEventListener('click', () => { if (curPage > 0) showPage(curPage - 1); });
      pager.appendChild(prev);

      for (let p = 0; p < totalPages; p++) {
        const btn = document.createElement('span');
        btn.className = 'vg-pager-btn' + (p === curPage ? ' active' : '');
        btn.textContent = p + 1;
        btn.addEventListener('click', () => showPage(p));
        pager.appendChild(btn);
      }

      const next = document.createElement('span');
      next.className = 'vg-pager-btn vg-pager-arrow';
      next.textContent = '>';
      next.addEventListener('click', () => { if (curPage < totalPages - 1) showPage(curPage + 1); });
      pager.appendChild(next);
    }
    showPage(0);
  }

  window._repaginateGallery = function() {
    const grid = document.getElementById('galleryGrid');
    if (grid) delete grid._pgDone;
    const existingPager = document.getElementById('galleryPager');
    if (existingPager) existingPager.remove();
    setTimeout(paginateGallery, 80);
  };

  const mo = new MutationObserver(() => {
    const grid = document.getElementById('galleryGrid');
    if (grid && !grid._pgDone && grid.querySelectorAll('.gi-card').length > GALLERY_PAGE_SIZE) {
      paginateGallery();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const mc = document.getElementById('mainContent');
    if (mc) mo.observe(mc, { childList: true, subtree: true });
    setTimeout(paginateGallery, 1200);
    setTimeout(paginateGallery, 3000);
  });

  window.addEventListener('load', () => {
    if (window.GallerySystem && !window.GallerySystem._pgPatched) {
      window.GallerySystem._pgPatched = true;
      const origRender = window.GallerySystem.renderGrid.bind(window.GallerySystem);
      window.GallerySystem.renderGrid = function() {
        origRender();
        window._repaginateGallery();
      };
    }
    setTimeout(paginateGallery, 500);
  });
})();

/* ================================================================
   PREFERENCES PAGE
   ================================================================ */
let _sideHidden = false;

/* Helper: apply pref-btn active/inactive visual state */
function _setPrefBtnState(btn, active) {
  if (active) {
    btn.style.background = '#000000';
    btn.style.color      = '#ffffff';
    btn.style.borderColor = 'rgba(180,20,20,.7)';
    btn.setAttribute('data-active', '1');
  } else {
    btn.style.background = '#1a1a1a';
    btn.style.color      = 'rgba(200,200,200,0.8)';
    btn.style.borderColor = 'rgba(120,20,20,.5)';
    btn.setAttribute('data-active', '0');
  }
}

function buildPreferencesUI() {
  const prefPage=$('pg-preferences');if(!prefPage) return;
  const ex=$('_prefBar');if(ex) ex.remove();
  const wrap=document.createElement('div');wrap.id='_prefBar';

  const mkSectionBar=(label)=>{ const bar=document.createElement('h2');bar.textContent=label;bar.style.marginTop='6px';return bar; };
  const mkSectionBody=()=>{ const d=document.createElement('div');d.className='styled-containers aero-borders';d.style.cssText='padding:6px 10px;margin-bottom:2px;';return d; };
  const SEL_CSS='font-size:11px;background:#000;color:#fff;border:1px solid rgba(180,20,20,.6);cursor:pointer;padding:2px 6px;font-family:Tahoma,sans-serif;outline:none;';

  function mkToggle(on, off, state, cb) {
    const row = document.createElement('div');
    row.style.cssText = 'margin:3px 0;';
    const btn = document.createElement('button');
    btn.className = 'pref-btn';
    btn.textContent = state ? on : off;
    btn.style.cssText = 'font-size:11px;font-family:Tahoma,sans-serif;cursor:pointer;padding:2px 8px;border:1px solid rgba(120,20,20,.5);transition:background .15s,border-color .15s;';
    _setPrefBtnState(btn, state);
    btn.addEventListener('click', () => {
      const next = btn.textContent === off;
      btn.textContent = next ? on : off;
      _setPrefBtnState(btn, next);
      cb(next);
    });
    row.appendChild(btn);
    return row;
  }

  function mkSelect(label,options,current,cb){
    const row=document.createElement('div');row.style.cssText='margin:3px 0;display:flex;align-items:center;gap:6px;';
    const sp=document.createElement('span');sp.style.cssText='color:#ccc;font-size:11px;font-family:Tahoma,sans-serif;';sp.textContent=label+':';
    const sel=document.createElement('select');sel.style.cssText=SEL_CSS;
    options.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;if(v===current)o.selected=true;sel.appendChild(o);});
    sel.addEventListener('change',()=>cb(sel.value));
    row.appendChild(sp);row.appendChild(sel);return row;
  }

  const genBar=mkSectionBar('GENERAL');
  const genBody=mkSectionBody();
  genBody.appendChild(mkToggle('Intro: Do Not Play \u2014 On','Intro: Do Not Play \u2014 Off',PREFS.alwaysSkipIntro,on=>{PREFS.alwaysSkipIntro=on;PREFS.save();}));

  genBody.appendChild(mkToggle('Sounds \u2014 On','Sounds \u2014 Off',PREFS.soundsOn!==false,on=>{
    PREFS.soundsOn=on;PREFS.save();
    if(window.SiteSound) window.SiteSound.setOn(on);
  }));

  const charLabel=PREFS.hideRenaUnlocked?'Always Hide Rena/Rika \u2014 On':'Always Hide Rena \u2014 On';
  const charLabelOff=PREFS.hideRenaUnlocked?'Always Hide Rena/Rika \u2014 Off':'Always Hide Rena \u2014 Off';
  genBody.appendChild(mkToggle(charLabel,charLabelOff,PREFS.alwaysHideRena,on=>{
    PREFS.alwaysHideRena=on;PREFS.save();
    const renaEl=$('renaChan'),rikaEl=$('rikaChan');
    if(on){if(renaEl)renaEl.style.display='none';if(rikaEl)rikaEl.style.display='none';}
    else{const active=window._rikaMode?rikaEl:renaEl;if(active)active.style.display='';}
  }));

  if(PREFS.hideRenaUnlocked){
    const hideRow=document.createElement('div');hideRow.style.cssText='margin:3px 0;';
    const hideBtn=document.createElement('button');hideBtn.id='_hideRenaBtn';hideBtn.className='pref-btn';
    hideBtn.style.cssText='font-size:11px;font-family:Tahoma,sans-serif;cursor:pointer;padding:2px 8px;border:1px solid rgba(120,20,20,.5);';
    _setPrefBtnState(hideBtn, false);
    const _getHL=()=>{const renaEl=$('renaChan'),rikaEl=$('rikaChan');const active=window._rikaMode?rikaEl:renaEl;const hidden=active?active.style.display==='none':true;return hidden?`Unhide ${window._rikaMode?'Rika':'Rena'}`:`Hide ${window._rikaMode?'Rika':'Rena'}`;};
    hideBtn.textContent=_getHL();
    hideBtn.addEventListener('click',()=>{
      const renaEl=$('renaChan'),rikaEl=$('rikaChan');const active=window._rikaMode?rikaEl:renaEl;
      if(active)active.style.display=active.style.display==='none'?'':'none';
      hideBtn.textContent=_getHL();
    });
    hideRow.appendChild(hideBtn);genBody.appendChild(hideRow);

    const toggleRow=document.createElement('div');toggleRow.style.cssText='margin:3px 0;';toggleRow.id='_rikaToggleRow';
    const toggleBtn=document.createElement('button');toggleBtn.className='pref-btn';toggleBtn.id='_rikaToggleBtn';
    toggleBtn.style.cssText='font-size:11px;font-family:Tahoma,sans-serif;cursor:pointer;padding:2px 8px;border:1px solid rgba(120,20,20,.5);';
    _setPrefBtnState(toggleBtn, false);
    toggleBtn.textContent=window._rikaMode?'Use Rena instead of Rika':'Use Rika instead of Rena';
    toggleBtn.addEventListener('click',()=>{
      window._rikaMode=!window._rikaMode;
      const renaEl=$('renaChan'),rikaEl=$('rikaChan');
      if(window._rikaMode){if(renaEl)renaEl.style.display='none';if(rikaEl){rikaEl.style.display='';rikaEl.style.backgroundImage="url('assets/images/rikaidle.png')";}toggleBtn.textContent='Use Rena instead of Rika';}
      else{if(rikaEl)rikaEl.style.display='none';if(renaEl){renaEl.style.display='';renaEl.style.backgroundImage="url('assets/images/renaidle1.png')";}toggleBtn.textContent='Use Rika instead of Rena';}
      hideBtn.textContent=_getHL();
    });
    toggleRow.appendChild(toggleBtn);genBody.appendChild(toggleRow);
  }

  const mpBar=mkSectionBar('MUSIC PLAYER');
  const mpBody=mkSectionBody();
  mpBody.appendChild(mkToggle('Music of the Week \u2014 On','Music of the Week \u2014 Off',PREFS.showMusicOfWeek,on=>{PREFS.showMusicOfWeek=on;PREFS.save();buildPlaylist();}));
  mpBody.appendChild(mkToggle('Most Rated \u2014 On','Most Rated \u2014 Off',PREFS.showMostRated,on=>{PREFS.showMostRated=on;PREFS.save();buildPlaylist();}));
  mpBody.appendChild(mkSelect('Default Sort',[['newest','Newest First'],['oldest','Oldest First'],['popular','Most Popular'],['highest','Highest Rated'],['unrated','Unrated']],_musicSort,v=>{_musicSort=v;PREFS.musicSort=v;PREFS.save();buildPlaylist();}));

  const artRow=document.createElement('div');artRow.style.cssText='margin:3px 0;';
  const artBtn=document.createElement('button');artBtn.className='pref-btn';
  artBtn.style.cssText='font-size:11px;font-family:Tahoma,sans-serif;cursor:pointer;padding:2px 8px;border:1px solid rgba(120,20,20,.5);';
  _setPrefBtnState(artBtn, false);
  artBtn.textContent=artHidden?'Show Artwork':'Hide Artwork';
  artBtn.addEventListener('click',()=>{artHidden=!artHidden;if(artHidden){if(MUSIC_BG){MUSIC_BG.style.backgroundImage='none';MUSIC_BG.style.background='#000';}}else{const t=curIdx>=0?TRACKS[curIdx]:null;_applyAlbumArt(t);}artBtn.textContent=artHidden?'Show Artwork':'Hide Artwork';});
  artRow.appendChild(artBtn);mpBody.appendChild(artRow);

  const sideRow=document.createElement('div');sideRow.style.cssText='margin:3px 0;';
  const sideBtn=document.createElement('button');sideBtn.className='pref-btn';sideBtn.id='_sideBtn';
  sideBtn.style.cssText='font-size:11px;font-family:Tahoma,sans-serif;cursor:pointer;padding:2px 8px;border:1px solid rgba(120,20,20,.5);';
  _setPrefBtnState(sideBtn, false);
  sideBtn.textContent=_sideHidden?'Show Sidebar':'Hide Sidebar';
  sideBtn.addEventListener('click',()=>{_sideHidden=!_sideHidden;const rp=$('playlistRight');if(rp)rp.style.display=_sideHidden?'none':'';sideBtn.textContent=_sideHidden?'Show Sidebar':'Hide Sidebar';});
  sideRow.appendChild(sideBtn);mpBody.appendChild(sideRow);

  const appBar = mkSectionBar('APPEARANCE');
  const appBody = mkSectionBody();
  appBody.appendChild(mkSelect('Container Align',
    [['left','Left (Default)'],['center','Center'],['right','Right']],
    PREFS.layoutAlign,
    v => { PREFS.layoutAlign = v; PREFS.save(); applyLayoutAlign(v); }
  ));
  appBody.appendChild(mkToggle(
    'Adaptive Accent \u2014 On', 'Adaptive Accent \u2014 Off',
    PREFS.adaptiveAccent,
    on => { PREFS.adaptiveAccent = on; PREFS.save(); applyAdaptiveAccent(on); }
  ));

  const vpBar=mkSectionBar('VIDEO PLAYER');
  const vpBody=mkSectionBody();
  vpBody.appendChild(mkToggle('Autoplay \u2014 On','Autoplay \u2014 Off',PREFS.alwaysAutoplay,on=>{PREFS.alwaysAutoplay=on;PREFS.save();syncVideoAutoplayBtn(on);}));
  vpBody.appendChild(mkSelect('Default Sort',[['default','Newest First'],['highest','Highest Rated'],['lowest','Lowest Rated'],['rated','Only Rated']],PREFS.videoSort,v=>{PREFS.videoSort=v;PREFS.save();}));

  const galBar=mkSectionBar('GALLERY');
  const galBody=mkSectionBody();
  galBody.appendChild(mkSelect('Default Sort',[['newest','Newest First'],['oldest','Oldest First'],['highest','Highest Rated'],['lowest','Lowest Rated'],['rated','Only Rated'],['awarded','Awarded Only']],PREFS.gallerySort,v=>{PREFS.gallerySort=v;PREFS.save();if(window.GallerySystem){window.GallerySystem._sortMode=v;window.GallerySystem.renderGrid();}}));

  wrap.appendChild(genBar);wrap.appendChild(genBody);
  wrap.appendChild(mpBar);wrap.appendChild(mpBody);
  wrap.appendChild(appBar);wrap.appendChild(appBody);
  wrap.appendChild(vpBar);wrap.appendChild(vpBody);
  wrap.appendChild(galBar);wrap.appendChild(galBody);

  const h1=prefPage.querySelector('h1');
  if(h1){h1.parentNode.insertBefore(wrap,h1.nextSibling);}else{prefPage.appendChild(wrap);}
}

function initNaUnlock() {
  document.querySelectorAll('[data-na-unlock],.na-unlock-trigger,.na-span').forEach(el=>{
    el.style.cursor='pointer';
    el.addEventListener('click',()=>{
      const renaEl=$('renaChan'),rikaEl=$('rikaChan');
      if(!PREFS.hideRenaUnlocked){PREFS.hideRenaUnlocked=true;PREFS.save();}
      if(!window._rikaMode&&renaEl){renaEl.style.display='';PREFS.alwaysHideRena=false;PREFS.save();}
      else if(window._rikaMode&&rikaEl){rikaEl.style.display='';}
      buildPreferencesUI();
    });
  });
}

/* ================================================================
   Navigation
   ================================================================ */
const VALID_PAGES=['introduction','preferences','resources','music','sketchbook','videos','contact','community'];
function navClick(e,name){e.preventDefault();gotoPage(name);history.pushState({page:name},'','#'+name);return false;}
function gotoPage(name){
  if(!VALID_PAGES.includes(name)) name='introduction';
  if(_currentPage==='music'&&name!=='music'&&isPlaying){ytCommand('pauseVideo');setPlaying(false);clearEndTimer();clearPollTimer();}
  if(name!=='videos'&&typeof window.stopVideos==='function') window.stopVideos();

  if (name === 'music') {
    startViz();
  } else {
    stopViz();
  }

  /* FIX: Auto-select Chat tab when entering Community — show panel immediately */
  if (name === 'community') {
    setTimeout(() => {
      /* Reset to chat tab every time community is entered */
      const panelChat = document.getElementById('commPanelChat');
      const panelBlog = document.getElementById('commPanelBlog');
      const tabChat   = document.getElementById('commTabChat');
      const tabBlog   = document.getElementById('commTabBlog');
      if (panelChat) panelChat.style.display = 'block';
      if (panelBlog) panelBlog.style.display = 'none';
      if (tabChat)   { tabChat.classList.add('active'); }
      if (tabBlog)   { tabBlog.classList.remove('active'); }
      try { if (typeof _loadChatango === 'function') _loadChatango(); } catch(e) {}
    }, 80);
  }

  _currentPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(b=>b.classList.remove('active'));
  const pg=$('pg-'+name),btn=$('nbtn-'+name);
  if(pg)pg.classList.add('active');if(btn)btn.classList.add('active');
  if(name==='videos'){
    const total=(window.ANIME_VIDEOS||[]).length+(window.NOSTALGIA_VIDEOS||[]).length+(window.AWESOME_VIDEOS||[]).length;
    NavBadges.markSeen('videos',total);
  }
  if(name==='sketchbook'&&window.GallerySystem&&window.GallerySystem._items){
    NavBadges.markSeen('sketchbook',window.GallerySystem._items.length);
  }
  document.title=name[0].toUpperCase()+name.slice(1)+' \u2014 The Watanagashi Archive';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const mc=$('mainContent');if(mc) mc.scrollTop=0;
  if(name==='videos'&&typeof window.initVideos==='function'){window.initVideos();syncVideoAutoplayBtn(PREFS.alwaysAutoplay);}
  if(name==='preferences') buildPreferencesUI();
}
window.addEventListener('hashchange',()=>{
  const hash=window.location.hash.replace(/^#/,'').toLowerCase().split('?')[0];
  if(!hash){gotoPage('introduction');return;}
  if(VALID_PAGES.includes(hash)){gotoPage(hash);return;}
  window.location.href=NOT_FOUND_URL;
});

/* ================================================================
   MOBILE GATE
   ================================================================ */
(function _mobileGate() {
  const SOUND_URL = 'assets/audio/notfound.mp3';
  const BG_URL    = 'https://w7.pngwing.com/pngs/896/604/png-transparent-rika-furude-hanyuu-anime-higurashi-when-they-cry-anime-purple-black-hair-manga-thumbnail.png';

  function _isMobileUA() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent)
      || (typeof window.orientation !== 'undefined')
      || ('ontouchstart' in window && navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }

  const _originalUA = navigator.userAgent;

  function _isDesktopMode() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
      return !navigator.userAgentData.mobile;
    }
    if (navigator.userAgent !== _originalUA) {
      return !_isMobileUA();
    }
    return window.innerWidth >= 1024;
  }

  if (!_isMobileUA()) return;

  function _dismissOverlay(ov) {
    try { const a = new Audio(SOUND_URL); a.volume = 0.6; a.play().catch(()=>{}); } catch(e){}
    ov.style.transition = 'opacity .5s';
    ov.style.opacity = '0';
    setTimeout(() => { ov.remove(); document.body.style.overflow = ''; }, 600);
  }

  const ov = document.createElement('div');
  ov.id = '_mobileGateOv';
  ov.style.cssText = [
    'position:fixed;inset:0;z-index:99999;',
    'background:#000 url("' + BG_URL + '") center/cover no-repeat;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'font-family:Tahoma,sans-serif;text-align:center;padding:20px;',
  ].join('');

  ov.innerHTML = `
    <div style="background:rgba(0,0,0,.82);padding:28px 22px;border:1px solid rgba(180,20,20,.6);max-width:340px;border-radius:2px;">
      <p style="font-size:22px;font-weight:bold;color:#cc1a1a;margin:0 0 10px;">UH OH! (X_X)</p>
      <p style="font-size:13px;color:#ddd;margin:0 0 8px;">This site isn't optimized for mobile browsers.</p>
      <p style="font-size:10px;color:#888;margin:0 0 18px;">Please enable <strong style="color:#aaa;">Desktop Mode</strong> or <strong style="color:#aaa;">Tablet Mode</strong> in your browser settings to continue.</p>
      <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:16px;margin-top:4px;">
        <p style="font-size:10px;color:#666;margin:0 0 10px;">— or —</p>
        <button id="_mobileGateContinue"
          style="background:transparent;border:1px solid rgba(150,150,150,.4);color:#777;font-family:Tahoma,sans-serif;font-size:10px;padding:7px 16px;border-radius:2px;cursor:pointer;letter-spacing:.05em;"
          onmouseover="this.style.color='#bbb';this.style.borderColor='rgba(200,200,200,.5)'"
          onmouseout="this.style.color='#777';this.style.borderColor='rgba(150,150,150,.4)'"
        >continue anyway (not recommended)</button>
      </div>
    </div>`;

  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';

  document.getElementById('_mobileGateContinue').addEventListener('click', () => {
    clearInterval(_poll);
    _dismissOverlay(ov);
  });

  let _alerted = false;
  const _poll = setInterval(() => {
    if (_isDesktopMode()) {
      clearInterval(_poll);
      if (_alerted) return;
      _alerted = true;
      setTimeout(() => _dismissOverlay(ov), 400);
    }
  }, 800);
})();

/* ================================================================
   NAV NOTIFICATION BADGES
   ================================================================ */
const NavBadges = {
  _store: {},
  _enabled: true,

  init() {
    try { this._store = JSON.parse(localStorage.getItem('_navBadgesSeen') || '{}'); } catch(e) { this._store = {}; }
    this._enabled = typeof PREFS !== 'undefined' ? (PREFS.showNavBadges !== false) : true;
  },

  _getSeen(key)  { return this._store[key] || 0; },
  _setSeen(key, n) { this._store[key] = n; try { localStorage.setItem('_navBadgesSeen', JSON.stringify(this._store)); } catch(e){} },

  update(navId, totalCount) {
    if (!this._enabled) { this._clearBadge(navId); return; }
    const seen = this._getSeen(navId);
    const unseen = Math.max(0, totalCount - seen);
    if (unseen > 0) this._showBadge(navId, unseen);
    else this._clearBadge(navId);
  },

  markSeen(navId, totalCount) {
    this._setSeen(navId, totalCount);
    this._clearBadge(navId);
  },

  _showBadge(navId, n) {
    const btn = document.getElementById('nbtn-' + navId);
    if (!btn) return;
    let badge = btn.querySelector('._nav-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = '_nav-badge';
      badge.style.cssText = 'position:absolute;top:1px;right:2px;min-width:14px;height:14px;background:#cc1a1a;color:#fff;font-size:9px;font-weight:bold;border-radius:7px;display:flex;align-items:center;justify-content:center;padding:0 3px;pointer-events:none;line-height:1;z-index:10;';
      btn.style.position = 'relative';
      btn.appendChild(badge);
    }
    badge.textContent = n > 99 ? '99+' : String(n);
  },

  _clearBadge(navId) {
    const btn = document.getElementById('nbtn-' + navId);
    if (!btn) return;
    const badge = btn.querySelector('._nav-badge');
    if (badge) badge.remove();
  },

  checkVideos() {
    const total = (window.ANIME_VIDEOS||[]).length + (window.NOSTALGIA_VIDEOS||[]).length + (window.AWESOME_VIDEOS||[]).length;
    this.update('videos', total);
  },

  checkGallery(count) {
    this.update('sketchbook', count);
  },
};

/* ================================================================
   DOMContentLoaded
   ================================================================ */
document.addEventListener('DOMContentLoaded', async ()=>{
  PREFS.load(); LIKES.load();
  NavBadges.init();
  _musicSort=PREFS.musicSort||'newest';

  if (window.SiteSound) window.SiteSound.setOn(PREFS.soundsOn !== false);

  applyLayoutAlign(PREFS.layoutAlign);
  applyDarkThemeBg();

  MusicFirebase.init().then(()=>{
    if(TRACKS.length) buildPlaylist();
    if(curIdx>=0&&TRACKS[curIdx]) updateVoteDisplay(TRACKS[curIdx]);
  });

  PLAY_IMG=$('audioPlayPauseImage');PROG_FILL=$('progressFill');PROG_INPUT=$('progressBar');
  TIME_LEFT=$('timeLeft');AUDIO_NAME=$('audioName');VOL_RANGE=$('volumeSlider');
  VOL_IND=$('volumeIndicator');VOL_IMG=$('volumeImage');VOL_FILL=$('volFill');
  DISK=$('spinningDisk');MUSIC_BG=$('musicBackground');PLAYLIST_EL=$('playlistLeft');
  VIZ=$('visualizerCanvas');DOWNLOAD=null;YT_IFRAME=$('_ytEl');
  ctx2d=VIZ?VIZ.getContext('2d'):null;

  if(YT_IFRAME&&YT_IFRAME.tagName!=='IFRAME'){
    const iframe=document.createElement('iframe');iframe.id='_ytEl';
    iframe.style.cssText='width:1px;height:1px;opacity:0.01;pointer-events:none;border:none;position:fixed;bottom:0;right:0;';
    iframe.setAttribute('allow','autoplay; encrypted-media');iframe.setAttribute('allowfullscreen','');iframe.src='about:blank';
    YT_IFRAME.parentNode.replaceChild(iframe,YT_IFRAME);YT_IFRAME=iframe;
  }

  setControlsEnabled(false);
  if(MUSIC_BG){MUSIC_BG.style.background='#000';}
  if(AUDIO_NAME) AUDIO_NAME.textContent='loading\u2026';
  if(PLAYLIST_EL) PLAYLIST_EL.innerHTML='<p style="opacity:.5;padding:8px 6px;font-size:11px">loading playlists\u2026</p>';
  updateDownloadBtn(null);
  updateVoteDisplay(null);
  if(DISK){DISK.style.cursor='default';DISK.style.animationPlayState='paused';}
  if(VIZ) VIZ.style.cursor='default';

  if(PREFS.alwaysHideRena){const rena=$('renaChan'),rika=$('rikaChan');if(rena)rena.style.display='none';if(rika)rika.style.display='none';}
  if(PREFS.alwaysAutoplay) syncVideoAutoplayBtn(true);

  _initSidebarExtender();
  _initCDPlayer();
  if (PREFS.adaptiveAccent) applyAdaptiveAccent(true);
  setTimeout(() => NavBadges.checkVideos(), 500);

  initIntroVideo();initPlaylists();initNaUnlock();

  setTimeout(() => {
    if (!document.getElementById('renaChan')) {
      const el = document.createElement('div');
      el.id = 'renaChan';
      el.style.cssText = [
        'position:fixed;bottom:0;right:0;',
        'width:250px;height:350px;',
        "background-image:url('assets/images/renaidle1.png');",
        'background-size:contain;background-repeat:no-repeat;',
        'background-position:bottom right;',
        'z-index:9999;cursor:pointer;'
      ].join('');
      document.body.appendChild(el);
      _patchApplyCharAlign(PREFS.layoutAlign || 'left');
      if (PREFS.alwaysHideRena) el.style.display = 'none';
    }
  }, 800);

  setTimeout(() => {
    _patchApplyCharAlign(PREFS.layoutAlign || 'left');
    _patchApplyFooterAlign(PREFS.layoutAlign || 'left');
  }, 400);

  /* Gallery "+" popup */
  (function(){
    const galBtn=$('galPlusBtn'),galPopup=$('galPlusPopup'),galItems=$('galSortItems');
    if(!galBtn||!galPopup) return;
    const galSorts=[['newest','Newest First'],['oldest','Oldest First'],['highest','Highest Rated'],['lowest','Lowest Rated'],['awarded','Awarded Only']];
    let _galOpen=false;
    function _buildGalItems(){
      if(!galItems) return; galItems.innerHTML='';
      galSorts.forEach(([v,l])=>{
        const d=document.createElement('div');const active=v===(PREFS.gallerySort||'newest');
        d.style.cssText='padding:5px 14px;cursor:pointer;font-size:12px;color:'+(active?'#fff':'#ccc')+';white-space:nowrap;background:#050505;font-weight:'+(active?'bold':'normal')+';';
        d.textContent=(active?'\u2714 ':'')+l;
        d.addEventListener('mouseenter',()=>{d.style.background='rgba(50,50,50,0.80)';d.style.color='#fff';});
        d.addEventListener('mouseleave',()=>{d.style.background='#050505';d.style.color=active?'#fff':'#ccc';});
        d.addEventListener('click',e=>{e.stopPropagation();PREFS.gallerySort=v;PREFS.save();if(window.GallerySystem){window.GallerySystem._sortMode=v;window.GallerySystem.renderGrid();}_galOpen=false;galPopup.style.display='none';});
        galItems.appendChild(d);
      });
    }
    _buildGalItems();
    galBtn.addEventListener('click',e=>{e.stopPropagation();if(_galOpen){galPopup.style.display='none';_galOpen=false;return;}_buildGalItems();galPopup.style.display='block';_galOpen=true;galBtn.style.color='rgba(200,200,200,.9)';});
    galPopup.addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',()=>{if(_galOpen){galPopup.style.display='none';_galOpen=false;galBtn.style.color='rgba(200,200,200,.55)';}});
    galBtn.addEventListener('mouseenter',()=>galBtn.style.color='#fff');
    galBtn.addEventListener('mouseleave',()=>{if(!_galOpen)galBtn.style.color='rgba(200,200,200,.55)';});
  })();

  /* "+" popup music */
  (function(){
    const plusBtn=$('mpPlusBtn'),plusPopup=$('mpPlusPopup');
    if(!plusBtn||!plusPopup) return;
    const statusBar=$('mpStatusBar');
    if(statusBar){statusBar.style.position='relative';statusBar.style.zIndex='200';statusBar.style.overflow='visible';}
    plusBtn.style.position='relative';plusBtn.style.zIndex='201';plusBtn.style.pointerEvents='auto';plusBtn.style.cursor='pointer';
    plusBtn.style.opacity='1';
    plusPopup.style.zIndex='500';plusPopup.style.pointerEvents='auto';

    const sortOpts=[{v:'popular',l:'Most Popular'},{v:'highest',l:'Highest Rated'},{v:'unrated',l:'Unrated'},{v:'newest',l:'Newest First'},{v:'oldest',l:'Oldest First'}];
    const sortSubmenu=$('mpSortSubmenu');
    function _rebuildSortItems(){
      if(!sortSubmenu) return; sortSubmenu.innerHTML='';
      sortOpts.forEach(({v,l})=>{
        const opt=document.createElement('div');const active=v===_musicSort;
        opt.style.cssText='padding:5px 22px;cursor:pointer;font-family:Tahoma,sans-serif;font-size:12px;white-space:nowrap;color:'+(active?'#fff':'#ccc')+';background:#050505;font-weight:'+(active?'bold':'normal')+';';
        opt.textContent=(active?'\u2714 ':'')+l;
        opt.addEventListener('mouseenter',()=>{opt.style.color='#fff';opt.style.background='rgba(50,50,50,0.80)';});
        opt.addEventListener('mouseleave',()=>{opt.style.color=(v===_musicSort)?'#fff':'#ccc';opt.style.background='#050505';});
        opt.addEventListener('click',e=>{e.stopPropagation();_musicSort=v;PREFS.musicSort=v;PREFS.save();_closePopup();buildPlaylist();});
        sortSubmenu.appendChild(opt);
      });
    }
    _rebuildSortItems();
    let _open=false,_sortOpen=false;
    function _closePopup(){plusPopup.style.display='none';_open=false;_sortOpen=false;if(sortSubmenu)sortSubmenu.style.display='none';}
    plusBtn.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();if(_open){_closePopup();return;}_rebuildSortItems();plusPopup.style.display='block';_open=true;});
    plusPopup.addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',()=>{if(_open)_closePopup();});

    const popRandom=$('mpPopRandom'),popShuffle=$('mpPopShuffle'),popSortToggle=$('mpPopSortToggle');
    [popRandom,popShuffle,popSortToggle].forEach(el=>{
      if(!el)return;
      el.addEventListener('mouseenter',()=>{el.style.background='rgba(50,50,50,0.80)';el.style.color='#fff';});
      el.addEventListener('mouseleave',()=>{el.style.background='';el.style.color='#ccc';});
    });
    if(popRandom) popRandom.addEventListener('click',e=>{e.stopPropagation();if(TRACKS.length)loadTrack(rnd(),isPlaying);_closePopup();});
    if(popShuffle) popShuffle.addEventListener('click',e=>{e.stopPropagation();shuffleOn=!shuffleOn;popShuffle.textContent=shuffleOn?'Shuffle: ON':'Shuffle: OFF';popShuffle.style.color=shuffleOn?'#fff':'#ccc';});
    if(popSortToggle&&sortSubmenu){
      sortSubmenu.style.cssText='display:none;background:rgba(8,2,2,.98);padding:3px 0;border-top:1px solid rgba(80,20,20,.3);';
      popSortToggle.addEventListener('click',e=>{e.stopPropagation();_sortOpen=!_sortOpen;sortSubmenu.style.display=_sortOpen?'block':'none';const arrow=popSortToggle.querySelector('span');if(arrow)arrow.style.transform=_sortOpen?'rotate(90deg)':'rotate(0deg)';});
    }
  })();

  const likeBtn=$('mpLikeBtn'),dislikeBtn=$('mpDislikeBtn');
  if(likeBtn) likeBtn.addEventListener('click',async()=>{if(curIdx<0||!TRACKS.length)return;const t=TRACKS[curIdx];await LIKES.upvote(t.videoId);updateVoteDisplay(t);buildPlaylist();markActiveTrack(curIdx);});
  if(dislikeBtn) dislikeBtn.addEventListener('click',async()=>{if(curIdx<0||!TRACKS.length)return;const t=TRACKS[curIdx];await LIKES.downvote(t.videoId);updateVoteDisplay(t);buildPlaylist();markActiveTrack(curIdx);});

  PROG_INPUT.addEventListener('input',()=>{const pct=parseFloat(PROG_INPUT.value);setProgFill(pct);seekTo(pct);});
  VOL_RANGE.addEventListener('input',()=>{const v=parseInt(VOL_RANGE.value);prevVol=v;if(VOL_IND)VOL_IND.textContent=v;setVolFill(v);updateVolIcon(v);ytSetVolume(v);if(v>0)ytUnmute();});
  $('muteButton').addEventListener('click',()=>{const v=parseInt(VOL_RANGE.value);if(v>0){prevVol=v;VOL_RANGE.value=0;if(VOL_IND)VOL_IND.textContent='0';setVolFill(0);updateVolIcon(0);ytSetVolume(0);ytMute();}else{VOL_RANGE.value=prevVol;if(VOL_IND)VOL_IND.textContent=prevVol;setVolFill(prevVol);updateVolIcon(prevVol);ytUnmute();ytSetVolume(prevVol);}});
  $('audioLoop').addEventListener('click',()=>{loopOn=!loopOn;$('audioLoopImage').src=loopOn?'https://frutigeraeroarchive.org/images/music_player/music_player_loop_on.png':'https://frutigeraeroarchive.org/images/music_player/music_player_loop_off.png';});
  $('audioPlayPause').addEventListener('click',togglePlay);
  $('audioBack').addEventListener('click',prevTrack);
  $('audioForward').addEventListener('click',nextTrack);
  document.querySelectorAll('.email-contact-link').forEach(el=>el.addEventListener('click',ev=>{ev.preventDefault();gotoPage('contact');history.pushState({page:'contact'},'','#contact');}));
  try{navigator.mediaSession.setActionHandler('previoustrack',prevTrack);navigator.mediaSession.setActionHandler('nexttrack',nextTrack);}catch(_){}

  let rawHash=window.location.hash.replace(/^#/,'').toLowerCase().split('?')[0];
  if(!rawHash||rawHash==='index.html') rawHash='introduction';
  if(!VALID_PAGES.includes(rawHash)){window.location.href=NOT_FOUND_URL;return;}
  _currentPage=rawHash;gotoPage(rawHash);history.replaceState({page:rawHash},'','#'+rawHash);

  setVolFill(prevVol);updateVolIcon(prevVol);if(VOL_IND)VOL_IND.textContent=prevVol;
});