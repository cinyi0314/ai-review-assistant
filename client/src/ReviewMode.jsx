import { useState, useEffect } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

async function safeJson(res) {
  const text = await res.text()
  if (!text) throw new Error(`空响应 (${res.status})`)
  try { return JSON.parse(text) }
  catch { throw new Error(text.slice(0, 200)) }
}

function ReviewMode({ subjectId, onBack }) {
  const [reviews, setReviews] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAnswer, setShowAnswer] = useState({})
  const [mastered, setMastered] = useState({})

  useEffect(() => {
    loadReviews()
  }, [subjectId])

  const loadReviews = async () => {
    if (!subjectId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/due-reviews/subject/${subjectId}`)
      const data = await safeJson(res)
      if (res.ok) {
        const list = data.dueReviews || []
        list.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
        setReviews(list)
      }
    } catch { /* 静默 */ }
    setLoading(false)
  }

  const handleMastered = async (id) => {
    setMastered(prev => ({ ...prev, [id]: true }))
    try {
      await fetch(`${API_BASE}/due-reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
    } catch { /* 静默 */ }
  }

  const handleNext = () => {
    setShowAnswer(prev => ({ ...prev, [reviews[currentIdx]?.id]: false }))
    if (currentIdx + 1 >= reviews.length) {
      loadReviews()
      setCurrentIdx(0)
    } else {
      setCurrentIdx(i => i + 1)
    }
  }

  if (loading) return <div className="app"><header className="header"><h1>🔄 复习模式</h1></header><section className="card"><p className="empty-hint">加载中...</p></section></div>

  if (reviews.length === 0) {
    return (
      <div className="app"><header className="header"><h1>🔄 复习模式</h1></header>
        <section className="card" style={{ textAlign: 'center' }}>
          <p className="empty-hint">🎉 暂无需要复习的题目</p>
          <button className="btn-primary" onClick={onBack}>返回首页</button>
        </section>
      </div>
    )
  }

  const q = reviews[currentIdx]
  if (!q) return null

  return (
    <div className="app"><header className="header"><h1>🔄 复习模式</h1><p className="subtitle">{currentIdx + 1} / {reviews.length} 道待复习</p></header>
      <section className="card">
        <h2>{q.question}</h2>
        {(q.options || []).length > 0 && (
          <div className="options" style={{ marginTop: 12 }}>
            {q.options.map((opt, oi) => (
              <div key={oi} className="option"><span>{opt}</span></div>
            ))}
          </div>
        )}
        {!showAnswer[q.id] ? (
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAnswer(prev => ({ ...prev, [q.id]: true }))}>
            显示答案
          </button>
        ) : (
          <div className="answer-box reveal" style={{ marginTop: 12 }}>
            <p><strong>✅ 正确答案：</strong>{q.correctAnswer}</p>
            <p className="explanation">{q.explanation}</p>
          </div>
        )}
        <p className="wrong-detail" style={{ marginTop: 8 }}>
          ❌ 你的答案：<span className="highlight-wrong">{q.userAnswer || '(未作答)'}</span>
        </p>
        <div className="tb-footer">
          <button className="btn-primary" style={{ background: '#27ae60', borderColor: '#27ae60' }} onClick={() => { handleMastered(q.id); handleNext() }}>
            ✅ 已掌握
          </button>
          <button onClick={handleNext}>跳过</button>
        </div>
      </section>
    </div>
  )
}

export default ReviewMode
