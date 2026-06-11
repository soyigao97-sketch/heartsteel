import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useSocket, getSocket } from '../../hooks/useSocket'
import { timeAgo } from '../../utils/layer'
import type { ChatRoom, Message } from '../../types'

export default function ChatPage() {
  const { roomId } = useParams<{ roomId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 加载聊天室列表
  useEffect(() => {
    fetchRooms()
  }, [])

  // 如果 URL 中有 roomId，加载对应聊天
  useEffect(() => {
    if (roomId && rooms.length > 0) {
      const room = rooms.find(r => r.id === roomId)
      if (room) selectRoom(room)
    }
  }, [roomId, rooms])

  // Socket 事件
  useSocket({
    new_message: (msg: Message) => {
      if (msg.chatRoomId === activeRoom?.id) {
        setMessages(prev => [...prev, msg])
        scrollToBottom()
      }
      // 刷新房间列表
      fetchRooms()
    },
  }, [activeRoom?.id])

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/chat/rooms')
      setRooms(data)
    } catch {}
  }

  const selectRoom = async (room: ChatRoom) => {
    setActiveRoom(room)
    navigate(`/chat/${room.id}`, { replace: true })

    // 加入 socket 房间
    getSocket()?.emit('join_room', room.id)

    // 加载历史消息
    try {
      const { data } = await api.get(`/chat/messages/${room.id}`)
      setMessages(data)
      scrollToBottom()
    } catch {}
  }

  const handleSend = () => {
    if (!input.trim() || !activeRoom) return

    const socket = getSocket()
    if (socket) {
      socket.emit('send_message', {
        roomId: activeRoom.id,
        content: input.trim(),
        messageType: 'text',
      })

      // 乐观更新
      const tempMsg: Message = {
        id: Date.now(),
        chatRoomId: activeRoom.id,
        senderId: user!.id,
        sender: { id: user!.id, nickname: user!.nickname, avatarUrl: user!.avatarUrl, heartLayer: user!.heartLayer },
        messageType: 'text',
        content: input.trim(),
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, tempMsg])
      setInput('')
      scrollToBottom()
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // 房间列表视图
  if (!activeRoom) {
    return (
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
          <h1 className="text-lg font-bold">💬 消息</h1>
        </header>

        <div className="max-w-2xl mx-auto">
          {rooms.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>暂无聊天</p>
              <p className="text-sm mt-1">加入组队或发起私聊开始聊天</p>
            </div>
          )}

          {rooms.map((room) => {
            const otherMember = room.type === 'private'
              ? room.members.find(m => m.id !== user?.id)
              : null
            const displayName = room.type === 'private'
              ? otherMember?.nickname || '私聊'
              : room.name || '群聊'

            return (
              <div
                key={room.id}
                onClick={() => selectRoom(room)}
                className="flex items-center gap-3 p-4 border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-xl">
                  {room.type === 'private' ? '👤' : '👥'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{displayName}</span>
                    {room.lastMessage && (
                      <span className="text-xs text-gray-500">{timeAgo(room.lastMessage.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {room.lastMessage?.content || '暂无消息'}
                  </p>
                </div>
                {room.isArchived && (
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-500">已归档</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // 聊天视图
  const otherMember = activeRoom.type === 'private'
    ? activeRoom.members.find(m => m.id !== user?.id)
    : null
  const title = activeRoom.type === 'private'
    ? otherMember?.nickname || '私聊'
    : activeRoom.name || '群聊'

  return (
    <div className="min-h-screen flex flex-col">
      {/* 聊天顶部 */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => {
          setActiveRoom(null)
          navigate('/chat')
        }} className="text-gray-400 hover:text-white">
          ← 返回
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
            {activeRoom.type === 'private' ? '👤' : '👥'}
          </div>
          <div>
            <p className="font-bold text-sm">{title}</p>
            {activeRoom.type === 'group' && (
              <p className="text-xs text-gray-500">{activeRoom.members.length}人</p>
            )}
          </div>
        </div>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg) => {
          const isMine = msg.senderId === user!.id
          return (
            <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-xs">
                {msg.sender?.avatarUrl ? (
                  <img src={msg.sender.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : '👤'}
              </div>
              <div className={`max-w-[70%] ${isMine ? 'items-end' : ''}`}>
                {!isMine && (
                  <p className="text-xs text-yellow-500 mb-1">{msg.sender?.nickname}</p>
                )}
                <div className={`rounded-2xl px-4 py-2 text-sm ${
                  isMine ? 'bg-yellow-500 text-gray-900 rounded-tr-sm' : 'bg-gray-800 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className="text-xs text-gray-600 mt-1 px-1">{timeAgo(msg.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入栏 */}
      <div className="sticky bottom-0 bg-gray-950 border-t border-gray-800 px-4 py-3">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={activeRoom.isArchived ? '聊天室已归档' : '输入消息...'}
            disabled={activeRoom.isArchived}
            className="flex-1 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={activeRoom.isArchived || !input.trim()}
            className="btn-primary text-sm"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
