import { useState, useEffect } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

async function safeJson(res) {
  const text = await res.text()
  if (!text) return { knowledgePoints: [] }
  try { return JSON.parse(text) }
  catch { return { knowledgePoints: [] } }
}

function ReciteMode({ subjectId, onBack }) {
  const [cards, setCards] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mastered, setMastered] = useState({})

  useEffect(() => {
    loadKnowledge()
  }, [subjectId])

  const loadKnowledge = async () => {
    if (!subjectId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/knowledge/subject/${subjectId}`)
      const data = await safeJson(res)
      const list = (data.knowledgePoints || []).filter(k => !k.mastered)
      setCards([...list].sort(() => Math.random() - 0.5))
    } catch { /* 静默 */ }
    setLoading(false)
  }

  const handleToggle = async (id, val) => {
    setMastered(prev => ({ ...prev, [id]: val }))
    try {
      await fetch(`${API_BASE}/knowledge/${id}/toggle`, { method: 'PUT' })
    } catch { /* 静默 */ }
  }

  const goNext = () => {
    if (currentIdx + 1 >= cards.length) setCurrentIdx(0)
    else setCurrentIdx(i => i + 1)
  }
  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  if (loading) return <div className="app"><header className="header"><h1>📖 背题模式</h1></header><section className="card"><p className="empty-hint">加载中...</p></section></div>

  if (cards.length === 0) {
    return (
      <div className="app"><header className="header"><h1>📖 背题模式</h1></header>
        <section className="card" style={{ textAlign: 'center' }}>
          <p className="empty-hint">暂无知识点，请先生成复习内容</p>
          <button className="btn-primary" onClick={onBack}>返回首页</button>
        </section>
      </div>
    )
  }

  const card = cards[currentIdx]
  const isMastered = mastered[card.id]

  return (
    <div className="app"><header className="header"><h1>📖 背题模式</h1><p className="subtitle">{currentIdx + 1} / {cards.length}</p></header>
      <section className="card" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="recite-card" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          if (x > rect.width / 2) goNext()
          else goPrev()
        }}>
          <p className="recite-content">{card.content}</p>
        </div>
        <p className="card-hint" style={{ textAlign: 'center', marginTop: 10 }}>← 点击卡片左侧上一张 | 右侧下一张 →</p>
        <div className="tb-footer">
          <button className={`btn-mastery ${isMastered === true ? '' : 'mastered'}`} onClick={() => handleToggle(card.id, !isMastered)}>
            {isMastered ? '✅ 已掌握' : '🔄 未掌握'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ReciteMode
