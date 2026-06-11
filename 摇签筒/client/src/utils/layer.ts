import type { LayerTier } from '../types';

export function getLayerTier(layer: number): LayerTier {
  if (layer >= 500) return { title: '不灭心钢', cssClass: 'layer-diamond' };
  if (layer >= 200) return { title: '心之钢', cssClass: 'layer-platinum' };
  if (layer >= 50) return { title: '精钢', cssClass: 'layer-gold' };
  if (layer >= 10) return { title: '锻钢', cssClass: 'layer-silver' };
  return { title: '初钢', cssClass: 'layer-bronze' };
}

export function getCardHeight(layer: number): number {
  return Math.min(500, 300 + Math.floor(layer / 50) * 20);
}

export function formatKDA(k: number, d: number, a: number): string {
  return `${k}/${d}/${a}`;
}

export function kdaRatio(k: number, d: number): string {
  if (d === 0) return k > 0 ? '完美' : '-';
  return ((k + 0) / d).toFixed(2);
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
