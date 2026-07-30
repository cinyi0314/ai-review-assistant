const express = require('express');
const router = express.Router();
const {
  handleGetDueReviews,
  handleRecordReview,
  handleGetDueReviewsBySubject,
} = require('../controllers/memoryCurveController');

router.get('/subject/:subjectId', handleGetDueReviewsBySubject);
router.get('/:fileId', handleGetDueReviews);
router.post('/', handleRecordReview);

module.exports = router;
