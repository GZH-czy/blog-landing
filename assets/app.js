/* ============================================================
 *  博客中转页 · 主脚本
 *  依赖：window.SITE_CONFIG（config.js）
 * ============================================================ */
(function () {
  'use strict';

  const CFG = window.SITE_CONFIG;
  if (!CFG) {
    console.error('[landing] 缺少 config.js');
    return;
  }

  /* ---------- 工具 ---------- */
  const $ = (sel) => document.querySelector(sel);

  function getRedirectUrl(url) {
    const r = CFG.redirect;
    if (!r || !r.enable) return url;
    // 白名单判断
    let host = '';
    try { host = new URL(url, location.href).hostname; } catch (e) { return url; }
    const whitelisted = (r.whitelist || []).some((d) => {
      d = d.toLowerCase();
      return d.startsWith('.') ? host.endsWith(d) || host === d.slice(1) : host === d;
    });
    if (whitelisted) return url;
    return r.page + '?url=' + encodeURIComponent(url);
  }

  /* ---------- 背景图 ---------- */
  let bgIndex = 0;
  function pickBackground() {
    const list = CFG.backgrounds || [];
    if (!list.length) return;
    bgIndex = Math.floor(Math.random() * list.length);
    return list[bgIndex];
  }

  function setBackground(url) {
    const layer = $('#bgLayer');
    if (!layer || !url) return;
    const img = new Image();
    img.onload = () => {
      layer.style.backgroundImage = `url("${url}")`;
      layer.classList.add('loaded');
    };
    img.onerror = () => showTip('背景图加载失败');
    img.src = url;
  }

  function switchBackground() {
    const list = CFG.backgrounds || [];
    if (list.length <= 1) return;
    bgIndex = (bgIndex + 1) % list.length;
    const layer = $('#bgLayer');
    layer.classList.remove('loaded');
    setTimeout(() => setBackground(list[bgIndex]), 300);
  }

  /* ---------- 问候 + 时钟 ---------- */
  function greetingByHour(hour) {
    const rules = (CFG.greeting && CFG.greeting.rules) || [];
    for (const r of rules) {
      if (hour >= r.start && hour <= r.end) return r.text;
    }
    return '';
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function tickClock() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    const clockEl = $('#clock');
    const greetEl = $('#greeting');
    if (clockEl) clockEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    if (greetEl && CFG.greeting && CFG.greeting.enable) {
      const g = greetingByHour(h);
      if (g && greetEl.dataset.last !== g) {
        greetEl.textContent = g;
        greetEl.dataset.last = g;
      }
    }
  }

  /* ---------- 简介轮播 ---------- */
  function rotateDescription() {
    const list = CFG.profile.descriptions || [];
    const el = $('#description');
    if (!el || list.length <= 1) {
      if (el && list[0]) el.textContent = list[0];
      return;
    }
    let i = 0;
    el.textContent = list[0];
    setInterval(() => {
      i = (i + 1) % list.length;
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = list[i];
        el.style.opacity = '1';
      }, 400);
    }, 4000);
  }

  /* ---------- 一言 ---------- */
  async function loadHitokoto() {
    const h = CFG.hitokoto;
    const el = $('#hitokoto');
    if (!h || !h.enable || !el) return;

    const render = (text, from) => {
      el.innerHTML = `“${text}”${from ? `<span class="from">—— ${from}</span>` : ''}`;
    };

    const fallback = () => {
      const list = h.fallback || [];
      if (list.length) render(list[Math.floor(Math.random() * list.length)]);
    };

    const fetchOne = async () => {
      if (!h.api) { fallback(); return; }
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(h.api, { signal: ctrl.signal });
        clearTimeout(timer);
        const data = await res.json();
        if (data && data.hitokoto) render(data.hitokoto, data.from);
        else fallback();
      } catch (e) { fallback(); }
    };

    await fetchOne();
    if (h.interval && h.interval > 0) setInterval(fetchOne, h.interval);
  }

  /* ---------- 音乐播放器 ---------- */
  function initMusic() {
    const m = CFG.music;
    const root = $('#musicPlayer');
    if (!m || !m.enable || !root) return;
    const songs = m.songs || [];
    if (!songs.length) return;
    root.hidden = false;

    const audio = $('#musicAudio');
    const fab = $('#musicFab');
    const fabCover = $('#musicFabCover');
    const fabIcon = fab.querySelector('.music-fab-icon');
    const panel = $('#musicPanel');
    const cover = $('#musicCover');
    const titleEl = $('#musicTitle');
    const artistEl = $('#musicArtist');
    const playBtn = $('#musicPlay');
    const playIcon = playBtn.querySelector('i');
    const prevBtn = $('#musicPrev');
    const nextBtn = $('#musicNext');
    const muteBtn = $('#musicMute');
    const muteIcon = muteBtn.querySelector('i');
    const seek = $('#musicSeek');
    const volume = $('#musicVolume');
    const curEl = $('#musicCur');
    const durEl = $('#musicDur');

    let idx = 0;

    function fmt(s) {
      if (!isFinite(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + (sec < 10 ? '0' + sec : sec);
    }

    function load(i, autoplay) {
      idx = (i + songs.length) % songs.length;
      const s = songs[idx];
      audio.src = s.url;
      titleEl.textContent = s.title || '未知歌曲';
      artistEl.textContent = s.artist || '';
      if (s.cover) {
        cover.src = s.cover;
        fabCover.src = s.cover;
        fabCover.classList.add('loaded');
        cover.style.display = '';
      } else {
        fabCover.classList.remove('loaded');
      }
      audio.load();
      if (autoplay) audio.play().catch(() => {});
    }

    function togglePlay() {
      if (audio.paused) audio.play().catch(() => showTip('浏览器阻止了自动播放，请手动点击'));
      else audio.pause();
    }

    audio.addEventListener('play', () => {
      playIcon.className = 'fa-solid fa-pause';
      fab.classList.add('playing');
    });
    audio.addEventListener('pause', () => {
      playIcon.className = 'fa-solid fa-play';
      fab.classList.remove('playing');
    });
    audio.addEventListener('ended', () => load(idx + 1, true));
    audio.addEventListener('loadedmetadata', () => {
      durEl.textContent = fmt(audio.duration);
      seek.max = audio.duration || 0;
    });
    audio.addEventListener('timeupdate', () => {
      curEl.textContent = fmt(audio.currentTime);
      if (audio.duration) seek.value = audio.currentTime;
    });
    audio.addEventListener('error', () => showTip('当前歌曲加载失败，已跳到下一首'));

    seek.addEventListener('input', () => { audio.currentTime = seek.value; });
    volume.addEventListener('input', () => {
      audio.volume = parseFloat(volume.value);
      audio.muted = audio.volume === 0;
    });
    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      muteIcon.className = audio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    });
    playBtn.addEventListener('click', togglePlay);
    fab.addEventListener('click', () => root.classList.toggle('open'));
    prevBtn.addEventListener('click', () => load(idx - 1, !audio.paused));
    nextBtn.addEventListener('click', () => load(idx + 1, !audio.paused));

    audio.volume = m.defaultVolume != null ? m.defaultVolume : 0.7;
    volume.value = audio.volume;
    load(0, !!m.autoplay);
  }

  /* ---------- 渲染页面 ---------- */
  function renderProfile() {
    const p = CFG.profile || {};
    if (p.avatar) {
      const img = $('#avatar');
      img.src = p.avatar;
      img.alt = p.name || 'avatar';
      img.onerror = () => { img.style.display = 'none'; };
    }
    if (p.name) $('#name').textContent = p.name;
    if (p.subtitle) $('#subtitle').textContent = p.subtitle;
    document.title = (p.name ? p.name + ' · ' : '') + (p.subtitle || '中转页');
  }

  function renderSocials() {
    const box = $('#socials');
    const list = CFG.socials || [];
    list.forEach((s) => {
      const a = document.createElement('a');
      a.href = getRedirectUrl(s.url);
      a.title = s.title || '';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (s.color) a.style.setProperty('--hover', s.color);
      if (/^https?:\/\//i.test(s.icon)) {
        const img = document.createElement('img');
        img.src = s.icon;
        img.alt = s.title || '';
        a.appendChild(img);
      } else {
        a.innerHTML = `<i class="${s.icon}"></i>`;
      }
      box.appendChild(a);
    });
  }

  function renderEnterButton() {
    const b = CFG.enterBlog;
    const el = $('#enterBtn');
    if (!b || !el) return;
    el.textContent = b.text || '进入博客';
    el.href = getRedirectUrl(b.url);
  }

  function renderFooter() {
    const f = CFG.footer || {};
    const el = $('#footerText');
    if (el && f.text) {
      el.innerHTML = f.text.replace('{year}', new Date().getFullYear());
      if (f.beian) el.innerHTML += ` · <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">${f.beian}</a>`;
    }
  }

  function showTip(msg) {
    const el = $('#loadingTip');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(showTip._t);
    showTip._t = setTimeout(() => el.classList.remove('show'), 2500);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    // 遮罩透明度
    document.documentElement.style.setProperty('--mask-opacity', CFG.backgroundMask ?? 0.35);

    renderProfile();
    renderSocials();
    renderEnterButton();
    renderFooter();

    setBackground(pickBackground());
    $('#bgSwitch')?.addEventListener('click', switchBackground);

    if (CFG.greeting && CFG.greeting.enable) tickClock();
    setInterval(tickClock, 1000);

    rotateDescription();
    loadHitokoto();
    initMusic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
