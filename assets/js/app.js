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

  // ---------- 首页渲染 ----------
  function renderHome() {
    var page = hashPage();
    Promise.all([
      api.get('/api/site'),
      api.get('/api/articles/featured?theme=' + currentTheme),
      api.get('/api/articles?page=' + page + '&size=9&theme=' + currentTheme),
      api.get('/api/categories')
    ]).then(function (results) {
      var site = results[0], featured = results[1], list = results[2], cats = results[3];
      renderHeader(site);
      renderFooter(site);

      var themeCats = cats.filter(function (c) { return c.theme === currentTheme; });
      var catBar = document.querySelector('#category-bar');
      if (catBar) {
        catBar.innerHTML = themeCats.map(function (c) {
          return '<a href="category.html?slug=' + c.slug + '"><span class="cat-dot" style="background:' + c.color + '"></span>' +
            esc(c.name) + '<span class="cat-num">' + c.count + '</span></a>';
        }).join('');
      }

      var hero = document.querySelector('#hero');
      if (hero && featured.length) {
        var f = featured[0];
        hero.style.backgroundImage = 'url(' + thumb(f, '600x448') + ')';
        var promptHtml = '';
        if (currentTheme === 'hacker') {
          var p = (site.site.themes && site.site.themes.hacker && site.site.themes.hacker.prompt) || 'user@ip:~$';
          promptHtml = '<div class="hero-prompt">' + esc(p) + '<span class="cursor"></span></div>';
        }
        hero.innerHTML =
          '<div class="hero-overlay"><div class="container"><div class="hero-content">' +
            promptHtml +
            (f.categories[0] ? '<a class="hero-cat" href="category.html?slug=' + f.categories[0].slug + '" style="background:' + f.categories[0].color + '">' + esc(f.categories[0].name) + '</a>' : '') +
            '<h1 class="hero-title"><a href="article.html?id=' + f.id + '">' + esc(f.title) + '</a></h1>' +
            '<div class="hero-meta"><span><i class="fa fa-clock-o"></i> ' + fmtDate(f.date) + '</span>' +
              '<span><i class="fa fa-eye"></i> ' + fmtNum(f.views) + '</span>' +
              '<span><i class="fa fa-heart"></i> ' + fmtNum(f.likes) + '</span></div>' +
            '<p class="hero-excerpt">' + esc(f.excerpt).slice(0, 120) + '…</p>' +
            '<a class="hero-btn" href="article.html?id=' + f.id + '">阅读全文 <i class="fa fa-angle-right"></i></a>' +
          '</div></div></div>';
      }

      var grid = document.querySelector('#article-grid');
      if (grid) grid.innerHTML = list.items.map(articleCard).join('');

      var pag = document.querySelector('#pagination');
      if (pag && list.pages > 1) {
        var html = '';
        for (var i = 1; i <= list.pages; i++) {
          html += '<a href="' + pagUrl(i) + '" class="' + (i === list.page ? 'active' : '') + '">' + i + '</a>';
        }
        pag.innerHTML = html;
      }
      return renderSidebar();
    }).catch(function (e) {
      console.error(e);
      var g = document.querySelector('#article-grid');
      if (g) g.innerHTML = '<div class="alert">数据加载失败：' + esc(e.message) + '</div>';
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
