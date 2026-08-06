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

  /* ---------- 背景（支持图片/视频） ---------- */
  const VIDEO_EXTS = /\.(mp4|webm|ogg|mov)(\?|$)/i;
  let bgIndex = 0;
  function pickBackground() {
    const list = CFG.backgrounds || [];
    if (!list.length) return;
    bgIndex = Math.floor(Math.random() * list.length);
    return list[bgIndex];
  }
  function isVideo(url) { return VIDEO_EXTS.test(url); }

  function setBackground(url) {
    if (!url) return;
    const layer = $('#bgLayer');
    const video = $('#bgVideo');

    if (isVideo(url)) {
      // 视频背景
      layer.classList.remove('loaded');
      video.src = url;
      video.load();
      video.onloadeddata = () => {
        video.classList.add('loaded');
      };
      video.onerror = () => { showTip('背景视频加载失败'); video.classList.remove('loaded'); };
    } else {
      // 图片背景
      video.classList.remove('loaded');
      video.removeAttribute('src');
      video.load();
      if (layer) {
        const img = new Image();
        img.onload = () => {
          layer.style.backgroundImage = `url("${url}")`;
          layer.classList.add('loaded');
        };
        img.onerror = () => showTip('背景图加载失败');
        img.src = url;
      }
    }
  }

  function switchBackground() {
    const list = CFG.backgrounds || [];
    if (list.length <= 1) return;
    bgIndex = (bgIndex + 1) % list.length;
    const layer = $('#bgLayer');
    const video = $('#bgVideo');
    layer.classList.remove('loaded');
    video.classList.remove('loaded');
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
  async function initMusic() {
    const m = CFG.music;
    const root = $('#musicPlayer');
    if (!m || !m.enable || !root) return;

    // 合并歌单：先网易云，后自定义
    let songs = [];
    const netease = m.netease;
    let neteaseLoaded = false;
    if (netease && netease.enable && netease.id) {
      try {
        const fetched = await fetchNetease(netease);
        if (fetched.length) {
          songs = songs.concat(fetched);
          neteaseLoaded = true;
        } else {
          showTip('网易云歌单为空，已切换本地列表');
        }
      } catch (e) {
        console.warn('[music] 网易云歌单加载失败：', e);
        showTip('网易云歌单加载失败，已切换本地列表');
      }
    }
    // 本地歌曲兜底（无论网易云成功与否都追加，网易云失败时作为唯一来源）
    const localSongs = (m.songs || []).filter(s => s && s.url);
    if (localSongs.length) {
      songs = songs.concat(localSongs);
    }

    if (!songs.length) {
      console.warn('[music] 没有可用的歌曲（网易云歌单为空且本地歌曲为空）');
      // 两者都为空时给出明确提示，不显示播放器
      showTip('播放器初始化失败：歌单为空且无本地歌曲');
      return;
    }
    root.hidden = false;

    const audio = $('#musicAudio');
    const fab = $('#musicFab');
    const fabCover = $('#musicFabCover');
    const panel = $('#musicPanel');
    const cover = $('#musicCover');
    const titleEl = $('#musicTitle');
    const artistEl = $('#musicArtist');
    const idEl = $('#musicId');
    const playBtn = $('#musicPlay');
    const playIcon = playBtn.querySelector('i');
    const prevBtn = $('#musicPrev');
    const nextBtn = $('#musicNext');
    const listToggle = $('#musicListToggle');
    const muteBtn = $('#musicMute');
    const muteIcon = muteBtn.querySelector('i');
    const seek = $('#musicSeek');
    const volume = $('#musicVolume');
    const curEl = $('#musicCur');
    const durEl = $('#musicDur');
    const listWrap = $('#musicListWrap');
    const listEl = $('#musicList');

    let idx = 0;
    let listOpen = false;

    // 预加载图片，避免闪烁
    function preloadImage(src) {
      return new Promise(function (resolve) {
        if (!src) { resolve(false); return; }
        var img = new Image();
        img.onload = function () { resolve(true); };
        img.onerror = function () { resolve(false); };
        img.src = src;
      });
    }

    function fmt(s) {
      if (!isFinite(s)) return '0:00';
      const mm = Math.floor(s / 60);
      const ss = Math.floor(s % 60);
      return mm + ':' + (ss < 10 ? '0' + ss : ss);
    }

    // 拉取网易云（Meting 兼容 API 返回 JSON 数组）
    async function fetchNetease(cfg) {
      // 注意：必须保留 api 结尾的斜杠，否则部分服务端会 301 重定向导致跨域失败
      const base = cfg.api.endsWith('/') ? cfg.api : cfg.api + '/';
      const url = base + `?server=netease&type=${cfg.type}&id=${encodeURIComponent(cfg.id)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const list = await res.json();
      if (!Array.isArray(list)) throw new Error('返回格式错误');
      return list.map((it) => {
        // Meting 接口返回的歌曲 ID 藏在 url 的 ?id= 参数里
        let nid = it.id ? String(it.id) : null;
        if (!nid && it.url) {
          try { nid = new URL(it.url, location.href).searchParams.get('id'); } catch (e) {}
        }
        return {
          title: it.name || it.title || '未知歌曲',
          artist: Array.isArray(it.artist) ? it.artist.join(' / ') : (it.artist || ''),
          url: it.url,
          cover: it.pic || it.cover,
          nid: nid || null
        };
      }).filter((s) => s.url);
    }

    function updateId(song) {
      if (song.nid) {
        idEl.textContent = 'ID: ' + song.nid;
        idEl.href = `https://music.163.com/#/song?id=${encodeURIComponent(song.nid)}`;
        idEl.hidden = false;
      } else {
        idEl.hidden = true;
        idEl.removeAttribute('href');
      }
    }

    // 渲染播放列表
    function renderList() {
      listEl.innerHTML = '';
      songs.forEach(function (s, i) {
        var li = document.createElement('li');
        li.className = 'music-list-item' + (i === idx ? ' active' : '');
        li.dataset.index = i;
        li.innerHTML =
          '<span class="music-list-idx">' + (i + 1) + '</span>' +
          '<span class="music-list-info">' +
            '<span class="music-list-title">' + (s.title || '未知') + '</span>' +
            '<span class="music-list-artist">' + (s.artist || '') + '</span>' +
          '</span>';
        li.addEventListener('click', function () {
          load(i, true);
          toggleList(false);
        });
        listEl.appendChild(li);
      });
    }

    // 切换播放列表显示
    function toggleList(force) {
      listOpen = (typeof force === 'boolean') ? force : !listOpen;
      listWrap.hidden = !listOpen;
      panel.classList.toggle('has-list', listOpen);
    }

    async function load(i, autoplay) {
      idx = (i + songs.length) % songs.length;
      var s = songs[idx];
      titleEl.textContent = s.title || '未知歌曲';
      artistEl.textContent = s.artist || '';
      updateId(s);

      // 先预加载封面，加载完再赋值，避免闪烁
      var coverLoaded = await preloadImage(s.cover);
      if (coverLoaded) {
        cover.src = s.cover;
        fabCover.src = s.cover;
        fabCover.classList.add('loaded');
        cover.style.opacity = '1';
      } else {
        fabCover.classList.remove('loaded');
        cover.style.opacity = '0';
      }

      // 更新列表高亮
      if (listEl.children.length) {
        Array.prototype.forEach.call(listEl.children, function (li, j) {
          li.classList.toggle('active', j === idx);
        });
        // 滚动到当前项
        var active = listEl.children[idx];
        if (active) active.scrollIntoView({ block: 'nearest' });
      }

      audio.src = s.url;
      audio.load();
      if (autoplay) audio.play().catch(() => showTip('浏览器阻止了自动播放，请手动点击'));
    }

    function nextOnError() {
      // 错误时尝试官方外链兜底（仅网易云歌曲）
      const s = songs[idx];
      if (s && s.nid && netease && netease.fallbackOuter) {
        const fallback = `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(s.nid)}.mp3`;
        if (audio.src !== fallback) {
          console.warn('[music] 主链失败，尝试官方外链：', s.nid);
          audio.src = fallback;
          audio.load();
          audio.play().catch(() => load(idx + 1, true));
          return;
        }
      }
      showTip('当前歌曲无法播放，已跳到下一首');
      load(idx + 1, true);
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
    audio.addEventListener('error', nextOnError);

    seek.addEventListener('input', () => { audio.currentTime = seek.value; });
    volume.addEventListener('input', () => {
      audio.volume = parseFloat(volume.value);
      audio.muted = audio.volume === 0;
    });
    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      muteIcon.className = audio.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    });
    playBtn.addEventListener('click', () => {
      if (audio.paused) audio.play().catch(() => showTip('浏览器阻止了自动播放，请手动点击'));
      else audio.pause();
    });
    fab.addEventListener('click', () => root.classList.toggle('open'));
    prevBtn.addEventListener('click', () => load(idx - 1, !audio.paused));
    nextBtn.addEventListener('click', () => load(idx + 1, !audio.paused));
    listToggle.addEventListener('click', () => toggleList());

    audio.volume = m.defaultVolume != null ? m.defaultVolume : 0.7;
    volume.value = audio.volume;

    renderList();
    load(0, !!m.autoplay);
  }

  /* ---------- GitHub 项目 ---------- */
  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883', Shell: '#89e051',
    Java: '#b07219', Go: '#00ADD8', C: '#555555', 'C++': '#f34b7d',
    PHP: '#4F5D95', Ruby: '#701516', Rust: '#dea584', Dart: '#00B4AB',
    Kotlin: '#A97BFF', Swift: '#F05138', 'Jupyter Notebook': '#DA5B0B'
  };

  async function loadGithubRepos() {
    const g = CFG.github;
    const section = $('#githubSection');
    const grid = $('#repoGrid');
    if (!g || !g.enable || !g.username || !section || !grid) return;
    section.hidden = false;

    const render = (repos) => {
      if (!repos.length) {
        grid.innerHTML = '<div class="repo-empty">暂无公开仓库</div>';
        return;
      }
      grid.innerHTML = '';
      repos.forEach((r) => {
        const a = document.createElement('a');
        a.className = 'repo-card';
        a.href = r.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        const lang = r.language || '';
        const dotColor = LANG_COLORS[lang] || '#999';
        a.innerHTML = `
          <div class="repo-name"><i class="fa-solid fa-book-bookmark"></i> ${escapeHtml(r.name)}</div>
          <div class="repo-desc">${escapeHtml(r.description || '暂无描述')}</div>
          <div class="repo-meta">
            ${lang ? `<span><i class="repo-lang-dot" style="background:${dotColor}"></i> ${escapeHtml(lang)}</span>` : ''}
            ${r.stars ? `<span><i class="fa-regular fa-star"></i> ${r.stars}</span>` : ''}
            ${r.forks ? `<span><i class="fa-solid fa-code-fork"></i> ${r.forks}</span>` : ''}
          </div>
        `;
        grid.appendChild(a);
      });
    };

    // 先渲染 pinned（手动置顶）
    let all = [...(g.pinned || [])];

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const sort = g.sort || 'updated';
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(g.username)}/repos?sort=${sort}&per_page=100`,
        { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } }
      );
      clearTimeout(timer);
      if (res.ok) {
        let repos = await res.json();
        if (!g.showForks) repos = repos.filter((r) => !r.fork);
        if (g.exclude && g.exclude.length) {
          repos = repos.filter((r) => !g.exclude.includes(r.name));
        }
        // 过滤掉 pinned 里已有的
        const pinnedNames = new Set(all.map((r) => r.name));
        repos = repos.filter((r) => !pinnedNames.has(r.name));
        // 按更新时间倒序
        repos.sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at));
        const limit = g.limit || 6;
        all = all.concat(
          repos.slice(0, Math.max(0, limit - all.length)).map((r) => ({
            name: r.name,
            description: r.description,
            url: r.html_url,
            language: r.language,
            stars: r.stargazers_count,
            forks: r.forks_count
          }))
        );
      }
    } catch (e) {
      console.warn('[github] 仓库加载失败：', e);
    }

    render(all.slice(0, g.limit || 6));
  }

  /* ---------- 碎碎念 ---------- */
  function renderMemos() {
    const m = CFG.memos;
    const section = $('#memosSection');
    const list = $('#memosList');
    if (!m || !m.enable || !section || !list) return;
    const items = (m.items || []).slice();
    if (!items.length) return;
    section.hidden = false;
    if (m.title) $('#memosTitle').textContent = m.title;

    // 按日期倒序
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const limit = m.limit || 10;

    list.innerHTML = '';
    items.slice(0, limit).forEach((it) => {
      const li = document.createElement('li');
      li.className = 'timeline-item';
      li.innerHTML = `
        <div class="timeline-head">
          <span class="timeline-date">${escapeHtml(it.date || '')}</span>
          ${it.tag ? `<span class="timeline-tag">${escapeHtml(it.tag)}</span>` : ''}
        </div>
        <div class="timeline-content">${escapeHtml(it.content || '')}</div>
      `;
      list.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
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
    loadGithubRepos();
    renderMemos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
