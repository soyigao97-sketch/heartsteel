import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';
import { getRedis } from '../utils/redis';

const router = Router();

// 管理员权限检查中间件
async function checkAdmin(req: Request, res: Response, next: Function) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.isAdmin) {
    res.status(403).json({ error: '无管理员权限' });
    return;
  }
  next();
}

// GET /api/admin/reports - 举报列表
router.get('/reports', authRequired, checkAdmin, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const status = req.query.status as string;

  const where: any = {};
  if (status) where.status = status;

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      reporter: { select: { id: true, nickname: true } },
    },
  });

  const total = await prisma.report.count({ where });
  res.json({ reports, total, page, limit });
});

// POST /api/admin/reports/:id/handle - 处理举报
router.post('/reports/:id/handle', authRequired, checkAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { action } = req.body; // 'approve' | 'dismiss'

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    res.status(404).json({ error: '举报不存在' });
    return;
  }

  if (action === 'approve') {
    // 软删除目标内容
    const targetMap: Record<string, any> = {
      record: prisma.record,
      team: prisma.teamRequest,
      dynamic: prisma.dynamic,
    };
    const model = targetMap[report.targetType];
    if (model) {
      await model.update({
        where: { id: report.targetId },
        data: { status: 'deleted' },
      });
    }
  }

  await prisma.report.update({
    where: { id },
    data: { status: action === 'approve' ? 'approved' : 'dismissed' },
  });

  res.json({ success: true });
});

// POST /api/admin/adjust-layer - 手动调整层数
router.post('/adjust-layer', authRequired, checkAdmin, async (req: Request, res: Response) => {
  const { userId, amount, reason } = req.body;
  if (!userId || !amount) {
    res.status(400).json({ error: '参数不完整' });
    return;
  }

  await prisma.layerLog.create({
    data: { userId, changeAmount: amount, reason: reason || 'admin_adjust' },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { heartLayer: { increment: amount } },
  });

  // 同步 Redis
  const redis = getRedis();
  await redis.hset(`user:${userId}`, 'heartLayer', user.heartLayer);

  res.json({ success: true, newLayer: user.heartLayer });
});

// GET /api/admin/users - 用户列表
router.get('/users', authRequired, checkAdmin, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const search = req.query.search as string;

  const where: any = {};
  if (search) {
    where.OR = [
      { nickname: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { heartLayer: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      nickname: true,
      phone: true,
      email: true,
      heartLayer: true,
      totalSignDays: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  const total = await prisma.user.count({ where });
  res.json({ users, total, page, limit });
});

export default router;
