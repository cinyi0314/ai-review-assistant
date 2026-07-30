import { useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

async function safeJson(res) {
  const text = await res.text()
  if (!text) throw new Error(`空响应 (${res.status})`)
  try { return JSON.parse(text) }
  catch { throw new Error(text.slice(0, 200)) }
}

function SupplementaryMaterials({ onBack, onFinish, onSave }) {
  const [files, setFiles] = useState([])  // { file, status, id, name, uploadedAt, errorMsg }
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const selected = [...e.target.files]
    const existing = files.map(f => f.name)
    const newFiles = selected
      .filter(f => !existing.includes(f.name))
      .map((f) => ({ file: f, status: 'pending', id: null, name: f.name, uploadedAt: null }))
    setFiles(prev => [...prev, ...newFiles])
    setError('')
  }

  const handleUploadAll = async () => {
    const pending = files.filter(f => f.status === 'pending')
    if (pending.length === 0) return
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
        updated[i].uploadedAt = new Date().toLocaleString()
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

  const handleRemove = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleFinish = () => {
    const uploaded = files.filter(f => f.status === 'done')
    onSave(uploaded)
    onFinish()
  }

  return (
    <div className="subject-creation-page">
      <button className="back-btn-top" onClick={onBack}>← 返回</button>
      <div className="subject-creation-card" style={{ maxWidth: 680 }}>
        <h1 className="sc-title">📎 补充材料（选填）</h1>
        <p className="sc-subtitle">上传课堂PPT、笔记等补充材料，帮助AI更全面了解课程内容</p>

        <div className="es-upload-zone">
          <input
            type="file"
            multiple
            accept=".ppt,.pptx,.md,.txt,.pdf,.docx"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button className="sc-btn" style={{ fontSize: 14, padding: '8px 20px' }} onClick={handleUploadAll} disabled={uploading}>
            {uploading ? '上传中...' : '上传'}
          </button>
        </div>
        {error && <p className="sc-error">{error}</p>}

        {files.filter(f => f.status !== 'error').length > 0 && (
          <div className="es-file-list">
            {files.filter(f => f.status !== 'error').map((f, i) => {
              const idx = files.indexOf(f)
              return (
                <div key={i} className={`es-file-item ${f.status === 'done' ? 'qb-done' : ''}`}>
                  <span className="es-file-icon">
                    {f.status === 'pending' && '📄'}
                    {f.status === 'uploading' && '⏳'}
                    {f.status === 'done' && '✅'}
                  </span>
                  <span className="es-file-name">{f.name}</span>
                  {f.uploadedAt && <span className="es-file-status">{f.uploadedAt}</span>}
                  <button className="btn-file-delete" onClick={() => handleRemove(idx)}>🗑</button>
                </div>
              )
            })}
          </div>
        )}

        {files.some(f => f.status === 'error') && (
          <p className="sc-error">部分文件上传失败，请检查格式</p>
        )}

        <p className="card-hint" style={{ marginTop: 8 }}>
          已上传 <strong>{files.filter(f => f.status === 'done').length}</strong> 个文件
        </p>

        <div className="tb-footer">
          <button className="sc-btn" onClick={handleFinish}>确认</button>
        </div>

      </div>
    </div>
  )
}

export default SupplementaryMaterials
