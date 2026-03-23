import { useState, useEffect } from 'react'
import { apiPost } from '../api'

export default function SimilarMedicines({ medicine, onSelect }) {
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!medicine) return
    setLoading(true)
    apiPost('/similar', { medicine })
      .then(d => setSimilar(d.similar || []))
      .catch(() => setSimilar([]))
      .finally(() => setLoading(false))
  }, [medicine])

  if (loading) return (
    <div className="card">
      <h2 className="font-display text-accent text-xl mb-3">🔗 Similar Medicines</h2>
      <div className="text-muted text-sm text-center py-4">🔍 Finding similar medicines...</div>
    </div>
  )

  if (!similar.length) return null

  return (
    <div className="card">
      <h2 className="font-display text-accent text-xl mb-4">🔗 Similar Medicines</h2>
      <div className="grid grid-cols-2 gap-3">
        {similar.map((med, i) => (
          <div
            key={i}
            onClick={() => onSelect(med.name)}
            className="bg-bg border border-border rounded-xl p-4 cursor-pointer transition-colors hover:border-accent"
          >
            <div className="text-accent font-semibold text-sm mb-1">💊 {med.name}</div>
            <div className="text-muted text-xs mb-1">{med.category} · {med.indication}</div>
            <div className="text-muted text-xs mb-2">{med.dosage_form} · {med.strength}</div>
            <div className="text-xs text-[#4a9a74] font-semibold">⚡ {med.similarity}% match</div>
          </div>
        ))}
      </div>
    </div>
  )
}
