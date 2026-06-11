import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: '广场', icon: '🏠' },
  { to: '/teams', label: '组队', icon: '⚔️' },
  { to: '/chat', label: '消息', icon: '💬' },
  { to: '/profile', label: '我的', icon: '👤' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-3 py-1 text-xs ${
              isActive ? 'text-yellow-500' : 'text-gray-400'
            }`
          }
        >
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
