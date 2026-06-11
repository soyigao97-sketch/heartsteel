import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import LayerBadge from '../../components/ui/LayerBadge'
import { formatKDA, kdaRatio, timeAgo } from '../../utils/layer'
import type { Record, Comment } from '../../types'

interface Props {
  record: Record
  onClose: () => void
  onRefresh: () => void
}

export default function RecordDetailModal({ record, onClose, onRefresh }: Props) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [likeCount, setLikeCount] = useState(record.likes)
  const [commentCount, setCommentCount] = useState(record.comments)

  useEffect(() => {
    fetchComments()
  }, [])

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/records/${record.id}/comments`)
      setComments(data)
    } catch {}
  }

  const handleLike = async () => {
    try {
      const { data } = await api.post(`/records/${record.id}/like`)
      setLiked(data.liked)
      setLikeCount(prev => data.liked ? prev + 1 : prev - 1)
    } catch {
      toast.error('操作失败')
    }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    try {
      const { data } = await api.post(`/records/${record.id}/comment`, { content: commentText })
      setComments(prev => [data, ...prev])
      setCommentCount(prev => prev + 1)
      setCommentText('')
      toast.success('评论成功')
    } catch {
      toast.error('评论失败')
    }
  }

  const recordUser = record.user

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl z-10">
          ✕
        </button>

        {/* 图片轮播 */}
        {record.images.length > 0 && (
          <div className="grid grid-cols-1 gap-1">
            {record.images.map((url, i) => (
              <img key={i} src={url} alt="" className="w-full max-h-80 object-cover rounded-t-2xl" />
            ))}
          </div>
        )}

        {/* 内容 */}
        <div className="p-4 space-y-3">
          {/* 用户信息 - 可点击进入主页 */}
          <div
            onClick={() => { onClose(); navigate(`/profile/${recordUser?.id}`) }}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 p-2 -mx-2 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
              {recordUser?.avatarUrl ? (
                <img src={recordUser.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">👤</div>
              )}
            </div>
            <div>
              <p className="font-bold hover:text-yellow-500">{recordUser?.nickname}</p>
              <p className="text-xs text-gray-500">
                {recordUser?.gameRegion && `🎮 ${recordUser.gameRegion}`}
                {recordUser?.location && ` · 📍 ${recordUser.location}`}
                {recordUser?.gameRegion || recordUser?.location ? ' · ' : ''}
                {timeAgo(record.createdAt)}
              </p>
            </div>
            {recordUser && <LayerBadge layer={recordUser.heartLayer} />}
          </div>

          {/* KDA */}
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-mono font-bold text-yellow-500">
              {formatKDA(record.kdaKill, record.kdaDeath, record.kdaAssist)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              KDA Ratio: {kdaRatio(record.kdaKill, record.kdaDeath)} | {record.mode}
            </div>
          </div>

          {record.description && (
            <p className="text-sm text-gray-300">{record.description}</p>
          )}

          {/* 互动按钮 */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-800">
            <button onClick={handleLike} className="flex items-center gap-1 text-sm hover:text-red-400 transition-colors">
              {liked ? '❤️' : '🤍'} {likeCount}
            </button>
            <span className="flex items-center gap-1 text-sm text-gray-400">
              💬 {commentCount}
            </span>
          </div>

          {/* 评论列表 */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-xs">
                  {comment.user?.avatarUrl ? (
                    <img src={comment.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : '👤'}
                </div>
                <div>
                  <span className="text-xs font-bold text-yellow-500">{comment.user?.nickname}</span>
                  <p className="text-sm text-gray-300">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 评论输入 */}
          <div className="flex gap-2 pt-2 border-t border-gray-800">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="说点什么..."
              className="flex-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button onClick={handleComment} className="btn-primary text-sm">发送</button>
          </div>
        </div>
      </div>
    </div>
  )
}
