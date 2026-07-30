import { useState } from 'react'

function SubjectCreation({ onCreate, onBack }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入课程名称')
      return
    }
    setError('')
    onCreate(trimmed)
  }

  return (
    <div className="subject-creation-page">
      {onBack && <button className="back-btn-top" onClick={onBack}>← 返回</button>}
      <div className="subject-creation-card">
        <h1 className="sc-title">📚 创建复习科目</h1>
        <p className="sc-subtitle">输入课程名称，AI 将帮你一键生成专属复习计划</p>

        <input
          className="sc-input"
          type="text"
          placeholder="请输入课程名称，如「高等数学」"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          autoFocus
        />

        {error && <p className="sc-error">{error}</p>}

        <button className="sc-btn" onClick={handleCreate}>
          确认
        </button>

        <p className="sc-hint">
          已有科目？系统会自动恢复上次打开的科目
        </p>
      </div>
    </div>
  )
}

export default SubjectCreation
