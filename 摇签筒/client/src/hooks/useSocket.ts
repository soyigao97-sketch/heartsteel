import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  if (!socket) {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    const serverUrl = import.meta.env.VITE_API_URL || ''
    socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function useSocket(
  eventHandlers: Record<string, (...args: any[]) => void>,
  deps: any[] = []
) {
  const handlersRef = useRef(eventHandlers)
  handlersRef.current = eventHandlers

  useEffect(() => {
    const s = getSocket()
    if (!s) return

    const entries = Object.entries(handlersRef.current)
    entries.forEach(([event, handler]) => {
      s.on(event, handler)
    })

    return () => {
      entries.forEach(([event, handler]) => {
        s.off(event, handler)
      })
    }
  }, [])
}
