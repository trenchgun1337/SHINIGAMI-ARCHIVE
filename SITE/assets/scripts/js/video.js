/* ================================================================
   video.js — Video Player page logic
   ================================================================ */

const DEFAULT_OPENING_ID = 'XgWkIrFQQE0';
const DEFAULT_ENDING_ID  = 'P5lUhHGudEw';

/* Vote icons */
const VI_LIKE_ICON    = 'https://cdn-icons-png.flaticon.com/128/739/739231.png';
const VI_DISLIKE_ICON = 'https://cdn-icons-png.flaticon.com/128/880/880613.png';

/* Newest first */
const ANIME_VIDEOS = [
  { id: '6EUYBWhVkKg' },
  { id: 'Kc8GNaED3Ok' },
  { id: 'xX050NcDNAU' },
  { id: 'VIop055eJhU' },
  { id: 'HbL5M_XplKk' },
  { id: 'dAWZDLI20sE' },
  { id: 'Uoa9yyYcF2g' },
  { id: 'tg8Jahz6RM4' },
  { id: 'Xr10rc1aE-w' },
  { id: 'jcgDIUvLL6c' },
  { id: 'yTQu1kn-eVY' },
  { id: '59jHEoNSlA0' },
  { id: '7GwBMFaQqTk' },
  { id: 'g_5_gkHLMYc' },
  { id: 'uv6yK47m564' },
  { id: 'AqI97zHMoQw' },
  { id: 'HQgaCVT9Bw8' },
  { id: 'qrwVthk38b0' },
  { id: 'JALbemLw3G4' },
  { id: 'FtutLA63Cp8' },
  { id: 'tVoKUqlGdh4' },
  { id: 'ZESfaEhd_LQ' },
  { id: 'VgDgWzBL7s4' },
  { id: 'HaEe6eY798c' },
  { id: 'P5lUhHGudEw' },
  { id: 'XgWkIrFQQE0' },
  { id: 'eiL0oCXqYYE' }
];

const NOSTALGIA_VIDEOS = [
  { id: 'Z3ZAGBL6UBA' },
  { id: 'j5C6X9vOEkU' },
  { id: 'EwTZ2xpQwpA' },
  { id: 'J---aiyznGQ' },
  { id: 'ZZ5LpwO-An4' },
  { id: 'Q16KpquGsIc' },
  { id: 'qItugh-fFgg' },
  { id: 'VqB1uoDTdKM' },
  { id: 'LXuR41eisnM' },
  { id: 'mbIjDZKMguc' },
  { id: 'qOV6thu0tLY' },
  { id: 'IJowqDn5S9c' },
];

const AWESOME_VIDEOS = [];

let ytPlayer       = null;
let ytReady        = false;
let videosInited   = false;
let videoAutoPlay  = false;
let cycleMode      = true;
let currentVideoId = DEFAULT_OPENING_ID;

/* Current global sort mode for video sections */
let _videoGlobalSort = 'default';

const VIDEO_INFO_CACHE = {};

/* ── Video ratings ── */
const VIDEO_RATINGS = {};
function _loadVideoRatings() { try { Object.assign(VIDEO_RATINGS, JSON.parse(localStorage.getItem('_videoRatings')||'{}')); } catch(e) {} }
function _saveVideoRatings() { try { localStorage.setItem('_videoRatings', JSON.stringify(VIDEO_RATINGS)); } catch(e) {} }
function _ensureVideoRating(id) { if (!VIDEO_RATINGS[id]) VIDEO_RATINGS[id]={up:0,down:0,vote:0}; }
function videoUpvote(id) {
  _ensureVideoRating(id); const d=VIDEO_RATINGS[id];
  if(d.vote===1){d.up=Math.max(0,d.up-1);d.vote=0;}else{if(d.vote===-1)d.down=Math.max(0,d.down-1);d.up++;d.vote=1;}
  _saveVideoRatings(); return d;
}
function videoDownvote(id) {
  _ensureVideoRating(id); const d=VIDEO_RATINGS[id];
  if(d.vote===-1){d.down=Math.max(0,d.down-1);d.vote=0;}else{if(d.vote===1)d.up=Math.max(0,d.up-1);d.down++;d.vote=-1;}
  _saveVideoRatings(); return d;
}
function getVideoRating(id) { _ensureVideoRating(id); return VIDEO_RATINGS[id]; }
function getVideoScore(id)  { const d=getVideoRating(id); return d.up-d.down; }

/* ================================================================
   External link warning popup
   ================================================================ */
