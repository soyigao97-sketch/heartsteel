import prisma from '../models/prisma';

// 层数获取规则
const LAYER_RULES = {
  sign:        { amount: 1, dailyMax: 1, dbField: 'signIn' as const },
  dynamic:     { amount: 1, dailyMax: 1, dbField: 'dynamic' as const },
  team_post:   { amount: 2, dailyMax: 2, dbField: 'teamPost' as const },
  team_success:{ amount: 3, dailyMax: 1, dbField: null },
  record:      { amount: 2, dailyMax: 3, dbField: 'record' as const },
  interaction: { amount: 1, dailyMax: 3, dbField: 'interaction' as const },
};

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getOrCreateDailyLimit(userId: number) {
  const today = todayDate();
  let limit = await prisma.dailyLimit.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (!limit) {
    limit = await prisma.dailyLimit.create({
      data: { userId, date: today },
    });
  }
  return limit;
}

/**
 * 检查并增加心之钢层数
 * @returns 实际增加的层数 (0 表示已达上限)
 */
export async function addLayer(
  userId: number,
  reason: keyof typeof LAYER_RULES
): Promise<{ added: number; total: number }> {
  const rule = LAYER_RULES[reason];
  const limit = await getOrCreateDailyLimit(userId);

  // 检查每日上限
  if (rule.dbField) {
    const current = (limit as any)[rule.dbField];
    if (current >= rule.dailyMax) {
      return { added: 0, total: await getLayer(userId) };
    }
    // 更新每日计数（布尔字段设 true，数字字段 +1）
    const isBoolField = rule.dbField === 'signIn' || rule.dbField === 'dynamic';
    await prisma.dailyLimit.update({
      where: { id: limit.id },
      data: isBoolField
        ? { [rule.dbField]: true }
        : { [rule.dbField]: { increment: 1 } },
    });
  }

  // 更新数据库
  await prisma.layerLog.create({
    data: { userId, changeAmount: rule.amount, reason },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { heartLayer: { increment: rule.amount } },
  });

  return { added: rule.amount, total: user.heartLayer };
}

export async function getLayer(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { heartLayer: true },
  });
  return user?.heartLayer ?? 0;
}

/**
 * 获取层数对应的称号和CSS类
 */
export function getLayerTier(layer: number): { title: string; cssClass: string } {
  if (layer >= 500) return { title: '不灭心钢', cssClass: 'layer-diamond' };
  if (layer >= 200) return { title: '心之钢', cssClass: 'layer-platinum' };
  if (layer >= 50)  return { title: '精钢', cssClass: 'layer-gold' };
  if (layer >= 10)  return { title: '锻钢', cssClass: 'layer-silver' };
  return { title: '初钢', cssClass: 'layer-bronze' };
}

/**
 * 计算卡片高度 (基础300px，每50层+20px，最大500px)
 */
export function getCardHeight(layer: number): number {
  return Math.min(500, 300 + Math.floor(layer / 50) * 20);
}
