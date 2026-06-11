import { useNavigate } from 'react-router-dom'
import { getLayerTier, getCardHeight, timeAgo } from '../../utils/layer'
import LayerBadge from '../ui/LayerBadge'
import type { Record } from '../../types'

interface RecordCardProps {
  record: Record
  onClick: () => void
}

export default function RecordCard({ record, onClick }: RecordCardProps) {
  const navigate = useNavigate()
  const user = record.user
  if (!user) return null

  const tier = getLayerTier(user.heartLayer)
  const height = getCardHeight(user.heartLayer)

  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/profile/${user.id}`)
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] ${tier.cssClass}`}
      style={{ minHeight: `${Math.max(200, height - 50)}px` }}
    >
      {/* 用户信息区 */}
      <div onClick={goToProfile} className="flex items-center gap-2 p-3 bg-black/20 hover:bg-black/30 cursor-pointer transition-colors">
        <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate hover:text-yellow-500">{user.nickname}</p>
          {(user.gameRegion || user.location) && (
            <p className="text-xs text-gray-500 truncate">
              {user.gameRegion && `🎮 ${user.gameRegion}`}
              {user.gameRegion && user.location && ' · '}
              {user.location && `📍 ${user.location}`}
            </p>
          )}
        </div>
        <LayerBadge layer={user.heartLayer} />
      </div>

      {/* 图片区 - 大图展示 */}
      {record.images.length > 0 && (
        <div className={`grid gap-0.5 ${
          record.images.length === 1 ? 'grid-cols-1' :
          record.images.length <= 4 ? 'grid-cols-2' :
          'grid-cols-3'
        }`}>
          {record.images.slice(0, 9).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-full object-cover"
              style={{ maxHeight: record.images.length === 1 ? '240px' : '140px' }}
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* 内容区 - 突出文案 */}
      <div className="p-3">
        {record.description && (
          <p className="text-sm line-clamp-2 mb-2 text-gray-200">{record.description}</p>
        )}
        {!record.description && (
          <p className="text-sm text-gray-500 italic mb-2">分享了一局{record.mode}</p>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{record.mode}</span>
          <span className="text-gray-500">{timeAgo(record.createdAt)}</span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>❤️ {record.likes}</span>
          <span>💬 {record.comments}</span>
        </div>
      </div>
    </div>
  )
}
