import { Router, Request, Response } from 'express';
import prisma from '../models/prisma';
import { authRequired } from '../middleware/auth';

const router = Router();

// GET /api/chat/rooms - 获取用户的聊天室列表
router.get('/rooms', authRequired, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const members = await prisma.chatRoomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          members: {
            include: {
              user: { select: { id: true, nickname: true, avatarUrl: true, heartLayer: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true, messageType: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const rooms = members.map(m => ({
    id: m.room.id,
    type: m.room.type,
    name: m.room.name,
    isArchived: m.room.isArchived,
    members: m.room.members.map(mem => mem.user),
    lastMessage: m.room.messages[0] || null,
    teamReqId: m.room.teamReqId,
  }));

  res.json(rooms);
});

// GET /api/chat/messages/:roomId - 获取聊天历史
router.get('/messages/:roomId', authRequired, async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 30;

  // 检查用户是否在房间中
  const member = await prisma.chatRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId: req.user!.userId } },
  });
  if (!member) {
    res.status(403).json({ error: '不在该聊天室中' });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { chatRoomId: roomId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      sender: { select: { id: true, nickname: true, avatarUrl: true, heartLayer: true } },
    },
  });

  res.json(messages.reverse());
});

// POST /api/chat/private - 创建或获取私聊房间
router.post('/private', authRequired, async (req: Request, res: Response) => {
  const { targetUserId } = req.body;
  const userId = req.user!.userId;

  if (userId === targetUserId) {
    res.status(400).json({ error: '不能和自己私聊' });
    return;
  }

  // 查找已有私聊房间
  const existingMembers = await prisma.chatRoomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          members: { select: { userId: true } },
        },
      },
    },
  });

  const privateRoom = existingMembers.find(m => {
    if (m.room.type !== 'private') return false;
    return m.room.members.some(mem => mem.userId === targetUserId);
  });

  if (privateRoom) {
    res.json({ roomId: privateRoom.roomId });
    return;
  }

  // 创建新的私聊房间
  const room = await prisma.chatRoom.create({
    data: {
      id: `${userId}_${targetUserId}_${Date.now()}`,
      type: 'private',
      members: {
        create: [
          { userId },
          { userId: targetUserId },
        ],
      },
    },
  });

  res.json({ roomId: room.id });
});

export default router;
