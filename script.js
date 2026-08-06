/* =========================================================================
   SERVICE WORKER REGISTRATION (sw.js — Monetag push/ad worker)
   Must be served from the site root so its scope covers the whole domain.
   ========================================================================= */
(function(){
  "use strict";
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js')
        .catch(function(err){ console.warn('sw.js registration failed:', err); });
    });
  }
})();

/* =========================================================================
   MONETAG — IN-APP AUTO INTERSTITIAL
   Fires automatically on Monetag's own schedule (frequency/capping/interval),
   independent of the "every 4-5 games played" interstitial below.
   ========================================================================= */
(function(){
  "use strict";
  const showAd = window['show_11505760'];
  if(typeof showAd === 'function'){
    showAd({
      type: 'inApp',
      inAppSettings: {
        frequency: 2,
        capping: 0.1,
        interval: 30,
        timeout: 5,
        everyPage: false
      }
    }).catch(function(){ /* no fill / not ready — ignore, it retries on its own schedule */ });
  }
})();

/* =========================================================================
   TELEGRAM AUTO-LOGIN
   If this page is opened inside a Telegram Mini App, Telegram hands us the
   user's profile automatically — no login form needed. We store it and show
   a small badge in the header. Outside Telegram this is a silent no-op and
   the site works exactly as before.
   ========================================================================= */
(function(){
  "use strict";
  const tg = window.Telegram && window.Telegram.WebApp;
  if(!tg) return;

  try{ tg.ready(); tg.expand(); }catch(e){}

  const tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user;
  if(!tgUser) return;

  const profile = {
    id: tgUser.id,
    firstName: tgUser.first_name || '',
    lastName: tgUser.last_name || '',
    username: tgUser.username || '',
    photoUrl: tgUser.photo_url || '',
    loggedInAt: Date.now()
  };
  try{ localStorage.setItem('np_telegram_user', JSON.stringify(profile)); }catch(e){}
  window.np_telegramUser = profile;

  function renderBadge(){
    const header = document.querySelector('.header-inner');
    if(!header || document.getElementById('tgUserBadge')) return;
    const initials = ((profile.firstName[0]||'') + (profile.lastName[0]||'')).toUpperCase();
    const badge = document.createElement('div');
    badge.id = 'tgUserBadge';
    badge.className = 'tg-user-badge';
    badge.innerHTML = profile.photoUrl
      ? `<img src="${profile.photoUrl}" alt="${profile.firstName}"><span>${profile.firstName || 'Player'}</span>`
      : `<span class="tg-user-avatar">${initials || '👤'}</span><span>${profile.firstName || 'Player'}</span>`;
    header.appendChild(badge);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', renderBadge);
  }else{
    renderBadge();
  }
})();

/* =========================================================================
   HOMEPAGE APP
   ========================================================================= */
