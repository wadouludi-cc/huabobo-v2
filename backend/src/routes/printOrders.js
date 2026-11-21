const express = require('express');
const { eq, desc, inArray } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const asyncHandler = require('../utils/asyncHandler');
const requireDb = require('../middleware/requireDb');
const { requireUser } = require('../middleware/userAuth');
const { requireAdmin } = require('../middleware/auth');
const { formatDateTime } = require('../utils/url');

const router = express.Router();
const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

const VALID_STATUS = ['pending', 'handling', 'done', 'rejected'];
/** 与后台「打印申请」面板的状态按钮文案保持一致，用户侧直接复用 */
const STATUS_LABEL = { pending: '待处理', handling: '处理中', done: '已完成', rejected: '已拒绝' };

/** 快照体积上限，避免异常请求撑爆数据库 */
const MAX_SNAPSHOT_BYTES = 512 * 1024;

/** 读取用户默认收货地址（未填写返回 null） */
async function loadUserAddress(userId) {
  if (!userId) return null;
  const { userAddresses } = dbm.schema;
  const rows = await dbm.db.select().from(userAddresses).where(eq(userAddresses.userId, String(userId))).limit(1);
  const row = rows[0];
  if (!row || !row.address) return null;
  return { name: row.name || '', phone: row.phone || '', address: row.address || '' };
}

/** 校验并序列化前端提交的 3D 快照 */
function normalizeSnapshot(input) {
  if (!input) return '';
  var obj = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch (e) {
      const err = new Error('三维快照格式无效');
      err.status = 400;
      throw err;
    }
  }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.instances)) {
    const err = new Error('三维快照缺少模型数据');
    err.status = 400;
    throw err;
  }
  var text = JSON.stringify(obj);
  if (Buffer.byteLength(text, 'utf8') > MAX_SNAPSHOT_BYTES) {
    const err = new Error('三维快照过大，请减少模型数量后重试');
    err.status = 413;
    throw err;
  }
  return text;
}

function parseSnapshot(stored) {
  if (!stored) return null;
  try {
    var o = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return o && typeof o === 'object' ? o : null;
  } catch (e) {
    return null;
  }
}

/** POST /api/print-orders — 提交实体打印申请（需登录，需先填写收货地址） */
router.post(
  '/',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { printOrders } = dbm.schema;
    const workId = String((req.body && req.body.workId) || '').trim();
    const contact = String((req.body && req.body.contact) || '').trim().slice(0, 120);
    const note = String((req.body && req.body.note) || '').trim().slice(0, 500);
    if (!contact) {
      return res.status(400).json({ ok: false, message: '请留下联系方式，方便我们联系打印事宜' });
    }

    const address = await loadUserAddress(req.userId);
    if (!address) {
      return res.status(400).json({
        ok: false,
        code: 'ADDRESS_REQUIRED',
        message: '请先在「我的」页面填写收货地址，打印完成后我们按该地址寄出'
      });
    }

    const snapshot = normalizeSnapshot(req.body && req.body.snapshot);

    const now = nowMs();
    const row = {
      id: newId(),
      workId: workId,
      userId: String(req.userId || ''),
      contact: contact,
      note: note,
      shipName: address.name,
      shipPhone: address.phone,
      shipAddress: address.address,
      snapshot: snapshot,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(printOrders).values(row);
    res.status(201).json({
      ok: true,
      data: {
        id: row.id,
        ship: address,
        hasSnapshot: !!snapshot
      }
    });
  })
);

