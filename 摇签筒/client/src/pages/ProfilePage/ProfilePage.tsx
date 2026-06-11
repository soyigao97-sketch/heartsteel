import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import LayerBadge from '../../components/ui/LayerBadge'
import { getLayerTier, timeAgo } from '../../utils/layer'
import { ALL_SERVERS } from '../../utils/lolServers'
import type { UserProfile, Dynamic, Record, SignStatus, FollowUser } from '../../types'

export default function ProfilePage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { user: currentUser, logout, fetchMe, updateUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dynamics, setDynamics] = useState<Dynamic[]>([])
  const [signStatus, setSignStatus] = useState<SignStatus | null>(null)
  const [dynamicText, setDynamicText] = useState('')
  const [posting, setPosting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [editRegion, setEditRegion] = useState('')
  const [editGameName, setEditGameName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editWechatId, setEditWechatId] = useState('')
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followCounts, setFollowCounts] = useState({ followingCount: 0, followersCount: 0 })
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followList, setFollowList] = useState<FollowUser[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [dynamicImage, setDynamicImage] = useState<string | null>(null)
  const [uploadingDynamicImg, setUploadingDynamicImg] = useState(false)

  const userId = useMemo(() => id ? parseInt(id) : currentUser?.id, [id, currentUser?.id])
  const isOwner = useMemo(() => !id || parseInt(id) === currentUser?.id, [id, currentUser?.id])

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await api.get(`/user/profile/${userId}`)
      setProfile(data)
      setFollowCounts({ followingCount: data.followingCount || 0, followersCount: data.followersCount || 0 })
    } catch {
      toast.error('加载用户信息失败')
    }
  }, [userId])

  const fetchDynamics = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await api.get('/dynamics', { params: { userId, page: 1 } })
      setDynamics(data)
    } catch {}
  }, [userId])

  const fetchSignStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/user/sign-status')
      setSignStatus(data)
    } catch {}
  }, [])

  const checkFollow = useCallback(async () => {
    if (!userId || isOwner) return
    try {
      const { data } = await api.get(`/follow/check/${userId}`)
      setFollowing(data.following)
    } catch {}
  }, [userId, isOwner])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.all([fetchProfile(), fetchDynamics(), isOwner ? fetchSignStatus() : Promise.resolve(), checkFollow()])
      .finally(() => setLoading(false))
  }, [userId, isOwner, fetchProfile, fetchDynamics, fetchSignStatus, checkFollow])

  const handleSignIn = async () => {
    try {
      const { data } = await api.post('/user/sign')
      if (data.success) {
        toast.success(`签到成功！+${data.added}层`)
        await Promise.all([fetchMe(), fetchProfile(), fetchSignStatus()])
      } else {
        toast('今日已签到')
      }
    } catch {
      toast.error('签到失败')
    }
  }

  const handlePostDynamic = async () => {
    if (!dynamicText.trim()) return
    setPosting(true)
    try {
      const { data } = await api.post('/dynamics', { content: dynamicText, imageUrl: dynamicImage })
      toast.success(`发布成功！+${data.layerAdded}层`)
      setDynamicText('')
      setDynamicImage(null)
      await Promise.all([fetchDynamics(), fetchProfile(), fetchMe()])
    } catch (err: any) {
      toast.error(err.response?.data?.error || '发布失败')
    } finally {
      setPosting(false)
    }
  }

  const handleUpdateProfile = async () => {
    // 游戏昵称格式验证: xxxx#数字
    if (editGameName && !/^.+?#\d+$/.test(editGameName)) {
      toast.error('游戏昵称格式错误，正确格式：昵称#数字（如：远方丶传来风笛#34714）')
      return
    }
    try {
      const { data } = await api.put('/user/profile', {
        nickname: editNickname,
        gameRegion: editRegion,
        gameName: editGameName,
        location: editLocation,
        wechatId: editWechatId,
      })
      updateUser(data)
      setEditing(false)
      toast.success('更新成功')
      fetchProfile()
    } catch {
      toast.error('更新失败')
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('图片不能超过20MB'); return }

    setUploadingAvatar(true)
    const formData = new FormData()
    formData.append('images', file)
    try {
      const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const avatarUrl = data.urls[0]
      await api.put('/user/profile', { avatarUrl })
      updateUser({ avatarUrl } as any)
      fetchProfile()
      fetchMe()
      toast.success('头像更新成功')
    } catch {
      toast.error('上传失败')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleFollow = async () => {
    try {
      const { data } = await api.post(`/follow/${userId}`)
      setFollowing(data.following)
      setFollowCounts(prev => ({
        ...prev,
        followersCount: data.following ? prev.followersCount + 1 : prev.followersCount - 1,
      }))
    } catch {
      toast.error('操作失败')
    }
  }

  const handleStartChat = async () => {
    if (!userId || isOwner) return
    try {
      const { data } = await api.post('/chat/private', { targetUserId: userId })
      navigate(`/chat/${data.roomId}`)
    } catch {
      toast.error('发起聊天失败')
    }
  }

  const loadFollowList = async (type: 'followers' | 'following') => {
    try {
      const { data } = await api.get(`/follow/${type}/${userId}`)
      setFollowList(data)
      type === 'followers' ? setShowFollowers(true) : setShowFollowing(true)
    } catch {}
  }

  const handleDynamicImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('图片不能超过20MB'); return }
    setUploadingDynamicImg(true)
    const formData = new FormData()
    formData.append('images', file)
    try {
      const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDynamicImage(data.urls[0])
      toast.success('图片上传成功')
    } catch {
      toast.error('上传失败')
    } finally {
      setUploadingDynamicImg(false)
    }
  }

  const handleLikeDynamic = async (dynamicId: number) => {
    try {
      await api.post(`/dynamics/${dynamicId}/like`)
      fetchDynamics()
    } catch {}
  }

  const navigateToUser = (uid: number) => {
    navigate(`/profile/${uid}`)
  }

  const tier = useMemo(() => getLayerTier(profile?.heartLayer || 0), [profile?.heartLayer])
  const layer = profile?.heartLayer || 0

  // 骨架屏
  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
          <h1 className="text-lg font-bold">个人中心</h1>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 animate-pulse">
          <div className="bg-gray-900 rounded-2xl p-6 h-40" />
          <div className="bg-gray-900 rounded-xl p-4 h-32" />
          <div className="space-y-3">
            <div className="bg-gray-900 rounded-xl p-4 h-24" />
            <div className="bg-gray-900 rounded-xl p-4 h-24" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <h1 className="text-lg font-bold">{isOwner ? '个人中心' : '用户主页'}</h1>
          <div className="flex gap-2">
            {isOwner ? (
              <>
                {currentUser?.isAdmin && (
                  <button onClick={() => navigate('/admin')} className="btn-ghost text-sm">管理</button>
                )}
                <button
                  onClick={() => {
                    setEditing(!editing)
                    setEditNickname(profile?.nickname || '')
                    setEditRegion(profile?.gameRegion || '')
                    setEditGameName(profile?.gameName || '')
                    setEditLocation(profile?.location || '')
                    setEditWechatId(profile?.wechatId || '')
                  }}
                  className="btn-ghost text-sm"
                >
                  设置
                </button>
                <button onClick={() => { logout(); navigate('/login') }} className="btn-ghost text-sm text-red-400">退出</button>
              </>
            ) : (
              <button onClick={() => navigate(-1)} className="btn-ghost text-sm">← 返回</button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* 头部卡片 */}
        <div className={`rounded-2xl p-6 transform-gpu ${tier.cssClass}`}>
          <div className="flex items-center gap-4">
            {/* 头像 - 可上传 */}
            <div className="relative group">
              <div
                className={`w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-500 flex-shrink-0 ${
                  isOwner ? 'cursor-pointer' : ''
                }`}
                onClick={() => isOwner && fileInputRef.current?.click()}
              >
                {profile?.avatarUrl || currentUser?.avatarUrl ? (
                  <img src={(profile?.avatarUrl || currentUser?.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-3xl">👤</div>
                )}
              </div>
              {isOwner && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white pointer-events-none">
                  {uploadingAvatar ? '...' : '换头像'}
                </div>
              )}
              {isOwner && (
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{profile?.nickname || currentUser?.nickname}</h2>
              {profile?.gameRegion && (
                <p className="text-sm text-gray-400">🎮 {profile.gameRegion}{profile.gameName ? ` · ${profile.gameName}` : ''}</p>
              )}
              {profile?.location && (
                <p className="text-sm text-gray-400">📍 {profile.location}</p>
              )}
              {isOwner && profile?.phone && (
                <p className="text-sm text-gray-400">📱 {profile.phone}</p>
              )}
              {profile?.wechatId && (
                <p className="text-sm text-gray-400">💬 微信: {profile.wechatId}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <LayerBadge layer={layer} size="md" />
                <span className="text-xs text-gray-400">
                  签到 {profile?.totalSignDays || 0} 天
                </span>
              </div>

              {/* 关注数 */}
              <div className="flex gap-4 mt-2 text-sm">
                <button onClick={() => loadFollowList('following')} className="hover:text-yellow-500 transition-colors">
                  <span className="font-bold">{followCounts.followingCount}</span>
                  <span className="text-gray-500 ml-1">关注</span>
                </button>
                <button onClick={() => loadFollowList('followers')} className="hover:text-yellow-500 transition-colors">
                  <span className="font-bold">{followCounts.followersCount}</span>
                  <span className="text-gray-500 ml-1">粉丝</span>
                </button>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-4">
            {isOwner ? (
              <button
                onClick={handleSignIn}
                disabled={signStatus?.signed}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  signStatus?.signed
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-500 text-gray-900 hover:bg-yellow-600 active:scale-95'
                }`}
              >
                {signStatus?.signed ? '✅ 今日已签到' : '⚒️ 每日签到 +1层'}
              </button>
            ) : (
              <>
                <button onClick={handleFollow} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  following ? 'bg-gray-700 hover:bg-gray-600' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-600'
                }`}>
                  {following ? '已关注' : '+ 关注'}
                </button>
                <button onClick={handleStartChat} className="flex-1 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 transition-colors">
                  💬 私聊
                </button>
              </>
            )}
          </div>
        </div>

        {/* 关注/粉丝列表弹窗 */}
        {(showFollowers || showFollowing) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={() => { setShowFollowers(false); setShowFollowing(false) }} />
            <div className="relative bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[60vh] overflow-y-auto p-4">
              <h3 className="font-bold mb-3">{showFollowers ? '粉丝' : '关注'}</h3>
              {followList.length === 0 && <p className="text-gray-500 text-center py-4">暂无</p>}
              {followList.map((u) => (
                <div
                  key={u.id}
                  onClick={() => { setShowFollowers(false); setShowFollowing(false); navigateToUser(u.id) }}
                  className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{u.nickname}</p>
                    <p className="text-xs text-yellow-500">Lv{u.heartLayer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 编辑模式 */}
        {editing && (
          <div className="bg-gray-900 rounded-xl p-4 space-y-3 border border-gray-800">
            <h3 className="font-bold">编辑资料</h3>
            <input value={editNickname} onChange={(e) => setEditNickname(e.target.value)} placeholder="昵称" className="w-full" />
            <select value={editRegion} onChange={(e) => setEditRegion(e.target.value)} className="w-full">
              <option value="">选择大区</option>
              {ALL_SERVERS.map(s => (
                <option key={s.name} value={s.name}>{s.name}{s.group ? ` (${s.group}${s.desc ? ' ' + s.desc : ''})` : ` (${s.desc})`}</option>
              ))}
            </select>
            <input value={editGameName} onChange={(e) => setEditGameName(e.target.value)} placeholder="游戏昵称 (格式: 昵称#数字)" className="w-full" />
            <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="所在地 (例: 北京)" className="w-full" />
            <input value={editWechatId} onChange={(e) => setEditWechatId(e.target.value)} placeholder="微信号（选填）" className="w-full" />
            <div className="flex gap-2">
              <button onClick={handleUpdateProfile} className="btn-primary text-sm">保存</button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 我的战绩 */}
        {profile?.recentRecords && profile.recentRecords.length > 0 && (
          <div>
            <h3 className="font-bold mb-3">📸 我的战绩</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {profile.recentRecords.map((record: Record) => (
                <div key={record.id} className="bg-gray-900 rounded-xl overflow-hidden flex-shrink-0 w-36 border border-gray-800">
                  {record.images?.[0] && (
                    <img src={record.images[0]} alt="" className="w-full h-24 object-cover" loading="lazy" />
                  )}
                  <div className="p-2">
                    <p className="text-xs text-yellow-500 font-mono">
                      {record.kdaKill}/{record.kdaDeath}/{record.kdaAssist}
                    </p>
                    <p className="text-xs text-gray-500">{timeAgo(record.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 发布动态 */}
        {isOwner && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="font-bold mb-3">✏️ 发布动态</h3>
            <textarea
              value={dynamicText}
              onChange={(e) => setDynamicText(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full resize-none"
              placeholder={signStatus?.todayDynamic ? '今日已发布过动态' : '分享你的想法... (发布后+1层)'}
              disabled={signStatus?.todayDynamic}
            />
            {/* 动态图片上传 */}
            {dynamicImage && (
              <div className="relative mt-2 inline-block">
                <img src={dynamicImage} alt="" className="max-h-32 rounded-lg object-cover" />
                <button onClick={() => setDynamicImage(null)} className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 text-xs">✕</button>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer text-gray-400 hover:text-white transition-colors text-xs">
                  <input type="file" accept="image/*" onChange={handleDynamicImageUpload} className="hidden" disabled={uploadingDynamicImg} />
                  {uploadingDynamicImg ? '⏳' : '📷'} 照片
                </label>
                <span className="text-xs text-gray-500">{dynamicText.length}/200</span>
              </div>
              <button
                onClick={handlePostDynamic}
                disabled={posting || !dynamicText.trim() || signStatus?.todayDynamic}
                className="btn-primary text-sm"
              >
                {posting ? '发布中...' : '发布 +1层'}
              </button>
            </div>
          </div>
        )}

        {/* 动态列表 */}
        <div>
          <h3 className="font-bold mb-3">📋 动态</h3>
          {dynamics.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">暂无动态</p>
          )}
          <div className="space-y-3">
            {dynamics.map((d: any) => (
              <div key={d.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => navigateToUser(d.user?.id)} className="flex items-center gap-2 hover:opacity-80">
                    <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {d.user?.avatarUrl ? <img src={d.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>👤</span>}
                    </div>
                    <span className="text-sm font-bold text-yellow-500 hover:underline">{d.user?.nickname}</span>
                  </button>
                  <span className="text-xs text-gray-500">{timeAgo(d.createdAt)}</span>
                  {!isOwner && (
                    <button onClick={handleStartChat} className="ml-auto text-xs text-blue-400 hover:text-blue-300">
                      💬 私聊
                    </button>
                  )}
                </div>
                <p className="text-sm">{d.content}</p>
                {d.imageUrl && (
                  <img src={d.imageUrl} alt="" className="mt-2 rounded-lg max-h-40 object-cover" loading="lazy" />
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <button onClick={() => handleLikeDynamic(d.id)} className="hover:text-red-400 transition-colors">
                    ❤️ {d.likes}
                  </button>
                  <span>💬 {d.comments}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
