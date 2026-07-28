const router = require('express').Router();
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const EpisodeController = require('../controllers/EpisodeController');

// List episodes by anime ID
router.get('/anime/:animeId', EpisodeController.listByAnime);

// Detail episode by slug
router.get('/slug/:slug', optionalAuthenticate, EpisodeController.showBySlug);

// Episode CRUD for admin
router.post('/', authenticateToken, EpisodeController.create);
router.put('/batch-login', authenticateToken, EpisodeController.batchToggleLogin);
router.put('/:id', authenticateToken, EpisodeController.update);
router.delete('/:id', authenticateToken, EpisodeController.destroy);


// Episode video source management
router.get('/:episodeId/videos', EpisodeController.listVideos);
router.post('/videos', authenticateToken, upload.single('video_file'), EpisodeController.storeVideoSource);
router.delete('/videos/:id', authenticateToken, EpisodeController.deleteVideoSource);

module.exports = router;
