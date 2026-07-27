const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth');
const OtakudesuScrapController = require('../controllers/OtakudesuScrapController');

router.get('/list', authenticateToken, OtakudesuScrapController.getAnimeList);
router.post('/scrape-detail', authenticateToken, OtakudesuScrapController.scrapeAnimeDetail);
router.post('/scrape-videos', authenticateToken, OtakudesuScrapController.scrapeEpisodeVideoSources);

module.exports = router;
