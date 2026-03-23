import { useState, useRef, useEffect } from 'react'
import { apiPost } from '../api'

export default function Chatbot({ medicine, ageGroup, context }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hi! I'm your medicine assistant for **${medicine}**. You can ask me anything about this medicine — dosage, side effects, food interactions, missed doses, or anything else! 💊`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg = { role: 'user', text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)
    try {
      const history = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }))
      const data = await apiPost('/chat', {
        medicine, age_group: ageGroup, context, history, message: text
      })
      setMessages(prev => [...prev, { role: 'assistant', text: data.response || 'Sorry, I could not get a response.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  const suggestions = [
    'Can I take this with food?',
    'What if I miss a dose?',
    'Is this safe during pregnancy?',
    'Can I drink alcohol with this?',
  ]

  function formatText(text) {
    return text.split('**').map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-accent">{part}</strong> : part
    )
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#1e3a2f] rounded-full flex items-center justify-center text-xl">🤖</div>
        <div>
          <div className="font-display text-accent text-lg">Medicine Chatbot</div>
          <div className="text-xs text-muted">Ask anything about {medicine}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          <span className="text-xs text-accent">Online</span>
        </div>
      </div>

      <div className="bg-bg border border-border rounded-xl p-4 h-72 overflow-y-auto mb-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-[#1e3a2f] rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">🤖</div>
            )}
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-bg rounded-br-sm'
                : 'bg-surface border border-border text-text rounded-bl-sm'
            }`}>
              {formatText(msg.text)}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-0.5 text-bg font-bold">U</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-[#1e3a2f] rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0">🤖</div>
            <div className="bg-surface border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              className="px-3 py-1.5 bg-bg border border-border rounded-full text-xs text-muted hover:border-accent hover:text-accent transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          placeholder={`Ask about ${medicine}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}
          className="px-5 py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
          Send →
        </button>
      </div>

      {messages.length > 2 && (
        <button
          onClick={() => setMessages([{ role: 'assistant', text: `Hi! I'm your medicine assistant for **${medicine}**. You can ask me anything about this medicine! 💊` }])}
          className="mt-3 text-xs text-muted hover:text-danger transition-colors w-full text-center">
          🗑️ Clear chat
        </button>
      )}
    </div>
  )
}