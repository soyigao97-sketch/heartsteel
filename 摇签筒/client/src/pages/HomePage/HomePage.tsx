import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import LayerBadge from '../../components/ui/LayerBadge'
import { HeartsteelSm } from '../../components/ui/HeartsteelIcon'
import RecordCard from '../../components/card/RecordCard'
import RecordDetailModal from './RecordDetailModal'
import PublishRecordModal from './PublishRecordModal'
import type { Record } from '../../types'

export default function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [records, setRecords] = useState<Record[]>([])
  const [sort, setSort] = useState<'recommend' | 'funny' | 'girl'>('recommend')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null)
  const [showPublish, setShowPublish] = useState(false)

  const fetchRecords = async (pageNum: number, reset = false) => {
    setLoading(true)
    try {
      const { data } = await api.get('/records', { params: { page: pageNum, limit: 10, sort } })
      setRecords(prev => reset ? data.records : [...prev, ...data.records])
      setHasMore(data.hasMore)
    } catch {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords(1, true)
  }, [sort])

  const handleSignIn = async () => {
    try {
      const { data } = await api.post('/user/sign')
      if (data.success) {
        toast.success(`签到成功！+${data.added}层`)
        useAuthStore.getState().fetchMe()
      } else {
        toast(data.message || '今日已签到')
      }
    } catch {
      toast.error('签到失败')
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchRecords(nextPage)
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <HeartsteelSm size={28} />
            <span className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
              心之钢
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSignIn} className="btn-primary text-sm px-3 py-1">
              签到+1
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {user && <LayerBadge layer={user.heartLayer} />}
              <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* 筛选 + 发布 */}
        <div className="flex items-center justify-between px-4 py-2 max-w-2xl mx-auto">
          <div className="flex gap-2">
            {(['recommend', 'funny', 'girl'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setSort(s); setPage(1) }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  sort === s ? 'bg-yellow-500 text-gray-900 font-bold' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {{ recommend: '推荐', funny: '整活', girl: '妹子' }[s]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 战绩瀑布流 */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {records.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">🏟️</div>
            <p>还没有战绩，快来晒出你的高光时刻！</p>
          </div>
        )}

        <div className="columns-1 md:columns-2 gap-4">
          {records.map((record) => (
            <div key={record.id} className="mb-4 break-inside-avoid">
              <RecordCard
                record={record}
                onClick={() => setSelectedRecord(record)}
              />
            </div>
          ))}
        </div>

        {hasMore && records.length > 0 && (
          <div className="text-center mt-6">
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn-secondary w-full max-w-sm"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </main>

      {/* 详情弹窗 */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onRefresh={() => fetchRecords(1, true)}
        />
      )}

      {/* 发布弹窗 */}
      {showPublish && (
        <PublishRecordModal
          onClose={() => setShowPublish(false)}
          onSuccess={() => {
            setShowPublish(false)
            fetchRecords(1, true)
          }}
        />
      )}
    </div>
  )
}
