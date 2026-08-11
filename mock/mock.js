/**
 * Mock.js 数据后台
 * 拦截 XHR 请求，提供 REST 风格 API，数据源为 mock/data/*.json
 * 写操作（文章增删改、设置）落 localStorage，支持 reset。
 *
 * 接口列表：
 *   GET  /api/site                 站点配置 + 菜单
 *   GET  /api/articles             文章列表  ?page=1&size=9&category=&tag=&q=
 *   GET  /api/articles/:id         文章详情
 *   GET  /api/articles/featured    精选文章
 *   GET  /api/categories           分类列表
 *   GET  /api/tags                 标签列表
 *   GET  /api/media                媒体库   ?page=1&size=24
 *   GET  /api/comments?articleId=  评论列表
 *   GET  /api/stats                统计数据
 *   POST /api/articles             新建文章
 *   PUT  /api/articles/:id         更新文章
 *   DEL  /api/articles/:id         删除文章
 *   POST /api/reset                重置所有 localStorage 改动
 */
(function (global) {
  'use strict';

  // ---------- 数据加载（从内联的 window.__MOCK_DATA__ 读取） ----------
  var DATA = null;          // 原始数据（只读底本）
  var STORE = null;         // 运行时数据（含 localStorage 改动）
  var LS_KEY = 'tana_mock_store_v1';

  function loadBaseData() {
    if (DATA) return;
    var src = global.__MOCK_DATA__;
    if (!src) throw new Error('Mock 数据未加载：请确保 mock/data.js 在 mock.js 之前引入');
    DATA = {
      site: src.site,
      articles: src.articles,
      categories: src.categories,
      tags: src.tags,
      media: src.media,
      comments: src.comments,
      pages: src.pages
    };
  }

  function loadStore() {
    loadBaseData();
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) {}
    if (saved && saved.articles) {
      STORE = saved;
    } else {
      // 深拷贝底本作为运行时数据
      STORE = JSON.parse(JSON.stringify({
        site: DATA.site,
        articles: DATA.articles,
        categories: DATA.categories,
        tags: DATA.tags
      }));
      saveStore();
    }
  }

  function saveStore() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(STORE)); } catch (e) {}
  }

  function resetStore() {
    localStorage.removeItem(LS_KEY);
    STORE = JSON.parse(JSON.stringify({
      site: DATA.site,
      articles: DATA.articles,
      categories: DATA.categories,
      tags: DATA.tags
    }));
    saveStore();
  }

  // ---------- 工具 ----------
  function qs(url) {
    var q = {};
    var i = url.indexOf('?');
    if (i < 0) return q;
    url.slice(i + 1).split('&').forEach(function (kv) {
      var p = kv.split('=');
      q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    return q;
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  // Mock.js 模板：随机数据生成（用于新建文章的默认字段）
  var Random = {
    integer: function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  };

  // ---------- 路由处理 ----------
  function handle(method, url, body) {
    loadStore();
    method = method.toUpperCase();
    // 路由匹配只用 path（去掉 query string），query 由 qs() 单独解析
    var path = url.split('?')[0];

    // 站点配置
    if (method === 'GET' && path === '/api/site') {
      return { code: 0, data: STORE.site };
    }

    // 统计
    if (method === 'GET' && path === '/api/stats') {
      var totalViews = 0, totalLikes = 0, totalComments = 0;
      STORE.articles.forEach(function (a) {
        totalViews += a.views || 0;
        totalLikes += a.likes || 0;
        totalComments += a.commentCount || 0;
      });
      // 按月统计发布趋势
      var byMonth = {};
      STORE.articles.forEach(function (a) {
        var m = (a.date || '').slice(0, 7);
        if (m) byMonth[m] = (byMonth[m] || 0) + 1;
      });
      return {
        code: 0,
        data: {
          articleCount: STORE.articles.length,
          categoryCount: STORE.categories.length,
          tagCount: STORE.tags.length,
          mediaCount: DATA.media.length,
          totalViews: totalViews,
          totalLikes: totalLikes,
          totalComments: totalComments,
          byMonth: Object.keys(byMonth).sort().map(function (k) {
            return { month: k, count: byMonth[k] };
          })
        }
      };
    }

    // 分类
    if (method === 'GET' && path === '/api/categories') {
      return { code: 0, data: STORE.categories };
    }
    // 标签
    if (method === 'GET' && path === '/api/tags') {
      return { code: 0, data: STORE.tags };
    }

    // 精选文章
    if (method === 'GET' && path === '/api/articles/featured') {
      var fq = qs(url);
      var feat = STORE.articles.filter(function (a) { return a.featured; });
      if (fq.theme) feat = feat.filter(function (a) { return a.theme === fq.theme; });
      return { code: 0, data: feat };
    }

    // 文章列表 / 详情 / 增删改
    var am = path.match(/^\/api\/articles(?:\/(.+))?$/);
    if (am) {
      var arg = am[1];

      // 单篇
      if (arg) {
        // 数字 id
        var byId = STORE.articles.filter(function (a) { return String(a.id) === String(arg); });
        if (byId.length) {
          var art = byId[0];
          if (method === 'GET') {
            // 附带评论
            var cmts = DATA.comments.filter(function (c) { return String(c.articleId) === String(art.id); });
            return { code: 0, data: { article: art, comments: cmts } };
          }
          if (method === 'PUT') {
            var patch = typeof body === 'string' ? JSON.parse(body) : body;
            Object.keys(patch).forEach(function (k) { art[k] = patch[k]; });
            art.modified = fmtDate(new Date());
            saveStore();
            return { code: 0, data: art };
          }
          if (method === 'DELETE') {
            STORE.articles = STORE.articles.filter(function (a) { return String(a.id) !== String(arg); });
            saveStore();
            return { code: 0, data: { id: arg } };
          }
        }
        // slug
        var bySlug = STORE.articles.filter(function (a) { return a.slug === arg; });
        if (bySlug.length) {
          var art2 = bySlug[0];
          if (method === 'GET') {
            var cmts2 = DATA.comments.filter(function (c) { return String(c.articleId) === String(art2.id); });
            return { code: 0, data: { article: art2, comments: cmts2 } };
          }
        }
        return { code: 404, msg: '文章不存在' };
      }

      // 列表
      if (method === 'GET') {
        var q = qs(url);
        var page = parseInt(q.page) || 1;
        var size = parseInt(q.size) || 9;
        var cat = q.category, tag = q.tag, kw = (q.q || '').trim().toLowerCase();
        var sort = q.sort || 'date';

        var list = STORE.articles.slice();
        if (cat) list = list.filter(function (a) {
          return a.categories.some(function (c) { return c.slug === cat; });
        });
        if (tag) list = list.filter(function (a) {
          return a.tags.some(function (t) { return t.slug === tag; });
        });
        if (kw) list = list.filter(function (a) {
          return (a.title + ' ' + a.excerpt).toLowerCase().indexOf(kw) >= 0;
        });
        if (q.theme) list = list.filter(function (a) { return a.theme === q.theme; });
        if (sort === 'views') list.sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
        else if (sort === 'likes') list.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); });
        else list.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

        var total = list.length;
        var start = (page - 1) * size;
        var items = list.slice(start, start + size);
        return {
          code: 0,
          data: {
            items: items,
            page: page,
            size: size,
            total: total,
            pages: Math.ceil(total / size) || 1
          }
        };
      }

      // 新建
      if (method === 'POST') {
        var draft = typeof body === 'string' ? JSON.parse(body) : body;
        var newId = Random.integer(10000, 99999);
        var now = fmtDate(new Date());
        var slug = draft.slug || ('post-' + newId);
        var art3 = {
          id: newId,
          title: draft.title || '未命名文章',
          slug: slug,
          date: draft.date || now,
          author: draft.author || '许多语儿',
          excerpt: draft.excerpt || '',
          content: draft.content || '',
          thumbnail: draft.thumbnail || 'assets/theme/images/3x2.png',
          thumbs: { full: draft.thumbnail || 'assets/theme/images/3x2.png' },
          categories: draft.categories || [],
          tags: draft.tags || [],
          views: 0,
          likes: 0,
          commentCount: 0,
          readMinutes: Math.max(1, Math.round((draft.content || '').length / 400)),
          wordCount: (draft.content || '').replace(/<[^>]+>/g, '').length,
          gallery: draft.gallery || [],
          featured: !!draft.featured,
          status: 'publish'
        };
        STORE.articles.unshift(art3);
        saveStore();
        return { code: 0, data: art3 };
      }
    }

    // 媒体库
    if (method === 'GET' && path.indexOf('/api/media') === 0) {
      var mq = qs(url);
      var mpage = parseInt(mq.page) || 1;
      var msize = parseInt(mq.size) || 24;
      var mlist = DATA.media.slice();
      var mtotal = mlist.length;
      var mstart = (mpage - 1) * msize;
      return {
        code: 0,
        data: {
          items: mlist.slice(mstart, mstart + msize),
          page: mpage,
          size: msize,
          total: mtotal,
          pages: Math.ceil(mtotal / msize) || 1
        }
      };
    }

    // 评论
    if (method === 'GET' && path.indexOf('/api/comments') === 0) {
      var cq = qs(url);
      var aid = cq.articleId;
      var clist = aid
        ? DATA.comments.filter(function (c) { return String(c.articleId) === String(aid); })
        : DATA.comments;
      return { code: 0, data: clist };
    }

    // 重置
    if (method === 'POST' && path === '/api/reset') {
      resetStore();
      return { code: 0, data: { ok: true } };
    }

    return { code: 404, msg: '接口不存在: ' + method + ' ' + url };
  }

  // ---------- XHR 拦截 ----------
  function installInterceptor() {
    var OrigOpen = XMLHttpRequest.prototype.open;
    var OrigSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      // 只拦截 /api/ 开头的请求
      if (url && url.indexOf('/api/') === 0) {
        this.__mock = { method: method, url: url };
      }
      return OrigOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      if (this.__mock) {
        var self = this;
        var m = this.__mock;
        // 模拟异步
        setTimeout(function () {
          var res;
          try { res = handle(m.method, m.url, body); }
          catch (e) { res = { code: 500, msg: e.message }; }
          var text = JSON.stringify(res);
          Object.defineProperty(self, 'readyState', { value: 4, configurable: true });
          Object.defineProperty(self, 'status', { value: 200, configurable: true });
          Object.defineProperty(self, 'responseText', { value: text, configurable: true });
          Object.defineProperty(self, 'response', { value: text, configurable: true });
          if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
          if (typeof self.onload === 'function') self.onload();
          self.dispatchEvent && self.dispatchEvent(new Event('load'));
        }, 30 + Math.random() * 120);
        return;
      }
      return OrigSend.apply(this, arguments);
    };
  }

  // ---------- 暴露便捷方法 ----------
  var MockAPI = {
    request: function (method, url, body) {
      loadStore();
      return handle(method, url, body);
    },
    get: function (url) { return this.request('GET', url); },
    post: function (url, body) { return this.request('POST', url, body); },
    put: function (url, body) { return this.request('PUT', url, body); },
    del: function (url) { return this.request('DELETE', url); },
    reset: function () { resetStore(); },
    install: installInterceptor,
    // 暴露 Mock.js 风格的 Random
    Random: Random
  };

  global.MockAPI = MockAPI;
  // 仅在 XMLHttpRequest 可用时安装拦截器（浏览器环境）
  if (typeof XMLHttpRequest !== 'undefined') {
    installInterceptor();
  }

})(window);
