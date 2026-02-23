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

  const { signIn, signUp, signInWithGoogle } = useAuth()
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

          <button
            type="button"
            onClick={async () => {
              setError('')
              try {
                await signInWithGoogle()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Error al iniciar con Google')
              }
            }}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">o</span>
            </div>
          </div>

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
