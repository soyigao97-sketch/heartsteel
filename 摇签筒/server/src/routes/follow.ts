import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';

const router = Router();

// POST /api/follow/:userId - 关注/取关用户
router.post('/:userId', authRequired, async (req: Request, res: Response) => {
  try {
    const followerId = req.user!.userId;
    const followingId = parseInt(req.params.userId);

    if (followerId === followingId) {
      res.status(400).json({ error: '不能关注自己' });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      // 取关
      await prisma.follow.delete({ where: { id: existing.id } });
      res.json({ following: false });
    } else {
      // 关注
      await prisma.follow.create({
        data: { followerId, followingId },
      });
      res.json({ following: true });
    }
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// GET /api/follow/check/:userId - 检查是否已关注
router.get('/check/:userId', authRequired, async (req: Request, res: Response) => {
  const followerId = req.user!.userId;
  const followingId = parseInt(req.params.userId);

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId },
    },
  });

  res.json({ following: !!follow });
});

// GET /api/follow/followers/:userId - 粉丝列表
router.get('/followers/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const follows = await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: { select: { id: true, nickname: true, avatarUrl: true, heartLayer: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(follows.map(f => f.follower));
});

// GET /api/follow/following/:userId - 关注列表
router.get('/following/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: { select: { id: true, nickname: true, avatarUrl: true, heartLayer: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(follows.map(f => f.following));
});

// GET /api/follow/counts/:userId - 关注数和粉丝数
router.get('/counts/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const [followingCount, followersCount] = await Promise.all([
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.follow.count({ where: { followingId: userId } }),
  ]);
  res.json({ followingCount, followersCount });
});

export default router;
