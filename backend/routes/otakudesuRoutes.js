const router = require('express').Router();
const OtakudesuScrapController = require('../controllers/OtakudesuScrapController');

router.get('/schedule', OtakudesuScrapController.getOtakudesuSchedule);
router.get('/list', OtakudesuScrapController.getAnimeList);
router.post('/scrape-detail', OtakudesuScrapController.scrapeAnimeDetail);
router.post('/scrape-videos', OtakudesuScrapController.scrapeEpisodeVideoSources);
router.get('/desustream-proxy', OtakudesuScrapController.desustreamProxy);
router.get('/desustream-frame', OtakudesuScrapController.desustreamFrameProxy);
router.get('/video-stream', OtakudesuScrapController.streamVideoProxy);

module.exports = router;
