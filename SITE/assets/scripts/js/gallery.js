/* ================================================================
   gallery.js — Sketchbook Gallery System
   Images : static GALLERY_ITEMS (no Firebase for artwork)
   Ratings: Firebase Realtime Database only
             path: gallery/ratings/{index}/users/{userId} = stars
   ================================================================ */

   const IMG_BASE = '../images/sketches/';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBBr6zPaWgGNcGHz9iiNTO8O4EgAzsUMOk",
  authDomain:        "scrapfielddatabase.firebaseapp.com",
  databaseURL:       "https://scrapfielddatabase-default-rtdb.firebaseio.com",
  projectId:         "scrapfielddatabase",
  storageBucket:     "scrapfielddatabase.firebasestorage.app",
  messagingSenderId: "489751764776",
  appId:             "1:489751764776:web:22255a1e9bf05a538bfa1d",
  measurementId:     "G-WN09XFRPTK"
};

/* ── Static artwork list – newest first ── */
const GALLERY_ITEMS = [
  {
    src: IMG_BASE + 'alienmaldito.png',
    title: 'Sketch Alien Hominid',
    description: 'aliennnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn',
  },
  {
    src: IMG_BASE + 'rikafurude.png',
    title: 'Neko Rika',
    description: 'nipah~',
  },
  {
    src: IMG_BASE + 'dante2.png',
    title: 'Sketch Dante 2',
    description: 'kewl sworddd',
  },
  {
    src: IMG_BASE + 'dante3.png',
    title: 'Sketch Dante 1',
    description: 'boooooriiinggg',
  },
  {
    src: IMG_BASE + 'coelho5.png',
    title: 'Do NOT let em in',
    description: 'Army of violent flesh-eating bunnies outside',
  },
  {
    src: IMG_BASE + 'coelho4.png',
    title: 'You Against They',
    description: "Kill all 'They'",
  },
  {
    src: IMG_BASE + 'coelho3.png',
    title: 'Bunny MF & MF Bunny',
    description: 'It\'s heavily inspired by <a href="https://x.com/sometimes317/status/1861971961259184166" target="_blank" class="gi-link">THAT</a> one blue &amp; yellow paint art',
  },
  {
    src: IMG_BASE + 'coelho2.png',
    title: 'MF Bunny',
    description: 'Lock the doors and close the blinds',
  },
  {
    src: IMG_BASE + 'coelho1.png',
    title: 'MF Bunny rig',
    description: "A fail rig i made using my cat's fur texture.",
  },
  {
    src: IMG_BASE + 'nowyouknowhowitfeelslike.png',
    title: 'Now You know how it feels like',
    description: 'Never pet This.',
  },
  {
    src: IMG_BASE + 'princessunicorn.png', // ← recomendo RENOMEAR o arquivo
    title: 'Princess Unicorn Bunny Kitten Angel the most beautifulest in the whole wide world',
    description: 'Love laugh bunnies 4ever.',
  },
  {
    src: IMG_BASE + 'easter.jpg', // ← recomendo RENOMEAR o arquivo
    title: 'Happy Easter PCDJ!',
    description: 'What the bunny brings you?',
  
   },
  {
    src: IMG_BASE + 'mishanshizune.jpg', // ← recomendo RENOMEAR o arquivo
    title: 'Misha and Shizune from Katawa Shoujo',
    description: 'Lesbian ahhh',
  
  },
  {
    src: IMG_BASE + 'lerolero.png', // ← recomendo RENOMEAR o arquivo
    title: 'Lero lero',
    description: 'lerolerolerolerolero',
  },
  {
    src: IMG_BASE + 'demon.png', // ← recomendo RENOMEAR o arquivo
    title: 'Stare',
    description: '<O> <O>',
  }
];

const STAR_IMG = '../images/starrating.png';
const PAGE_SIZE = 12;

/* ================================================================
   FirebaseManager — ratings only
   ================================================================ */
