const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/knowledgePointsController');

router.get('/:subjectId', ctrl.handleGetSubjectPoints);
router.put('/:subjectId', ctrl.handleSaveSubjectPoints);

module.exports = router;
