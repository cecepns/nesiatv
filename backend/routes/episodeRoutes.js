const router = require('express').Router();
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const EpisodeController = require('../controllers/EpisodeController');

// List episodes by anime ID
router.get('/anime/:animeId', EpisodeController.listByAnime);

// Detail episode by slug
router.get('/slug/:slug', optionalAuthenticate, EpisodeController.showBySlug);

// Episode video source management & Batch Login (Harus diletakkan SEBELUM rute dinamik /:id)
router.get('/:episodeId/videos', EpisodeController.listVideos);
router.post('/videos', authenticateToken, upload.single('video_file'), EpisodeController.storeVideoSource);
router.delete('/videos/:id', authenticateToken, EpisodeController.deleteVideoSource);
router.put('/batch-login', authenticateToken, EpisodeController.batchToggleLogin);

// Episode CRUD for admin
router.post('/', authenticateToken, upload.single('cover'), EpisodeController.create);
router.put('/:id', authenticateToken, upload.single('cover'), EpisodeController.update);
router.post('/:id', authenticateToken, upload.single('cover'), EpisodeController.update);
router.delete('/:id', authenticateToken, EpisodeController.destroy);

module.exports = router;
