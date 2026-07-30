import { useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

async function safeJson(res) {
  const text = await res.text()
  if (!text) throw new Error(`空响应 (${res.status})`)
  try { return JSON.parse(text) }
  catch { throw new Error(text.slice(0, 200)) }
}

function QuestionBank({ onNext, onBack, onSave }) {
  const [files, setFiles] = useState([])  // { file, status, id, name, type, errorMsg }
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const selected = [...e.target.files]
    if (selected.length > 10) { setError('最多上传 10 个文件'); return }
    setError('')
    const existing = files.map(f => f.name)
    const newFiles = selected
      .filter(f => !existing.includes(f.name))
      .map((f) => ({ file: f, status: 'pending', id: null, name: f.name, type: 'reference' }))
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleTypeChange = (idx, type) => {
    setFiles(prev => prev.map((f, i) => (i === idx ? { ...f, type } : f)))
  }

  const handleRemoveFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUploadAll = async () => {
    const pending = files.filter(f => f.status === 'pending')
    if (pending.length === 0) { setError('没有待上传的文件'); return }
    setError('')
    setUploading(true)

    const updated = [...files]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== 'pending') continue
      updated[i].status = 'uploading'
      setFiles([...updated])

      try {
        const formData = new FormData()
        formData.append('file', updated[i].file)
        const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
        const data = await safeJson(res)
        if (!res.ok) throw new Error(data.error || '上传失败')
        updated[i].id = data.id
        updated[i].status = 'done'
        setFiles([...updated])
      } catch (err) {
        updated[i].status = 'error'
        updated[i].errorMsg = err.message
        setFiles([...updated])
      }
    }
    setUploading(false)
  }

  const handleNext = () => {
    const uploaded = files.filter(f => f.status === 'done')
    onSave({
      originalQuestions: uploaded.filter(f => f.type === 'original'),
      referenceBank: uploaded.filter(f => f.type === 'reference'),
      all: uploaded,
    })
    onNext()
  }

  const handleSkip = () => {
    onSave({ originalQuestions: [], referenceBank: [], all: [] })
    onNext()
  }

  return (
    <div className="subject-creation-page">
      <button className="back-btn-top" onClick={onBack}>← 返回</button>
      <div className="subject-creation-card" style={{ maxWidth: 720 }}>
        <h1 className="sc-title">📚 题库设置</h1>
        <p className="sc-subtitle">
          如果你有往年试卷、平时作业或参考题库，可以上传。系统会学习出题风格。
        </p>

        {/* 上传区 */}
        <div className="es-upload-zone">
          <input
            type="file"
            multiple
            accept=".docx,.pdf,.jpg,.png,.txt"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            className="sc-btn"
            style={{ fontSize: 14, padding: '8px 20px' }}
            onClick={handleUploadAll}
            disabled={uploading}
          >
            {uploading ? '上传中...' : '上传全部'}
          </button>
        </div>
        {error && <p className="sc-error">{error}</p>}

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="es-file-list">
            {files.map((f, i) => (
              <div key={i} className={`es-file-item ${f.status === 'done' ? 'qb-done' : ''}`}>
                <span className="es-file-icon">
                  {f.status === 'pending' && '📄'}
                  {f.status === 'uploading' && '⏳'}
                  {f.status === 'done' && '✅'}
                  {f.status === 'error' && '❌'}
                </span>
                <span className="es-file-name">{f.name}</span>

                {f.status === 'done' && (
                  <select
                    className="qb-type-select"
                    value={f.type}
                    onChange={(e) => handleTypeChange(i, e.target.value)}
                  >
                    <option value="original">考试原题</option>
                    <option value="reference">参考题库</option>
                  </select>
                )}
                {f.status === 'error' && <span className="es-file-status">{f.errorMsg}</span>}

                <button className="btn-file-delete" onClick={() => handleRemoveFile(i)}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {/* 统计 */}
        {files.some(f => f.status === 'done') && (
          <p className="success" style={{ marginBottom: 16 }}>
            📊 考试原题 {files.filter(f => f.type === 'original' && f.status === 'done').length} 份 · 参考题库 {files.filter(f => f.type === 'reference' && f.status === 'done').length} 份
          </p>
        )}

        <div className="tb-footer">
          <button className="sc-btn" onClick={handleNext}>确认</button>
        </div>

      </div>
    </div>
  )
}

export default QuestionBank
