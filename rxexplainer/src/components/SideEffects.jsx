import { useState, useEffect } from 'react'
import { apiPost } from '../api'

export default function SideEffects({ medicine, ageGroup, autoLoad = false }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (autoLoad && medicine) fetchEffects()
  }, [medicine, ageGroup, autoLoad])

  async function fetchEffects() {
    if (!medicine) return
    setLoading(true); setData(null)
    try {
      const res = await apiPost('/side-effects', { medicine, age_group: ageGroup })
      setData(res)
    } catch { setData({ error: true }) }
    setLoading(false)
  }

  const Tag = ({ label, type }) => {
    const styles = {
      serious: 'bg-[#3a1a1a] text-danger border border-[#6a2a2a]',
      mild:    'bg-[#3a2f10] text-warn border border-[#6a5010]',
      common:  'bg-[#0f2a1e] text-accent border border-[#1a5a30]',
    }
    return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium m-1 ${styles[type]}`}>{label}</span>
  }

  const Section = ({ title, icon, items, type, bg, border }) => (
    <div className={`rounded-xl p-4 ${bg} border ${border}`}>
      <div className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: type === 'serious' ? '#e07070' : type === 'mild' ? '#f0c060' : '#7ec8a4' }}>
        {icon} {title}
      </div>
      <div>
        {items?.length > 0
          ? items.map((s, i) => <Tag key={i} label={s} type={type} />)
          : <span className="text-muted text-xs">None listed</span>
        }
      </div>
    </div>
  )

  return (
    <div className="card">
      <div className="font-display text-accent text-xl mb-1">⚠️ Side Effects</div>
      <div className="text-muted text-sm mb-4">{medicine} · {ageGroup}</div>

      <div className="flex gap-4 flex-wrap mb-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />Serious — see doctor immediately</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warn inline-block" />Mild — monitor closely</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />Common — usually harmless</span>
      </div>

      {loading && <div className="text-center text-muted py-8">⏳ Analyzing side effects...</div>}

      {!loading && data && !data.error && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Section title="Serious" icon="🔴" items={data.serious} type="serious" bg="bg-[#2a1515]" border="border-[#6a2a2a]" />
            <Section title="Mild"    icon="🟡" items={data.mild}    type="mild"    bg="bg-[#2a2510]" border="border-[#6a5a10]" />
            <Section title="Common"  icon="🟢" items={data.common}  type="common"  bg="bg-[#102a1e]" border="border-[#1a5a3a]" />
          </div>
          {data.warning && (
            <div className="flex gap-3 bg-[#1a1a2a] border border-[#3a3a6a] rounded-xl p-4">
              <span className="text-lg flex-shrink-0">💡</span>
              <p className="text-sm text-[#b0b8d4] leading-relaxed">{data.warning}</p>
            </div>
          )}
        </>
      )}

      {!loading && data?.error && (
        <div className="text-center text-danger py-4 text-sm">Could not load side effects.</div>
      )}

      {!autoLoad && !loading && (
        <button className="btn-primary mt-4" onClick={fetchEffects}>Show Side Effects</button>
      )}
    </div>
  )
}
