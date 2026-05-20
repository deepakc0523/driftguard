import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⬡' },
  { path: '/repositories', label: 'Repositories', icon: '⬡' },
  { path: '/drift', label: 'Drift Events', icon: '⬡' },
  { path: '/change-requests', label: 'Change Requests', icon: '⬡' },
  { path: '/audit', label: 'Audit Log', icon: '⬡' },
]

export function Navbar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">
            DG
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-tight">DriftGuard</div>
            <div className="text-xs text-gray-500">Config Security System</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${active ? 'bg-brand-600/30' : 'bg-gray-800'}`}>
                {item.path === '/' ? '⊞' : item.path === '/repositories' ? '⊟' : item.path === '/drift' ? '⊗' : item.path === '/change-requests' ? '⊘' : '⊙'}
              </div>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/60">
          <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold text-white uppercase">
            {user?.email?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-200 truncate">{user?.email}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-300 transition-colors text-xs" title="Logout">
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}
