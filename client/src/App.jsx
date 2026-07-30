import { useState, useEffect } from 'react'
import './App.css'
import SubjectCreation from './SubjectCreation'
import TextbookSource from './TextbookSource'
import ExamInfo from './ExamInfo'
import QuestionTypeSettings from './QuestionTypeSettings'
import ExamScope from './ExamScope'
import QuestionBank from './QuestionBank'

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3000') + '/api'

/** 安全解析 JSON — 响应为空时不抛 "Unexpected end of JSON input" */
async function safeJson(res) {
  const text = await res.text()
  if (!text) throw new Error(`服务器返回空响应（状态码 ${res.status}）`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text.slice(0, 300) || `JSON 解析失败（状态码 ${res.status}）`)
  }
}

function App() {
  const [step, setStep] = useState(1) // 1=创建, 2=教材, 3=考试, 4=题型, 5=范围, 6=题库, 7=主界面

  const [textbookSelection, setTextbookSelection] = useState(null)
  const [examInfo, setExamInfo] = useState(null)
  const [questionTypeConfig, setQuestionTypeConfig] = useState(null)
  const [examScopeData, setExamScopeData] = useState(null)
  const [questionBankData, setQuestionBankData] = useState(null)

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [fileId, setFileId] = useState('')

  // 上传资料类型
  const [uploadFileType, setUploadFileType] = useState('exam_range') // 'exam_range' | 'answer_ref'
  const [uploadHasAnswers, setUploadHasAnswers] = useState(false)
  const [uploadChapter, setUploadChapter] = useState('')

  // 提取确认弹窗
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [editingText, setEditingText] = useState('')
  const [pendingFileId, setPendingFileId] = useState('')

  // 知识点提取编辑器
  const [showPointEditor, setShowPointEditor] = useState(false)
  const [editingPoints, setEditingPoints] = useState([])
  const [newPointInput, setNewPointInput] = useState('')
  const [confirmedKnowledge, setConfirmedKnowledge] = useState([])   // 用户确认后的知识点
  const [knowledgeExtracting, setKnowledgeExtracting] = useState(false)
  const [extractHint, setExtractHint] = useState('')

  // 批量上传
  const [files, setFiles] = useState([])
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchFileIds, setBatchFileIds] = useState([])

  // 科目
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState(localStorage.getItem('lastSubjectId') || '')
  const [subjectName, setSubjectName] = useState('')
  const [subjectFiles, setSubjectFiles] = useState([])      // 当前科目的文件列表
  const [currentSubjectName, setCurrentSubjectName] = useState('')
  const [answerSources, setAnswerSources] = useState([])    // 答案来源列表
  const [useAnswerSource, setUseAnswerSource] = useState(false)

  // 出题风格学习
  const [examFile, setExamFile] = useState(null)
  const [examFiles, setExamFiles] = useState([])          // 批量试卷
  const [examFileId, setExamFileId] = useState('')
  const [learningStyle, setLearningStyle] = useState(false)
  const [learnStyleError, setLearnStyleError] = useState('')
  const [styleLearned, setStyleLearned] = useState(false)
  const [batchExamProgress, setBatchExamProgress] = useState(0)  // 批量进度

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [knowledgePoints, setKnowledgePoints] = useState([])
  const [questions, setQuestions] = useState([])

  const [answers, setAnswers] = useState({})
  const [shortAnswers, setShortAnswers] = useState({})      // 简答题用户输入
  const [revealedAnswers, setRevealedAnswers] = useState({}) // 简答题是否已显示答案

  const [wrongQuestions, setWrongQuestions] = useState([])   // 错题列表
  const [showWrongBook, setShowWrongBook] = useState(false)  // 是否展开错题本

  // 知识点掌握
  const [knowledgeData, setKnowledgeData] = useState([])     // 含 mastered 状态
  const [reviewMode, setReviewMode] = useState(false)        // 复习模式
  const [reviewIndex, setReviewIndex] = useState(0)          // 当前复习卡片索引
  const [reviewOrder, setReviewOrder] = useState([])         // 随机顺序

  // 记忆曲线复习提醒
  const [dueReviews, setDueReviews] = useState([])
  const [showDueReviews, setShowDueReviews] = useState(false)

  const [customTypes, setCustomTypes] = useState([])
  const [showCustomTypeModal, setShowCustomTypeModal] = useState(false)
  const [editingCustomType, setEditingCustomType] = useState(null)
  const [ctForm, setCtForm] = useState({ name: '', description: '', example: '', optionsTemplate: '' })

  const questionTypeOptions = ['选择题', '判断题', '简答题', ...customTypes.map((ct) => ct.name)]
  const [questionTypes, setQuestionTypes] = useState(['选择题', '判断题'])
  const [questionCount, setQuestionCount] = useState(3)

  // 出题范围
  const [scope, setScope] = useState(localStorage.getItem('lastScope') || 'all')
  const [selectedFileIds, setSelectedFileIds] = useState([])
  const [subjectPoints, setSubjectPoints] = useState([])        // 知识点汇总
  const [selectedPoints, setSelectedPoints] = useState([])      // 勾选的知识点文本

  // 页面加载时恢复上次科目
  useEffect(() => { restoreLastSubject() }, [])

  const toggleQuestionType = (type) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  // 重新加载当前科目的文件列表
  const reloadSubjectFiles = async (sid) => {
    const id = sid || subjectId
    if (!id) return
    try {
      const res = await fetch(`${API_BASE}/subjects/${id}/files`)
      const data = await safeJson(res)
      if (res.ok) {
        setSubjectFiles(data.files || [])
        if (data.examStyle) {
          setStyleLearned(true)
          if (data.examStyle.detectedTypes) setQuestionTypes(data.examStyle.detectedTypes)
        }
      }
    } catch { /* 静默 */ }
  }

  // 加载科目列表 + 恢复上次科目
  const loadSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/subjects`)
      const data = await safeJson(res)
      if (res.ok) setSubjects(data.subjects || [])
    } catch { /* 静默 */ }
  }

  // 页面加载：自动恢复上次科目 + 全部数据
  const [noSubjectData, setNoSubjectData] = useState(false)
  const restoreLastSubject = async () => {
    try {
      const res = await fetch(`${API_BASE}/subjects/last`)
      const data = await safeJson(res)
      if (res.ok && data.subject) {
        const subj = data.subject
        setSubjectId(subj.id)
        localStorage.setItem('lastSubjectId', subj.id)
        await loadSubjects()

        // 加载该科目的文件列表
        const filesRes = await fetch(`${API_BASE}/subjects/${subj.id}/files`)
        const filesData = await safeJson(filesRes)
        const files = filesData.files || []
        setSubjectFiles(files)
        setCurrentSubjectName(subj.name)

        if (files.length === 0) {
          setNoSubjectData(true)
          return
        }
        setNoSubjectData(false)

        // 找到第一个 material 文件作为当前 fileId（确保文件路径存在）
        const material = files.find((f) => f.type === 'material')
        if (material && material.path) setFileId(material.id)

        // 找到 exam 文件
        const exam = files.find((f) => f.type === 'exam')
        if (exam) setExamFileId(exam.id)

        // 加载该科目的知识点
        const kpRes = await fetch(`${API_BASE}/knowledge/subject/${subj.id}`)
        const kpData = await safeJson(kpRes)
        if (kpRes.ok) {
          const kps = kpData.knowledgePoints || []
          setKnowledgeData(kps)
          setKnowledgePoints(kps.map((k) => k.content))
        }

        // 加载该科目的错题
        const wqRes = await fetch(`${API_BASE}/wrong-questions/subject/${subj.id}`)
        const wqData = await safeJson(wqRes)
        if (wqRes.ok) setWrongQuestions(wqData.wrongQuestions || [])

        // 加载待复习
        const drRes = await fetch(`${API_BASE}/due-reviews/subject/${subj.id}`)
        const drData = await safeJson(drRes)
        if (drRes.ok) setDueReviews(drData.dueReviews || [])

        loadCustomTypes()
        // 应用出题风格
        if (filesData.examStyle) {
          setStyleLearned(true)
          if (filesData.examStyle.detectedTypes) {
            setQuestionTypes(filesData.examStyle.detectedTypes)
          }
        }
        // 加载答案来源 + 知识点汇总
        loadAnswerSources(subj.id)
        loadSubjectPoints(subj.id)
      } else {
        setNoSubjectData(true)
      }
    } catch { /* 静默 */ }
  }

  // 创建/选择科目
  const handleSelectSubject = async (name) => {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await safeJson(res)
    if (res.ok && data.subject) {
      setSubjectId(data.subject.id)
      localStorage.setItem('lastSubjectId', data.subject.id)
      await loadSubjects()
      // 更新 lastAccessed
      await fetch(`${API_BASE}/subjects/update-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: data.subject.id }),
      })
    }
  }

  // 确认提取内容（文本编辑）
  const handleConfirmExtract = async () => {
    try {
      await fetch(`${API_BASE}/files/${pendingFileId}/content`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingText }),
      })
    } catch { /* 静默 */ }
    setShowExtractModal(false)
    setExtractedText('')
    setEditingText('')
    setPendingFileId('')
  }

  // 确认知识点编辑
  const handleConfirmPoints = async () => {
    setConfirmedKnowledge(editingPoints)
    if (subjectId) {
      try {
        await fetch(`${API_BASE}/knowledge/subject/${subjectId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: pendingFileId, points: editingPoints }),
        })
        loadSubjectPoints()
      } catch { /* 静默 */ }
    }
    setShowPointEditor(false)
    setKnowledgeExtracting(false)
    setExtractHint('')
  }

  // 删除文件
  const handleDeleteFile = async (fileIdToDelete) => {
    if (!confirm('确定要删除该文件吗？')) return
    try {
      const res = await fetch(`${API_BASE}/files/${fileIdToDelete}`, { method: 'DELETE' })
      const data = await safeJson(res)
      if (res.ok) {
        setSubjectFiles((prev) => prev.filter((f) => f.id !== fileIdToDelete))
        if (fileId === fileIdToDelete) setFileId('')
        if (examFileId === fileIdToDelete) setExamFileId('')
      } else {
        alert(data.error || '删除失败')
      }
    } catch { /* 静默 */ }
  }

  // 加载答案来源
  const loadAnswerSources = async (sid) => {
    const id = sid || subjectId
    if (!id) return
    try {
      const res = await fetch(`${API_BASE}/answer-sources/${id}`)
      const data = await safeJson(res)
      if (res.ok) setAnswerSources(data.answerSources || [])
    } catch { /* 静默 */ }
  }

  // 上传电子书
  const [ebookFile, setEbookFile] = useState(null)
  const [uploadingEbook, setUploadingEbook] = useState(false)
  const handleUploadEbook = async () => {
    if (!ebookFile) return alert('请选择电子书文件')
    setUploadingEbook(true)
    try {
      const formData = new FormData()
      formData.append('file', ebookFile)
      if (subjectId) formData.append('subjectId', subjectId)
      const res = await fetch(`${API_BASE}/answer-sources`, { method: 'POST', body: formData })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || '上传失败')
      setEbookFile(null)
      reloadSubjectFiles()
      loadAnswerSources()
    } catch (err) { alert(err.message) }
    finally { setUploadingEbook(false) }
  }

  // 删除答案来源
  const handleDeleteAnswerSource = async (id) => {
    if (!confirm('确定删除该答案来源？')) return
    try {
      await fetch(`${API_BASE}/answer-sources/${id}`, { method: 'DELETE' })
      setAnswerSources((prev) => prev.filter((a) => a.id !== id))
    } catch { /* 静默 */ }
  }

  // 自定义题型 CRUD
  const loadCustomTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}/custom-question-types`)
      const data = await safeJson(res)
      if (res.ok) setCustomTypes(data.types || [])
    } catch { /* 静默 */ }
  }

  const saveCustomType = async () => {
    if (!ctForm.name.trim()) return alert('请输入题型名称')
    const method = editingCustomType ? 'PUT' : 'POST'
    const url = editingCustomType
      ? `${API_BASE}/custom-question-types/${editingCustomType}`
      : `${API_BASE}/custom-question-types`
    try {
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ctForm) })
      setShowCustomTypeModal(false)
      setEditingCustomType(null)
      setCtForm({ name: '', description: '', example: '', optionsTemplate: '' })
      loadCustomTypes()
    } catch { /* 静默 */ }
  }

  const deleteCustomType = async (id) => {
    if (!confirm('确定删除该自定义题型？')) return
    try {
      await fetch(`${API_BASE}/custom-question-types/${id}`, { method: 'DELETE' })
      loadCustomTypes()
    } catch { /* 静默 */ }
  }

  // 加载科目知识点汇总
  const loadSubjectPoints = async (sid) => {
    const id = sid || subjectId
    if (!id) return
    try {
      const res = await fetch(`${API_BASE}/knowledge-points/${id}`)
      const data = await safeJson(res)
      if (res.ok) setSubjectPoints(data.points || [])
    } catch { /* 静默 */ }
  }

  const togglePoint = (text) => {
    setSelectedPoints((prev) =>
      prev.includes(text) ? prev.filter((p) => p !== text) : [...prev, text]
    )
  }

  // 加载知识点
  const loadKnowledge = async () => {
    if (!fileId) return
    try {
      const res = await fetch(`${API_BASE}/knowledge/${fileId}`)
      const data = await safeJson(res)
      if (res.ok) setKnowledgeData(data.knowledgePoints || [])
    } catch { /* 静默 */ }
  }

  // 切换知识点掌握状态
  const handleToggleMastered = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/knowledge/${id}/toggle`, { method: 'PUT' })
      const data = await safeJson(res)
      if (res.ok && data.knowledgePoint) {
        setKnowledgeData((prev) =>
          prev.map((kp) => (kp.id === id ? data.knowledgePoint : kp))
        )
      }
    } catch { /* 静默 */ }
  }

  // 加载待复习错题
  const loadDueReviews = async () => {
    if (!fileId) return
    try {
      const res = await fetch(`${API_BASE}/due-reviews/${fileId}`)
      const data = await safeJson(res)
      if (res.ok) setDueReviews(data.dueReviews || [])
    } catch { /* 静默 */ }
  }

  // 记录复习完成
  const handleReviewDone = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/due-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setDueReviews((prev) => prev.filter((r) => r.id !== id))
      }
    } catch { /* 静默 */ }
  }

  // 进入复习模式
  const startReviewMode = async () => {
    if (knowledgeData.length === 0) {
      await loadKnowledge()
    }
    // 随机打乱顺序
    const shuffled = [...knowledgeData].sort(() => Math.random() - 0.5)
    setReviewOrder(shuffled)
    setReviewIndex(0)
    setReviewMode(true)
  }

  // 复习模式：下一个卡片
  const nextReviewCard = () => {
    if (reviewIndex + 1 >= reviewOrder.length) {
      setReviewMode(false)
    } else {
      setReviewIndex((i) => i + 1)
    }
  }

  // 加载错题列表
  const loadWrongQuestions = async () => {
    if (!fileId) return
    try {
      const res = await fetch(`${API_BASE}/wrong-questions/${fileId}`)
      const data = await safeJson(res)
      if (res.ok) setWrongQuestions(data.wrongQuestions || [])
    } catch { /* 静默失败 */ }
  }

  // 标记为错题
  const handleMarkWrong = async (qi, q, isShortAnswer) => {
    const alreadyMarked = wrongQuestions.some((wq) => wq.question === q.question)
    if (alreadyMarked) return

    let userAnswer
    if (isShortAnswer) {
      userAnswer = shortAnswers[qi] || ''
    } else {
      if (!answers[qi]) {
        alert('请先作答')
        return
      }
      userAnswer = answers[qi]
    }

    try {
      const res = await fetch(`${API_BASE}/wrong-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          subjectId,
          question: q.question,
          userAnswer,
          correctAnswer: q.answer,
          explanation: q.explanation,
        }),
      })
      const data = await safeJson(res)
      if (res.ok) {
        setWrongQuestions((prev) => [...prev, data.record])
      }
    } catch { /* 静默失败 */ }
  }

  // 从错题本移除（重做后）
  const handleReanswer = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/wrong-questions/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setWrongQuestions((prev) => prev.filter((wq) => wq.id !== id))
      }
    } catch { /* 静默失败 */ }
  }

  // 上传往年试卷并学习出题风格
  const handleLearnStyle = async () => {
    if (!examFile) {
      setLearnStyleError('请先选择一个试卷文件')
      return
    }
    setLearnStyleError('')
    setStyleLearned(false)
    setLearningStyle(true)
    try {
      // 1. 上传试卷文件
      const formData = new FormData()
      formData.append('file', examFile)
      const uploadRes = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
      const uploadData = await safeJson(uploadRes)
      if (!uploadRes.ok) throw new Error(uploadData.error || '上传试卷失败')

      // 2. 学习出题风格
      const learnRes = await fetch(`${API_BASE}/learn-exam-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadData.id, subjectId }),
      })
      const learnData = await safeJson(learnRes)
      if (!learnRes.ok) throw new Error(learnData.error || '学习风格失败')

      setExamFileId(uploadData.id)
      setStyleLearned(true)
      // 自动应用检测到的题型
      if (learnData.style?.detectedTypes) {
        setQuestionTypes(learnData.style.detectedTypes)
      }
    } catch (err) {
      setLearnStyleError(err.message)
    } finally {
      setLearningStyle(false)
    }
  }

  // 批量上传试卷并学习风格
  const handleBatchExamUpload = async () => {
    if (examFiles.length === 0) {
      setLearnStyleError('请先选择试卷文件')
      return
    }
    setLearnStyleError('')
    setStyleLearned(false)
    setLearningStyle(true)
    setBatchExamProgress(0)
    try {
      const formData = new FormData()
      examFiles.forEach((f) => formData.append('files', f))
      if (subjectId) formData.append('subjectId', subjectId)
      formData.append('fileType', 'exam_range')
      setBatchExamProgress(30)
      const res = await fetch(`${API_BASE}/upload-exams`, { method: 'POST', body: formData })
      setBatchExamProgress(80)
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || '批量学习失败')
      setBatchExamProgress(100)

      setStyleLearned(true)
      if (data.style?.detectedTypes) {
        setQuestionTypes(data.style.detectedTypes)
      }
    } catch (err) {
      setLearnStyleError(err.message)
    } finally {
      setLearningStyle(false)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadError('请先选择一个文件')
      return
    }
    setUploadError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (subjectId) formData.append('subjectId', subjectId)
      formData.append('fileType', uploadFileType)
      formData.append('hasAnswers', uploadHasAnswers ? 'true' : 'false')
      if (uploadChapter) formData.append('chapter', uploadChapter)

      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || '上传失败')
      const newFileId = data.id
      setFileId(newFileId)
      setPendingFileId(newFileId)
      setBatchFileIds([])
      setNoSubjectData(false)
      reloadSubjectFiles()
      setKnowledgePoints([])
      setQuestions([])
      setGenError('')

      // 自动提取知识点
      setKnowledgeExtracting(true)
      setExtractHint('')
      try {
        const kpRes = await fetch(`${API_BASE}/files/${newFileId}/extract-knowledge`, { method: 'POST' })
        const kpData = await safeJson(kpRes)
        if (kpRes.ok) {
          const pts = kpData.knowledgePoints || []
          if (pts.length === 0) {
            setExtractHint('提取到 0 个知识点，请手动输入')
          } else {
            setExtractHint(`提取到 ${pts.length} 个知识点，请确认或补充`)
          }
          setEditingPoints(pts)
          setConfirmedKnowledge(pts)
          setPendingFileId(newFileId)
          setShowPointEditor(true)
        } else {
          setExtractHint('知识点提取失败，请手动输入')
          setEditingPoints([])
          setConfirmedKnowledge([])
        }
      } catch {
        setExtractHint('知识点提取失败，请手动输入')
      } finally {
        setKnowledgeExtracting(false)
      }
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // 批量上传
  const handleBatchUpload = async () => {
    if (files.length === 0) {
      setUploadError('请先选择文件')
      return
    }
    setUploadError('')
    setBatchUploading(true)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      if (subjectId) formData.append('subjectId', subjectId)
      const res = await fetch(`${API_BASE}/upload/batch`, { method: 'POST', body: formData })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || '上传失败')
      setBatchFileIds(data.ids)
      setFileId('')
      reloadSubjectFiles()
      setKnowledgePoints([])
      setQuestions([])
      setGenError('')
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setBatchUploading(false)
    }
  }

  // 批量生成
  const handleBatchGenerate = async () => {
    if (batchFileIds.length === 0) {
      setGenError('请先批量上传文件')
      return
    }
    setGenError('')
    setGenerating(true)
    try {
      const res = await fetch(`${API_BASE}/generate/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: batchFileIds,
          questionTypes,
          questionCount,
          subjectId,
          ...(examFileId ? { examFileId } : {}),
          regenerate: true,
        }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || '生成失败')
      setKnowledgePoints(data.knowledgePoints || [])
      setQuestions(data.questions || [])
      setAnswers({})
      setShortAnswers({})
      setRevealedAnswers({})
      setKnowledgeData([])
      setTimeout(() => { loadKnowledge(); loadDueReviews() }, 300)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!fileId) {
      setGenError('请先上传文件')
      return
    }
    setGenError('')
    setGenerating(true)
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          questionTypes,
          questionCount,
          subjectId,
          scope,
          selectedFileIds: [],
          selectedPoints: [],
          confirmedKnowledge,
          ...(examFileId ? { examFileId } : {}),
          regenerate: true,
          useAnswerSource,
        }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || '生成失败')
      setKnowledgePoints(data.knowledgePoints || [])
      setQuestions(data.questions || [])
      setAnswers({})
      setShortAnswers({})
      setRevealedAnswers({})
      setKnowledgeData([])
      setTimeout(() => { loadKnowledge(); loadDueReviews() }, 300)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  // Step 1: 创建科目
  if (step === 1) {
    return (
      <SubjectCreation
        onCreate={async (name) => {
          await handleSelectSubject(name)
          setCurrentSubjectName(name)
          setStep(step + 1)
        }}
      />
    )
  }

  // Step 2: 教材选择
  if (step === 2) {
    return (
      <TextbookSource
        selected={textbookSelection}
        onSelect={(sel) => setTextbookSelection(sel)}
        onBack={() => setStep(step - 1)}
        onNext={() => setStep(step + 1)}
      />
    )
  }

  // Step 3: 考试信息
  if (step === 3) {
    return (
      <ExamInfo
        onSave={(info) => setExamInfo(info)}
        onBack={() => setStep(step - 1)}
        onNext={() => setStep(step + 1)}
      />
    )
  }

  // Step 4: 题型设置
  if (step === 4) {
    return (
      <QuestionTypeSettings
        onSave={(config) => setQuestionTypeConfig(config)}
        onBack={() => setStep(step - 1)}
        onNext={() => setStep(step + 1)}
      />
    )
  }

  // Step 5: 考试范围
  if (step === 5) {
    return (
      <ExamScope
        onSave={(data) => setExamScopeData(data)}
        onBack={() => setStep(step - 1)}
        onNext={() => setStep(step + 1)}
      />
    )
  }

  // Step 6: 题库设置
  if (step === 6) {
    return (
      <QuestionBank
        onSave={(data) => setQuestionBankData(data)}
        onBack={() => setStep(step - 1)}
        onNext={() => setStep(step + 1)}
      />
    )
  }

  // Step 7: 主界面
  return (
    <div className="app">
      <header className="header">
        <h1>📚 AI 期末复习助手</h1>
        <p className="subtitle">上传学习资料，自动生成知识点和练习题</p>
      </header>

      {/* ---------- 科目栏 ---------- */}
      <section className="card subject-top-bar">
        <div className="subject-top-row">
          <span className="subject-current">
            📂 {currentSubjectName || '未选择科目'}
          </span>
          <select
            value={subjectId}
            onChange={async (e) => {
              const sid = e.target.value
              if (sid) {
                setSubjectId(sid)
                localStorage.setItem('lastSubjectId', sid)
                await fetch(`${API_BASE}/subjects/update-access`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subjectId: sid }),
                })
                await reloadSubjectFiles(sid)
                const subj = subjects.find((s) => s.id === sid)
                if (subj) setCurrentSubjectName(subj.name)
              }
            }}
            onFocus={loadSubjects}
            className="subject-select"
          >
            <option value="">切换科目</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            className="subject-input"
            placeholder="+ 新建"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && subjectName.trim()) {
                await handleSelectSubject(subjectName.trim())
                setCurrentSubjectName(subjectName.trim())
                setSubjectName('')
              }
            }}
          />
        </div>
        {subjectId && (
          <div className="subject-stats">
            该科目已有 <strong>{subjectFiles.length}</strong> 份资料
            {styleLearned && ' · ✅ 已学习出题风格'}
          </div>
        )}
      </section>

      {/* ---------- 遗忘曲线复习提醒 ---------- */}
      {dueReviews.length > 0 && (
        <section className="card card-alert">
          <button
            className="btn-due-alert"
            onClick={() => setShowDueReviews(!showDueReviews)}
          >
            🔔 今日有 <strong>{dueReviews.length}</strong> 道题需要复习
            <span className="alert-arrow">{showDueReviews ? '▲' : '▼'}</span>
          </button>
          {showDueReviews && (
            <ul className="due-list">
              {dueReviews.map((r) => (
                <li key={r.id} className="due-item">
                  <div className="due-item-body">
                    <p className="due-question">{r.question}</p>
                    <p className="due-detail">
                      你的答案：<span className="highlight-wrong">{r.userAnswer || '(未作答)'}</span>
                      {' '}| 正确：<span className="highlight-correct">{r.correctAnswer}</span>
                    </p>
                  </div>
                  <button
                    className="btn-review-done"
                    onClick={() => handleReviewDone(r.id)}
                  >
                    ✅ 复习完成
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- 上传区 ---------- */}
      {noSubjectData && !fileId && (
        <section className="card card-hint-section">
          <p className="empty-hint">📭 该科目暂无资料，请上传文件</p>
        </section>
      )}
      <section className="card">
        <h2>📤 上传资料</h2>
        <div className="upload-options">
          <label className="upload-opt-label">
            资料类型：
            <select value={uploadFileType} onChange={(e) => setUploadFileType(e.target.value)}>
              <option value="exam_range">📝 考试范围</option>
              <option value="answer_ref">📚 答案参考</option>
            </select>
          </label>
          {uploadFileType === 'exam_range' && (
            <label className="upload-opt-label checkbox-opt">
              <input type="checkbox" checked={uploadHasAnswers} onChange={(e) => setUploadHasAnswers(e.target.checked)} />
              <span>☑ 带答案</span>
              {!uploadHasAnswers && <span className="opt-hint">（纯题目）</span>}
            </label>
          )}
          {uploadFileType === 'answer_ref' && (
            <input
              className="chapter-input"
              placeholder="所属科目/章节（可选）"
              value={uploadChapter}
              onChange={(e) => setUploadChapter(e.target.value)}
            />
          )}
        </div>
        {subjectFiles.length > 0 && (
          <ul className="file-list">
            {subjectFiles.map((f) => (
              <li key={f.id} className="file-item">
                <span className="file-icon">
                  {f.fileType === 'exam_range' ? '📝' : f.type === 'exam' ? '📑' : '📚'}
                </span>
                <span className="file-name">{f.name}</span>
                {f.fileType === 'exam_range' && (
                  <span className="file-type-tag">{f.hasAnswers ? '带答案' : '纯题目'}</span>
                )}
                {f.fileType === 'answer_ref' && f.chapter && (
                  <span className="file-type-tag" style={{ background: 'rgba(52,152,219,0.1)', color: '#3498db' }}>
                    {f.chapter}
                  </span>
                )}
                <span className="file-type-tag">{f.type === 'exam' ? '试卷' : '资料'}</span>
                <button
                  className="btn-file-delete"
                  onClick={() => handleDeleteFile(f.id)}
                  title="删除文件"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="card-hint" style={{ marginTop: subjectFiles.length > 0 ? 12 : 0 }}>
          追加新文件到当前科目
        </p>
        <div className="upload-row">
          <input
            type="file"
            id="file-input"
            accept=".txt,.pdf,.docx"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? '上传中...' : '上传文件'}
          </button>
        </div>
        <div className="upload-row" style={{ marginTop: 10 }}>
          <input
            type="file"
            multiple
            accept=".txt,.pdf,.docx"
            onChange={(e) => setFiles([...e.target.files])}
          />
          <button onClick={handleBatchUpload} disabled={batchUploading || files.length === 0}>
            {batchUploading ? '上传中...' : '批量上传'}
          </button>
        </div>
        {uploadError && <p className="error">{uploadError}</p>}
        {fileId && (
          <p className="success">
            ✅ 上传成功 — ID: <code>{fileId}</code>
          </p>
        )}
        {batchFileIds.length > 0 && (
          <div className="success">
            ✅ 批量上传 {batchFileIds.length} 个文件
            <button
              className="btn-batch-gen"
              onClick={handleBatchGenerate}
              disabled={generating}
            >
              📚 从多文件生成
            </button>
          </div>
        )}
      </section>

      {/* ---------- 出题风格学习 ---------- */}
      <section className="card">
        <h2>📄 上传往年试卷（可选）</h2>
        <p className="card-hint">上传往年试卷，AI 将学习其出题风格</p>
        <div className="upload-row">
          <input
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={(e) => {
              setExamFile(e.target.files[0])
              setStyleLearned(false)
              setLearnStyleError('')
            }}
          />
          <button
            onClick={handleLearnStyle}
            disabled={learningStyle || !examFile}
          >
            {learningStyle ? '学习中...' : '学习风格'}
          </button>
        </div>
        <div className="upload-row" style={{ marginTop: 10 }}>
          <input
            type="file"
            multiple
            accept=".txt,.pdf,.docx"
            onChange={(e) => {
              setExamFiles([...e.target.files])
              setStyleLearned(false)
              setLearnStyleError('')
            }}
          />
          <button
            onClick={handleBatchExamUpload}
            disabled={learningStyle || examFiles.length === 0}
          >
            {learningStyle ? '学习中...' : `批量学习 (${examFiles.length || 0})`}
          </button>
        </div>
        {learningStyle && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: batchExamProgress + '%' }} />
          </div>
        )}
        {learnStyleError && <p className="error">{learnStyleError}</p>}
        {styleLearned && (
          <p className="success">✅ 已学习出题风格，将按此风格出题</p>
        )}
      </section>

      {/* ---------- 答案来源（电子书）---------- */}
      <section className="card">
        <h2>📖 答案来源（可选）</h2>
        <p className="card-hint">上传电子书作为参考答案来源，生成题目时 AI 会优先从中查找答案</p>
        {answerSources.length > 0 && (
          <ul className="file-list">
            {answerSources.map((a) => (
              <li key={a.id} className="file-item">
                <span className="file-icon">📖</span>
                <span className="file-name">{a.fileName}</span>
                <span className="file-type-tag" style={{ background: 'rgba(52,152,219,0.1)', color: '#3498db' }}>电子书</span>
                <button className="btn-file-delete" onClick={() => handleDeleteAnswerSource(a.id)}>🗑</button>
              </li>
            ))}
          </ul>
        )}
        <div className="upload-row" style={{ marginTop: answerSources.length > 0 ? 10 : 0 }}>
          <input
            type="file"
            accept=".txt,.pdf,.epub"
            onChange={(e) => setEbookFile(e.target.files[0])}
          />
          <button onClick={handleUploadEbook} disabled={uploadingEbook || !ebookFile}>
            {uploadingEbook ? '提取中...' : '上传电子书'}
          </button>
        </div>
      </section>

      {/* ---------- 知识点确认区 ---------- */}
      {confirmedKnowledge.length > 0 && (
        <section className="card">
          <h2>📋 已确认 {confirmedKnowledge.length} 个知识点</h2>
          <div className="confirmed-kp-list">
            {confirmedKnowledge.map((kp, i) => (
              <span key={i} className="confirmed-kp-tag">
                {kp}
                <button
                  className="kp-tag-del"
                  onClick={() => setConfirmedKnowledge(confirmedKnowledge.filter((_, j) => j !== i))}
                >✕</button>
              </span>
            ))}
          </div>
          <div className="kp-add-mini" style={{ marginTop: 8 }}>
            <input
              className="point-edit-input"
              style={{ flex: 1 }}
              placeholder="+ 添加知识点"
              value={newPointInput}
              onChange={(e) => setNewPointInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPointInput.trim()) {
                  setConfirmedKnowledge([...confirmedKnowledge, newPointInput.trim()])
                  setNewPointInput('')
                }
              }}
            />
          </div>
        </section>
      )}

      {/* ---------- 生成区 ---------- */}
      <section className="card">
        <h2>🤖 生成复习内容</h2>
        <div className="count-row">
          <label className="count-label">
            题目数量：
            <select
              className="count-select"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            >
              {[3, 5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} 道</option>
              ))}
            </select>
          </label>
        </div>
        <div className="type-checkboxes">
          {questionTypeOptions.map((type) => (
            <label key={type} className="checkbox-label">
              <input
                type="checkbox"
                checked={questionTypes.includes(type)}
                onChange={() => toggleQuestionType(type)}
              />
              <span>{type}</span>
              {(() => {
                const foundCt = customTypes.find((c) => c.name === type)
                if (!foundCt) return null
                return (
                  <>
                    <button className="btn-ct-edit" onClick={() => {
                      setEditingCustomType(foundCt.id)
                      setCtForm({ name: foundCt.name, description: foundCt.description || '', example: foundCt.example || '', optionsTemplate: foundCt.optionsTemplate ? JSON.stringify(foundCt.optionsTemplate) : '' })
                      setShowCustomTypeModal(true)
                    }}>✏️</button>
                    <button className="btn-ct-del" onClick={() => deleteCustomType(foundCt.id)}>✕</button>
                  </>
                )
              })()}
            </label>
          ))}
          <button className="btn-add-type" onClick={() => {
            setEditingCustomType(null)
            setCtForm({ name: '', description: '', example: '', optionsTemplate: '' })
            setShowCustomTypeModal(true)
          }}>+ 自定义题型</button>
        </div>

        {/* 出题范围 */}
        {answerSources.length > 0 && (
          <label className="scope-label" style={{ marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={useAnswerSource}
              onChange={(e) => setUseAnswerSource(e.target.checked)}
            />
            <span>📖 使用答案来源（AI 优先从电子书查找答案）</span>
          </label>
        )}

        <div className="scope-section">
          <label className="scope-label">
            <input
              type="radio"
              name="scope"
              value="all"
              checked={scope === 'all'}
              onChange={() => {
                setScope('all')
                localStorage.setItem('lastScope', 'all')
              }}
            />
            <span>全量随机出题</span>
          </label>
          <label className="scope-label">
            <input
              type="radio"
              name="scope"
              value="specific"
              checked={scope === 'specific'}
              onChange={() => {
                setScope('specific')
                localStorage.setItem('lastScope', 'specific')
              }}
            />
            <span>指定内容出题</span>
          </label>
        </div>

        {scope === 'specific' && (
          <div className="file-checkboxes">
            <div className="kp-toolbar">
              <span className="kp-count">已选 {selectedPoints.length}/{subjectPoints.length} 个知识点</span>
              <button className="btn-kp-action" onClick={() => loadSubjectPoints()}>🔄 刷新</button>
              <button className="btn-kp-action" onClick={() => setSelectedPoints(subjectPoints.map(p => p.text))}>全选</button>
              <button className="btn-kp-action" onClick={() => setSelectedPoints([])}>取消</button>
            </div>
            {subjectPoints.length === 0 && <p className="card-hint" style={{ margin: '8px 0 0' }}>暂无知识点，请先生成复习内容或刷新</p>}
            {subjectPoints.map((pt, i) => (
              <label key={i} className="checkbox-label file-cb">
                <input
                  type="checkbox"
                  checked={selectedPoints.includes(pt.text)}
                  onChange={() => togglePoint(pt.text)}
                />
                <span>{pt.text}</span>
                <span className="kp-source">({pt.fileName?.slice(0, 20)})</span>
              </label>
            ))}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={
            generating || questionTypes.length === 0 ||
            (!fileId && confirmedKnowledge.length === 0)
          }
        >
          {generating ? 'AI 生成中...' : '生成复习内容'}
        </button>
        {genError && <p className="error">{genError}</p>}
        {knowledgePoints.length > 0 && (
          <button
            className="btn-regenerate"
            onClick={handleGenerate}
            disabled={generating}
          >
            🔄 重新生成
          </button>
        )}
      </section>

      {/* ---------- 错题本 ---------- */}
      {fileId && (
        <section className="card">
          <button
            className="btn-wrong-book"
            onClick={async () => {
              const next = !showWrongBook
              setShowWrongBook(next)
              if (next) await loadWrongQuestions()
            }}
          >
            📖 错题本
            {wrongQuestions.length > 0 && (
              <span className="badge">{wrongQuestions.length}</span>
            )}
          </button>

          {showWrongBook && (
            <div className="wrong-book-panel">
              {wrongQuestions.length === 0 ? (
                <p className="empty-hint">暂无错题记录 🎉</p>
              ) : (
                <ul className="wrong-list">
                  {wrongQuestions.map((wq) => (
                    <li key={wq.id} className="wrong-item">
                      <div className="wrong-item-body">
                        <p className="wrong-question">{wq.question}</p>
                        <p className="wrong-detail">
                          ❌ 你的答案：<span className="highlight-wrong">{wq.userAnswer || '(未作答)'}</span>
                        </p>
                        <p className="wrong-detail">
                          ✅ 正确答案：<span className="highlight-correct">{wq.correctAnswer}</span>
                        </p>
                        <p className="wrong-explain">{wq.explanation}</p>
                      </div>
                      <button
                        className="btn-reanswer"
                        onClick={() => handleReanswer(wq.id)}
                      >
                        🔄 重新答题
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* ---------- 结果区 ---------- */}
      {(knowledgePoints.length > 0 || questions.length > 0) && (
        <>
          {/* 知识点 */}
          {knowledgePoints.length > 0 && (
            <section className="card">
              <h2>💡 核心知识点</h2>
              <ol className="kp-list">
                {knowledgePoints.map((kp, i) => {
                  const kpData = knowledgeData[i]
                  const mastered = kpData?.mastered || false
                  return (
                    <li key={i} className={mastered ? 'kp-mastered' : ''}>
                      <span className="kp-text">{kp}</span>
                      {kpData && (
                        <button
                          className={`btn-mastery ${mastered ? 'mastered' : ''}`}
                          onClick={() => handleToggleMastered(kpData.id)}
                        >
                          {mastered ? '✅ 已掌握' : '🔄 未掌握'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ol>
              {knowledgeData.length > 0 && (
                <div className="kp-actions">
                  <span className="kp-progress">
                    掌握进度：{knowledgeData.filter((k) => k.mastered).length}/{knowledgeData.length}
                  </span>
                  <button className="btn-review-mode" onClick={startReviewMode}>
                    📖 复习模式
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 题目 */}
          {questions.length > 0 && (
            <section className="card">
              <h2>📝 练习题</h2>
              <div className="questions">
                {questions.map((q, qi) => {
                  const isShortAnswer = q.options.length === 0

                  return (
                    <div key={qi} className="question-block">
                      <h3>
                        {qi + 1}. {q.question}
                        {isShortAnswer && <span className="q-type-tag">简答题</span>}
                      </h3>

                      {/* 选择题 / 判断题 */}
                      {!isShortAnswer && (
                        <>
                          <div className="options">
                            {q.options.map((opt, oi) => {
                              const letter = opt.charAt(0)
                              return (
                                <label key={oi} className="option">
                                  <input
                                    type="radio"
                                    name={`q${qi}`}
                                    value={letter}
                                    checked={answers[qi] === letter}
                                    onChange={() =>
                                      setAnswers({ ...answers, [qi]: letter })
                                    }
                                  />
                                  <span>{opt}</span>
                                </label>
                              )
                            })}
                          </div>
                          {answers[qi] && (
                            <>
                              <div
                                className={`answer-box ${
                                  answers[qi] === q.answer ? 'correct' : 'wrong'
                                }`}
                              >
                                <p>
                                  <strong>
                                    {answers[qi] === q.answer
                                      ? '✅ 正确'
                                      : '❌ 错误'}
                                  </strong>{' '}
                                  — 答案：<strong>{q.answer}</strong>
                                </p>
                                <p className="explanation">{q.explanation}</p>
                              </div>
                              {answers[qi] !== q.answer && (
                                <button
                                  className="btn-mark-wrong"
                                  disabled={wrongQuestions.some(
                                    (wq) => wq.question === q.question
                                  )}
                                  onClick={() => handleMarkWrong(qi, q, false)}
                                >
                                  {wrongQuestions.some(
                                    (wq) => wq.question === q.question
                                  )
                                    ? '✓ 已标记'
                                    : '❌ 标记为错题'}
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {/* 简答题 */}
                      {isShortAnswer && (
                        <div className="short-answer-area">
                          <textarea
                            className="short-textarea"
                            rows={3}
                            placeholder="请输入你的答案..."
                            value={shortAnswers[qi] || ''}
                            onChange={(e) =>
                              setShortAnswers({
                                ...shortAnswers,
                                [qi]: e.target.value,
                              })
                            }
                          />
                          <button
                            className="btn-reveal"
                            onClick={() =>
                              setRevealedAnswers({
                                ...revealedAnswers,
                                [qi]: true,
                              })
                            }
                          >
                            显示答案
                          </button>
                          {revealedAnswers[qi] && (
                            <>
                              <div className="answer-box reveal">
                                <p>
                                  <strong>📖 参考答案：</strong>
                                  {q.answer}
                                </p>
                                <p className="explanation">{q.explanation}</p>
                              </div>
                              <button
                                className="btn-mark-wrong"
                                disabled={wrongQuestions.some(
                                  (wq) => wq.question === q.question
                                )}
                                onClick={() => handleMarkWrong(qi, q, true)}
                              >
                                {wrongQuestions.some(
                                  (wq) => wq.question === q.question
                                )
                                  ? '✓ 已标记'
                                  : '❌ 标记为错题'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ---------- 复习模式 ---------- */}
      {reviewMode && reviewOrder.length > 0 && (
        <div className="review-overlay">
          <div className="review-card">
            <div className="review-progress">
              知识点 {reviewIndex + 1} / {reviewOrder.length}
            </div>
            <div className="review-content">
              {reviewOrder[reviewIndex]?.content}
            </div>
            <div className="review-actions">
              <button
                className="btn-mastery"
                onClick={async () => {
                  const kp = reviewOrder[reviewIndex]
                  if (kp && !kp.mastered) await handleToggleMastered(kp.id)
                  nextReviewCard()
                }}
              >
                ✅ 已掌握
              </button>
              <button
                className="btn-mastery mastered"
                onClick={async () => {
                  const kp = reviewOrder[reviewIndex]
                  if (kp && kp.mastered) await handleToggleMastered(kp.id)
                  nextReviewCard()
                }}
              >
                🔄 未掌握
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 自定义题型弹窗 ---------- */}
      {showCustomTypeModal && (
        <div className="review-overlay">
          <div className="review-card" style={{ maxWidth: 500 }}>
            <h2 style={{ marginTop: 0 }}>{editingCustomType ? '编辑' : '新建'}自定义题型</h2>
            <input className="chapter-input" style={{ width: '100%', marginBottom: 8 }} placeholder="题型名称（如：完形填空）" value={ctForm.name} onChange={(e) => setCtForm({ ...ctForm, name: e.target.value })} />
            <input className="chapter-input" style={{ width: '100%', marginBottom: 8 }} placeholder="描述（如：一段文字中挖去若干词，从选项中选出正确的）" value={ctForm.description} onChange={(e) => setCtForm({ ...ctForm, description: e.target.value })} />
            <input className="chapter-input" style={{ width: '100%', marginBottom: 8 }} placeholder="示例（如：The cat ___ on the mat. A. sit B. sits C. sat D. sitting）" value={ctForm.example} onChange={(e) => setCtForm({ ...ctForm, example: e.target.value })} />
            <input className="chapter-input" style={{ width: '100%', marginBottom: 8 }} placeholder={'选项模板 JSON（如 ["A. ","B. ","C. ","D. "]，可留空）'} value={ctForm.optionsTemplate} onChange={(e) => setCtForm({ ...ctForm, optionsTemplate: e.target.value })} />
            <div className="review-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={saveCustomType}>{editingCustomType ? '保存' : '创建'}</button>
              <button onClick={() => { setShowCustomTypeModal(false); setEditingCustomType(null) }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 知识点提取编辑器 ---------- */}
      {showPointEditor && (
        <div className="review-overlay">
          <div className="review-card" style={{ maxWidth: 600 }}>
            <h2 style={{ marginTop: 0 }}>📋 确认提取的知识点</h2>
            <p className="card-hint">{extractHint || `AI 提取了 ${editingPoints.length} 个知识点，可删减或添加`}</p>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              {editingPoints.map((pt, i) => (
                <div key={i} className="point-edit-row">
                  <span className="point-num">{i + 1}.</span>
                  <input className="point-edit-input" value={pt} onChange={(e) => {
                    const next = [...editingPoints]
                    next[i] = e.target.value
                    setEditingPoints(next)
                  }} />
                  <button className="btn-ct-del" onClick={() => setEditingPoints(editingPoints.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <div className="point-add-row">
              <input className="point-edit-input" placeholder="+ 添加知识点" value={newPointInput} onChange={(e) => setNewPointInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newPointInput.trim()) { setEditingPoints([...editingPoints, newPointInput.trim()]); setNewPointInput('') } }} />
              <button onClick={() => { if (newPointInput.trim()) { setEditingPoints([...editingPoints, newPointInput.trim()]); setNewPointInput('') } }}>添加</button>
            </div>
            <div className="review-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={handleConfirmPoints}>✅ 确认保存</button>
              <button onClick={() => { setShowPointEditor(false); setEditingPoints([]) }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 提取内容确认弹窗 ---------- */}
      {showExtractModal && (
        <div className="review-overlay">
          <div className="review-card" style={{ maxWidth: 700 }}>
            <h2 style={{ marginTop: 0 }}>📋 确认提取内容</h2>
            <p className="card-hint">请检查 AI 提取的内容，可自由编辑修改</p>
            <textarea className="extract-textarea" rows={15} value={editingText} onChange={(e) => setEditingText(e.target.value)} />
            <div className="review-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={handleConfirmExtract}>✅ 确认保存</button>
              <button onClick={() => { setShowExtractModal(false); setExtractedText(''); setEditingText('') }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
