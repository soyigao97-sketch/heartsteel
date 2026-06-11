import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';

const router = Router();

// POST /api/reports - 提交举报
router.post('/', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason) {
      res.status(400).json({ error: '参数不完整' });
      return;
    }

    const validTypes = ['record', 'team', 'dynamic', 'message'];
    if (!validTypes.includes(targetType)) {
      res.status(400).json({ error: '无效的举报类型' });
      return;
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetType,
        targetId,
        reason,
      },
    });

    res.status(201).json(report);
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: '举报失败' });
  }
});

export default router;
