/**
 * 开场剧情：奶奶说明 → 书记创意 → 开始游戏
 *
 * 三段画面：images/story-1.jpg ~ story-3.jpg（按钮已画在画面里，整幅画面可点）
 * 配音：audio/story-1.mp3（奶奶）、audio/story-2.mp3（书记）。
 * 文件还没放时静默跳过，不影响「下一段 / 开始游戏」；放好后自动生效，无需改代码。
 */
(function () {
  'use strict';

  var STEPS = [
    {
      img: 'images/story-1.jpg',
      audio: 'audio/story-1.mp3',
      alt: '花饽饽店的新故事：奶奶向书记说明最近进店的人越来越少了'
    },
    {
      img: 'images/story-2.jpg',
      audio: 'audio/story-2.mp3',
      alt: '书记提出做一款 VR 游戏，让大家亲手学做花饽饽'
    },
    {
      img: 'images/story-3.jpg',
      audio: '',
      alt: '花饽饽的故事：戴上头显走进奶奶的手艺人生'
    }
  ];

  var root = document.getElementById('start-overlay');
  if (!root) return;

  var img = document.getElementById('story-img');
  var nextBtn = document.getElementById('btn-story-next');
  var startBtn = document.getElementById('btn-start');
  var skipBtn = document.getElementById('btn-story-skip');
  var pill = document.getElementById('story-audio-pill');
  var audio = document.getElementById('story-audio');
  var dots = root.querySelectorAll('#story-dots i');
  var base = (window.ZJS && window.ZJS.getSiteBase && window.ZJS.getSiteBase()) || '';

  var idx = 0;
  var lockUntil = 0;
  var audioFailed = false;

  function asset(p) {
    return p ? base + p : '';
  }

  function hidePill() {
    if (pill) pill.classList.add('hidden');
  }

  function stopAudio() {
    hidePill();
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  }

  function playStepAudio() {
    hidePill();
    if (!audio) return;
    var src = STEPS[idx] && STEPS[idx].audio;
    if (!src) {
      stopAudio();
      return;
    }
    audioFailed = false;
    audio.src = asset(src);
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        /* 文件缺失 / 加载失败不提示；只有「有文件但被浏览器拦了自动播放」才给按钮 */
        if (audio.error || audio.networkState === 3 || audioFailed) return;
        if (pill) pill.classList.remove('hidden');
      });
    }
  }

  function render() {
    var s = STEPS[idx];
    if (img) {
      img.src = asset(s.img);
      img.alt = s.alt;
    }
    var last = idx === STEPS.length - 1;
    if (nextBtn) nextBtn.classList.toggle('hidden', last);
    if (startBtn) startBtn.classList.toggle('hidden', !last);
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-on', i === idx);
    }
    playStepAudio();
  }

  function next() {
    if (Date.now() < lockUntil) return;
    if (idx >= STEPS.length - 1) return;
    idx += 1;
    lockUntil = Date.now() + 450; // 防手快一次点两下跳两段
    render();
  }

  function startGame() {
    stopAudio();
    if (startBtn) startBtn.click(); // 走 vr-game.js 里原有的启动逻辑
  }

  if (audio) {
    audio.addEventListener('error', function () {
      audioFailed = true;
      hidePill();
    });
  }

  if (nextBtn) nextBtn.addEventListener('click', next);
  if (startBtn) startBtn.addEventListener('click', stopAudio);

  if (pill) {
    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      hidePill();
      if (audio) {
        var p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      startGame();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (root.classList.contains('hidden')) return;
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    if (idx < STEPS.length - 1) next();
    else startGame();
  });

  /* 提前把后两段图读进缓存，切段不闪白 */
  for (var k = 1; k < STEPS.length; k++) {
    var pre = new Image();
    pre.src = asset(STEPS[k].img);
  }

  render();
})();
