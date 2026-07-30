import { useState } from 'react'

const PRESET_TYPES = [
  { name: '单选题', desc: '四个选项，只有一个正确答案' },
  { name: '多选题', desc: '多选少选错选均不给分' },
  { name: '判断题', desc: '正确或错误，二选一' },
  { name: '简答题', desc: '用文字简要回答问题' },
  { name: '辨析题', desc: '判断正误并说明理由' },
  { name: '论述题', desc: '展开论述，考查综合分析能力' },
]

function createType(name, desc) {
  return { name, desc, enabled: true, score: 2, count: 5 }
}

function QuestionTypeSettings({ onNext, onBack, onSave }) {
  const [types, setTypes] = useState(PRESET_TYPES.map((t) => createType(t.name, t.desc)))
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const handleToggle = (idx) => {
    setTypes((prev) => prev.map((t, i) => (i === idx ? { ...t, enabled: !t.enabled } : t)))
  }

  const handleChange = (idx, field, value) => {
    setTypes((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    setTypes((prev) => [...prev, createType(newName.trim(), newDesc.trim())])
    setNewName('')
    setNewDesc('')
    setShowAdd(false)
  }

  const handleNext = () => {
    const enabled = types.filter((t) => t.enabled)
    onSave(enabled)
    onNext()
  }

  return (
    <div className="subject-creation-page">
      <div className="subject-creation-card" style={{ maxWidth: 720 }}>
        <h1 className="sc-title">📝 题型设置</h1>
        <p className="sc-subtitle">选择考试题型并设置分值和数量，AI 将按此配置生成题目</p>

        {/* 表头 */}
        <div className="qts-header">
          <span className="qts-col-check">启用</span>
          <span className="qts-col-name">题型</span>
          <span className="qts-col-desc">考法描述</span>
          <span className="qts-col-num">分值</span>
          <span className="qts-col-num">数量</span>
        </div>

        {/* 题型列表 */}
        <div className="qts-list">
          {types.map((t, i) => (
            <div key={i} className={`qts-row ${t.enabled ? '' : 'qts-disabled'}`}>
              <label className="qts-col-check">
                <input type="checkbox" checked={t.enabled} onChange={() => handleToggle(i)} />
              </label>
              <span className="qts-col-name">{t.name}</span>
              <input
                className="qts-desc-input"
                value={t.desc}
                onChange={(e) => handleChange(i, 'desc', e.target.value)}
                placeholder="描述该题型的考法..."
                disabled={!t.enabled}
              />
              <input
                className="qts-num-input"
                type="number"
                min={1}
                max={10}
                value={t.score}
                onChange={(e) => handleChange(i, 'score', Number(e.target.value))}
                disabled={!t.enabled}
              />
              <input
                className="qts-num-input"
                type="number"
                min={1}
                max={20}
                value={t.count}
                onChange={(e) => handleChange(i, 'count', Number(e.target.value))}
                disabled={!t.enabled}
              />
            </div>
          ))}
        </div>

        {/* 添加自定义题型 */}
        {showAdd ? (
          <div className="qts-add-row">
            <input
              className="qts-desc-input"
              placeholder="题型名称（如：完形填空）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              autoFocus
            />
            <input
              className="qts-desc-input"
              placeholder="描述（可留空）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <button className="sc-btn" style={{ fontSize: 13, padding: '6px 14px' }} onClick={handleAdd}>添加</button>
            <button className="sc-btn" style={{ fontSize: 13, padding: '6px 14px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setShowAdd(false)}>取消</button>
          </div>
        ) : (
          <button className="sc-btn" style={{ fontSize: 14, padding: '8px 20px', background: 'transparent', color: 'var(--accent)', border: '1px dashed var(--accent-border)' }} onClick={() => setShowAdd(true)}>
            + 添加自定义题型
          </button>
        )}

        {/* 底部 */}
        <div className="tb-footer">
          <button className="sc-btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={onBack}>
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

export default QuestionTypeSettings