(function(){
  "use strict";

  /* ============ GAME DATA ============ */
  /* Only Turbo Drift Circuit exists for now — wired to the real playable
     Highway Rush game engine below. More titles will be added later. */
  const games = [
    { title:"Turbo Drift Circuit", category:"Racing", image:"🏎️", description:"Slide through neon streets in this high-speed drift racer.", url:"#", rating:5, featured:true, playable:true }
  ];

  games.forEach(g => { g.id = g.title.toLowerCase().replace(/[^a-z0-9]+/g,'-'); });

  const catColors = {
    Racing:["#ff3fb0","#ffcb47"],
    Action:["#3ff2d0","#ff3fb0"],
    Puzzle:["#3ff2d0","#5b8cff"],
    Arcade:["#ffcb47","#3ff2d0"],
    Sports:["#5b8cff","#ff3fb0"]
  };
  function gradFor(cat){
    const c = catColors[cat] || ["#3ff2d0","#ff3fb0"];
    return `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
  }

  /* ============ LOCALSTORAGE HELPERS ============ */
  const LS = {
    get(key, fallback){
      try{
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      }catch(e){ return fallback; }
    },
    set(key, val){
      try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
    }
  };

  const STATS_KEY = "np_stats";
  const PLAYCOUNT_KEY = "np_playcounts";
  const FAV_KEY = "np_favourites";
  const RECENT_KEY = "np_recent";
  const CONTINUE_KEY = "np_continue";

  function getStats(){
    return LS.get(STATS_KEY, { playTime:0, gamesPlayed:0, highScore:0, crashes:0, wins:0 });
  }
  function saveStats(s){ LS.set(STATS_KEY, s); renderStats(); }

  /* Reusable public stat functions — the game engine calls these directly,
     so play time, high score, crashes etc. flow straight into the
     homescreen stats panel in real time. */
  window.addPlayTime = function(seconds){
    const s = getStats(); s.playTime += Number(seconds)||0; saveStats(s);
  };
  window.increaseGamesPlayed = function(){
    const s = getStats(); s.gamesPlayed += 1; saveStats(s);
  };
  window.setHighScore = function(score){
    const s = getStats(); if(Number(score) > s.highScore) s.highScore = Number(score); saveStats(s);
  };
  window.increaseCrash = function(){
    const s = getStats(); s.crashes += 1; saveStats(s);
  };
  window.increaseWins = function(){
    const s = getStats(); s.wins += 1; saveStats(s);
  };

  function renderStats(){
    const s = getStats();
    document.getElementById('statPlayTime').textContent = formatTime(s.playTime);
    document.getElementById('statGamesPlayed').textContent = s.gamesPlayed;
    document.getElementById('statHighScore').textContent = s.highScore;
    document.getElementById('statCrashes').textContent = s.crashes;
    document.getElementById('statWins').textContent = s.wins;
  }
  function formatTime(totalSeconds){
    totalSeconds = Math.floor(totalSeconds);
    const d = Math.floor(totalSeconds/86400);
    const h = Math.floor((totalSeconds%86400)/3600);
    const m = Math.floor((totalSeconds%3600)/60);
    const s = totalSeconds%60;
    if(d > 0) return d + "d " + String(h).padStart(2,'0') + "h " + String(m).padStart(2,'0') + "m " + String(s).padStart(2,'0') + "s";
    if(h > 0) return h + "h " + String(m).padStart(2,'0') + "m " + String(s).padStart(2,'0') + "s";
    if(m > 0) return m + "m " + String(s).padStart(2,'0') + "s";
    return s + "s";
  }

  function getPlayCounts(){ return LS.get(PLAYCOUNT_KEY, {}); }
  function incrementPlayCount(id){
    const pc = getPlayCounts();
    pc[id] = (pc[id]||0) + 1;
    LS.set(PLAYCOUNT_KEY, pc);
  }

  function getFavs(){ return LS.get(FAV_KEY, []); }
  function toggleFav(id){
    let favs = getFavs();
    if(favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    LS.set(FAV_KEY, favs);
    renderAll();
  }

  function getRecent(){ return LS.get(RECENT_KEY, []); }
  function pushRecent(id){
    let recent = getRecent().filter(r => r !== id);
    recent.unshift(id);
    recent = recent.slice(0,5);
    LS.set(RECENT_KEY, recent);
  }

  function getContinue(){ return LS.get(CONTINUE_KEY, null); }
  function setContinue(id){ LS.set(CONTINUE_KEY, id); }

  /* ============ AD FLOW ============
     Two independent ad triggers, both using the same Monetag interstitial
     zone (11505760) so it's consistent with what plays in the Telegram bot:

     1) WATCH-AD-TO-PLAY — every time a playable game is launched, the
        player sees a prompt, watches the interstitial, then a 3-2-1
        countdown, then the game opens.
     2) AUTO IN-GAME AD — separately, after every 3rd or 4th game played,
        an extra interstitial fires automatically (no prompt) right as
        the game view opens. */
  const MONETAG_ZONE_ID = '11505760'; // must match the data-zone on the Monetag <script> tag in index.html

  const interstitialAd = document.getElementById('interstitialAd');
  const interstitialSpinner = document.getElementById('interstitialSpinner');
  const interstitialCountdown = document.getElementById('interstitialCountdown');
  const interstitialStatusText = document.getElementById('interstitialStatusText');
  const interstitialActionBtn = document.getElementById('interstitialActionBtn');
  const interstitialCancelBtn = document.getElementById('interstitialCancelBtn');

  let pendingGameId = null;

  function getMonetagShowFn(){ return window['show_' + MONETAG_ZONE_ID]; }

  function setOverlayState(state, text){
    // state: 'prompt' | 'loading' | 'countdown'
    if(interstitialStatusText) interstitialStatusText.textContent = text || '';
    if(interstitialSpinner) interstitialSpinner.style.display = state === 'loading' ? 'block' : 'none';
    if(interstitialCountdown) interstitialCountdown.style.display = state === 'countdown' ? 'block' : 'none';
    if(interstitialActionBtn) interstitialActionBtn.style.display = state === 'prompt' ? 'inline-flex' : 'none';
    if(interstitialCancelBtn) interstitialCancelBtn.style.display = state === 'prompt' ? 'inline-flex' : 'none';
  }

  function showWatchAdPrompt(gameId){
    pendingGameId = gameId;
    if(!interstitialAd){
      // Overlay markup missing from this page — fail open and just start the game.
      actuallyStartGame(gameId);
      return;
    }
    interstitialAd.classList.add('open');
    setOverlayState('prompt', 'Watch a short ad to unlock this game');
  }

  function closeOverlayCancelled(){
    if(interstitialAd) interstitialAd.classList.remove('open');
    pendingGameId = null;
  }

  function runInterstitialThenCountdown(){
    setOverlayState('loading', 'Loading ad…');
    const showAd = getMonetagShowFn();

    function afterAd(){
      runCountdown();
    }

    if(typeof showAd !== 'function'){
      console.warn('Monetag SDK not found (check the zone ID in index.html). Skipping ad.');
      afterAd();
      return;
    }

    showAd()
      .then(afterAd)
      .catch(function(err){
        // No fill / ad failed to load — fail open so the player isn't stuck.
        console.warn('Monetag ad did not play:', err);
        afterAd();
      });
  }

  function runCountdown(){
    let n = 3;
    setOverlayState('countdown', 'Ad completed! Game starting in…');
    if(interstitialCountdown) interstitialCountdown.textContent = n;
    const timer = setInterval(function(){
      n -= 1;
      if(n <= 0){
        clearInterval(timer);
        if(interstitialAd) interstitialAd.classList.remove('open');
        const id = pendingGameId;
        pendingGameId = null;
        if(id) actuallyStartGame(id);
        return;
      }
      if(interstitialCountdown) interstitialCountdown.textContent = n;
    }, 1000);
  }

  if(interstitialActionBtn) interstitialActionBtn.addEventListener('click', runInterstitialThenCountdown);
  if(interstitialCancelBtn) interstitialCancelBtn.addEventListener('click', closeOverlayCancelled);

  /* ---- Auto in-game ad: fires automatically every 3rd/4th game played,
     with no prompt, using the same interstitial zone. ---- */
  const AUTO_AD_KEY = 'np_playsSinceAutoAd';
  const AUTO_AD_THRESHOLD_KEY = 'np_autoAdThreshold';
  function randomAutoThreshold(){ return Math.random() < 0.5 ? 3 : 4; }

  let playsSinceAutoAd = Number(sessionStorage.getItem(AUTO_AD_KEY)) || 0;
  let autoAdThreshold = Number(sessionStorage.getItem(AUTO_AD_THRESHOLD_KEY)) || randomAutoThreshold();
  sessionStorage.setItem(AUTO_AD_THRESHOLD_KEY, autoAdThreshold);

  function maybeFireAutoInGameAd(){
    playsSinceAutoAd += 1;
    sessionStorage.setItem(AUTO_AD_KEY, playsSinceAutoAd);
    if(playsSinceAutoAd >= autoAdThreshold){
      playsSinceAutoAd = 0;
      autoAdThreshold = randomAutoThreshold();
      sessionStorage.setItem(AUTO_AD_KEY, 0);
      sessionStorage.setItem(AUTO_AD_THRESHOLD_KEY, autoAdThreshold);
      const showAd = getMonetagShowFn();
      if(typeof showAd === 'function'){
        showAd().catch(function(){ /* no fill / not ready — ignore */ });
      }
    }
  }

  /* ============ PLAY ACTION ============ */
  window.playGame = function(id){
    const game = games.find(g => g.id === id);
    if(!game) return;

    if(game.playable){
      showWatchAdPrompt(id);
    }else{
      // Demo placeholder card — no ad, no real game wired up.
      actuallyStartGame(id);
    }
  };

  function actuallyStartGame(id){
    const game = games.find(g => g.id === id);
    if(!game) return;
    incrementPlayCount(id);
    pushRecent(id);
    setContinue(id);
    increaseGamesPlayed();
    renderAll();

    if(game.playable){
      document.getElementById('gameView').classList.add('open');
      if(window.launchHighwayRush) window.launchHighwayRush();
      maybeFireAutoInGameAd();
    }else{
      window.open(game.url === "#" ? "javascript:void(0)" : game.url, "_blank");
    }
  }

  window.scrollToId = function(id){
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
  };

  /* ============ CARD RENDERING ============ */
  function starString(rating){
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5-full);
  }

  function cardHTML(game, opts){
    opts = opts || {};
    const favs = getFavs();
    const isFav = favs.includes(game.id);
    const extraClass = opts.featured ? "featured-card" : "";
    const tag = game.playable
      ? `<span class="playable-tag">▶ Playable</span>`
      : `<span class="cat-tag">${game.category}</span>`;
    return `
      <div class="card ${extraClass} fade-in" data-id="${game.id}" data-cat="${game.category}" data-title="${game.title.toLowerCase()}">
        <div class="thumb" style="background:${gradFor(game.category)}">
          ${tag}
          <button class="fav-btn ${isFav ? 'active':''}" onclick="toggleFavourite(event,'${game.id}')" aria-label="Toggle favourite">${isFav ? '♥':'♡'}</button>
          <span class="emoji">${game.image}</span>
        </div>
        <div class="card-body">
          <h3>${game.title}</h3>
          <div class="card-meta">
            <span>${game.category}</span>
            <span class="rating">${starString(game.rating)}</span>
          </div>
          ${opts.showDesc !== false ? `<p class="card-desc">${game.description}</p>` : ""}
          <button class="play-btn" onclick="playGame('${game.id}')">▶ Play Now</button>
        </div>
      </div>`;
  }

  window.toggleFavourite = function(e, id){
    e.stopPropagation();
    toggleFav(id);
  };

  /* ============ SECTION RENDERERS ============ */
  function renderPopular(){
    const pc = getPlayCounts();
    const sorted = [...games].sort((a,b) => (pc[b.id]||0) - (pc[a.id]||0));
    const top = sorted.slice(0,8);
    document.getElementById('popularRow').innerHTML = top.map(g => cardHTML(g, {showDesc:false})).join("");
  }

  function renderFavourites(){
    const favIds = getFavs();
    const section = document.getElementById('favSection');
    if(favIds.length === 0){ section.style.display = "none"; return; }
    section.style.display = "block";
    const favGames = favIds.map(id => games.find(g => g.id === id)).filter(Boolean);
    document.getElementById('favGrid').innerHTML = favGames.map(g => cardHTML(g)).join("");
  }

  function renderContinue(){
    const id = getContinue();
    const section = document.getElementById('continueSection');
    if(!id){ section.style.display = "none"; return; }
    const game = games.find(g => g.id === id);
    if(!game){ section.style.display = "none"; return; }
    section.style.display = "block";
    document.getElementById('continueCard').innerHTML = `
      <div class="continue-card">
        <div class="continue-thumb" style="background:${gradFor(game.category)}"><span>${game.image}</span></div>
        <div class="continue-info">
          <h4>${game.title}</h4>
          <p>${game.category} · Last played recently</p>
        </div>
        <button class="btn btn-primary" onclick="playGame('${game.id}')">▶ Resume</button>
      </div>`;
  }

  let currentCategory = "All";
  let currentSearch = "";

  function renderAllGames(){
    const grid = document.getElementById('allGrid');
    const q = currentSearch.trim().toLowerCase();
    const filtered = games.filter(g => {
      const matchCat = currentCategory === "All" || g.category === currentCategory;
      const matchSearch = !q || g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
    grid.innerHTML = filtered.map(g => cardHTML(g)).join("");
    document.getElementById('emptyMsg').style.display = filtered.length ? "none" : "block";
    document.getElementById('resultCount').textContent = filtered.length + " game" + (filtered.length===1?"":"s") + " found";
  }

  function renderAll(){
    renderPopular();
    renderFavourites();
    renderContinue();
    renderAllGames();
    renderStats();
  }
  window.renderHomeAll = renderAll;

  /* ============ EVENTS ============ */
  document.getElementById('searchInput').addEventListener('input', function(e){
    currentSearch = e.target.value;
    renderAllGames();
  });

  document.getElementById('catBar').addEventListener('click', function(e){
    const btn = e.target.closest('.cat-btn');
    if(!btn) return;
    currentCategory = btn.dataset.cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAllGames();
    document.querySelectorAll('#mainNav button').forEach(b => b.classList.toggle('active', b.dataset.cat === currentCategory));
  });

  document.getElementById('mainNav').addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const cat = btn.dataset.cat;
    document.querySelectorAll('#mainNav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    scrollToId('allgames');
    renderAllGames();
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  /* Returns from the game view to the homepage. Reused by both the manual
     "← Menu" button and the automatic post-game-over countdown. */
  function goToMenu(){
    document.getElementById('gameView').classList.remove('open');
    if(window.exitHighwayRush) window.exitHighwayRush();
    renderAll(); // refresh the stats panel with whatever play time just accrued
  }

  document.getElementById('backToMenuBtn').addEventListener('click', goToMenu);

  /* ---- Game-over popup: score + banner ad, auto-closes after 5s with a
     visible countdown, then returns to the homepage. ---- */
  const gameOverPopup = document.getElementById('gameOverPopup');
  const gameOverScoreVal = document.getElementById('gameOverScoreVal');
  const gameOverCountdown = document.getElementById('gameOverCountdown');
  let gameOverTimer = null;

  window.showGameOverPopup = function(score){
    if(!gameOverPopup) return;
    if(gameOverScoreVal) gameOverScoreVal.textContent = score;
    gameOverPopup.classList.add('open');

    let n = 5;
    if(gameOverCountdown) gameOverCountdown.textContent = n;
    if(gameOverTimer) clearInterval(gameOverTimer);
    gameOverTimer = setInterval(function(){
      n -= 1;
      if(n <= 0){
        clearInterval(gameOverTimer);
        gameOverTimer = null;
        gameOverPopup.classList.remove('open');
        goToMenu();
        return;
      }
      if(gameOverCountdown) gameOverCountdown.textContent = n;
    }, 1000);
  };

  /* initial render */
  renderAll();

})();

/* =========================================================================
   HIGHWAY RUSH (Turbo Drift Circuit) — the actual playable game engine.
   Unchanged from before: hooked to the homepage stats via
   window.addPlayTime / setHighScore / increaseCrash (exposed above).
   ========================================================================= */
(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  const scoreVal = document.getElementById('score-val');
  const speedVal = document.getElementById('speed-val');
  const overlay = document.getElementById('overlay');

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize(){
    const rect = stage.getBoundingClientRect();
    W = rect.width; H = rect.height;
    if(W === 0 || H === 0) return; // view is hidden, nothing to size yet
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize);

  function roadMetrics(){
    const roadWidth = Math.min(W * 0.82, 420);
    const roadX = (W - roadWidth) / 2;
    const laneCount = 3;
    const laneWidth = roadWidth / laneCount;
    return {roadWidth, roadX, laneCount, laneWidth};
  }

  let state = 'idle'; // idle | playing | crashed
  let score = 0;
  let speed = 0;
  const maxSpeed = 260;
  const minSpeed = 0;
  let speedKmh = 0;

  let dashOffset = 0;
  let sideOffset = 0;

  let player = { x:0, y:0, w:0, h:0, targetX:0 };
  let traffic = [];
  let spawnTimer = 0;
  let elapsed = 0;
  let shake = 0;

  const input = { left:false, right:false, gas:false, brake:false };

  /* ---- playtime tracking hooked into homepage stats ---- */
  let playTimeInterval = null;
  function startPlaytimeTracking(){
    stopPlaytimeTracking();
    playTimeInterval = setInterval(function(){
      if(state === 'playing' && window.addPlayTime) window.addPlayTime(1);
    }, 1000);
  }
  function stopPlaytimeTracking(){
    if(playTimeInterval){ clearInterval(playTimeInterval); playTimeInterval = null; }
  }

  function initPlayer(){
    const rm = roadMetrics();
    player.w = rm.laneWidth * 0.56;
    player.h = player.w * 1.9;
    player.x = W/2;
    player.targetX = W/2;
    player.y = H * 0.78;
  }

  function resetGame(){
    score = 0;
    speed = 0;
    speedKmh = 0;
    traffic = [];
    spawnTimer = 0;
    elapsed = 0;
    shake = 0;
    initPlayer();
  }

  const carColors = ['#3fa9f5', '#f2c14e', '#e5e5e5', '#5a5f6b', '#7bd88f', '#c25b8f', '#2b2f36'];
  const carTypes = ['sedan','suv','truck'];

  function spawnTraffic(){
    const rm = roadMetrics();
    const lane = Math.floor(Math.random() * rm.laneCount);
    const laneX = rm.roadX + rm.laneWidth * (lane + 0.5);

    const tooClose = traffic.some(t => t.lane === lane && t.y < 260);
    if (tooClose) return;

    const type = carTypes[Math.floor(Math.random()*carTypes.length)];
    let w, h, baseSpeed;
    if (type === 'truck'){ w = rm.laneWidth*0.62; h = w*2.3; baseSpeed = 55 + Math.random()*25; }
    else if (type === 'suv'){ w = rm.laneWidth*0.6; h = w*1.95; baseSpeed = 70 + Math.random()*35; }
    else { w = rm.laneWidth*0.56; h = w*1.85; baseSpeed = 80 + Math.random()*45; }

    traffic.push({
      lane, x: laneX, targetX: laneX, y: -h - 20, w, h,
      color: carColors[Math.floor(Math.random()*carColors.length)],
      speed: baseSpeed,
      type,
      passed:false,
      laneChangeCooldown: 1.5 + Math.random()*2.5
    });
  }

  function bindHold(el, onDown, onUp){
    const down = (e)=>{ e.preventDefault(); onDown(); el.classList.add('pressed'); };
    const up = (e)=>{ e.preventDefault(); onUp(); el.classList.remove('pressed'); };
    el.addEventListener('mousedown', down);
    el.addEventListener('touchstart', down, {passive:false});
    ['mouseup','mouseleave','touchend','touchcancel'].forEach(ev=>el.addEventListener(ev, up, {passive:false}));
  }
  bindHold(document.getElementById('btn-left'),  ()=>input.left=true,  ()=>input.left=false);
  bindHold(document.getElementById('btn-right'), ()=>input.right=true, ()=>input.right=false);
  bindHold(document.getElementById('btn-throttle'), ()=>input.gas=true, ()=>input.gas=false);
  bindHold(document.getElementById('btn-brake'), ()=>input.brake=true, ()=>input.brake=false);

  window.addEventListener('keydown', (e)=>{
    if (document.getElementById('gameView').classList.contains('open')){
      if (['ArrowLeft','a','A'].includes(e.key)) input.left = true;
      if (['ArrowRight','d','D'].includes(e.key)) input.right = true;
      if (['ArrowUp','w','W'].includes(e.key)) input.gas = true;
      if (['ArrowDown','s','S'].includes(e.key)) input.brake = true;
    }
  });
  window.addEventListener('keyup', (e)=>{
    if (['ArrowLeft','a','A'].includes(e.key)) input.left = false;
    if (['ArrowRight','d','D'].includes(e.key)) input.right = false;
    if (['ArrowUp','w','W'].includes(e.key)) input.gas = false;
    if (['ArrowDown','s','S'].includes(e.key)) input.brake = false;
  });

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
  }

  function drawRoad(){
    const rm = roadMetrics();
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#0e1116');
    grad.addColorStop(1, '#05060a');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle = '#1c2a18';
    ctx.fillRect(0,0, rm.roadX, H);
    ctx.fillRect(rm.roadX+rm.roadWidth, 0, W-(rm.roadX+rm.roadWidth), H);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 2;
    for(let i=-1;i<H/26+1;i++){
      const y = (i*26 + sideOffset % 26);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(rm.roadX,y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rm.roadX+rm.roadWidth,y); ctx.lineTo(W,y); ctx.stroke();
    }

    const roadGrad = ctx.createLinearGradient(rm.roadX,0,rm.roadX+rm.roadWidth,0);
    roadGrad.addColorStop(0,'#20232a');
    roadGrad.addColorStop(0.5,'#2b2f36');
    roadGrad.addColorStop(1,'#20232a');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(rm.roadX, 0, rm.roadWidth, H);

    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(rm.roadX-4, 0, 4, H);
    ctx.fillRect(rm.roadX+rm.roadWidth, 0, 4, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.setLineDash([28, 26]);
    for(let i=1;i<rm.laneCount;i++){
      const x = rm.roadX + rm.laneWidth*i;
      ctx.beginPath();
      ctx.lineDashOffset = -dashOffset;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawWheel(x,y,w,h){
    ctx.fillStyle = '#111';
    roundRect(x,y,w,h,w*0.35);
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    roundRect(x+w*0.18,y+h*0.12,w*0.64,h*0.22,w*0.2);
    ctx.fill();
  }

  function drawCar(x, y, w, h, bodyColor, opts){
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    if (opts.tilt) ctx.rotate(opts.tilt);

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(2, h*0.44, w*0.62, h*0.16, 0, 0, Math.PI*2);
    ctx.fill();

    const wheelW = w*0.16, wheelH = h*0.26;
    drawWheel(-w/2 - wheelW*0.35, -h*0.28, wheelW, wheelH);
    drawWheel( w/2 - wheelW*0.65, -h*0.28, wheelW, wheelH);
    drawWheel(-w/2 - wheelW*0.35,  h*0.06, wheelW, wheelH);
    drawWheel( w/2 - wheelW*0.65,  h*0.06, wheelW, wheelH);

    const bodyGrad = ctx.createLinearGradient(-w/2,0,w/2,0);
    bodyGrad.addColorStop(0, shade(bodyColor,-28));
    bodyGrad.addColorStop(0.15, shade(bodyColor,18));
    bodyGrad.addColorStop(0.5, bodyColor);
    bodyGrad.addColorStop(0.85, shade(bodyColor,18));
    bodyGrad.addColorStop(1, shade(bodyColor,-28));
    ctx.fillStyle = bodyGrad;
    roundRect(-w/2, -h/2, w, h, w*0.32);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(-w/2+w*0.08, -h/2+h*0.03, w*0.84, h*0.14, w*0.2);
    ctx.fill();

    ctx.fillStyle = 'rgba(15,20,28,0.92)';
    roundRect(-w*0.36, -h*0.30, w*0.72, h*0.34, w*0.22);
    ctx.fill();
    const glassGrad = ctx.createLinearGradient(-w*0.36,-h*0.3,w*0.36,-h*0.05);
    glassGrad.addColorStop(0,'rgba(160,210,255,0.55)');
    glassGrad.addColorStop(0.5,'rgba(120,160,200,0.25)');
    glassGrad.addColorStop(1,'rgba(20,25,35,0.2)');
    ctx.fillStyle = glassGrad;
    roundRect(-w*0.32, -h*0.28, w*0.64, h*0.14, w*0.16);
    ctx.fill();

    ctx.fillStyle = 'rgba(10,14,20,0.85)';
    roundRect(-w*0.32, h*0.02, w*0.64, h*0.14, w*0.14);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0,-h*0.30); ctx.lineTo(0,-h*0.02); ctx.stroke();

    ctx.fillStyle = '#fff7d6';
    ctx.beginPath(); ctx.ellipse(-w*0.32, -h*0.46, w*0.09, h*0.045, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( w*0.32, -h*0.46, w*0.09, h*0.045, 0, 0, Math.PI*2); ctx.fill();
    if(opts.headlightGlow){
      ctx.fillStyle = 'rgba(255,245,200,0.18)';
      ctx.beginPath(); ctx.ellipse(0, -h*0.65, w*0.55, h*0.28, 0, 0, Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = opts.braking ? '#ff2f2f' : '#c0242a';
    ctx.beginPath(); ctx.ellipse(-w*0.32, h*0.46, w*0.08, h*0.04, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( w*0.32, h*0.46, w*0.08, h*0.04, 0, 0, Math.PI*2); ctx.fill();
    if(opts.braking){
      ctx.fillStyle = 'rgba(255,40,40,0.25)';
      ctx.beginPath(); ctx.ellipse(0, h*0.6, w*0.5, h*0.22, 0, 0, Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = shade(bodyColor,-20);
    ctx.fillRect(-w/2-3, -h*0.14, 5, 8);
    ctx.fillRect( w/2-2, -h*0.14, 5, 8);

    ctx.restore();
  }

  function shade(hex, percent){
    const num = parseInt(hex.slice(1),16);
    let r = (num>>16) + Math.round(2.55*percent);
    let g = ((num>>8)&0xff) + Math.round(2.55*percent);
    let b = (num&0xff) + Math.round(2.55*percent);
    r = Math.max(0,Math.min(255,r));
    g = Math.max(0,Math.min(255,g));
    b = Math.max(0,Math.min(255,b));
    return `rgb(${r},${g},${b})`;
  }

  function update(dt){
    elapsed += dt;
    const rm = roadMetrics();

    const accel = 55;
    const brakePow = 110;
    const friction = 22;

    if (input.gas) speed += accel*dt;
    if (input.brake) speed -= brakePow*dt;
    if (!input.gas && !input.brake){
      if (speed > 0) speed -= friction*dt;
    }
    speed = Math.max(minSpeed, Math.min(maxSpeed, speed));
    speedKmh = speed;

    const steerSpeed = 260 * (0.4 + speed/maxSpeed*0.8);
    const margin = player.w*0.55 + 6;
    if (input.left)  player.targetX -= steerSpeed*dt;
    if (input.right) player.targetX += steerSpeed*dt;
    player.targetX = Math.max(rm.roadX+margin, Math.min(rm.roadX+rm.roadWidth-margin, player.targetX));
    player.x += (player.targetX - player.x) * Math.min(1, dt*10);

    const scrollRate = speed * 2.4;
    dashOffset = (dashOffset + scrollRate*dt) % 54;
    sideOffset = (sideOffset + scrollRate*dt) % 26;

    spawnTimer -= dt;
    const spawnInterval = Math.max(0.55, 1.6 - score/4000);
    if (spawnTimer <= 0){
      spawnTraffic();
      spawnTimer = spawnInterval + Math.random()*0.4;
    }

    for (let i = traffic.length-1; i >= 0; i--){
      const t = traffic[i];

      t.laneChangeCooldown -= dt;
      if (t.laneChangeCooldown <= 0 && t.y > 0 && t.y < H*0.7){
        t.laneChangeCooldown = 2.5 + Math.random()*3.5;
        if (Math.random() < 0.4){
          const dir = Math.random() < 0.5 ? -1 : 1;
          const newLane = t.lane + dir;
          if (newLane >= 0 && newLane < rm.laneCount){
            const newX = rm.roadX + rm.laneWidth * (newLane + 0.5);
            const blocked = traffic.some(o => o !== t && o.lane === newLane && Math.abs(o.y - t.y) < t.h*2.2);
            if (!blocked){
              t.lane = newLane;
              t.targetX = newX;
            }
          }
        }
      }
      t.x += (t.targetX - t.x) * Math.min(1, dt*2.2);

      const baseDrift = 26;
      const rel = baseDrift + (speed - t.speed) * 2.4;
      t.y += rel * dt;

      if (!t.passed && t.y > player.y + player.h){
        t.passed = true;
        score += 15;
      }
      if (t.y > H + 150 || t.y < -400){
        traffic.splice(i,1);
        continue;
      }

      const insetX = 0.72, insetY = 0.8;
      const pl = player.x - player.w*insetX/2, pr = player.x + player.w*insetX/2;
      const pt = player.y - player.h*insetY/2, pb = player.y + player.h*insetY/2;
      const tl = t.x - t.w*insetX/2, tr = t.x + t.w*insetX/2;
      const tt = t.y - t.h*insetY/2, tb = t.y + t.h*insetY/2;
      if (pl < tr && pr > tl && pt < tb && pb > tt){
        crash();
      }
    }

    score += speed * dt * 0.35;

    if (shake > 0) shake = Math.max(0, shake - dt*8);

    scoreVal.textContent = Math.floor(score);
    speedVal.innerHTML = Math.floor(speedKmh) + '<span>km/h</span>';
  }

  function crash(){
    if (state !== 'playing') return;
    state = 'crashed';
    shake = 1;
    stopPlaytimeTracking();
    if (window.setHighScore) window.setHighScore(Math.floor(score));
    if (window.increaseCrash) window.increaseCrash();
    if (window.renderHomeAll) window.renderHomeAll();
    if (window.showGameOverPopup) window.showGameOverPopup(Math.floor(score));
  }

  function render(){
    ctx.save();
    if (shake > 0){
      const s = shake*8;
      ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
    }
    drawRoad();

    for (const t of traffic){
      const tilt = Math.max(-0.12, Math.min(0.12, (t.targetX - t.x) * 0.01));
      drawCar(t.x, t.y, t.w, t.h, t.color, {headlightGlow:false, tilt});
    }

    if (state !== 'crashed'){
      drawCar(player.x, player.y, player.w, player.h, '#e6392b', {braking: input.brake, headlightGlow:true});
    } else {
      drawCar(player.x, player.y, player.w, player.h, '#555', {});
    }

    ctx.restore();
  }

  let lastTime = null;
  function loop(ts){
    if (lastTime == null) lastTime = ts;
    let dt = (ts - lastTime)/1000;
    dt = Math.min(dt, 0.033);
    lastTime = ts;

    if (state === 'playing'){
      update(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  function showStart(){
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <h1>🏁 HIGHWAY RUSH</h1>
      <p>Steer with the arrows, hold GAS to accelerate, hold BRAKE to slow down. Traffic always drives the correct way — weave past without colliding!</p>
      <button class="go-btn" id="start-btn">Start Engine</button>
    `;
    document.getElementById('start-btn').addEventListener('click', beginGame);
  }

  function beginGame(){
    resize();
    resetGame();
    overlay.classList.add('hidden');
    state = 'playing';
    startPlaytimeTracking();
  }

  /* Called after the ad-gate flow finishes, to actually launch the game */
  window.launchHighwayRush = function(){
    resize();
    initPlayer();
    // Only show the start screen fresh if not already mid-race
    if (state !== 'playing'){
      showStart();
    }
  };

  /* Called by the homepage "← Menu" button */
  window.exitHighwayRush = function(){
    stopPlaytimeTracking();
  };

  // init (view is hidden at load; resize() is a no-op until it's opened)
  resize();
  initPlayer();
  showStart();
  requestAnimationFrame(loop);

})();
