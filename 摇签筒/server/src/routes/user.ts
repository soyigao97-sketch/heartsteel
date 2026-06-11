import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';
import { addLayer, getLayerTier } from '../services/layerService';

const router = Router();

// POST /api/user/sign - 每日签到
router.post('/sign', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await addLayer(userId, 'sign');

    if (result.added === 0) {
      res.json({ success: false, message: '今日已签到', ...result });
      return;
    }

    // 更新累计签到天数
    await prisma.user.update({
      where: { id: userId },
      data: { totalSignDays: { increment: 1 } },
    });

    res.json({ success: true, message: `签到成功！+${result.added}层`, ...result });
  } catch (err) {
    console.error('Sign error:', err);
    res.status(500).json({ error: '签到失败' });
  }
});

// GET /api/user/sign-status - 查询今日签到状态
router.get('/sign-status', authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = await prisma.dailyLimit.findUnique({
    where: {
      userId_date: { userId, date: today },
    },
  });

  res.json({
    signed: limit?.signIn ?? false,
    todayDynamic: limit?.dynamic ?? false,
    todayTeamPost: limit?.teamPost ?? 0,
    todayRecord: limit?.record ?? 0,
    todayInteraction: limit?.interaction ?? 0,
  });
});

// GET /api/user/profile/:id - 获取用户主页
router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        heartLayer: true,
        gameRegion: true,
        gameName: true,
        location: true,
        phone: true,
        wechatId: true,
        totalSignDays: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const tier = getLayerTier(user.heartLayer);

    // 关注数
    const [followingCount, followersCount] = await Promise.all([
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

    // 最近战绩
    const recentRecords = await prisma.record.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // 最近动态
    const recentDynamics = await prisma.dynamic.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      ...user,
      tier,
      followingCount,
      followersCount,
      recentRecords,
      recentDynamics,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// PUT /api/user/profile - 更新个人信息
router.put('/profile', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { nickname, gameRegion, gameName, avatarUrl, location, wechatId } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nickname && { nickname }),
        ...(gameRegion !== undefined && { gameRegion }),
        ...(gameName !== undefined && { gameName }),
        ...(avatarUrl && { avatarUrl }),
        ...(location !== undefined && { location }),
        ...(wechatId !== undefined && { wechatId }),
      },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        heartLayer: true,
        gameRegion: true,
        gameName: true,
        location: true,
        phone: true,
        wechatId: true,
        totalSignDays: true,
        isAdmin: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// GET /api/user/layer-logs - 获取层数流水
router.get('/layer-logs', authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;

  const logs = await prisma.layerLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  res.json(logs);
});

export default router;
