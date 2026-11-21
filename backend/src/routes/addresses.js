const express = require('express');
const { eq, and, desc, inArray } = require('drizzle-orm');
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

/**
 * 收货地址规则：
 * - 首次填写直接生效（没有旧地址可对比，不必审核）；
 * - 之后再修改必须提交申请，管理员同意后才替换默认地址，驳回则保留原地址；
 * - 订单下单时快照地址，因此进行中的订单不受地址变更影响。
 */
const PHONE_RE = /^1[3-9]\d{9}$/;

function pickAddress(body) {
  const name = String((body && body.name) || '').trim().slice(0, 30);
  const phone = String((body && body.phone) || '').trim().replace(/[\s-]/g, '');
  const address = String((body && body.address) || '').trim().slice(0, 200);
  return { name: name, phone: phone, address: address };
}

function validate(a) {
  if (!a.name) return '请填写收货人姓名';
  if (!a.phone) return '请填写手机号';
  if (!PHONE_RE.test(a.phone)) return '请输入正确的 11 位手机号';
  if (!a.address || a.address.length < 5) return '请填写详细收货地址（不少于 5 个字）';
  return '';
}

function publicAddress(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    updatedAt: formatDateTime(row.updatedAt)
  };
}

function publicRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    oldName: row.oldName,
    oldPhone: row.oldPhone,
    oldAddress: row.oldAddress,
    newName: row.newName,
    newPhone: row.newPhone,
    newAddress: row.newAddress,
    createdAt: formatDateTime(row.createdAt),
    reviewedAt: row.reviewedAt ? formatDateTime(row.reviewedAt) : '',
    reviewedBy: row.reviewedBy || ''
  };
}

async function findAddress(userId) {
  const { userAddresses } = dbm.schema;
  const rows = await dbm.db.select().from(userAddresses).where(eq(userAddresses.userId, userId)).limit(1);
  return rows[0] || null;
}

async function findPendingRequest(userId) {
  const { addressChangeRequests } = dbm.schema;
  const rows = await dbm.db
    .select()
    .from(addressChangeRequests)
    .where(and(eq(addressChangeRequests.userId, userId), eq(addressChangeRequests.status, 'pending')))
    .orderBy(desc(addressChangeRequests.createdAt))
    .limit(1);
  return rows[0] || null;
}

/** GET /api/addresses/mine — 我的默认收货地址 + 审核中的变更申请 */
router.get(
  '/mine',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const address = await findAddress(String(req.userId));
    const pending = await findPendingRequest(String(req.userId));
    res.json({
      ok: true,
      data: { address: publicAddress(address), pending: publicRequest(pending) }
    });
  })
);

/** PUT /api/addresses/mine — 首次保存直接生效；已有地址则提交变更申请 */
router.put(
  '/mine',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { userAddresses, addressChangeRequests } = dbm.schema;
    const next = pickAddress(req.body);
    const err = validate(next);
    if (err) return res.status(400).json({ ok: false, message: err });

    const userId = String(req.userId);
    const current = await findAddress(userId);
    const now = nowMs();

    if (!current) {
      const row = {
        id: newId(),
        userId: userId,
        name: next.name,
        phone: next.phone,
        address: next.address,
        createdAt: now,
        updatedAt: now
      };
      await dbm.db.insert(userAddresses).values(row);
      return res.json({
        ok: true,
        data: { mode: 'saved', message: '收货地址已保存', address: publicAddress(row), pending: null }
      });
    }

    if (current.name === next.name && current.phone === next.phone && current.address === next.address) {
      return res.status(400).json({ ok: false, message: '新地址与当前收货地址相同，无需修改' });
    }

    const pending = await findPendingRequest(userId);
    if (pending) {
      return res.status(409).json({
        ok: false,
        message: '已有一条地址修改申请正在等待管理员审核，请耐心等待处理结果'
      });
    }

    const row = {
      id: newId(),
      userId: userId,
      status: 'pending',
      oldName: current.name,
      oldPhone: current.phone,
      oldAddress: current.address,
      newName: next.name,
      newPhone: next.phone,
      newAddress: next.address,
      reviewedBy: '',
      reviewedAt: null,
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(addressChangeRequests).values(row);

    res.json({
      ok: true,
      data: {
        mode: 'pending',
        message: '修改申请已提交，等待管理员审核；审核通过后新订单才使用新地址',
        address: publicAddress(current),
        pending: publicRequest(row)
      }
    });
  })
);