const FirebaseManager = {
  db: null, _ready: false,
  _ref: null, _get: null, _set: null, _remove: null, _onValue: null,

  init: async function () {
    if (this._ready) return;
    try {
      const { initializeApp }                               = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js');
      const { getDatabase, ref, get, set, remove, onValue } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js');
      const app      = initializeApp(FIREBASE_CONFIG);
      this.db        = getDatabase(app);
      this._ref      = ref;   this._get    = get;
      this._set      = set;   this._remove = remove;
      this._onValue  = onValue;
      this._ready    = true;
    } catch (e) {
      console.warn('[GallerySystem] Firebase unavailable – using localStorage fallback.', e);
    }
  },

  fetchAll: async function () {
    if (!this._ready) return null;
    try { const s = await this._get(this._ref(this.db, 'gallery/ratings')); return s.val() || {}; }
    catch (_) { return null; }
  },

  setUserRating: async function (idx, uid, stars) {
    if (!this._ready) return false;
    try { await this._set(this._ref(this.db, `gallery/ratings/${idx}/users/${uid}`), stars); return true; }
    catch (_) { return false; }
  },

  removeUserRating: async function (idx, uid) {
    if (!this._ready) return false;
    try { await this._remove(this._ref(this.db, `gallery/ratings/${idx}/users/${uid}`)); return true; }
    catch (_) { return false; }
  },

  onItemChange: function (idx, cb) {
    if (!this._ready) return () => {};
    return this._onValue(this._ref(this.db, `gallery/ratings/${idx}`), snap => cb(snap.val()));
  }
};

function getOrCreateUserId () {
  let id = localStorage.getItem('_giUserId');
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('_giUserId', id);
  }
  return id;
}

/* ================================================================
   GallerySystem
   ================================================================ */
