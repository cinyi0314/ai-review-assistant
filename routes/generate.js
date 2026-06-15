const express = require('express');
const router = express.Router();
const { handleGenerate } = require('../controllers/generateController');

router.post('/', handleGenerate);

module.exports = router;
