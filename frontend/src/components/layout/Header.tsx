import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Moon, Sun, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Header() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div />

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>

        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {displayName}
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
