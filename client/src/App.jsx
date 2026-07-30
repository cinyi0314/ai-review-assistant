import { useState, useEffect } from 'react'
import './App.css'
import SubjectCreation from './SubjectCreation'
import TextbookSource from './TextbookSource'
import ExamInfo from './ExamInfo'
import QuestionTypeSettings from './QuestionTypeSettings'
import ExamScope from './ExamScope'
import QuestionBank from './QuestionBank'
import SupplementaryMaterials from './SupplementaryMaterials'
import StudyHome from './StudyHome'
import PracticeMode from './PracticeMode'
import ReviewMode from './ReviewMode'
import ReciteMode from './ReciteMode'
import WrongBook from './WrongBook'

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
  const [step, setStep] = useState(1) // 1-7=向导, 8=主界面

  const [textbookSelection, setTextbookSelection] = useState(null)
  const [examInfo, setExamInfo] = useState(null)
  const [questionTypeConfig, setQuestionTypeConfig] = useState(null)
  const [examScopeData, setExamScopeData] = useState(null)
  const [questionBankData, setQuestionBankData] = useState(null)
  const [supplementaryData, setSupplementaryData] = useState(null)

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
  const [mainMode, setMainMode] = useState('home') // home | practice | review | recite | wrongbook

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

  // Step 7: 补充材料
  if (step === 7) {
    return (
      <SupplementaryMaterials
        onSave={(data) => setSupplementaryData(data)}
        onBack={() => setStep(step - 1)}
        onFinish={() => setStep(8)}
      />
    )
  }

  // Step 8: 主界面（子路由）
  if (step === 8 && mainMode === 'practice') {
    return (
      <PracticeMode
        questionTypes={questionTypeConfig}
        questions={questions}
        onBack={() => setMainMode('home')}
      />
    )
  }

  if (step === 8 && mainMode === 'review') {
    return (
      <ReviewMode
        subjectId={subjectId}
        onBack={() => setMainMode('home')}
      />
    )
  }

  if (step === 8 && mainMode === 'wrongbook') {
    return <WrongBook subjectId={subjectId} onBack={() => setMainMode('home')} />
  }

  if (step === 8 && mainMode === 'recite') {
    return (
      <ReciteMode
        subjectId={subjectId}
        onBack={() => setMainMode('home')}
      />
    )
  }

  if (step === 8) {
    return (
      <StudyHome
        subjectName={currentSubjectName}
        onNavigate={(s) => setStep(s)}
        onStartPractice={() => setMainMode('practice')}
        onStartReview={() => setMainMode('review')}
        onStartRecite={() => setMainMode('recite')}
        onOpenWrongBook={() => setMainMode('wrongbook')}
        stats={{ questionsAnswered: 0, correctRate: 0, dueReviews: dueReviews.length }}
      />
    )
  }

  return null
}

export default App
