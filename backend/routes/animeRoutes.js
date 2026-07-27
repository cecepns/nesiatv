const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const AnimeController = require('../controllers/AnimeController');

// List anime
router.get('/', AnimeController.index);

// Detail by slug
router.get('/slug/:slug', AnimeController.showBySlug);

// Create / update / delete anime (with upload)
router.post(
  '/',
  authenticateToken,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'cover_background', maxCount: 1 },
  ]),
  AnimeController.store
);
router.put(
  '/:id',
  authenticateToken,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'cover_background', maxCount: 1 },
  ]),
  AnimeController.update
);
router.delete('/:id', authenticateToken, AnimeController.destroy);

// Search
router.get('/search', AnimeController.search);

module.exports = router;
