import { useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

function PracticeMode({ questionTypes, questions, onBack }) {
  const [mode, setMode] = useState('select') // select | count | quiz | result
  const [selectedTypes, setSelectedTypes] = useState([])
  const [questionCount, setQuestionCount] = useState(10)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showAnswer, setShowAnswer] = useState({})
  const [saved, setSaved] = useState({})
  const [quizQuestions, setQuizQuestions] = useState([])

  const toggleType = (t) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const startQuiz = () => {
    let pool = questions || []
    if (selectedTypes.length > 0) pool = pool.filter(q => selectedTypes.includes(q.type))
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, questionCount)
    setQuizQuestions(shuffled)
    setCurrentIdx(0)
    setAnswers({})
    setShowAnswer({})
    setMode('quiz')
  }

  const handleAnswer = (qi, answer) => {
    setAnswers(prev => ({ ...prev, [qi]: answer }))
    setShowAnswer(prev => ({ ...prev, [qi]: true }))
  }

  const handleSaveWrong = async (q) => {
    if (saved[q.id]) return
    setSaved(prev => ({ ...prev, [q.id]: true }))
    try {
      await fetch(`${API_BASE}/wrong-questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: 'practice', question: q.question, userAnswer: answers[q.id] || '', correctAnswer: q.answer, explanation: q.explanation })
      })
    } catch { /* 静默 */ }
  }

  const correctCount = quizQuestions.filter(q => answers[q.id] === q.answer).length

  if (mode === 'select' && questionTypes) {
    return (
      <div className="app"><header className="header"><h1>📝 刷题模式</h1></header>
        <section className="card">
          <h2>选择题型</h2>
          <div className="type-checkboxes">
            {questionTypes.map(t => (
              <label key={t.name} className="checkbox-label">
                <input type="checkbox" checked={selectedTypes.includes(t.name)} onChange={() => toggleType(t.name)} />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
          <p className="card-hint">不选则随机混合出题</p>
          <button className="btn-primary" onClick={() => setMode('count')}>下一步 →</button>
        </section>
      </div>
    )
  }

  if (mode === 'count') {
    return (
      <div className="app"><header className="header"><h1>📝 刷题模式</h1></header>
        <section className="card" style={{ textAlign: 'center' }}>
          <h2>选择题量</h2>
          <div className="count-grid">
            {[5, 10, 15, 20].map(n => (
              <button key={n} className={`btn-quick ${questionCount === n ? 'btn-active' : ''}`} onClick={() => setQuestionCount(n)}>{n} 道</button>
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={startQuiz}>开始刷题</button>
        </section>
      </div>
    )
  }

  if (mode === 'quiz' && quizQuestions.length > 0) {
    const q = quizQuestions[currentIdx]
    const qi = q.id || currentIdx
    return (
      <div className="app"><header className="header"><h1>📝 刷题</h1><p className="subtitle">{currentIdx + 1} / {quizQuestions.length}</p></header>
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{ flex: 1 }}>{q.question}</h2>
            <button className="btn-quick" style={{ fontSize: 16 }} onClick={() => handleSaveWrong(q)}>{saved[qi] ? '⭐' : '☆'}</button>
          </div>
          {(q.options || []).length > 0 && (
            <div className="options">
              {q.options.map((opt, oi) => {
                const letter = typeof opt === 'string' ? opt.charAt(0) : String.fromCharCode(65 + oi)
                const isSelected = answers[qi] === letter
                const isCorrect = letter === q.answer
                return (
                  <label key={oi} className={`option ${showAnswer[qi] ? (isCorrect ? 'opt-correct' : isSelected ? 'opt-wrong' : '') : ''}`}>
                    <input type="radio" name={`q${qi}`} value={letter} checked={isSelected}
                      onChange={() => handleAnswer(qi, letter)} disabled={showAnswer[qi]} />
                    <span>{opt}</span>
                  </label>
                )
              })}
            </div>
          )}
          {showAnswer[qi] && (
            <div className={`answer-box ${answers[qi] === q.answer ? 'correct' : 'wrong'}`}>
              <p><strong>{answers[qi] === q.answer ? '✅ 正确' : '❌ 错误'}</strong> — 答案：{q.answer}</p>
              <p className="explanation">{q.explanation}</p>
            </div>
          )}
          <div className="tb-footer" style={{ marginTop: 16 }}>
            <button onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)} disabled={currentIdx === 0}>上一题</button>
            {currentIdx < quizQuestions.length - 1 ? (
              <button className="btn-primary" onClick={() => setCurrentIdx(currentIdx + 1)}>下一题 →</button>
            ) : (
              <button className="btn-primary" onClick={() => setMode('result')}>查看结果</button>
            )}
          </div>
        </section>
      </div>
    )
  }

  if (mode === 'result') {
    return (
      <div className="app"><header className="header"><h1>📊 答题结果</h1></header>
        <section className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 48, margin: '16px 0' }}>{correctCount} / {quizQuestions.length}</h2>
          <p style={{ fontSize: 18, color: correctCount / quizQuestions.length >= 0.6 ? '#27ae60' : '#e74c3c' }}>
            正确率 {Math.round((correctCount / quizQuestions.length) * 100)}%
          </p>
          <div className="tb-footer">
            <button onClick={() => setMode('select')}>再刷一次</button>
            <button className="btn-primary" onClick={onBack}>返回首页</button>
          </div>
        </section>
      </div>
    )
  }

  // Fallback: no questions loaded yet
  return (
    <div className="app"><header className="header"><h1>📝 刷题模式</h1></header>
      <section className="card"><p className="empty-hint">暂无可用的题目，请先生成复习内容</p>
        <button className="btn-primary" onClick={onBack}>返回首页</button>
      </section>
    </div>
  )
}

export default PracticeMode
