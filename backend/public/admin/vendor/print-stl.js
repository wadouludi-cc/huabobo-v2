/**
 * 打印申请：把作品的三维快照（多模型组合）在浏览器里复现，并导出可直接切片的二进制 STL。
 *
 * 快照结构（与 frontend/js/studio.js 的 getStudioSnapshot 一致）：
 *   { instances: [{ modelId, color, offset:{x,y,z}, scale:{x,y,z}, rotation:{x,y,z} }] }
 *
 * 说明：STL 不含颜色与单位信息，这里按 1 场景单位 = 100mm 导出
 *      （工作台案板 4.2×2.8 单位 ≈ 42×28cm），切片软件里仍可等比缩放。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** 1 场景单位对应的毫米数 */
export const MM_PER_UNIT = 100;
/** 工作台顶面高度，快照内的 offset 是相对这个平面的 */
const WORKBENCH_TOP_Y = 0.12;

const loader = new GLTFLoader();
const glbCache = new Map();

function loadGlb(url) {
  if (glbCache.has(url)) return glbCache.get(url);
  const p = loader.loadAsync(url);
  glbCache.set(url, p);
  p.catch(() => glbCache.delete(url));
  return p;
}

function num(v, fallback) {
  return typeof v === 'number' && isFinite(v) ? v : fallback;
}

/**
 * 按快照拼出组合后的模型。
 * @returns {Promise<{root: THREE.Group, missing: string[], total: number}>}
 */
export async function buildComposition(instances, resolveModelUrl) {
  const root = new THREE.Group();
  root.position.y = WORKBENCH_TOP_Y;
  const missing = [];
  const list = Array.isArray(instances) ? instances : [];

  for (let i = 0; i < list.length; i++) {
    const ins = list[i] || {};
    const url = resolveModelUrl(ins.modelId);
    if (!url) {
      missing.push(ins.modelId || '未知模型');
      continue;
    }
    let gltf;
    try {
      gltf = await loadGlb(url);
    } catch (e) {
      missing.push(ins.modelId || '加载失败');
      continue;
    }
    const obj = gltf.scene.clone(true);
    const o = ins.offset || {};
    const s = ins.scale || {};
    const r = ins.rotation || {};
    obj.position.set(num(o.x, 0), num(o.y, 0), num(o.z, 0));
    obj.scale.set(num(s.x, 1), num(s.y, 1), num(s.z, 1));
    obj.rotation.set(num(r.x, 0), num(r.y, 0), num(r.z, 0));
    root.add(obj);
  }

  root.updateMatrixWorld(true);
  return { root, missing, total: list.length };
}

/** 组合模型的包围盒尺寸（毫米，按真实顶点计算，与 STL 导出一致） */
export function measureInMm(root, mmPerUnit = MM_PER_UNIT) {
  root.updateMatrixWorld(true);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let found = false;
  const v = new THREE.Vector3();

  root.traverse(function (obj) {
    if (!obj.isMesh || !obj.geometry) return;
    const pos = obj.geometry.attributes.position;
    if (!pos) return;
    found = true;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }
  });

  if (!found) return null;
  return {
    width: Math.round((maxX - minX) * mmPerUnit),
    height: Math.round((maxY - minY) * mmPerUnit),
    depth: Math.round((maxZ - minZ) * mmPerUnit)
  };
}