function _showExternalLinkWarn(url) {
  const skipKey = '_skipExternalWarn';
  if (localStorage.getItem(skipKey) === '1') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const old = document.getElementById('_extLinkWarn');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = '_extLinkWarn';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:99000;display:flex;align-items:center;justify-content:center;font-family:Tahoma,sans-serif;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#0a0202;border:1px solid rgba(180,20,20,.6);max-width:380px;width:90%;padding:0;box-shadow:0 0 40px rgba(0,0,0,.9);';
  const titleBar = document.createElement('div');
  titleBar.style.cssText = 'background:linear-gradient(to bottom,rgba(255,255,255,.18) 0%,rgba(160,160,160,.82) 0%,rgba(100,100,100,.72) 4%,rgba(22,22,22,.97) 52%,rgba(4,4,4,1) 52%,rgba(12,12,12,.99) 100%);border-bottom:1px solid rgba(50,50,50,.9);padding:6px 10px 7px;text-align:center;font-size:12px;color:#f0f0f0;text-shadow:0 1px 3px rgba(0,0,0,.95);letter-spacing:.3px;position:relative;';
  titleBar.textContent = '⚠ External Link Warning';
  const body = document.createElement('div');
  body.style.cssText = 'padding:14px 16px 10px;';
  const msg = document.createElement('p');
  msg.style.cssText = 'color:#ccc;font-size:11.5px;line-height:1.6;margin-bottom:10px;';
  msg.textContent = 'You are about to visit an external link. The author of this site takes no responsibility for any damages or risks associated with clicking on unknown external links. Proceed at your own risk.';
  const urlPreview = document.createElement('div');
  urlPreview.style.cssText = 'background:rgba(255,255,255,.04);border:1px solid rgba(100,100,100,.3);padding:5px 8px;margin-bottom:12px;word-break:break-all;font-size:10px;color:#888;max-height:48px;overflow:hidden;text-overflow:ellipsis;';
  urlPreview.textContent = url;
  const dontShowRow = document.createElement('div');
  dontShowRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:14px;';
  const chk = document.createElement('input');
  chk.type = 'checkbox'; chk.id = '_extWarnChk';
  chk.style.cssText = 'cursor:pointer;accent-color:#cc1a1a;';
  const chkLbl = document.createElement('label');
  chkLbl.htmlFor = '_extWarnChk';
  chkLbl.style.cssText = 'color:#999;font-size:11px;cursor:pointer;';
  chkLbl.textContent = 'Do not show this warning again';
  dontShowRow.appendChild(chk); dontShowRow.appendChild(chkLbl);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'background:linear-gradient(to bottom,rgba(255,255,255,.10) 0,rgba(130,130,130,.20) 20%,rgba(40,40,40,.80) 60%,rgba(12,12,12,.92) 60%,rgba(36,36,36,.72) 100%);border:1px solid rgba(130,130,130,.50);color:#ccc;font-size:11px;font-family:Tahoma,sans-serif;padding:3px 14px 5px;cursor:pointer;';
  cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.filter = 'brightness(1.2)');
  cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.filter = '');
  cancelBtn.addEventListener('click', () => overlay.remove());
  const goBtn = document.createElement('button');
  goBtn.textContent = 'Proceed';
  goBtn.style.cssText = 'background:linear-gradient(to bottom,rgba(255,255,255,.18) 0%,rgba(180,20,20,.70) 0%,rgba(140,10,10,.80) 4%,rgba(80,5,5,.97) 52%,rgba(50,2,2,1) 52%,rgba(90,8,8,.96) 100%);border:1px solid rgba(180,20,20,.60);color:#fff;font-size:11px;font-family:Tahoma,sans-serif;padding:3px 14px 5px;cursor:pointer;';
  goBtn.addEventListener('mouseenter', () => goBtn.style.filter = 'brightness(1.2)');
  goBtn.addEventListener('mouseleave', () => goBtn.style.filter = '');
  goBtn.addEventListener('click', () => {
    if (chk.checked) localStorage.setItem(skipKey, '1');
    overlay.remove();
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  btnRow.appendChild(cancelBtn); btnRow.appendChild(goBtn);
  body.appendChild(msg); body.appendChild(urlPreview); body.appendChild(dontShowRow); body.appendChild(btnRow);
  box.appendChild(titleBar); box.appendChild(body);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ================================================================
   JSONP
   ================================================================ */
let _vjsonpCounter = 0;
function vjsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const cbName='__vtjsonp_'+(++_vjsonpCounter);
    let s;
    const timer=setTimeout(()=>{delete window[cbName];if(s&&s.parentNode)s.parentNode.removeChild(s);reject(new Error('timeout'));},8000);
    window[cbName]=data=>{clearTimeout(timer);delete window[cbName];if(s&&s.parentNode)s.parentNode.removeChild(s);resolve(data);};
    s=document.createElement('script');s.src=url+'&callback='+cbName;
    s.onerror=()=>{clearTimeout(timer);delete window[cbName];reject(new Error('error'));};
    document.head.appendChild(s);
  });
}

