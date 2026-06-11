import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function PublishRecordModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState('海克斯大乱斗')
  const [kdaKill, setKdaKill] = useState(0)
  const [kdaDeath, setKdaDeath] = useState(0)
  const [kdaAssist, setKdaAssist] = useState(0)
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (images.length + files.length > 9) {
      toast.error('最多上传9张图片')
      return
    }

    setUploading(true)
    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append('images', f))

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImages((prev) => [...prev, ...data.urls])
    } catch {
      toast.error('上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const { data } = await api.post('/records', {
        mode,
        kdaKill,
        kdaDeath,
        kdaAssist,
        description,
        images,
      })
      toast.success(`发布成功！+${data.layerAdded}层`)
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
        <h2 className="text-lg font-bold mb-4">📸 晒出你的高光时刻</h2>

        <div className="space-y-4">
          {/* 模式 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">选择模式</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full">
              <option>海克斯大乱斗</option>
              <option>排位赛</option>
              <option>匹配模式</option>
              <option>极地大乱斗</option>
            </select>
          </div>

          {/* KDA */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">KDA</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={kdaKill}
                onChange={(e) => setKdaKill(parseInt(e.target.value) || 0)}
                className="w-20 text-center"
                placeholder="击杀"
              />
              <span className="text-gray-500">/</span>
              <input
                type="number"
                min={0}
                value={kdaDeath}
                onChange={(e) => setKdaDeath(parseInt(e.target.value) || 0)}
                className="w-20 text-center"
                placeholder="死亡"
              />
              <span className="text-gray-500">/</span>
              <input
                type="number"
                min={0}
                value={kdaAssist}
                onChange={(e) => setKdaAssist(parseInt(e.target.value) || 0)}
                className="w-20 text-center"
                placeholder="助攻"
              />
            </div>
          </div>

          {/* 图片上传 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              截图上传 (最多9张)
            </label>
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {images.map((url, i) => (
                  <div key={i} className="relative w-16 h-16">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="w-full text-sm"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">战绩描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none"
              placeholder="分享你的精彩瞬间..."
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
