/**
 * 指间塑 — VR互动 · 面塑凤凰（第一人称 3D 面塑游戏）
 *
 * 玩法：用太极八法「掤、捋、挤、按、采、挒、肘、靠」逐步完成面塑凤凰。
 * 渲染：程序化几何体保证开箱可玩；若 models/vr/ 下存在对应 GLB，则自动替换。
 * 模型命名见 models/vr/README.md。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

(function () {
  'use strict';

  // ——— 基础工具 ———
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('vr-canvas');
  if (!canvas) return;

  function siteBase() {
    try { return (window.ZJS && ZJS.getSiteBase && ZJS.getSiteBase()) || ''; }
    catch (e) { return ''; }
  }

  // ——— 太极八法步骤定义 ———
  var STEPS = [
    { zi: '掤', title: '掤 · 托起面团', desc: '按住向上拖动，把面团掤到掌心', dir: 'up', need: 240,
      coach: '来，先掤起这团面。手心向上，稳稳托住——按住鼠标往上拖。' },
    { zi: '捋', title: '捋 · 揉圆面团', desc: '按住左右来回拖动，把面揉圆润', dir: 'side', need: 320,
      coach: '顺着劲儿捋，来回揉。面要揉得光、揉得圆，才有凤凰的底子。' },
    { zi: '挤', title: '挤 · 塑出凤身', desc: '按住向下拖动，挤出凤凰身形', dir: 'down', need: 300,
      coach: '两手一挤，身子就出来了。往下按着拖，捏出凤凰的身段。' },
    { zi: '按', title: '按 · 贴上金饰', desc: '按住画圈拖动，把金黄面片按上凤身', dir: 'circle', need: 360,
      coach: '这金黄的面片是凤凰的羽衣。轻轻按上去，画个圈让它贴牢。' },
    { zi: '采', title: '采 · 黑豆点睛', desc: '按住向上拖动，采来黑豆点上眼睛', dir: 'up', need: 260,
      coach: '画龙点睛就在这两颗黑豆。采起来，稳稳按到头上去。' },
    { zi: '挒', title: '挒 · 挒出花尾', desc: '按住左右拖动，挒出带花的凤尾', dir: 'side', need: 340,
      coach: '挒开面片，做出尾巴的花。三根尾巴，根根都要带花。' },
    { zi: '肘', title: '肘 · 合拢三尾', desc: '按住向下拖动，把三根尾巴合到身后', dir: 'down', need: 300,
      coach: '用肘一送，三根尾巴就服帖了。往后拢一拢，别歪。' },
    { zi: '靠', title: '靠 · 组装成凤', desc: '按住画圈拖动，整体靠拢成型', dir: 'circle', need: 380,
      coach: '最后靠一靠，全身的气息就顺了。好——一只凤凰成了！' }
  ];

  // ——— 渲染器 / 场景 / 相机 ———
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a211a); // 全景图没加载出来时的兜底色

  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.rotation.order = 'YXZ';
  var camBase = new THREE.Vector3(0, 1.62, 2.5);
  camera.position.copy(camBase);
  scene.add(camera); // 双手挂在相机上，相机要在场景里才会被渲染

  // 第一人称视角：yaw 左右转、pitch 抬头低头
  var view = { yaw: 0, pitch: -0.208 };
  var swayX = 0, swayY = 0;
  function applyCamera() {
    camera.position.set(camBase.x + swayX, camBase.y + swayY, camBase.z);
    camera.rotation.y = view.yaw;
    camera.rotation.x = view.pitch;
  }
  applyCamera();

  // ——— 360° 全景背景（等距柱状投影，鼠标拖动环视） ———
  function loadPano() {
    new THREE.TextureLoader().load(
      siteBase() + 'images/vr-pano.jpg',
      function (tex) {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        scene.background = tex;
      },
      undefined,
      function () {
        /* 全景图缺失时保留兜底色，不影响玩法 */
      }
    );
  }

  // ——— 灯光：明亮、柔和的黏土质感 ———
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfcbd6, 1.15));
  var key = new THREE.DirectionalLight(0xfff3e2, 2.0);
  key.position.set(3.5, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xd9e9ff, 0.65);
  fill.position.set(-4, 3, 2);
  scene.add(fill);

  // ——— 材质工厂 ———
  var MAT = {
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5d33, roughness: 0.75 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x6a4526, roughness: 0.82 }),
    dough: new THREE.MeshStandardMaterial({ color: 0xf6f1e8, roughness: 0.82, metalness: 0 }),
    phoenix: new THREE.MeshStandardMaterial({ color: 0x6e2b34, roughness: 0.7 }),
    phoenixDark: new THREE.MeshStandardMaterial({ color: 0x542029, roughness: 0.75 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf6c445, roughness: 0.65 }),
    yellowSoft: new THREE.MeshStandardMaterial({ color: 0xffd966, roughness: 0.7 }),
    bean: new THREE.MeshStandardMaterial({ color: 0x14100f, roughness: 0.25, metalness: 0.1 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xe9b89a, roughness: 0.85 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0xf2ede1, roughness: 0.95 }),
    apron: new THREE.MeshStandardMaterial({ color: 0xb9a98d, roughness: 0.95 }),
    hair: new THREE.MeshStandardMaterial({ color: 0xc9cac6, roughness: 0.95 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x5c5c5c, roughness: 0.95 }),
    shoe: new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.9 })
  };

  function mesh(geo, mat, cast, receive) {
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = !!cast; m.receiveShadow = !!receive;
    return m;
  }

  // ——— 主木桌（程序化木纹，和全景图的暖木色对齐） ———
  function makeWoodTexture(rx, ry) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#a1723f');
    g.addColorStop(0.55, '#8f6134');
    g.addColorStop(1, '#7c522a');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    // 木纹丝
    for (var i = 0; i < 130; i++) {
      var y0 = Math.random() * 256;
      var alpha = 0.04 + Math.random() * 0.07;
      x.strokeStyle = 'rgba(58, 36, 18, ' + alpha.toFixed(3) + ')';
      x.lineWidth = Math.random() < 0.72 ? 1 : 2;
      x.beginPath();
      x.moveTo(-4, y0);
      for (var px = 0; px <= 260; px += 26) {
        x.lineTo(px, y0 + Math.sin(px * 0.045 + i * 1.7) * 2.2);
      }
      x.stroke();
    }
    // 板缝
    x.fillStyle = 'rgba(46, 28, 14, 0.5)';
    for (var p = 1; p < 4; p++) x.fillRect(0, (256 / 4) * p, 256, 2);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function buildTable() {
    var table = new THREE.Group();
    var topMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture(2, 1.3), roughness: 0.78 });
    var top = mesh(new THREE.BoxGeometry(2.7, 0.14, 1.7), topMat, true, true);
    top.position.set(0, 0.92, 0);
    table.add(top);
    // 桌面边缘描边
    var edge = mesh(new THREE.BoxGeometry(2.74, 0.05, 1.74), MAT.woodDark, true, true);
    edge.position.set(0, 0.85, 0);
    table.add(edge);
    [[-1.15, -0.6], [1.15, -0.6], [-1.15, 0.6], [1.15, 0.6]].forEach(function (p) {
      var leg = mesh(new THREE.BoxGeometry(0.14, 0.85, 0.14), MAT.woodDark, true, true);
      leg.position.set(p[0], 0.42, p[1]);
      table.add(leg);
    });
    // 案板
    var board = mesh(new THREE.BoxGeometry(1.5, 0.04, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xd8b98c, roughness: 0.9 }), true, true);
    board.position.set(0, 1.01, 0);
    table.add(board);
    scene.add(table);
    return table;
  }

  // ——— 面塑奶奶（程序化，可被 GLB 替换） ———
  var grandmaGroup = new THREE.Group();
  function buildGrandma() {
    var g = grandmaGroup;
    g.position.set(0, 0, -2.55);

    // 身体
    var body = mesh(new THREE.CapsuleGeometry(0.34, 0.62, 6, 16), MAT.cloth, true, true);
    body.position.y = 1.15; g.add(body);
    // 围裙
    var apron = mesh(new THREE.BoxGeometry(0.62, 0.72, 0.12), MAT.apron, true, true);
    apron.position.set(0, 1.0, 0.3); g.add(apron);
    var apronStrip = mesh(new THREE.BoxGeometry(0.16, 0.5, 0.14), MAT.apron, true, true);
    apronStrip.position.set(0, 1.52, 0.31); g.add(apronStrip);
    // 头
    var head = mesh(new THREE.SphereGeometry(0.27, 24, 18), MAT.skin, true, true);
    head.position.y = 1.86; g.add(head);
    // 头发：发际线在后，露出面部
    var hair = mesh(new THREE.SphereGeometry(0.278, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), MAT.hair, true, true);
    hair.position.set(0, 1.94, -0.035); g.add(hair);
    var bun = mesh(new THREE.SphereGeometry(0.135, 16, 12), MAT.hair, true, true);
    bun.position.set(0, 2.04, -0.2); g.add(bun);
    // 眼睛（微笑）
    [-0.09, 0.09].forEach(function (x) {
      var eye = mesh(new THREE.SphereGeometry(0.022, 10, 8), MAT.bean, false, false);
      eye.position.set(x, 1.88, 0.255); g.add(eye);
    });
    // 笑嘴
    var smile = mesh(new THREE.TorusGeometry(0.07, 0.011, 8, 18, Math.PI), MAT.bean, false, false);
    smile.position.set(0, 1.79, 0.25); smile.rotation.z = Math.PI; g.add(smile);
    // 手臂（教学姿态）
    var armL = mesh(new THREE.CapsuleGeometry(0.1, 0.5, 5, 12), MAT.cloth, true, true);
    armL.position.set(-0.42, 1.25, 0.1); armL.rotation.z = 0.75; g.add(armL);
    var armR = mesh(new THREE.CapsuleGeometry(0.1, 0.5, 5, 12), MAT.cloth, true, true);
    armR.position.set(0.42, 1.25, 0.1); armR.rotation.z = -0.75; g.add(armR);
    // 裤腿 + 鞋
    [-0.16, 0.16].forEach(function (x) {
      var leg = mesh(new THREE.CapsuleGeometry(0.13, 0.5, 5, 12), MAT.pants, true, true);
      leg.position.set(x, 0.45, 0); g.add(leg);
      var shoe = mesh(new THREE.BoxGeometry(0.22, 0.1, 0.32), MAT.shoe, true, true);
      shoe.position.set(x, 0.08, 0.07); g.add(shoe);
    });
    scene.add(g);
  }

  // ——— 面塑凤凰（逐步显现） ———
  var phoenix = new THREE.Group();
  phoenix.position.set(0, 1.03, 0.05);
  var parts = { dough: null, body: null, deco: null, eyes: null, tails: [], head: null, finalModel: null, finalScale: 1, goldTray: null, goldScale: 1, bodyCustom: false };

  function buildPhoenix() {
    // 白面团（起始）
    var dough = mesh(new THREE.SphereGeometry(0.34, 32, 24), MAT.dough, true, true);
    dough.scale.set(1, 0.72, 1);
    phoenix.add(dough);
    parts.dough = dough;

    // 凤凰身子（紫红色）
    var bodyGrp = new THREE.Group();
    var torso = mesh(new THREE.SphereGeometry(0.3, 28, 20), MAT.phoenix, true, true);
    torso.scale.set(1, 0.78, 1.25); torso.position.set(0, 0.08, -0.06);
    bodyGrp.add(torso);
    var chest = mesh(new THREE.SphereGeometry(0.2, 24, 18), MAT.phoenix, true, true);
    chest.scale.set(1, 1, 1.1); chest.position.set(0, 0.12, 0.2);
    bodyGrp.add(chest);
    // 颈 + 头
    var neck = mesh(new THREE.CapsuleGeometry(0.09, 0.28, 5, 14), MAT.phoenix, true, true);
    neck.position.set(0, 0.32, 0.26); neck.rotation.x = -0.5;
    bodyGrp.add(neck);
    var head = mesh(new THREE.SphereGeometry(0.15, 22, 16), MAT.phoenix, true, true);
    head.position.set(0, 0.5, 0.4);
    bodyGrp.add(head); parts.head = head;
    // 冠（黄色）
    var crest = mesh(new THREE.SphereGeometry(0.1, 16, 12), MAT.yellow, true, true);
    crest.scale.set(1.3, 0.5, 0.7); crest.position.set(0, 0.61, 0.44); crest.rotation.z = -0.35;
    bodyGrp.add(crest);
    var beak = mesh(new THREE.ConeGeometry(0.05, 0.1, 8), MAT.yellow, true, true);
    beak.position.set(0, 0.47, 0.55); beak.rotation.x = Math.PI / 2;
    bodyGrp.add(beak);
    // 翅羽刻痕
    for (var s = -1; s <= 1; s += 2) {
      var wing = mesh(new THREE.SphereGeometry(0.16, 16, 12), MAT.phoenixDark, true, true);
      wing.scale.set(0.35, 0.8, 1.2); wing.position.set(s * 0.22, 0.12, -0.1); wing.rotation.z = s * 0.3;
      bodyGrp.add(wing);
    }
    bodyGrp.visible = false;
    phoenix.add(bodyGrp); parts.body = bodyGrp;

    // 金黄装饰（羽衣）
    var deco = new THREE.Group();
    var decoPieces = [
      [0, 0.3, 0.32, 0.16, 0.06, 0.1, 0.2],
      [-0.16, 0.2, 0.14, 0.09, 0.05, 0.14, -0.5],
      [0.16, 0.2, 0.14, 0.09, 0.05, 0.14, 0.5],
      [0, 0.14, -0.18, 0.12, 0.05, 0.16, 0]
    ];
    decoPieces.forEach(function (p) {
      var d = mesh(new THREE.SphereGeometry(0.1, 14, 10), MAT.yellowSoft, true, true);
      d.scale.set(p[3] / 0.1, p[4] / 0.1, p[5] / 0.1);
      d.position.set(p[0], p[1], p[2]); d.rotation.z = p[6];
      deco.add(d);
    });
    deco.visible = false;
    phoenix.add(deco); parts.deco = deco;

    // 黑豆眼睛
    var eyes = new THREE.Group();
    [-0.062, 0.062].forEach(function (x) {
      var bean = mesh(new THREE.SphereGeometry(0.032, 16, 12), MAT.bean, true, true);
      bean.scale.set(1, 1.1, 0.8); bean.position.set(x, 0.52, 0.525);
      eyes.add(bean);
      var spark = mesh(new THREE.SphereGeometry(0.009, 8, 6), MAT.eyeWhite, false, false);
      spark.position.set(x - 0.008, 0.532, 0.552);
      eyes.add(spark);
    });
    eyes.visible = false;
    phoenix.add(eyes); parts.eyes = eyes;

    // 三根带花凤尾
    for (var t = 0; t < 3; t++) {
      var tail = new THREE.Group();
      var plume = mesh(new THREE.SphereGeometry(0.12, 20, 14), MAT.phoenixDark, true, true);
      plume.scale.set(0.7, 0.22, 3.0); plume.position.set(0, 0, -0.42);
      tail.add(plume);
      // 黄色纹路
      var stripe = mesh(new THREE.SphereGeometry(0.1, 14, 10), MAT.yellow, true, true);
      stripe.scale.set(0.32, 0.12, 2.4); stripe.position.set(0, 0.03, -0.42);
      tail.add(stripe);
      // 尾部小花
      var flower = new THREE.Group();
      for (var p = 0; p < 6; p++) {
        var petal = mesh(new THREE.SphereGeometry(0.055, 12, 10), MAT.yellowSoft, true, true);
        petal.scale.set(1, 0.45, 1.5);
        var a = (p / 6) * Math.PI * 2;
        petal.position.set(Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09);
        petal.rotation.y = -a;
        flower.add(petal);
      }
      var core = mesh(new THREE.SphereGeometry(0.055, 12, 10), MAT.phoenix, true, true);
      flower.add(core);
      flower.position.set(0, 0.03, -0.82);
      tail.add(flower);
      tail.position.set(0, 0.06, -0.18);
      tail.rotation.y = (t - 1) * 0.5;
      tail.visible = false;
      phoenix.add(tail);
      parts.tails.push(tail);
    }

    scene.add(phoenix);
  }

  // ——— 第一人称双手 ———
  var handL, handR;
  function buildHands() {
    handL = new THREE.Group(); handR = new THREE.Group();
    function makeHand(sign) {
      var g = new THREE.Group();
      var palm = mesh(new THREE.SphereGeometry(0.14, 18, 14), MAT.skin, true, true);
      palm.scale.set(0.85, 0.45, 1.15); g.add(palm);
      for (var f = 0; f < 4; f++) {
        var finger = mesh(new THREE.CapsuleGeometry(0.028, 0.13, 4, 8), MAT.skin, true, true);
        finger.position.set((f - 1.5) * 0.062, 0.02, -0.16);
        finger.rotation.x = -0.5; g.add(finger);
      }
      var thumb = mesh(new THREE.CapsuleGeometry(0.032, 0.1, 4, 8), MAT.skin, true, true);
      thumb.position.set(sign * 0.12, 0, -0.02); thumb.rotation.z = sign * 0.9; g.add(thumb);
      return g;
    }
    handL = makeHand(-1); handR = makeHand(1);
    // 挂在相机下：环视时双手仍然跟着视线，不会飘出画面
    handL.position.set(-0.55, -0.6, -1.15);
    handR.position.set(0.55, -0.6, -1.15);
    handL.rotation.set(-0.3, -0.25, 0); handR.rotation.set(-0.3, 0.25, 0);
    camera.add(handL); camera.add(handR);
  }

  // ——— 可选 GLB 模型加载（按需加载，缺文件自动回退程序化几何体） ———
  var MODEL_FILES = {
    grandma: 'models/vr/grandma.glb',
    dough: 'models/vr/dough.glb',
    phoenix_body: 'models/vr/phoenix_body.glb',
    yellow_deco: 'models/vr/yellow_deco.glb',
    black_bean: 'models/vr/black_bean.glb',
    flower_tail: 'models/vr/flower_tail.glb',
    phoenix_final: 'models/vr/phoenix_final.glb'
  };
  var loader = new GLTFLoader();
  var loadState = {};        // key -> 'loading' | 'loaded' | 'none'
  var pendingCb = {};        // key -> [fn]
  var _box = new THREE.Box3(), _size = new THREE.Vector3();

  // 按包围盒把模型缩放到目标高度，底面对齐到局部 y=0 —— 模型尺寸随便变都不会错位
  function fitModel(obj, targetH) {
    obj.updateMatrixWorld(true);
    _box.setFromObject(obj); _box.getSize(_size);
    obj.scale.setScalar(targetH / Math.max(_size.y, 1e-4));
    obj.updateMatrixWorld(true);
    _box.setFromObject(obj);
    obj.position.y -= _box.min.y;
    obj.traverse(function (n) {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });
    return obj;
  }

  // 按最长边缩放：扁平造型（如面团）按高度归一会横向爆开
  function fitModelByMax(obj, targetMax) {
    obj.updateMatrixWorld(true);
    _box.setFromObject(obj); _box.getSize(_size);
    var m = Math.max(_size.x, _size.y, _size.z, 1e-4);
    obj.scale.setScalar(targetMax / m);
    obj.updateMatrixWorld(true);
    _box.setFromObject(obj);
    obj.position.y -= _box.min.y;
    obj.traverse(function (n) {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });
    return obj;
  }

  // 隐藏组内的程序化网格（组本身保持可见，好让子模型跟着原有动画走）
  function hideProcedural(group) {
    group.traverse(function (n) { if (n.isMesh) n.visible = false; });
  }

  // 每个模型接进对应的场景部件
  var MODEL_APPLY = {
    grandma: function (obj) {
      fitModel(obj, 1.95);
      // 站到桌子左后方，避免和桌上作品在视线上重叠
      obj.position.set(-0.72, obj.position.y, -2.45);
      obj.rotation.y = 0.3;
      scene.remove(grandmaGroup);
      scene.add(obj);
    },
    dough: function (obj) {
      fitModelByMax(obj, 0.82);
      obj.position.y -= 0.05;
      // 模型导出时把颜色写在自发光里（渲染成粉红），这里改回白面团色
      obj.traverse(function (n) {
        if (n.isMesh && n.material) {
          n.material.color = new THREE.Color(0xf4ecdc);
          n.material.emissive = new THREE.Color(0x000000);
          n.material.roughness = 0.85;
          n.material.needsUpdate = true;
        }
      });
      parts.dough.add(obj);
      parts.dough.material.visible = false;   // 只藏几何体，保留子节点渲染
    },
    phoenix_body: function (obj) {
      fitModel(obj, 0.68);
      hideProcedural(parts.body);
      parts.body.add(obj);
      // 该模型自带眼睛、金冠与金色羽饰，程序化的黑豆和金片不再叠加
      parts.bodyCustom = true;
      parts.deco.visible = false;
      parts.eyes.visible = false;
    },
    // yellow_deco 实际是一盘散开的金饰零件，不是贴片：放在案板右侧当“配件盘”，
    // 第 4 步用掉后收起，凤身上的金饰仍由程序化贴片呈现
    yellow_deco: function (obj) {
      fitModel(obj, 0.24);
      var tray = new THREE.Group();          // 包一层，缩放时底面不会漂移
      tray.add(obj);
      tray.position.set(0.42, 1.03, 0.24);
      tray.rotation.y = -0.5;
      tray.visible = false;
      parts.goldTray = tray;
      parts.goldScale = 1;
      scene.add(tray);
    },
    flower_tail: function (obj) {
      fitModel(obj, 0.62);
      parts.tails.forEach(function (tail, i) {
        hideProcedural(tail);
        var c = obj.clone(true);
        c.position.set((i - 1) * 0.1, 0.1, -0.42);    // 扇形错开，避免三片完全重叠
        c.rotation.x = -0.6;                           // 向后上方展开，而不是竖在背上
        tail.add(c);
      });
    },
    phoenix_final: function (obj) {
      fitModel(obj, 0.72);
      var box = new THREE.Group();           // 包一层，缩放以底面为基准，避免悬空
      box.add(obj);
      box.visible = false;                   // 第 8 步「靠」的后半程才现身
      parts.finalModel = box;
      parts.finalScale = 1;
      phoenix.add(box);
    }
  };

  function ensureModel(key, cb) {
    var st = loadState[key];
    if (st === 'loaded') { if (cb) cb(); return; }
    if (st === 'none') return;
    if (st === 'loading') { if (cb) (pendingCb[key] = pendingCb[key] || []).push(cb); return; }
    if (!MODEL_FILES[key]) { loadState[key] = 'none'; return; }
    loadState[key] = 'loading';
    var url = siteBase() + MODEL_FILES[key];
    fetch(url, { method: 'HEAD' }).then(function (res) {
      if (!res.ok) { loadState[key] = 'none'; return; }
      loader.load(url, function (gltf) {
        loadState[key] = 'loaded';
        try { MODEL_APPLY[key] && MODEL_APPLY[key](gltf.scene); } catch (e) { loadState[key] = 'none'; }
        (pendingCb[key] || []).forEach(function (fn) { fn(); });
        pendingCb[key] = [];
        if (cb) cb();
      }, undefined, function () { loadState[key] = 'none'; });
    }).catch(function () { loadState[key] = 'none'; });
  }

  // 走到第几步再拉对应模型，首屏不用一次下完所有 GLB
  var STEP_MODELS = {
    0: ['dough'],
    1: ['phoenix_body'],     // 每一步提前一步预取，避免轮到时模型还没下完
    2: ['yellow_deco'],
    4: ['flower_tail'],
    5: ['phoenix_final']
  };

  // ——— 游戏状态 ———
  var state = {
    started: false, step: 0, progress: 0, done: false, sound: true,
    dragging: false, lastX: 0, lastY: 0, travel: 0, spin: 0, t: 0
  };
  var techBtns = Array.prototype.slice.call(document.querySelectorAll('.tech-step'));
  var coachEl = $('coach'), coachText = $('coach-text');
  var taskCard = $('task-card'), taskTech = $('task-tech'), taskTitle = $('task-title');
  var taskDesc = $('task-desc'), taskFill = $('task-progress-fill');
  var handHint = $('hand-hint');

  function showCoach(text) {
    coachText.textContent = text;
    coachEl.classList.remove('hidden');
    clearTimeout(showCoach._t);
    showCoach._t = setTimeout(function () { coachEl.classList.add('hidden'); }, 6200);
  }

  function updateUI() {
    var s = STEPS[state.step];
    taskTech.textContent = s.zi;
    taskTitle.textContent = s.title;
    taskDesc.textContent = s.desc;
    taskFill.style.width = (state.progress / s.need * 100) + '%';
    techBtns.forEach(function (b, i) {
      b.classList.toggle('is-current', i === state.step && !state.done);
      b.classList.toggle('is-done', i < state.step || state.done);
      b.classList.toggle('is-locked', i > state.step);
    });
    var arrows = { up: '↕', down: '↕', side: '↔', circle: '⟳' };
    handHint.innerHTML = (s.dir === 'circle' ? '按住画圈拖动' : '按住鼠标左键，按提示方向拖动') +
      ' <span class="hand-arrow">' + arrows[s.dir] + '</span>';
    // 走到该步时再拉模型，避免首屏一次下完所有 GLB
    (STEP_MODELS[state.step] || []).forEach(function (k) { ensureModel(k); });
  }

  function applyStepVisuals() {
    var step = state.step;
    var p = Math.min(1, state.progress / STEPS[step].need);
    // 金饰盘只在「按」这一步摆在案板上，随后收走
    if (parts.goldTray) {
      var showGold = step === 3;
      parts.goldTray.visible = showGold;
      if (showGold) parts.goldTray.scale.setScalar(parts.goldScale * (1 - p * 0.3));
    }
    if (step === 0) {
      // 掤：面团上浮
      parts.dough.position.y = p * 0.12;
      parts.dough.scale.set(1 + p * 0.05, 0.72 + p * 0.12, 1 + p * 0.05);
    } else if (step === 1) {
      // 捋：揉圆
      parts.dough.scale.set(1 + p * 0.06, 0.84 + p * 0.2, 1 + p * 0.06);
    } else if (step === 2) {
      // 挤：切换到凤凰身，逐渐显现
      parts.dough.visible = false;
      parts.body.visible = true;
      var sc = 0.55 + p * 0.45;
      parts.body.scale.setScalar(sc);
      parts.body.rotation.y = (1 - p) * 0.6;
    } else if (step === 3) {
      // 按：金黄装饰（模型自带金色羽饰时不再叠加程序化金片）
      if (!parts.bodyCustom) {
        parts.deco.visible = true;
        parts.deco.scale.setScalar(0.001 + p * 0.999);
      }
    } else if (step === 4) {
      // 采：黑豆眼睛（模型自带眼睛时跳过）
      if (!parts.bodyCustom) {
        parts.eyes.visible = true;
        parts.eyes.scale.setScalar(0.001 + p * 0.999);
      }
    } else if (step === 5) {
      // 挒：三尾依次出现
      parts.tails.forEach(function (tail, i) {
        var local = THREE.MathUtils.clamp(p * 3 - i, 0, 1);
        tail.visible = local > 0.01;
        tail.scale.setScalar(0.3 + local * 0.7);
      });
    } else if (step === 6) {
      // 肘：三尾合拢
      parts.tails.forEach(function (tail, i) {
        tail.rotation.y = (i - 1) * (0.5 - p * 0.28);
      });
    } else if (step === 7) {
      // 靠：整体成型 + 轻微旋转；后半程换成完整凤凰模型
      phoenix.rotation.y = p * Math.PI * 0.35;
      // 换成完整模型后落回案板，避免悬空
      var lift = Math.sin(p * Math.PI) * 0.12 * Math.max(0, 1 - p * 2);
      phoenix.position.y = 1.03 + lift;
      if (parts.finalModel) {
        var useModel = p >= 0.5;
        parts.finalModel.visible = useModel;
        parts.body.visible = !useModel;
        parts.deco.visible = !useModel && !parts.bodyCustom;
        parts.eyes.visible = !useModel && !parts.bodyCustom;
        parts.tails.forEach(function (t) { t.visible = !useModel; });
        if (useModel) {
          var k = 0.72 + 0.28 * (p - 0.5) / 0.5;
          parts.finalModel.scale.setScalar(parts.finalScale * k);
        }
      }
    }
  }

  function completeStep() {
    var s = STEPS[state.step];
    beep(660, 0.12, 'sine');
    if (state.step === 7) {
      state.done = true;
      state.progress = s.need;
      phoenix.rotation.y = -0.7; // 完成时摆出侧面展示角度，凤身与三尾都可见
      updateUI();
      showCoach('好——一只凤凰成了！八法都到位，看看你的作品吧。');
      setTimeout(function () {
        $('finish-overlay').classList.remove('hidden');
        taskCard.classList.add('hidden');
        handHint.classList.add('hidden');
      }, 1300);
      return;
    }
    state.step++;
    state.progress = 0;
    updateUI();
    showCoach(STEPS[state.step].coach);
    beep(880, 0.09, 'sine');
  }

  // ——— 简单音效（Web Audio，无需外部文件） ———
  var audioCtx = null;
  function beep(freq, dur, type) {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }

  // ——— 指针交互：左键制作，右键 / 双指 / 环视模式看全景 ———
  var pointers = {};
  var lookDrag = { active: false, x: 0, y: 0 };
  var lookMode = false;

  function pointerDown(e) {
    pointers[e.pointerId] = true;
    var wantLook =
      e.button === 2 ||
      lookMode ||
      (e.pointerType === 'touch' && Object.keys(pointers).length >= 2);

    if (wantLook) {
      state.dragging = false;
      canvas.classList.remove('is-pressing');
      lookDrag.active = true;
      lookDrag.x = e.clientX; lookDrag.y = e.clientY;
      canvas.classList.add('is-looking');
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (!state.started || state.done) return;
    state.dragging = true;
    state.lastX = e.clientX; state.lastY = e.clientY;
    canvas.classList.add('is-pressing');
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function pointerUp(e) {
    if (e && e.pointerId != null) delete pointers[e.pointerId];
    lookDrag.active = false;
    canvas.classList.remove('is-looking');
    state.dragging = false;
    canvas.classList.remove('is-pressing');
  }
  function pointerMove(e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    // 第一人称轻微视差
    swayX = nx * 0.06;
    swayY = ny * 0.03;

    if (lookDrag.active) {
      var lx = e.clientX - lookDrag.x, ly = e.clientY - lookDrag.y;
      lookDrag.x = e.clientX; lookDrag.y = e.clientY;
      view.yaw -= lx * 0.0032;
      view.pitch -= ly * 0.0032;
      view.pitch = Math.max(-0.85, Math.min(0.5, view.pitch));
      applyCamera();
      return;
    }

    applyCamera();
    if (!state.dragging || state.done) return;

    var dx = e.clientX - state.lastX, dy = e.clientY - state.lastY;
    state.lastX = e.clientX; state.lastY = e.clientY;
    var dir = STEPS[state.step].dir;
    var gain = 0;
    if (dir === 'up') gain = Math.max(0, -dy);
    else if (dir === 'down') gain = Math.max(0, dy);
    else if (dir === 'side') gain = Math.abs(dx);
    else if (dir === 'circle') gain = (Math.abs(dx) + Math.abs(dy)) * 0.55;

    // 手掌跟随
    handL.position.x = -0.55 + nx * 0.12;
    handR.position.x = 0.55 + nx * 0.12;

    if (gain > 0) {
      state.progress += gain;
      phoenix.rotation.y += dx * 0.002;
      applyStepVisuals();
      updateUI();
      if (state.progress >= STEPS[state.step].need) completeStep();
    }
  }
  canvas.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  window.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ——— 渲染循环 ———
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var dt = clock.getDelta();
    state.t += dt;
    // 奶奶轻微呼吸
    grandmaGroup.position.y = Math.sin(state.t * 1.4) * 0.012;
    // 凤凰待机浮动
    if (state.done) {
      phoenix.rotation.y += dt * 0.35;
      phoenix.position.y = 1.03 + Math.sin(state.t * 2) * 0.04;
    }
    renderer.render(scene, camera);
  }

  // ——— 流程控制 ———
  function startGame() {
    $('start-overlay').classList.add('hidden');
    state.started = true;
    taskCard.classList.remove('hidden');
    handHint.classList.remove('hidden');
    updateUI();
    showCoach(STEPS[0].coach);
    beep(523, 0.15, 'sine');
  }
  function resetGame() {
    $('finish-overlay').classList.add('hidden');
    state.started = true; state.step = 0; state.progress = 0; state.done = false;
    parts.dough.visible = true; parts.dough.position.y = 0; parts.dough.scale.set(1, 0.72, 1);
    parts.body.visible = false; parts.body.scale.setScalar(1); parts.body.rotation.y = 0;
    parts.deco.visible = false; parts.eyes.visible = false;
    parts.tails.forEach(function (t) { t.visible = false; t.scale.setScalar(1); t.rotation.y = 0; });
    if (parts.finalModel) { parts.finalModel.visible = false; parts.finalModel.scale.setScalar(parts.finalScale); }
    phoenix.rotation.y = 0; phoenix.position.y = 1.03;
    taskCard.classList.remove('hidden'); handHint.classList.remove('hidden');
    updateUI(); showCoach(STEPS[0].coach);
  }

  $('btn-start').addEventListener('click', startGame);
  $('btn-again').addEventListener('click', resetGame);
  $('btn-sound').addEventListener('click', function () {
    state.sound = !state.sound;
    this.textContent = state.sound ? '🔊' : '🔇';
  });
  // 环视开关：打开后左键拖动变成转视角（触屏单指也能转）
  var lookBtn = $('btn-look');
  var lookHintEl = $('look-hint');
  if (lookBtn) {
    lookBtn.addEventListener('click', function () {
      lookMode = !lookMode;
      lookBtn.classList.toggle('is-active', lookMode);
      lookBtn.setAttribute('aria-pressed', lookMode ? 'true' : 'false');
      canvas.classList.toggle('is-look-mode', lookMode);
      if (lookHintEl) lookHintEl.classList.toggle('hidden', !lookMode);
      if (lookMode) {
        state.dragging = false;
        canvas.classList.remove('is-pressing');
      }
    });
  }
  $('btn-fullscreen').addEventListener('click', function () {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) document.exitFullscreen();
  });
  techBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = parseInt(b.getAttribute('data-step'), 10);
      if (i <= state.step && !state.done) {
        state.step = i; state.progress = 0; updateUI(); showCoach(STEPS[i].coach);
      }
    });
  });

  // ——— 初始化 ———
  loadPano();
  buildTable();
  buildGrandma();
  buildPhoenix();
  buildHands();
  applyStepVisuals();
  updateUI();
  resize();
  animate();

  // 奶奶和起始面团开局就要，先拉这两个；其余按步骤懒加载（见 STEP_MODELS）
  ensureModel('grandma');
  ensureModel('dough');

  // 通知：模型目录为空（或取不到）时用程序化几何体
  function showFallbackNotice() {
    var n = $('fallback-notice');
    n.textContent = '当前使用程序化 3D 模型演示。将 Miora 生成的 GLB 按 models/vr/README.md 命名放入目录，即可自动替换为您的模型。';
    n.classList.remove('hidden');
    setTimeout(function () { n.classList.add('hidden'); }, 9000);
  }
  fetch(siteBase() + MODEL_FILES.phoenix_final, { method: 'HEAD' }).then(function (r) {
    if (!r.ok) showFallbackNotice();
  }).catch(showFallbackNotice);
})();
