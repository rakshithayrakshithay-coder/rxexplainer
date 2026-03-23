import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/login' : '/register'
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password }
      const data = await apiPost(endpoint, body)
      if (data.error) { setError(data.error); setLoading(false); return }
      if (mode === 'register') { setMode('login'); setError(''); setForm(f => ({ ...f, name: '' })); setLoading(false); return }
      localStorage.setItem('rx_user', JSON.stringify(data))
      navigate('/dashboard')
    } catch {
      setError('Could not connect to server.'); setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-accent mb-2">💊 Rx Explainer</h1>
          <p className="text-muted text-sm">Understand your prescription in plain language</p>
        </div>

        <div className="card">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`tab-btn ${mode === 'login' ? 'tab-btn-active' : ''}`}
            >Sign In</button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`tab-btn ${mode === 'register' ? 'tab-btn-active' : ''}`}
            >Create Account</button>
          </div>

          {mode === 'register' && (
            <div className="mb-4">
              <label className="block text-xs text-accent uppercase tracking-widest mb-2">Full Name</label>
              <input
                className="input-field"
                type="text" name="name"
                placeholder="Your name"
                value={form.name} onChange={handleChange}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs text-accent uppercase tracking-widest mb-2">Email</label>
            <input
              className="input-field"
              type="email" name="email"
              placeholder="you@example.com"
              value={form.email} onChange={handleChange}
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs text-accent uppercase tracking-widest mb-2">Password</label>
            <input
              className="input-field"
              type="password" name="password"
              placeholder="••••••••"
              value={form.password} onChange={handleChange}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-[#2a1515] border border-[#6a2a2a] rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
