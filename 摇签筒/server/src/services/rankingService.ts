/**
 * 推流分数计算
 * score = (heartLayer * 0.6) + (freshness * 0.3) + (interaction * 0.1)
 */
export function calculateRankScore(
  heartLayer: number,
  hoursSincePost: number,
  interactionScore: number,
): number {
  // 新鲜度：48小时内线性衰减
  const freshness = Math.max(0, 1 - hoursSincePost / 48);

  // 互动热度归一化到 0-100
  const interactionNorm = Math.min(100, interactionScore);

  const score = (heartLayer * 0.6) + (freshness * 30) + (interactionNorm * 0.1);
  return Math.round(score * 100) / 100;
}

/**
 * 计算互动分数
 */
export function calcInteractionScore(likes: number, comments: number): number {
  return likes + comments * 2;
}