const GallerySystem = {
  items: [],
  _firebaseRatings: {},
  _localRatings:    {},
  _useFirebase:     false,
  _userId:          '',
  _sortMode:        'newest',
  _currentPage:     0,

  /* lightbox */
  _lbIdx: 0, _lbScale: 1,
  _lbDragging: false, _lbDragStart: null, _lbImgPos: { x:0, y:0 },
  _snapTimer: null,   _holdTimer:   null,

  /* ── INIT ── */
  init: async function () {
    if (this._initDone) { this.render(); return; }
    this._initDone = true;
    this.items     = GALLERY_ITEMS;
    this._userId   = getOrCreateUserId();
    try { const s = localStorage.getItem('_giSortMode'); if (s) this._sortMode = s; } catch (_) {}

    await FirebaseManager.init();
    this._useFirebase = FirebaseManager._ready;

    if (this._useFirebase) {
      const data = await FirebaseManager.fetchAll();
      if (data) {
        Object.entries(data).forEach(([k, v]) => {
          this._firebaseRatings[k]         = v;
          this._firebaseRatings[Number(k)] = v;
        });
      }
      this.items.forEach((_, i) => {
        FirebaseManager.onItemChange(i, val => {
          if (val) { this._firebaseRatings[i] = val; this._firebaseRatings[String(i)] = val; }
          else     { delete this._firebaseRatings[i]; delete this._firebaseRatings[String(i)]; }
          this.updateRatingUI(i);
          this.updateAwardedSection();
        });
        // ── Sincroniza contagem de sketches no Firebase para o index.html ──
FirebaseManager._set(
  FirebaseManager._ref(FirebaseManager.db, 'archive/sketchCount'),
  GALLERY_ITEMS.length
);
      });
    } else {
      try { this._localRatings = JSON.parse(localStorage.getItem('galleryRatings') || '{}'); }
      catch (_) { this._localRatings = {}; }
    }

    this.render();
    this._buildSortPanel();

    /* hide loading banner */
    const banner = document.getElementById('galleryLoadBanner');
    if (banner) banner.classList.remove('visible');

    /* show rating status */
    const status = document.getElementById('ratingStatus');
    if (status) status.textContent = this._useFirebase ? 'Ratings: live' : 'Ratings: local';
  },

  /* ── RATINGS ── */
  _getRatingData: function (idx) {
    if (this._useFirebase) {
      const d = this._firebaseRatings[idx] || this._firebaseRatings[String(idx)];
      if (!d || !d.users) return { allStars: [], userStars: 0 };
      const u = d.users;
      return { allStars: Object.values(u).filter(v => typeof v === 'number' && v > 0), userStars: u[this._userId] || 0 };
    }
    const d = this._localRatings[idx] || { ratings: [], userRating: 0 };
    return { allStars: d.ratings || [], userStars: d.userRating || 0 };
  },

  getAverage:    function (idx) { const { allStars } = this._getRatingData(idx); if (!allStars.length) return 0; return allStars.reduce((a,b) => a+b, 0) / allStars.length; },
  getCount:      function (idx) { return this._getRatingData(idx).allStars.length; },
  getUserRating: function (idx) { return this._getRatingData(idx).userStars; },

  rate: async function (idx, stars) {
    const prev = this.getUserRating(idx);
    const next = prev === stars ? 0 : stars;
    if (this._useFirebase) {
      next === 0
        ? await FirebaseManager.removeUserRating(idx, this._userId)
        : await FirebaseManager.setUserRating(idx, this._userId, next);
    } else {
      if (!this._localRatings[idx]) this._localRatings[idx] = { ratings: [], userRating: 0 };
      const d = this._localRatings[idx];
      if (d.userRating > 0) { const i = d.ratings.indexOf(d.userRating); if (i > -1) d.ratings.splice(i,1); }
      d.userRating = next;
      if (next > 0) d.ratings.push(next);
      localStorage.setItem('galleryRatings', JSON.stringify(this._localRatings));
      this.updateRatingUI(idx);
      this.updateAwardedSection();
    }
  },

  /* ── AWARDED ── */
  getAwardedIdx: function () {
    let topIdx = null, topAvg = 0, topPos = 0;
    this.items.forEach((_, i) => {
      const avg = this.getAverage(i), cnt = this.getCount(i);
      const pos = this._getRatingData(i).allStars.filter(r => r >= 3).length;
      if (cnt >= 1 && (avg > topAvg || (avg === topAvg && pos > topPos))) { topIdx = i; topAvg = avg; topPos = pos; }
    });
    return topIdx;
  },
  isAwarded: function (idx) { return this.getAwardedIdx() === idx; },

  /* ── SORT PANEL ── */
  _buildSortPanel: function () {
    const btn   = document.getElementById('gallerySortBtn');
    const panel = document.getElementById('gallerySortPanel');
    if (!btn || !panel) return;

    const sorts = [
      ['newest',  'Newest First'],
      ['oldest',  'Oldest First'],
      ['highest', 'Highest Rated'],
      ['lowest',  'Lowest Rated'],
      ['awarded', 'Awarded Only'],
    ];

    const build = () => {
      panel.innerHTML = '';
      sorts.forEach(([key, label]) => {
        const opt = document.createElement('div');
        opt.dataset.sort  = key;
        opt.style.cssText = `padding:5px 14px;cursor:pointer;color:${key === this._sortMode ? '#cc1a1a' : '#ccc'};`;
        opt.textContent   = (key === this._sortMode ? 'X ' : '') + label;
        opt.onmouseover   = () => { opt.style.color = '#cc1a1a'; };
        opt.onmouseout    = () => { opt.style.color = this._sortMode === key ? '#cc1a1a' : '#ccc'; };
        opt.addEventListener('click', () => {
          this._sortMode    = key;
          this._currentPage = 0;
          try { localStorage.setItem('_giSortMode', key); } catch (_) {}
          panel.style.display = 'none';
          build();
          this.renderGrid();
        });
        panel.appendChild(opt);
      });
    };
    build();

    if (!btn._wired) {
      btn._wired = true;
      btn.addEventListener('click', e => { e.stopPropagation(); panel.style.display = panel.style.display === 'none' ? '' : 'none'; });
      document.addEventListener('click', () => { panel.style.display = 'none'; });
    }
    const parent = btn.parentElement;
    if (parent) parent.style.position = 'relative';
  },

  /* ── SORTED + FILTERED ITEMS ── */
  _getSortedItems: function () {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    let indexed = this.items.map((item, i) => ({ item, i }));
    if (q) indexed = indexed.filter(({ item }) =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
    switch (this._sortMode) {
      case 'oldest':  return [...indexed].reverse();
      case 'highest': return [...indexed].sort((a,b) => this.getAverage(b.i) - this.getAverage(a.i));
      case 'lowest':  return [...indexed].sort((a,b) => this.getAverage(a.i) - this.getAverage(b.i));
      case 'awarded': return indexed.filter(({ i }) => this.isAwarded(i));
      default:        return indexed;
    }
  },

  /* ── RENDER ── */
  render: function () { this.renderAwarded(); this.renderGrid(); },

  /* ── STAR NODES ── */
  _buildStarNodes: function (idx, interactive, big) {
    const userRating = this.getUserRating(idx);
    const avg        = this.getAverage(idx);
    const cnt        = this.getCount(idx);
    const sz         = big ? 26 : 14;

    const row = document.createElement('div');
    row.className        = 'gi-stars-row';
    row.dataset.ratingId = idx;
    if (interactive) row.classList.add('gi-stars-interactive');

    for (let s = 1; s <= 5; s++) {
      const wrap        = document.createElement('span');
      wrap.className    = 'gi-star' + (interactive ? ' gi-star-interactive' : '');
      wrap.dataset.idx  = idx;
      wrap.dataset.stars = s;

      const img     = document.createElement('img');
      img.src       = STAR_IMG;
      img.width     = sz;
      img.height    = sz;
      img.draggable = false;
      img.style.opacity = userRating >= s ? '1' : '0.25';
      if (userRating >= s) wrap.classList.add('gi-star-on');
      if (!interactive)    img.style.pointerEvents = 'none';
      wrap.appendChild(img);
      row.appendChild(wrap);
    }

    const avgSpan       = document.createElement('span');
    avgSpan.className   = 'gi-avg';
    avgSpan.textContent = avg > 0 ? avg.toFixed(1) : 'N/A';
    row.appendChild(avgSpan);

    const cntSpan       = document.createElement('span');
    cntSpan.className   = 'gi-cnt';
    cntSpan.textContent = '(' + cnt + ')';
    row.appendChild(cntSpan);

    return row;
  },

  /* ── AWARDED SECTION ── */
  renderAwarded: function () {
    const wrap = document.getElementById('galleryAwarded');
    if (!wrap) return;
    const aIdx = this.getAwardedIdx();

    if (aIdx === null || !this.items[aIdx]) {
      wrap.innerHTML = '<div class="gi-awarded-empty">Rate artworks to set a winner!</div>';
      return;
    }

    const item    = this.items[aIdx];
    wrap.innerHTML = '';

    const layout = document.createElement('div'); layout.className = 'gi-awarded-layout';

    const titleTop = document.createElement('div'); titleTop.className = 'gi-awarded-title-top'; titleTop.textContent = item.title;

    const imgbox = document.createElement('div'); imgbox.className = 'gi-awarded-imgbox';
    const aimg   = document.createElement('img');
    aimg.src = item.src; aimg.className = 'gi-awarded-img'; aimg.alt = item.title;
    aimg.onclick = () => GallerySystem.openLightbox(aIdx);
    aimg.style.cssText = 'pointer-events:auto;cursor:zoom-in;';
    imgbox.appendChild(aimg);

    const desc = document.createElement('div'); desc.className = 'gi-awarded-desc'; desc.innerHTML = item.description || '';

    const starsWrap = document.createElement('div'); starsWrap.className = 'gi-awarded-stars-wrap';
    starsWrap.appendChild(this._buildStarNodes(aIdx, false, true));

    layout.appendChild(titleTop); layout.appendChild(imgbox);
    layout.appendChild(desc);     layout.appendChild(starsWrap);
    wrap.appendChild(layout);
  },

  /* ── STAR DELEGATION ── */
  _bindStarsDirect: function (container) {
    const handler = e => {
      let el = e.target;
      while (el && el !== container) {
        if (el.classList && el.classList.contains('gi-star-interactive')) {
          e.preventDefault(); e.stopPropagation();
          const idx   = parseInt(el.dataset.idx);
          const stars = parseInt(el.dataset.stars);
          if (!isNaN(idx) && !isNaN(stars)) GallerySystem.rate(idx, stars);
          return;
        }
        el = el.parentElement;
      }
    };
    container.addEventListener('click',    handler, true);
    container.addEventListener('touchend', handler, { passive: false, capture: true });
  },

  /* ── GRID ── */
  renderGrid: function () {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const sorted = this._getSortedItems();
    const countEl = document.getElementById('galleryCount');
    if (countEl) countEl.textContent = this.items.length + ' piece' + (this.items.length !== 1 ? 's' : '');

    if (!sorted.length) {
      grid.innerHTML = '<div class="gi-empty">No results.</div>';
      this._renderPager(0, 0);
      return;
    }

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    if (this._currentPage >= totalPages) this._currentPage = 0;

    const start     = this._currentPage * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);

    if (!grid._starBound) {
      grid._starBound = true;
      const gh = e => {
        let el = e.target;
        while (el && el !== grid) {
          if (el.classList && el.classList.contains('gi-star-interactive')) {
            e.preventDefault(); e.stopPropagation();
            const idx = parseInt(el.dataset.idx), s = parseInt(el.dataset.stars);
            if (!isNaN(idx) && !isNaN(s)) GallerySystem.rate(idx, s);
            return;
          }
          el = el.parentElement;
        }
      };
      grid.addEventListener('click',    gh, true);
      grid.addEventListener('touchend', gh, { passive: false, capture: true });
    }

    pageItems.forEach(({ item, i }) => grid.appendChild(this._buildCard(item, i)));
    this._renderPager(totalPages, sorted.length);
  },

  /* ── PAGER (outside the grid container) ── */
  _renderPager: function (totalPages, totalItems) {
    /* left arrow */
    const leftWrap  = document.getElementById('galleryArrowLeft');
    const rightWrap = document.getElementById('galleryArrowRight');
    const numsWrap  = document.getElementById('galleryPagerNums');
    const infoWrap  = document.getElementById('galleryPagerInfo');

    [leftWrap, rightWrap, numsWrap, infoWrap].forEach(el => { if (el) el.innerHTML = ''; });

    if (totalPages <= 1) {
      if (leftWrap)  leftWrap.innerHTML  = '';
      if (rightWrap) rightWrap.innerHTML = '';
      return;
    }

    if (leftWrap) {
      const btn = document.createElement('button');
      btn.className   = 'gi-arrow-btn';
      btn.innerHTML   = '&#9664;';
      btn.title       = 'Previous page';
      btn.disabled    = this._currentPage === 0;
      btn.addEventListener('click', () => {
        if (this._currentPage > 0) { this._currentPage--; this.renderGrid(); }
      });
      leftWrap.appendChild(btn);
    }

    if (rightWrap) {
      const btn = document.createElement('button');
      btn.className   = 'gi-arrow-btn';
      btn.innerHTML   = '&#9654;';
      btn.title       = 'Next page';
      btn.disabled    = this._currentPage >= totalPages - 1;
      btn.addEventListener('click', () => {
        if (this._currentPage < totalPages - 1) { this._currentPage++; this.renderGrid(); }
      });
      rightWrap.appendChild(btn);
    }

    if (numsWrap) {
      for (let p = 0; p < totalPages; p++) {
        const btn = document.createElement('button');
        btn.className   = 'gi-pager-num' + (p === this._currentPage ? ' active' : '');
        btn.textContent = p + 1;
        btn.addEventListener('click', () => { this._currentPage = p; this.renderGrid(); });
        numsWrap.appendChild(btn);
      }
    }

    if (infoWrap) {
      infoWrap.textContent = `Page ${this._currentPage + 1} / ${totalPages}`;
    }
  },

  /* ── CARD ── */
  _buildCard: function (item, i) {
    const card      = document.createElement('div');
    card.className  = 'gi-card' + (this.isAwarded(i) ? ' gi-card-awarded' : '');
    card.dataset.idx = i;

    const imgWrap     = document.createElement('div');
    imgWrap.className = 'gi-card-imgwrap';
    imgWrap.addEventListener('click', () => GallerySystem.openLightbox(i));

    const img   = document.createElement('img');
    img.src     = item.src;
    img.alt     = item.title;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    const ov     = document.createElement('div');
    ov.className = 'gi-card-overlay';
    imgWrap.appendChild(ov);
    card.appendChild(imgWrap);

    const body     = document.createElement('div');
    body.className = 'gi-card-body';

    const titleEl       = document.createElement('div');
    titleEl.className   = 'gi-card-title';
    titleEl.textContent = item.title;
    body.appendChild(titleEl);

    const descEl     = document.createElement('div');
    descEl.className = 'gi-card-desc';
    descEl.innerHTML = item.description || '';
    body.appendChild(descEl);

    const rLabel       = document.createElement('div');
    rLabel.className   = 'gi-rating-label';
    rLabel.textContent = 'RATING';
    body.appendChild(rLabel);

    body.appendChild(this._buildStarNodes(i, true, false));
    card.appendChild(body);
    this._bindStarsDirect(body);
    return card;
  },

  /* ── UPDATE RATING UI ── */
  updateRatingUI: function (idx) {
    const userRating = this.getUserRating(idx);
    const avg        = this.getAverage(idx);
    const cnt        = this.getCount(idx);

    document.querySelectorAll(`[data-rating-id="${idx}"]`).forEach(row => {
      row.querySelectorAll('.gi-star').forEach((star, si) => {
        const on = userRating >= si + 1;
        star.classList.toggle('gi-star-on', on);
        const img = star.querySelector('img');
        if (img) img.style.opacity = on ? '1' : (star.classList.contains('gi-star-interactive') ? '0.3' : '0.25');
      });
      const avgEl = row.querySelector('.gi-avg'); if (avgEl) avgEl.textContent = avg > 0 ? avg.toFixed(1) : 'N/A';
      const cntEl = row.querySelector('.gi-cnt'); if (cntEl) cntEl.textContent = '(' + cnt + ')';
    });
  },

  updateAwardedSection: function () {
    this.renderAwarded();
    document.querySelectorAll('.gi-card').forEach(card => {
      const i = parseInt(card.dataset.idx);
      card.classList.toggle('gi-card-awarded', this.isAwarded(i));
    });
  },

  /* ── LIGHTBOX ── */
  openLightbox: function (idx) {
    this._lbIdx    = idx;
    this._lbScale  = 1;
    this._lbImgPos = { x:0, y:0 };
    this._lbDragging = false;

    let box = document.getElementById('giLightbox');
    if (!box) {
      box           = document.createElement('div');
      box.id        = 'giLightbox';
      box.className = 'gi-lb-overlay';
      box.innerHTML = `
        <div class="gi-lb-box">
          <div class="gi-lb-titlebar">
            <span id="giLbTitle"></span>
            <button class="gi-lb-close" onclick="GallerySystem.closeLightbox()">X</button>
          </div>
          <div class="gi-lb-imgarea" id="giLbImgArea">
            <button class="gi-lb-arrow gi-lb-prev" onclick="GallerySystem.lbNav(-1)">&#9664;</button>
            <div class="gi-lb-imgwrap" id="giLbImgWrap">
              <img id="giLbImg" src="" alt="" draggable="false">
            </div>
            <button class="gi-lb-arrow gi-lb-next" onclick="GallerySystem.lbNav(1)">&#9654;</button>
          </div>
          <div class="gi-lb-bottom">
            <div class="gi-lb-desc" id="giLbDesc"></div>
            <div class="gi-lb-meta">
              <span id="giLbCounter"></span>
              <div id="giLbStars"></div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(box);
      box.addEventListener('click', e => { if (e.target === box) this.closeLightbox(); });
      document.addEventListener('keydown', e => {
        const lb = document.getElementById('giLightbox');
        if (!lb || !lb.classList.contains('gi-lb-active')) return;
        if (e.key === 'ArrowLeft')  this.lbNav(-1);
        if (e.key === 'ArrowRight') this.lbNav(1);
        if (e.key === 'Escape')     this.closeLightbox();
      });
      this._initLbInteraction();
    }

    this._lbUpdate();
    box.classList.add('gi-lb-active');
  },

  _initLbInteraction: function () {
    const wrap = document.getElementById('giLbImgWrap');
    if (!wrap) return;

    const snap = () => {
      clearTimeout(this._snapTimer);
      this._snapTimer = setTimeout(() => {
        const d = Math.hypot(this._lbImgPos.x, this._lbImgPos.y);
        if (d > 150 || this._lbScale < 0.9 || this._lbScale > 6) {
          this._lbScale  = 1; this._lbImgPos = { x:0, y:0 };
          this._applyLbTransform();
        }
      }, 5000);
    };

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      this._lbScale = Math.max(0.5, Math.min(8, this._lbScale + (e.deltaY < 0 ? 0.18 : -0.18)));
      this._applyLbTransform(); snap();
    }, { passive: false });

    let mdx = 0, mdy = 0;
    wrap.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); mdx = e.clientX; mdy = e.clientY;
      this._lbDragging  = false;
      this._lbDragStart = { x: e.clientX - this._lbImgPos.x, y: e.clientY - this._lbImgPos.y };
      this._holdTimer = setTimeout(() => { this._lbDragging = true; wrap.style.cursor = 'grabbing'; }, 150);
    });

    window.addEventListener('mousemove', e => {
      if (!this._lbDragStart) return;
      if (Math.hypot(e.clientX-mdx, e.clientY-mdy) > 5 && !this._lbDragging && e.buttons === 1) {
        clearTimeout(this._holdTimer); this._lbDragging = true; wrap.style.cursor = 'grabbing';
      }
      if (this._lbDragging && e.buttons === 1) {
        this._lbImgPos.x = e.clientX - this._lbDragStart.x;
        this._lbImgPos.y = e.clientY - this._lbDragStart.y;
        this._applyLbTransform();
      }
    });

    window.addEventListener('mouseup', e => {
      clearTimeout(this._holdTimer);
      const moved = Math.hypot(e.clientX-mdx, e.clientY-mdy);
      if (e.button === 2) { this._lbScale = Math.max(0.5, this._lbScale - 0.35); this._applyLbTransform(); snap(); }
      else if (e.button === 0) {
        if (!this._lbDragging && moved < 6) { this._lbScale = Math.min(8, this._lbScale + 0.35); this._applyLbTransform(); snap(); }
        else if (this._lbDragging) snap();
      }
      this._lbDragging = false; this._lbDragStart = null;
      const w2 = document.getElementById('giLbImgWrap');
      if (w2) w2.style.cursor = this._lbScale > 1 ? 'grab' : 'default';
    });

    wrap.addEventListener('contextmenu', e => e.preventDefault());

    let ltd = null;
    wrap.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this._lbDragging  = true;
        this._lbDragStart = { x: e.touches[0].clientX - this._lbImgPos.x, y: e.touches[0].clientY - this._lbImgPos.y };
      } else if (e.touches.length === 2) {
        ltd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
      e.preventDefault();
    }, { passive: false });

    wrap.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && this._lbDragging) {
        this._lbImgPos.x = e.touches[0].clientX - this._lbDragStart.x;
        this._lbImgPos.y = e.touches[0].clientY - this._lbDragStart.y;
        this._applyLbTransform();
      } else if (e.touches.length === 2 && ltd !== null) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this._lbScale = Math.max(0.5, Math.min(8, this._lbScale * (d/ltd)));
        ltd = d; this._applyLbTransform();
      }
      e.preventDefault();
    }, { passive: false });

    wrap.addEventListener('touchend', e => {
      if (e.touches.length === 0) { this._lbDragging = false; ltd = null; snap(); }
    });

    wrap.addEventListener('dblclick', () => this.lbResetZoom());
  },

  _applyLbTransform: function () {
    const img  = document.getElementById('giLbImg');
    const wrap = document.getElementById('giLbImgWrap');
    if (!img) return;
    img.style.transition      = 'none';
    img.style.transform       = `translate(${this._lbImgPos.x}px,${this._lbImgPos.y}px) scale(${this._lbScale})`;
    img.style.transformOrigin = 'center center';
    if (wrap) wrap.style.cursor = this._lbScale > 1 ? 'grab' : 'default';
  },

  lbResetZoom: function () {
    clearTimeout(this._snapTimer);
    this._lbScale = 1; this._lbImgPos = { x:0, y:0 };
    this._applyLbTransform();
  },

  _lbUpdate: function () {
    const item = this.items[this._lbIdx];
    if (!item) return;
    this._lbScale = 1; this._lbImgPos = { x:0, y:0 };

    const img = document.getElementById('giLbImg');
    img.src = item.src; img.style.transform = '';

    const wrap = document.getElementById('giLbImgWrap');
    if (wrap) wrap.style.cursor = 'zoom-in';

    document.getElementById('giLbTitle').textContent   = item.title;
    document.getElementById('giLbDesc').innerHTML      = item.description || '';
    document.getElementById('giLbCounter').textContent = (this._lbIdx + 1) + ' / ' + this.items.length;

    const starsEl = document.getElementById('giLbStars');
    starsEl.innerHTML = '';
    starsEl.appendChild(this._buildStarNodes(this._lbIdx, true));
    this._bindStarsDirect(starsEl);
  },

  lbNav: function (dir) {
    this._lbIdx = (this._lbIdx + dir + this.items.length) % this.items.length;
    this._lbUpdate();
  },

  closeLightbox: function () {
    const box = document.getElementById('giLightbox');
    if (box) box.classList.remove('gi-lb-active');
    this._lbDragging = false;
  }
};

window.GallerySystem = GallerySystem;

/* ── Auto-init ── */
document.addEventListener('DOMContentLoaded', () => {
  const spa = document.getElementById('pg-sketchbook');
  if (spa) {
    const observer = new MutationObserver(() => { if (spa.classList.contains('active')) GallerySystem.init(); });
    observer.observe(spa, { attributes: true, attributeFilter: ['class'] });
    if (spa.classList.contains('active')) GallerySystem.init();
  } else {
    GallerySystem.init();
    // ── Sync sketch count to stat element ──
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('stat-sketches');
  if (el) el.textContent = String(GALLERY_ITEMS.length).padStart(2, '0');
});
  }
});