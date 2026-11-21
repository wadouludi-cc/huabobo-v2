/**
 * 统一用户主页模板 profile.html?id=xxx
 * 社区用户与合作手艺人共用，按 type 渲染不同区块
 */
(function () {
  var root = document.getElementById('profile-root');
  if (!root) return;

  var userId = ZJS.getQuery('id');
  var pendingShareWork = null;
  var profileUser = null;
  if (!userId) {
    root.innerHTML = '<p class="section-desc">缺少用户 ID 参数，请从展厅或手艺人列表进入。</p>';
    return;
  }

  Api.getUser(userId).then(function (user) {
    if (!user) {
      root.innerHTML = '<p class="section-desc">未找到该用户（ID: ' + ZJS.escapeHtml(userId) + '）</p>';
      return;
    }

    document.title = user.name + ' — 指间塑';

    if (user.type === 'artisan') {
      renderArtisanProfile(root, user);
    } else {
      profileUser = user;
      refreshMemberProfile(user, userId === 'me' || user.id === Api.getCurrentUserId());
    }
  });

  bindShareDialog();

  function refreshMemberProfile(user, isSelf) {
    return Api.getWorksByUserId(user.id, isSelf).then(function (works) {
      renderMemberProfile(root, user, works, isSelf);
    });
  }

  function renderMemberProfile(root, user, works, isSelf) {
    var published = works.filter(function (w) {
      return w.status === 'published';
    });
    var displayWorks = isSelf
      ? works.slice()
      : works.filter(function (w) {
          return w.status === 'published';
        });
    displayWorks.sort(function (a, b) {
      var ta = a.publishedAt || a.updatedAt || a.createdAt || '';
      var tb = b.publishedAt || b.updatedAt || b.createdAt || '';
      return tb.localeCompare(ta);
    });
    var worksHtml =
      displayWorks
        .map(function (w) {
          return workCard(w, isSelf, user.id);
        })
        .join('') ||
      '<p class="section-desc">' +
      (ZJS.t ? ZJS.t('profile.noWorks') : '暂无作品。') +
      '</p>';

    var canEditAvatar = isSelf && typeof Api.uploadUserAvatar === 'function';

    root.innerHTML =
      '<nav class="breadcrumb"><a href="index.html">首页</a><span>/</span>' +
      (isSelf
        ? '<a href="gallery.html">' +
          (ZJS.t ? ZJS.t('nav.gallery') : '数字化展厅') +
          '</a><span>/</span>' +
          (ZJS.getLang && ZJS.getLang() === 'en' ? 'My profile' : '我的主页')
        : '<a href="gallery.html">' +
          (ZJS.t ? ZJS.t('nav.gallery') : '数字化展厅') +
          '</a><span>/</span>' +
          ZJS.escapeHtml(user.handle)) +
      '</nav>' +
      '<div class="author-profile-header">' +
      (canEditAvatar
        ? '<div class="author-profile-avatar author-profile-avatar-editable" id="profile-avatar-wrap" role="button" tabindex="0" title="点击更换头像">' +
          '<img id="profile-avatar-img" src="' +
          user.avatar +
          '" alt="' +
          ZJS.escapeHtml(user.name) +
          '">' +
          '<span class="avatar-upload-hint">更换头像</span>' +
          '<input type="file" id="profile-avatar-input" accept="image/jpeg,image/png,image/webp,image/gif" hidden>' +
          '</div>'
        : '<div class="author-profile-avatar"><img src="' +
          user.avatar +
          '" alt="' +
          ZJS.escapeHtml(user.name) +
          '"></div>') +
      '<div class="author-profile-info">' +
      '<div class="author-profile-name-row">' +
      '<h1 id="profile-display-handle">' + ZJS.escapeHtml(user.handle) + '</h1>' +
      (isSelf && typeof Api.updateUserNickname === 'function'
        ? '<button type="button" id="profile-edit-name-btn" class="btn btn-outline btn-sm profile-edit-name-btn">修改昵称</button>'
        : '') +
      (isSelf && typeof Api.getMyAddress === 'function'
        ? '<button type="button" id="profile-address-btn" class="btn btn-outline btn-sm profile-address-btn">添加收货地址</button>'
        : '') +
      '</div>' +
      (isSelf && typeof Api.getMyAddress === 'function'
        ? '<div id="profile-address-summary" class="profile-address-summary">加载收货地址…</div>' +
          '<div id="profile-address-panel" class="profile-address-panel" hidden>' +
          '<p class="profile-address-panel__title">收货地址</p>' +
          '<label class="profile-address-field"><span>收货人姓名</span>' +
          '<input type="text" id="addr-name" maxlength="30" placeholder="请输入真实姓名" autocomplete="name"></label>' +
          '<label class="profile-address-field"><span>手机号</span>' +
          '<input type="tel" id="addr-phone" maxlength="11" inputmode="numeric" placeholder="11 位手机号" autocomplete="tel"></label>' +
          '<label class="profile-address-field"><span>详细地址</span>' +
          '<textarea id="addr-address" rows="3" maxlength="200" placeholder="省 / 市 / 区（县）+ 街道门牌号"></textarea></label>' +
          '<p class="profile-address-panel__hint">首次填写立即生效；之后再修改需要管理员审核，审核期间新订单仍使用原地址。进行中的订单不支持更换地址。</p>' +
          '<div class="profile-address-panel__actions">' +
          '<button type="button" id="addr-save" class="btn btn-primary btn-sm">保存</button>' +
          '<button type="button" id="addr-cancel" class="btn btn-outline btn-sm">取消</button>' +
          '<button type="button" id="addr-cancel-request" class="btn btn-outline btn-sm" hidden>撤销修改申请</button>' +
          '</div>' +
          '<p id="addr-msg" class="profile-address-panel__msg"></p>' +
          '</div>'
        : '') +
      '<p class="author-profile-name" id="profile-display-name">' +
      ZJS.escapeHtml(user.name) +
      (isSelf
        ? ZJS.t
          ? ZJS.t('profile.mySpace')
          : ' · 我的花饽饽 DIY 空间'
        : ZJS.t
          ? ZJS.t('profile.creator')
          : ' · DIY 创作者') +
      '</p>' +
      (isSelf && typeof Api.updateUserNickname === 'function'
        ? '<div id="profile-name-edit" class="profile-name-edit" hidden>' +
          '<label class="profile-name-edit__label" for="profile-name-input">新昵称</label>' +
          '<input type="text" id="profile-name-input" class="profile-name-input" maxlength="20" value="' +
          ZJS.escapeAttr(user.name) +
          '" placeholder="请输入昵称">' +
          '<div class="profile-name-edit__actions">' +
          '<button type="button" id="profile-name-save" class="btn btn-primary btn-sm">保存</button>' +
          '<button type="button" id="profile-name-cancel" class="btn btn-outline btn-sm">取消</button>' +
          '</div></div>'
        : '') +
      '<p class="author-profile-bio">' + ZJS.escapeHtml(user.bio) + '</p>' +
      '<p class="author-profile-stats">' +
      (ZJS.t ? ZJS.t('profile.join') : '加入于 ') +
      ZJS.escapeHtml(user.joinDate) +
      (ZJS.t ? ZJS.t('profile.published') : ' · 已发布 ') +
      published.length +
      (isSelf && works.length !== published.length
        ? ' · 未发布 ' + (works.length - published.length)
        : '') +
      (ZJS.t ? ZJS.t('profile.works') : ' 件') +
      '</p>' +
      '<a href="digital.html" class="btn btn-primary">' +
      (isSelf
        ? ZJS.t
          ? ZJS.t('profile.cta')
          : '去数字化体验创作'
        : ZJS.t
          ? ZJS.t('profile.ctaOther')
          : '我也要 DIY 创作') +
      '</a>' +
      '</div></div>' +
      (isSelf
        ? '<h2 class="section-title">正在定制的订单</h2>' +
          '<div class="custom-order-list" id="my-custom-orders"><p class="section-desc">加载中…</p></div>'
        : '') +
      '<h2 class="section-title">' +
      (isSelf
        ? ZJS.t
          ? ZJS.t('profile.myWorks')
          : '我的 DIY 作品集'
        : ZJS.t
          ? ZJS.t('profile.theirWorks')
          : 'TA 的 DIY 作品集') +
      '</h2>' +
      '<div class="author-works-grid" id="my-works-grid">' + worksHtml + '</div>' +
      '<p class="detail-back"><a href="gallery.html" class="btn btn-outline">' +
      (ZJS.t ? ZJS.t('profile.back') : '← 返回数字化展厅') +
      '</a></p>';

    if (isSelf) {
      bindWorkManageActions(root, user, works);
      bindWorkThumbErrors(root);
      if (canEditAvatar) bindAvatarUpload(root, user);
      if (typeof Api.updateUserNickname === 'function') bindNameEdit(root, user);
      if (typeof Api.getMyAddress === 'function') bindAddressEdit(root);
      startCustomOrderPolling();
    }
    document.title = user.name + ' — 指间塑';
  }

  function workThumbSrc(work) {
    var url = ZJS.normalizeWorkImageUrl ? ZJS.normalizeWorkImageUrl(work && work.image) : work && work.image;
    if (url) return url;
    return ZJS.workPlaceholderImage ? ZJS.workPlaceholderImage() : '';
  }

  var customOrderTimer = null;
  var customOrderVisibilityBound = false;

  function renderCustomOrders(list) {
    var wrap = document.getElementById('my-custom-orders');
    if (!wrap) return;
    if (!list || !list.length) {
      wrap.innerHTML =
        '<p class="section-desc">暂无定制订单。进入作品详情页选择合作手艺人，把作品推送给他们即可开始定制。</p>';
      return;
    }
    wrap.innerHTML = list
      .map(function (o) {
        var w = o.work || {};
        var thumb = workThumbSrc(w);
        return (
          '<article class="custom-order-card">' +
          (thumb
            ? '<img class="custom-order-thumb" src="' + ZJS.escapeAttr(thumb) + '" alt="" loading="lazy">'
            : '<div class="custom-order-thumb custom-order-thumb--empty" aria-hidden="true"></div>') +
          '<div class="custom-order-body">' +
          '<h3>' +
          ZJS.escapeHtml(w.title || '作品已删除') +
          '</h3>' +
          '<p class="custom-order-meta">手艺人：' +
          ZJS.escapeHtml(o.artisanName || '—') +
          '</p>' +
          '<p class="custom-order-meta">推送时间：' +
          ZJS.escapeHtml(o.createdAt || '') +
          '</p>' +
          (o.ship && o.ship.address
            ? '<p class="custom-order-meta custom-order-meta--ship">配送至：' +
              ZJS.escapeHtml(o.ship.name || '') +
              ' ' +
              ZJS.escapeHtml(o.ship.phone || '') +
              ' · ' +
              ZJS.escapeHtml(o.ship.address) +
              (o.status && o.status !== 'completed'
                ? '<span class="custom-order-ship-note">（进行中订单不支持更换地址）</span>'
                : '') +
              '</p>'
            : '') +
          '</div>' +
          '<span class="custom-order-status is-' +
          ZJS.escapeAttr(o.status || 'pending') +
          '">' +
          ZJS.escapeHtml(o.statusLabel || o.status || '') +
          '</span>' +
          '</article>'
        );
      })
      .join('');
  }

  function refreshCustomOrders() {
    if (typeof Api.getMyCustomOrders !== 'function') return Promise.resolve();
    return Api.getMyCustomOrders().then(function (list) {
      renderCustomOrders(list || []);
    });
  }

  function startCustomOrderPolling() {
    refreshCustomOrders();
    if (addressRefreshFn) addressRefreshFn();
    if (!customOrderVisibilityBound) {
      customOrderVisibilityBound = true;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'hidden') {
          refreshCustomOrders();
          if (addressRefreshFn) addressRefreshFn();
        }
      });
    }
    if (customOrderTimer) return;
    customOrderTimer = setInterval(function () {
      if (document.visibilityState !== 'hidden') {
        refreshCustomOrders();
        if (addressRefreshFn) addressRefreshFn();
      }
    }, 15000);
  }

  function bindWorkThumbErrors(scope) {
    var placeholder = ZJS.workPlaceholderImage ? ZJS.workPlaceholderImage() : '';
    (scope || root).querySelectorAll('.author-work-card img').forEach(function (img) {
      if (img.dataset.thumbBound) return;
      img.dataset.thumbBound = '1';
      img.addEventListener(
        'error',
        function () {
          if (img.dataset.fallbackApplied || !placeholder) return;
          img.dataset.fallbackApplied = '1';
          img.src = placeholder;
          img.classList.add('is-fallback-thumb');
        },
        { once: true }
      );
    });
  }

  function openShareDialog(work) {
    pendingShareWork = work;
    var dialog = document.getElementById('profile-share-dialog');
    var titleInput = document.getElementById('profile-share-title-input');
    var descInput = document.getElementById('profile-share-desc-input');
    if (!dialog) return;
    if (titleInput) titleInput.value = work.title || '';
    if (descInput) {
      descInput.value =
        work.desc && work.desc.indexOf('工作台保存') < 0
          ? work.desc
          : '在指间塑数字化体验工作台捏制的面塑作品。';
    }
    dialog.classList.add('is-open');
    dialog.setAttribute('aria-hidden', 'false');
  }

  function closeShareDialog() {
    var dialog = document.getElementById('profile-share-dialog');
    if (!dialog) return;
    dialog.classList.remove('is-open');
    dialog.setAttribute('aria-hidden', 'true');
    pendingShareWork = null;
  }

  function bindShareDialog() {
    var dialog = document.getElementById('profile-share-dialog');
    var cancelBtn = document.getElementById('profile-share-cancel');
    var confirmBtn = document.getElementById('profile-share-confirm');
    if (cancelBtn) cancelBtn.addEventListener('click', closeShareDialog);
    if (dialog) {
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) closeShareDialog();
      });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if (!pendingShareWork || typeof Api.saveStudioWork !== 'function') return;
        var titleInput = document.getElementById('profile-share-title-input');
        var descInput = document.getElementById('profile-share-desc-input');
        var title = (titleInput && titleInput.value.trim()) || pendingShareWork.title || 'DIY 面塑作品';
        var desc =
          (descInput && descInput.value.trim()) ||
          pendingShareWork.desc ||
          '来自数字化体验工作台的手作面塑。';
        var work = pendingShareWork;
        closeShareDialog();
        Api.saveStudioWork({
          id: work.id,
          title: title,
          image: work.image || '',
          imageKeep: work.image || '',
          tag: isARSnapshotWork(work) ? 'AR截图' : work.tag || 'DIY体验',
          workType: isARSnapshotWork(work) ? 'ar_snapshot' : 'model',
          desc: desc,
          publish: true
        }).then(function (res) {
          if (!res.ok) {
            alert(res.message || '分享失败');
            return;
          }
          if (profileUser) {
            refreshMemberProfile(profileUser, true);
          }
          alert('已分享到数字化展厅！');
        });
      });
    }
  }

  function syncProfileStats(user) {
    Api.getWorksByUserId(user.id, true).then(function (works) {
      var published = works.filter(function (w) {
        return w.status === 'published';
      });
      var statsEl = root.querySelector('.author-profile-stats');
      if (statsEl) {
        statsEl.innerHTML =
          (ZJS.t ? ZJS.t('profile.join') : '加入于 ') +
          ZJS.escapeHtml(user.joinDate) +
          (ZJS.t ? ZJS.t('profile.published') : ' · 已发布 ') +
          published.length +
          (works.length !== published.length
            ? ' · 未发布 ' + (works.length - published.length)
            : '') +
          (ZJS.t ? ZJS.t('profile.works') : ' 件');
      }
    });
  }

  function bindWorkManageActions(root, user, works) {
    var worksById = {};
    (works || []).forEach(function (w) {
      worksById[w.id] = w;
    });

    root.querySelectorAll('[data-share-work]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-share-work');
        var work = worksById[id];
        if (!work) return;
        openShareDialog(work);
      });
    });

    root.querySelectorAll('[data-delete-work]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-delete-work');
        var title = btn.getAttribute('data-work-title') || '该作品';
        var delMsg = ZJS.t
          ? ZJS.t('profile.deleteConfirm', { title: title })
          : '确定删除「' + title + '」？删除后无法恢复。';
        if (!confirm(delMsg)) return;
        Api.deleteWork(id).then(function (res) {
          if (!res.ok) {
            alert(res.message || '删除失败');
            return;
          }
          removeWorkCard(btn);
          syncProfileStats(user);
        });
      });
    });

    root.querySelectorAll('[data-edit-work]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-edit-work');
        window.location.href = ZJS.studioEditUrl(id);
      });
    });
  }

  function bindNameEdit(root, user) {
    var editBtn = root.querySelector('#profile-edit-name-btn');
    var editPanel = root.querySelector('#profile-name-edit');
    var nameInput = root.querySelector('#profile-name-input');
    var saveBtn = root.querySelector('#profile-name-save');
    var cancelBtn = root.querySelector('#profile-name-cancel');
    var handleEl = root.querySelector('#profile-display-handle');
    var nameEl = root.querySelector('#profile-display-name');
    if (!editBtn || !editPanel || !nameInput || !saveBtn || !cancelBtn) return;

    function showEdit() {
      nameInput.value = user.name || '';
      editPanel.hidden = false;
      editBtn.hidden = true;
      nameInput.focus();
      nameInput.select();
    }

    function hideEdit() {
      editPanel.hidden = true;
      editBtn.hidden = false;
    }

    function applyNameToPage(nextName) {
      var handle = '@' + nextName;
      user.name = nextName;
      user.handle = handle;
      profileUser = user;
      if (handleEl) handleEl.textContent = handle;
      if (nameEl) {
        nameEl.textContent =
          nextName +
          (ZJS.t ? ZJS.t('profile.mySpace') : ' · 我的花饽饽 DIY 空间');
      }
      document.title = nextName + ' — 指间塑';
    }

    editBtn.addEventListener('click', showEdit);
    cancelBtn.addEventListener('click', hideEdit);
    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') saveBtn.click();
      if (e.key === 'Escape') hideEdit();
    });

    saveBtn.addEventListener('click', function () {
      var next = nameInput.value.trim();
      if (!next) {
        alert('昵称不能为空');
        return;
      }
      if (next.length > 20) {
        alert('昵称最多 20 字');
        return;
      }
      if (next === user.name) {
        hideEdit();
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = '保存中…';
      Api.updateUserNickname(user.id, next).then(function (res) {
        saveBtn.disabled = false;
        saveBtn.textContent = '保存';
        if (!res.ok) {
          alert(res.message || '修改失败');
          return;
        }
        applyNameToPage((res.user && res.user.name) || next);
        hideEdit();
      });
    });
  }

  var addressRefreshFn = null;

  /** 收货地址：首次填写直接生效，之后修改需管理员审核 */
  function bindAddressEdit(root) {
    var btn = root.querySelector('#profile-address-btn');
    var panel = root.querySelector('#profile-address-panel');
    var summary = root.querySelector('#profile-address-summary');
    var nameInput = root.querySelector('#addr-name');
    var phoneInput = root.querySelector('#addr-phone');
    var addrInput = root.querySelector('#addr-address');
    var saveBtn = root.querySelector('#addr-save');
    var cancelBtn = root.querySelector('#addr-cancel');
    var cancelReqBtn = root.querySelector('#addr-cancel-request');
    var msgEl = root.querySelector('#addr-msg');
    if (!btn || !panel || !summary || !nameInput || !phoneInput || !addrInput || !saveBtn) return;

    var state = { address: null, pending: null };

    function setMsg(text) {
      if (msgEl) msgEl.textContent = text || '';
    }

    function renderSummary() {
      var a = state.address;
      var p = state.pending;
      if (!a) {
        summary.innerHTML =
          '<span class="profile-address-summary__empty">尚未填写收货地址，推送定制订单前请先添加。</span>';
        btn.textContent = '添加收货地址';
      } else {
        summary.innerHTML =
          '<span class="profile-address-summary__label">默认收货地址</span>' +
          '<span class="profile-address-summary__value">' +
          ZJS.escapeHtml(a.name) +
          ' ' +
          ZJS.escapeHtml(a.phone) +
          ' · ' +
          ZJS.escapeHtml(a.address) +
          '</span>' +
          (p
            ? '<span class="profile-address-badge">新地址审核中</span>'
            : '');
        btn.textContent = p ? '地址修改审核中' : '修改收货地址';
      }
      summary.hidden = false;
    }

    function openPanel() {
      var src = state.pending
        ? { name: state.pending.newName, phone: state.pending.newPhone, address: state.pending.newAddress }
        : state.address;
      nameInput.value = (src && src.name) || '';
      phoneInput.value = (src && src.phone) || '';
      addrInput.value = (src && src.address) || '';
      saveBtn.disabled = !!state.pending;
      saveBtn.textContent = '保存';
      if (cancelReqBtn) cancelReqBtn.hidden = !state.pending;
      setMsg(
        state.pending
          ? '地址修改申请正在等待管理员审核，通过后新订单将使用新地址。'
          : ''
      );
      panel.hidden = false;
      btn.hidden = true;
      nameInput.focus();
      nameInput.select();
    }

    function closePanel() {
      panel.hidden = true;
      btn.hidden = false;
      setMsg('');
    }

    function applyState(data) {
      if (data && data.address !== undefined) state.address = data.address || null;
      if (data && data.pending !== undefined) state.pending = data.pending || null;
      renderSummary();
    }

    addressRefreshFn = function () {
      return Api.getMyAddress().then(function (d) {
        /* 不覆盖正在编辑的表单，仅同步地址状态 */
        applyState(d || {});
      });
    };

    btn.addEventListener('click', openPanel);
    if (cancelBtn) cancelBtn.addEventListener('click', closePanel);

    saveBtn.addEventListener('click', function () {
      var payload = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim().replace(/[\s-]/g, ''),
        address: addrInput.value.trim()
      };
      if (!payload.name) return setMsg('请填写收货人姓名');
      if (!/^1[3-9]\d{9}$/.test(payload.phone)) return setMsg('请输入正确的 11 位手机号');
      if (payload.address.length < 5) return setMsg('请填写详细收货地址（不少于 5 个字）');

      saveBtn.disabled = true;
      saveBtn.textContent = '保存中…';
      Api.saveMyAddress(payload).then(function (res) {
        saveBtn.textContent = '保存';
        if (!res || !res.ok) {
          saveBtn.disabled = !!state.pending;
          setMsg((res && res.message) || '保存失败');
          return;
        }
        var d = res.data || {};
        applyState({ address: d.address, pending: d.pending });
        if (d.mode === 'pending') {
          saveBtn.disabled = true;
          if (cancelReqBtn) cancelReqBtn.hidden = false;
          setMsg(d.message || '修改申请已提交，等待管理员审核');
        } else {
          setMsg('');
          closePanel();
        }
      });
    });

    if (cancelReqBtn) {
      cancelReqBtn.addEventListener('click', function () {
        cancelReqBtn.disabled = true;
        Api.cancelAddressRequest().then(function (res) {
          cancelReqBtn.disabled = false;
          if (!res || !res.ok) return setMsg((res && res.message) || '撤销失败');
          state.pending = null;
          renderSummary();
          saveBtn.disabled = false;
          cancelReqBtn.hidden = true;
          setMsg('已撤销修改申请，当前仍使用原地址。');
        });
      });
    }

    Api.getMyAddress().then(function (d) {
      applyState(d || { address: null, pending: null });
    });
  }

  function bindAvatarUpload(root, user) {
    var wrap = root.querySelector('#profile-avatar-wrap');
    var input = root.querySelector('#profile-avatar-input');
    var img = root.querySelector('#profile-avatar-img');
    var hint = root.querySelector('.avatar-upload-hint');
    if (!wrap || !input || !img || typeof Api.uploadUserAvatar !== 'function') return;

    function openPicker() {
      input.click();
    }

    wrap.addEventListener('click', openPicker);
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPicker();
      }
    });

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      if (!file.type || file.type.indexOf('image/') !== 0) {
        alert('请选择图片文件');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        alert('图片不能超过 8MB');
        return;
      }
      wrap.classList.add('is-uploading');
      if (hint) hint.textContent = '上传中…';
      Api.uploadUserAvatar(user.id, file).then(function (res) {
        wrap.classList.remove('is-uploading');
        if (hint) hint.textContent = '更换头像';
        if (!res.ok) {
          alert(res.message || '上传失败');
          return;
        }
        if (res.user && res.user.avatar) {
          var url = res.user.avatar;
          url += (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
          img.src = url;
          user.avatar = res.user.avatar;
        }
      });
    });
  }

  function renderArtisanProfile(root, user) {
    var tags = (user.tags || []).map(function (t) { return '<span>' + ZJS.escapeHtml(t) + '</span>'; }).join('');
    var portfolio = (user.portfolio || []).map(function (p) {
      return '<figure class="work-item"><img src="' + p.image + '" alt="' + ZJS.escapeHtml(p.title) + '" loading="lazy">' +
        '<figcaption><h3>' + ZJS.escapeHtml(p.title) + '</h3><p>' + ZJS.escapeHtml(p.desc) + '</p></figcaption></figure>';
    }).join('');
    var shop = user.shop || {};

    root.innerHTML =
      '<nav class="breadcrumb"><a href="index.html">首页</a><span>/</span><a href="artisans.html">合作手艺人</a><span>/</span>' + ZJS.escapeHtml(user.name) + '</nav>' +
      '<div class="artisan-detail-hero">' +
      '<div class="artisan-detail-avatar"><img src="' + user.avatar + '" alt="' + ZJS.escapeHtml(user.name) + '"></div>' +
      '<div><h1>' + ZJS.escapeHtml(user.name) + '</h1>' +
      '<p class="artisan-detail-title">' + ZJS.escapeHtml(user.title || '') + '</p>' +
      '<p class="artisan-detail-intro">' + ZJS.escapeHtml(user.bio) + '</p>' +
      '<div class="artisan-detail-tags">' + tags + '</div></div></div>' +
      '<div class="detail-block"><h2>代表作品</h2><div class="works-grid">' + portfolio + '</div></div>' +
      '<div class="detail-block"><h2>店铺信息</h2><div class="shop-info"><dl>' +
      '<dt>店铺名称</dt><dd>' + ZJS.escapeHtml(shop.name) + '</dd>' +
      '<dt>地址</dt><dd>' + ZJS.escapeHtml(shop.address) + '</dd>' +
      '<dt>营业时间</dt><dd>' + ZJS.escapeHtml(shop.hours) + '</dd>' +
      '<dt>主营</dt><dd>' + ZJS.escapeHtml(shop.main) + '</dd>' +
      '<dt>备注</dt><dd>' + ZJS.escapeHtml(shop.note) + '</dd></dl></div></div>' +
      (user.wechat ? '<div class="detail-block"><h2>微信联系</h2><div class="contact-wechat"><div><h3>添加' + ZJS.escapeHtml(user.name) + '微信</h3>' +
      '<p>' + ZJS.escapeHtml(user.wechat.tip) + '</p><div class="wechat-id">微信号：' + ZJS.escapeHtml(user.wechat.id) + '</div></div>' +
      '<div class="wechat-qr"><img src="' + user.wechat.qr + '" alt="微信二维码"></div></div></div>' : '') +
      '<p class="detail-back"><a href="artisans.html" class="btn btn-outline">← 返回手艺人列表</a></p>';
  }

  function removeWorkCard(btn) {
    var card = btn.closest('.author-work-card-wrap');
    if (!card) return;
    card.remove();
    var grid = document.getElementById('my-works-grid');
    if (grid && !grid.querySelector('.author-work-card-wrap')) {
      grid.innerHTML =
        '<p class="section-desc">' +
        (ZJS.t ? ZJS.t('profile.noWorks') : '暂无作品。') +
        '</p>';
    }
  }

  function isARSnapshotWork(w) {
    return w && (w.workType === 'ar_snapshot' || w.tag === 'AR截图');
  }

  function workStatusBadge(w, isSelf) {
    if (!isSelf) return '';
    var published = w.status === 'published';
    return (
      '<span class="author-work-status author-work-status--' +
      (published ? 'published' : 'draft') +
      '">' +
      (published ? '已发布' : '未发布') +
      '</span>'
    );
  }

  function workCard(w, isSelf, userId) {
    var thumb = workThumbSrc(w);
    var isAr = isARSnapshotWork(w);
    var shareLabel = w.status === 'published' ? '更新展厅' : '分享到展厅';
    var manage = '';
    if (isSelf) {
      var actionBtns =
        (isAr
          ? ''
          : '<button type="button" class="btn btn-outline btn-sm" data-edit-work="' +
            ZJS.escapeHtml(w.id) +
            '">编辑</button>') +
        '<button type="button" class="btn btn-outline btn-sm" data-share-work="' +
        ZJS.escapeHtml(w.id) +
        '">' +
        shareLabel +
        '</button>' +
        '<button type="button" class="btn btn-outline btn-sm btn-danger-outline" data-delete-work="' +
        ZJS.escapeHtml(w.id) +
        '" data-work-title="' +
        ZJS.escapeAttr(w.title) +
        '">删除</button>';
      manage = '<div class="author-work-card-actions">' + actionBtns + '</div>';
    }
    var wrapClass =
      'author-work-card-wrap' +
      (isSelf && w.status !== 'published' ? ' author-work-card-wrap--draft' : '') +
      (isAr ? ' author-work-card-wrap--ar' : '');
    return (
      '<div class="' +
      wrapClass +
      '">' +
      '<a href="' +
      ZJS.workUrl(w.id) +
      '" class="author-work-card' +
      (isAr ? ' author-work-card--ar' : '') +
      '">' +
      workStatusBadge(w, isSelf) +
      (isAr ? '<span class="author-work-ar-label">AR 截图</span>' : '') +
      '<img' +
      (isAr ? ' class="author-work-card-img--ar"' : '') +
      ' src="' +
      thumb +
      '" data-work-id="' +
      ZJS.escapeHtml(w.id) +
      '" alt="' +
      ZJS.escapeHtml(w.title) +
      '" loading="lazy">' +
      '<div class="author-work-card-body"><span class="gallery-item-tag">' +
      ZJS.escapeHtml(isAr ? 'AR截图' : w.tag) +
      '</span>' +
      '<h3>' +
      ZJS.escapeHtml(w.title) +
      '</h3></div></a>' +
      manage +
      '</div>'
    );
  }
})();
