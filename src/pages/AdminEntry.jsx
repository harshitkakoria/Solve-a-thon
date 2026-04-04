/**
 * AdminEntry — Premium futuristic admin login + dashboard selection page.
 * 
 * Flow: Login → Animated transition → Glowing dashboard selection cards
 * Background: Silk GLSL shader (always running)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  MessageSquareText,
  UtensilsCrossed,
  ChevronRight,
  Lock,
  Building2,
  LogOut
} from 'lucide-react'
import Silk from '../components/SilkBackground'
import BorderGlow from '../components/BorderGlow'

/* ── Admin Sections Configuration ───────────────────────────────── */
const ADMIN_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Command Center',
    description: 'Live analytics, AI summaries, and actionable insights',
    icon: LayoutDashboard,
    route: '/admin',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'analytics',
    title: 'Deep Analytics',
    description: 'Rating trends, tag heatmaps, and historical data',
    icon: BarChart3,
    route: '/admin',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'feedback',
    title: 'Feedback Portal',
    description: 'Student feedback form and submission viewer',
    icon: MessageSquareText,
    route: '/',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'menu',
    title: 'Menu Control',
    description: 'Upload, edit, and manage weekly meal menus',
    icon: UtensilsCrossed,
    route: '/upload-menu',
    gradient: 'from-amber-500 to-orange-500',
  },
]

/* ── LoginBox Component ─────────────────────────────────────────── */
function LoginBox({ onLogin }) {
  const [messId, setMessId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!messId.trim()) {
      setError('Mess ID is required')
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    setLoading(true)
    // Simulate auth delay for premium feel
    setTimeout(() => {
      setLoading(false)
      onLogin(messId.trim())
    }, 800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md mx-auto"
    >
      {/* Glass card */}
      <div className="relative rounded-3xl overflow-hidden">
        {/* Border glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/20 via-transparent to-indigo-500/20" />

        <div className="relative m-px rounded-3xl bg-slate-900/70 backdrop-blur-2xl p-10">
          {/* Top accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />

          {/* Logo / Brand */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/30 mb-5">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Admin Portal
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Sign in to access your mess dashboard
            </p>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mess ID */}
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Mess ID"
                value={messId}
                onChange={(e) => setMessId(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm tracking-wide shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden group"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ChevronRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          {/* Bottom accent */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
        </div>
      </div>
    </motion.div>
  )
}

/* ── AdminCard Component ────────────────────────────────────────── */
function AdminCard({ section, messId, index }) {
  const navigate = useNavigate()
  const Icon = section.icon

  const handleClick = () => {
    const separator = section.route.includes('?') ? '&' : '?'
    navigate(`${section.route}${separator}mess=${messId}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.1 + index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <BorderGlow onClick={handleClick}>
        <div className="p-7 flex flex-col h-full min-h-[200px]">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} shadow-lg mb-5`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          {/* Text */}
          <h3 className="text-white text-lg font-bold tracking-tight mb-2 group-hover:text-violet-200 transition-colors">
            {section.title}
          </h3>
          <p className="text-slate-400 text-sm font-medium leading-relaxed flex-1">
            {section.description}
          </p>

          {/* Action hint */}
          <div className="flex items-center gap-1.5 mt-5 text-violet-400 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Open <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </BorderGlow>
    </motion.div>
  )
}

/* ── Main AdminEntry Page ───────────────────────────────────────── */
export default function AdminEntry() {
  const [loggedInMessId, setLoggedInMessId] = useState(null)

  const handleLogin = (messId) => {
    setLoggedInMessId(messId)
  }

  const handleLogout = () => {
    setLoggedInMessId(null)
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Silk animated background — always running */}
      <div className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }}>
        <Silk
          speed={5}
          scale={1}
          color="#3d00ff"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 w-full max-w-4xl">
        <AnimatePresence mode="wait">
          {!loggedInMessId ? (
            /* ── Login State ── */
            <LoginBox key="login" onLogin={handleLogin} />
          ) : (
            /* ── Dashboard Selection State ── */
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="text-center mb-10"
              >
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                  Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">{loggedInMessId}</span>
                </h1>
                <p className="text-slate-400 text-sm font-medium">
                  Select a module to get started
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </motion.div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {ADMIN_SECTIONS.map((section, i) => (
                  <AdminCard
                    key={section.id}
                    section={section}
                    messId={loggedInMessId}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