/** GET /api/print-orders/mine — 当前用户的 3D 打印申请（状态与后台一致，不含三维快照大字段） */
router.get(
  '/mine',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { printOrders, works } = dbm.schema;
    const rows = await dbm.db
      .select({
        id: printOrders.id,
        workId: printOrders.workId,
        contact: printOrders.contact,
        note: printOrders.note,
        status: printOrders.status,
        shipName: printOrders.shipName,
        shipPhone: printOrders.shipPhone,
        shipAddress: printOrders.shipAddress,
        createdAt: printOrders.createdAt,
        updatedAt: printOrders.updatedAt
      })
      .from(printOrders)
      .where(eq(printOrders.userId, String(req.userId)))
      .orderBy(desc(printOrders.createdAt))
      .limit(100);

    const workIds = Array.from(new Set(rows.map(function (o) { return o.workId; }).filter(Boolean)));
    const workMap = {};
    if (workIds.length) {
      const ws = await dbm.db.select().from(works).where(inArray(works.id, workIds));
      ws.forEach(function (w) { workMap[w.id] = w; });
    }

    res.json({
      ok: true,
      data: {
        list: rows.map(function (o) {
          const w = workMap[o.workId];
          return {
            id: o.id,
            workId: o.workId,
            contact: o.contact,
            note: o.note,
            status: o.status,
            statusLabel: STATUS_LABEL[o.status] || o.status,
            ship: { name: o.shipName || '', phone: o.shipPhone || '', address: o.shipAddress || '' },
            createdAt: formatDateTime(o.createdAt),
            updatedAt: formatDateTime(o.updatedAt),
            work: w
              ? { id: w.id, title: w.title, image: w.image || '', tag: w.tag || '' }
              : null
          };
        })
      }
    });
  })
);

/** GET /api/admin/print-orders — 打印申请列表（含作品、用户、收货地址、三维快照） */
admin.get(
  '/',
  asyncHandler(async function (req, res) {
    const { printOrders, works, users } = dbm.schema;
    const items = await dbm.db.select().from(printOrders).orderBy(desc(printOrders.createdAt)).limit(100);

    const workIds = Array.from(new Set(items.map(function (o) { return o.workId; }).filter(Boolean)));
    const userIds = Array.from(new Set(items.map(function (o) { return o.userId; }).filter(Boolean)));

    var workMap = {};
    if (workIds.length) {
      const ws = await dbm.db.select().from(works).where(inArray(works.id, workIds));
      ws.forEach(function (w) { workMap[w.id] = w; });
    }
    var userMap = {};
    if (userIds.length) {
      const us = await dbm.db.select().from(users).where(inArray(users.id, userIds));
      us.forEach(function (u) { userMap[u.id] = u; });
    }

    res.json({
      ok: true,
      data: {
        list: items.map(function (o) {
          const w = workMap[o.workId];
          const u = userMap[o.userId];
          /** 优先用申请当时留存的快照，作品被再次编辑也不影响本次打印 */
          const snapshot = parseSnapshot(o.snapshot) || (w ? parseSnapshot(w.studio) : null);
          return {
            id: o.id,
            workId: o.workId,
            contact: o.contact,
            note: o.note,
            status: o.status,
            createdAt: formatDateTime(o.createdAt),
            updatedAt: formatDateTime(o.updatedAt),
            ship: {
              name: o.shipName || '',
              phone: o.shipPhone || '',
              address: o.shipAddress || ''
            },
            snapshotSource: parseSnapshot(o.snapshot) ? 'order' : (snapshot ? 'work' : 'none'),
            snapshot: snapshot,
            work: w
              ? {
                  id: w.id,
                  title: w.title,
                  image: w.image || '',
                  tag: w.tag || '',
                  desc: w.desc || ''
                }
              : null,
            user: u ? { id: u.id, nickname: u.nickname, handle: u.handle } : null
          };
        })
      }
    });
  })
);

/** PATCH /api/admin/print-orders/:id — 标记处理状态 */
admin.patch(
  '/:id',
  asyncHandler(async function (req, res) {
    const { printOrders } = dbm.schema;
    const status = String((req.body && req.body.status) || '').trim();
    if (VALID_STATUS.indexOf(status) < 0) {
      return res.status(400).json({ ok: false, message: '状态无效' });
    }
    await dbm.db.update(printOrders).set({ status: status, updatedAt: nowMs() }).where(eq(printOrders.id, req.params.id));
    res.json({ ok: true });
  })
);

module.exports = { publicRouter: router, adminRouter: admin, VALID_STATUS, STATUS_LABEL };