async function fetchVideoMeta(videoId) {
  if(VIDEO_INFO_CACHE[videoId]) return VIDEO_INFO_CACHE[videoId];
  const apiKey=(typeof YOUTUBE_API_KEY!=='undefined')?YOUTUBE_API_KEY.trim():'';
  if(!apiKey||apiKey==='SUA_API_KEY_AQUI') return null;
  try {
    const url='https://www.googleapis.com/youtube/v3/videos?part=snippet&id='+encodeURIComponent(videoId)+'&key='+encodeURIComponent(apiKey);
    const data=await vjsonpRequest(url);const snip=data?.items?.[0]?.snippet;if(!snip) return null;
    let dateStr='';
    if(snip.publishedAt){const d=new Date(snip.publishedAt);if(!isNaN(d.getTime()))dateStr=(d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear();}
    let channelAvatarUrl = '';
    const channelId = snip.channelId || '';
    if (channelId) {
      try {
        const chUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&id='+encodeURIComponent(channelId)+'&key='+encodeURIComponent(apiKey);
        const chData = await vjsonpRequest(chUrl);
        const thumb = chData?.items?.[0]?.snippet?.thumbnails;
        channelAvatarUrl = (thumb?.default?.url) || (thumb?.medium?.url) || '';
      } catch(e) {}
    }
    const meta={
      title: snip.title||'',
      desc: snip.description||'',
      date: dateStr,
      channel: snip.channelTitle||'',
      channelId: channelId,
      channelAvatar: channelAvatarUrl
    };
    VIDEO_INFO_CACHE[videoId]=meta;return meta;
  } catch(e){return null;}
}

function ytThumb(id) { return 'https://i.ytimg.com/vi/'+id+'/mqdefault.jpg'; }

/* ================================================================
   YouTube IFrame API
   ================================================================ */
window.onYouTubeIframeAPIReady = function () {
  ytReady=true;if(videosInited) _createPlayer();
};
function _createPlayer() {
  if(!ytReady||ytPlayer) return;
  const el=document.getElementById('videoEmbed');if(!el) return;
  ytPlayer=new YT.Player('videoEmbed',{
    height:'100%',width:'100%',
    playerVars:{rel:0,modestbranding:1,controls:1},
    events:{onReady:_onPlayerReady,onStateChange:_onStateChange}
  });
}
function _onPlayerReady() { ytPlayer.cueVideoById(DEFAULT_OPENING_ID); _setVideoInfo(DEFAULT_OPENING_ID); }
function _onStateChange(event) {
  const s=event.data;
  if(typeof window.renaSetVideosPlaying==='function') window.renaSetVideosPlaying(s===YT.PlayerState.PLAYING);
  if(s===YT.PlayerState.ENDED){
    if(cycleMode){
      if(currentVideoId===DEFAULT_OPENING_ID){_loadVideo(DEFAULT_ENDING_ID,true);}
      else if(currentVideoId===DEFAULT_ENDING_ID){ytPlayer.cueVideoById(DEFAULT_OPENING_ID);currentVideoId=DEFAULT_OPENING_ID;_setVideoInfo(DEFAULT_OPENING_ID);_highlightActive(DEFAULT_OPENING_ID);}
    } else if(videoAutoPlay){_advanceAutoPlay();}
  }
}

function _loadVideo(id, play) {
  if(!ytPlayer) return;
  currentVideoId=id;_setVideoInfo(id);_highlightActive(id);
  if(play) ytPlayer.loadVideoById(id);else ytPlayer.cueVideoById(id);
}
function _highlightActive(id) {
  document.querySelectorAll('.vg-entry').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.vg-entry[data-id="'+id+'"]').forEach(e=>{
    e.classList.add('active');
    e.scrollIntoView({block:'nearest',behavior:'instant'});
  });
}

let _autoPlayList=[], _autoPlayIdx=-1;
function _advanceAutoPlay() {
  if(!_autoPlayList.length) return;
  const next=_autoPlayIdx+1;if(next>=_autoPlayList.length) return;
  _autoPlayIdx=next;const v=_autoPlayList[next];if(v) _loadVideo(v.id,true);
}

/* FIX: scroll the browser window to the top of the page */
function _scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const mc = document.getElementById('mainContent');
  if (mc) mc.scrollTop = 0;
}

function _selectVideo(id, list, idx) { cycleMode=false;_autoPlayList=list;_autoPlayIdx=idx;_loadVideo(id,true);_scrollToTop(); }

/* ================================================================
   Parse description links
   ================================================================ */
