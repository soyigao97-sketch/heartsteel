import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import HeartsteelIcon from '../components/ui/HeartsteelIcon'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegister) {
        if (!nickname.trim()) { toast.error('请输入昵称'); setLoading(false); return }
        await register({ phone, password, nickname })
        toast.success('注册成功！欢迎加入心之钢')
      } else {
        await login(phone, password)
        toast.success('登录成功')
      }
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.error || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <HeartsteelIcon size={240} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            心之钢
          </h1>
          <p className="text-gray-500 mt-2">海克斯大乱斗交友站</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
          <input
            type="text"
            placeholder="手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full"
          />
          {isRegister && (
            <input
              type="text"
              placeholder="昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full"
              maxLength={50}
            />
          )}
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg">
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-gray-400 hover:text-yellow-500 text-sm transition-colors"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
