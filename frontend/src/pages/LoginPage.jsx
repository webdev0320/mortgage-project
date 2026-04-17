import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Lock, Mail, Loader2, ArrowRight } from 'lucide-react'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  
  const { login, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const success = await login(email, password)
    if (success) navigate('/')
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 fade-up">
           <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40 mb-6">
              <FileText className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-3xl font-bold text-white tracking-tight">IDP Workbench</h1>
           <p className="text-slate-500 mt-2">Intelligent Document Processing</p>
        </div>

        {/* Card */}
        <div className="glass-morphism rounded-3xl border border-white/5 p-8 shadow-2xl scale-in">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs text-red-200 text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400">
                  <Mail className="w-4 h-4 transition-colors" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#13161e] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between ml-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400">
                  <Lock className="w-4 h-4 transition-colors" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#13161e] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={busy}
              className="w-full bg-indigo-600 text-white rounded-2xl py-4 text-sm font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Sign into Workbench <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-8">
            New to the platform?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300">Create account</Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-700 mt-10 uppercase tracking-widest">
          Secure Multi-Tenant Local Environment
        </p>
      </div>
    </div>
  )
}
