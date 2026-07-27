const router = require('express').Router();
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth');
const EpisodeController = require('../controllers/EpisodeController');

// Detail episode by slug
router.get('/slug/:slug', optionalAuthenticate, EpisodeController.showBySlug);

// Episode CRUD for admin
router.put('/:id', authenticateToken, EpisodeController.update);
router.delete('/:id', authenticateToken, EpisodeController.destroy);

// Episode video source management
router.get('/:episodeId/videos', EpisodeController.listVideos);
router.post('/videos', authenticateToken, EpisodeController.storeVideoSource);
router.delete('/videos/:id', authenticateToken, EpisodeController.deleteVideoSource);

module.exports = router;
