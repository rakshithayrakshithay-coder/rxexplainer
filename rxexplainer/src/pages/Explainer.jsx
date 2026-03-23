import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost, apiGet, apiDelete } from '../api'
import SideEffects from '../components/SideEffects.jsx'
import SimilarMedicines from '../components/SimilarMedicines.jsx'
import DrugInteraction from '../components/DrugInteraction.jsx'
import Chatbot from '../components/Chatbot.jsx'
import { downloadPDF } from '../components/PrescriptionPDF.jsx'

const LANGUAGES = ['English','Hindi (हिंदी)','Kannada (ಕನ್ನಡ)','Tamil (தமிழ்)','Telugu (తెలుగు)','Malayalam (മലയാളം)','Bengali (বাংলা)','Marathi (मराठी)']
const AGE_GROUPS = [
  { label: '👶 Child',   sub: '0–12 yrs',  value: 'Child' },
  { label: '🧑 Adult',   sub: '13–59 yrs', value: 'Adult' },
  { label: '👴 Elderly', sub: '60+ yrs',   value: 'Elderly' },
]
const TABS = [
  { id: 'explain',     label: '💊 Explain Medicine' },
  { id: 'interaction', label: '⚠️ Drug Interaction' },
  { id: 'sideeffects', label: '🔴 Side Effects' },
]

