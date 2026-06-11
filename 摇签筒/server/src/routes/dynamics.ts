import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';
import { addLayer } from '../services/layerService';

const router = Router();

// POST /api/dynamics - 发布动态
router.post('/', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { content, imageUrl } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: '内容不能为空' });
      return;
    }
    if (content.length > 200) {
      res.status(400).json({ error: '内容最多200字' });
      return;
    }

    const result = await addLayer(userId, 'dynamic');
    if (result.added === 0) {
      res.status(400).json({ error: '今日已发布过动态' });
      return;
    }

    const dynamic = await prisma.dynamic.create({
      data: { userId, content, imageUrl },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, location: true },
        },
      },
    });

    res.status(201).json({ dynamic, layerAdded: result.added });
  } catch (err) {
    console.error('Create dynamic error:', err);
    res.status(500).json({ error: '发布失败' });
  }
});

// GET /api/dynamics - 获取动态列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;

    const where: any = {};
    if (userId) where.userId = userId;

    const dynamics = await prisma.dynamic.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, location: true },
        },
      },
    });

    res.json(dynamics);
  } catch (err) {
    console.error('Get dynamics error:', err);
    res.status(500).json({ error: '获取动态失败' });
  }
});

// POST /api/dynamics/:id/like - 点赞动态
router.post('/:id/like', authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dynamicId = parseInt(req.params.id);

  const existing = await prisma.like.findFirst({
    where: { userId, targetType: 'dynamic', targetId: dynamicId },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.dynamic.update({ where: { id: dynamicId }, data: { likes: { decrement: 1 } } });
    res.json({ liked: false });
    return;
  }

  await prisma.like.create({
    data: { userId, targetType: 'dynamic', targetId: dynamicId },
  });
  await prisma.dynamic.update({ where: { id: dynamicId }, data: { likes: { increment: 1 } } });

  await addLayer(userId, 'interaction');

  res.json({ liked: true });
});

// POST /api/dynamics/:id/comment - 评论动态
router.post('/:id/comment', authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dynamicId = parseInt(req.params.id);
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: '评论内容不能为空' });
    return;
  }

  const comment = await prisma.comment.create({
    data: { userId, targetType: 'dynamic', targetId: dynamicId, content },
    include: {
      user: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });

  await prisma.dynamic.update({ where: { id: dynamicId }, data: { comments: { increment: 1 } } });

  res.status(201).json(comment);
});

export default router;
