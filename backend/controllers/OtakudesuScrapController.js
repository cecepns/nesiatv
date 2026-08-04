const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../db');
const { generateSlug } = require('../utils/slug');

const BASE_URL = 'https://otakudesu.blog';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchHtml(url) {
  try {
    const response = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout: 15000,
    });
    return cheerio.load(response.data);
  } catch (error) {
    console.error(`Error fetching HTML from ${url}:`, error.message);
    throw error;
  }
}

// Scrape Anime List (Index A-Z)
const getAnimeList = async (req, res) => {
  try {
    const $ = await fetchHtml(`${BASE_URL}/anime-list/`);
    const animeList = [];

    $('.barilist .penzlist a, .daftar li a, .daftaranime li a').each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      if (title && href && href.includes('/anime/')) {
        animeList.push({
          title,
          url: href,
          slug: href.split('/').filter(Boolean).pop(),
        });
      }
    });

    // Fallback search if empty
    if (animeList.length === 0) {
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (href.includes('/anime/') && text && !href.endsWith('/anime/')) {
          animeList.push({
            title: text,
            url: href,
            slug: href.split('/').filter(Boolean).pop(),
          });
        }
      });
    }

    // Filter unique
    const uniqueList = Array.from(new Map(animeList.map(item => [item.slug, item])).values());

    return res.json({
      status: true,
      total: uniqueList.length,
      data: uniqueList,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch anime list from Otakudesu',
      error: error.message,
    });
  }
};

// Scrape Release Schedule (Jadwal Rilis)
const getOtakudesuSchedule = async (req, res) => {
  try {
    const $ = await fetchHtml(`${BASE_URL}/jadwal-rilis/`);
    const schedule = [];

    $('.kglist321').each((_, el) => {
      const day = $(el).find('h2').text().trim();
      const animeList = [];
      $(el).find('ul li a').each((_, a) => {
        const title = $(a).text().trim();
        const href = $(a).attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop() || '';
        if (title) {
          animeList.push({ title, url: href, slug });
        }
      });
      if (day) {
        schedule.push({ day, items: animeList });
      }
    });

    return res.json({
      status: true,
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch schedule from Otakudesu',
      error: error.message,
    });
  }
};

