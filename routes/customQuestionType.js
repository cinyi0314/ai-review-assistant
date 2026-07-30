const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customQuestionTypeController');

router.get('/', ctrl.handleGetAll);
router.post('/', ctrl.handleCreate);
router.put('/:id', ctrl.handleUpdate);
router.delete('/:id', ctrl.handleDelete);

module.exports = router;
