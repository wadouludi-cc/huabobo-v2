/**
 * VR互动 介绍页 — 截图自动加载
 * 将图片按 vr-shot-1.jpg ~ vr-shot-6.jpg（或 .png/.webp）放入 images/，
 * 页面自动替换占位；无需改代码。
 */
(function () {
  'use strict';
  var base = (window.ZJS && ZJS.getSiteBase && ZJS.getSiteBase()) || '';

  function tryLoad(fig, basename) {
    var exts = ['jpg', 'jpeg', 'png', 'webp'];
    var idx = 0;
    function next() {
      if (idx >= exts.length) return;
      var src = base + 'images/' + basename + '.' + exts[idx++];
      var img = new Image();
      img.onload = function () {
        fig.innerHTML = '';
        img.alt = basename;
        img.loading = 'lazy';
        fig.appendChild(img);
      };
      img.onerror = next;
      img.src = src;
    }
    next();
  }

  var shots = document.querySelectorAll('.vr-shot[data-shot]');
  shots.forEach(function (fig) {
    var name = (fig.getAttribute('data-shot') || '').replace(/\.(jpg|jpeg|png|webp)$/i, '');
    if (name) tryLoad(fig, name);
  });
})();
