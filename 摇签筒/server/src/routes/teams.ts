import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';
import { addLayer } from '../services/layerService';
import { calculateRankScore } from '../services/rankingService';

const router = Router();

// POST /api/teams - 发布组队需求
router.post('/', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await addLayer(userId, 'team_post');
    if (result.added === 0) {
      res.status(400).json({ error: '今日发布组队次数已达上限（2次）' });
      return;
    }

    const { mode, serverRegion, requirement, needCount, voiceRequired, scheduleTime } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const rankScore = calculateRankScore(user?.heartLayer || 0, 0, 0);

    const team = await prisma.teamRequest.create({
      data: {
        userId,
        mode: mode || '海克斯大乱斗',
        serverRegion: serverRegion || null,
        requirement,
        needCount: needCount || 5,
        currentCount: 1,
        voiceRequired: voiceRequired ?? false,
        scheduleTime: scheduleTime ? new Date(scheduleTime) : null,
        rankScore,
      },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, location: true },
        },
      },
    });

    res.status(201).json({ team, layerAdded: result.added });
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ error: '发布失败' });
  }
});

// GET /api/teams - 获取组队列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const mode = req.query.mode as string;
    const voice = req.query.voice as string;

    const where: any = { status: 'open' };
    if (mode) where.mode = mode;
    if (voice === '1') where.voiceRequired = true;

    const teams = await prisma.teamRequest.findMany({
      where,
      orderBy: { rankScore: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, location: true },
        },
      },
    });

    const total = await prisma.teamRequest.count({ where });
    res.json({ teams, total, page, limit, hasMore: page * limit < total });
  } catch (err) {
    console.error('Get teams error:', err);
    res.status(500).json({ error: '获取组队列表失败' });
  }
});

// GET /api/teams/:id - 组队详情
router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const team = await prisma.teamRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, nickname: true, avatarUrl: true, heartLayer: true, gameRegion: true, gameName: true },
      },
    },
  });
  if (!team) {
    res.status(404).json({ error: '组队不存在' });
    return;
  }
  res.json(team);
});

// POST /api/teams/:id/apply - 申请加入组队（新的申请制流程）
router.post('/:id/apply', authRequired, async (req: Request, res: Response) => {
  try {
    const applicantId = req.user!.userId;
    const teamId = parseInt(req.params.id);

    const team = await prisma.teamRequest.findUnique({
      where: { id: teamId },
      include: { user: { select: { id: true, nickname: true } } },
    });

    if (!team) {
      res.status(404).json({ error: '组队不存在' });
      return;
    }
    if (team.status !== 'open') {
      res.status(400).json({ error: '该队伍已满员或已取消' });
      return;
    }
    if (team.userId === applicantId) {
      res.status(400).json({ error: '不能申请自己的队伍' });
      return;
    }

    // 检查是否已有待处理的申请
    const existingApp = await prisma.teamApplication.findUnique({
      where: { teamId_applicantId: { teamId, applicantId } },
    });
    if (existingApp && existingApp.status === 'pending') {
      res.status(400).json({ error: '你已提交过申请，等待队长回复中' });
      return;
    }

    // 创建私聊房间 → 发送申请消息
    const roomId = uuidv4();
    await prisma.chatRoom.create({
      data: {
        id: roomId,
        type: 'private',
        members: {
          create: [{ userId: applicantId }, { userId: team.userId }],
        },
      },
    });

    // 发送自动申请消息
    const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
    await prisma.message.create({
      data: {
        chatRoomId: roomId,
        senderId: applicantId,
        messageType: 'text',
        content: `📢 组队申请：${applicant?.nickname} 申请加入你的「${team.mode}」队伍！回复此消息即表示批准加入。`,
      },
    });

    // 创建申请记录
    await prisma.teamApplication.create({
      data: { teamId, applicantId, chatRoomId: roomId },
    });

    // 给申请者加心之钢层数
    const layerResult = await addLayer(applicantId, 'team_post');

    res.json({ success: true, message: '申请已发送，等待队长回复', roomId, layerAdded: layerResult.added });
  } catch (err) {
    console.error('Apply team error:', err);
    res.status(500).json({ error: '申请失败' });
  }
});

// POST /api/teams/:id/cancel - 取消组队
router.post('/:id/cancel', authRequired, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const team = await prisma.teamRequest.findUnique({ where: { id } });

  if (!team) {
    res.status(404).json({ error: '组队不存在' });
    return;
  }
  if (team.userId !== req.user!.userId) {
    res.status(403).json({ error: '无权取消' });
    return;
  }

  await prisma.teamRequest.update({ where: { id }, data: { status: 'cancelled' } });

  if (team.groupChatId) {
    await prisma.chatRoom.update({
      where: { id: team.groupChatId },
      data: { isArchived: true },
    });
  }

  // 拒绝所有待处理申请
  await prisma.teamApplication.updateMany({
    where: { teamId: id, status: 'pending' },
    data: { status: 'rejected' },
  });

  res.json({ success: true });
});

export default router;
