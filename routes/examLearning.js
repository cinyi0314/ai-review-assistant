const express = require('express');
const router = express.Router();
const { handleLearnExamStyle } = require('../controllers/examLearningController');

router.post('/', handleLearnExamStyle);

module.exports = router;
