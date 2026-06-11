import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../models/prisma';
import { config } from '../config';
import type { JwtPayload } from '../middleware/auth';
import { addLayer } from '../services/layerService';

export function setupChatHandlers(io: Server) {
  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('请先登录'));
      }
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('登录已过期'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    console.log(`[Socket] User ${user.nickname} (${user.userId}) connected`);

    // 加入房间
    socket.on('join_room', async (roomId: string) => {
      // 检查用户是否为房间成员
      const member = await prisma.chatRoomMember.findUnique({
        where: { roomId_userId: { roomId, userId: user.userId } },
      });
      if (!member) {
        socket.emit('error', { message: '无权加入该房间' });
        return;
      }

      socket.join(roomId);
      console.log(`[Socket] ${user.nickname} joined room ${roomId}`);

      // 通知房间其他人
      socket.to(roomId).emit('user_joined', {
        userId: user.userId,
        nickname: user.nickname,
      });
    });

    // 离开房间
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
    });

    // 发送消息
    socket.on('send_message', async (data: {
      roomId: string;
      content: string;
      messageType?: string;
    }) => {
      try {
        const { roomId, content, messageType = 'text' } = data;

        if (!content || content.trim().length === 0) return;

        // 检查房间是否已归档
        const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
        if (!room || room.isArchived) {
          socket.emit('error', { message: '聊天室已关闭' });
          return;
        }

        // 保存消息
        const message = await prisma.message.create({
          data: {
            chatRoomId: roomId,
            senderId: user.userId,
            messageType,
            content: content.trim(),
          },
          include: {
            sender: {
              select: { id: true, nickname: true, avatarUrl: true, heartLayer: true },
            },
          },
        });

        // 广播给房间所有人
        io.to(roomId).emit('new_message', message);

        // 检查是否有待处理的组队申请（队长回复即批准）
        const pendingApp = await prisma.teamApplication.findFirst({
          where: { chatRoomId: roomId, status: 'pending' },
          include: { team: true },
        });
        if (pendingApp && pendingApp.team.userId === user.userId) {
          // 队长回复 → 批准申请
          await prisma.teamApplication.update({
            where: { id: pendingApp.id },
            data: { status: 'approved' },
          });

          const team = pendingApp.team;
          const newCount = team.currentCount + 1;
          const isFull = newCount >= team.needCount;

          // 创建/获取群聊
          let groupChatId = team.groupChatId;
          if (!groupChatId) {
            groupChatId = uuidv4();
            await prisma.chatRoom.create({
              data: {
                id: groupChatId,
                type: 'group',
                name: `${user.nickname}的组队`,
                teamReqId: team.id,
                archiveAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
            await prisma.chatRoomMember.create({
              data: { roomId: groupChatId, userId: team.userId },
            });
          }

          // 申请者加入群聊
          await prisma.chatRoomMember.upsert({
            where: { roomId_userId: { roomId: groupChatId, userId: pendingApp.applicantId } },
            create: { roomId: groupChatId, userId: pendingApp.applicantId },
            update: {},
          });

          // 更新队伍人数
          await prisma.teamRequest.update({
            where: { id: team.id },
            data: {
              currentCount: newCount,
              status: isFull ? 'full' : 'open',
              groupChatId,
            },
          });

          // 批准后双方加层数
          await addLayer(pendingApp.applicantId, 'team_success');
          if (isFull) await addLayer(team.userId, 'team_success');

          // 发系统消息通知申请者
          await prisma.message.create({
            data: {
              chatRoomId: roomId,
              senderId: user.userId,
              messageType: 'text',
              content: `✅ 申请已通过！你已加入「${team.mode}」队伍群聊。${isFull ? '队伍已满员！' : ''}`,
            },
          });

          // 通知申请者
          io.to(roomId).emit('application_approved', { teamId: team.id, groupChatId });
        }
      } catch (err) {
        console.error('[Socket] Send message error:', err);
        socket.emit('error', { message: '发送失败' });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[Socket] User ${user.nickname} disconnected`);
    });
  });
}
