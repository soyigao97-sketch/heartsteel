import { useNavigate } from 'react-router-dom'
import { getLayerTier, getCardHeight, timeAgo } from '../../utils/layer'
import LayerBadge from '../ui/LayerBadge'
import type { TeamRequest } from '../../types'

interface Props {
  team: TeamRequest
  onJoin: () => void
}

export default function TeamCard({ team, onJoin }: Props) {
  const navigate = useNavigate()
  const user = team.user
  if (!user) return null

  const tier = getLayerTier(user.heartLayer)
  const height = getCardHeight(user.heartLayer)

  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/profile/${user.id}`)
  }

  const scheduleTime = team.scheduleTime
    ? new Date(team.scheduleTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '立即'

  return (
    <div
      className={`rounded-xl overflow-hidden ${tier.cssClass}`}
      style={{ minHeight: `${height - 50}px` }}
    >
      {/* 用户信息 */}
      <div onClick={goToProfile} className="flex items-center gap-2 p-3 bg-black/20 hover:bg-black/30 cursor-pointer transition-colors">
        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">👤</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate hover:text-yellow-500">{user.nickname}</p>
          {(user.gameRegion || user.location) ? (
            <p className="text-xs text-gray-500 truncate">
              {user.gameRegion && `🎮 ${user.gameRegion}`}
              {user.gameRegion && user.location && ' · '}
              {user.location && `📍 ${user.location}`}
            </p>
          ) : (
            <p className="text-xs text-gray-400">{tier.title}</p>
          )}
        </div>
        <LayerBadge layer={user.heartLayer} />
      </div>

      {/* 内容 */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {team.serverRegion && (
            <span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded text-xs">🎮 {team.serverRegion}</span>
          )}
          <span className="bg-gray-800 px-2 py-0.5 rounded text-xs">{team.mode}</span>
          {team.voiceRequired && (
            <span className="bg-green-900 text-green-400 px-2 py-0.5 rounded text-xs">🎤 语音</span>
          )}
        </div>

        {team.requirement && (
          <p className="text-sm text-gray-300">{team.requirement}</p>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-yellow-500 font-bold">
            {team.currentCount}/{team.needCount} 人
          </span>
          <span className="text-gray-500">⏰ {scheduleTime}</span>
        </div>

        <button
          onClick={onJoin}
          disabled={team.status !== 'open'}
          className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
            team.status === 'open'
              ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {team.status === 'full' ? '已满员' : team.status === 'cancelled' ? '已取消' : '申请加入 +1层'}
        </button>
      </div>
    </div>
  )
}
