import { useState } from 'react'

const PRESET_BOOKS = [
  '高等数学（上）',
  '高等数学（下）',
  '线性代数',
  '概率论与数理统计',
  '金融工程导论',
]

function TextbookSource({ onNext, onBack, selected, onSelect }) {
  const [mode, setMode] = useState(null) // 'search' | 'upload' | null
  const [search, setSearch] = useState('')
  const [ebookFile, setEbookFile] = useState(null)

  const filtered = PRESET_BOOKS.filter((b) =>
    b.toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirm = () => {
    if (mode === 'upload' && ebookFile) {
      onSelect({ type: 'upload', file: ebookFile })
    } else if (mode === 'search' && selected) {
      onSelect({ type: 'preset', name: selected })
    }
    onNext()
  }

  const canProceed = mode === 'skip' || (mode === 'search' && selected) || (mode === 'upload' && ebookFile)

  return (
    <div className="subject-creation-page">
      <button className="back-btn-top" onClick={onBack}>← 返回</button>
      <div className="subject-creation-card" style={{ maxWidth: 680 }}>
        <h1 className="sc-title">📖 选择教材来源</h1>
        <p className="sc-subtitle">选择课程使用的教材，AI 将据此生成更精准的复习内容</p>

        {/* 三个卡片 */}
        <div className="textbook-cards">
          {/* 搜索 */}
          <div className={`tb-card ${mode === 'search' ? 'tb-card-active' : ''}`} onClick={() => setMode('search')}>
            <div className="tb-card-icon">🔍</div>
            <div className="tb-card-title">搜索已有教材</div>
            <div className="tb-card-desc">从教材库中选择</div>
          </div>

          {/* 上传 */}
          <div className={`tb-card ${mode === 'upload' ? 'tb-card-active' : ''}`} onClick={() => setMode('upload')}>
            <div className="tb-card-icon">📤</div>
            <div className="tb-card-title">上传电子书</div>
            <div className="tb-card-desc">支持 PDF / EPUB / TXT</div>
          </div>

          {/* 跳过 */}
          <div className={`tb-card ${mode === 'skip' ? 'tb-card-active' : ''}`} onClick={() => { setMode('skip'); onNext() }}>
            <div className="tb-card-icon">⏭️</div>
            <div className="tb-card-title">跳过</div>
            <div className="tb-card-desc">稍后再添加</div>
          </div>
        </div>

        {/* 搜索模式 */}
        {mode === 'search' && (
          <div className="tb-panel">
            <input
              className="sc-input"
              style={{ textAlign: 'left', fontSize: 15, padding: '10px 14px' }}
              placeholder="搜索教材名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="tb-book-list">
              {filtered.map((book) => (
                <div
                  key={book}
                  className={`tb-book-item ${selected === book ? 'tb-book-selected' : ''}`}
                  onClick={() => onSelect({ type: 'preset', name: book })}
                >
                  <span className="tb-book-icon">📘</span>
                  <span className="tb-book-name">{book}</span>
                  {selected === book && <span className="tb-check">✅</span>}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="tb-empty">未找到匹配的教材</p>
              )}
            </div>
          </div>
        )}

        {/* 上传模式 */}
        {mode === 'upload' && (
          <div className="tb-panel">
            <input
              type="file"
              accept=".txt,.pdf,.epub"
              className="sc-input"
              style={{ textAlign: 'left', fontSize: 14, padding: '10px 14px' }}
              onChange={(e) => {
                const f = e.target.files[0]
                setEbookFile(f)
                if (f) onSelect({ type: 'upload', file: f, name: f.name })
              }}
            />
            {ebookFile && (
              <p className="success" style={{ marginTop: 10 }}>✅ 已选择：{ebookFile.name}</p>
            )}
          </div>
        )}

        {/* 已选提示 */}
        {selected && mode !== 'skip' && (
          <p className="success" style={{ marginTop: 16 }}>
            {selected.type === 'preset' ? `📘 已选择：${selected.name}` : `📤 已选择：${selected.name}`}
          </p>
        )}

        {/* 底部按钮 */}

      </div>
    </div>
  )
}

export default TextbookSource
