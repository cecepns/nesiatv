const express = require('express');
const router = express.Router();

const ContentsController = require('../controllers/ContentsController');

router.get('/genres', ContentsController.genres);
router.get('/count', ContentsController.getContentsCount);
router.get('/', ContentsController.list);

module.exports = router;

