/**
 * 前台渲染逻辑（双主题：hacker / influencer）
 * 通过 MockAPI（mock.js 暴露的模拟后台对象）取数据，渲染页面。
 * 主题状态：从 localStorage 读取，默认 hacker（取自 site.themes.default）。
 */
(function (global) {
  'use strict';

  // ---------- 主题状态 ----------
  var THEME_KEY = 'site_theme';
  function getTheme() {
    var t = localStorage.getItem(THEME_KEY);
    if (!t) {
      var sd = global.__MOCK_DATA__ && global.__MOCK_DATA__.site && global.__MOCK_DATA__.site.site;
      var def = (sd && sd.themes && sd.themes.default) || 'hacker';
      return def;
    }
    return t;
  }
  function applyTheme(t) {
    currentTheme = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
  }
  var currentTheme = getTheme();
  applyTheme(currentTheme); // 进入即应用，避免闪烁

  // ---------- HTTP 工具：直接调 MockAPI（同步执行，包成 Promise） ----------
  function http(method, url, body) {
    return new Promise(function (resolve, reject) {
      try {
        var res = MockAPI.request(method, url, body);
        if (res && res.code === 0) resolve(res.data);
        else reject(new Error((res && res.msg) || ('错误码 ' + (res && res.code))));
      } catch (e) { reject(e); }
    });
  }
  var api = {
    get: function (u) { return http('GET', u); },
    post: function (u, b) { return http('POST', u, b); },
    put: function (u, b) { return http('PUT', u, b); },
    del: function (u) { return http('DELETE', u); }
  };
  global.api = api;

  // ---------- 工具 ----------
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 5) === 'data-') e.setAttribute(k, attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else e.appendChild(c);
      });
    }
    return e;
  }
  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(s.replace(' ', 'T'));
    var M = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    return d.getFullYear() + '年' + M[d.getMonth()] + d.getDate() + '日';
  }
  function fmtNum(n) {
    n = n || 0;
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return '' + n;
  }
  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function thumb(a, size) {
    size = size || '600x448';
    if (a.thumbs && a.thumbs[size]) return a.thumbs[size];
    if (a.thumbs && a.thumbs.full) return a.thumbs.full;
    return a.thumbnail || 'assets/theme/images/3x2.png';
  }

  // ---------- 分页参数（hash 路由：#page=2） ----------
  function hashPage() {
    var m = (location.hash || '').match(/[#&]page=(\d+)/);
    return m ? parseInt(m[1]) || 1 : 1;
  }
  function pagUrl(page) {
    var base = location.pathname.split('/').pop() || 'index.html';
    // 去掉可能残留的 #page= 旧 hash，保留 search 参数
    var s = (location.search || '').split('#')[0];
    return base + s + '#page=' + page;
  }

  // ---------- 渲染：站点头 ----------
  function renderHeader(site) {
    var branding = document.querySelector('#header .site-branding');
    var themeCfg = (site.site.themes && site.site.themes[currentTheme]) || {};
    var tagline = themeCfg.tagline || site.site.tagline;
    if (branding) {
      if (site.site.logo) {
        branding.innerHTML = '<a href="index.html"><img src="' + site.site.logo +
          '" alt="' + esc(site.site.name) + '" onerror="this.style.display=\'none\'"></a><p>' + esc(tagline) + '</p>';
      } else {
        branding.innerHTML = '<a href="index.html" class="brand-text"><span class="accent">$</span> ' +
          esc(site.site.name) + '</a><p>' + esc(tagline) + '</p>';
      }
    }
    var nav = document.querySelector('#header .main-nav ul');
    if (nav && site.menu) {
      nav.innerHTML = site.menu.map(function (m) {
        return '<li><a href="' + m.url + '">' + esc(m.title) + '</a></li>';
      }).join('');
    }
    var soc = document.querySelector('#header .header-social');
    if (soc && site.site.social) {
      var iconMap = { weibo: 'fa-weibo', wechat: 'fa-weixin', video: 'fa-video-camera',
        camera: 'fa-camera', github: 'fa-github', comment: 'fa-comment' };
      soc.innerHTML = site.site.social.map(function (s) {
        return '<a href="' + s.url + '" target="_blank" title="' + esc(s.name) + '"><i class="fa ' + (iconMap[s.icon] || 'fa-link') + '"></i></a>';
      }).join('');
    }
    renderThemeSwitch();
  }

  // ---------- 主题切换器 ----------
  function renderThemeSwitch() {
    var sw = document.querySelector('#theme-switch');
    if (!sw) return;
    sw.innerHTML =
      '<button data-set="hacker" title="黑客主题" class="' + (currentTheme === 'hacker' ? 'active' : '') + '"><i class="fa fa-terminal"></i></button>' +
      '<button data-set="influencer" title="网红主题" class="' + (currentTheme === 'influencer' ? 'active' : '') + '"><i class="fa fa-heart"></i></button>';
    Array.prototype.forEach.call(sw.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        applyTheme(b.getAttribute('data-set'));
        var label = currentTheme === 'hacker' ? '黑客' : '网红';
        showToast('已切换到「' + label + '」主题');
        route();
      });
    });
  }

  function showToast(msg) {
    var t = document.querySelector('.theme-toast');
    if (!t) {
      t = el('div', { 'class': 'theme-toast' });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }

  // ---------- 渲染：页脚 ----------
  function renderFooter(site) {
    var f = document.querySelector('#footer');
    if (!f) return;
    var s = site.site;
    var friendHtml = (s.friendLinks || []).map(function (l) {
      return '<li><a href="' + l.url + '" target="_blank">' + esc(l.name) + '</a></li>';
    }).join('');
    var socMap = { weibo: 'fa-weibo', wechat: 'fa-weixin', video: 'fa-video-camera',
      camera: 'fa-camera', github: 'fa-github', comment: 'fa-comment' };
    var socHtml = (s.social || []).map(function (l) {
      return '<a href="' + l.url + '" target="_blank" title="' + esc(l.name) + '"><i class="fa ' + (socMap[l.icon] || 'fa-link') + '"></i></a>';
    }).join('');
    f.innerHTML =
      '<div class="container"><div class="row">' +
        '<div class="col-md-4"><div class="widget"><h3 class="widget-title">关于 ' + esc(s.name) + '</h3>' +
          '<p>' + esc(s.description) + '</p><div class="footer-social">' + socHtml + '</div></div></div>' +
        '<div class="col-md-4"><div class="widget"><h3 class="widget-title">友情链接</h3>' +
          '<ul class="footer-links">' + friendHtml + '</ul></div></div>' +
        '<div class="col-md-4"><div class="widget"><h3 class="widget-title">联系方式</h3>' +
          '<ul class="footer-contact">' +
            '<li><i class="fa fa-envelope"></i> <a href="mailto:' + esc(s.contact.email) + '">' + esc(s.contact.email) + '</a></li>' +
            '<li><i class="fa fa-map-marker"></i> ' + esc(s.contact.city) + '</li>' +
            '<li><i class="fa fa-weixin"></i> 微信：' + esc(s.contact.wechat) + '</li>' +
            '<li><i class="fa fa-qq"></i> QQ：' + esc(s.contact.qq || '') + '</li>' +
          '</ul></div></div>' +
      '</div><div class="footer-copyright">' + esc(s.copyright) + '</div></div>';
  }

  // ---------- 文章卡片 ----------
  function articleCard(a) {
    var cat = a.categories[0] || { name: '博客', color: '#e8506e', slug: 'blog' };
    return '' +
    '<article class="post type-post status-publish format-standard has-post-thumbnail hentry category-' + cat.slug + '">' +
      '<div class="post-thumbnail">' +
        '<a href="article.html?id=' + a.id + '" title="' + esc(a.title) + '">' +
          '<img src="' + thumb(a, '400x240') + '" alt="' + esc(a.title) + '" onerror="this.src=\'' + thumb(a, 'full') + '\'">' +
        '</a>' +
        '<a class="category-label" href="category.html?slug=' + cat.slug + '" style="background:' + cat.color + '">' + esc(cat.name) + '</a>' +
      '</div>' +
      '<div class="post-content">' +
        '<h2 class="post-title"><a href="article.html?id=' + a.id + '">' + esc(a.title) + '</a></h2>' +
        '<div class="post-meta">' +
          '<span class="date"><i class="fa fa-clock-o"></i> ' + fmtDate(a.date) + '</span>' +
          '<span class="views"><i class="fa fa-eye"></i> ' + fmtNum(a.views) + '</span>' +
          '<span class="likes"><i class="fa fa-heart"></i> ' + fmtNum(a.likes) + '</span>' +
        '</div>' +
        '<div class="post-excerpt">' + esc(a.excerpt).slice(0, 80) + '…</div>' +
        '<a class="read-more" href="article.html?id=' + a.id + '">阅读全文 <i class="fa fa-angle-right"></i></a>' +
      '</div>' +
    '</article>';
  }

  // ---------- 侧边栏（按当前主题过滤） ----------
  function renderSidebar() {
    return api.get('/api/articles?size=5&sort=views&theme=' + currentTheme).then(function (r) {
      var pop = r.items.map(function (a) {
        return '<li><a href="article.html?id=' + a.id + '" class="popular-thumb">' +
            '<img src="' + thumb(a, '150x150') + '" alt="' + esc(a.title) + '"></a>' +
          '</a><div class="popular-info"><a href="article.html?id=' + a.id + '" class="popular-title">' + esc(a.title) + '</a>' +
          '<span class="popular-meta"><i class="fa fa-eye"></i> ' + fmtNum(a.views) + '</span></div></li>';
      }).join('');
      var sb = document.querySelector('#sidebar');
      if (!sb) return;
      return api.get('/api/categories').then(function (cats) {
        return api.get('/api/tags').then(function (tags) {
          var themeCats = cats.filter(function (c) { return c.theme === currentTheme; });
          var themeTags = tags.filter(function (t) { return t.theme === currentTheme; });
          var catHtml = themeCats.map(function (c) {
            return '<li><a href="category.html?slug=' + c.slug + '">' + esc(c.name) +
              ' <span class="count" style="background:' + c.color + '">' + c.count + '</span></a></li>';
          }).join('');
          var tagHtml = themeTags.map(function (t) {
            return '<a href="tag.html?slug=' + t.slug + '" class="tag-cloud-link">' + esc(t.name) +
              '<span class="tag-count">' + t.count + '</span></a>';
          }).join('');
          sb.innerHTML =
            '<div class="widget widget_popular_posts"><h3 class="widget-title">热门文章</h3>' +
              '<ul class="popular-list">' + pop + '</ul></div>' +
            '<div class="widget widget_categories"><h3 class="widget-title">分类</h3>' +
              '<ul class="category-list">' + catHtml + '</ul></div>' +
            '<div class="widget widget_tag_cloud"><h3 class="widget-title">标签</h3>' +
              '<div class="tagcloud">' + tagHtml + '</div></div>';
        });
      });
    });
  }

  // ---------- 首页：OpenClaw 个人品牌 Landing Page ----------
  function setupLandingReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (item) { item.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(items, function (item) { observer.observe(item); });
  }

  function landingArticleCard(a) {
    var cat = a.categories[0] || { name: '技术' };
    return '<a class="journal-card reveal" href="article.html?id=' + a.id + '">' +
      '<div class="journal-meta">' + esc(cat.name) + ' · ' + fmtDate(a.date) + '</div>' +
      '<h3>' + esc(a.title) + '</h3>' +
      '<p>' + esc(a.excerpt).slice(0, 82) + '…</p>' +
      '<span class="journal-arrow">阅读笔记 →</span>' +
    '</a>';
  }

  function renderHome() {
    Promise.all([
      api.get('/api/site'),
      api.get('/api/articles?page=1&size=3&theme=hacker')
    ]).then(function (results) {
      var site = results[0], articles = results[1];
      renderHeader(site);
      renderFooter(site);
      document.title = 'sangjiexun · OpenClaw AI Builder';

      var nav = document.querySelector('#header .main-nav ul');
      if (nav) {
        nav.innerHTML =
          '<li><a href="#landing-capabilities">能力</a></li>' +
          '<li><a href="#landing-projects">项目</a></li>' +
          '<li><a href="#landing-method">方法</a></li>' +
          '<li><a href="category.html">文章</a></li>' +
          '<li><a href="#landing-contact">联系</a></li>';
      }

      var hero = document.querySelector('#landing-hero');
      if (hero) hero.innerHTML =
        '<div class="container hero-shell">' +
          '<div class="hero-copy">' +
            '<div class="eyebrow"><span class="eyebrow-dot"></span> OPENCLAW · AI BUILDER</div>' +
            '<h1>把 AI 装进<span class="gradient">真实工作流</span></h1>' +
            '<p class="hero-lead">我是 <strong>sangjiexun</strong>，专注 AI Agent、知识工程与产品自动化。把复杂系统拆成可运行、可复用、可持续进化的智能体能力。</p>' +
            '<div class="hero-actions">' +
              '<a class="claw-btn primary" href="#landing-projects">探索代表项目 <span>↘</span></a>' +
              '<a class="claw-btn secondary" href="https://github.com/sangjiexun" target="_blank"><i class="fa fa-github"></i> GitHub Profile</a>' +
            '</div>' +
            '<div class="hero-proof"><span><i>●</i> AI Agent Systems</span><span><i>●</i> Product Engineering</span><span><i>●</i> Knowledge Architecture</span></div>' +
          '</div>' +
          '<div class="hero-visual">' +
            '<div class="hero-image-frame"><img src="assets/theme/images/landing/openclaw-hero.png" alt="OpenClaw 龙虾 AI 助手主视觉"></div>' +
            '<div class="float-card status"><div class="card-label"><span>AGENT STATUS</span><span class="signal"></span></div><div class="big">ONLINE</div><div class="sub">OpenClaw node · China</div></div>' +
            '<div class="float-card code"><div><span class="cool">agent</span>.<span class="hot">execute</span>({</div><div>&nbsp;&nbsp;context: <span class="hot">"real-world"</span>,</div><div>&nbsp;&nbsp;loop: <span class="cool">"evolve"</span></div><div>});</div></div>' +
          '</div>' +
        '</div>';

      var capabilities = document.querySelector('#landing-capabilities');
      if (capabilities) capabilities.innerHTML =
        '<div class="container">' +
          '<div class="section-head reveal"><div><div class="section-kicker">01 / CAPABILITIES</div><h2>从想法到运行系统</h2></div><p>不止是写代码，而是把模型、工具、数据、知识和界面编排成可交付的完整产品。</p></div>' +
          '<div class="capability-grid">' +
            '<article class="cap-card reveal"><span class="cap-index">01</span><div class="cap-icon"><i class="fa fa-cubes"></i></div><h3>AI Agent 工程</h3><p>围绕 OpenClaw、MCP、Skill 与多智能体编排，构建能调用工具、持续执行并产生真实结果的 Agent 系统。</p><div class="cap-tags"><span>OpenClaw</span><span>MCP</span><span>Multi-Agent</span><span>Tool Use</span></div></article>' +
            '<article class="cap-card reveal"><span class="cap-index">02</span><div class="cap-icon"><i class="fa fa-code"></i></div><h3>全栈产品构建</h3><p>以 Nuxt、Python、Node.js 与现代前端完成从原型、数据层到部署的端到端产品开发。</p><div class="cap-tags"><span>Nuxt</span><span>Python</span><span>Node.js</span></div></article>' +
            '<article class="cap-card reveal"><span class="cap-index">03</span><div class="cap-icon"><i class="fa fa-database"></i></div><h3>知识与数据系统</h3><p>通过 Obsidian、Neo4j、RAG 与结构化工作流，把碎片信息沉淀为可检索、可关联、可复用的知识资产。</p><div class="cap-tags"><span>Neo4j</span><span>RAG</span><span>Obsidian</span></div></article>' +
            '<article class="cap-card reveal"><span class="cap-index">04</span><div class="cap-icon"><i class="fa fa-line-chart"></i></div><h3>金融与内容智能</h3><p>将公开数据、量化规则、舆情聚合和 LLM 增强结合，服务于市场研究、内容雷达和信息决策。</p><div class="cap-tags"><span>Market Data</span><span>LLM</span><span>Visualization</span><span>Automation</span></div></article>' +
          '</div>' +
        '</div>';

      var projects = document.querySelector('#landing-projects');
      if (projects) projects.innerHTML =
        '<div class="container">' +
          '<div class="section-head reveal"><div><div class="section-kicker">02 / SELECTED BUILDS</div><h2>正在生长的产品</h2></div><p>选择真正代表方法与方向的作品。每个项目都是一次“需求—系统—反馈—进化”的完整循环。</p></div>' +
          '<div class="project-grid">' +
            '<article class="project-card featured reveal"><div class="project-bg"></div><div class="project-visual"><div class="project-orb"></div></div><div class="project-content"><span class="project-type">PERSONAL AI · OPEN SOURCE</span><h3>OpenClaw<br>龙虾式个人 AI</h3><p>跨平台个人 AI 助手生态：让模型接入工具、知识与真实环境，成为可持续工作的数字伙伴。</p><a class="project-link" href="https://github.com/sangjiexun/openclaw" target="_blank">查看 OpenClaw →</a></div></article>' +
            '<article class="project-card reveal"><div class="project-bg"></div><div class="project-visual"><div class="project-orb"></div></div><div class="project-content"><span class="project-type">VOICE AI · NUxt 4</span><h3>随声 AI</h3><p>语音克隆、合成与播报工具，把声音能力封装成易用的 Web 产品。</p><a class="project-link" href="https://github.com/sangjiexun/suisheng-ai" target="_blank">进入项目 →</a></div></article>' +
            '<article class="project-card reveal"><div class="project-bg"></div><div class="project-visual"><div class="project-orb"></div></div><div class="project-content"><span class="project-type">MARKET INTELLIGENCE</span><h3>openAGu</h3><p>A 股行业大盘监控与绩优股多维评分，连接数据、规则与可视化决策。</p><a class="project-link" href="https://github.com/sangjiexun/openAGu" target="_blank">进入项目 →</a></div></article>' +
          '</div>' +
        '</div>';

      var method = document.querySelector('#landing-method');
      if (method) method.innerHTML =
        '<div class="container method-shell">' +
          '<div class="method-copy reveal"><div class="section-kicker">03 / OPERATING SYSTEM</div><h2>生态思维，<br>工程落地</h2><p>把人、目标、工具、环境和反馈视为同一个生态系统。先定位关键约束，再让方案在真实环境中小步运行、持续校正。</p><a class="project-link" href="about.html">了解我的思考方式 →</a></div>' +
          '<div class="method-list">' +
            '<article class="method-item reveal"><span class="method-num">01</span><div><h3>Context / 看见全局</h3><p>理解目标、角色、边界、数据与环境，避免局部最优。</p></div></article>' +
            '<article class="method-item reveal"><span class="method-num">02</span><div><h3>Build / 做出闭环</h3><p>以最小可运行系统连接输入、处理、输出和验证。</p></div></article>' +
            '<article class="method-item reveal"><span class="method-num">03</span><div><h3>Evolve / 用反馈进化</h3><p>记录真实结果，把有效经验沉淀为 Skill、数据与长期知识。</p></div></article>' +
          '</div>' +
        '</div>';

      var journal = document.querySelector('#landing-journal');
      if (journal) journal.innerHTML =
        '<div class="container"><div class="section-head reveal"><div><div class="section-kicker">04 / FIELD NOTES</div><h2>实践笔记</h2></div><p>记录工具、工程与系统思考。文章不是终点，而是可复用经验的公开索引。</p></div>' +
        '<div class="journal-grid">' + (articles.items || []).map(landingArticleCard).join('') + '</div></div>';

      var contact = document.querySelector('#landing-contact');
      if (contact) contact.innerHTML =
        '<div class="container"><div class="contact-panel reveal"><div class="section-kicker">05 / CONNECT</div><h2>让下一个想法<br>真正上线</h2><p>欢迎交流 AI Agent、OpenClaw、知识工程、个人产品与自动化系统。复杂问题，适合从一段清晰的对话开始。</p><div class="contact-actions">' +
          '<a class="claw-btn primary" href="mailto:' + esc(site.site.contact.email) + '"><i class="fa fa-envelope"></i> ' + esc(site.site.contact.email) + '</a>' +
          '<a class="claw-btn secondary" href="https://github.com/sangjiexun" target="_blank"><i class="fa fa-github"></i> GitHub</a>' +
          '<span class="claw-btn secondary"><i class="fa fa-weixin"></i> 微信 ' + esc(site.site.contact.wechat) + '</span>' +
        '</div></div></div>';

      setupLandingReveal();
    }).catch(function (e) {
      console.error(e);
      var home = document.querySelector('#home-landing');
      if (home) home.innerHTML = '<div class="container section-pad"><div class="alert">页面加载失败：' + esc(e.message) + '</div></div>';
    });
  }

  // ---------- 文章详情 ----------
  function renderArticle() {
    var id = new URLSearchParams(location.search).get('id');
    if (!id) return;
    Promise.all([
      api.get('/api/site'),
      api.get('/api/articles/' + id)
    ]).then(function (results) {
      var site = results[0], data = results[1];
      renderHeader(site);
      renderFooter(site);
      var a = data.article;
      document.title = a.title + ' - ' + site.site.name;
      var main = document.querySelector('#article-main');
      if (!main) return;
      var cat = a.categories[0] || { name: '博客', color: '#e8506e', slug: 'blog' };
      var galleryHtml = (a.gallery || []).map(function (g) {
        return '<a href="' + g + '" class="gallery-item"><img src="' + g + '" alt=""></a>';
      }).join('');
      main.innerHTML =
        '<article class="single-post"><header class="single-header">' +
          '<a class="category-label" href="category.html?slug=' + cat.slug + '" style="background:' + cat.color + '">' + esc(cat.name) + '</a>' +
          '<h1 class="single-title">' + esc(a.title) + '</h1>' +
          '<div class="single-meta"><span><i class="fa fa-user"></i> ' + esc(a.author) + '</span>' +
            '<span><i class="fa fa-clock-o"></i> ' + fmtDate(a.date) + '</span>' +
            '<span><i class="fa fa-eye"></i> ' + fmtNum(a.views) + ' 阅读</span>' +
            '<span><i class="fa fa-heart"></i> ' + fmtNum(a.likes) + '</span>' +
            '<span><i class="fa fa-book"></i> 约 ' + a.wordCount + '字 / ' + a.readMinutes + '分钟</span></div>' +
        '</header>' +
        '<div class="single-thumbnail"><img src="' + thumb(a, 'full') + '" alt="' + esc(a.title) + '"></div>' +
        '<div class="single-content">' + a.content + '</div>' +
        (galleryHtml ? '<div class="single-gallery"><h3>图集</h3><div class="gallery-grid">' + galleryHtml + '</div></div>' : '') +
        '<div class="single-tags">' + (a.tags || []).map(function (t) {
          return '<a href="tag.html?slug=' + t.slug + '" class="tag-link">' + esc(t.name) + '</a>'; }).join('') + '</div>' +
        '<div class="single-actions"><button class="like-btn" data-id="' + a.id + '"><i class="fa fa-heart"></i> 喜欢 (' + a.likes + ')</button>' +
          '<button class="share-btn"><i class="fa fa-share-alt"></i> 分享</button></div>' +
        '<section class="comments"><h3 class="comments-title">评论 (' + a.commentCount + ')</h3><div class="comment-list">' +
          (data.comments || []).map(function (c) {
            return '<div class="comment"><img class="comment-avatar" src="' + (c.avatar || 'assets/theme/images/3x2.png') + '" alt="">' +
              '<div class="comment-body"><div class="comment-author">' + esc(c.author) +
              ' <span class="comment-date">' + fmtDate(c.date) + '</span></div>' +
              '<div class="comment-text">' + esc(c.content) + '</div></div></div>';
          }).join('') + '</div></section>' +
        '</article>';
      var lb = main.querySelector('.like-btn');
      if (lb) lb.addEventListener('click', function () {
        if (localStorage.getItem('liked_' + a.id)) { alert('你已经喜欢过了'); return; }
        api.put('/api/articles/' + a.id, { likes: a.likes + 1 }).then(function () {
          localStorage.setItem('liked_' + a.id, '1');
          lb.innerHTML = '<i class="fa fa-heart"></i> 已喜欢 (' + (a.likes + 1) + ')';
          lb.classList.add('liked');
        });
      });
      return renderSidebar();
    }).catch(function (e) {
      console.error(e);
      var main = document.querySelector('#article-main');
      if (main) main.innerHTML = '<div class="alert">文章加载失败：' + esc(e.message) + '</div>';
    });
  }

  // ---------- 分类 / 标签 / 搜索 ----------
  function renderList(kind) {
    var params = new URLSearchParams(location.search);
    var slug = params.get('slug');
    var q = params.get('q');
    var page = hashPage();
    Promise.all([
      api.get('/api/site'),
      api.get('/api/categories')
    ]).then(function (results) {
      var site = results[0], cats = results[1];
      renderHeader(site);
      renderFooter(site);
      var apiUrl = '/api/articles?page=' + page + '&size=9&theme=' + currentTheme;
      var title = '全部文章';
      if (kind === 'category' && slug) {
        apiUrl += '&category=' + slug;
        var c = cats.filter(function (x) { return x.slug === slug; })[0];
        title = c ? c.name : '分类';
      } else if (kind === 'tag' && slug) {
        apiUrl += '&tag=' + slug;
        title = '#' + slug;
      } else if (kind === 'search' && q) {
        apiUrl += '&q=' + encodeURIComponent(q);
        title = '搜索：' + q;
      }
      var head = document.querySelector('#list-header');
      if (head) head.innerHTML = '<h1 class="list-title">' + esc(title) + '</h1>' +
        '<div class="list-breadcrumb"><a href="index.html">首页</a> / <span>' + esc(title) + '</span></div>';
      return api.get(apiUrl).then(function (r) {
        var grid = document.querySelector('#article-grid');
        if (grid) grid.innerHTML = r.items.length ? r.items.map(articleCard).join('') : '<div class="empty">暂无内容</div>';
        var pag = document.querySelector('#pagination');
        if (pag && r.pages > 1) {
          var html = '';
          for (var i = 1; i <= r.pages; i++) {
            html += '<a href="' + pagUrl(i) + '" class="' + (i === r.page ? 'active' : '') + '">' + i + '</a>';
          }
          pag.innerHTML = html;
        }
        return renderSidebar();
      });
    }).catch(function (e) { console.error(e); });
  }

  // ---------- 关于页 ----------
  function renderAbout() {
    api.get('/api/site').then(function (site) {
      renderHeader(site);
      renderFooter(site);
      var a = site.author;
      var main = document.querySelector('#about-main');
      if (!main) return;
      var socialHtml = (site.site.social || []).map(function (s) {
        return '<a href="' + s.url + '" target="_blank" title="' + esc(s.name) + '"><i class="fa ' +
          ({ weibo: 'fa-weibo', wechat: 'fa-weixin', github: 'fa-github', comment: 'fa-comment' }[s.icon] || 'fa-link') + '"></i></a>';
      }).join('');
      main.innerHTML =
        '<div class="about-wrap"><div class="about-avatar">' + (site.site.name ? site.site.name.charAt(0).toUpperCase() : 'S') + '</div>' +
          '<div class="about-name">' + esc(a.name || site.site.name) + '</div>' +
          '<div class="about-bio">' + esc(a.bio || site.site.description) + '</div>' +
          '<div class="about-meta">' +
            '<span><i class="fa fa-envelope"></i> <a href="mailto:' + esc(site.site.contact.email) + '">' + esc(site.site.contact.email) + '</a></span>' +
            '<span><i class="fa fa-map-marker"></i> ' + esc(site.site.contact.city) + '</span>' +
            '<span><i class="fa fa-weixin"></i> 微信：' + esc(site.site.contact.wechat) + '</span>' +
            '<span><i class="fa fa-qq"></i> QQ：' + esc(site.site.contact.qq || '') + '</span>' +
          '</div>' +
          '<div class="footer-social">' + socialHtml + '</div></div>';
      return renderSidebar();
    }).catch(function (e) { console.error(e); });
  }

  // ---------- 路由 ----------
  function route() {
    var path = location.pathname.split('/').pop() || 'index.html';
    if (path === '' || path === 'index.html') return renderHome();
    if (path === 'article.html') return renderArticle();
    if (path === 'category.html') return renderList('category');
    if (path === 'tag.html') return renderList('tag');
    if (path === 'search.html') return renderList('search');
    if (path === 'about.html') return renderAbout();
  }

  global.App = { route: route, setTheme: applyTheme };
  document.addEventListener('DOMContentLoaded', route);

  // hash 变化（分页翻页）→ 无刷新重渲染当前页
  window.addEventListener('hashchange', function () {
    var path = location.pathname.split('/').pop() || 'index.html';
    if (path === '' || path === 'index.html') return renderHome();
    if (path === 'category.html' || path === 'tag.html') return renderList(path === 'category.html' ? 'category' : 'tag');
    if (path === 'search.html') return renderList('search');
    window.scrollTo(0, 0);
  });

  // 吸顶 header：滚动超过 8px 加 sticky 类（毛玻璃）
  function onScroll() {
    var h = document.querySelector('#header');
    if (!h) return;
    if (window.scrollY > 8) h.classList.add('sticky');
    else h.classList.remove('sticky');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

})(window);
