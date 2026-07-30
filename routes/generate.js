const express = require('express');
const router = express.Router();
const { handleGenerate, handleBatchGenerate } = require('../controllers/generateController');

router.post('/', handleGenerate);
router.post('/batch', handleBatchGenerate);

module.exports = router;
