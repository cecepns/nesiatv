const router = require('express').Router();

const { authenticateToken } = require('../middlewares/auth');
const BookmarkController = require('../controllers/BookmarkController');

router.get('/', authenticateToken, BookmarkController.index);
router.post('/', authenticateToken, BookmarkController.store);
router.delete('/:animeId', authenticateToken, BookmarkController.destroy);
router.get('/check/:animeId', authenticateToken, BookmarkController.check);

module.exports = router;