// Scrape Detail and Episodes
const scrapeAnimeDetail = async (req, res) => {
  const { url } = req.body; // target detail url e.g. https://otakudesu.blog/anime/jigoku-sensei-2025-sub-indo/
  if (!url) {
    return res.status(400).json({ status: false, message: 'URL is required' });
  }

  try {
    const $ = await fetchHtml(url);
    const slug = url.split('/').filter(Boolean).pop();

    const title = $('.infozingle p, .infozin p').find('span:contains("Judul")').parent().text().replace('Judul:', '').trim() || $('.fotoanime h1').text().trim() || $('h1.post-title').text().trim();
    const japaneseName = $('.infozingle p, .infozin p').find('span:contains("Japanese")').parent().text().replace('Japanese:', '').trim();
    const scoreStr = $('.infozingle p, .infozin p').find('span:contains("Skor")').parent().text().replace('Skor:', '').trim();
    const producer = $('.infozingle p, .infozin p').find('span:contains("Produser")').parent().text().replace('Produser:', '').trim();
    const type = $('.infozingle p, .infozin p').find('span:contains("Tipe")').parent().text().replace('Tipe:', '').trim();
    const status = $('.infozingle p, .infozin p').find('span:contains("Status")').parent().text().replace('Status:', '').trim().toLowerCase();
    const totalEpisodesStr = $('.infozingle p, .infozin p').find('span:contains("Total Episode")').parent().text().replace('Total Episode:', '').trim();
    const duration = $('.infozingle p, .infozin p').find('span:contains("Durasi")').parent().text().replace('Durasi:', '').trim();
    const releaseDate = $('.infozingle p, .infozin p').find('span:contains("Tanggal Rilis")').parent().text().replace('Tanggal Rilis:', '').trim();
    const studio = $('.infozingle p, .infozin p').find('span:contains("Studio")').parent().text().replace('Studio:', '').trim();
    const genresStr = $('.infozingle p, .infozin p').find('span:contains("Genre")').parent().text().replace('Genre:', '').trim();
    
    // Synopsis
    const synopsis = $('.sinopse p, .sinopsis p, .sinopse, .entry-content p').text().trim();
    
    // Thumbnail
    const thumbnail = $('.fotoanime img').attr('src') || $('.entry-content img').attr('src');

    // Parse values
    const rating = parseFloat(scoreStr) || 0.0;
    const totalEpisodes = parseInt(totalEpisodesStr, 10) || null;
    const releaseYear = releaseDate ? parseInt(releaseDate.match(/\d{4}/)?.[0], 10) : null;
    const animeStatus = status.includes('complete') ? 'completed' : (status.includes('hiatus') ? 'hiatus' : 'ongoing');

    // Insert or update Anime in DB
    const [existingAnime] = await db.execute('SELECT id FROM anime WHERE slug = ?', [slug]);
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
          title, title, japaneseName, producer, studio, 
          synopsis, thumbnail, type, rating, animeStatus, 
          duration, totalEpisodes, releaseDate, releaseYear, animeId
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
          title, slug, title, japaneseName, producer, studio, 
          synopsis, thumbnail, type, rating, animeStatus, 
          duration, totalEpisodes, releaseDate, releaseYear
        ]
      );
      animeId = result.insertId;
    }

    // Process genres
    if (genresStr) {
      const genresList = genresStr.split(',').map(g => g.trim());
      for (const genreName of genresList) {
        if (!genreName) continue;
        const genreSlug = generateSlug(genreName);
        
        // Find or create category/genre
        let categoryId;
        const [existingCat] = await db.execute('SELECT id FROM categories WHERE slug = ?', [genreSlug]);
        if (existingCat.length > 0) {
          categoryId = existingCat[0].id;
        } else {
          const [newCat] = await db.execute('INSERT INTO categories (name, slug) VALUES (?, ?)', [genreName, genreSlug]);
          categoryId = newCat.insertId;
        }

        // Link genre to anime
        const [existingLink] = await db.execute('SELECT id FROM anime_genres WHERE anime_id = ? AND category_id = ?', [animeId, categoryId]);
        if (existingLink.length === 0) {
          await db.execute('INSERT INTO anime_genres (anime_id, category_id) VALUES (?, ?)', [animeId, categoryId]);
        }
      }
    }

    // Process episodes list from page
    const episodes = [];
    $('.keyls li, .episodelist ul li, .listime ul li').each((_, el) => {
      const linkEl = $(el).find('a');
      const href = linkEl.attr('href');
      const epTitle = linkEl.text().trim();
      
      if (href && href.includes('/episode/')) {
        const epSlug = href.split('/').filter(Boolean).pop();
        // Parse episode number
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

    // Save Episodes list
    for (const ep of episodes) {
      const [existingEp] = await db.execute('SELECT id FROM episodes WHERE slug = ?', [ep.slug]);
      let epId;
      if (existingEp.length > 0) {
        epId = existingEp[0].id;
        await db.execute(
          'UPDATE episodes SET title = ?, episode_number = ?, updated_at = NOW() WHERE id = ?',
          [ep.title, ep.episodeNumber, epId]
        );
      } else {
        const [newEp] = await db.execute(
          'INSERT INTO episodes (anime_id, title, slug, episode_number, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [animeId, ep.title, ep.slug, ep.episodeNumber]
        );
        epId = newEp.insertId;
      }
      ep.id = epId;
    }

    // Return successfully scraped info
    return res.json({
      status: true,
      message: 'Anime details and episodes scraped successfully',
      data: {
        id: animeId,
        title,
        japaneseName,
        rating,
        status: animeStatus,
        episodesCount: episodes.length,
        episodes,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Failed to scrape anime detail',
      error: error.message,
    });
  }
};

const querystring = require('querystring');

// Scrape Single Episode Stream Links
const scrapeEpisodeVideoSources = async (req, res) => {
  const { url, episodeId } = req.body; // e.g. https://otakudesu.blog/episode/jsn25-episode-1-2-sub-indo/
  if (!url || !episodeId) {
    return res.status(400).json({ status: false, message: 'URL and episodeId are required' });
  }

  try {
    const $ = await fetchHtml(url);
    const videoSources = [];

    // 1. Check for primary iframe embedded player
    const embedIframe = $('.responsive-embed-stream iframe, .embed-stream iframe, iframe').first();
    if (embedIframe && embedIframe.attr('src')) {
      videoSources.push({
        episode_id: episodeId,
        quality: 'Default',
        server: 'Primary Embed',
        url: embedIframe.attr('src'),
      });
    }

    // 2. Parse mirrorstream list (Stream Links via Otakudesu AJAX)
    const scripts = $('script').map((i, el) => $(el).html()).get();
    let nonceAction = '';
    let mirrorAction = '';

    for (const s of scripts) {
      if (s && s.includes('admin-ajax.php')) {
        const nonceMatch = s.match(/data:\s*\{\s*action:\s*["']([a-f0-9]{32})["']\s*\}/);
        if (nonceMatch) {
          nonceAction = nonceMatch[1];
        }
        const mirrorMatch = s.match(/nonce:\s*\w+,\s*action:\s*["']([a-f0-9]{32})["']/);
        if (mirrorMatch) {
          mirrorAction = mirrorMatch[1];
        }
      }
    }

    if (nonceAction && mirrorAction) {
      try {
        const client = axios.create({
          headers: {
            'User-Agent': DEFAULT_HEADERS['User-Agent'],
            'Accept': '*/*',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Referer': url,
            'Origin': 'https://otakudesu.blog',
          },
          timeout: 10000,
        });

        const nonceRes = await client.post('https://otakudesu.blog/wp-admin/admin-ajax.php', querystring.stringify({ action: nonceAction }));
        const nonce = nonceRes.data?.data;

        if (nonce) {
          const mirrorLinks = [];
          $('.mirrorstream ul').each((_, ul) => {
            const qClass = $(ul).attr('class') || '';
            const quality = qClass.replace('mirror', '').replace('m', '').trim() || 'Default';
            $(ul).find('li a').each((_, a) => {
              const text = $(a).text().trim();
              const content = $(a).attr('data-content');
              if (content) {
                mirrorLinks.push({ quality, server: text, content });
              }
            });
          });

          for (const item of mirrorLinks) {
            try {
              const decoded = JSON.parse(Buffer.from(item.content, 'base64').toString('utf-8'));
              const streamRes = await client.post(
                'https://otakudesu.blog/wp-admin/admin-ajax.php',
                querystring.stringify({
                  ...decoded,
                  nonce,
                  action: mirrorAction,
                })
              );

              if (streamRes.data && streamRes.data.data) {
                const decodedHtml = Buffer.from(streamRes.data.data, 'base64').toString('utf-8');
                const iframeSrc = cheerio.load(decodedHtml)('iframe').attr('src');
                if (iframeSrc) {
                  const isDuplicate = videoSources.some((v) => v.url === iframeSrc);
                  if (!isDuplicate) {
                    videoSources.push({
                      episode_id: episodeId,
                      quality: item.quality,
                      server: item.server,
                      url: iframeSrc,
                    });
                  }
                }
              }
            } catch (err) {
              console.warn(`Failed resolving mirror ${item.server} (${item.quality}):`, err.message);
            }
          }
        }
      } catch (ajaxErr) {
        console.warn('Mirrorstream nonce fetch failed:', ajaxErr.message);
      }
    }

    // 3. Parse download section to get download links
    $('.download ul li').each((_, liEl) => {
      const qualityText = $(liEl).find('strong').text().replace('MP4', '').replace('MKV', '').trim() || 'Download';
      $(liEl).find('a').each((_, aEl) => {
        const serverName = $(aEl).text().trim();
        const downloadUrl = $(aEl).attr('href');

        if (downloadUrl && downloadUrl.startsWith('http')) {
          videoSources.push({
            episode_id: episodeId,
            quality: `[Download] ${qualityText}`,
            server: serverName,
            url: downloadUrl,
          });
        }
      });
    });

    // Store sources in DB
    if (videoSources.length > 0) {
      await db.execute('DELETE FROM episode_videos WHERE episode_id = ?', [episodeId]);

      for (const src of videoSources) {
        await db.execute(
          'INSERT INTO episode_videos (episode_id, quality, server, url) VALUES (?, ?, ?, ?)',
          [src.episode_id, src.quality, src.server, src.url]
        );
      }
    }

    return res.json({
      status: true,
      message: `Successfully scraped ${videoSources.length} video stream and download links for episode`,
      data: videoSources,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Failed to scrape episode video sources',
      error: error.message,
    });
  }
};

// Proxy desustream page to extract direct video URL
const desustreamProxy = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ status: false, message: 'URL parameter is required' });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': 'https://otakudesu.blog',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const videoSource = $('video source').attr('src') || $('source').attr('src');

    if (videoSource) {
      return res.json({
        status: true,
        directUrl: videoSource,
        type: $('video source').attr('type') || 'video/mp4'
      });
    }

    return res.status(404).json({
      status: false,
      message: 'Video source not found on desustream page',
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch desustream media',
      error: error.message,
    });
  }
};

// Proxy desustream page as HTML iframe embed player
const desustreamFrameProxy = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    const response = await axios.get(url, {
      headers: {
        ...DEFAULT_HEADERS,
        'Referer': 'https://otakudesu.blog',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const videoSource = $('video source').attr('src') || $('source').attr('src');

    if (videoSource) {
      res.setHeader('Content-Type', 'text/html');
      const streamProxyUrl = `/api/otakudesu/video-stream?url=${encodeURIComponent(videoSource)}`;
      return res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; background:#000; }
  html, body { width:100%; height:100%; overflow:hidden; display:flex; justify-content:center; align-items:center; }
  video { width:100%; height:100%; max-height:100vh; object-fit:contain; }
</style>
</head>
<body>
  <video controls autoplay playsinline controlsList="nodownload">
    <source src="${streamProxyUrl}" type="video/mp4" />
    <source src="${videoSource}" type="video/mp4" />
  </video>
</body>
</html>`);
    }

    return res.status(404).send('Video source not found');
  } catch (error) {
    return res.status(500).send('Error fetching video player: ' + error.message);
  }
};

// Video Stream Proxy to bypass hotlink / domain protection on video source
const streamVideoProxy = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    const videoResponse = await axios({
      method: 'get',
      url,
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Referer': 'https://otakudesu.blog',
        'Range': req.headers.range || 'bytes=0-',
      },
      responseType: 'stream',
      timeout: 20000,
    });

    if (videoResponse.headers['content-type']) {
      res.setHeader('Content-Type', videoResponse.headers['content-type']);
    }
    if (videoResponse.headers['content-length']) {
      res.setHeader('Content-Length', videoResponse.headers['content-length']);
    }
    if (videoResponse.headers['content-range']) {
      res.setHeader('Content-Range', videoResponse.headers['content-range']);
      res.status(206);
    }
    if (videoResponse.headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', videoResponse.headers['accept-ranges']);
    }

    videoResponse.data.pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).send('Streaming error: ' + error.message);
    }
  }
};

module.exports = {
  getOtakudesuSchedule,
  getAnimeList,
  scrapeAnimeDetail,
  scrapeEpisodeVideoSources,
  desustreamProxy,
  desustreamFrameProxy,
  streamVideoProxy,
};

