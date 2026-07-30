const {
  getDueReviews,
  recordReview,
  getDueReviewsBySubject,
} = require('../services/memoryCurveService');

// --------------- GET /api/due-reviews/:fileId ---------------
function handleGetDueReviews(req, res) {
  const { fileId } = req.params;
  if (!fileId) {
    return res.status(400).json({ error: '缺少 fileId 参数' });
  }

  const list = getDueReviews(fileId);
  res.json({
    fileId,
    dueCount: list.length,
    dueReviews: list,
  });
}

// --------------- POST /api/review-record ---------------
function handleRecordReview(req, res) {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: '缺少 id 参数' });
  }

  const updated = recordReview(id);
  if (!updated) {
    return res.status(404).json({ error: '未找到该错题记录' });
  }

  res.json({
    message: '复习已记录',
    nextReviewDate: updated.nextReviewDate,
    reviewCount: updated.reviewCount,
  });
}

function handleGetDueReviewsBySubject(req, res) {
  const { subjectId } = req.params;
  if (!subjectId) return res.status(400).json({ error: '缺少 subjectId 参数' });
  const list = getDueReviewsBySubject(subjectId);
  res.json({ subjectId, dueCount: list.length, dueReviews: list });
}

module.exports = { handleGetDueReviews, handleRecordReview, handleGetDueReviewsBySubject };
