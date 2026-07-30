function StudyHome({ subjectName, onNavigate, onStartPractice, onStartReview, onStartRecite, onOpenWrongBook, stats }) {
  return (
    <div className="app">
      <header className="header">
        <h1>📚 AI 期末复习助手</h1>
        <p className="subtitle">{subjectName || '未选择科目'}</p>
      </header>

      {/* 统计 */}
      <section className="card" style={{ textAlign: 'center' }}>
        <div className="study-stats">
          <div className="stat-item">
            <div className="stat-num">{stats.questionsAnswered || 0}</div>
            <div className="stat-label">已刷题</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{stats.correctRate || 0}%</div>
            <div className="stat-label">正确率</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{stats.dueReviews || 0}</div>
            <div className="stat-label">待复习</div>
          </div>
        </div>
      </section>

      {/* 三大模式 */}
      <section className="card">
        <div className="mode-cards">
          <div className="mode-card mode-practice" onClick={onStartPractice}>
            <div className="mode-icon">📝</div>
            <div className="mode-title">刷题</div>
            <div className="mode-desc">按题型模块或随机碎片化刷题</div>
          </div>
          <div className="mode-card mode-recite" onClick={onStartRecite}>
            <div className="mode-icon">📖</div>
            <div className="mode-title">背题</div>
            <div className="mode-desc">知识点卡片，左右滑动记忆</div>
          </div>
          <div className="mode-card mode-review" onClick={onStartReview}>
            <div className="mode-icon">🔄</div>
            <div className="mode-title">复习</div>
            <div className="mode-desc">基于记忆曲线，巩固薄弱点</div>
          </div>
        </div>
      </section>

      {/* 快捷入口 */}
      <section className="card">
        <div className="quick-links">
          <button className="btn-quick" onClick={() => onNavigate(1)}>📚 科目设置</button>
          <button className="btn-quick" onClick={() => onNavigate(4)}>📝 题型设置</button>
          <button className="btn-quick" onClick={() => onNavigate(5)}>📄 考试范围</button>
          <button className="btn-quick" onClick={() => onNavigate(6)}>📚 题库</button>
          <button className="btn-quick" onClick={onOpenWrongBook}>📕 错题本</button>
        </div>
      </section>
    </div>
  )
}

export default StudyHome
