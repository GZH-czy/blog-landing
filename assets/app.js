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
    const section = $('#githubPanel');
    const grid = $('#repoGrid');
    if (!g || !g.enable || !g.username || !section || !grid) return;

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

  /* ---------- 碎碎念（多数据源，可扩展） ---------- */
  async function renderMemos() {
    const m = CFG.memos;
    const panel = $('#memosPanel');
    const list = $('#memosList');
    if (!m || !m.enable || !panel || !list) return;
    if (m.title) $('#memosTitle').textContent = m.title;

    // 收集所有数据源
    const sources = m.sources || [{ type: 'manual' }];
    let allItems = [];

    for (const src of sources) {
      try {
        if (src.type === 'manual') {
          allItems = allItems.concat(m.items || []);
        } else if (src.type === 'github') {
          allItems = allItems.concat(await fetchGithubCommits(src));
        } else if (src.type === 'blog') {
          allItems = allItems.concat(await fetchBlogTimeline(src));
        }
        // 未来可加更多类型：{ type: 'api', url: '...', parser: fn }
      } catch (e) {
        console.warn(`[memos] 数据源 ${src.type} 加载失败:`, e);
      }
    }

    if (!allItems.length) return;
    panel.hidden = false;

    // 按日期倒序、去重
    allItems.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const seen = new Set();
    const items = allItems.filter((it) => {
      const key = (it.date || '') + (it.content || '').slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, m.limit || 10);

    list.innerHTML = '';
    items.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'timeline-item';
      if (it.type === 'github') li.className += ' is-github';
      if (it.type === 'blog') li.className += ' is-blog';
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

  // GitHub 提交记录（预留接口）
  async function fetchGithubCommits(cfg) {
    if (!cfg.username || !cfg.repo) return [];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(cfg.username)}/${encodeURIComponent(cfg.repo)}/commits?per_page=${cfg.limit || 10}`,
      { signal: ctrl.signal, headers: { Accept: 'application/vnd.github+json' } }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const commits = await res.json();
    return commits.map((c) => ({
      type: 'github',
      date: (c.commit.author.date || '').slice(0, 10),
      content: c.commit.message.split('\n')[0],
      tag: 'commit'
    }));
  }

  // 博客碎碎念（通过代理抓取）
  async function fetchBlogTimeline(cfg) {
    if (!cfg.url) return [];
    const proxy = (CFG.memos && CFG.memos.proxy) || 'https://meting-api.gzh-czy.cc.cd/api/timeline';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(proxy + '?url=' + encodeURIComponent(cfg.url), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.map(it => ({
      type: 'blog',
      date: it.date || it.time || '',
      content: it.content || it.text || it.message || '',
      tag: it.tag || '博客'
    })).filter(it => it.content);
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

  /* ---------- 面板交互 ---------- */
  function initPanels() {
    // 创建遮罩层
    var backdrop = document.createElement('div');
    backdrop.className = 'panel-backdrop';
    backdrop.id = 'panelBackdrop';
    document.body.appendChild(backdrop);

    var openedPanel = null;

    function openPanel(id) {
      var panel = $('#' + id);
      if (!panel) return;
      // 关闭已打开的
      if (openedPanel && openedPanel !== panel) {
        openedPanel.classList.remove('open');
        markToolActive(openedPanel.id, false);
      }
      panel.classList.add('open');
      backdrop.classList.add('show');
      openedPanel = panel;
      markToolActive(id, true);
    }
    function closePanel() {
      if (openedPanel) {
        openedPanel.classList.remove('open');
        markToolActive(openedPanel.id, false);
        openedPanel = null;
      }
      backdrop.classList.remove('show');
    }
    function markToolActive(panelId, active) {
      var btn = $('.tool-btn[data-panel="' + panelId + '"]');
      if (btn) btn.classList.toggle('active', active);
    }

    // 工具按钮点击
    $$('.tool-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pid = btn.dataset.panel;
        if (openedPanel && openedPanel.id === pid) {
          closePanel();
        } else {
          // 懒加载数据
          if (pid === 'memosPanel') renderMemos();
          if (pid === 'githubPanel') loadGithubRepos();
          if (pid === 'infoPanel') loadVisitorInfo();
          openPanel(pid);
        }
      });
    });

    // 关闭按钮
    $$('.panel-close').forEach(function (btn) {
      btn.addEventListener('click', closePanel);
    });
    // 遮罩点击关闭
    backdrop.addEventListener('click', closePanel);
    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });
  }

  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ---------- 访客信息（IP + 天气，多 provider 可配置） ---------- */
  async function loadVisitorInfo() {
    var locEl = $('#infoLocation');
    var ipEl = $('#infoIp');
    var weatherEl = $('#infoWeather');
    var tipEl = $('#infoTip');
    var cfg = CFG.visitor || {};

    if (locEl) locEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    if (ipEl) ipEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    if (weatherEl) weatherEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    if (tipEl) tipEl.className = 'info-tip';

    try {
      // === 1. 获取 IP 定位 ===
      var ipProvider = (cfg.ip && cfg.ip.provider) || 'ipapi';
      var ipKey = cfg.ip && cfg.ip.key;
      var ipData = await fetchIpInfo(ipProvider, ipKey);

      if (locEl) {
        var locText = ipData.country || '';
        if (ipData.region) locText += ' ' + ipData.region;
        if (ipData.city) locText += ' ' + ipData.city;
        locEl.textContent = locText || '未知';
      }
      // 显示 IP（高德/腾讯不返回 IP，需从 ipify 获取）
      if (ipEl) {
        if (ipData.ip) {
          ipEl.textContent = ipData.ip;
        } else {
          try {
            var ipCtrl = new AbortController();
            var ipTimer = setTimeout(function () { ipCtrl.abort(); }, 5000);
            var ipRes = await fetch('https://api.ipify.org?format=json', { signal: ipCtrl.signal });
            clearTimeout(ipTimer);
            if (ipRes.ok) {
              var ipJson = await ipRes.json();
              ipEl.textContent = ipJson.ip || '未知';
            } else {
              ipEl.textContent = '未知';
            }
          } catch (e) {
            ipEl.textContent = '未知';
          }
        }
      }

      // === 2. 获取天气（基于 IP 坐标，无需手动填写）===
      var lat = ipData.lat, lon = ipData.lon;
      if (lat && lon) {
        try {
          var wProvider = (cfg.weather && cfg.weather.provider) || 'openmeteo';
          var wKey = cfg.weather && cfg.weather.key;
          var wLocation = cfg.weather && cfg.weather.location;
          var wData = await fetchWeather(wProvider, wKey, wLocation, lat, lon);
          if (weatherEl) {
            weatherEl.innerHTML = wData.desc + ' ' + wData.temp + '°C ' + (wData.rain ? '🌧️' : '');
          }
          if (tipEl && wData.rain) {
            tipEl.textContent = '🌂 当前正在下雨，出门记得带伞哦～';
            tipEl.classList.add('show');
          }
        } catch (e) {
          if (weatherEl) weatherEl.textContent = '天气获取失败';
        }
      } else {
        if (weatherEl) weatherEl.textContent = '无位置信息';
      }
    } catch (e) {
      if (locEl) locEl.textContent = '获取失败';
      if (ipEl) ipEl.textContent = '获取失败';
      if (weatherEl) weatherEl.textContent = '获取失败';
    }
  }

  // IP 定位（多 provider）
  async function fetchIpInfo(provider, key) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 8000);

    if (provider === 'amap') {
      // 高德地图 IP 定位（需 key，国内最准）
      var res = await fetch('https://restapi.amap.com/v3/ip?key=' + encodeURIComponent(key), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('amap HTTP ' + res.status);
      var d = await res.json();
      if (d.status !== '1') throw new Error('amap 失败');
      // 从 rectangle 解析坐标（格式："lng1,lat1;lng2,lat2"）
      var lat = 0, lon = 0;
      if (d.rectangle) {
        var parts = d.rectangle.split(';');
        if (parts.length === 2) {
          var p1 = parts[0].split(',');
          var p2 = parts[1].split(',');
          lon = (parseFloat(p1[0]) + parseFloat(p2[0])) / 2;
          lat = (parseFloat(p1[1]) + parseFloat(p2[1])) / 2;
        }
      }
      return { country: '中国', region: d.province, city: d.city, ip: d.ip || '', lat: lat, lon: lon };
    }

    if (provider === 'tencent') {
      // 腾讯地图 IP 定位（需 key）
      var res = await fetch('https://apis.map.qq.com/ws/location/v1/ip?key=' + encodeURIComponent(key), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('tencent HTTP ' + res.status);
      var d = await res.json();
      if (d.status !== 0) throw new Error('tencent 失败');
      var r = d.result || {};
      var ad = r.ad_info || {};
      return { country: ad.nation, region: ad.province, city: ad.city, ip: r.ip || '', lat: r.location && r.location.lat, lon: r.location && r.location.lng };
    }

    // 默认：ipapi.co（免 key，HTTPS）
    var res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('ipapi HTTP ' + res.status);
    var d = await res.json();
    return { country: d.country_name, region: d.region, city: d.city, ip: d.ip || '', lat: d.latitude, lon: d.longitude };
  }

  // 天气（多 provider）
  async function fetchWeather(provider, key, location, lat, lon) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 8000);

    if (provider === 'qweather') {
      // 和风天气（需 key，国内最准）
      var loc = location || (lon + ',' + lat);
      var res = await fetch('https://devapi.qweather.com/v7/weather/now?location=' + encodeURIComponent(loc) + '&key=' + encodeURIComponent(key), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('qweather HTTP ' + res.status);
      var d = await res.json();
      if (d.code !== '200') throw new Error('qweather 失败');
      var now = d.now || {};
      return { desc: now.text, temp: now.temp, rain: now.text.indexOf('雨') > -1 };
    }

    if (provider === 'seniverse') {
      // 心知天气（需 key）
      var loc = location || (lon + ',' + lat);
      var res = await fetch('https://api.seniverse.com/v3/weather/now.json?location=' + encodeURIComponent(loc) + '&key=' + encodeURIComponent(key) + '&language=zh-Hans&unit=c', { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('seniverse HTTP ' + res.status);
      var d = await res.json();
      var r = (d.results && d.results[0]) || {};
      var now = r.now || {};
      return { desc: now.text, temp: now.temperature, rain: now.text.indexOf('雨') > -1 };
    }

    // 默认：Open-Meteo（免 key，HTTPS，全球）
    var res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true&timezone=auto', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('openmeteo HTTP ' + res.status);
    var d = await res.json();
    var cw = d.current_weather || {};
    var code = cw.weathercode;
    var isRain = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].indexOf(code) > -1;
    return { desc: getWeatherDesc(code), temp: cw.temperature, rain: isRain };
  }

  // WMO 天气代码转中文
  function getWeatherDesc(code) {
    var map = {
      0: '☀️ 晴', 1: '🌤️ 大部晴', 2: '⛅ 多云', 3: '☁️ 阴',
      45: '🌫️ 雾', 48: '🌫️ 雾凇', 51: '🌦️ 小毛毛雨', 53: '🌦️ 毛毛雨', 55: '🌧️ 大毛毛雨',
      56: '🌧️ 冻毛毛雨', 57: '🌧️ 大冻毛毛雨',
      61: '🌧️ 小雨', 63: '🌧️ 中雨', 65: '🌧️ 大雨', 66: '🌧️ 冻雨', 67: '🌧️ 大冻雨',
      71: '🌨️ 小雪', 73: '🌨️ 中雪', 75: '❄️ 大雪', 77: '🌨️ 雪粒',
      80: '🌧️ 小阵雨', 81: '🌧️ 阵雨', 82: '⛈️ 大阵雨',
      85: '🌨️ 小阵雪', 86: '❄️ 大阵雪', 95: '⛈️ 雷暴', 96: '⛈️ 雷暴冰雹', 99: '⛈️ 强雷暴冰雹'
    };
    return map[code] || '🌡️ 未知';
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
    initPanels();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
