import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';
import { addLayer } from '../services/layerService';
import { calculateRankScore } from '../services/rankingService';

const router = Router();

// Helper: convert imagesJson string to images array for API response
function formatRecord(record: any) {
  if (!record) return record;
  return {
    ...record,
    images: typeof record.imagesJson === 'string' ? JSON.parse(record.imagesJson) : (record.imagesJson || []),
    imagesJson: undefined,
  };
}

// POST /api/records - 发布战绩
router.post('/', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { mode, kdaKill, kdaDeath, kdaAssist, description, images } = req.body;

    const result = await addLayer(userId, 'record');
    if (result.added === 0) {
      res.status(400).json({ error: '今日发布战绩次数已达上限（3次）' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const rankScore = calculateRankScore(user?.heartLayer || 0, 0, 0);

    const record = await prisma.record.create({
      data: {
        userId,
        mode: mode || '海克斯大乱斗',
        kdaKill: kdaKill || 0,
        kdaDeath: kdaDeath || 0,
        kdaAssist: kdaAssist || 0,
        description,
        imagesJson: JSON.stringify(images || []),
        rankScore,
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, location: true },
        },
      },
    });

    res.status(201).json({ record: formatRecord(record), layerAdded: result.added });
  } catch (err) {
    console.error('Create record error:', err);
    res.status(500).json({ error: '发布失败' });
  }
});

// GET /api/records - 获取战绩列表（广场）
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || 'recommend';

    const orderBy: any = sort === 'new'
      ? { createdAt: 'desc' }
      : sort === 'hot'
        ? { likes: 'desc' }
        : { rankScore: 'desc' };

    const records = await prisma.record.findMany({
      where: { status: 'active' },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, location: true },
        },
      },
    });

    const total = await prisma.record.count({ where: { status: 'active' } });

    res.json({ records: records.map(formatRecord), total, page, limit, hasMore: page * limit < total });
  } catch (err) {
    console.error('Get records error:', err);
    res.status(500).json({ error: '获取战绩失败' });
  }
});

// GET /api/records/:id - 单条战绩详情
router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const record = await prisma.record.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, location: true },
      },
    },
  });
  if (!record || record.status === 'deleted') {
    res.status(404).json({ error: '战绩不存在' });
    return;
  }
  res.json(formatRecord(record));
});

// DELETE /api/records/:id - 删除战绩
router.delete('/:id', authRequired, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const record = await prisma.record.findUnique({ where: { id } });

  if (!record) {
    res.status(404).json({ error: '战绩不存在' });
    return;
  }
  if (record.userId !== req.user!.userId) {
    res.status(403).json({ error: '无权删除' });
    return;
  }

  await prisma.record.update({
    where: { id },
    data: { status: 'deleted' },
  });

  res.json({ success: true });
});

// POST /api/records/:id/like - 点赞
router.post('/:id/like', authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const recordId = parseInt(req.params.id);

  const existing = await prisma.like.findFirst({
    where: { userId, targetType: 'record', targetId: recordId },
  });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.record.update({ where: { id: recordId }, data: { likes: { decrement: 1 } } });
    res.json({ liked: false });
    return;
  }

  await prisma.like.create({
    data: { userId, targetType: 'record', targetId: recordId },
  });
  await prisma.record.update({ where: { id: recordId }, data: { likes: { increment: 1 } } });

  await addLayer(userId, 'interaction');

  res.json({ liked: true });
});

// POST /api/records/:id/comment - 评论
router.post('/:id/comment', authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const recordId = parseInt(req.params.id);
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }

  const comment = await prisma.comment.create({
    data: { userId, targetType: 'record', targetId: recordId, content },
    include: {
      user: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });

  await prisma.record.update({ where: { id: recordId }, data: { comments: { increment: 1 } } });

  res.status(201).json(comment);
});

// GET /api/records/:id/comments - 获取评论
router.get('/:id/comments', async (req: Request, res: Response) => {
  const recordId = parseInt(req.params.id);
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;

  const comments = await prisma.comment.findMany({
    where: { targetType: 'record', targetId: recordId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      user: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });

  res.json(comments);
});

export default router;
