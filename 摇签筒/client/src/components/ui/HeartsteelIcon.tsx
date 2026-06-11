const ICON_URL = '/heartsteel-icon.png'

interface Props {
  size?: number
  className?: string
}

// 心之钢图标 - 使用LOL心之钢装备原图
export default function HeartsteelIcon({ size = 48, className }: Props) {
  return (
    <img
      src={ICON_URL}
      alt="心之钢"
      width={size}
      className={className}
      style={{ objectFit: 'contain', maxWidth: '100%' }}
    />
  )
}

// 小型心之钢图标 (用于导航栏等)
export function HeartsteelSm({ size = 28, className }: Props) {
  return (
    <img
      src={ICON_URL}
      alt="心之钢"
      width={size}
      className={className}
      style={{ objectFit: 'contain', maxWidth: '100%' }}
    />
  )
}
