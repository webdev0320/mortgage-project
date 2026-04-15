import { useState, useEffect } from 'react'
import {
  fetchUsers, createUser, updateUser,
  fetchConfiguredDocTypes, createConfiguredDocType, deleteConfiguredDocType
} from '../api/client'
import {
  Users, FileStack, ShieldAlert, Plus, Trash2,
  CheckCircle, XCircle, ChevronRight, Settings,
  ArrowLeft, Search, Mail
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users') // 'users' | 'doctypes'

  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-200 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-surface-900/50 flex flex-col">
        <div className="p-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </button>

          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">Admin Console</span>
          </div>

          <nav className="space-y-1">
            <TabBtn
              active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              icon={<Users className="w-4 h-4" />}
              label="User Management"
            />
            <TabBtn
              active={activeTab === 'doctypes'}
              onClick={() => setActiveTab('doctypes')}
              icon={<FileStack className="w-4 h-4" />}
              label="Document Types"
            />
            <TabBtn
               active={activeTab === 'settings'}
               onClick={() => setActiveTab('settings')}
               icon={<Settings className="w-4 h-4" />}
               label="System Settings"
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
           <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Status</p>
              <p className="text-xs text-slate-400">Database Synchronized</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="p-8 border-b border-white/5 flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold text-white">
               {activeTab === 'users' ? 'Manage Users' : 'Managed Document Types'}
             </h1>
             <p className="text-sm text-slate-500 mt-1">
               {activeTab === 'users'
                 ? 'Control access levels and operator status.'
                 : 'Configure classifications available for the AI and HITL workforce.'}
             </p>
           </div>
        </header>

        <div className="p-8">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'doctypes' && <DocTypeManagement />}
          {activeTab === 'settings' && (
            <div className="p-20 text-center grayscale opacity-50">
               <Settings className="w-12 h-12 mx-auto mb-4" />
               <p>Global system settings are managed via environment variables.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
        ${active
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
          : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}
      `}
    >
      {icon} {label}
    </button>
  )
}

// ── User Management Sub-Page ──

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'OPERATOR' })

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const { data } = await fetchUsers()
      setUsers(data.data)
    } finally { setLoading(false) }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    await createUser(newUser)
    setNewUser({ email: '', name: '', role: 'OPERATOR' })
    setShowAdd(false)
    load()
  }

  const toggleStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    await updateUser(user.id, { status: nextStatus })
    load()
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between mb-4">
         <div className="relative w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <input
             type="text"
             placeholder="Find user..."
             className="w-full bg-surface-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-indigo-500/50 outline-none"
           />
         </div>
         <button
          onClick={() => setShowAdd(true)}
          className="btn-primary"
         >
           <Plus className="w-4 h-4" /> Add User
         </button>
       </div>

       {showAdd && (
         <form onSubmit={handleAdd} className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 fade-up grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Email</label>
              <input
                required
                type="email"
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full bg-[#13161e] border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                className="w-full bg-[#13161e] border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
               <button type="submit" className="btn-primary flex-1">Create</button>
               <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            </div>
         </form>
       )}

       <div className="overflow-hidden rounded-2xl border border-white/5 bg-surface-900/30">
         <table className="w-full text-left text-sm">
           <thead className="bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
             <tr>
               <th className="px-6 py-4">Identity</th>
               <th className="px-6 py-4">Role</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4">Created</th>
               <th className="px-6 py-4"></th>
             </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
             {users.map(user => (
               <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                 <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                        {user.name?.charAt(0) || user.email.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user.name || 'Set name'}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                 </td>
                 <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${user.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {user.role}
                    </span>
                 </td>
                 <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                       <span className="text-slate-300 font-medium">{user.status}</span>
                    </div>
                 </td>
                 <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                 </td>
                 <td className="px-6 py-4 text-right">
                    <button onClick={() => toggleStatus(user)} className="text-xs text-indigo-400 hover:text-white transition-colors underline underline-offset-4">
                      {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
    </div>
  )
}

// ── Doc Type Management Sub-Page ──

function DocTypeManagement() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState({ code: '', label: '', isCommon: true })

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const { data } = await fetchConfiguredDocTypes()
      setTypes(data.data)
    } finally { setLoading(false) }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    await createConfiguredDocType(newType)
    setNewType({ code: '', label: '', isCommon: true })
    setShowAdd(false)
    load()
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this classification?')) {
      await deleteConfiguredDocType(id)
      load()
    }
  }

  return (
     <div className="space-y-6">
        <div className="flex items-center justify-between">
           <p className="text-sm text-slate-500">Configure labels used by the engine's classifier.</p>
           <button onClick={() => setShowAdd(true)} className="btn-primary">
             <Plus className="w-4 h-4" /> Add Classification
           </button>
        </div>

        {showAdd && (
         <form onSubmit={handleAdd} className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 fade-up grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Internal Code</label>
              <input
                required
                placeholder="e.g. W2_2023"
                value={newType.code}
                onChange={e => setNewType({...newType, code: e.target.value})}
                className="w-full bg-[#13161e] border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Display Label</label>
              <input
                required
                placeholder="e.g. W-2 Annual Summary"
                value={newType.label}
                onChange={e => setNewType({...newType, label: e.target.value})}
                className="w-full bg-[#13161e] border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
               <button type="submit" className="btn-primary flex-1">Add</button>
               <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            </div>
         </form>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map(t => (
            <div key={t.id} className="group p-5 rounded-2xl bg-surface-900/30 border border-white/5 hover:border-indigo-500/20 transition-all">
               <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <FileStack className="w-5 h-5" />
                  </div>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               <h4 className="font-bold text-white mb-1">{t.label}</h4>
               <p className="font-mono text-[10px] text-slate-600 mb-4">{t.code}</p>
               <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Auto-enabled
                  </span>
                  {t.isCommon && (
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[9px] font-bold border border-indigo-500/20">COMMON</span>
                  )}
               </div>
            </div>
          ))}
       </div>
     </div>
  )
}
