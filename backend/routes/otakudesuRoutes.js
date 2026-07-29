const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const OtakudesuScrapController = require('../controllers/OtakudesuScrapController');

router.get('/list', authenticateToken, OtakudesuScrapController.getAnimeList);
router.post('/scrape-detail', authenticateToken, OtakudesuScrapController.scrapeAnimeDetail);
router.post('/scrape-videos', authenticateToken, OtakudesuScrapController.scrapeEpisodeVideoSources);
router.get('/desustream-proxy', OtakudesuScrapController.desustreamProxy);
router.get('/desustream-frame', OtakudesuScrapController.desustreamFrameProxy);
router.get('/video-stream', OtakudesuScrapController.streamVideoProxy);

module.exports = router;