/** 导出二进制 STL */
export function exportStl(root, mmPerUnit = MM_PER_UNIT) {
  root.updateMatrixWorld(true);

  const verts = [];
  root.traverse(function (obj) {
    if (!obj.isMesh || !obj.geometry) return;
    const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    geo.applyMatrix4(obj.matrixWorld);
    const pos = geo.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      verts.push(pos.getX(i) * mmPerUnit, pos.getY(i) * mmPerUnit, pos.getZ(i) * mmPerUnit);
    }
    geo.dispose();
  });

  const triangleCount = Math.floor(verts.length / 9);
  if (!triangleCount) {
    return { blob: null, triangles: 0, size: null };
  }

  // 80 字节头 + 4 字节面片数 + 每面 50 字节
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const dv = new DataView(buffer);
  // STL 头按惯例写 ASCII，避免某些切片软件解析异常
  const header = 'Zhijiansu Huabobo 3D print model';
  for (let i = 0; i < header.length && i < 80; i++) {
    dv.setUint8(i, header.charCodeAt(i) & 0x7f);
  }
  dv.setUint32(80, triangleCount, true);

  let offset = 84;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const ax = [0, 0, 0], bx = [0, 0, 0], cx = [0, 0, 0];

  // 先统计包围盒
  for (let i = 0; i < verts.length; i += 3) {
    const vx = verts[i], vy = verts[i + 1], vz = verts[i + 2];
    if (vx < minX) minX = vx;
    if (vx > maxX) maxX = vx;
    if (vy < minY) minY = vy;
    if (vy > maxY) maxY = vy;
    if (vz < minZ) minZ = vz;
    if (vz > maxZ) maxZ = vz;
  }

  for (let t = 0; t < triangleCount; t++) {
    const base = t * 9;
    ax[0] = verts[base]; ax[1] = verts[base + 1]; ax[2] = verts[base + 2];
    bx[0] = verts[base + 3]; bx[1] = verts[base + 4]; bx[2] = verts[base + 5];
    cx[0] = verts[base + 6]; cx[1] = verts[base + 7]; cx[2] = verts[base + 8];

    // 法向 = (b-a) × (c-a)，归一化
    const ux = bx[0] - ax[0], uy = bx[1] - ax[1], uz = bx[2] - ax[2];
    const vx = cx[0] - ax[0], vy = cx[1] - ax[1], vz = cx[2] - ax[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= len; ny /= len; nz /= len;

    dv.setFloat32(offset, nx, true);
    dv.setFloat32(offset + 4, ny, true);
    dv.setFloat32(offset + 8, nz, true);
    dv.setFloat32(offset + 12, ax[0], true);
    dv.setFloat32(offset + 16, ax[1], true);
    dv.setFloat32(offset + 20, ax[2], true);
    dv.setFloat32(offset + 24, bx[0], true);
    dv.setFloat32(offset + 28, bx[1], true);
    dv.setFloat32(offset + 32, bx[2], true);
    dv.setFloat32(offset + 36, cx[0], true);
    dv.setFloat32(offset + 40, cx[1], true);
    dv.setFloat32(offset + 44, cx[2], true);
    dv.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  return {
    blob: new Blob([buffer], { type: 'model/stl' }),
    triangles: triangleCount,
    size: {
      width: Math.round(maxX - minX),
      height: Math.round(maxY - minY),
      depth: Math.round(maxZ - minZ)
    }
  };
}

/** 渲染一个可拖拽旋转的预览；返回句柄，用完请调用 dispose() */
export function createCompositionPreview(container, root, options) {
  const opts = options || {};
  const width = container.clientWidth || 360;
  const height = container.clientHeight || 260;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.background || 0xf7f4ef);

  const box = new THREE.Box3().setFromObject(root);
  const sphere = box.isEmpty()
    ? new THREE.Sphere(new THREE.Vector3(0, 0.2, 0), 0.6)
    : box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center.clone();
  const size = box.isEmpty() ? new THREE.Vector3(1, 1, 1) : box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  const FOV = 38;
  const camera = new THREE.PerspectiveCamera(FOV, width / height, maxDim / 1000, maxDim * 100);
  // 按包围球取景，保证不同大小的作品都撑满画面
  const distance = ((sphere.radius || maxDim / 2) / Math.sin((FOV * Math.PI) / 360)) * 0.95;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8ad, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(maxDim, maxDim * 1.8, maxDim * 1.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-maxDim, maxDim * 0.6, -maxDim);
  scene.add(fill);

  scene.add(root);

  let theta = Math.PI / 5;
  let phi = Math.PI / 3.2;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let raf = 0;
  let autoRotate = opts.autoRotate !== false;

  function placeCamera() {
    camera.position.set(
      center.x + distance * Math.sin(phi) * Math.sin(theta),
      center.y + distance * Math.cos(phi),
      center.z + distance * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(center);
  }
  placeCamera();

  const el = renderer.domElement;
  el.style.cursor = 'grab';
  function onDown(e) {
    dragging = true;
    autoRotate = false;
    lastX = e.clientX;
    lastY = e.clientY;
    el.style.cursor = 'grabbing';
  }
  function onMove(e) {
    if (!dragging) return;
    theta -= (e.clientX - lastX) * 0.01;
    phi = Math.min(Math.PI / 2.05, Math.max(0.25, phi - (e.clientY - lastY) * 0.008));
    lastX = e.clientX;
    lastY = e.clientY;
    placeCamera();
  }
  function onUp() {
    dragging = false;
    el.style.cursor = 'grab';
  }

  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  function tick() {
    if (autoRotate) {
      theta += 0.004;
      placeCamera();
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  return {
    dispose: function () {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
      scene.clear();
    }
  };
}

/** 触发浏览器下载 */
export function downloadStl(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'zhijiansu-huabobo.stl';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 2000);
}