function _parseDescLinks(text) {
  if (!text) return '';
  let safe = String(text)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
  safe = safe.replace(/(https?:\/\/[^\s<>"]+)/g, (url) => {
    const disp = url.length > 55 ? url.slice(0, 52) + '…' : url;
    return '<span class="vi-desc-link" data-href="'+url.replace(/"/g,'&quot;')+'" style="color:#cc1a1a;cursor:pointer;text-decoration:underline;" title="'+url.replace(/"/g,'&quot;')+'">'+disp+'</span>';
  });
  return safe;
}

/* ================================================================
   Video info box
   ================================================================ */
async function _setVideoInfo(id) {
  if(!id) return;
  const wrap=document.getElementById('videoInfoBox');if(!wrap) return;
  const ytUrl='https://www.youtube.com/watch?v='+id;
  _renderInfoBox(wrap, id, ytUrl, null, true);
  const meta=await fetchVideoMeta(id);
  _renderInfoBox(wrap, id, ytUrl, meta, false);
  if(meta&&meta.title){
    document.querySelectorAll('.vg-entry[data-id="'+id+'"] .vg-title').forEach(el=>el.textContent=meta.title);
  }
  _refreshGridRatingDisplay();
}

function _renderInfoBox(wrap, id, ytUrl, meta, loading) {
  if(!id) return;
  const title=(meta&&meta.title)?meta.title:(loading?'Loading…':'YouTube Video');
  const desc=(meta&&meta.desc)?meta.desc:'';
  const date=(meta&&meta.date)?meta.date:'';
  const channel=(meta&&meta.channel)?meta.channel:'';
  const channelId=(meta&&meta.channelId)?meta.channelId:'';
  const channelAvatar=(meta&&meta.channelAvatar)?meta.channelAvatar:'';
  const channelUrl = channelId ? 'https://www.youtube.com/channel/'+channelId : '';

  let fullDesc = '';
  if (desc) {
    fullDesc = desc.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 8).join('\n');
  }

  const d=getVideoRating(id);

  let channelRowHtml = '';
  if (loading) {
    channelRowHtml = '<div class="vi-channel-row" style="display:flex;align-items:center;gap:7px;padding:5px 10px 2px;"><span style="color:#666;font-size:11px;">Loading channel…</span></div>';
  } else if (channel) {
    const avatarHtml = channelAvatar
      ? '<img class="vi-channel-avatar" src="'+channelAvatar+'" data-channel-url="'+(channelUrl||'')+'" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0;cursor:'+(channelUrl?'pointer':'default')+';border:1px solid rgba(255 255 255);" draggable="false" onerror="this.style.display=\'none\'">'
      : '<span class="vi-channel-icon" style="width:22px;height:22px;border-radius:50%;background:rgba(180,20,20,.25);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:#cc1a1a;">▶</span>';
    const channelNameHtml = '<span class="vi-channel-name" data-channel-url="'+(channelUrl||'')+'" style="font-family:Tahoma,sans-serif;font-size:11.5px;color:#aaa;cursor:'+(channelUrl?'pointer':'default')+';'+(channelUrl?'text-decoration:underline;':'')+'" title="'+(channelUrl?'Go to channel':'')+'">'+_esc(channel)+'</span>';
    channelRowHtml = '<div class="vi-channel-row" style="display:flex;align-items:center;gap:7px;padding:5px 10px 4px;border-bottom:1px solid rgba(60,60,60,.5);">'+avatarHtml+channelNameHtml+'</div>';
  }

  const titleHtml = '<span class="vi-val-title vi-clickable-title" data-video-url="'+ytUrl+'" style="cursor:pointer;text-decoration:underline;" title="Open on YouTube">'+_esc(title)+'</span>';

  let descBoxHtml = '';
  if (fullDesc) {
    const parsedDesc = _parseDescLinks(fullDesc);
    descBoxHtml = '<div class="vi-desc-scrollbox" style="max-height:64px;overflow-y:auto;overflow-x:hidden;margin:4px 0 3px;padding:4px 6px;background:rgba(255,255,255,.03);border:1px solid rgba(80,80,80,.3);font-size:10.5px;color:#888;line-height:1.5;word-break:break-word;scrollbar-width:thin;scrollbar-color:rgba(140,140,140,.4) rgba(4,4,4,.8);">'+parsedDesc.replace(/\n/g,'<br>')+'</div>';
  }

  wrap.innerHTML=
    '<div class="vi-header">Video Information</div>'
    +channelRowHtml
    +'<div class="vi-body">'
      +'<p class="vi-line"><span class="vi-label">Title: </span>'+titleHtml+'</p>'
      +descBoxHtml
      +(date?'<p class="vi-line"><span class="vi-label">Release date: </span><span class="vi-val-date">'+_esc(date)+'</span></p>':'')
    +'</div>'
    +'<div id="viBottom_'+id+'" style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;padding:4px 8px;position:relative;overflow:visible;z-index:100;background:var(--th-vi-bot-grad);border-top:1px solid var(--th-vi-bot-border);box-shadow:inset 0 1px 0 var(--th-vi-bot-shine);">'
      +'<button id="vUpvoteBtn" class="vi-icon-vote-btn" data-id="'+id+'" title="Like" style="background:none;border:none;cursor:pointer;padding:2px;display:inline-flex;align-items:center;'+(d.vote===1?'opacity:1;':'opacity:0.45;')+'">'
        +'<img src="'+VI_LIKE_ICON+'" style="width:18px;height:18px;vertical-align:middle;pointer-events:none;filter:'+(d.vote===1?'invert(36%) sepia(96%) saturate(400%) hue-rotate(90deg) brightness(1.1)':'grayscale(80%) brightness(0.5)')+'" draggable="false">'
      +'</button>'
      +'<span id="vUpCount" style="font-size:11px;color:#ccc;min-width:14px;">'+d.up+'</span>'
      +'<button id="vDownvoteBtn" class="vi-icon-vote-btn" data-id="'+id+'" title="Dislike" style="background:none;border:none;cursor:pointer;padding:2px;display:inline-flex;align-items:center;'+(d.vote===-1?'opacity:1;':'opacity:0.45;')+'">'
        +'<img src="'+VI_DISLIKE_ICON+'" style="width:18px;height:18px;vertical-align:middle;pointer-events:none;filter:'+(d.vote===-1?'invert(18%) sepia(90%) saturate(600%) hue-rotate(340deg) brightness(1.1)':'grayscale(80%) brightness(0.5)')+'" draggable="false">'
      +'</button>'
      +'<span id="vDownCount" style="font-size:11px;color:#ccc;min-width:14px;">'+d.down+'</span>'
      +'<span style="flex:1;"></span>'
      +'<span id="vPlusBtn" title="Options" style="cursor:pointer;font-size:15px;font-weight:bold;color:rgba(200,200,200,.55);padding:0 4px;user-select:none;line-height:1;flex-shrink:0;position:relative;z-index:101;pointer-events:auto;">+</span>'
      +'<div id="vPlusPopup" style="display:none;position:absolute;right:0;bottom:calc(100% + 2px);z-index:500;background:#050505;border:1px solid rgba(255 255 255);min-width:180px;font-family:Tahoma,sans-serif;font-size:11px;padding:4px 0;pointer-events:auto;">'
        +'<div id="vPopAutoplay" style="padding:5px 14px;cursor:pointer;color:#ccc;display:flex;justify-content:space-between;align-items:center;">Autoplay <span id="vPopAutoplayDot" style="width:7px;height:7px;border-radius:50%;background:#555;display:inline-block;"></span></div>'
        +'<div id="vPopRandom" style="padding:5px 14px;cursor:pointer;color:#ccc;">Random</div>'
        +'<div style="border-top:1px solid rgba(255 255 255);margin:3px 0;"></div>'
        +'<div id="vPopSortToggle" style="padding:5px 14px;cursor:pointer;color:#ccc;display:flex;justify-content:space-between;align-items:center;">Sort <span id="vSortArrow" style="opacity:.5;font-size:9px;">&#9654;</span></div>'
        +'<div id="vSortSubmenu" style="display:none;background:rgba(12,4,4,.98);padding:3px 0;border-top:1px solid rgba(80,20,20,.3);"></div>'
        +'<div style="border-top:1px solid rgba(255 255 255);margin:3px 0;"></div>'
        +'<a id="vPopUrl" href="'+ytUrl+'" target="_blank" rel="noopener noreferrer" style="display:block;padding:5px 14px;cursor:pointer;color:#ccc;text-decoration:none;">URL</a>'
      +'</div>'
    +'</div>';

  const clickTitle = wrap.querySelector('.vi-clickable-title');
  if (clickTitle) {
    clickTitle.addEventListener('click', () => {
      window.open(ytUrl, '_blank', 'noopener,noreferrer');
    });
  }

  wrap.querySelectorAll('.vi-channel-avatar[data-channel-url], .vi-channel-name[data-channel-url]').forEach(el => {
    const url = el.dataset.channelUrl;
    if (url) el.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
  });

  wrap.querySelectorAll('.vi-desc-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      _showExternalLinkWarn(el.dataset.href);
    });
  });

  const upBtn=wrap.querySelector('#vUpvoteBtn');
  const downBtn=wrap.querySelector('#vDownvoteBtn');
  const upCount=wrap.querySelector('#vUpCount');
  const downCount=wrap.querySelector('#vDownCount');

  function _refreshVoteIcons(d2) {
    if(upCount)   upCount.textContent   = d2.up;
    if(downCount) downCount.textContent = d2.down;
    if(upBtn) {
      upBtn.style.opacity = d2.vote===1 ? '1' : '0.45';
      const img = upBtn.querySelector('img');
      if(img) img.style.filter = d2.vote===1
        ? 'invert(36%) sepia(96%) saturate(400%) hue-rotate(90deg) brightness(1.1)'
        : 'grayscale(80%) brightness(0.5)';
    }
    if(downBtn) {
      downBtn.style.opacity = d2.vote===-1 ? '1' : '0.45';
      const img = downBtn.querySelector('img');
      if(img) img.style.filter = d2.vote===-1
        ? 'invert(18%) sepia(90%) saturate(600%) hue-rotate(340deg) brightness(1.1)'
        : 'grayscale(80%) brightness(0.5)';
    }
  }

  if(upBtn){
    upBtn.addEventListener('click',()=>{
      const vid=upBtn.dataset.id;
      const d2=videoUpvote(vid);
      _refreshVoteIcons(d2);
      _refreshGridRatingDisplay();
    });
  }
  if(downBtn){
    downBtn.addEventListener('click',()=>{
      const vid=downBtn.dataset.id;
      const d2=videoDownvote(vid);
      _refreshVoteIcons(d2);
      _refreshGridRatingDisplay();
    });
  }

  /* ── Wire "+" popup ── */
  const vPlusBtn   = wrap.querySelector('#vPlusBtn');
  const vPlusPopup = wrap.querySelector('#vPlusPopup');
  const viBottom   = wrap.querySelector('[id^="viBottom_"]');

  if(viBottom){ viBottom.style.overflow='visible'; viBottom.style.position='relative'; viBottom.style.zIndex='100'; }
  wrap.style.overflow='visible'; wrap.style.position='relative';

  if(vPlusBtn && vPlusPopup) {
    let _vOpen = false, _vSortOpen = false;
    const sortArrow = vPlusPopup.querySelector('#vSortArrow');

    function _closeVPopup() {
      vPlusPopup.style.display='none'; _vOpen=false; _vSortOpen=false;
      const submenu=vPlusPopup.querySelector('#vSortSubmenu');
      if(submenu) submenu.style.display='none';
      if(sortArrow) sortArrow.innerHTML='&#9654;';
    }

    vPlusBtn.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      if(_vOpen){ _closeVPopup(); return; }
      _vSortOpen=false;
      const submenu=vPlusPopup.querySelector('#vSortSubmenu');
      if(submenu) submenu.style.display='none';
      if(sortArrow) sortArrow.innerHTML='&#9654;';
      vPlusPopup.style.display='block'; _vOpen=true;
    });
    vPlusBtn.addEventListener('mouseenter', ()=>vPlusBtn.style.color='#fff');
    vPlusBtn.addEventListener('mouseleave', ()=>{ if(!_vOpen) vPlusBtn.style.color='rgba(200,200,200,.55)'; });
    vPlusPopup.addEventListener('click', e=>e.stopPropagation());
    document.addEventListener('click', ()=>{ if(_vOpen) _closeVPopup(); });

    const sortToggle  = vPlusPopup.querySelector('#vPopSortToggle');
    const sortSubmenu = vPlusPopup.querySelector('#vSortSubmenu');

    if(sortToggle && sortSubmenu) {
      const sorts=[
        ['newest','Newest First'],
        ['oldest','Oldest First'],
        ['highest','Highest Rated'],
        ['lowest','Lowest Rated'],
        ['unrated','Unrated Only'],
      ];
      function _buildSortItems() {
        sortSubmenu.innerHTML='';
        const accentCol=(window._vizAccentColor&&window._vizAccentColor.hex)||'#cc1a1a';
        const accentBg=(window._vizAccentColor)?`rgba(${window._vizAccentColor.r},${window._vizAccentColor.g},${window._vizAccentColor.b},.22)`:'rgba(120,10,10,.3)';
        sorts.forEach(([key,label])=>{
          const opt=document.createElement('div');
          const active = key===_videoGlobalSort;
          opt.style.cssText='padding:4px 20px;cursor:pointer;color:'+(active?accentCol:'#ccc')+';font-size:11px;white-space:nowrap;background:#050505;';
          opt.textContent=(active?'\u2714 ':'')+label;
          opt.addEventListener('mouseenter',()=>{ opt.style.color=accentCol; opt.style.background=accentBg; });
          opt.addEventListener('mouseleave',()=>{ opt.style.color=active?accentCol:'#ccc'; opt.style.background='#050505'; });
          opt.addEventListener('click',e=>{
            e.stopPropagation();
            _closeVPopup();
            _videoGlobalSort = key;
            _rebuildAllVideoSections(key);
          });
          sortSubmenu.appendChild(opt);
        });
      }
      _buildSortItems();
      sortToggle.addEventListener('mouseenter',()=>{ sortToggle.style.background='rgba(120,10,10,.3)'; sortToggle.style.color='#fff'; });
      sortToggle.addEventListener('mouseleave',()=>{ sortToggle.style.background=''; sortToggle.style.color='#ccc'; });
      sortToggle.addEventListener('click', e=>{
        e.stopPropagation(); _vSortOpen=!_vSortOpen;
        sortSubmenu.style.display=_vSortOpen?'block':'none';
        if(sortArrow) sortArrow.innerHTML=_vSortOpen?'&#9660;':'&#9654;';
      });
    }

    const popAutoplay = vPlusPopup.querySelector('#vPopAutoplay');
    const popAutoplayDot = vPlusPopup.querySelector('#vPopAutoplayDot');
    function _updateAutoplayDot() {
      if(!popAutoplayDot) return;
      const accentColor = (window._vizAccentColor && window._vizAccentColor.hex) ? window._vizAccentColor.hex : '#cc1a1a';
      if(videoAutoPlay){
        popAutoplayDot.style.background = accentColor;
        popAutoplayDot.classList.add('dot-on');
      } else {
        popAutoplayDot.style.background = '#555';
        popAutoplayDot.classList.remove('dot-on');
      }
    }
    _updateAutoplayDot();
    if(popAutoplay){
      popAutoplay.addEventListener('mouseenter',()=>{ popAutoplay.style.background='rgba(120,10,10,.3)'; popAutoplay.style.color='#fff'; });
      popAutoplay.addEventListener('mouseleave',()=>{ popAutoplay.style.background=''; popAutoplay.style.color='#ccc'; });
      popAutoplay.addEventListener('click',e=>{
        e.stopPropagation();
        videoAutoPlay=!videoAutoPlay; _updateAutoplayDot();
        if(typeof PREFS!=='undefined'){ PREFS.alwaysAutoplay=videoAutoPlay; PREFS.save(); }
        if(typeof syncVideoAutoplayBtn==='function') syncVideoAutoplayBtn(videoAutoPlay);
      });
    }

    const popRandom = vPlusPopup.querySelector('#vPopRandom');
    if(popRandom){
      popRandom.addEventListener('mouseenter',()=>{ popRandom.style.background='rgba(120,10,10,.3)'; popRandom.style.color='#fff'; });
      popRandom.addEventListener('mouseleave',()=>{ popRandom.style.background=''; popRandom.style.color='#ccc'; });
      popRandom.addEventListener('click',e=>{
        e.stopPropagation(); _closeVPopup();
        const allVids=[...ANIME_VIDEOS,...NOSTALGIA_VIDEOS,...AWESOME_VIDEOS];
        if(!allVids.length) return;
        let r; do{r=Math.floor(Math.random()*allVids.length);}while(allVids.length>1&&allVids[r].id===currentVideoId);
        const v=allVids[r];
        let foundList=ANIME_VIDEOS, foundIdx=ANIME_VIDEOS.findIndex(x=>x.id===v.id);
        if(foundIdx<0){foundList=NOSTALGIA_VIDEOS;foundIdx=NOSTALGIA_VIDEOS.findIndex(x=>x.id===v.id);}
        if(foundIdx<0){foundList=AWESOME_VIDEOS;foundIdx=AWESOME_VIDEOS.findIndex(x=>x.id===v.id);}
        _selectVideo(v.id,foundList,foundIdx);
      });
    }

    const popUrl=vPlusPopup.querySelector('#vPopUrl');
    if(popUrl){
      popUrl.addEventListener('mouseenter',()=>{ popUrl.style.background='rgba(120,10,10,.3)'; popUrl.style.color='#fff'; });
      popUrl.addEventListener('mouseleave',()=>{ popUrl.style.background=''; popUrl.style.color='#ccc'; });
    }
  }

  const autoBtn=document.getElementById('videoAutoPlayBtn');
  if(autoBtn){
    const on=typeof PREFS!=='undefined'?PREFS.alwaysAutoplay:videoAutoPlay;
    autoBtn.textContent=on?'Autoplay Enabled (Click to disable)':'Autoplay Disabled (Click to enable)';
    autoBtn.classList.toggle('on', on);
  }
}

