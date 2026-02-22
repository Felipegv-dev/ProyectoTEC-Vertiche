import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
        navigate('/dashboard')
      } else {
        await signUp(email, password, fullName)
        setSuccessMessage('Cuenta creada. Revisa tu correo para verificar tu cuenta.')
        setIsLogin(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <span className="text-xl font-bold">V</span>
            </div>
            <span className="text-2xl font-bold">Vertiche</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Inteligencia de contratos
            <br />
            para tu negocio
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Analiza contratos de arrendamiento con IA. Encuentra respuestas en
            segundos, no en horas.
          </p>
          <div className="flex gap-8 text-sm">
            <div>
              <div className="text-3xl font-bold">316+</div>
              <div className="text-white/70">Sucursales</div>
            </div>
            <div>
              <div className="text-3xl font-bold">2hrs → 5s</div>
              <div className="text-white/70">Tiempo de consulta</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/50">
          © 2026 Vertiche. Todos los derechos reservados.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-xl font-bold text-primary-foreground">V</span>
            </div>
            <span className="text-2xl font-bold text-foreground">Vertiche</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin
                ? 'Ingresa tus credenciales para acceder a la plataforma'
                : 'Completa tus datos para crear una nueva cuenta'}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg bg-success/10 p-3 text-sm text-success">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  required={!isLogin}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@vertiche.com"
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setSuccessMessage('')
              }}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? 'Crear una' : 'Iniciar sesión'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
