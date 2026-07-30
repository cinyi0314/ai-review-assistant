import { useState } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

async function safeJson(res) {
  const text = await res.text()
  if (!text) throw new Error(`空响应 (${res.status})`)
  try { return JSON.parse(text) }
  catch { throw new Error(text.slice(0, 200)) }
}

function ExamScope({ onNext, onBack, onSave }) {
  const [files, setFiles] = useState([])       // { file, status, id, knowledge, name }
  const [combinedText, setCombinedText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const selected = [...e.target.files]
    if (selected.length > 5) {
      setError('最多上传 5 个文件')
      return
    }
    setError('')
    setFiles(selected.map((f) => ({ file: f, status: 'pending', id: null, knowledge: '', name: f.name })))
  }

  const handleUploadAndExtract = async () => {
    if (files.length === 0) {
      setError('请先选择文件')
      return
    }
    setError('')
    setUploading(true)

    const updated = [...files]
    const allKnowledge = []

    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'uploading'
      setFiles([...updated])

      try {
        // 1) Upload
        const formData = new FormData()
        formData.append('file', updated[i].file)
        const uploadRes = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
        const uploadData = await safeJson(uploadRes)
        if (!uploadRes.ok) throw new Error(uploadData.error || '上传失败')
        updated[i].id = uploadData.id
        updated[i].status = 'extracting'
        setFiles([...updated])

        // 2) Extract knowledge
        const extractRes = await fetch(`${API_BASE}/files/${uploadData.id}/extract-knowledge`, { method: 'POST' })
        const extractData = await safeJson(extractRes)
        if (extractRes.ok && extractData.knowledgePoints) {
          updated[i].knowledge = extractData.knowledgePoints.join('\n')
          allKnowledge.push(...extractData.knowledgePoints)
        }
        updated[i].status = 'done'
        setFiles([...updated])

      } catch (err) {
        updated[i].status = 'error'
        updated[i].errorMsg = err.message
        setFiles([...updated])
      }
    }

    // 合并提取的知识点
    const merged = allKnowledge.filter(Boolean).join('\n')
    setCombinedText(merged)
    setUploading(false)
  }

  const handleSkip = () => {
    onSave({ text: combinedText, knowledgePoints: combinedText.split('\n').filter(Boolean) })
    onNext()
  }

  const handleNext = () => {
    const points = combinedText.split('\n').filter(Boolean)
    onSave({ text: combinedText, knowledgePoints: points, fileIds: files.filter(f => f.id).map(f => f.id) })
    onNext()
  }

  const knowledgeCount = combinedText ? combinedText.split('\n').filter(Boolean).length : 0
  const hasFiles = files.length > 0

  return (
    <div className="subject-creation-page">
      <div className="subject-creation-card" style={{ maxWidth: 720 }}>
        <h1 className="sc-title">📄 考试范围</h1>
        <p className="sc-subtitle">上传考试范围资料，AI 将自动提取其中的知识点</p>

        {/* 上传区 */}
        <div className="es-upload-zone">
          <input
            type="file"
            multiple
            accept=".docx,.pdf,.jpg,.png,.txt"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ fontSize: 14 }}
          />
          <button
            className="sc-btn"
            style={{ fontSize: 14, padding: '8px 20px' }}
            onClick={handleUploadAndExtract}
            disabled={uploading}
          >
            {uploading ? '提取中...' : '上传并提取'}
          </button>
        </div>
        {error && <p className="sc-error">{error}</p>}

        {/* 文件状态列表 */}
        {hasFiles && (
          <div className="es-file-list">
            {files.map((f, i) => (
              <div key={i} className="es-file-item">
                <span className="es-file-icon">
                  {f.status === 'pending' && '📄'}
                  {f.status === 'uploading' && '⏳'}
                  {f.status === 'extracting' && '⏳'}
                  {f.status === 'done' && '✅'}
                  {f.status === 'error' && '❌'}
                </span>
                <span className="es-file-name">{f.name}</span>
                <span className="es-file-status">
                  {f.status === 'pending' && '等待上传'}
                  {f.status === 'uploading' && '上传中...'}
                  {f.status === 'extracting' && '提取中...'}
                  {f.status === 'done' && '已提取'}
                  {f.status === 'error' && f.errorMsg || '失败'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 提取内容编辑区 */}
        {combinedText && (
          <div className="es-editor">
            <p className="es-kp-count">已提取 <strong>{knowledgeCount}</strong> 个知识点</p>
            <textarea
              className="extract-textarea"
              rows={12}
              value={combinedText}
              onChange={(e) => setCombinedText(e.target.value)}
              placeholder="提取的知识点将显示在这里，你可以自由编辑..."
            />
          </div>
        )}

        {/* 无内容提示 */}
        {!hasFiles && !combinedText && (
          <p className="sc-subtitle" style={{ marginTop: 24, color: 'var(--text)' }}>
            💡 请上传考试范围，或点击跳过
          </p>
        )}

        {/* 底部 */}
        <div className="tb-footer">
          <button
            className="sc-btn"
            style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}
            onClick={onBack}
            disabled={uploading}
          >
            ← 上一步
          </button>
          <button
            className="sc-btn"
            style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}
            onClick={handleSkip}
          >
            跳过
          </button>
          <button className="sc-btn" onClick={handleNext} disabled={uploading}>
            下一步 →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExamScope
