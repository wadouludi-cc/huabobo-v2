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

/** 订单状态：正在接单 → 已接单制作 → 准备派送 → 已完成 */
const VALID_STATUS = ['pending', 'accepted', 'delivering', 'completed'];
const STATUS_LABEL = {
  pending: '正在接单',
  accepted: '已接单制作',
  delivering: '准备派送',
  completed: '已完成'
};

function studioOf(stored) {
  if (!stored) return null;
  try {
    const o = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return o && typeof o === 'object' ? o : null;
  } catch (e) {
    return null;
  }
}

function compactWork(w) {
  if (!w) return null;
  return { id: w.id, title: w.title, image: w.image || '', tag: w.tag || '', status: w.status || '' };
}

/** POST /api/custom-orders — 把 DIY 作品推送给指定手艺人（需登录） */
router.post(
  '/',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { customOrders, works, artisans } = dbm.schema;
    const workId = String((req.body && req.body.workId) || '').trim();
    const artisanId = String((req.body && req.body.artisanId) || '').trim();
    const note = String((req.body && req.body.note) || '').trim().slice(0, 500);

    if (!workId || !artisanId) {
      return res.status(400).json({ ok: false, message: '缺少作品或手艺人信息' });
    }

    const workRows = await dbm.db.select().from(works).where(eq(works.id, workId)).limit(1);
    if (!workRows.length) {
      return res.status(404).json({ ok: false, message: '作品不存在或已删除' });
    }
    if (String(workRows[0].userId) !== String(req.userId)) {
      return res.status(403).json({ ok: false, message: '只能为自己的作品发起定制' });
    }

    const artisanRows = await dbm.db.select().from(artisans).where(eq(artisans.id, artisanId)).limit(1);
    const artisanName = artisanRows.length
      ? artisanRows[0].name
      : String((req.body && req.body.artisanName) || '').trim();

    const now = nowMs();
    const row = {
      id: newId(),
      workId: workId,
      userId: String(req.userId),
      artisanId: artisanId,
      artisanName: artisanName,
      note: note,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(customOrders).values(row);

    res.status(201).json({
      ok: true,
      data: {
        id: row.id,
        status: row.status,
        statusLabel: STATUS_LABEL[row.status],
        artisanName: row.artisanName
      }
    });
  })
);

/** GET /api/custom-orders/mine — 当前用户的定制订单（含作品封面，不含 3D 大字段） */
router.get(
  '/mine',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { customOrders, works } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(customOrders)
      .where(eq(customOrders.userId, String(req.userId)))
      .orderBy(desc(customOrders.createdAt))
      .limit(100);

    const workIds = Array.from(new Set(rows.map(function (r) { return r.workId; }).filter(Boolean)));
    const workMap = {};
    if (workIds.length) {
      const ws = await dbm.db.select().from(works).where(inArray(works.id, workIds));
      ws.forEach(function (w) { workMap[w.id] = w; });
    }

    res.json({
      ok: true,
      data: {
        list: rows.map(function (o) {
          return {
            id: o.id,
            workId: o.workId,
            artisanId: o.artisanId,
            artisanName: o.artisanName,
            note: o.note,
            status: o.status,
            statusLabel: STATUS_LABEL[o.status] || o.status,
            createdAt: formatDateTime(o.createdAt),
            updatedAt: formatDateTime(o.updatedAt),
            work: compactWork(workMap[o.workId])
          };
        })
      }
    });
  })
);

/** GET /api/admin/custom-orders — 管理员订单列表 */
admin.get(
  '/',
  asyncHandler(async function (req, res) {
    const { customOrders, works, users } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(customOrders)
      .orderBy(desc(customOrders.createdAt))
      .limit(200);

    const workIds = Array.from(new Set(rows.map(function (r) { return r.workId; }).filter(Boolean)));
    const userIds = Array.from(new Set(rows.map(function (r) { return r.userId; }).filter(Boolean)));
    const workMap = {};
    const userMap = {};
    if (workIds.length) {
      const ws = await dbm.db.select().from(works).where(inArray(works.id, workIds));
      ws.forEach(function (w) { workMap[w.id] = w; });
    }
    if (userIds.length) {
      const us = await dbm.db.select().from(users).where(inArray(users.id, userIds));
      us.forEach(function (u) { userMap[u.id] = u; });
    }

    res.json({
      ok: true,
      data: {
        list: rows.map(function (o) {
          const w = workMap[o.workId];
          const u = userMap[o.userId];
          return {
            id: o.id,
            workId: o.workId,
            userId: o.userId,
            artisanId: o.artisanId,
            artisanName: o.artisanName,
            note: o.note,
            status: o.status,
            statusLabel: STATUS_LABEL[o.status] || o.status,
            createdAt: formatDateTime(o.createdAt),
            updatedAt: formatDateTime(o.updatedAt),
            work: compactWork(w),
            user: u ? { id: u.id, nickname: u.nickname, handle: u.handle } : null
          };
        })
      }
    });
  })
);

/** GET /api/admin/custom-orders/:id — 订单详情（含作品 3D 快照） */
admin.get(
  '/:id',
  asyncHandler(async function (req, res) {
    const { customOrders, works, users } = dbm.schema;
    const rows = await dbm.db.select().from(customOrders).where(eq(customOrders.id, req.params.id)).limit(1);
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: '订单不存在' });
    }
    const o = rows[0];
    let work = null;
    let user = null;
    if (o.workId) {
      const ws = await dbm.db.select().from(works).where(eq(works.id, o.workId)).limit(1);
      if (ws.length) {
        const w = ws[0];
        work = {
          id: w.id,
          title: w.title,
          image: w.image || '',
          tag: w.tag || '',
          desc: w.desc || '',
          workType: w.workType || 'model',
          studio: studioOf(w.studio)
        };
      }
    }
    if (o.userId) {
      const us = await dbm.db.select().from(users).where(eq(users.id, o.userId)).limit(1);
      if (us.length) user = { id: us[0].id, nickname: us[0].nickname, handle: us[0].handle };
    }

    res.json({
      ok: true,
      data: {
        id: o.id,
        workId: o.workId,
        userId: o.userId,
        artisanId: o.artisanId,
        artisanName: o.artisanName,
        note: o.note,
        status: o.status,
        statusLabel: STATUS_LABEL[o.status] || o.status,
        createdAt: formatDateTime(o.createdAt),
        updatedAt: formatDateTime(o.updatedAt),
        work: work,
        user: user
      }
    });
  })
);

/** PATCH /api/admin/custom-orders/:id — 更新订单状态 */
admin.patch(
  '/:id',
  asyncHandler(async function (req, res) {
    const { customOrders } = dbm.schema;
    const status = String((req.body && req.body.status) || '').trim();
    if (VALID_STATUS.indexOf(status) < 0) {
      return res.status(400).json({ ok: false, message: '状态无效' });
    }
    await dbm.db
      .update(customOrders)
      .set({ status: status, updatedAt: nowMs() })
      .where(eq(customOrders.id, req.params.id));
    res.json({ ok: true, data: { status: status, statusLabel: STATUS_LABEL[status] } });
  })
);

module.exports = { publicRouter: router, adminRouter: admin, VALID_STATUS, STATUS_LABEL };
