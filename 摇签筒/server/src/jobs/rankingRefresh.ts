import cron from 'node-cron';
import prisma from '../models/prisma';
import { calculateRankScore, calcInteractionScore } from '../services/rankingService';

/**
 * 每5分钟刷新一次内容的推流分数
 */
export function startRankingRefreshJob() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Job] Ranking refresh started...');
    try {
      // 刷新战绩排名
      const records = await prisma.record.findMany({
        where: { status: 'active' },
        include: { user: { select: { heartLayer: true } } },
      });

      for (const record of records) {
        const hoursSincePost = (Date.now() - record.createdAt.getTime()) / (1000 * 60 * 60);
        const interactionScore = calcInteractionScore(record.likes, record.comments);
        const newScore = calculateRankScore(
          record.user.heartLayer,
          hoursSincePost,
          interactionScore,
        );

        await prisma.record.update({
          where: { id: record.id },
          data: { rankScore: newScore },
        });
      }

      // 刷新组队排名
      const teams = await prisma.teamRequest.findMany({
        where: { status: 'open' },
        include: { user: { select: { heartLayer: true } } },
      });

      for (const team of teams) {
        const hoursSincePost = (Date.now() - team.createdAt.getTime()) / (1000 * 60 * 60);
        const newScore = calculateRankScore(team.user.heartLayer, hoursSincePost, 0);
        await prisma.teamRequest.update({
          where: { id: team.id },
          data: { rankScore: newScore },
        });
      }

      console.log(`[Job] Ranking refresh done. Records: ${records.length}, Teams: ${teams.length}`);
    } catch (err) {
      console.error('[Job] Ranking refresh error:', err);
    }
  });

  // 每小时归档过期的群聊
  cron.schedule('0 * * * *', async () => {
    console.log('[Job] Archive expired chat rooms...');
    try {
      const result = await prisma.chatRoom.updateMany({
        where: {
          isArchived: false,
          archiveAt: { lte: new Date() },
        },
        data: { isArchived: true },
      });
      console.log(`[Job] Archived ${result.count} chat rooms`);
    } catch (err) {
      console.error('[Job] Archive error:', err);
    }
  });

  console.log('[Job] Ranking refresh scheduled (every 5 min)');
  console.log('[Job] Chat room archiver scheduled (every hour)');
}