export default function Explainer() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('rx_user') || '{}')
  const [tab, setTab] = useState('explain')

  const [medicine, setMedicine] = useState('')
  const [dosage, setDosage]     = useState('')
  const [language, setLanguage] = useState('English')
  const [ageGroup, setAgeGroup] = useState('Adult')
  const [age, setAge]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [history, setHistory]   = useState([])
  const [context, setContext]   = useState('')

  const [speaking, setSpeaking]   = useState(false)
  const [ttsSpeed, setTtsSpeed]   = useState(1.0)
  const [showSpeed, setShowSpeed] = useState(false)

  const [listeningFor, setListeningFor] = useState(null)
  const recognitionRef = useRef(null)

  const [seMedicine, setSeMedicine]   = useState('')
  const [seAgeGroup, setSeAgeGroup]   = useState('Adult')
  const [seTriggered, setSeTriggered] = useState(false)
  const [seKey, setSeKey]             = useState(0)

  useEffect(() => {
    const qm = sessionStorage.getItem('quick_medicine')
    const qd = sessionStorage.getItem('quick_dosage')
    if (qm) {
      setMedicine(qm); setDosage(qd || '')
      sessionStorage.removeItem('quick_medicine')
      sessionStorage.removeItem('quick_dosage')
      setTimeout(() => explainMedicine(qm, qd || ''), 300)
    }
    loadHistory()
  }, [])

  function logout() { localStorage.removeItem('rx_user'); navigate('/login') }

  async function loadHistory() {
    try { const d = await apiGet('/history'); setHistory(d) } catch {}
  }

  async function deleteHistory(id) {
    try {
      await apiDelete(`/history/${id}`)
      setHistory(prev => prev.filter(item => item.id !== id))
    } catch { alert('Could not delete.') }
  }

  function startVoice(field) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Use Chrome for voice input.'); return }
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setListeningFor(null); return }
    const r = new SR()
    recognitionRef.current = r
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1
    setListeningFor(field)
    r.onresult = e => {
      const val = e.results[0][0].transcript
      if (field === 'medicine') setMedicine(val)
      if (field === 'dosage')   setDosage(val)
      setListeningFor(null); recognitionRef.current = null
    }
    r.onerror = r.onend = () => { setListeningFor(null); recognitionRef.current = null }
    r.start()
  }

  function toggleSpeech() {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    if (!result?.response) return
    const u = new SpeechSynthesisUtterance(result.response)
    u.rate = ttsSpeed
    u.onstart = () => { setSpeaking(true); setShowSpeed(true) }
    u.onend = u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  function changeSpeed(val) {
    setTtsSpeed(val)
    if (speaking) {
      window.speechSynthesis.cancel(); setSpeaking(false)
      setTimeout(() => {
        const u = new SpeechSynthesisUtterance(result.response)
        u.rate = val
        u.onstart = () => setSpeaking(true)
        u.onend = u.onerror = () => setSpeaking(false)
        window.speechSynthesis.speak(u); setSpeaking(true)
      }, 100)
    }
  }

  async function explainMedicine(medOverride, dosOverride) {
    const med = medOverride ?? medicine
    const dos = dosOverride ?? dosage
    if (!med.trim()) { alert('Please enter a medicine name.'); return }
    window.speechSynthesis.cancel(); setSpeaking(false)
    setLoading(true); setResult(null); setContext('')
    try {
      const data = await apiPost('/explain', {
        medicine: med, dosage: dos, language,
        age_group: ageGroup, age
      })
      setResult(data)
      setContext(data.context || '')
      loadHistory()
    } catch { setResult({ error: 'Could not reach backend.' }) }
    setLoading(false)
  }

  function selectMedicine(name) {
    setMedicine(name); setDosage('')
    window.speechSynthesis.cancel(); setSpeaking(false)
    explainMedicine(name, '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const langValue = language.split(' ')[0]
  const sourceBadge = result?.source === 'vectordb' ? '🧠 Vector DB Match'
                    : result?.source === 'mysql'    ? '✓ Found in Database'
                    : '⚡ AI Generated'

  return (
    <div className="min-h-screen bg-bg px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">

        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 border border-border rounded-lg text-muted text-sm font-semibold hover:border-accent hover:text-accent transition-all">
            ← Dashboard
          </button>
          <div className="flex items-center gap-3">
            <span className="text-muted text-sm">👤 {user.name || user.email}</span>
            <button onClick={logout} className="px-3 py-1.5 border border-accent rounded-lg text-accent text-sm font-semibold hover:bg-accent hover:text-bg transition-all">
              Logout
            </button>
          </div>
        </div>

        <h1 className="font-display text-4xl text-accent text-center mb-1">💊 Rx Explainer</h1>
        <p className="text-muted text-sm text-center mb-7">Understand your prescription in plain language</p>

        <div className="flex gap-2 mb-5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn ${tab === t.id ? 'tab-btn-active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1 */}
        {tab === 'explain' && (
          <>
            <div className="card">
              <label className="block text-xs text-accent uppercase tracking-widest mb-2">Medicine Name</label>
              <div className="relative mb-1">
                <input
                  className="input-field pr-12"
                  placeholder="e.g. Amoxicillin, Metformin..."
                  value={medicine}
                  onChange={e => setMedicine(e.target.value)}
                />
                <button onClick={() => startVoice('medicine')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xl ${listeningFor === 'medicine' ? 'text-danger animate-pulse-glow' : 'text-muted hover:text-accent'}`}>
                  🎤
                </button>
              </div>
              {listeningFor === 'medicine' && <p className="text-xs text-danger mb-3">🔴 Listening for medicine name...</p>}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-xs text-accent uppercase tracking-widest mb-2">Dosage</label>
                  <div className="relative">
                    <input
                      className="input-field pr-12"
                      placeholder="e.g. 500mg twice daily"
                      value={dosage}
                      onChange={e => setDosage(e.target.value)}
                    />
                    <button onClick={() => startVoice('dosage')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-xl ${listeningFor === 'dosage' ? 'text-danger animate-pulse-glow' : 'text-muted hover:text-accent'}`}>
                      🎤
                    </button>
                  </div>
                  {listeningFor === 'dosage' && <p className="text-xs text-danger mt-1">🔴 Listening for dosage...</p>}
                </div>
                <div>
                  <label className="block text-xs text-accent uppercase tracking-widest mb-2">🌐 Language</label>
                  <select className="input-field" value={language} onChange={e => setLanguage(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <label className="block text-xs text-accent uppercase tracking-widest mb-2 mt-4">👤 Patient Age Group</label>
              <div className="flex gap-2 mb-3">
                {AGE_GROUPS.map(g => (
                  <button key={g.value} onClick={() => setAgeGroup(g.value)}
                    className={`age-chip ${ageGroup === g.value ? 'age-chip-active' : ''}`}>
                    {g.label}<br /><span className="text-xs font-normal">{g.sub}</span>
                  </button>
                ))}
              </div>

              {ageGroup !== 'Adult' && (
                <div className="mb-4">
                  <label className="block text-xs text-accent uppercase tracking-widest mb-2">Exact Age (optional)</label>
                  <input className="input-field" type="number" placeholder="e.g. 8" min="0" max="120"
                    value={age} onChange={e => setAge(e.target.value)} />
                </div>
              )}

              <button className="btn-primary mt-1" onClick={() => explainMedicine()} disabled={loading}>
                {loading ? '⏳ Analyzing...' : 'Explain This Medicine'}
              </button>
            </div>

            {result && !result.error && (
              <div className="card">
                <div className="mb-3">
                  <span className={result.source === 'vectordb' ? 'source-badge' : 'badge'}>{sourceBadge}</span>
                  <span className="badge">
                    {ageGroup === 'Child' ? '👶' : ageGroup === 'Elderly' ? '👴' : '🧑'} {ageGroup}{age ? ` (${age} yrs)` : ''}
                  </span>
                  {language !== 'English' && <span className="badge">🌐 {langValue}</span>}
                </div>
                <div className="bg-bg border-l-4 border-accent px-5 py-4 rounded-r-lg text-sm leading-relaxed whitespace-pre-wrap">
                  {result.response}
                </div>
                <div className="flex gap-3 mt-4">
                  <button className="btn-outline"
                    onClick={() => downloadPDF({ medicine, dosage, ageGroup, response: result.response, userName: user.name || user.email })}>
                    📄 Download PDF
                  </button>
                  <button className={`btn-outline ${speaking ? 'bg-[#1e3a2f] animate-pulse-glow' : ''}`} onClick={toggleSpeech}>
                    {speaking ? '⏹️ Stop Reading' : '🔊 Read Aloud'}
                  </button>
                </div>
                {showSpeed && (
                  <div className="flex items-center gap-3 mt-3 px-4 py-2.5 bg-bg border border-border rounded-lg">
                    <span className="text-xs text-muted whitespace-nowrap">🐢 Speed:</span>
                    <input type="range" min="0.5" max="2" step="0.1" value={ttsSpeed}
                      onChange={e => changeSpeed(parseFloat(e.target.value))}
                      className="flex-1 accent-accent cursor-pointer" />
                    <span className="text-xs text-accent font-semibold w-8">{ttsSpeed.toFixed(1)}x</span>
                  </div>
                )}
              </div>
            )}

            {result?.error && <div className="card text-danger text-sm">{result.error}</div>}

            {result && !result.error && (
              <Chatbot medicine={medicine} ageGroup={ageGroup} context={context} />
            )}

            {result && !result.error && (
              <SideEffects medicine={medicine} ageGroup={ageGroup} autoLoad />
            )}

            {result && !result.error && (
              <SimilarMedicines medicine={medicine} onSelect={selectMedicine} />
            )}

            <div className="card">
              <h2 className="font-display text-accent text-xl mb-4">Recent Queries</h2>
              {history.length === 0
                ? <p className="text-muted text-sm">No history yet.</p>
                : history.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                    <div className="flex-1">
                      <div className="text-accent text-sm font-semibold mb-0.5">🔍 {item.user_input}</div>
                      <div className="text-muted text-xs">{item.ai_response?.substring(0, 100)}...</div>
                    </div>
                    <button
                      onClick={() => deleteHistory(item.id)}
                      className="text-muted hover:text-danger transition-colors text-lg flex-shrink-0 mt-0.5"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* TAB 2 */}
        {tab === 'interaction' && <DrugInteraction />}

        {/* TAB 3 */}
        {tab === 'sideeffects' && (
          <>
            <div className="card">
              <h2 className="font-display text-accent text-xl mb-2">🔴 Side Effects Highlighter</h2>
              <p className="text-muted text-sm mb-5">Search any medicine to see its side effects by severity.</p>
              <label className="block text-xs text-accent uppercase tracking-widest mb-2">Medicine Name</label>
              <input className="input-field mb-4" placeholder="e.g. Ibuprofen, Metformin..."
                value={seMedicine} onChange={e => setSeMedicine(e.target.value)} />
              <label className="block text-xs text-accent uppercase tracking-widest mb-2">👤 Patient Age Group</label>
              <div className="flex gap-2 mb-5">
                {AGE_GROUPS.map(g => (
                  <button key={g.value} onClick={() => setSeAgeGroup(g.value)}
                    className={`age-chip ${seAgeGroup === g.value ? 'age-chip-active' : ''}`}>
                    {g.label}
                  </button>
                ))}
              </div>
              <button className="btn-primary" onClick={() => { setSeTriggered(true); setSeKey(k => k + 1) }}>
                Show Side Effects
              </button>
            </div>
            {seTriggered && seMedicine && (
              <SideEffects key={seKey} medicine={seMedicine} ageGroup={seAgeGroup} autoLoad />
            )}
          </>
        )}
      </div>
    </div>
  )
}