import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api'

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('rx_user') || '{}')
  const [analytics, setAnalytics] = useState(null)
  const [history, setHistory] = useState([])
  const [quickMed, setQuickMed] = useState('')
  const [quickDos, setQuickDos] = useState('')

  useEffect(() => {
    apiGet('/analytics').then(setAnalytics).catch(() => {})
    apiGet('/history').then(setHistory).catch(() => {})
  }, [])

  function logout() {
    localStorage.removeItem('rx_user')
    navigate('/login')
  }

  function goToExplainer() {
    if (!quickMed.trim()) return alert('Please enter a medicine name.')
    sessionStorage.setItem('quick_medicine', quickMed)
    sessionStorage.setItem('quick_dosage', quickDos)
    navigate('/explainer')
  }

  const firstName = (user.name || user.email || 'User').split(' ')[0]

  return (
    <div className="min-h-screen bg-bg px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">

        {/* Topbar */}
        <div className="flex justify-between items-center mb-8">
          <span className="font-display text-xl text-accent">💊 Rx Explainer</span>
          <div className="flex items-center gap-3">
            <span className="text-muted text-sm">👤 {user.name || user.email}</span>
            <button onClick={logout} className="px-4 py-1.5 border border-accent rounded-lg text-accent text-sm font-semibold hover:bg-accent hover:text-bg transition-all">
              Logout
            </button>
          </div>
        </div>

        {/* Welcome */}
        <div className="mb-7">
          <h1 className="font-display text-3xl text-text mb-1">Welcome back, <span className="text-accent">{firstName}</span> 👋</h1>
          <p className="text-muted text-sm">Here's a summary of your activity.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="card !mb-0">
            <div className="text-2xl mb-1">🔍</div>
            <div className="text-xs text-muted uppercase tracking-widest mb-1">Total Searches</div>
            <div className="font-display text-3xl text-accent">{analytics?.total ?? '—'}</div>
            <div className="text-xs text-muted mt-1">medicines looked up</div>
          </div>
          <div className="card !mb-0">
            <div className="text-2xl mb-1">🗓️</div>
            <div className="text-xs text-muted uppercase tracking-widest mb-1">Last Search</div>
            <div className="font-display text-sm text-text mt-2">
              {history[0] ? new Date(history[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </div>
            <div className="text-xs text-muted mt-1">{history[0]?.user_input?.split(' - ')[0] || 'no searches yet'}</div>
          </div>
          <div className="card !mb-0">
            <div className="text-2xl mb-1">💡</div>
            <div className="text-xs text-muted uppercase tracking-widest mb-1">AI Powered By</div>
            <div className="font-display text-lg text-accent mt-2">Groq</div>
            <div className="text-xs text-muted mt-1">Llama 3.3 70B</div>
          </div>
        </div>

        {/* Quick Search */}
        <div className="card">
          <h2 className="font-display text-accent text-xl mb-4">⚡ Quick Search</h2>
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="Medicine name e.g. Paracetamol"
              value={quickMed}
              onChange={e => setQuickMed(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goToExplainer()}
            />
            <input
              className="input-field flex-1"
              placeholder="Dosage e.g. 500mg"
              value={quickDos}
              onChange={e => setQuickDos(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goToExplainer()}
            />
            <button
              onClick={goToExplainer}
              className="px-5 py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-dark transition-colors whitespace-nowrap"
            >Search →</button>
          </div>
        </div>

        {/* Top Medicines */}
        {analytics?.top_medicines?.length > 0 && (
          <div className="card">
            <h2 className="font-display text-accent text-xl mb-4">🏆 Top Medicines</h2>
            <div className="space-y-3">
              {analytics.top_medicines.map((med, i) => {
                const max = analytics.top_medicines[0].count
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-display text-xl text-border w-6">{i + 1}</span>
                    <span className="flex-1 text-sm text-text">{med.medicine}</span>
                    <div className="w-24 bg-bg rounded h-1.5">
                      <div className="h-1.5 bg-accent rounded" style={{ width: `${(med.count / max) * 100}%` }} />
                    </div>
                    <span className="text-accent text-sm font-semibold">{med.count}x</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent History */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-accent text-xl">🕘 Recent Searches</h2>
            <button onClick={() => navigate('/explainer')} className="text-accent text-sm underline">Go to Explainer →</button>
          </div>
          {history.length === 0
            ? <p className="text-muted text-sm">No searches yet. Try looking up a medicine!</p>
            : history.slice(0, 6).map((item, i) => {
                const parts = item.user_input?.split(' - ')
                return (
                  <div key={i} className="flex gap-3 py-3 border-b border-border last:border-0">
                    <div className="w-9 h-9 bg-[#1e3a2f] rounded-lg flex items-center justify-center text-base flex-shrink-0">💊</div>
                    <div>
                      <div className="text-sm font-semibold text-text">{parts?.[0]}
                        {parts?.[1] && <span className="badge ml-2">{parts[1]}</span>}
                      </div>
                      <div className="text-xs text-muted mt-0.5">{item.ai_response?.substring(0, 90)}...</div>
                    </div>
                  </div>
                )
              })
          }
        </div>

        <button onClick={() => navigate('/explainer')} className="btn-primary">
          💊 Open Rx Explainer
        </button>
      </div>
    </div>
  )
}
