import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { timeAgo } from '../../utils/layer'
import type { Report } from '../../types'

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [tab, setTab] = useState<'reports' | 'users' | 'adjust'>('reports')
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [adjustUserId, setAdjustUserId] = useState('')
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')

  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/')
      toast.error('无管理员权限')
      return
    }
    if (tab === 'reports') fetchReports()
    if (tab === 'users') fetchUsers()
  }, [tab, user])

  const fetchReports = async () => {
    try {
      const { data } = await api.get('/admin/reports', { params: { status: 'pending' } })
      setReports(data.reports)
    } catch {}
  }

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users')
      setUsers(data.users)
    } catch {}
  }

  const handleReport = async (reportId: number, action: 'approve' | 'dismiss') => {
    try {
      await api.post(`/admin/reports/${reportId}/handle`, { action })
      toast.success(action === 'approve' ? '已下架内容' : '已驳回举报')
      fetchReports()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleAdjustLayer = async () => {
    if (!adjustUserId || !adjustAmount) {
      toast.error('请填写完整信息')
      return
    }
    try {
      await api.post('/admin/adjust-layer', {
        userId: parseInt(adjustUserId),
        amount: adjustAmount,
        reason: adjustReason || 'admin_adjust',
      })
      toast.success('层数调整成功')
      setAdjustUserId('')
      setAdjustAmount(0)
      setAdjustReason('')
    } catch {
      toast.error('调整失败')
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="text-gray-400 hover:text-white">←</button>
        <h1 className="text-lg font-bold">🛡️ 管理员后台</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* 标签切换 */}
        <div className="flex gap-2 mb-6">
          {(['reports', 'users', 'adjust'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === t ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {{ reports: '举报管理', users: '用户列表', adjust: '层数调整' }[t]}
            </button>
          ))}
        </div>

        {/* 举报管理 */}
        {tab === 'reports' && (
          <div className="space-y-4">
            <h2 className="font-bold">📋 待处理举报</h2>
            {reports.length === 0 && (
              <p className="text-gray-500 text-center py-8">暂无待处理举报</p>
            )}
            {reports.map((report) => (
              <div key={report.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-yellow-500">
                    {report.reporter?.nickname} 举报
                  </span>
                  <span className="text-xs text-gray-500">{timeAgo(report.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-300 mb-1">
                  类型: <span className="text-gray-400">{report.targetType}</span> |
                  ID: <span className="text-gray-400">{report.targetId}</span>
                </p>
                <p className="text-sm mb-3">原因: {report.reason}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleReport(report.id, 'approve')} className="btn-danger text-sm">
                    下架内容
                  </button>
                  <button onClick={() => handleReport(report.id, 'dismiss')} className="btn-secondary text-sm">
                    驳回
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 用户列表 */}
        {tab === 'users' && (
          <div className="space-y-4">
            <h2 className="font-bold">👥 用户列表 (按层数排序)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-2">ID</th>
                    <th>昵称</th>
                    <th>层数</th>
                    <th>签到</th>
                    <th>注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b border-gray-800/50">
                      <td className="py-2">{u.id}</td>
                      <td>{u.nickname}</td>
                      <td className="text-yellow-500 font-bold">{u.heartLayer}</td>
                      <td>{u.totalSignDays}天</td>
                      <td className="text-gray-500">{timeAgo(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 层数调整 */}
        {tab === 'adjust' && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
            <h2 className="font-bold flex items-center gap-2"><img src="/heartsteel-icon.png" alt="" className="w-6 h-auto" /> 手动调整心之钢层数</h2>
            <div>
              <label className="text-xs text-gray-500 block mb-1">用户 ID</label>
              <input
                type="number"
                value={adjustUserId}
                onChange={(e) => setAdjustUserId(e.target.value)}
                className="w-full"
                placeholder="输入用户ID"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">调整数量 (正数增加，负数减少)</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">调整原因</label>
              <input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full"
                placeholder="奖励/惩罚..."
              />
            </div>
            <button onClick={handleAdjustLayer} className="btn-primary w-full">
              确认调整
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