function _esc(str){return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ================================================================
   Sort state per section
   ================================================================ */
const _sectionSortMode = {};
const _sectionList     = {};

function _refreshGridRatingDisplay() {
  document.querySelectorAll('.vg-entry').forEach(entry=>{
    const id=entry.dataset.id;if(!id) return;
    // vg-vote-badge removed — no badges shown
    const badge=entry.querySelector('.vg-vote-badge');
    if(badge) badge.remove();
  });
}

/* ================================================================
   GLOBAL SORT — rebuilds all video sections using a unified sorted order
   When sort != 'default', shows a single combined sorted grid per section wrapper.
   When sort == 'default', restores original per-section grids.
   ================================================================ */
function _rebuildAllVideoSections(sortMode) {
  const sections = [
    { containerId: 'videoListAnimes',   list: ANIME_VIDEOS,     label: 'Animes',                 emptyId: 'animes-empty' },
    { containerId: 'videoListNostalg',  list: NOSTALGIA_VIDEOS, label: 'Internet Nostalgia',     emptyId: 'nostalg-empty' },
    { containerId: 'videoListAwesome',  list: AWESOME_VIDEOS,   label: 'Awesome Internet Videos', emptyId: 'awesome-empty' },
  ];

  if (sortMode === 'newest' || !sortMode) {
    /* Restore per-section grids, newest = default array order (last=newest → reverse) */
    sections.forEach(s => { _buildSection(s.containerId, s.list, s.emptyId); });
    return;
  }
  if (sortMode === 'oldest') {
    sections.forEach(s => {
      const el = document.getElementById(s.containerId); if (!el) return;
      el.innerHTML = '';
      const ep = document.getElementById(s.emptyId); if (ep) ep.style.display = 'none';
      const grid = document.createElement('div');
      grid.className = 'vg-grid'; grid.id = s.containerId + '_grid';
      el.appendChild(grid);
      const rev = [...s.list].reverse();
      _populateGrid(grid, rev, rev.map((_,i)=>i));
    });
    return;
  }

  /* Build a unified list of all entries with section tag */
  const allEntries = [];
  sections.forEach(s => {
    s.list.forEach((v, i) => allEntries.push({ id: v.id, list: s.list, idx: i, section: s.label }));
  });

  /* Sort globally */
  let sorted = [...allEntries];
  if (sortMode === 'highest') sorted.sort((a,b) => getVideoScore(b.id) - getVideoScore(a.id));
  else if (sortMode === 'lowest') sorted.sort((a,b) => getVideoScore(a.id) - getVideoScore(b.id));
  else if (sortMode === 'unrated') {
    sorted = sorted.filter(e => { const d=getVideoRating(e.id); return d.up===0 && d.down===0; });
  }

  /* Put all results into the first section, clear others */
  sections.forEach((s, si) => {
    const el = document.getElementById(s.containerId); if (!el) return;
    el.innerHTML = '';
    const ep = document.getElementById(s.emptyId); if (ep) ep.style.display = 'none';

    if (si === 0) {
      if (!sorted.length) { if (ep) ep.style.display = 'block'; return; }
      const grid = document.createElement('div');
      grid.className = 'vg-grid'; grid.id = s.containerId + '_grid';
      el.appendChild(grid);
      sorted.forEach(entry => {
        const ve = document.createElement('div'); ve.className='vg-entry'; ve.dataset.id=entry.id;
        if(entry.id===currentVideoId) ve.classList.add('active');
        const img=document.createElement('img'); img.className='vg-thumb'; img.src=ytThumb(entry.id); img.alt=''; img.draggable=false;
        const titleEl=document.createElement('span'); titleEl.className='vg-title'; titleEl.textContent='Loading\u2026';
        const sectionTag=document.createElement('span'); sectionTag.style.cssText='font-size:9px;color:#555;display:block;';
        sectionTag.textContent=entry.section;
        ve.appendChild(img); ve.appendChild(titleEl); ve.appendChild(sectionTag);
        grid.appendChild(ve);
        ve.addEventListener('click', ()=>_selectVideo(entry.id, entry.list, entry.idx));
        fetchVideoMeta(entry.id).then(meta=>{titleEl.textContent=(meta&&meta.title)?meta.title:entry.id;});
      });
      setTimeout(() => { if (typeof _repaginateSection === 'function') _repaginateSection(el); }, 50);
    }
  });
}

/* ================================================================
   Public init / teardown
   ================================================================ */
window.initVideos = function () {
  if(videosInited) return;
  videosInited=true;
  _loadVideoRatings();
  _buildSection('videoListAnimes',  ANIME_VIDEOS,    'animes-empty');
  _buildSection('videoListNostalg', NOSTALGIA_VIDEOS,'nostalg-empty');
  _buildSection('videoListAwesome', AWESOME_VIDEOS,  'awesome-empty');
  _setVideoInfo(DEFAULT_OPENING_ID);
  if(ytReady) _createPlayer();
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&ytPlayer&&ytPlayer.pauseVideo)ytPlayer.pauseVideo();});

  const autoBtn=document.getElementById('videoAutoPlayBtn');
  if(autoBtn && !autoBtn._wired){
    autoBtn._wired=true;
    autoBtn.addEventListener('click',()=>{
      videoAutoPlay=!videoAutoPlay;
      autoBtn.textContent=videoAutoPlay?'Autoplay Enabled (Click to disable)':'Autoplay Disabled (Click to enable)';
      autoBtn.classList.toggle('on',videoAutoPlay);
    });
  }

  const randBtn=document.getElementById('videoRandomBtn');
  if(randBtn && !randBtn._wired){
    randBtn._wired=true;
    randBtn.addEventListener('click',()=>{
      const allVids=[...ANIME_VIDEOS,...NOSTALGIA_VIDEOS,...AWESOME_VIDEOS];
      if(!allVids.length) return;
      let r; do{r=Math.floor(Math.random()*allVids.length);}while(allVids.length>1&&allVids[r].id===currentVideoId);
      const v=allVids[r];
      let foundList=ANIME_VIDEOS, foundIdx=ANIME_VIDEOS.findIndex(x=>x.id===v.id);
      if(foundIdx<0){foundList=NOSTALGIA_VIDEOS;foundIdx=NOSTALGIA_VIDEOS.findIndex(x=>x.id===v.id);}
      if(foundIdx<0){foundList=AWESOME_VIDEOS;foundIdx=AWESOME_VIDEOS.findIndex(x=>x.id===v.id);}
      _selectVideo(v.id,foundList,foundIdx);
    });
  }
};

