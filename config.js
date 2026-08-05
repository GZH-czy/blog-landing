/**
 * ============================================================
 *  博客中转页 · 站点配置
 *  修改本文件即可定制整站，无需改动 HTML / CSS / JS
 * ============================================================
 */
window.SITE_CONFIG = {
  /* ---------- 个人信息 ---------- */
  profile: {
    name: '子涵',
    subtitle: '生活明朗，万物可爱',
    avatar: 'https://picx.zhimg.com/80/v2-5cad506ea105dd3da8f4000b0f9bd3c0_720w.webp?source=1def8aca',
    // 头像下方的一句话简介（支持数组随机轮播）
    descriptions: [
      '一个有趣的博客 ✨',
      '记录代码与生活',
      '今天也要开心呀～'
    ]
  },

  /* ---------- 时钟问候 ---------- */
  greeting: {
    enable: true,
    // 时间段问候语，按小时划分
    rules: [
      { start: 0, end: 5, text: '夜深了，注意休息 🌙' },
      { start: 6, end: 11, text: '早上好呀 ☀️' },
      { start: 12, end: 13, text: '中午好，吃饭了吗 🍚' },
      { start: 14, end: 17, text: '下午好 🍵' },
      { start: 18, end: 22, text: '晚上好 🌆' },
      { start: 23, end: 23, text: '夜深了，注意休息 🌙' }
    ]
  },

  /* ---------- 进入博客按钮 ---------- */
  enterBlog: {
    text: '进入博客',
    url: 'https://love.gzh-czy.cc.cd/'
  },

  /* ---------- 社交链接 ----------
     icon 可填：
       - Font Awesome 类名，如 "fab fa-github"（需在 index.html 引入 FA）
       - 或任意图片 URL
  */
  socials: [
    { icon: 'fab fa-github',   url: 'https://github.com/GZH-czy',    title: 'GitHub',   color: '#ffffff' },
    { icon: 'fa-solid fa-envelope', url: 'mailto:gzh@example.com',   title: '邮箱',     color: '#ea4335' },
    { icon: 'fa-solid fa-rss', url: 'https://love.gzh-czy.cc.cd/atom.xml', title: 'RSS', color: '#ffa500' }
    // 可继续添加，例如 B站：{ icon: 'fa-brands fa-bilibili', url: '...', title: '哔哩哔哩', color: '#00a1d6' }
  ],

  /* ---------- 背景图 ----------
     可填多张，每次刷新随机一张。支持本地路径（如 "assets/bg/1.jpg"）或在线 URL。
  */
  backgrounds: [
    'https://img.0v0.my/backgrounds/d1.webp',
    'https://img.0v0.my/backgrounds/d2.webp',
    'https://img.0v0.my/backgrounds/d3.webp',
    'https://img.0v0.my/backgrounds/l1.webp',
    'https://img.0v0.my/backgrounds/l2.webp',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80'
  ],

  /* ---------- 背景遮罩（0~1，越大背景越暗、文字越清晰） ---------- */
  backgroundMask: 0.35,

  /* ---------- 一言 / 随机句子 ----------
     留空数组 [] 则不显示。也可配置远程 API。
  */
  hitokoto: {
    enable: true,
    // 内置句子（API 失败时兜底；API 成功时优先用远程）
    fallback: [
      '愿你成为自己的太阳，无需凭借谁的光。',
      '生活明朗，万物可爱。',
      '人生没有白走的路，每一步都算数。'
    ],
    // 一言 API（返回 JSON，含 hitokoto / from 字段）；不想用就设为 null
    api: 'https://v1.hitokoto.cn/?c=i&c=k',
    // 自动轮播间隔（毫秒），设 0 则不轮播
    interval: 8000
  },

  /* ---------- 链接安全中转 ----------
     index.html 等页面里所有外部链接，是否统一走 go.html 中转页。
     白名单内的域名不中转（直接跳转）。
  */
  redirect: {
    enable: true,
    // 中转页路径（相对于站点根目录）
    page: 'go.html',
    // 这些域名直接跳转，不提示；支持子域通配（前缀 '.' 表示含所有子域）
    whitelist: [
      'love.gzh-czy.cc.cd',
      '.gzh-czy.cc.cd',
      'gzh-czy.github.io',
      '.github.com',
      'github.com'
    ]
  },

  /* ---------- 右上角音乐播放器 ----------
     两种来源可同时启用，会合并到一个播放列表：
       1) 网易云歌单/单曲（netease）——填 ID 即可，自动拉取歌名/歌手/封面
       2) 自定义歌曲（songs）——自己填 mp3 直链
  */
  music: {
    enable: true,
    autoplay: false,        // 浏览器通常会禁止带声音自动播放，建议保持 false
    defaultVolume: 0.7,     // 0~1

    // 网易云音乐
    netease: {
      enable: true,
      // 自建 Meting API（Vercel 部署）
      api: 'https://meting-api.gzh-czy.cc.cd/api/meting',
      id: '2780458004',          // 歌单 ID 或单曲 ID
      type: 'playlist',          // playlist = 歌单，song = 单曲
      // API 失败时是否用网易云官方外链做兜底播放（部分 VIP 歌曲可能只有片段）
      fallbackOuter: true
    },

    // 自定义歌曲（会追加到网易云歌单后面）
    songs: [
      // {
      //   title: '示例歌曲',
      //   artist: '歌手名',
      //   url: 'https://example.com/song.mp3',
      //   cover: 'https://example.com/cover.jpg',
      //   nid: '123456'           // 可选：网易云 ID，填了会在播放器显示
      // }
       {
         title: '示例歌曲',
         artist: '歌手名',
         url: 'https://music.163.com/#/song?id=536154344',
         cover: 'http://p2.music.126.net/09RDXHTPLSDU8SayrYq9Ig==/109951170245472485.jpg?param=130y130',
         nid: '536154344'           // 可选：网易云 ID，填了会在播放器显示
       }
  },

  /* ---------- 页脚 ---------- */
  footer: {
    // 可用 {year} 占位
    text: '© {year} 子涵 · Built with ❤️',
    // 备案号等，没有就留空字符串
    beian: ''
  }
};
