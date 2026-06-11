import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { ALL_SERVERS } from '../../utils/lolServers'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function PublishTeamModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState('海克斯大乱斗')
  const [serverRegion, setServerRegion] = useState('')
  const [needCount, setNeedCount] = useState(5)
  const [requirement, setRequirement] = useState('')
  const [voiceRequired, setVoiceRequired] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!serverRegion) {
      toast.error('请选择大区')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/teams', {
        mode,
        serverRegion,
        needCount,
        requirement,
        voiceRequired,
        scheduleTime: scheduleTime || undefined,
      })
      toast.success('组队发布成功！+2层')
      onSuccess()
    } catch (err: any) {
      toast.error(err.response?.data?.error || '发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">📢 发布组队需求</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">大区 <span className="text-red-400">*</span></label>
            <select value={serverRegion} onChange={(e) => setServerRegion(e.target.value)} className="w-full">
              <option value="">选择大区</option>
              {ALL_SERVERS.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name}{s.group ? ` (${s.group})` : ''}{s.desc ? ` ${s.desc}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">模式</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full">
              <option>海克斯大乱斗</option>
              <option>排位赛</option>
              <option>匹配模式</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">需求人数</label>
            <select value={needCount} onChange={(e) => setNeedCount(parseInt(e.target.value))} className="w-full">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}人</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">要求描述</label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              rows={3}
              className="w-full resize-none"
              placeholder="例如：白银以上，带脑子，快乐游戏"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="voice"
              checked={voiceRequired}
              onChange={(e) => setVoiceRequired(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="voice" className="text-sm">需要语音</label>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">发车时间</label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">取消</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
              {submitting ? '发布中...' : '发布 +2层'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
