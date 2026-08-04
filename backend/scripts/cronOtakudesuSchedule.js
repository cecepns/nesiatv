const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../db');
const { generateSlug } = require('../utils/slug');

const BASE_URL = 'https://otakudesu.blog';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchHtml(url) {
  const response = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 20000,
  });
  return cheerio.load(response.data);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeAnimeDetailByUrl(url) {
  if (!url) return null;

  let $;
  try {
    $ = await fetchHtml(url);
  } catch (err) {
    console.error(`[Cron Otakudesu] Failed fetching URL ${url}: ${err.message}`);
    return null;
  }

  const rawSlug = url.split('/').filter(Boolean).pop();
  if (!rawSlug) return null;

  const infoEl = $('.infozingle p, .infozin p');

  const getFieldText = (key) => {
    let foundText = '';
    infoEl.each((_, el) => {
      const txt = $(el).text();
      if (txt.toLowerCase().includes(key.toLowerCase())) {
        foundText = txt;
      }
    });
    if (!foundText) return '';
    const parts = foundText.split(':');
    return parts.length > 1 ? parts.slice(1).join(':').trim() : foundText.trim();
  };

  const title =
    getFieldText('Judul') ||
    $('.fotoanime h1').text().trim() ||
    $('h1.post-title').text().trim() ||
    rawSlug;

  const japaneseName = getFieldText('Japanese');
  const scoreStr = getFieldText('Skor');
  const producer = getFieldText('Produser');
  const type = getFieldText('Tipe');
  const statusStr = getFieldText('Status').toLowerCase();
  const totalEpisodesStr = getFieldText('Total Episode');
  const duration = getFieldText('Durasi');
  const releaseDate = getFieldText('Tanggal Rilis');
  const studio = getFieldText('Studio');
  const genresStr = getFieldText('Genre');

  const synopsis = $('.sinopse p, .sinopsis p, .sinopse, .entry-content p').text().trim();
  const thumbnail = $('.fotoanime img').attr('src') || $('.entry-content img').attr('src');

  const rating = parseFloat(scoreStr) || 0.0;
  const totalEpisodes = parseInt(totalEpisodesStr, 10) || null;
  const releaseYear = releaseDate ? parseInt(releaseDate.match(/\d{4}/)?.[0], 10) : null;
  const animeStatus = statusStr.includes('complete') ? 'completed' : statusStr.includes('hiatus') ? 'hiatus' : 'ongoing';

  // Insert or Update Anime safely (prevents duplication by checking unique slug)
  const [existingAnime] = await db.execute('SELECT id FROM anime WHERE slug = ?', [rawSlug]);
  let animeId;

  if (existingAnime.length > 0) {
    animeId = existingAnime[0].id;
    await db.execute(
      `UPDATE anime SET 
        title = ?, alternative_name = ?, japanese_name = ?, producer = ?, studio = ?, 
        synopsis = ?, thumbnail = ?, content_type = ?, rating = ?, status = ?, 
        duration = ?, total_episodes = ?, release_date = ?, \`release\` = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title,
        title,
        japaneseName,
        producer,
        studio,
        synopsis,
        thumbnail,
        type || 'Anime',
        rating,
        animeStatus,
        duration,
        totalEpisodes,
        releaseDate,
        releaseYear,
        animeId,
      ]
    );
  } else {
    const [result] = await db.execute(
      `INSERT INTO anime (
        title, slug, alternative_name, japanese_name, producer, studio, 
        synopsis, thumbnail, content_type, rating, status, 
        duration, total_episodes, release_date, \`release\`, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title,
        rawSlug,
        title,
        japaneseName,
        producer,
        studio,
        synopsis,
        thumbnail,
        type || 'Anime',
        rating,
        animeStatus,
        duration,
        totalEpisodes,
        releaseDate,
        releaseYear,
      ]
    );
    animeId = result.insertId;
  }

  // Handle Genres
  if (genresStr) {
    const genresList = genresStr.split(',').map((g) => g.trim());
    for (const genreName of genresList) {
      if (!genreName) continue;
      const genreSlug = generateSlug(genreName);

      let categoryId;
      const [existingCat] = await db.execute('SELECT id FROM categories WHERE slug = ?', [genreSlug]);
      if (existingCat.length > 0) {
        categoryId = existingCat[0].id;
      } else {
        const [newCat] = await db.execute('INSERT INTO categories (name, slug) VALUES (?, ?)', [genreName, genreSlug]);
        categoryId = newCat.insertId;
      }

      const [existingLink] = await db.execute(
        'SELECT id FROM anime_genres WHERE anime_id = ? AND category_id = ?',
        [animeId, categoryId]
      );
      if (existingLink.length === 0) {
        await db.execute('INSERT INTO anime_genres (anime_id, category_id) VALUES (?, ?)', [animeId, categoryId]);
      }
    }
  }

  // Parse Episodes list
  const episodes = [];
  $('.keyls li, .episodelist ul li, .listime ul li').each((_, el) => {
    const linkEl = $(el).find('a');
    const href = linkEl.attr('href');
    const epTitle = linkEl.text().trim();

    if (href && href.includes('/episode/')) {
      const epSlug = href.split('/').filter(Boolean).pop();
      const numMatch = epSlug.match(/episode-(\d+)/i) || epTitle.match(/episode\s+(\d+)/i) || epTitle.match(/ep\s+(\d+)/i);
      const episodeNumber = numMatch ? numMatch[1] : (episodes.length + 1).toString();

      episodes.push({
        title: epTitle,
        url: href,
        slug: epSlug,
        episodeNumber,
      });
    }
  });

  // Insert or Update episodes safely (prevents duplicate inserts by checking ep slug)
  let newEpisodesCount = 0;
  for (const ep of episodes) {
    const [existingEp] = await db.execute('SELECT id FROM episodes WHERE slug = ?', [ep.slug]);
    if (existingEp.length > 0) {
      await db.execute(
        'UPDATE episodes SET title = ?, episode_number = ?, updated_at = NOW() WHERE id = ?',
        [ep.title, ep.episodeNumber, existingEp[0].id]
      );
    } else {
      await db.execute(
        'INSERT INTO episodes (anime_id, title, slug, episode_number, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [animeId, ep.title, ep.slug, ep.episodeNumber]
      );
      newEpisodesCount++;
    }
  }

  console.log(`[Cron Otakudesu] "${title}" synced (${episodes.length} episodes, ${newEpisodesCount} new).`);
}

let isRunning = false;

async function runCronSyncSchedule() {
  if (isRunning) {
    console.log(`[Cron Otakudesu] Sync is already running. Skipping this cycle.`);
    return;
  }

  isRunning = true;
  console.log(`[Cron Otakudesu] Starting schedule fetch cycle at ${new Date().toISOString()}...`);
  try {
    const $ = await fetchHtml(`${BASE_URL}/jadwal-rilis/`);
    const animeLinks = new Set();

    $('.kglist321 ul li a').each((_, a) => {
      const href = $(a).attr('href');
      if (href && href.includes('/anime/')) {
        animeLinks.add(href);
      }
    });

    console.log(`[Cron Otakudesu] Found ${animeLinks.size} unique anime items in release schedule.`);

    for (const link of animeLinks) {
      try {
        await scrapeAnimeDetailByUrl(link);
        await delay(500);
      } catch (err) {
        console.error(`[Cron Otakudesu] Error processing ${link}:`, err?.message || err);
      }
    }

    console.log(`[Cron Otakudesu] Schedule sync completed successfully. Waiting for next cron trigger.`);
  } catch (error) {
    console.error(`[Cron Otakudesu] Failed fetching schedule:`, error?.message || error);
  } finally {
    isRunning = false;
  }
}

// Start PM2 Cron Job Service using node-cron
console.log(`[Cron Otakudesu Worker] Service started with node-cron. Expression: '0 */2 * * *' (Every 2 hours).`);

// Execute immediately once on service startup
runCronSyncSchedule();

// Schedule every 2 hours using node-cron ('0 */2 * * *')
cron.schedule('0 */2 * * *', () => {
  console.log(`[node-cron] Triggering 2-hour schedule sync task...`);
  runCronSyncSchedule();
});
