import { getLayerTier } from '../../utils/layer'

interface LayerBadgeProps {
  layer: number
  size?: 'sm' | 'md' | 'lg'
}

export default function LayerBadge({ layer, size = 'sm' }: LayerBadgeProps) {
  const tier = getLayerTier(layer)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full ${sizeClasses[size]} ${tier.cssClass}`}
      title={`心之钢层数: ${layer} - ${tier.title}`}
    >
      <img src="/heartsteel-icon.png" alt="" className="w-4 h-auto inline-block align-middle" />
      Lv{layer}
    </span>
  )
}