/** DELETE /api/addresses/mine/request — 撤销审核中的变更申请 */
router.delete(
  '/mine/request',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { addressChangeRequests } = dbm.schema;
    const userId = String(req.userId);
    const pending = await findPendingRequest(userId);
    if (!pending) return res.json({ ok: true, data: { cancelled: false } });
    await dbm.db.delete(addressChangeRequests).where(eq(addressChangeRequests.id, pending.id));
    res.json({ ok: true, data: { cancelled: true, message: '已撤销地址修改申请' } });
  })
);

/** GET /api/admin/addresses — 待审核申请 + 全部用户当前地址 */
admin.get(
  '/',
  asyncHandler(async function (req, res) {
    const { userAddresses, addressChangeRequests, users } = dbm.schema;
    const [reqRows, addrRows] = await Promise.all([
      dbm.db
        .select()
        .from(addressChangeRequests)
        .where(eq(addressChangeRequests.status, 'pending'))
        .orderBy(desc(addressChangeRequests.createdAt))
        .limit(100),
      dbm.db.select().from(userAddresses).orderBy(desc(userAddresses.updatedAt)).limit(200)
    ]);

    const userIds = Array.from(
      new Set(reqRows.map(function (r) { return r.userId; }).concat(addrRows.map(function (r) { return r.userId; })))
    ).filter(Boolean);
    const userMap = {};
    if (userIds.length) {
      const us = await dbm.db.select().from(users).where(inArray(users.id, userIds));
      us.forEach(function (u) {
        userMap[u.id] = { id: u.id, nickname: u.nickname, handle: u.handle, avatar: u.avatar, username: u.username };
      });
    }

    res.json({
      ok: true,
      data: {
        pendingCount: reqRows.length,
        pending: reqRows.map(function (r) {
          return Object.assign(publicRequest(r), { user: userMap[r.userId] || null });
        }),
        list: addrRows.map(function (a) {
          return Object.assign(publicAddress(a), { userId: a.userId, user: userMap[a.userId] || null });
        })
      }
    });
  })
);

/** GET /api/admin/addresses/pending-count — 导航红点提醒用的轻量接口 */
admin.get(
  '/pending-count',
  asyncHandler(async function (req, res) {
    const { addressChangeRequests } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(addressChangeRequests)
      .where(eq(addressChangeRequests.status, 'pending'))
      .limit(100);
    res.json({ ok: true, data: { count: rows.length } });
  })
);

/** PATCH /api/admin/addresses/requests/:id — 同意/驳回地址变更申请 */
admin.patch(
  '/requests/:id',
  asyncHandler(async function (req, res) {
    const { userAddresses, addressChangeRequests } = dbm.schema;
    const action = String((req.body && req.body.action) || '').trim();
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ ok: false, message: '操作无效，只能同意或驳回' });
    }
    const rows = await dbm.db
      .select()
      .from(addressChangeRequests)
      .where(eq(addressChangeRequests.id, req.params.id))
      .limit(1);
    const row = rows[0];
    if (!row) return res.status(404).json({ ok: false, message: '申请不存在' });
    if (row.status !== 'pending') {
      return res.status(409).json({ ok: false, message: '该申请已处理，无需重复操作' });
    }

    const now = nowMs();
    const reviewer = (req.admin && (req.admin.username || req.admin.name)) || 'admin';

    if (action === 'approve') {
      const current = await findAddress(row.userId);
      if (current) {
        await dbm.db
          .update(userAddresses)
          .set({ name: row.newName, phone: row.newPhone, address: row.newAddress, updatedAt: now })
          .where(eq(userAddresses.id, current.id));
      } else {
        await dbm.db.insert(userAddresses).values({
          id: newId(),
          userId: row.userId,
          name: row.newName,
          phone: row.newPhone,
          address: row.newAddress,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await dbm.db
      .update(addressChangeRequests)
      .set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: reviewer,
        reviewedAt: now,
        updatedAt: now
      })
      .where(eq(addressChangeRequests.id, row.id));

    res.json({
      ok: true,
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        message: action === 'approve' ? '已同意，新地址已生效（新订单使用新地址）' : '已驳回，继续使用原地址'
      }
    });
  })
);

module.exports = { publicRouter: router, adminRouter: admin, PHONE_RE };