window.stopVideos = function () {
  if(ytPlayer&&ytPlayer.stopVideo) ytPlayer.stopVideo();
  if(typeof window.renaSetVideosPlaying==='function') window.renaSetVideosPlaying(false);
};

/* ================================================================
   Build section — grid only
   ================================================================ */
function _buildSection(containerId, list, emptyId) {
  const el=document.getElementById(containerId);if(!el) return;
  el.innerHTML='';
  _sectionList[containerId]=list;
  _sectionSortMode[containerId]='default';
  const ep=document.getElementById(emptyId);
  if(!list.length){if(ep) ep.style.display='block';return;}
  if(ep) ep.style.display='none';
  const grid=document.createElement('div');grid.className='vg-grid';grid.id=containerId+'_grid';
  el.appendChild(grid);
  _populateGrid(grid,list,list.map((_,i)=>i));
}

function _rebuildGrid(containerId, list, sortMode) {
  const grid=document.getElementById(containerId+'_grid');if(!grid) return;
  let indices=list.map((_,i)=>i);
  if(sortMode==='oldest') indices=indices.reverse();
  else if(sortMode==='highest') indices.sort((a,b)=>getVideoScore(list[b].id)-getVideoScore(list[a].id));
  else if(sortMode==='lowest') indices.sort((a,b)=>getVideoScore(list[a].id)-getVideoScore(list[b].id));
  else if(sortMode==='unrated') indices=indices.filter(i=>{ const d=getVideoRating(list[i].id); return d.up===0&&d.down===0; });
  /* newest = default (array order, already newest first by convention) */
  grid.innerHTML='';
  _populateGrid(grid,list,indices);
  const activeEntry=grid.querySelector('.vg-entry.active');
  if(activeEntry) activeEntry.scrollIntoView({block:'nearest',behavior:'instant'});
}

function _populateGrid(grid, list, indices) {
  indices.forEach(i=>{
    const v=list[i];
    const entry=document.createElement('div');entry.className='vg-entry';entry.dataset.id=v.id;
    if(v.id===currentVideoId) entry.classList.add('active');
    const img=document.createElement('img');img.className='vg-thumb';img.src=ytThumb(v.id);img.alt='';img.draggable=false;
    const titleEl=document.createElement('span');titleEl.className='vg-title';titleEl.textContent='Loading…';
    entry.appendChild(img);entry.appendChild(titleEl);
    grid.appendChild(entry);
    entry.addEventListener('click',()=>_selectVideo(v.id,list,i));
    fetchVideoMeta(v.id).then(meta=>{titleEl.textContent=(meta&&meta.title)?meta.title:v.id;});
  });
}
