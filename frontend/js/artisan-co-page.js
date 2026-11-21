/**
 * 合作艺人详情 — GET /api/artisans/:id
 */
(function () {
  var root = document.getElementById('artisan-detail');
  if (!root) return;

  var id = new URLSearchParams(window.location.search).get('id');
  var workId = new URLSearchParams(window.location.search).get('workId') || '';
  var base = window.ZJS && ZJS.API_BASE ? ZJS.API_BASE.replace(/\/$/, '') : '';

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resolveImg(url, fallback) {
    var n = window.ZJS && ZJS.normalizeWorkImageUrl ? ZJS.normalizeWorkImageUrl(url) : url;
    return n || fallback || 'images/artisan-1.jpg';
  }

  function renderDetail(a) {
    document.title = a.name + ' — 合作手艺人';
    var tags = (a.tags || [])
      .map(function (t) {
        return '<span>' + esc(t) + '</span>';
      })
      .join('');
    var portfolio = (a.portfolio || [])
      .map(function (p) {
        return (
          '<figure class="work-item">' +
          '<img src="' +
          esc(resolveImg(p.image, 'images/my-work-1.jpg')) +
          '" alt="' +
          esc(p.title) +
          '" loading="lazy">' +
          '<figcaption><h3>' +
          esc(p.title) +
          '</h3><p>' +
          esc(p.desc) +
          '</p></figcaption></figure>'
        );
      })
      .join('');
    var c = a.contact || {};
    var hasContact = c.shopName || c.address || c.hours || c.main || c.phone || c.note;
    var contactHtml = hasContact
      ? '<div class="detail-block"><h2>联系方式</h2><div class="shop-info"><dl>' +
        (c.shopName ? '<dt>店铺名称</dt><dd>' + esc(c.shopName) + '</dd>' : '') +
        (c.address ? '<dt>地址</dt><dd>' + esc(c.address) + '</dd>' : '') +
        (c.hours ? '<dt>营业时间</dt><dd>' + esc(c.hours) + '</dd>' : '') +
        (c.main ? '<dt>主营</dt><dd>' + esc(c.main) + '</dd>' : '') +
        (c.phone ? '<dt>联系电话</dt><dd>' + esc(c.phone) + '</dd>' : '') +
        (c.note ? '<dt>备注</dt><dd>' + esc(c.note) + '</dd>' : '') +
        '</dl></div></div>'
      : '';

    var wechatHtml = '';
    if (a.wechat && (a.wechat.id || a.wechat.qr)) {
      wechatHtml =
        '<div class="detail-block"><h2>微信联系</h2><div class="contact-wechat">' +
        '<div><h3>添加' +
        esc(a.name) +
        '微信</h3>' +
        (a.wechat.tip ? '<p class="tip">' + esc(a.wechat.tip) + '</p>' : '') +
        (a.wechat.id
          ? '<div class="wechat-id">微信号：' + esc(a.wechat.id) + '</div>'
          : '') +
        '</div>' +
        (a.wechat.qr
          ? '<div class="wechat-qr"><img src="' +
            esc(resolveImg(a.wechat.qr)) +
            '" alt="微信二维码"></div>'
          : '') +
        '</div></div>';
    }

    var orderHtml = '';
    if (workId) {
      orderHtml =
        '<div class="detail-block artisan-order-block">' +
        '<h2>定制下单</h2>' +
        '<p class="tip">把你的 DIY 作品推送给 ' +
        esc(a.name) +
        '，对方会收到定制订单并开始接单。</p>' +
        '<p id="order-ship-info" class="tip artisan-order-ship"></p>' +
        '<button type="button" id="btn-push-order" class="btn btn-primary">订单推送给该手艺人</button>' +
        '<p id="order-push-msg" class="tip"></p>' +
        '</div>';
    }

    root.innerHTML =
      '<nav class="breadcrumb"><a href="index.html">首页</a><span>/</span><a href="artisans.html">合作手艺人</a><span>/</span>' +
      esc(a.name) +
      '</nav>' +
      '<div class="artisan-detail-hero">' +
      '<div class="artisan-detail-avatar"><img src="' +
      esc(resolveImg(a.image, 'images/artisan-1.jpg')) +
      '" alt="' +
      esc(a.name) +
      '"></div>' +
      '<div><h1>' +
      esc(a.name) +
      '</h1>' +
      '<p class="artisan-detail-title">' +
      esc(a.title || '') +
      '</p>' +
      '<p class="artisan-detail-intro">' +
      esc(a.bio || '') +
      '</p>' +
      (tags ? '<div class="artisan-detail-tags">' + tags + '</div>' : '') +
      '</div></div>' +
      (portfolio
        ? '<div class="detail-block"><h2>代表作品</h2><div class="works-grid">' +
          portfolio +
          '</div></div>'
        : '') +
      contactHtml +
      wechatHtml +
      orderHtml +
      '<p class="detail-back"><a href="artisans.html" class="btn btn-outline">← 返回手艺人列表</a></p>';

    bindOrderPush(a);
  }

  function getToken() {
    try {
      return sessionStorage.getItem('zhijiansu_user_token') || '';
    } catch (e) {
      return '';
    }
  }

  function maskPhone(p) {
    var s = String(p || '');
    return s.length === 11 ? s.slice(0, 3) + '****' + s.slice(7) : s;
  }

  function bindOrderPush(a) {
    var btn = document.getElementById('btn-push-order');
    if (!btn || !workId) return;
    var msgEl = document.getElementById('order-push-msg');
    var shipEl = document.getElementById('order-ship-info');

    function renderShip(addr, pending) {
      if (!shipEl) return;
      if (!addr) {
        shipEl.innerHTML =
          '尚未填写收货地址，推送前请先到 <a href="profile.html?id=me">我的主页</a> 添加，订单会自动使用该地址。';
        return;
      }
      shipEl.innerHTML =
        '本单配送地址：' +
        esc(addr.name) +
        ' ' +
        esc(maskPhone(addr.phone)) +
        ' · ' +
        esc(addr.address) +
        (pending ? '（新地址审核中，本单仍使用该地址）' : '') +
        ' <a href="profile.html?id=me">修改</a>';
    }

    var token = getToken();
    if (token) {
      fetch(base + '/api/addresses/mine', { headers: { Authorization: 'Bearer ' + token } })
        .then(function (r) {
          return r.json();
        })
        .then(function (res) {
          var d = (res && res.data) || {};
          renderShip(d.address || null, d.pending || null);
        })
        .catch(function () {});
    } else if (shipEl) {
      shipEl.textContent = '登录后订单会自动使用我在「我的主页」设置的收货地址。';
    }

    btn.addEventListener('click', function () {
      var token = getToken();
      if (!token) {
        if (confirm('请先登录后再推送订单。\n\n点击「确定」前往登录页。')) {
          var returnUrl = encodeURIComponent(location.pathname.split('/').pop() + location.search);
          location.href = 'login.html?return=' + returnUrl;
        }
        return;
      }
      btn.disabled = true;
      var oldText = btn.textContent;
      btn.textContent = '推送中…';
      if (msgEl) msgEl.textContent = '';

      fetch(base + '/api/addresses/mine', { headers: { Authorization: 'Bearer ' + token } })
        .then(function (r) {
          return r.json();
        })
        .then(function (res) {
          var d = (res && res.data) || {};
          renderShip(d.address || null, d.pending || null);
          if (!d.address) {
            var e = new Error('请先到「我的主页」添加收货地址，订单会自动使用该地址');
            e.code = 'ADDRESS_REQUIRED';
            throw e;
          }
          return fetch(base + '/api/custom-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ workId: workId, artisanId: a.id })
          }).then(function (r) {
            return r.json().then(function (d2) {
              return { ok: r.ok, data: d2 };
            });
          });
        })
        .then(function (res) {
          if (!res.ok || !res.data || !res.data.ok) {
            throw new Error((res.data && res.data.message) || '推送失败，请稍后重试');
          }
          btn.textContent = '已推送，正在跳转到我的主页…';
          window.location.href = 'profile.html?id=me';
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = oldText;
          if (err.code === 'ADDRESS_REQUIRED') {
            if (msgEl) {
              msgEl.innerHTML = '请先到 <a href="profile.html?id=me">我的主页</a> 添加收货地址后再推送订单。';
            } else {
              alert(err.message);
            }
            return;
          }
          if (msgEl) msgEl.textContent = err.message || '推送失败，请稍后重试';
          else alert(err.message || '推送失败，请稍后重试');
        });
    });
  }

  if (!id || !base) {
    root.innerHTML = '<p class="section-desc">参数错误或后台未配置</p>';
    return;
  }

  fetch(base + '/api/artisans/' + encodeURIComponent(id))
    .then(function (r) {
      return r.json();
    })
    .then(function (res) {
      if (!res.ok || !res.data) {
        root.innerHTML = '<p class="section-desc">未找到该手艺人</p>';
        return;
      }
      renderDetail(res.data);
    })
    .catch(function () {
      root.innerHTML = '<p class="section-desc">加载失败，请稍后重试</p>';
    });
})();
