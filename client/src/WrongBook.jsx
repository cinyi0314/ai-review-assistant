import { useState, useEffect } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

async function safeJson(res) {
  const t = await res.text()
  if (!t) return []
  try { return JSON.parse(t) }
  catch { return [] }
}

function WrongBook({ subjectId, onBack }) {
  const [filter, setFilter] = useState('all') // all | type | knowledge
  const [wrongList, setWrongList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWrongBook()
  }, [subjectId])

  const loadWrongBook = async () => {
    if (!subjectId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/wrong-questions/subject/${subjectId}`)
      const data = await safeJson(res)
      setWrongList(data.wrongQuestions || [])
    } catch { /* 静默 */ }
    setLoading(false)
  }

  const handleRemove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/wrong-questions/${id}`, { method: 'DELETE' })
      if (res.ok) setWrongList(prev => prev.filter(w => w.id !== id))
    } catch { /* 静默 */ }
  }

  const handleRedo = (q) => {
    // 重做：把题目重新显示为答题模式
    setWrongList(prev => prev.map(w => w.id === q.id ? { ...w, _redoing: true } : w))
  }

  const handleRedoAnswer = (q, userAnswer) => {
    setWrongList(prev => prev.map(w => {
      if (w.id !== q.id) return w
      return { ...w, _redoing: false, _redoResult: userAnswer === q.correctAnswer ? 'correct' : 'wrong' }
    }))
  }

  const handleExport = () => {
    const text = wrongList.map((w, i) =>
      `${i + 1}. ${w.question}\n   你的答案：${w.userAnswer || '(未作答)'}\n   正确答案：${w.correctAnswer}\n   解析：${w.explanation}\n   错误次数：${w.reviewCount || 1}\n`
    ).join('\n---\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `错题本_${new Date().toLocaleDateString()}.txt`
    a.click()
  }

  const mastered = wrongList.filter(w => w.reviewCount >= 5).length

  if (loading) return <div className="app"><header className="header"><h1>📕 错题本</h1></header><section className="card"><p className="empty-hint">加载中...</p></section></div>

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>📕 错题本</h1>
          <button className="btn-quick" onClick={handleExport}>📥 导出</button>
        </div>
      </header>

      {/* 筛选 */}
      <section className="card" style={{ padding: '12px 20px' }}>
        <div className="quick-links">
          <button className={`btn-quick ${filter === 'all' ? 'btn-active' : ''}`} onClick={() => setFilter('all')}>全部</button>
          <button className={`btn-quick ${filter === 'type' ? 'btn-active' : ''}`} onClick={() => setFilter('type')}>按题型</button>
          <button className={`btn-quick ${filter === 'knowledge' ? 'btn-active' : ''}`} onClick={() => setFilter('knowledge')}>按知识点</button>
        </div>
      </section>

      {/* 列表 */}
      <section className="card">
        {wrongList.length === 0 ? (
          <p className="empty-hint">🎉 暂无错题</p>
        ) : (
          <div className="wrong-list">
            {wrongList.map((w) => (
              <div key={w.id} className="wrong-item">
                <div className="wrong-item-body">
                  <p className="wrong-question">{w.question}</p>
                  <p className="wrong-detail">❌ 你的答案：<span className="highlight-wrong">{w.userAnswer || '(未作答)'}</span></p>
                  <p className="wrong-detail">✅ 正确答案：<span className="highlight-correct">{w.correctAnswer}</span></p>
                  <p className="wrong-explain">{w.explanation}</p>
                  <p className="wrong-detail" style={{ marginTop: 4 }}>错误次数：{w.reviewCount || 1}</p>

                  {/* 重做结果 */}
                  {w._redoResult && (
                    <p className={`success ${w._redoResult === 'wrong' ? 'error' : ''}`} style={{ marginTop: 6 }}>
                      {w._redoResult === 'correct' ? '✅ 重做正确！' : '❌ 仍然错误，继续练习'}
                    </p>
                  )}

                  {/* 重做答题 */}
                  {w._redoing && (w.options || []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {w.options.map((opt, oi) => {
                        const letter = typeof opt === 'string' ? opt.charAt(0) : String.fromCharCode(65 + oi)
                        return (
                          <button key={oi} className="btn-quick" style={{ margin: 2 }} onClick={() => handleRedoAnswer(w, letter)}>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn-reanswer" onClick={() => handleRedo(w)}>🔄 重做</button>
                  <button className="btn-reanswer" style={{ background: 'rgba(231,76,60,0.1)', borderColor: 'rgba(231,76,60,0.3)', color: '#e74c3c' }} onClick={() => handleRemove(w.id)}>移出</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 统计 */}
        {wrongList.length > 0 && (
          <p className="card-hint" style={{ marginTop: 16, textAlign: 'center' }}>
            共 <strong>{wrongList.length}</strong> 道错题，已掌握 <strong>{mastered}</strong> 道
          </p>
        )}
      </section>

      <section className="card">
        <button className="btn-primary" onClick={onBack}>返回首页</button>
      </section>
    </div>
  )
}

export default WrongBook
