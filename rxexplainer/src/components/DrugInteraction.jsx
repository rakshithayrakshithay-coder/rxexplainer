import { useState } from 'react'
import { apiPost } from '../api'

export default function DrugInteraction() {
  const [drug1, setDrug1] = useState('')
  const [drug2, setDrug2] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function check() {
    if (!drug1.trim() || !drug2.trim()) return alert('Please enter both medicine names.')
    setLoading(true); setResult(null)
    try {
      const data = await apiPost('/interaction', { medicine1: drug1, medicine2: drug2 })
      setResult(data)
    } catch { setResult({ error: 'Could not check interaction.' }) }
    setLoading(false)
  }

  const statusStyle = {
    SAFE:      { bg: 'bg-[#1a3a2a]', border: 'border-[#2a6a40]', color: 'text-accent',  icon: '✅' },
    CAUTION:   { bg: 'bg-[#3a2a10]', border: 'border-[#6a4a10]', color: 'text-warn',    icon: '⚠️' },
    DANGEROUS: { bg: 'bg-[#3a1a1a]', border: 'border-[#6a2a2a]', color: 'text-danger',  icon: '🚨' },
  }

  return (
    <div className="card">
      <h2 className="font-display text-accent text-xl mb-2">⚠️ Drug Interaction Checker</h2>
      <p className="text-muted text-sm mb-5">Check if two medicines are safe to take together.</p>

      <label className="block text-xs text-accent uppercase tracking-widest mb-2">First Medicine</label>
      <input className="input-field mb-4" placeholder="e.g. Aspirin" value={drug1} onChange={e => setDrug1(e.target.value)} />

      <label className="block text-xs text-accent uppercase tracking-widest mb-2">Second Medicine</label>
      <input className="input-field mb-5" placeholder="e.g. Warfarin" value={drug2} onChange={e => setDrug2(e.target.value)} />

      <button className="btn-primary" onClick={check} disabled={loading}>
        {loading ? '⏳ Checking...' : 'Check Interaction'}
      </button>

      {result && !result.error && (() => {
        const s = statusStyle[result.status] || statusStyle.SAFE
        return (
          <div className={`mt-4 rounded-xl p-4 ${s.bg} border ${s.border}`}>
            <div className={`font-bold text-lg mb-2 ${s.color}`}>{s.icon} {result.status}</div>
            <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{result.response}</p>
          </div>
        )
      })()}

      {result?.error && <div className="mt-4 text-danger text-sm">{result.error}</div>}
    </div>
  )
}
