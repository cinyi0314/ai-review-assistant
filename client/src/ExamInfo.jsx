import { useState } from 'react'

function ExamInfo({ onNext, onBack, onSave }) {
  const [examDate, setExamDate] = useState('')
  const [targetScore, setTargetScore] = useState('')
  const [errors, setErrors] = useState({})

  const handleNext = () => {
    const errs = {}
    if (!examDate) errs.date = '请选择考试日期'
    if (!targetScore || targetScore < 1 || targetScore > 100) errs.score = '请输入 1-100 之间的目标成绩'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    onSave({ examDate, targetScore: Number(targetScore) })
    onNext()
  }

  return (
    <div className="subject-creation-page">
      <div className="subject-creation-card" style={{ maxWidth: 480 }}>
        <h1 className="sc-title">📅 考试信息</h1>
        <p className="sc-subtitle">设置考试日期和目标成绩，AI 将据此调整复习节奏</p>

        {/* 考试日期 */}
        <div className="ei-field">
          <label className="ei-label">考试日期</label>
          <input
            type="date"
            className={`sc-input ${errors.date ? 'ei-input-error' : ''}`}
            style={{ textAlign: 'left', fontSize: 15, padding: '12px 14px' }}
            value={examDate}
            onChange={(e) => { setExamDate(e.target.value); setErrors({}) }}
          />
          {errors.date && <p className="sc-error">{errors.date}</p>}
        </div>

        {/* 目标成绩 */}
        <div className="ei-field">
          <label className="ei-label">目标成绩（1-100）</label>
          <input
            type="number"
            min={1}
            max={100}
            className={`sc-input ${errors.score ? 'ei-input-error' : ''}`}
            style={{ textAlign: 'left', fontSize: 15, padding: '12px 14px' }}
            placeholder="如：85"
            value={targetScore}
            onChange={(e) => { setTargetScore(e.target.value); setErrors({}) }}
          />
          {errors.score && <p className="sc-error">{errors.score}</p>}
        </div>

        {/* 底部 */}
        <div className="tb-footer">
          <button
            className="sc-btn"
            style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}
            onClick={onBack}
          >
            ← 上一步
          </button>
          <button className="sc-btn" onClick={handleNext}>
            下一步 →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExamInfo
