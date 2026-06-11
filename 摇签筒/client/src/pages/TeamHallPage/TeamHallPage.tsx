import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { HeartsteelSm } from '../../components/ui/HeartsteelIcon'
import TeamCard from '../../components/card/TeamCard'
import PublishTeamModal from './PublishTeamModal'
import type { TeamRequest } from '../../types'

export default function TeamHallPage() {
  const navigate = useNavigate()
  const { fetchMe } = useAuthStore()
  const [teams, setTeams] = useState<TeamRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filterMode, setFilterMode] = useState('')
  const [filterVoice, setFilterVoice] = useState('')

  const fetchTeams = async (pageNum: number, reset = false) => {
    setLoading(true)
    try {
      const params: any = { page: pageNum, limit: 10 }
      if (filterMode) params.mode = filterMode
      if (filterVoice === '1') params.voice = '1'

      const { data } = await api.get('/teams', { params })
      setTeams(prev => reset ? data.teams : [...prev, ...data.teams])
      setHasMore(data.hasMore)
    } catch {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchTeams(1, true)
  }, [filterMode, filterVoice])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTeams(nextPage)
  }

  const handleApply = async (teamId: number) => {
    try {
      const { data } = await api.post(`/teams/${teamId}/apply`)
      toast.success(data.layerAdded > 0 ? `申请已发送！+${data.layerAdded}层` : '申请已发送！等待队长回复')
      fetchMe()
      fetchTeams(1, true)
      // 跳转到私聊页面
      if (data.roomId) {
        navigate(`/chat/${data.roomId}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || '申请失败')
    }
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 顶部 */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <HeartsteelSm size={28} />
            <h1 className="text-lg font-bold">组队大厅</h1>
          </div>
          <button onClick={() => setShowPublish(true)} className="btn-primary text-sm px-3 py-1">
            📢 发布组队需求
          </button>
        </div>

        {/* 筛选 */}
        <div className="flex gap-2 px-4 py-2 max-w-2xl mx-auto overflow-x-auto">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="text-sm bg-gray-800 border-gray-700"
          >
            <option value="">全部模式</option>
            <option value="海克斯大乱斗">海克斯大乱斗</option>
            <option value="排位赛">排位赛</option>
            <option value="匹配模式">匹配模式</option>
          </select>
          <select
            value={filterVoice}
            onChange={(e) => setFilterVoice(e.target.value)}
            className="text-sm bg-gray-800 border-gray-700"
          >
            <option value="">语音不限</option>
            <option value="1">需要语音</option>
          </select>
        </div>
      </header>

      {/* 组队卡片列表 */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {teams.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">⚔️</div>
            <p>暂无组队需求，快来发车！</p>
          </div>
        )}

        <div className="columns-1 md:columns-2 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="mb-4 break-inside-avoid">
              <TeamCard team={team} onJoin={() => handleApply(team.id)} />
            </div>
          ))}
        </div>

        {hasMore && teams.length > 0 && (
          <div className="text-center mt-6">
            <button onClick={loadMore} disabled={loading} className="btn-secondary w-full max-w-sm">
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </main>

      {showPublish && (
        <PublishTeamModal
          onClose={() => setShowPublish(false)}
          onSuccess={() => {
            setShowPublish(false)
            fetchTeams(1, true)
          }}
        />
      )}
    </div>
  )
}
