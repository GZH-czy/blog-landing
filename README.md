# 博客中转页 / Landing Page

一个纯静态、零依赖、零构建的个人主页 / 博客中转页。参考 [yaria.top](https://yaria.top/) 风格设计。

> 特点：单个 `config.js` 配置整站，开箱即用，可部署到 GitHub Pages / Vercel / Netlify / Cloudflare Pages 等任意静态托管。

## 目录结构

```
.
├── index.html        # 首页
├── go.html           # 链接安全中转页（?url=xxx）
├── config.js         # ⭐ 全站配置（个人信息 / 社交链接 / 背景图等）
├── assets/
│   ├── style.css     # 样式
│   └── app.js        # 脚本
└── README.md
```

## 快速开始

### 1. 修改配置

编辑 `config.js`：

```js
window.SITE_CONFIG = {
  profile: {
    name: '你的名字',
    subtitle: '你的副标题',
    avatar: '头像 URL',
    descriptions: ['简介1', '简介2']
  },
  enterBlog: {
    text: '进入博客',
    url: 'https://你的博客地址/'
  },
  socials: [
    { icon: 'fab fa-github', url: 'https://github.com/xxx', title: 'GitHub' }
  ],
  backgrounds: ['https://背景图1.jpg', 'https://背景图2.jpg']
};
```

社交图标使用 [Font Awesome 6](https://fontawesome.com/icons) 类名，也可直接填图片 URL。

### 2. 本地预览

```bash
# 任选其一
python3 -m http.server 8080
npx serve .
```

浏览器打开 `http://localhost:8080`。

### 3. 部署到 GitHub Pages

```bash
git add .
git commit -m "init: landing page"
git branch -M main
git remote add origin git@github.com:你的用户名/仓库名.git
git push -u origin main
```

然后在仓库 **Settings → Pages** 中选择 `main` 分支、`/ (root)` 目录即可。

建议绑定自定义域名（如 `go.你的域名.com`），在仓库根目录添加 `CNAME` 文件：

```
go.example.com
```

## 链接安全中转功能

- 所有外部链接（社交图标、进入博客按钮等非白名单链接）会自动走 `go.html?url=...`
- 中转页展示目标域名、5 秒倒计时、安全提示，防止被钓鱼
- 白名单域名在 `config.js` 的 `redirect.whitelist` 中配置，匹配的链接直接跳转不提示

```js
redirect: {
  enable: true,
  page: 'go.html',
  whitelist: [
    'your-blog.com',     // 精确匹配
    '.your-blog.com'     // 含所有子域
  ]
}
```

## 主要功能

- 全屏随机背景图，右下角按钮手动切换
- 毛玻璃卡片头像 + 昵称 + 副标题
- 实时时钟 + 按时段问候
- 简介轮播
- 一言（默认调用 hitokoto.cn，自带兜底句子）
- 社交图标栏（FA 图标 / 自定义图片）
- 进入博客主按钮
- **右上角音乐播放器**：自定义歌单，增删歌曲改 `config.js` 的 `music.songs` 即可
- 链接安全中转页（支持手动输入/粘贴链接自动填充）
- 响应式适配手机
- 支持 `prefers-reduced-motion` 无障碍偏好

## 音乐播放器配置

在 `config.js` 中：

```js
music: {
  enable: true,
  autoplay: false,
  defaultVolume: 0.7,
  songs: [
    {
      title: '歌曲名',
      artist: '歌手',
      url: 'https://直链.mp3',
      cover: 'https://封面.jpg'
    }
  ]
}
```

增删 `songs` 数组即可，上一首/下一首按钮自动切换。

## 接入到 Hexo（Butterfly）博客

让博客内所有站外链接自动走安全中转页，**只需在 butterfly 配置注入一行脚本**，无需改博客代码。

编辑 `GZH-czy/_config.butterfly.yml` 的 `inject.bottom` 段，在最后加上**两行**（注意顺序：先配置，后引入脚本）：

```yaml
  # 外链安全中转
  - <script>window.SAFE_REDIRECT_CONFIG = { goUrl: 'https://gzh-czy.github.io/blog-landing/go.html', whitelist: ['love.gzh-czy.cc.cd', '.gzh-czy.cc.cd', 'gzh-czy.github.io'] };</script>
  - <script defer src="https://gzh-czy.github.io/blog-landing/assets/external-redirect.js"></script>
```

脚本特性：
- 自动捕获页面内所有 `a[href]`，把外链改写成 `go.html?url=...`
- 同源链接、白名单域名不处理
- 支持 PJAX 动态加载页面（butterfly 默认开启），通过 `MutationObserver` + `pjax:complete` 双重监听新插入的链接
- 不依赖任何库，体积 ~3KB

如果你给中转页绑了自定义域名，把上面两个 URL 换成你的域名即可。

## 浏览器支持

现代浏览器（Chrome / Edge / Firefox / Safari 最新两个版本）。使用了 `backdrop-filter` 毛玻璃效果，老旧浏览器会自动降级为半透明背景。

## License

MIT
