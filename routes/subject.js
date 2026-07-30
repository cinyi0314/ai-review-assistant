const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subjectController');

router.post('/', ctrl.handleCreateSubject);
router.get('/', ctrl.handleGetSubjects);
router.get('/last', ctrl.handleGetLastSubject);
router.post('/update-access', ctrl.handleUpdateLastAccessed);

router.get('/:id', ctrl.handleGetSubjectById);
router.put('/:id', ctrl.handleUpdateSubject);
router.delete('/:id', ctrl.handleDeleteSubject);

router.get('/:id/files', ctrl.handleGetSubjectFiles);
router.post('/:id/files', ctrl.handleAddFileToSubject);
router.delete('/:id/files/:fileId', ctrl.handleRemoveFile);

module.exports = router;
